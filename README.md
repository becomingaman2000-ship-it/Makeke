# MaKeke.Sunnyside 🎂

**Premium Bidding Marketplace for Luxury Pastries**

A fully static website — no build tools, no Node.js, no JSX. Drop the folder on GitHub Pages and it runs.

---

## Project Structure

```
makeke-sunnyside/
├── index.html            ← Gateway / Landing page
├── marketplace.html      ← Live bidding marketplace
├── css/
│   ├── style.css         ← Design system (tokens, glass, animations, buttons)
│   ├── gateway.css       ← Landing page styles
│   └── marketplace.css   ← Marketplace + card + modal styles
├── js/
│   ├── firebase-config.js ← YOUR Firebase credentials go here
│   ├── utils.js           ← MK helper library (toast, modal, icons)
│   ├── auth.js            ← Auth logic (login, register, session)
│   ├── marketplace.js     ← Real-time cards, filtering, bidding logic
│   └── post-request.js    ← Post request form + image upload
├── data/
│   └── mock-data.json     ← Demo data (6 sample requests)
└── README.md
```

---

## Quick Start

### 1. Set up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `makeke-sunnyside`)
3. Enable **Authentication** → Email/Password
4. Create a **Firestore** database (start in test mode)
5. Enable **Storage**
6. Go to **Project Settings → Your Apps → Web** → copy the config

### 2. Paste your config

Open `js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "YOUR_REAL_API_KEY",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

### 3. Set up Firestore Security Rules

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /requests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /bids/{bidId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Set up Storage Rules

In Firebase Console → Storage → Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /inspiration_images/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

### 5. Deploy to GitHub Pages

```bash
# Push to a GitHub repo
git init
git add .
git commit -m "MaKeke.Sunnyside launch"
git remote add origin https://github.com/YOUR_USERNAME/makeke-sunnyside.git
git push -u origin main

# Then: GitHub repo → Settings → Pages → Source: main / root
# Your site will be live at: https://YOUR_USERNAME.github.io/makeke-sunnyside/
```

---

## Features

| Feature | Details |
|---|---|
| Auth | Email/Password via Firebase Auth. Roles: Customer or Supplier. |
| Real-time bids | `onSnapshot` listener — cards update the instant a bid is placed, no refresh needed. |
| Bidding engine | Suppliers accept at customer's price OR send a counter-offer. |
| Image upload | Drag & drop or file picker → Firebase Storage under `inspiration_images/`. Progress ring shows upload %. |
| Detail modal | Click any card → scale-up modal with full description, dietary notes, location, deadline. |
| Filtering | Filter by status (All / Open Bid / Countered / Matched) + free-text search. |
| Grid / List view | Toggle between card grid and compact list layout. |
| Glassmorphism | `backdrop-filter: blur(20px)` on all cards and modals. |
| Luxury design | Playfair Display serif + DM Sans. Sunnyside Orange #FF8C00, Gold #D4AF37, Onyx #000. |

---

## Design Tokens (quick reference)

```css
--orange: #FF8C00;
--gold:   #D4AF37;
--onyx:   #000000;
```

Classes: `.text-gradient-gold`, `.glass`, `.btn-gold`, `.btn-orange`, `.badge-gold`, `.animate-float`

---

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Requires no transpilation.  
`backdrop-filter` is supported in Chrome 76+, Safari 9+, Firefox 103+.

---

## Tech Stack

- **HTML5 + CSS3 + Vanilla JS** — zero framework, zero build step
- **Firebase v9 compat SDK** — loaded via CDN, no npm needed
- **Google Fonts** — Playfair Display + DM Sans via CSS @import
- **GitHub Pages** — free static hosting
