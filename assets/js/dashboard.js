import { db, auth } from './firebase-config.js';
import { ref, onValue, push, set, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// State Global
let currentUser = null;
let idAcaraAktif = localStorage.getItem('idAcaraAktif') || null;

// Referensi DOM
const areaAplikasiUtama = document.getElementById('areaAplikasiUtama');
const userEmailAktif = document.getElementById('userEmailAktif');

// 1. Cek Status Autentikasi
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmailAktif.innerText = user.email;
        areaAplikasiUtama.style.display = "block";
        initDashboard();
    } else {
        window.location.href = "login.html";
    }
});

// 2. Inisialisasi Data
function initDashboard() {
    const acaraRef = ref(db, `users/${currentUser.uid}/masterAcara`);
    onValue(acaraRef, (snapshot) => {
        const data = snapshot.val() || {};
        renderTabs(data);
    });
}

// 3. Fungsi Render Tabs
function renderTabs(data) {
    const wadahTabs = document.getElementById('wadahTabs');
    wadahTabs.innerHTML = "";
    
    const keys = Object.keys(data);
    if (keys.length === 0) {
        wadahTabs.innerHTML = "<p>Belum ada acara. Tambahkan acara baru!</p>";
        return;
    }

    keys.forEach(key => {
        const btn = document.createElement('button');
        btn.className = `tab-button ${key === idAcaraAktif ? 'active' : ''}`;
        btn.innerText = data[key].namaAcara;
        btn.onclick = () => {
            idAcaraAktif = key;
            localStorage.setItem('idAcaraAktif', key);
            initDashboard();
        };
        wadahTabs.appendChild(btn);
    });
}

// 4. Logout Handler
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
});

// Tambahkan fungsi CRUD lainnya di bawah sini...
