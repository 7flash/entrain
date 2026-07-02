import { findSoundtrack } from "@/lib/soundtracks";
import { analyzeSession, analysisBadge } from "@/format/protocol-analyzer";

const layerName = (l: any) => {
  if (l.type === "sample")
    return `${l.type} · ${l.sampleName || "local file"} · ${l.sampleLoop?.mode || "native"} loop`;
  if (l.type === "noise") return `${l.type} · ${l.noiseColor || "pink"}`;
  if (l.type === "procedural-ambience")
    return `${l.type} · ${l.ambienceRecipe || "pink-rain"} · seed ${l.seed || 1337}`;
  if (l.type === "carrier") return `${l.type} · ${l.carrierHz || 220} Hz`;
  const first = l.keyframes?.[0]?.beatHz || 0;
  const last = l.keyframes?.[l.keyframes.length - 1]?.beatHz || first;
  return `${l.type} · ${first}${first !== last ? `→${last}` : ""} Hz · ${l.carrierHz || 220} Hz carrier`;
};

type Props = { params: { slug: string } };

export default function SoundtrackDetailPage({ params }: Props) {
  const template = findSoundtrack(params.slug);
  if (!template) {
    return (
      <main className="hero">
        <h1>Soundtrack not found</h1>
        <p>
          <a href="/soundtracks">Back to soundtracks</a>
        </p>
      </main>
    );
  }
  const req = template.minTokens
    ? `${template.minTokens} $ENTRAIN required`
    : "Free soundtrack";
  const analysis = analyzeSession(template.session);
  return (
    <main>
      <section className="hero">
        <div className="tagrow">
          <span className={template.minTokens ? "pill gate" : "pill unlocked"}>
            {req}
          </span>
          <span className={`pill tier-${template.tier}`}>{template.tier}</span>
          <span className="pill">{template.category}</span>
        </div>
        <h1>{template.title}</h1>
        <p>{template.summary}</p>
        <div className="tagrow">
          {template.tags.map((x) => (
            <span className="pill" key={x}>
              {x}
            </span>
          ))}
        </div>
      </section>

      <section className="two">
        <article className="card">
          <h3>What this soundtrack is</h3>
          <p className="muted">{template.description}</p>
          {template.unlockNote ? (
            <p className="notice">{template.unlockNote}</p>
          ) : null}
          <p className="notice good">
            This page can play the database format directly. Unlocking returns
            only the ENTRAIN JSON; audio generation and WAV rendering stay local
            in your browser.
          </p>
          <div className="notice">
            <strong>Protocol analyzer: {analysisBadge(analysis)}</strong>
            <br />
            <span className="small">
              {analysis.headphonesRequired
                ? "Stereo headphones required"
                : "No binaural headphone requirement"}{" "}
              · peak {analysis.estimatedPeakDb.toFixed(1)} dBFS ·{" "}
              {analysis.mixStatus} · loop{" "}
              {template.session.loop?.mode || "hold-last"}
            </span>
            {analysis.issues.length ? (
              <ul className="small">
                {analysis.issues.slice(0, 4).map((i) => (
                  <li key={i.code}>
                    {i.level}: {i.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div
            id="soundtrack-player-root"
            data-slug={template.slug}
            data-min-tokens={String(template.minTokens)}
          >
            <p className="muted">Loading player…</p>
          </div>
        </article>
        <article className="card">
          <h3>Soundtrack structure</h3>
          <p className="small">
            Pattern length: {template.session.durationMin} minutes ·{" "}
            {template.session.layers.length} layers · fade{" "}
            {template.session.export?.fadeSec ?? 4}s · loop{" "}
            {template.session.loop?.mode || "hold-last"}
          </p>
          <p className="small">
            Bands: {template.summaryStats.bands.join(" / ") || "bed"} · beat
            layers {template.summaryStats.beatLayerCount} · sample layers{" "}
            {template.summaryStats.sampleLayerCount}
            {template.summaryStats.proceduralAmbienceLayerCount
              ? ` · ${template.summaryStats.proceduralAmbienceLayerCount} procedural ambience`
              : ""}
            {template.summaryStats.hasCrossfadedSamples
              ? " · crossfade loops"
              : ""}
          </p>
          <table className="matrix">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Timeline</th>
              </tr>
            </thead>
            <tbody>
              {template.session.layers.map((l) => (
                <tr key={l.id}>
                  <td>{layerName(l)}</td>
                  <td>
                    {l.keyframes
                      .map(
                        (k: any) =>
                          `${k.tMin}m:${k.beatHz ? `${k.beatHz}Hz/` : ""}${k.gainPct}%`,
                      )
                      .join(" → ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}
