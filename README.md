<<<<<<< HEAD
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
=======
# 🛒 Muslim KU POS (Real-time Cloud) 

> [!CAUTION]
> **NOTICE: BETA Ver.0**  
> ระบบนี้ยังอยู่ในเวอร์ชันทดสอบ (Beta Ver.0) อาจมีการปรับปรุงและพัฒนาฟีเจอร์เพิ่มเติม

A modern, intuitive, and responsive **Web-based Point of Sale (POS) system** with **real-time cloud synchronization**—specifically developed to streamline front-of-house sales, queue management, product inventory, sales analytics, and CSV reporting for event booths at **Kaset Fair (งานเกษตรแฟร์)**.

---


## ✨ Key Features

### 1. 💵 Point of Sale (POS) System
* **Instant Search:** Quick filter by product name.
* **Cart Management:** Add, remove, update item quantities, or reset the cart with one click.
* **Queue Management System:**
  * Auto-incrementing queue numbers (cycles 1–50).
  * **"No Queue"** toggle button for quick walk-up orders that skip queue tracking.
* **Dual Payment Options:**
  * **Cash:** Built-in change calculator to minimize cashier error.
  * **PromptPay:** Displays a QR Code interface for instant customer scanning.

### 2. 📦 Product Management
* **Real-time Sync:** Any additions, updates, or deletions sync across all active client devices instantly.
* **Product Controls:**
  * Set product titles and prices.
  * Upload custom **Product Images** (stored via Base64).
  * Select a **Fallback Color Badge** if no image is provided.

### 3. 📊 Sales Summary & Analytics
* **Historical Date Filtering:** View daily sales reports for any selected calendar date.
* **Metric Cards:** Overview of Total Revenue, Cash Sales, PromptPay Sales, Total Bills, and Total Items Sold.
* **Visual Analytics (Chart.js):** Interactive bar chart visualizing sold item volume.
* **Bill History & Voiding:** Real-time log of generated receipts ordered by timestamp, with the ability to delete invalid bills.
* **CSV Export:** One-click download of daily transaction reports ready for Excel.

## 4. 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules/Scripts)
* **UI & Styling:** Tailwind CSS (via CDN), FontAwesome Icons
* **Data Visualization:** Chart.js v3.9.1
* **Backend & Database:** Firebase Firestore (v9 Compat SDK)
---

## 📂 Project Structure

```text
.
├── css/
│   └── style.css            # Custom CSS styles and UI animations
├── js/
│   ├── app.js               # Core application logic (POS cart, calculations, sales summary)
│   └── firebase-config.js   # Firebase setup & real-time Firestore database listener
├── index.html               # Main entry point and layout structure
└── README.md                # Project documentation
>>>>>>> origin/main
