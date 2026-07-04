import { render } from "tradjs/client";

let data: any = { rooms: [], soundtracks: [] };
let msg =
  "Rooms are public. Pick a soundtrack, create a room, and share the link.";
let selected = "";
let busy = false;
function App() {
  return (
    <div className="panel rooms-panel">
      <div className="toolbar sticky-actions">
        <div>
          <strong>Meditation rooms</strong>
          <div className="small">{msg}</div>
        </div>
        <div className="tagrow">
          <a className="btn" href="/soundtracks">
            Soundtracks
          </a>
          <a className="btn primary" href="/studio">
            Create track
          </a>
        </div>
      </div>
      <article className="card room-create-card">
        <h3>Create room</h3>
        <div className="field">
          <label>Soundtrack</label>
          <select
            value={selected}
            onChange={(e: any) => {
              selected = e.currentTarget.value;
              paint();
            }}
          >
            {(data.soundtracks || []).map((s: any) => (
              <option value={s.slug} key={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn primary"
          disabled={busy || !selected}
          onClick={createRoom}
        >
          Create synced room
        </button>
      </article>
      <div className="list">
        {(data.rooms || []).map((r: any) => (
          <article className="card room-card" key={r.roomId}>
            <div className="toolbar room-card-top">
              <div>
                <h3>{r.title || r.slug}</h3>
                <div className="small mono">
                  room {r.roomId} · {r.state} · {r.participantCount || 0}{" "}
                  listeners
                </div>
              </div>
              <div className="tagrow">
                <a className="btn primary" href={`/rooms/${r.roomId}`}>
                  Open room
                </a>
              </div>
            </div>
            {r.participants?.length ? (
              <div className="tagrow">
                {r.participants.slice(0, 12).map((p: any) => (
                  <span className="pill" key={p.clientId}>
                    {p.isHost ? "★ " : ""}
                    {p.label || "listener"}
                  </span>
                ))}
              </div>
            ) : (
              <p className="small muted">No active listeners yet.</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
async function load() {
  data = await fetch("/api/rooms")
    .then((r) => r.json())
    .catch(() => ({ rooms: [], soundtracks: [] }));
  if (!selected && data.soundtracks?.[0]) selected = data.soundtracks[0].slug;
  paint();
}
async function createRoom() {
  busy = true;
  msg = "creating room…";
  paint();
  try {
    const r = await fetch("/api/sync/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: selected }),
    }).then((r) => r.json());
    if (!r.ok) throw new Error(r.error || "room failed");
    location.href = `/rooms/${r.room.roomId}?host=${encodeURIComponent(r.hostKey)}`;
  } catch (e: any) {
    msg = e.message || "room failed";
    busy = false;
    paint();
  }
}
function paint() {
  render(<App />, document.getElementById("rooms-root")!);
}
export default async function mount() {
  await load();
  const t = setInterval(load, 10000);
  return () => {
    clearInterval(t);
    render(null, document.getElementById("rooms-root")!);
  };
}
