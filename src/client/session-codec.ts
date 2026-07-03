import type { EntrainSessionV1 } from "@/format/entrain-format";
import {
  cleanForShare,
  sanitizeSession,
  sessionNeedsLocalFiles,
} from "@/format/entrain-format";

export type SharePayloadInfo = {
  hash: string;
  url: string;
  encoding: "raw" | "gzip";
  bytes: number;
  portable: boolean;
  warnings: string[];
};

/**
 * Private anonymous share format.
 *
 * The encoded session lives after #, so browsers do not send it to the server.
 * #es=v1.raw.<base64url-json> or #es=v1.gzip.<base64url-gzip-json>
 * Old #s=<payload> URLs remain readable for backwards compatibility.
 */
export async function encodeSessionHash(session: EntrainSessionV1) {
  return (await encodeSessionUrl(session)).hash;
}

export async function encodeSessionUrl(
  session: EntrainSessionV1,
  baseUrl = location.origin + location.pathname,
): Promise<SharePayloadInfo> {
  const clean = cleanForShare(session);
  const warnings: string[] = [];
  const portable = !sessionNeedsLocalFiles(clean);
  if (!portable)
    warnings.push(
      "This session contains local ambience-file layers. The URL preserves their settings, but not the audio file bytes. Use procedural ambience for a fully exact anonymous share.",
    );
  const json = JSON.stringify(clean);
  const raw = new TextEncoder().encode(json);
  let encoding: "raw" | "gzip" = "raw";
  let payload = raw;
  const gz = await gzip(raw).catch(() => null);
  if (gz && gz.length + 12 < raw.length) {
    encoding = "gzip";
    payload = gz;
  }
  const hash = `#es=v1.${encoding}.${base64url(payload)}`;
  if (hash.length > 120_000)
    warnings.push(
      "This URL is very long and may not survive every messenger. Export JSON as a fallback.",
    );
  return {
    hash,
    url: baseUrl + hash,
    encoding,
    bytes: payload.length,
    portable,
    warnings,
  };
}

export async function decodeSessionHash(hash = location.hash) {
  const exact = hash.match(/(?:^#|&)es=v1\.(raw|gzip)\.([^&]+)/);
  if (exact) {
    const mode = exact[1] as "raw" | "gzip";
    const bytes = fromBase64url(exact[2]);
    const decoded = mode === "gzip" ? await gunzip(bytes) : bytes;
    return sanitizeSession(JSON.parse(new TextDecoder().decode(decoded)));
  }

  // Legacy v0.17 share URLs: #s=<maybe-gzip-or-raw>. Keep readable.
  const legacy = hash.match(/(?:^#|&)s=([^&]+)/);
  if (!legacy) return null;
  const bytes = fromBase64url(legacy[1]);
  const maybe = await gunzip(bytes).catch(() => bytes);
  return sanitizeSession(JSON.parse(new TextDecoder().decode(maybe)));
}

async function gzip(bytes: Uint8Array) {
  if (!("CompressionStream" in window)) return null;
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

async function gunzip(bytes: Uint8Array) {
  if (!("DecompressionStream" in window))
    throw new Error(
      "This browser cannot decompress shared ENTRAIN URLs. Ask the sender to export JSON, or open in a modern browser.",
    );
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

function base64url(bytes: Uint8Array) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64url(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
