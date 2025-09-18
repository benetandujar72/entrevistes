export type ToastType = 'success' | 'error' | 'info';

function ensureRoot(): HTMLElement {
  let root = document.getElementById('toast-root') as HTMLElement | null;
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.style.position = 'fixed';
    root.style.top = '12px';
    root.style.right = '12px';
    root.style.display = 'grid';
    root.style.gap = '8px';
    root.style.zIndex = '9999';
    document.body.appendChild(root);
  }
  return root;
}

export function toast(message: string, type: ToastType = 'info', timeoutMs = 3000) {
  const root = ensureRoot();
  const el = document.createElement('div');
  el.textContent = message;
  el.style.padding = '10px 12px';
  el.style.borderRadius = '10px';
  el.style.border = '1px solid var(--toast-border, #e5e7eb)';
  el.style.background = 'var(--toast-bg, #ffffff)';
  el.style.color = 'var(--toast-fg, #111827)';
  el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
  if (type === 'success') {
    el.style.borderColor = '#bbf7d0';
    el.style.background = '#ecfdf5';
    el.style.color = '#065f46';
  } else if (type === 'error') {
    el.style.borderColor = '#fecaca';
    el.style.background = '#fff1f2';
    el.style.color = '#7f1d1d';
  }
  el.style.opacity = '0';
  el.style.transition = 'opacity .2s ease';
  root.appendChild(el);
  requestAnimationFrame(() => (el.style.opacity = '1'));
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220);
  }, timeoutMs);
}

export const toastSuccess = (m: string) => toast(m, 'success');
export const toastError = (m: string) => toast(m, 'error');
export const toastInfo = (m: string) => toast(m, 'info');


