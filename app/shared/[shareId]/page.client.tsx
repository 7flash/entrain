import { render, navigate } from "tradjs/client";

let state: any = { loading: true, error: "", track: null };
function App() {
  if (state.loading)
    return (
      <div className="panel">
        <p className="muted">Loading shared track…</p>
      </div>
    );
  if (state.error)
    return (
      <div className="panel">
        <h2>Share unavailable</h2>
        <p className="muted">{state.error}</p>
        <a className="btn" href="/studio">
          Open Studio
        </a>
      </div>
    );
  const t = state.track;
  return (
    <div className="panel">
      <div className="toolbar">
        <div>
          <h2>{t.name}</h2>
          <div className="small">
            Shared by {t.ownerEmail || "an ENTRAIN user"} ·{" "}
            {t.scriptFormat || "entrain-script.v1"}
          </div>
          {t.description ? <p className="muted">{t.description}</p> : null}
        </div>
        <div className="tagrow">
          <button className="btn primary" onClick={() => open()}>
            Open in Studio
          </button>
          <button className="btn" onClick={() => copy()}>
            Copy source
          </button>
        </div>
      </div>
      {t.scriptText ? <pre className="source-pre">{t.scriptText}</pre> : null}
    </div>
  );
}
function open() {
  const t = state.track;
  if (t?.scriptText)
    sessionStorage.setItem("entrain:loaded-script", t.scriptText);
  else if (t?.session)
    sessionStorage.setItem("entrain:loaded-session", JSON.stringify(t.session));
  navigate("/studio?shared=1");
}
async function copy() {
  await navigator.clipboard
    .writeText(
      state.track?.scriptText ||
        JSON.stringify(state.track?.session || {}, null, 2),
    )
    .catch(() => {});
}
function paint() {
  render(<App />, document.getElementById("shared-root")!);
}
export default async function mount() {
  const root = document.getElementById("shared-root")!;
  const id = root.getAttribute("data-share-id");
  const r = await fetch(`/api/shared/${id}`)
    .then((r) => r.json())
    .catch(() => ({ ok: false, error: "Failed to load share." }));
  state = r.ok
    ? { loading: false, track: r.track, error: "" }
    : { loading: false, track: null, error: r.error || "Share not found" };
  paint();
  return () => render(null, root);
}
