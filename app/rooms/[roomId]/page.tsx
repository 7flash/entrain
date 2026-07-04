type Props = { params: { roomId: string } };
export default function RoomPage({ params }: Props) {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: "14px" }}>
        <span className="pill unlocked">synced room</span>
        <h1>Room {params.roomId}</h1>
        <p>
          Everyone hears the same soundtrack position. No login, wallet,
          rewards, or payments.
        </p>
      </section>
      <section className="console" id="room-root" data-room-id={params.roomId}>
        <div className="panel">
          <p className="muted">Loading room…</p>
        </div>
      </section>
    </main>
  );
}
