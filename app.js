// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// REPLACE THESE WITH YOUR KEYS FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- THE BIDDING ENGINE ---

// 1. Function to display the Luxury Bidding Cards
const biddingGrid = document.getElementById('bidding-grid');
const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    biddingGrid.innerHTML = ''; // Reset grid
    snapshot.forEach((doc) => {
        const item = doc.data();
        const card = `
            <div class="glass p-8 rounded-[2rem] flex flex-col justify-between gold-glow group">
                <div>
                    <div class="flex justify-between items-center mb-6">
                        <span class="text-[10px] tracking-[0.3em] uppercase text-gold font-bold">Priority Commission</span>
                        <div class="h-2 w-2 rounded-full bg-sunnyside animate-pulse"></div>
                    </div>
                    <h3 class="font-serif text-2xl mb-4 text-white/90">${item.pastryType}</h3>
                    <p class="text-white/40 text-sm leading-relaxed mb-6">${item.description}</p>
                </div>
                
                <div class="pt-6 border-t border-white/5">
                    <div class="flex justify-between items-end">
                        <div>
                            <p class="text-[9px] uppercase tracking-widest text-white/30 mb-1">Current Highest Bid</p>
                            <p class="text-3xl font-serif text-gold">$${item.currentPrice}</p>
                        </div>
                        <button onclick="placeCounterOffer('${doc.id}', ${item.currentPrice})" 
                                class="bg-white/5 hover:bg-gold hover:text-black px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all">
                            Counter Offer
                        </button>
                    </div>
                </div>
            </div>
        `;
        biddingGrid.innerHTML += card;
    });
});

// 2. The Negotiation Logic (InDrive Style)
window.placeCounterOffer = async (id, currentPrice) => {
    const offer = prompt(`The current bid is $${currentPrice}. Enter your counter offer:`, currentPrice + 1);
    
    if (offer && parseFloat(offer) > currentPrice) {
        const docRef = doc(db, "requests", id);
        try {
            await updateDoc(docRef, {
                currentPrice: parseFloat(offer),
                lastUpdated: serverTimestamp()
            });
        } catch (err) {
            console.error("Bid failed:", err);
        }
    } else if (offer) {
        alert("Luxury commissions require a higher bid than the current one.");
    }
};
