import { soundtracksByCategory } from "@/lib/soundtracks";

export default function SoundtracksPage() {
  const groups = soundtracksByCategory();
  return (
    <main>
      <section className="hero" style={{ paddingBottom: "10px" }}>
        <span className="pill unlocked">Public/free mode</span>
        <h1>Ready brainwave soundtracks</h1>
        <p>
          Every published soundtrack is available to play, export, inspect, and
          clone without wallet login. Each card is a database row containing
          ENTRAIN-format JSON: layers, timelines, ambience metadata, name,
          description, category, and tags.
        </p>
      </section>
      <section className="toolbar">
        <div className="tagrow">
          {groups.map((g) => (
            <a className="pill" href={`#${g.category}`} key={g.category}>
              {g.category} · {g.templates.length}
            </a>
          ))}
        </div>
      </section>
      {groups.map((group) => (
        <section
          key={group.category}
          id={group.category}
          style={{ marginBottom: "26px" }}
        >
          <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 400 }}>
            {group.category}
          </h2>
          <div className="grid" id="template-grid">
            {group.templates.map((t) => (
              <article
                className="card template-card unlocked-card"
                data-soundtrack-card={t.slug}
                data-min-tokens="0"
                key={t.slug}
              >
                <div className="tagrow">
                  <span className="pill">{t.category}</span>
                  <span className="pill unlocked">free</span>
                  {t.publishedByUser ? (
                    <span className="pill">creator</span>
                  ) : null}
                  {t.lineage?.accuracy ? (
                    <span className="pill">{t.lineage.accuracy}</span>
                  ) : null}
                </div>
                <h3>{t.title}</h3>
                <p className="muted">{t.summary}</p>
                <p className="small">
                  {t.summaryStats.durationMin}m · {t.summaryStats.layerCount}{" "}
                  layers · {t.summaryStats.bands.join("/") || "bed"}
                  {t.summaryStats.hasPanMotion ? " · pan motion" : ""}
                  {t.summaryStats.headphonesRequired ? " · headphones" : ""}
                  {t.summaryStats.sampleLayerCount
                    ? ` · ${t.summaryStats.sampleLayerCount} sample`
                    : ""}
                  {t.summaryStats.proceduralAmbienceLayerCount
                    ? ` · ${t.summaryStats.proceduralAmbienceLayerCount} procedural`
                    : ""}
                </p>
                <p className="small">
                  {t.creatorName ? `by ${t.creatorName} · ` : ""}
                  {t.tags.join(" · ")}
                </p>
                <div style={{ marginTop: "auto" }}>
                  <a className="btn" href={`/soundtracks/${t.slug}`}>
                    Open
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
