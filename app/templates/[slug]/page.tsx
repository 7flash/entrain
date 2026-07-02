import { findTemplate } from '@/lib/templates';

type Props = { params: { slug: string } };

export default function TemplateDetailPage({ params }: Props) {
  const template = findTemplate(params.slug);
  if (!template) {
    return <main className="hero"><h1>Template not found</h1><p><a href="/templates">Back to templates</a></p></main>;
  }
  const req = template.minTokens ? `${template.minTokens} $ENTRAIN required` : 'Free template';
  return (
    <main>
      <section className="hero">
        <span className={template.minTokens ? 'pill gate' : 'pill unlocked'}>{req}</span>
        <h1>{template.title}</h1>
        <p>{template.summary}</p>
        <div className="tagrow">{template.tags.map((x) => <span className="pill" key={x}>{x}</span>)}</div>
      </section>
      <section className="two">
        <article className="card">
          <h3>What this session does</h3>
          <p className="muted">{template.description}</p>
          <p className="notice">Audio generation and WAV rendering stay local in the browser. The server only returns template JSON after the token gate passes.</p>
          <p><button className="btn primary" id="launch-template" data-slug={template.slug}>Load in studio</button></p>
          <div id="detail-auth-root" />
        </article>
        <article className="card">
          <h3>Session structure</h3>
          <ul className="muted">
            {template.session.layers.map((l) => <li key={l.id}>{l.type} · {l.keyframes.length} point timeline</li>)}
          </ul>
        </article>
      </section>
    </main>
  );
}
