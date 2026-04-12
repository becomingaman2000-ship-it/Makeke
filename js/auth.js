// js/auth.js
// Handles Firebase Auth: login, register, session state, navbar

const Auth = {
  currentUser: null,
  currentRole: null,

  // ── Initialise auth state listener ──────────────────────────
  init(onSignedIn, onSignedOut) {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        Auth.currentUser = user;
        try {
          const snap = await db.collection('users').doc(user.uid).get();
          Auth.currentRole = snap.exists ? snap.data().role : 'customer';
        } catch {
          Auth.currentRole = 'customer';
        }
        Auth._updateNavbar();
        if (onSignedIn) onSignedIn(user, Auth.currentRole);
      } else {
        Auth.currentUser = null;
        Auth.currentRole = null;
        Auth._updateNavbar();
        if (onSignedOut) onSignedOut();
      }
    });
  },

  // ── Register new user ────────────────────────────────────────
  async register(email, password, displayName, role) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName });
    await db.collection('users').doc(cred.user.uid).set({
      displayName, email, role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    Auth.currentRole = role;
    return cred.user;
  },

  // ── Log in ───────────────────────────────────────────────────
  async login(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const snap = await db.collection('users').doc(cred.user.uid).get();
    Auth.currentRole = snap.exists ? snap.data().role : 'customer';
    return cred.user;
  },

  // ── Log out ──────────────────────────────────────────────────
  async logout() {
    await auth.signOut();
    window.location.href = 'index.html';
  },

  // ── Update navbar based on auth state ───────────────────────
  _updateNavbar() {
    const userSection = document.getElementById('navbar-user-section');
    if (!userSection) return;
    if (Auth.currentUser) {
      const roleEmoji = Auth.currentRole === 'supplier' ? '🍰' : '🛍';
      userSection.innerHTML = `
        <span class="navbar-role-badge hide-mobile">
          ${roleEmoji} ${Auth.currentRole === 'supplier' ? 'Supplier' : 'Customer'} ·
          <span class="name">${Auth.currentUser.displayName || ''}</span>
        </span>
        <button class="btn btn-ghost btn-sm" onclick="Auth.logout()">
          ${MK.icon.logout} <span class="hide-mobile">Sign Out</span>
        </button>`;
    } else {
      userSection.innerHTML = `
        <button class="btn btn-outline-gold btn-sm" onclick="MK.openModal('auth-modal')">
          Sign In
        </button>`;
    }
  },
};

window.Auth = Auth;

// ── Auth modal logic ─────────────────────────────────────────────
(function setupAuthModal() {
  let mode = 'login'; // 'login' | 'register'
  let selectedRole = 'customer';

  function switchMode(newMode) {
    mode = newMode;
    MK.qsa('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    const registerFields = document.getElementById('register-fields');
    if (registerFields) registerFields.classList.toggle('hidden', mode !== 'register');
    MK.clearAllErrors(['auth-email', 'auth-password', 'auth-name']);
    const errGlobal = document.getElementById('auth-error-global');
    if (errGlobal) errGlobal.classList.add('hidden');
  }

  function setRole(role) {
    selectedRole = role;
    MK.qsa('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    MK.clearAllErrors(['auth-email', 'auth-password', 'auth-name']);
    const errGlobal = document.getElementById('auth-error-global');
    if (errGlobal) errGlobal.classList.add('hidden');

    const email    = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const name     = document.getElementById('auth-name')?.value?.trim();
    const btn      = document.getElementById('auth-submit-btn');

    let valid = true;
    if (!email) { MK.showFieldError('auth-email', 'Email is required.'); valid = false; }
    if (!password || password.length < 6) { MK.showFieldError('auth-password', 'Password must be at least 6 characters.'); valid = false; }
    if (mode === 'register' && !name) { MK.showFieldError('auth-name', 'Your name is required.'); valid = false; }
    if (!valid) return;

    MK.setButtonLoading(btn, mode === 'login' ? 'Signing in…' : 'Creating account…');

    try {
      if (mode === 'login') {
        await Auth.login(email, password);
      } else {
        await Auth.register(email, password, name, selectedRole);
      }
      MK.closeModal('auth-modal');
      MK.toast('Welcome to MaKeke.Sunnyside!', 'success');
      setTimeout(() => { window.location.href = 'marketplace.html'; }, 600);
    } catch (err) {
      const msg = err.message.replace('Firebase: ', '').replace(/\(auth\/.*?\)\.?/, '').trim();
      if (errGlobal) { errGlobal.textContent = msg; errGlobal.classList.remove('hidden'); }
    } finally {
      MK.resetButton(btn);
    }
  }

  // Wire up after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    if (form) form.addEventListener('submit', handleAuthSubmit);

    MK.qsa('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });

    MK.qsa('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => setRole(btn.dataset.role));
    });
  });
})();
