// js/marketplace.js — PART 1: Initialization
const Marketplace = {
  requests: [],
  activeFilter: 'all',
  searchQuery: '',
  viewMode: 'grid',
  unsubscribeListener: null,
  currentDetailRequest: null,
  role: null, // Set during init

  /**
   * ── Boot Logic ──────────────────────────────────────────────
   * Connects to Auth, sets role, and clears the loading screen.
   */
  init() {
    Auth.init(
      (user, role) => {
        Marketplace.role = role;
        
        // 1. Setup UI based on Customer or Supplier
        Marketplace.updatePageForRole(role);
        
        // 2. Connect to live data
        Marketplace.startListener(user, role);
        
        // 3. Bind UI event listeners
        Marketplace.setupControls();
        Marketplace.setupDetailModal();
        
        // 4. Force hide the loader (Bypasses CSS specificity issues)
        const loader = document.getElementById('page-loading');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => { loader.style.display = 'none'; }, 300);
        }
      },
      () => {
        // Not signed in — redirect back to landing
        window.location.href = 'index.html';
      }
    );
  },

  /**
   * Updates text labels based on whether the user is buying or selling.
   */
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
  }
};

// Start the app
window.Marketplace = Marketplace;

// js/marketplace.js — PART 2: Data Streaming

/**
 * ── Real-time Firestore listener ──────────────────────────────
 * Fetches data based on the user's role and listens for changes.
 */
Marketplace.startListener = function(user, role) {
  // If there's an existing listener, kill it to prevent memory leaks
  if (Marketplace.unsubscribeListener) Marketplace.unsubscribeListener();

  // Reference the 'requests' collection
  let query = db.collection('requests').orderBy('createdAt', 'desc');

  if (role === 'customer') {
    // Customers only see requests they personally created
    query = query.where('customerId', '==', user.uid).limit(50);
  } else {
    // Suppliers see all 'open' jobs or active negotiations ('countered')
    query = query.where('status', 'in', ['open', 'countered']).limit(100);
  }

  // Set up the snapshot listener
  Marketplace.unsubscribeListener = query.onSnapshot(
    (snapshot) => {
      // Map the Firestore docs into a clean array of objects
      Marketplace.requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Trigger the UI rebuild
      Marketplace.renderCards();
      Marketplace.updateSubtitle();
    },
    (err) => {
      console.error('Firestore Streaming Error:', err);
      if (typeof MK !== 'undefined') {
        MK.toast('Real-time sync failed. Please check connection.', 'error');
      }
    }
  );
};

/**
 * Updates the 'live' count in the header.
 */
Marketplace.updateSubtitle = function() {
  const sub = document.getElementById('page-subtitle');
  if (!sub) return;
  
  const count = Marketplace.filteredRequests().length;
  const label = Marketplace.role === 'customer' ? 'request' : 'open job';
  
  sub.innerHTML = `
    <span class="live-dot pulse"></span>
    ${count} ${label}${count !== 1 ? 's' : ''} · updating live
  `;
};

// js/marketplace.js — PART 3: Filtering & Search

/**
 * Returns a subset of requests based on search query and status filters.
 * Used by renderCards() to decide what to show.
 */
Marketplace.filteredRequests = function() {
  // Map UI filter names to database status values
  const statusMap = { 
    'open-bid': 'open', 
    'countered': 'countered', 
    'matched': 'matched' 
  };

  return Marketplace.requests.filter(req => {
    // 1. Status Filter Logic
    const isAll = Marketplace.activeFilter === 'all';
    const statusMatch = isAll || req.status === statusMap[Marketplace.activeFilter];

    // 2. Search Logic (Case-insensitive)
    const query = Marketplace.searchQuery.toLowerCase().trim();
    const searchMatch = !query || 
      (req.pastryType   || '').toLowerCase().includes(query) ||
      (req.customerName || '').toLowerCase().includes(query) ||
      (req.location     || '').toLowerCase().includes(query) ||
      (req.description  || '').toLowerCase().includes(query);

    return statusMatch && searchMatch;
  });
};

/**
 * ── Controls Setup ────────────────────────────────────────────
 * Attaches event listeners to the Search bar and Filter pills.
 */
Marketplace.setupControls = function() {
  // 1. Search Bar Listener
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      Marketplace.searchQuery = e.target.value;
      Marketplace.renderCards(); // Re-render instantly as user types
    });
  }

  // 2. Filter Pill Listeners
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      // UI: Switch active class
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      // Logic: Update filter and re-render
      Marketplace.activeFilter = pill.dataset.filter;
      Marketplace.renderCards();
    });
  });
};

