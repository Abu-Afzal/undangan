import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBhDGXnuMIvfr-9AXCIw1zgDuJWfCgMUyE",
    authDomain: "data-undangan-digital-9dc5a.firebaseapp.com",
    databaseURL: "https://data-undangan-digital-9dc5a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "data-undangan-digital-9dc5a",
    storageBucket: "data-undangan-digital-9dc5a.firebasestorage.app",
    messagingSenderId: "765763173060",
    appId: "1:765763173060:web:043f3f4f5d3de0e30ae791",
    measurementId: "G-1HTRDFF02C"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
