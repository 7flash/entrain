type Props = { params: { shareId: string } };
export default function SharedTrackPage({ params }: Props) {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: "14px" }}>
        <span className="pill unlocked">private share link</span>
        <h1>Shared ENTRAIN track</h1>
        <p>
          This link opens a user-saved algorithmic soundtrack. No login is
          required to play or clone it.
        </p>
      </section>
      <section
        className="console"
        id="shared-root"
        data-share-id={params.shareId}
      >
        <div className="panel">
          <p className="muted">Loading shared track…</p>
        </div>
      </section>
    </main>
  );
}
