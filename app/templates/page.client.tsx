import { render } from 'tradjs/client';
import { connectAndVerify, getWalletState } from '@/client/wallet';

type WalletState = Awaited<ReturnType<typeof getWalletState>>;
let state: WalletState = { authenticated: false, balance: 0, publicKey: null };

function AuthBox() {
  return (
    <div className="card">
      <div className="toolbar">
        <div>
          <strong>Wallet access</strong>
          <div className="small">{state.authenticated ? `${state.publicKey?.slice(0,4)}…${state.publicKey?.slice(-4)} · ${state.balance} $ENTRAIN` : 'Connect Phantom to unlock gated templates.'}</div>
        </div>
        <button className="btn primary" onClick={async () => { state = await connectAndVerify(); paint(); }}>Connect Phantom</button>
      </div>
    </div>
  );
}

function markCards() {
  document.querySelectorAll<HTMLElement>('[data-template-card]').forEach((el) => {
    const need = Number(el.dataset.minTokens || '0');
    const label = el.querySelector('.gate');
    if (!label) return;
    const ok = state.balance >= need;
    label.classList.toggle('locked', !ok);
    label.classList.toggle('unlocked', ok);
    label.textContent = ok ? `unlocked · ${need} $ENTRAIN` : `locked · ${need} $ENTRAIN`;
  });
}

async function paint() {
  const root = document.getElementById('auth-root');
  if (root) render(<AuthBox />, root);
  markCards();
}

export default function mount() {
  getWalletState().then((s) => { state = s; paint(); });
  return () => {
    const root = document.getElementById('auth-root');
    if (root) render(null, root);
  };
}
