export default function LibraryPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: "14px" }}>
        <h1>Your saved tracks</h1>
        <p>
          Sign in with Google to save up to 50 algorithmic tracks and share each
          one with a simple link. Studio and private # links still work without
          login.
        </p>
      </section>
      <section className="console" id="library-root">
        <div className="panel">
          <p className="muted">Loading saved tracks…</p>
        </div>
      </section>
    </main>
  );
}
