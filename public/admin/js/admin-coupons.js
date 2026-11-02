// ===========================================
// Config
// ===========================================
const API_BASE = '/api/coupons';        // عدّلها لو مسارك مختلف
const TOKEN_KEY = 'luxe_admin_token';   // عدّلها لو مشروعك بيخزن التوكن باسم تاني

// ===========================================
// State
// ===========================================
let allCoupons = [];
let editingCode = null;

// ===========================================
// DOM
// ===========================================
const $ = (id) => document.getElementById(id);

const els = {
  body: $('couponsBody'),
  search: $('searchInput'),
  filter: $('filterStatus'),
  addBtn: $('addBtn'),
  modal: $('modal'),
  modalTitle: $('modalTitle'),
  modalClose: $('modalClose'),
  cancelBtn: $('cancelBtn'),
  form: $('couponForm'),
  submitBtn: $('submitBtn'),
  formError: $('formError'),
  editingCode: $('editingCode'),
  toast: $('toast'),
  adminName: $('adminName'),
  logoutBtn: $('logoutBtn'),
  // stats
  statTotal: $('statTotal'),
  statActive: $('statActive'),
  statExpired: $('statExpired'),
  statUsages: $('statUsages'),
  // fields
  fCode: $('fieldCode'),
  fType: $('fieldType'),
  fValue: $('fieldValue'),
  fMin: $('fieldMin'),
  fMaxDiscount: $('fieldMaxDiscount'),
  fUsageLimit: $('fieldUsageLimit'),
  fPerUser: $('fieldPerUser'),
  fExpires: $('fieldExpires'),
  fActive: $('fieldActive'),
};

// ===========================================
// Helpers
// ===========================================
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(extra = {}) {
  const t = getToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });

  if (res.status === 401 || res.status === 403) {
    showToast('انتهت الجلسة، سجّل الدخول من جديد', 'error');
    setTimeout(() => (window.location.href = '/admin/login.html'), 1500);
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'حدث خطأ');
  }
  return data;
}

function showToast(msg, type = '') {
  els.toast.textContent = msg;
  els.toast.className = 'toast ' + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.add('hidden'), 3000);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return '—'; }
}

function toLocalDatetimeInput(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  } catch { return ''; }
}

function couponStatus(c) {
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'expired';
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return 'used-up';
  if (!c.isActive) return 'inactive';
  return 'active';
}

function statusBadge(c) {
  const st = couponStatus(c);
  const map = {
    active:   { cls: 'badge-active',   label: 'مُفعّل' },
    inactive: { cls: 'badge-inactive', label: 'غير مُفعّل' },
    expired:  { cls: 'badge-expired',  label: 'منتهي' },
    'used-up':{ cls: 'badge-used-up',  label: 'استُهلك بالكامل' },
  };
  const m = map[st];
  return `<span class="badge ${m.cls}">${m.label}</span>`;
}

