export default function RoomsPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: "14px" }}>
        <span className="pill unlocked">synced listening</span>
        <h1>Meditation rooms</h1>
        <p>
          Rooms are public/free. Anyone with a room link can join synced
          playback; no wallet, rewards, or payments.
        </p>
      </section>
      <section className="console" id="rooms-root">
        <div className="panel">
          <p className="muted">Loading rooms…</p>
        </div>
      </section>
    </main>
  );
}