// js/marketplace.js — PART 4: UI Rendering

/**
 * Orchestrates the rendering of the entire cards container.
 */
Marketplace.renderCards = function() {
  const container = document.getElementById('cards-container');
  if (!container) return;

  const filtered = Marketplace.filteredRequests();

  // 1. Handle Empty State
  if (filtered.length === 0) {
    container.innerHTML = Marketplace.emptyStateHTML();
    return;
  }

  // 2. Set Layout Mode (Grid vs List)
  container.className = Marketplace.viewMode === 'list' 
    ? 'grid-cards list-view' 
    : 'grid-cards';

  // 3. Generate HTML for all cards with a staggered animation delay
  container.innerHTML = filtered.map((req, i) => 
    Marketplace.cardHTML(req, i * 50) 
  ).join('');

  // 4. Attach Event Listeners to New Cards
  Marketplace.attachCardListeners(container);
};

/**
 * Returns the HTML for a single card.
 */
Marketplace.cardHTML = function(req, delay) {
  const { id, pastryType, startingPrice, customerName, imageUrl, location, status, bids = [] } = req;
  const price = parseFloat(startingPrice || 0);
  
  // Use MK utilities for consistent styling
  const statusBadge = typeof MK !== 'undefined' ? MK.statusBadge(status || 'open') : status;
  const formattedPrice = typeof MK !== 'undefined' ? MK.formatPrice(price) : `$${price}`;

  return `
    <div class="bidding-card" data-id="${id}" style="animation-delay:${delay}ms">
      <div class="card-image-zone">
        ${imageUrl ? `<img src="${imageUrl}" alt="${pastryType}" loading="lazy">` : `<div class="card-emoji-placeholder">🎂</div>`}
        <div class="card-status-badge">${statusBadge}</div>
        <div class="card-view-hint">View Details</div>
      </div>
      <div class="card-body">
        <div class="card-customer-row">
          <span class="customer-name">${customerName || 'Anonymous'}</span>
        </div>
        <div class="card-pastry-title">${pastryType || 'Custom Order'}</div>
        <div class="card-meta-row">
          <span class="card-meta-item">${location || 'Harare'}</span>
        </div>
        <div class="card-price-row">
          <div>
            <div class="price-label-sm">Starting bid</div>
            <div class="price-amount">${formattedPrice}</div>
          </div>
          <div class="bids-indicator">
            <div class="bids-count">${bids.length}</div>
            <div class="bids-sublabel">offers</div>
          </div>
        </div>
        ${Marketplace.role === 'supplier' ? Marketplace.supplierActionsHTML(id, price) : ''}
      </div>
    </div>`;
};


// js/marketplace.js — PART 5: Transactions & Interaction

/**
 * Attaches click listeners to cards and buttons after they are rendered.
 */
Marketplace.attachCardListeners = function(container) {
  // 1. Click Card → Open Detail Modal
  container.querySelectorAll('.bidding-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open modal if they clicked a button inside the card
      if (e.target.closest('.card-actions, .counter-input-row')) return;
      
      const req = Marketplace.requests.find(r => r.id === card.dataset.id);
      if (req) Marketplace.openDetailModal(req);
    });
  });

  // 2. Accept Button Logic
  container.querySelectorAll('.card-btn-accept').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      Marketplace.handleAccept(btn.dataset.id, btn.dataset.price);
    };
  });
};

/**
 * Logic to "Match" a supplier with a customer's request.
 */
