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
