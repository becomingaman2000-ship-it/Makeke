// js/firebase-config.js
// ─────────────────────────────────────────────────────────────────
//  SETUP: Replace with your Firebase project credentials.
//  Get them from: https://console.firebase.google.com
//  → Project Settings → Your Apps → Firebase SDK snippet → Config
// ─────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Initialize Firebase (using compat SDK loaded via CDN)
firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// Enable Firestore offline persistence
db.enablePersistence().catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});
