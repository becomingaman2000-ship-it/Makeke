// js/marketplace.js — PART 1: Initialization
const Marketplace = {
  requests: [],
  activeFilter: 'all',
  searchQuery: '',
  viewMode: 'grid',
  unsubscribeListener: null,
  currentDetailRequest: null,
  role: null,

  init() {
    // TOGGLE: Set to true to bypass login, false for production
    const DEV_MODE = true; 
    const DEV_ROLE = 'supplier'; 

    if (DEV_MODE) {
      console.log(`🛠️ Dev Mode: Active as ${DEV_ROLE}`);
      const mockUser = { uid: "dev-user-123", displayName: "HIT Admin" };
      this.role = DEV_ROLE;
      this.updatePageForRole(DEV_ROLE);
      this.startListener(mockUser, DEV_ROLE);
      this.setupControls();
      this.setupDetailModal();

      const loader = document.getElementById('page-loading');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 300);
      }
      return; 
    }

    // Real Auth Logic
    Auth.init(
      (user, role) => {
        Marketplace.role = role;
        Marketplace.updatePageForRole(role);
        Marketplace.startListener(user, role);
        Marketplace.setupControls();
        Marketplace.setupDetailModal();
        const loader = document.getElementById('page-loading');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => { loader.style.display = 'none'; }, 300);
        }
      },
      () => { window.location.href = 'index.html'; }
    );
  },

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


// js/marketplace.js — PART 2: Data & Filters

Marketplace.startListener = function(user, role) {
  if (Marketplace.unsubscribeListener) Marketplace.unsubscribeListener();

  let query = db.collection('requests').orderBy('createdAt', 'desc');

  if (role === 'customer') {
    query = query.where('customerId', '==', user.uid).limit(50);
  } else {
    query = query.where('status', 'in', ['open', 'countered']).limit(100);
  }

  Marketplace.unsubscribeListener = query.onSnapshot(
    (snapshot) => {
      Marketplace.requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      Marketplace.renderCards();
      Marketplace.updateSubtitle();
    },
    (err) => console.error('Firestore Error:', err)
  );
};

Marketplace.filteredRequests = function() {
  const statusMap = { 'open-bid': 'open', 'countered': 'countered', 'matched': 'matched' };

  return Marketplace.requests.filter(req => {
    const isAll = Marketplace.activeFilter === 'all';
    const statusMatch = isAll || req.status === statusMap[Marketplace.activeFilter];
    const query = Marketplace.searchQuery.toLowerCase().trim();
    const searchMatch = !query || 
      (req.pastryType || '').toLowerCase().includes(query) ||
      (req.location || '').toLowerCase().includes(query);

    return statusMatch && searchMatch;
  });
};



// js/marketplace.js — PART 3: UI & Actions

Marketplace.renderCards = function() {
  const container = document.getElementById('cards-container');
  if (!container) return;

  const filtered = Marketplace.filteredRequests();
  if (filtered.length === 0) {
    container.innerHTML = Marketplace.emptyStateHTML();
    return;
  }

  container.innerHTML = filtered.map((req, i) => Marketplace.cardHTML(req, i * 50)).join('');
  Marketplace.attachCardListeners(container);
};

Marketplace.handleAccept = async function(reqId, price) {
  // Use mock ID if real auth is skipped
  const user = Auth.currentUser || { uid: "dev-user-123", displayName: "HIT Admin" };
  
  try {
    const batch = db.batch();
    const bidRef = db.collection('bids').doc();
    const reqRef = db.collection('requests').doc(reqId);

    batch.set(bidRef, {
      requestId: reqId,
      supplierId: user.uid,
      amount: parseFloat(price),
      type: 'accept',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    batch.update(reqRef, {
      status: 'matched',
      matchedSupplierId: user.uid,
      matchedPrice: parseFloat(price)
    });

    await batch.commit();
    MK.toast('Matched! Order is yours.', 'success');
  } catch (err) {
    MK.toast('Action failed.', 'error');
  }
};

// ... include the rest of your helper functions (cardHTML, emptyStateHTML, etc.)
