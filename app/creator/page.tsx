export default function CreatorPage() {
  return (
    <main>
      <section className="hero">
        <span className="pill unlocked">Account workspace</span>
        <h1>Account</h1>
        <p>
          Creator publishing and payments are disabled. Use Studio to build
          tracks, Google sign-in to save up to 50 shareable tracks, and private
          # links for anonymous sharing.
        </p>
        <div className="tagrow">
          <a className="btn primary" href="/studio">
            Open Studio
          </a>
          <a className="btn" href="/library">
            Saved tracks
          </a>
          <a className="btn" href="/account">
            Account
          </a>
        </div>
      </section>
    </main>
  );
}
