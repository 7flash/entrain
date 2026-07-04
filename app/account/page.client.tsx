import { render } from "tradjs/client";
import {
  connectAndVerify,
  getWalletState,
  signOut,
  type WalletState,
} from "@/client/wallet";

let user: WalletState = { authenticated: false, publicKey: null, balance: 0 };
let stats: any = null;
let msg = "";

function App() {
  return (
    <div className="panel account-panel">
      <div className="toolbar sticky-actions">
        <div>
          <strong>
            {user.authenticated
              ? user.email || user.name || "Google account"
              : "Not signed in"}
          </strong>
          <div className="small">
            {msg ||
              (user.authenticated
                ? "Google account connected."
                : "Sign in to save/share cloud tracks.")}
          </div>
        </div>
        <div className="tagrow">
          {user.authenticated ? (
            <button className="btn" onClick={logout}>
              Sign out
            </button>
          ) : null}
          <button className="btn primary" onClick={login}>
            {user.authenticated ? "Refresh" : "Sign in with Google"}
          </button>
          <a className="btn" href="/library">
            Library
          </a>
          <a className="btn" href="/studio">
            Studio
          </a>
        </div>
      </div>

      {user.authenticated ? (
        <div className="account-grid">
          <article className="card balance-card">
            <h3>Saved track quota</h3>
            <div className="big-number">
              {stats?.savedCount ?? 0}
              <span> / {stats?.limit ?? 50}</span>
            </div>
            <p className="small">
              Each Google account can save and share up to {stats?.limit ?? 50}{" "}
              tracks. This is enough for normal use and keeps the public service
              safe from spam.
            </p>
          </article>
          <article className="card">
            <h3>Sharing model</h3>
            <p className="notice">
              <strong>No payments. No Phantom. No token gates.</strong> Public
              catalogue rows are prepared/admin-curated. Your own tracks stay in
              your account library and can be opened by anyone with your{" "}
              <span className="mono">/shared/...</span> link.
            </p>
          </article>
        </div>
      ) : (
        <div className="notice">
          <strong>Local-first by default.</strong> Studio can create, play,
          export, and generate private <span className="mono">#</span> URLs
          without an account. Google only adds cloud saves and share links.
        </div>
      )}
    </div>
  );
}
async function login() {
  try {
    await connectAndVerify();
  } catch (e: any) {
    msg = e.message || "sign-in started";
    paint();
  }
}
async function logout() {
  await signOut();
}
async function load() {
  const r = await fetch("/api/account")
    .then((r) => r.json())
    .catch(() => ({ ok: false }));
  if (r.ok) stats = r;
}
function paint() {
  render(<App />, document.getElementById("account-root")!);
}
export default async function mount() {
  user = await getWalletState();
  if (user.authenticated) await load();
  paint();
  return () => render(null, document.getElementById("account-root")!);
}
