/* ===========================================
   LUXE — App Feel Script
   =========================================== */

(function () {
  'use strict';

  /* ---------- 1. كشف standalone mode ---------- */
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    document.body.classList.add('is-app');
  }

  /* ---------- 2. Splash Screen ---------- */
  function showSplash() {
    if (!document.querySelector('.hero')) return;

    const splash = document.createElement('div');
    splash.className = 'app-splash';
    splash.innerHTML = `
      <div class="app-splash-logo">LUXE</div>
      <div class="app-splash-tag">STORE</div>
    `;
    document.body.appendChild(splash);

    requestAnimationFrame(() => splash.classList.add('show'));

    window.addEventListener('load', () => {
      setTimeout(() => {
        splash.classList.remove('show');
        setTimeout(() => splash.remove(), 400);
      }, 500);
    });

    setTimeout(() => {
      splash.classList.remove('show');
      setTimeout(() => splash.remove(), 400);
    }, 2500);
  }

  /* ---------- 3. Bottom Navigation ---------- */
  function buildBottomNav() {
    if (document.querySelector('.app-bottom-nav')) return;

    const path = window.location.pathname.split('/').pop() || 'index.html';

 const items = [
  { href: './index.html', label: 'الرئيسية', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { href: './products.html', label: 'المنتجات', icon: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' },
  { href: './orders.html', label: 'طلباتي', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
  { href: './cart.html', label: 'السلة', icon: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>', badge: true },
  { href: './profile.html', label: 'حسابي', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' }
];

    const nav = document.createElement('nav');
    nav.className = 'app-bottom-nav';
    nav.setAttribute('aria-label', 'التنقل السريع');

    nav.innerHTML = items.map(item => {
      const isActive = path === item.href || (item.href === 'index.html' && (path === '' || path === 'index.html'));
      return `
        <a href="${item.href}" class="app-nav-item ${isActive ? 'active' : ''}" aria-label="${item.label}" ${isActive ? 'aria-current="page"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${item.icon}</svg>
          <span>${item.label}</span>
          ${item.badge ? '<span class="nav-badge" data-cart-badge>0</span>' : ''}
        </a>`;
    }).join('');

    document.body.appendChild(nav);

    nav.querySelectorAll('.app-nav-item').forEach(a => {
      a.addEventListener('click', () => haptic(8));
    });
  }

  /* ---------- 4. Haptic ---------- */
  function haptic(ms = 8) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  function attachHaptics() {
    const selectors = ['.add-btn', '.btn-hero', '.btn-primary', '.checkout-btn', '.icon-btn', '.filter-btn'];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if (el.dataset.hapticBound) return;
      el.dataset.hapticBound = '1';
      el.addEventListener('pointerdown', () => haptic(6));
    });
  }

  /* ---------- 5. Pull to Refresh ---------- */
  function setupPullToRefresh() {
    let startY = 0, pulling = false, distance = 0;
    const threshold = 70;

    const ptr = document.createElement('div');
    ptr.className = 'app-ptr';
    ptr.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
    document.body.appendChild(ptr);

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      distance = e.touches[0].clientY - startY;
      if (distance > 0 && distance < 160) {
        const progress = Math.min(distance / threshold, 1);
        ptr.style.transform = `translateX(-50%) translateY(${-60 + distance * 0.8}px)`;
        ptr.style.opacity = progress;
        if (distance > 10) ptr.classList.add('visible');
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!pulling) return;
      pulling = false;
      if (distance > threshold) {
        ptr.style.transform = 'translateX(-50%) translateY(20px)';
        ptr.classList.add('spinning');
        haptic(20);
        setTimeout(() => location.reload(), 400);
      } else {
        ptr.style.transform = 'translateX(-50%) translateY(-60px)';
        ptr.style.opacity = 0;
        setTimeout(() => ptr.classList.remove('visible'), 250);
      }
      distance = 0;
    });
  }

  /* ---------- 6. App Toast ---------- */
  function appToast(message, type = 'info', duration = 2500) {
    const existing = document.querySelector('.app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  window.appToast = appToast;

  /* ---------- 7. Page Transitions ---------- */
  function setupPageTransitions() {
    document.querySelectorAll('main, .hero, .section, .page-title-bar').forEach(el => {
      el.classList.add('app-page');
    });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || link.target === '_blank' || e.ctrlKey || e.metaKey) return;
      if (href === window.location.pathname.split('/').pop()) return;

      e.preventDefault();
      haptic(6);
      document.querySelectorAll('.app-page').forEach(p => p.classList.add('leaving'));
      setTimeout(() => { window.location.href = href; }, 220);
    });
  }

  /* ---------- 8. Sync Cart Badge ---------- */
  function syncBadges() {
    const badges = document.querySelectorAll('[data-cart-badge]');
    const count = parseInt(localStorage.getItem('luxe_cart_count') || '0', 10);
    badges.forEach(b => {
      b.textContent = count;
      if (b.classList.contains('nav-badge')) {
        b.classList.toggle('show', count > 0);
      } else {
        b.style.display = count > 0 ? 'flex' : 'none';
      }
    });
  }

  /* ---------- INIT ---------- */
  function init() {
    showSplash();
    buildBottomNav();
    setupPullToRefresh();
    setupPageTransitions();
    setTimeout(attachHaptics, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const grid = document.getElementById('productsGrid');
  if (grid) {
    const mo = new MutationObserver(() => attachHaptics());
    mo.observe(grid, { childList: true });
  }

})();
