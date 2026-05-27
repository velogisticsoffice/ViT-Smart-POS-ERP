<<<<<<< HEAD
# ViT Smart POS ERP

React + Vite ERP for supermarket and coconut oil mill operations, including inventory, POS billing, copra milling service, BOM production, purchases, attendance, loans, and reports.

## Run Locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Connect Firebase

1. Create a Firebase project at `https://console.firebase.google.com`.
2. Add a Web App in Firebase project settings.
3. Enable Firestore Database.
4. Copy `.env.example` to `.env`.
5. Fill `.env` with the Firebase Web App config values.
6. Restart Vite after changing `.env`.

Required environment keys:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

When these values are missing, the app runs in demo mode with local sample data. When all values are present, Firestore is used automatically.

Multi-branch and multi-user data uses these Firestore collections:

```text
branches
users
inventory
sales
purchase_bills / purchase_payment-out / purchase_return / purchase_order
milling_jobs
bom_recipes
production_batches
```

Operational records include `branchId`, `branchName`, `createdBy`, and `createdByName` so each branch can keep separate inventory, sales, purchases, milling jobs, and production batches.

## Firebase Hosting

Install Firebase CLI if needed:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
npm run build
firebase deploy
```

`firebase.json` is already configured to deploy the Vite `dist` folder and route all pages to `index.html`.

## Connect GitHub

This folder is already a Git repository. Add your GitHub remote:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git add .
git commit -m "Prepare ERP for Firebase and responsive deployment"
git push -u origin main
```

Check connection:

```bash
git remote -v
git status
```

Do not commit `.env`; it is ignored. Commit `.env.example` only.
=======
# ViT-Smart-POS-ERP
>>>>>>> 24658244638bce89787c7bc9e6608ca107129637