Marketplace.handleAccept = async function(reqId, price) {
  const user = Auth.currentUser;
  if (!user) return MK.toast('Please sign in first.', 'error');

  const btn = MK.qs(`[data-id="${reqId}"].card-btn-accept`);
  if (btn) MK.setButtonLoading(btn, 'Matching...');

  try {
    const batch = db.batch();
    const bidRef = db.collection('bids').doc();
    const reqRef = db.collection('requests').doc(reqId);

    // Create the "Acceptance" bid record
    batch.set(bidRef, {
      requestId: reqId,
      supplierId: user.uid,
      supplierName: user.displayName || 'Supplier',
      amount: parseFloat(price),
      type: 'accept',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update the original request to 'matched'
    batch.update(reqRef, {
      status: 'matched',
      matchedSupplierId: user.uid,
      matchedPrice: parseFloat(price),
      matchedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    MK.toast('Matched! Order is now yours.', 'success');
  } catch (err) {
    console.error(err);
    MK.toast('Matching failed. Please try again.', 'error');
  } finally {
    if (btn) MK.resetButton(btn);
  }
};

/**
 * ── Supplier Action HTML Helper ──────────────────────────────
 */
Marketplace.supplierActionsHTML = function(id, price) {
  return `
    <div class="card-actions">
      <button class="card-btn-accept" data-id="${id}" data-price="${price}">
        Accept ${MK.formatPrice(price)}
      </button>
      <button class="card-btn-counter" onclick="Marketplace.toggleCounter('${id}')">
        Counter
      </button>
    </div>
    <div class="counter-input-row" id="counter-row-${id}">
       <input type="number" id="input-${id}" placeholder="Your bid...">
       <button onclick="Marketplace.handleCounter('${id}')">Send</button>
    </div>
  `;
};

Marketplace.toggleCounter = (id) => {
  document.getElementById(`counter-row-${id}`)?.classList.toggle('open');
};

// js/marketplace.js — PART 6: Detail Modal & Helpers

/**
 * Populates the detail modal with specific request data and opens it.
 */
Marketplace.openDetailModal = function(req) {
  Marketplace.currentDetailRequest = req;
  const {
    pastryType, customerName, description, imageUrl, 
    location, deadline, servings, dietaryNotes, startingPrice, status
  } = req;

  // 1. Set the Hero Image or Emoji
  const hero = document.getElementById('modal-hero-inner');
  if (hero) {
    hero.innerHTML = imageUrl
      ? `<img src="${imageUrl}" class="modal-hero-img">`
      : `<span class="modal-hero-emoji">${Marketplace._pastryEmoji(pastryType)}</span>`;
  }

  // 2. Set Status and Text Fields
  const statusBadge = document.getElementById('modal-status-badge');
  if (statusBadge) statusBadge.innerHTML = MK.statusBadge(status || 'open');

  document.getElementById('modal-customer-name').textContent = customerName || 'Client';
  document.getElementById('modal-price').textContent = MK.formatPrice(startingPrice);
  document.getElementById('modal-pastry-title').textContent = pastryType || 'Custom Order';
  document.getElementById('modal-description').textContent = description || 'No extra details.';

  // 3. Set Specific Detail Rows
  const detailMap = {
    'modal-detail-location': location || 'Harare',
    'modal-detail-deadline': MK.formatDate(deadline),
    'modal-detail-servings': servings ? `${servings} guests` : 'Not specified',
    'modal-detail-dietary': dietaryNotes || 'None'
  };

  Object.entries(detailMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  // 4. Show/Hide Supplier Actions in Modal
  const modalActions = document.getElementById('modal-supplier-actions');
  if (modalActions) {
    modalActions.classList.toggle('hidden', Marketplace.role !== 'supplier' || status !== 'open');
  }

  MK.openModal('detail-modal');
};

/**
 * Returns a relevant emoji based on the pastry type.
 */
Marketplace._pastryEmoji = function(type) {
  const map = {
    'Wedding Cake': '🎂', 'Birthday Cake': '🍰', 'Artisan Bread': '🍞',
    'Croissants': '🥐', 'Macarons': '🍬', 'Cupcakes': '🧁',
    'Cheesecake': '🧀', 'Donuts': '🍩'
  };
  return map[type] || '🎂';
};

/**
 * Closes the modal and clears the selection.
 */
Marketplace.setupDetailModal = function() {
  const closeBtn = document.getElementById('detail-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      MK.closeModal('detail-modal');
      Marketplace.currentDetailRequest = null;
    });
  }
};



// js/marketplace.js — PART 7: Empty States
Marketplace.emptyStateHTML = function() {
  const isCustomer = Marketplace.role === 'customer';
  return `
    <div class="empty-state-container">
      <div class="empty-state-icon">🧁</div>
      <h3 class="empty-state-title">
        ${isCustomer ? "You haven't posted any requests yet" : "The marketplace is quiet right now"}
      </h3>
      <p class="empty-state-sub">
        ${isCustomer 
          ? "Tap 'New Request' to get quotes from our premium bakers." 
          : "Check back soon—new commissions appear here in real-time."}
      </p>
    </div>
  `;
};




// Final line of js/marketplace.js
window.Marketplace = Marketplace;

// Auto-boot if the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init if we are actually on the marketplace page
    if (document.getElementById('marketplace-page')) {
        Marketplace.init();
    }
});
