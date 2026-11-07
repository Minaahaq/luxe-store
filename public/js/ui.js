// ===========================================
// UI Utilities - LUXE Store
// ===========================================

/* ============================================
   UTILS
============================================ */
function escHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ============================================
   TOAST
============================================ */
export function showToast(message, type = 'info') {
  const validTypes = ['success', 'error', 'warning', 'info'];
  const safeType = validTypes.includes(type) ? type : 'info';
  const text = typeof message === 'string' ? message : String(message ?? '');

  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    container.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;width:calc(100% - 32px);max-width:400px;';
    document.body.appendChild(container);
  }

  // حد أقصى 3 toasts
  const existing = container.querySelectorAll('[role="status"],[role="alert"]');
  if (existing.length >= 3) existing[0].remove();

  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');
  toast.style.cssText = `background:#0a0e17;color:#fff;padding:14px 24px;border-radius:12px;font-weight:700;font-size:14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 40px rgba(0,0,0,.25);border-right:4px solid ${colors[safeType]};font-family:'Cairo',sans-serif;min-width:260px;pointer-events:auto;animation:toastIn .4s ease;`;

  // آمن: نبني بـ createElement بدل innerHTML
  const iconSpan = document.createElement('span');
  iconSpan.style.cssText = `color:${colors[safeType]};font-weight:900`;
  iconSpan.textContent = icons[safeType];

  const msgSpan = document.createElement('span');
  msgSpan.textContent = text;

  toast.append(iconSpan, msgSpan);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = '.3s';
    setTimeout(() => toast.parentNode?.removeChild(toast), 300);
  }, 3500);
}

/* ============================================
   LOADER
============================================ */
export function showLoading(message = 'جاري التحميل...') {
  const text = typeof message === 'string' ? message : String(message ?? '');

  let loader = document.getElementById('globalLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,23,.85);backdrop-filter:blur(8px);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:#c9a961;font-family:\'Cairo\',sans-serif;font-weight:700;font-size:16px;';

    const spinner = document.createElement('div');
    spinner.style.cssText = 'width:60px;height:60px;border:4px solid rgba(201,169,97,.2);border-top-color:#c9a961;border-radius:50%;animation:spin 1s linear infinite';

    const msgEl = document.createElement('div');
    msgEl.className = 'loader-msg';
    msgEl.textContent = text;

    loader.append(spinner, msgEl);
    document.body.appendChild(loader);

    if (!document.getElementById('loaderStyles')) {
      const s = document.createElement('style');
      s.id = 'loaderStyles';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}} @keyframes toastIn{from{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}';
      document.head.appendChild(s);
    }
  } else {
    const msgEl = loader.querySelector('.loader-msg');
    if (msgEl) msgEl.textContent = text;
    loader.style.display = 'flex';
  }
}

export function hideLoading() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'none';
}

/* ============================================
   FORMATTING
============================================ */
export function formatPrice(amount, currency = 'ج.م') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `0 ${currency}`;
  return `${n.toLocaleString('ar-EG')} ${currency}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '—';
    try {
      return date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return date.toLocaleString('ar-EG');
    }
  } catch {
    return '—';
  }
}

/* ============================================
   CART
============================================ */
const CART_KEY = 'luxe_cart';

/** قراءة السلة بشكل آمن */
export function getCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(i => i && typeof i === 'object' && i.id != null)
      .map(i => ({
        id: i.id,
        name: String(i.name || ''),
        price: Math.max(0, Number(i.price) || 0),
        image: String(i.image || ''),
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
        stock: Math.max(0, Math.floor(Number(i.stock) || 0))
      }));
  } catch {
    return [];
  }
}

/** حفظ آمن */
export function saveCart(cart) {
  if (!Array.isArray(cart)) return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (err) {
    console.warn('[saveCart] فشل الحفظ:', err);
  }
  updateCartBadge();
}

/** مسح السلة */
export function clearCart() {
  try { localStorage.removeItem(CART_KEY); } catch {}
  updateCartBadge();
}

/** إضافة للسلة — async لتدعم التحقق */
export async function addToCart(product, qty = 1) {
  if (!product || product.id == null) {
    throw new Error('منتج غير صالح');
  }

  const quantity = Math.max(1, Math.floor(Number(qty) || 1));
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));

  if (stock <= 0) {
    throw new Error('نفذت الكمية');
  }

  const cart = getCart();
  const existing = cart.find(i => String(i.id) === String(product.id));
  const currentInCart = existing ? existing.qty : 0;
  const newTotal = currentInCart + quantity;

  if (newTotal > stock) {
    throw new Error(`الكمية المتاحة ${stock} فقط`);
  }

  if (existing) {
    existing.qty = newTotal;
    existing.stock = stock;
  } else {
    cart.push({
      id: product.id,
      name: String(product.name || ''),
      price: Math.max(0, Number(product.price) || 0),
      image: String(product.thumbnail || (Array.isArray(product.images) && product.images[0]) || ''),
      qty: quantity,
      stock
    });
  }

  saveCart(cart);
  return cart;
}

export function removeFromCart(id) {
  const cart = getCart().filter(i => String(i.id) !== String(id));
  saveCart(cart);
  return cart;
}

export function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => String(i.id) === String(id));
  if (!item) return cart;

  const q = Math.floor(Number(qty) || 0);
  if (q <= 0) return removeFromCart(id);

  // لو المنتج عنده stock محفوظ، تحقق
  if (item.stock > 0 && q > item.stock) {
    item.qty = item.stock;
  } else {
    item.qty = q;
  }

  saveCart(cart);
  return cart;
}

export function getCartItem(id) {
  return getCart().find(i => String(i.id) === String(id)) || null;
}

export function getCartTotal() {
  return getCart().reduce(
    (s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0),
    0
  );
}

export function getCartCount() {
  return getCart().reduce((s, i) => s + (Number(i.qty) || 0), 0);
}

export function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('[data-cart-badge]').forEach(el => {
    el.textContent = String(count);
    el.style.display = count > 0 ? 'flex' : 'none';
    el.setAttribute('aria-label', `${count} منتج في السلة`);
  });
}
