// js/utils.js
// Shared utility functions for MaKeke.Sunnyside

// ── Toast notifications ────────────────────────────────────────
const MK = {

  // Show a toast notification
  toast(message, type = 'default', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast${type !== 'default' ? ` toast-${type}` : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  // ── Modal management ──────────────────────────────────────────
  openModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.classList.remove('closing');
    const panel = overlay.querySelector('.modal-panel');
    if (panel) panel.classList.remove('closing');
    document.body.style.overflow = 'hidden';
    overlay.onclick = (e) => { if (e.target === overlay) MK.closeModal(id); };
  },

  closeModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('closing');
    const panel = overlay.querySelector('.modal-panel');
    if (panel) panel.classList.add('closing');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('closing');
      if (panel) panel.classList.remove('closing');
      document.body.style.overflow = '';
    }, 300);
  },

  // ── DOM helpers ───────────────────────────────────────────────
  el(id) { return document.getElementById(id); },
  qs(selector, parent = document) { return parent.querySelector(selector); },
  qsa(selector, parent = document) { return [...parent.querySelectorAll(selector)]; },

  // ── Format date ───────────────────────────────────────────────
  formatDate(dateOrTimestamp, opts = {}) {
    let d;
    if (!dateOrTimestamp) return 'TBD';
    if (dateOrTimestamp?.toDate) {
      d = dateOrTimestamp.toDate();
    } else if (dateOrTimestamp instanceof Date) {
      d = dateOrTimestamp;
    } else {
      d = new Date(dateOrTimestamp);
    }
    if (isNaN(d)) return 'TBD';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', ...opts
    });
  },

  formatDateLong(ts) {
    return MK.formatDate(ts, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },

  // ── Format currency ───────────────────────────────────────────
  formatPrice(n) {
    const v = parseFloat(n);
    if (isNaN(v)) return '$0';
    return '$' + (Number.isInteger(v) ? v.toString() : v.toFixed(2));
  },

  // ── Get initials from name ────────────────────────────────────
  initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
  },

  // ── Status badge HTML ─────────────────────────────────────────
  statusBadge(status) {
    const map = {
      open:      ['Open Bid',        'badge-gold'],
      countered: ['Counter-Offered', 'badge-orange'],
      matched:   ['Matched',         'badge-green'],
      closed:    ['Closed',          'badge-muted'],
    };
    const [label, cls] = map[status] || map.open;
    return `<span class="badge ${cls}">${label}</span>`;
  },

  // ── Icon SVG strings (inline, 16×16) ─────────────────────────
  icon: {
    check:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    trend:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    x:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    pin:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    calendar: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    users:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    shield:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    star:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="#D4AF37" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    expand:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    upload:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>`,
    image:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" stroke-width="1.8" opacity=".75"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    search:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    plus:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    logout:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    grid:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    list:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    warning:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    spinner:  `<span class="spinner spinner-sm spinner-black"></span>`,
    dollar:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    tag:      `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    file:     `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  },

  // ── Validation helpers ────────────────────────────────────────
  showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`err-${fieldId}`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
      errorEl.querySelector('.err-text').textContent = message;
      errorEl.classList.add('show');
    }
    if (inputEl) inputEl.classList.add('error');
  },

  clearFieldError(fieldId) {
    const errorEl = document.getElementById(`err-${fieldId}`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.classList.remove('show');
    if (inputEl) inputEl.classList.remove('error');
  },

  clearAllErrors(fieldIds) {
    fieldIds.forEach(id => MK.clearFieldError(id));
  },

  // ── Loading state on button ───────────────────────────────────
  setButtonLoading(btn, loadingText = 'Loading…') {
    btn._originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner spinner-sm spinner-black"></span> ${loadingText}`;
  },

  resetButton(btn) {
    btn.disabled = false;
    if (btn._originalHTML) btn.innerHTML = btn._originalHTML;
  },
};

// Make MK global
window.MK = MK;
