export default function mount() {
  // Public/free mode: homepage does not need token-market polling.
  return () => {};
}
