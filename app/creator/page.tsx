export default function CreatorPage() {
  return (
    <main>
      <section className="hero">
        <span className="pill unlocked">Wallet workspace</span>
        <h1>Creator account</h1>
        <p>
          Connect Phantom to manage your profile and wallet-saved tracks. Public
          community publishing and paid sales are paused for now: share tracks
          privately with exact # links, or save them to your own wallet library.
        </p>
        <div className="tagrow">
          <a className="btn primary" href="/studio">
            Open Studio
          </a>
          <a className="btn" href="/library">
            Private library
          </a>
          <a className="btn" href="/soundtracks">
            Prepared catalogue
          </a>
        </div>
      </section>
      <section className="card" id="creator-root">
        <p className="muted">Loading creator dashboard…</p>
      </section>
    </main>
  );
}
