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
  storageBucket: "makeke-sunnyside.firebasestorage.app",
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






// --- THE "HEARTBEAT" TEST SCRIPT ---
import { getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function injectWelcomeCommission() {
    const commissionsRef = collection(db, "requests");
    const snapshot = await getDocs(query(commissionsRef, limit(1)));

    // Only inject if the marketplace is totally empty
    if (snapshot.empty) {
        console.log("Empty marketplace detected. Injecting elite commission...");
        await addDoc(commissionsRef, {
            pastryType: "Tiered Onyx Wedding Cake",
            description: "A 3-tier chocolate ganache cake with gold leaf detailing. Required for a HIT Gala event. Must serve 50 guests.",
            currentPrice: 75,
            minBid: 5,
            status: "open",
            createdAt: serverTimestamp(),
            location: "Harare / HIT Campus"
        });
    }
}

// Start the heartbeat check
injectWelcomeCommission();
