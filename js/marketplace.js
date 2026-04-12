// js/marketplace.js
// Marketplace page logic — real-time cards, detail modal, filtering

const Marketplace = {
  requests: [],
  activeFilter: 'all',
  searchQuery: '',
  viewMode: 'grid',
  unsubscribeListener: null,
  currentDetailRequest: null,

  // ── Boot ──────────────────────────────────────────────────────
  init() {
    Auth.init(
      (user, role) => {
        Marketplace.role = role;
        Marketplace.updatePageForRole(role);
        Marketplace.startListener(user, role);
        Marketplace.setupControls();
        Marketplace.setupDetailModal();
        document.getElementById('page-loading')?.classList.add('hidden');
      },
      () => {
        // Not signed in — redirect
        window.location.href = 'index.html';
      }
    );
  },

  // ── Update UI for customer vs supplier ────────────────────────
  updatePageForRole(role) {
    const eyebrow = document.getElementById('page-eyebrow');
    const title   = document.getElementById('page-title');
    const newReqBtn = document.getElementById('new-request-btn');

    if (role === 'customer') {
      if (eyebrow) eyebrow.textContent = 'My Requests';
      if (title)   title.textContent   = 'Your Commissions';
      if (newReqBtn) newReqBtn.classList.remove('hidden');
    } else {
      if (eyebrow) eyebrow.textContent = 'Supplier Job Board';
      if (title)   title.textContent   = 'Live Marketplace';
      if (newReqBtn) newReqBtn.classList.add('hidden');
    }
  },

  // ── Real-time Firestore listener ──────────────────────────────
  startListener(user, role) {
    if (Marketplace.unsubscribeListener) Marketplace.unsubscribeListener();

    let query = db.collection('requests').orderBy('createdAt', 'desc').limit(100);

    if (role === 'customer') {
      query = db.collection('requests')
        .where('customerId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(50);
    } else {
      query = db.collection('requests')
        .where('status', 'in', ['open', 'countered'])
        .orderBy('createdAt', 'desc')
        .limit(100);
    }

    Marketplace.unsubscribeListener = query.onSnapshot(
      (snapshot) => {
        Marketplace.requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        Marketplace.renderCards();
        Marketplace.updateSubtitle();
      },
      (err) => {
        console.error('Firestore error:', err);
        MK.toast('Failed to load marketplace data.', 'error');
      }
    );
  },

  // ── Filtering ─────────────────────────────────────────────────
  filteredRequests() {
    const statusMap = { 'open-bid': 'open', 'countered': 'countered', 'matched': 'matched' };
    return Marketplace.requests.filter(r => {
      const statusOk = Marketplace.activeFilter === 'all' || r.status === statusMap[Marketplace.activeFilter];
      const q = Marketplace.searchQuery.toLowerCase();
      const searchOk = !q ||
        (r.pastryType  || '').toLowerCase().includes(q) ||
        (r.customerName|| '').toLowerCase().includes(q) ||
        (r.location    || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  },

  // ── Render cards ──────────────────────────────────────────────
  renderCards() {
    const container = document.getElementById('cards-container');
    if (!container) return;

    const filtered = Marketplace.filteredRequests();

    if (filtered.length === 0) {
      container.innerHTML = Marketplace.emptyStateHTML();
      return;
    }

    // Set view mode class
    container.className = Marketplace.viewMode === 'list'
      ? 'grid-cards list-view'
      : 'grid-cards';

    container.innerHTML = filtered.map((req, i) =>
      Marketplace.cardHTML(req, i * 60)
    ).join('');

    // Wire up card click → detail modal
    container.querySelectorAll('.bidding-card').forEach(card => {
      const reqId = card.dataset.id;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-actions')) return;
        const req = Marketplace.requests.find(r => r.id === reqId);
        if (req) Marketplace.openDetailModal(req);
      });
    });

    // Wire action buttons
    container.querySelectorAll('.card-btn-accept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Marketplace.handleAccept(btn.dataset.id, btn.dataset.price);
      });
    });
    container.querySelectorAll('.card-btn-counter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Marketplace.toggleCounterInput(btn.dataset.id);
      });
    });
    container.querySelectorAll('.counter-send-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const input = document.getElementById(`counter-input-${btn.dataset.id}`);
        if (input) Marketplace.handleCounter(btn.dataset.id, input.value);
      });
    });
  },

  // ── Render empty state ────────────────────────────────────────
  emptyStateHTML() {
    const isCustomer = Marketplace.role === 'customer';
    return `<div class="empty-state">
      <div class="empty-emoji">🎂</div>
      <div class="empty-title">${isCustomer ? 'No active requests yet' : 'No open jobs right now'}</div>
      <p class="empty-sub">${isCustomer
        ? 'Post your first pastry request and get bids from premium suppliers.'
        : 'Check back soon — customer requests appear here in real time.'}</p>
    </div>`;
  },

  // ── Build card HTML ───────────────────────────────────────────
  cardHTML(req, delay = 0) {
    const {
      id, pastryType, startingPrice, customerName, customerRating,
      imageUrl, location, deadline, occasionTag, status, bids = [],
    } = req;

    const deadlineShort = MK.formatDate(deadline, { day: 'numeric', month: 'short' });
    const price = parseFloat(startingPrice || 0);
    const initials = MK.initials(customerName);

    const imageContent = imageUrl
      ? `<img src="${imageUrl}" alt="${pastryType || 'Pastry'}" loading="lazy">`
      : `<span style="font-size:52px">🎂</span>`;

    return `
    <div class="bidding-card" data-id="${id}" data-status="${status || 'open'}"
         style="animation-delay:${delay}ms">
      <div class="card-image-zone">
        ${imageContent}
        <div class="card-img-gradient"></div>
        <div class="card-status-badge">${MK.statusBadge(status || 'open')}</div>
        <div class="card-view-hint">${MK.icon.expand} View Details</div>
        <div class="card-deadline-pill">${MK.icon.calendar} ${deadlineShort}</div>
      </div>
      <div class="card-body">
        <div class="card-customer-row">
          <div class="customer-avatar">${initials}</div>
          <span class="customer-name">${customerName || 'Anonymous'}</span>
          <span class="customer-rating">${MK.icon.star} ${customerRating || '4.9'}</span>
        </div>
        <div class="card-pastry-title">${pastryType || 'Custom Pastry Order'}</div>
        <div class="card-meta-row">
          <span class="card-meta-item">${MK.icon.pin} ${location || 'Harare'}</span>
          ${occasionTag ? `<span class="card-occasion-tag">${occasionTag}</span>` : ''}
        </div>
        <div class="card-price-row">
          <div>
            <div class="price-label-sm">Starting bid</div>
            <div class="price-amount">${MK.formatPrice(price)}</div>
          </div>
          <div style="text-align:right">
            <div class="bids-count">${bids.length || 0}</div>
            <div class="bids-sublabel">offers</div>
          </div>
        </div>
        <div class="counter-input-row" id="counter-row-${id}">
          <input class="input" type="number" id="counter-input-${id}"
            placeholder="Your price…" min="1" style="font-size:13px;padding:9px 12px">
          <button class="btn btn-gold btn-sm counter-send-btn" data-id="${id}">Send</button>
        </div>
        <div class="card-actions" style="display:${Marketplace.role === 'supplier' ? 'flex' : 'none'}">
          <button class="card-btn-accept" data-id="${id}" data-price="${price}">
            ${MK.icon.check} Accept ${MK.formatPrice(price)}
          </button>
          <button class="card-btn-counter" data-id="${id}">
            ${MK.icon.trend} Counter
          </button>
        </div>
      </div>
    </div>`;
  },

  // ── Toggle counter input ──────────────────────────────────────
  toggleCounterInput(reqId) {
    const row = document.getElementById(`counter-row-${reqId}`);
    if (row) row.classList.toggle('open');
  },

  // ── Accept a bid ──────────────────────────────────────────────
  async handleAccept(reqId, price) {
    const user = Auth.currentUser;
    if (!user) { MK.toast('Please sign in first.', 'error'); return; }

    const btn = MK.qs(`[data-id="${reqId}"].card-btn-accept`);
    if (btn) MK.setButtonLoading(btn, 'Matching…');

    try {
      const batch = db.batch();

      const bidRef = db.collection('bids').doc();
      batch.set(bidRef, {
        requestId:    reqId,
        supplierId:   user.uid,
        supplierName: user.displayName || 'Supplier',
        amount:       parseFloat(price),
        type:         'accept',
        createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      });

      const reqRef = db.collection('requests').doc(reqId);
      batch.update(reqRef, {
        status:              'matched',
        matchedSupplierId:   user.uid,
        matchedSupplierName: user.displayName || 'Supplier',
        matchedPrice:        parseFloat(price),
        matchedAt:           firebase.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      MK.toast('Matched! The customer has been notified.', 'success');
    } catch (err) {
      console.error(err);
      MK.toast('Something went wrong. Please try again.', 'error');
    } finally {
      if (btn) MK.resetButton(btn);
    }
  },

  // ── Send a counter-offer ──────────────────────────────────────
  async handleCounter(reqId, rawValue) {
    const amount = parseFloat(rawValue);
    if (!amount || amount <= 0) { MK.toast('Please enter a valid amount.', 'error'); return; }
    const user = Auth.currentUser;
    if (!user) { MK.toast('Please sign in first.', 'error'); return; }

    try {
      const batch = db.batch();

      const bidRef = db.collection('bids').doc();
      batch.set(bidRef, {
        requestId:    reqId,
        supplierId:   user.uid,
        supplierName: user.displayName || 'Supplier',
        amount,
        type:         'counter',
        createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      });

      const reqRef = db.collection('requests').doc(reqId);
      batch.update(reqRef, {
        status:           'countered',
        latestCounter:    amount,
        latestCounterBy:  user.displayName || 'Supplier',
        latestCounterAt:  firebase.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      MK.toast(`Counter-offer of ${MK.formatPrice(amount)} sent!`, 'success');

      const row = document.getElementById(`counter-row-${reqId}`);
      if (row) { row.classList.remove('open'); }
      const input = document.getElementById(`counter-input-${reqId}`);
      if (input) input.value = '';
    } catch (err) {
      console.error(err);
      MK.toast('Failed to send counter-offer.', 'error');
    }
  },

  // ── Detail modal ──────────────────────────────────────────────
  setupDetailModal() {
    const closeBtn = document.getElementById('detail-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => MK.closeModal('detail-modal'));
  },

  openDetailModal(req) {
    Marketplace.currentDetailRequest = req;
    const {
      pastryType, customerName, customerRating, description,
      imageUrl, location, deadline, servings, dietaryNotes,
      startingPrice, occasionTag, bids = [], status,
    } = req;

    // Hero image
    const hero = document.getElementById('modal-hero-inner');
    if (hero) {
      hero.innerHTML = imageUrl
        ? `<img src="${imageUrl}" alt="${pastryType}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.82">`
        : `<span class="modal-hero-emoji">${Marketplace._pastryEmoji(pastryType)}</span>`;
    }

    // Status badge
    const badgeEl = document.getElementById('modal-status-badge');
    if (badgeEl) badgeEl.innerHTML = MK.statusBadge(status || 'open');

    // Customer
    const nameEl = document.getElementById('modal-customer-name');
    if (nameEl) nameEl.textContent = customerName || 'Anonymous';

    const ratingEl = document.getElementById('modal-customer-rating');
    if (ratingEl) ratingEl.textContent = customerRating || '4.9';

    // Price
    const priceEl = document.getElementById('modal-price');
    if (priceEl) priceEl.textContent = MK.formatPrice(startingPrice);

    const offersEl = document.getElementById('modal-offers');
    if (offersEl) offersEl.textContent = `${bids.length || 0} offers`;

    // Pastry title
    const titleEl = document.getElementById('modal-pastry-title');
    if (titleEl) {
      titleEl.innerHTML = (pastryType || 'Custom Commission') +
        (occasionTag ? ` <span class="badge badge-orange" style="font-size:11px;vertical-align:middle">${occasionTag}</span>` : '');
    }

    // Description
    const descEl = document.getElementById('modal-description');
    if (descEl) descEl.textContent = description || 'No description provided.';

    // Detail rows
    const rows = [
      ['modal-detail-location', location || '—'],
      ['modal-detail-deadline', MK.formatDateLong(deadline)],
      ['modal-detail-servings', servings ? `${servings} guests` : '—'],
      ['modal-detail-dietary',  dietaryNotes || 'None specified'],
    ];
    rows.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });

    // Show/hide supplier action buttons
    const modalActions = document.getElementById('modal-supplier-actions');
    if (modalActions) {
      modalActions.classList.toggle('hidden', Marketplace.role !== 'supplier');
      if (Marketplace.role === 'supplier') {
        const acceptBtn = document.getElementById('modal-accept-btn');
        if (acceptBtn) {
          acceptBtn.textContent = '';
          acceptBtn.appendChild(document.createTextNode(`Accept ${MK.formatPrice(startingPrice)}`));
          acceptBtn.onclick = () => {
            Marketplace.handleAccept(req.id, startingPrice);
            MK.closeModal('detail-modal');
          };
        }
      }
    }

    MK.openModal('detail-modal');
  },

  _pastryEmoji(type) {
    const map = {
      'Wedding Cake': '🎂', 'Birthday Cake': '🎂', 'Artisan Bread': '🍞',
      'Croissants': '🥐', 'Macarons': '🍬', 'Cupcakes': '🧁',
      'Cheesecake': '🍰', 'Donuts': '🍩', 'Custom Savory': '🥧',
    };
    return map[type] || '🎂';
  },

  // ── Controls setup ────────────────────────────────────────────
  setupControls() {
    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        Marketplace.searchQuery = e.target.value;
        Marketplace.renderCards();
      });
    }

    // Filter pills
    MK.qsa('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        MK.qsa('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        Marketplace.activeFilter = pill.dataset.filter;
        Marketplace.renderCards();
      });
    });

    // View toggle
    MK.qsa('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        MK.qsa('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Marketplace.viewMode = btn.dataset.view;
        Marketplace.renderCards();
      });
    });

    // New request button
    const newBtn = document.getElementById('new-request-btn');
    if (newBtn) newBtn.addEventListener('click', () => MK.openModal('post-modal'));
  },

  updateSubtitle() {
    const sub = document.getElementById('page-subtitle');
    if (!sub) return;
    const count = Marketplace.filteredRequests().length;
    const label = Marketplace.role === 'customer' ? 'request' : 'open job';
    sub.innerHTML = `<span class="live-dot"></span>${count} ${label}${count !== 1 ? 's' : ''} · updating live`;
  },
};

window.Marketplace = Marketplace;
