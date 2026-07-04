export default function AccountPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: "14px" }}>
        <span className="pill unlocked">Google account</span>
        <h1>Your account</h1>
        <p>
          Use Google sign-in for saved tracks and share links. Payments,
          Phantom, room rewards, and token withdrawals are disabled.
        </p>
      </section>
      <section className="console" id="account-root">
        <div className="panel">
          <p className="muted">Loading account…</p>
        </div>
      </section>
    </main>
  );
}
