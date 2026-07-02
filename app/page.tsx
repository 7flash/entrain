import { featuredTemplates } from '@/lib/templates';

export default function HomePage() {
  const featured = featuredTemplates(3);
  return (
    <main>
      <section className="hero">
        <span className="pill">multi-wave sessions · token gates · local audio rendering</span>
        <h1>A server-backed console for entrainment templates.</h1>
        <p>ENTRAIN now has its own session format, a template library, Phantom holder gates, and a TradJS server. Audio still renders locally in the browser; access decisions live on the server.</p>
        <p><a className="btn primary" href="/templates">Browse templates</a> <a className="btn" href="/studio">Open studio</a></p>
      </section>
      <section className="grid">
        {featured.map((t) => (
          <article className="card template-card" key={t.slug}>
            <div className="tagrow"><span className="pill">{t.category}</span><span className="pill">{t.minTokens ? `${t.minTokens} $ENTRAIN` : 'free'}</span></div>
            <h3>{t.title}</h3>
            <p className="muted">{t.summary}</p>
            <a className="btn" href={`/templates/${t.slug}`}>View template</a>
          </article>
        ))}
      </section>
    </main>
  );
}
