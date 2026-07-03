import { render } from "tradjs/client";
import { connectAndVerify } from "@/client/wallet";

let data: any = null;
let msg =
  "Connect Phantom to manage your creator profile. Publishing is paused; use private links or wallet library saves.";
let busy = false;

function App() {
  return (
    <div>
      <div className="toolbar">
        <div>
          <strong>Creator account</strong>
          <div className="small">{msg}</div>
        </div>
        <div className="tagrow">
          <button className="btn primary" disabled={busy} onClick={load}>
            {data ? "Refresh" : "Connect Phantom"}
          </button>
          <a className="btn" href="/studio">
            Create in Studio
          </a>
          <a className="btn" href="/library">
            Private library
          </a>
        </div>
      </div>
      <div className="notice">
        <strong>Public publishing is paused.</strong>
        <br />
        <span className="small">
          Tracks can still be created without login, shared anonymously by #
          URL, or saved to your private wallet library after Phantom login. The
          public catalogue is reserved for prepared soundtracks
          curated/admin-published by the project.
        </span>
      </div>
      {data ? <Profile /> : null}
      {data?.soundtracks?.length ? (
        <table className="matrix">
          <thead>
            <tr>
              <th>Catalogue row</th>
              <th>Status</th>
              <th>Visibility</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.soundtracks.map((s: any) => (
              <tr key={s.slug}>
                <td>
                  {s.title}
                  <br />
                  <span className="small">/{s.slug}</span>
                </td>
                <td>{s.status}</td>
                <td>{s.isPublished ? "public/admin row" : "draft"}</td>
                <td>
                  <a className="btn" href={`/soundtracks/${s.slug}`}>
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : data ? (
        <p className="muted">
          No public creator rows. Use Studio → Save to wallet library for
          private cloud saves, or copy an exact private URL to share directly.
        </p>
      ) : null}
    </div>
  );
}
function Profile() {
  const p = data.profile || {};
  return (
    <div className="two" style={{ margin: "12px 0" }}>
      <div className="field">
        <label>Display name</label>
        <input id="creator-name" defaultValue={p.displayName || ""} />
      </div>
      <div className="field">
        <label>Payout wallet</label>
        <input
          id="creator-wallet"
          defaultValue={p.payoutWallet || ""}
          placeholder="Optional while publishing is paused"
        />
      </div>
      <div className="field" style={{ gridColumn: "1/-1" }}>
        <label>Bio</label>
        <textarea id="creator-bio" rows="3" defaultValue={p.bio || ""} />
      </div>
      <div>
        <button className="btn" onClick={saveProfile}>
          Save profile
        </button>
      </div>
    </div>
  );
}
async function load() {
  busy = true;
  msg = "checking wallet…";
  paint();
  try {
    await connectAndVerify();
    data = await fetch("/api/creator/profile").then((r) => r.json());
    if (!data.ok) throw new Error(data.error || "load failed");
    msg =
      data.message ||
      `Connected. ${data.soundtracks?.length || 0} public row(s).`;
  } catch (e: any) {
    msg = e.message || "connect failed";
  }
  busy = false;
  paint();
}
async function saveProfile() {
  busy = true;
  msg = "saving profile…";
  paint();
  try {
    const displayName = (
      document.getElementById("creator-name") as HTMLInputElement
    )?.value;
    const payoutWallet = (
      document.getElementById("creator-wallet") as HTMLInputElement
    )?.value;
    const bio = (document.getElementById("creator-bio") as HTMLTextAreaElement)
      ?.value;
    const res = await fetch("/api/creator/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, payoutWallet, bio }),
    }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error || "save failed");
    await load();
    msg = "profile saved";
  } catch (e: any) {
    msg = e.message || "save failed";
  }
  busy = false;
  paint();
}
function paint() {
  render(<App />, document.getElementById("creator-root")!);
}
export default function mount() {
  paint();
  return () => render(null, document.getElementById("creator-root")!);
}