// ===========================================
// Render
// ===========================================
function render() {
  const q = els.search.value.trim().toLowerCase();
  const f = els.filter.value;

  const rows = allCoupons.filter((c) => {
    if (q && !c.code.toLowerCase().includes(q)) return false;
    if (f && couponStatus(c) !== f) return false;
    return true;
  });

  if (rows.length === 0) {
    els.body.innerHTML = `<tr><td colspan="8" class="empty">لا توجد كوبونات مطابقة</td></tr>`;
  } else {
    els.body.innerHTML = rows.map((c) => {
      const typeLabel = c.type === 'percentage' ? 'نسبة %' : 'مبلغ ثابت';
      const valueLabel = c.type === 'percentage' ? `${c.value}%` : `${c.value} ج.م`;
      const usageLabel = c.usageLimit != null
        ? `${c.usedCount || 0} / ${c.usageLimit}`
        : `${c.usedCount || 0} / ∞`;

      return `
        <tr>
          <td class="code-cell">${escapeHtml(c.code)}</td>
          <td>${typeLabel}</td>
          <td>${valueLabel}</td>
          <td>${c.minOrderAmount ? c.minOrderAmount + ' ج.م' : '—'}</td>
          <td>${usageLabel}</td>
          <td>${formatDate(c.expiresAt)}</td>
          <td>${statusBadge(c)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-action="edit" data-code="${escapeHtml(c.code)}">تعديل</button>
              <button class="icon-btn danger" data-action="delete" data-code="${escapeHtml(c.code)}">حذف</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // Stats
  const total = allCoupons.length;
  const active = allCoupons.filter((c) => couponStatus(c) === 'active').length;
  const expired = allCoupons.filter((c) => couponStatus(c) === 'expired').length;
  const usages = allCoupons.reduce((s, c) => s + (c.usedCount || 0), 0);
  els.statTotal.textContent = total;
  els.statActive.textContent = active;
  els.statExpired.textContent = expired;
  els.statUsages.textContent = usages;
}

// ===========================================
// Load
// ===========================================
async function loadCoupons() {
  els.body.innerHTML = `<tr><td colspan="8" class="empty">جاري التحميل...</td></tr>`;
  try {
    const res = await api('');           // GET /api/coupons
    allCoupons = res.data || [];
    render();
  } catch (err) {
    els.body.innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(err.message)}</td></tr>`;
    showToast(err.message, 'error');
  }
}

// ===========================================
// Modal
// ===========================================
function openModal(coupon = null) {
  els.formError.classList.add('hidden');
  els.form.reset();
  els.fActive.checked = true;
  els.fPerUser.value = 1;
  els.fMin.value = 0;

  if (coupon) {
    editingCode = coupon.code;
    els.modalTitle.textContent = `تعديل: ${coupon.code}`;
    els.editingCode.value = coupon.code;
    els.fCode.value = coupon.code;
    els.fCode.disabled = true;          // ممنوع تعديل الكود
    els.fType.value = coupon.type;
    els.fValue.value = coupon.value;
    els.fMin.value = coupon.minOrderAmount || 0;
    els.fMaxDiscount.value = coupon.maxDiscount ?? '';
    els.fUsageLimit.value = coupon.usageLimit ?? '';
    els.fPerUser.value = coupon.perUserLimit ?? 1;
    els.fExpires.value = toLocalDatetimeInput(coupon.expiresAt);
    els.fActive.checked = !!coupon.isActive;
  } else {
    editingCode = null;
    els.modalTitle.textContent = 'كوبون جديد';
    els.editingCode.value = '';
    els.fCode.disabled = false;
  }

  els.modal.classList.add('open');
  setTimeout(() => els.fCode.focus(), 60);
}

function closeModal() {
  els.modal.classList.remove('open');
  editingCode = null;
}

// ===========================================
// Submit (Create / Update)
// ===========================================
async function onSubmit(e) {
  e.preventDefault();
  els.formError.classList.add('hidden');

  const payload = {
    code: els.fCode.value.trim().toUpperCase(),
    type: els.fType.value,
    value: Number(els.fValue.value),
    minOrderAmount: Number(els.fMin.value) || 0,
    maxDiscount: els.fMaxDiscount.value === '' ? null : Number(els.fMaxDiscount.value),
    usageLimit: els.fUsageLimit.value === '' ? null : Number(els.fUsageLimit.value),
    perUserLimit: Number(els.fPerUser.value) || 1,
    expiresAt: els.fExpires.value ? new Date(els.fExpires.value).toISOString() : null,
    isActive: els.fActive.checked,
  };

  // تحقق سريع
  if (!payload.code || payload.code.length < 3) {
    return showFormError('الكود لازم 3 أحرف على الأقل');
  }
  if (!payload.value || payload.value <= 0) {
    return showFormError('القيمة لازم أكبر من 0');
  }
  if (payload.type === 'percentage' && payload.value > 100) {
    return showFormError('النسبة لازم أقل من أو تساوي 100');
  }

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'جاري الحفظ...';

  try {
    if (editingCode) {
      // Update — من غير الكود
      delete payload.code;
      await api(`/${encodeURIComponent(editingCode)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      showToast('تم تحديث الكوبون', 'success');
    } else {
      await api('', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('تم إنشاء الكوبون', 'success');
    }
    closeModal();
    await loadCoupons();
  } catch (err) {
    showFormError(err.message);
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = 'حفظ';
  }
}

function showFormError(msg) {
  els.formError.textContent = msg;
  els.formError.classList.remove('hidden');
}

// ===========================================
// Delete
// ===========================================
async function onDelete(code) {
  if (!confirm(`هل تريد حذف الكوبون "${code}" نهائياً؟`)) return;
  try {
    await api(`/${encodeURIComponent(code)}`, { method: 'DELETE' });
    showToast('تم حذف الكوبون', 'success');
    await loadCoupons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===========================================
// Events
// ===========================================
els.addBtn.addEventListener('click', () => openModal(null));
els.modalClose.addEventListener('click', closeModal);
els.cancelBtn.addEventListener('click', closeModal);
els.modal.addEventListener('click', (e) => {
  if (e.target === els.modal) closeModal();
});
els.form.addEventListener('submit', onSubmit);

els.search.addEventListener('input', render);
els.filter.addEventListener('change', render);

els.body.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const code = btn.dataset.code;
  const coupon = allCoupons.find((c) => c.code === code);
  if (btn.dataset.action === 'edit' && coupon) openModal(coupon);
  if (btn.dataset.action === 'delete') onDelete(code);
});

els.logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/admin/login.html';
});

// ===========================================
// Boot
// ===========================================
(function init() {
  if (!getToken()) {
    window.location.href = '/admin/login.html';
    return;
  }
  loadCoupons();
})();
