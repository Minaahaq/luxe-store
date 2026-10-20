// ===========================================
// UI Utilities - LUXE Store
// ===========================================

export function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `position:fixed;top:100px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;`;
    document.body.appendChild(container);
  }

  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.style.cssText = `background:#0a0e17;color:#fff;padding:14px 24px;border-radius:12px;font-weight:700;font-size:14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 40px rgba(0,0,0,.25);border-right:4px solid ${colors[type]};font-family:'Cairo',sans-serif;min-width:260px;pointer-events:auto;animation:toastIn .4s ease;`;
  toast.innerHTML = `<span style="color:${colors[type]};font-weight:900">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = '.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function showLoading(message = 'جاري التحميل...') {
  let loader = document.getElementById('globalLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.style.cssText = `position:fixed;inset:0;background:rgba(10,14,23,.85);backdrop-filter:blur(8px);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:#c9a961;font-family:'Cairo',sans-serif;font-weight:700;font-size:16px;`;
    loader.innerHTML = `<div style="width:60px;height:60px;border:4px solid rgba(201,169,97,.2);border-top-color:#c9a961;border-radius:50%;animation:spin 1s linear infinite"></div><div class="loader-msg">${message}</div>`;
    document.body.appendChild(loader);

    if (!document.getElementById('loaderStyles')) {
      const s = document.createElement('style');
      s.id = 'loaderStyles';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}} @keyframes toastIn{from{opacity:0;transform:translateY(-20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}';
      document.head.appendChild(s);
    }
  } else {
    loader.querySelector('.loader-msg').textContent = message;
    loader.style.display = 'flex';
  }
}

export function hideLoading() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'none';
}

export function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
  return amount.toLocaleString('ar-EG') + ' ج.م';
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

// Cart
const CART_KEY = 'luxe_cart';

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

export function addToCart(product, qty = 1) {
  const cart = getCart();
  const item = cart.find(i => i.id === product.id);
  if (item) item.qty += qty;
  else cart.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.thumbnail || (product.images && product.images[0]) || '',
    qty
  });
  saveCart(cart);
  return cart;
}

export function removeFromCart(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  return cart;
}

export function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    if (qty <= 0) return removeFromCart(id);
    item.qty = qty;
  }
  saveCart(cart);
  return cart;
}

export function getCartTotal() {
  return getCart().reduce((s, i) => s + i.price * i.qty, 0);
}

export function getCartCount() {
  return getCart().reduce((s, i) => s + i.qty, 0);
}

export function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('[data-cart-badge]').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}
