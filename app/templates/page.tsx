import { allTemplates } from '@/lib/templates';

export default function TemplatesPage() {
  const templates = allTemplates();
  return (
    <main>
      <section className="hero" style={{ paddingBottom: '10px' }}>
        <h1>Templates</h1>
        <p>Each page describes a session before loading it into the studio. Templates with requirements unlock after the server verifies the connected Phantom wallet.</p>
        <div id="auth-root" />
      </section>
      <section className="grid" id="template-grid">
        {templates.map((t) => (
          <article className="card template-card" data-template-card={t.slug} data-min-tokens={String(t.minTokens)} key={t.slug}>
            <div className="tagrow">
              <span className="pill">{t.category}</span>
              <span className={t.minTokens ? 'pill gate' : 'pill unlocked'}>{t.minTokens ? `${t.minTokens} $ENTRAIN` : 'free'}</span>
            </div>
            <h3>{t.title}</h3>
            <p className="muted">{t.summary}</p>
            <p className="small">{t.tags.join(' · ')}</p>
            <div style={{ marginTop: 'auto' }}><a className="btn" href={`/templates/${t.slug}`}>Open</a></div>
          </article>
        ))}
      </section>
    </main>
  );
}
