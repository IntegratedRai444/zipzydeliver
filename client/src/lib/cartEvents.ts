// Lightweight cross-tab/cart update broadcaster
let channel: BroadcastChannel | null = null;
try {
  channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('zipzy-cart')
    : null;
} catch {
  channel = null;
}

export function emitCartUpdated(): void {
  try { channel?.postMessage({ type: 'updated', ts: Date.now() }); } catch {}
  try { window.dispatchEvent(new CustomEvent('zipzy:cart-updated')); } catch {}
}

export function subscribeCartUpdated(callback: () => void): () => void {
  const onMessage = () => callback();
  const onEvent = () => callback();
  try { channel?.addEventListener('message', onMessage as any); } catch {}
  try { window.addEventListener('zipzy:cart-updated', onEvent as any); } catch {}
  return () => {
    try { channel?.removeEventListener('message', onMessage as any); } catch {}
    try { window.removeEventListener('zipzy:cart-updated', onEvent as any); } catch {}
  };
}


