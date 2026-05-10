# All AE/JE Exams - Civil Engineering

UPPSC AE preparation app with Google login, Firebase backend, scalable question bank.

## Project Structure

```
ae-exam-app/
├── index.html              ← Main app shell
├── manifest.json           ← PWA config
├── service-worker.js       ← Offline caching
├── firestore.rules         ← Security rules (paste in Firebase console)
├── css/
│   └── styles.css
├── js/
│   ├── firebase-config.js  ← PUT YOUR FIREBASE KEYS HERE
│   ├── auth.js             ← Google login
│   ├── db.js               ← Firestore reads/writes
│   ├── quiz.js             ← Quiz engine
│   └── app.js              ← Main app logic
├── admin/
│   └── upload.html         ← Bulk question upload tool
└── data/
    └── sample-questions.json  ← Test questions to upload first
```

## Setup Steps (do these in order)

### Step 1 — Create Firebase Project (5 min)

1. Go to https://console.firebase.google.com
2. Click **Add project** → Name it `ae-exam-app` (or anything)
3. Disable Google Analytics for now (you can add later)
4. Wait for project to be created

### Step 2 — Enable Google Authentication

1. In Firebase Console → **Build → Authentication → Get started**
2. Click **Sign-in method** tab
3. Click **Google** → toggle Enable → set support email → Save

### Step 3 — Create Firestore Database

1. In Firebase Console → **Build → Firestore Database → Create database**
2. Choose **Start in production mode**
3. Pick location: **asia-south1 (Mumbai)** — closest to your users
4. Click Enable

### Step 4 — Get Firebase Config Keys

1. In Firebase Console → click ⚙️ (gear) → **Project settings**
2. Scroll to **Your apps** → click **Web** icon (`</>`)
3. Register app: name it `ae-exam-app-web` → click Register
4. You'll see a config block like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "ae-exam-app.firebaseapp.com",
     projectId: "ae-exam-app",
     storageBucket: "ae-exam-app.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef..."
   };
   ```
5. Copy these values → paste into `js/firebase-config.js` (replace the PASTE_YOUR_X placeholders)

### Step 5 — Set Firestore Security Rules

1. In Firebase Console → **Firestore Database → Rules** tab
2. Open `firestore.rules` from this project
3. Replace `REPLACE_WITH_YOUR_EMAIL@gmail.com` with your real Google email (in 2 places: rules file AND `admin/upload.html`)
4. Copy the entire rules content
5. Paste into Firebase Console rules editor → click **Publish**

### Step 6 — Update Admin Email

1. Open `admin/upload.html`
2. Find `const ADMIN_EMAILS = ['REPLACE_WITH_YOUR_EMAIL@gmail.com'];`
3. Replace with your real Gmail address

### Step 7 — Test Locally (optional)

You can't open `index.html` directly — Firebase modules need a server. Use:

```bash
# If you have Node:
npx serve .

# OR Python:
python -m http.server 8000
```

Open http://localhost:8000

### Step 8 — Push to GitHub

1. Create new repo on GitHub: e.g. `ae-exam-app`
2. In project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial app"
   git branch -M main
   git remote add origin https://github.com/singhakhilesh740-svg/ae-exam-app.git
   git push -u origin main
   ```

### Step 9 — Enable GitHub Pages

1. GitHub repo → **Settings → Pages**
2. Source: **Deploy from branch** → branch: `main` / folder: `/ (root)`
3. Save → wait 1-2 min
4. Your app is live at: `https://singhakhilesh740-svg.github.io/ae-exam-app/`

### Step 10 — Add GitHub Pages URL to Firebase Auth

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Click **Add domain**
3. Add: `singhakhilesh740-svg.github.io`
4. Save

(Without this step, Google login won't work on the live site.)

### Step 11 — Upload Sample Questions

1. Visit: `https://singhakhilesh740-svg.github.io/ae-exam-app/admin/upload.html`
2. Login with your admin Google account
3. Click **Load Template** → see sample questions
4. OR paste contents of `data/sample-questions.json`
5. Click **Validate Only** → confirm 5 valid, 0 invalid
6. Click **Upload to Firestore** → see them appear

### Step 12 — Test the App

1. Visit: `https://singhakhilesh740-svg.github.io/ae-exam-app/`
2. Click **Continue with Google** → login
3. Click **Subjects** → see your 5 sample questions in quiz form
4. Answer one → see correct/wrong feedback + explanation
5. ✅ App is working!

---

## Adding More Questions Later

Just visit `admin/upload.html`, paste new JSON array, upload. **You never need to modify the app code to add questions.**

Question JSON format:
```json
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer": 0,                    // index of correct (0-based)
  "explanation": "...",
  "subject": "fluid-mechanics",   // any string
  "year": 2024,
  "exam": "uppsc-ae",             // exam ID
  "tier": "free",                 // or "premium" later
  "difficulty": "easy"            // easy / medium / hard
}
```

## Migrating Existing Questions

Your existing 686 PYQ + 501 MCQ questions can be migrated:
1. Convert HTML question files into JSON (I can help with this)
2. Tag with `tier: "free"` for first 200, `tier: "premium"` for rest
3. Bulk upload via admin tool

## What's Next (Phase 2+)

After this is working:
- Bookmarks page
- User progress / stats
- Mock test mode with timer
- Subject filter
- Razorpay payment for premium
- Capacitor wrapper for Play Store

## Troubleshooting

**"auth/unauthorized-domain"** — You forgot Step 10 (add GitHub Pages domain to Firebase auth)

**Questions not loading** — Check Firestore rules are published, you're logged in, and questions exist in `exams/uppsc-ae/questions/`

**Login popup blocked** — On mobile, the app uses redirect flow automatically. On desktop, allow popups for your domain.

**Service worker showing old version** — Hard refresh: Ctrl+Shift+R, or in DevTools → Application → Service Workers → Unregister.
