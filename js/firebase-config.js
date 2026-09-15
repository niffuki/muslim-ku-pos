/* --- Firebase Configuration --- */
const firebaseConfig = {
    apiKey: "AIzaSyCq5bq4_oZmBzTvI9_1io9KGpcOKv9wwKU",
    authDomain: "muslim-ku-pos.firebaseapp.com",
    projectId: "muslim-ku-pos",
    storageBucket: "muslim-ku-pos.firebasestorage.app",
    messagingSenderId: "952210970116",
    appId: "1:952210970116:web:800639f547210d5e7f0751",
    measurementId: "G-SMDT3WDGRM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
