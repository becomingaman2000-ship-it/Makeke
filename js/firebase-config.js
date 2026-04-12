// js/firebase-config.js
// ─────────────────────────────────────────────────────────────────
//  SETUP: Replace with your Firebase project credentials.
//  Get them from: https://console.firebase.google.com
//  → Project Settings → Your Apps → Firebase SDK snippet → Config
// ─────────────────────────────────────────────────────────────────

const firebaseConfig = {
 apiKey: "AIzaSyDD48u79WVOKYqW-i8YrO67AKWHetDxu-o",
  authDomain: "makeke-sunnyside.firebaseapp.com",
  projectId: "makeke-sunnyside",
  storageBucket: "makeke-sunnyside.appspot.com",
  messagingSenderId: "347805172175",
  appId: "1:347805172175:web:44334ba5ae2ddc76a8d2ba",
  measurementId: "G-YTY9QMMQM3"
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






