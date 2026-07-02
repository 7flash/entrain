export default function StudioPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: '14px' }}>
        <h1>Studio</h1>
        <p>Run loaded templates, add local ambience files, and export locally. Locked templates are fetched through the server gate; local edits are browser-only until saved.</p>
      </section>
      <section className="console" id="studio-root">
        <div className="panel"><p className="muted">Loading client studio…</p></div>
      </section>
    </main>
  );
}
