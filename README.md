# Muslim KU POS

Point-of-sale web app built with React, TypeScript, and Vite, using the existing Firebase Firestore project.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Main features

- Live product and bill updates from Firestore
- Search products and build a cart
- Cash and PromptPay checkout selection
- Queue number or no-queue mode
- Product create, edit, image upload, and delete
- Daily sales summary, best-selling products, bill history, and CSV export

## Project structure

- `src/main.tsx` — React entry point
- `src/App.tsx` — POS UI, typed state, and Firestore interactions
- `src/app.css` — global application styles
- `index.html` — Vite document and external SDKs
- `js/firebase-config.js` — existing Firebase configuration
- `css/style.css` — legacy stylesheet retained during migration
- `index.legacy-backup.html` — backup of the original HTML interface
- `js/app.js` — original vanilla JavaScript retained as reference; no longer loaded by the React app

## Firebase note

The app expects the existing Firebase configuration and Firestore security rules to permit the intended reads and writes. Never put private server credentials in frontend code. Validate Firestore rules before deploying publicly.
