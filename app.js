import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase, ref, set, push, onValue, remove, update, get, off
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
    getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ===== KONFIGURASI FIREBASE =====
const firebaseConfig = {
    apiKey: "AIzaSyBhDGXnuMIvfr-9AXCIw1zgDuJWfCgMUyE",
    authDomain: "data-undangan-digital-9dc5a.firebaseapp.com",
    projectId: "data-undangan-digital-9dc5a",
    storageBucket: "data-undangan-digital-9dc5a.firebasestorage.app",
    messagingSenderId: "765763173060",
    appId: "1:765763173060:web:043f3f4f5d3de0e30ae791",
    measurementId: "G-1HTRDFF02C",
    databaseURL: "https://data-undangan-digital-9dc5a-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const auth = getAuth(app);

// ===== STATE GLOBAL =====
let masterAcara   = {};
let idAcaraAktif  = localStorage.getItem('idAcaraAktif') || null;
let currentUser   = null;
let dbListenerRef = null;

// ===== ELEMENT SELECTORS =====
const elWadahTabs    = document.getElementById('wadahTabs');
const elBodyTabel    = document.getElementById('bodyTabel');
const elKeyword      = document.getElementById('keywordSaring');
const elNominalMasker= document.getElementById('nominalMasker');
const elUserEmail    = document.getElementById('userEmailAktif');
const elAreaUtama    = document.getElementById('areaAplikasiUtama');
const elKontenUtama  = document.getElementById('kontenUtama');
const elEmptyAcara   = document.getElementById('emptyAcara');
const elTableCount   = document.getElementById('tableRowCount');

// ===== UTILITY =====
function formatRupiah(angka) {
    return "Rp " + parseInt(angka || 0).toLocaleString('id-ID');
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== MASKING NOMINAL =====
elNominalMasker.addEventListener('input', function () {
    const angka = this.value.replace(/[^\d]/g, "");
    this.value = angka === "" ? "" : parseInt(angka).toLocaleString('id-ID');
});

// ===== AUTHENTICATION =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        get(ref(db, `users/${user.uid}/isApproved`)).then((snapshot) => {
            if (snapshot.val() === true) {
                currentUser = user;
                elUserEmail.textContent = user.email;
                elAreaUtama.style.display = "block";
                sinkronisasiDataCloud();
            } else {
                buangKeLogin("Akun Anda belum disetujui oleh Admin.");
            }
        }).catch(() => buangKeLogin("Gagal mengambil data autentikasi user."));
    } else {
        buangKeLogin();
    }
});

function buangKeLogin(pesan = "") {
    if (pesan) alert(pesan);
    if (dbListenerRef && currentUser) off(dbListenerRef);
    signOut(auth).then(() => { window.location.href = "login.html"; });
}

document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('idAcaraAktif');
    buangKeLogin();
});

// ===== SINKRONISASI REALTIME =====
function sinkronisasiDataCloud() {
    dbListenerRef = ref(db, `users/${currentUser.uid}/masterAcara`);
    onValue(dbListenerRef, (snapshot) => {
        masterAcara = snapshot.val() || {};

        const keys = Object.keys(masterAcara);
        if (keys.length > 0 && (!idAcaraAktif || !masterAcara[idAcaraAktif])) {
            idAcaraAktif = keys[0];
            localStorage.setItem('idAcaraAktif', idAcaraAktif);
        } else if (keys.length === 0) {
            idAcaraAktif = null;
        }

        renderTabs();
        renderData();
    });
}

// ===== RENDER SIDEBAR NAV ACARA =====
function renderTabs() {
    elWadahTabs.innerHTML = "";
    const keys = Object.keys(masterAcara);

    if (keys.length === 0) {
        elWadahTabs.innerHTML = `<span class="tabs-empty">Belum ada acara.</span>`;
        elKontenUtama.style.display = 'none';
        elEmptyAcara.style.display  = 'block';
        updateLabelAcara('');
        return;
    }

    elKontenUtama.style.display = 'block';
    elEmptyAcara.style.display  = 'none';

    keys.forEach(key => {
        const acara   = masterAcara[key];
        const isActive = key === idAcaraAktif;

        const item = document.createElement('button');
        item.type = 'button';
        item.className = `acara-nav-item${isActive ? ' active' : ''}`;

        const ico  = document.createElement('span');
        ico.textContent = '📋';

        const nama = document.createElement('span');
        nama.className   = 'acara-nav-nama';
        nama.textContent = acara.namaAcara;

        const del  = document.createElement('button');
        del.type = 'button';
        del.className   = 'acara-nav-del';
        del.innerHTML   = '&times;';
        del.title       = 'Hapus acara';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Hapus permanen "${acara.namaAcara}" beserta seluruh data tamu?`)) {
                remove(ref(db, `users/${currentUser.uid}/masterAcara/${key}`));
            }
        });

        item.appendChild(ico);
        item.appendChild(nama);
        item.appendChild(del);

        item.addEventListener('click', () => {
            idAcaraAktif = key;
            localStorage.setItem('idAcaraAktif', idAcaraAktif);
            elKeyword.value = "";
            renderTabs();
            renderData();
        });

        elWadahTabs.appendChild(item);
    });

    if (idAcaraAktif && masterAcara[idAcaraAktif]) {
        updateLabelAcara(masterAcara[idAcaraAktif].namaAcara);
    }
}

function updateLabelAcara(nama) {
    document.querySelectorAll('.label-acara-aktif').forEach(el => {
        el.textContent = nama;
    });
}

// ===== TAMBAH ACARA BARU =====
document.getElementById('formAcara').addEventListener('submit', function (e) {
    e.preventDefault();
    const input   = document.getElementById('namaAcaraBaru');
    const namaBaru = input.value.trim();
    if (!namaBaru) return;

    const newRef  = push(ref(db, `users/${currentUser.uid}/masterAcara`));
    idAcaraAktif  = newRef.key;
    localStorage.setItem('idAcaraAktif', idAcaraAktif);

    set(newRef, { namaAcara: namaBaru, dataTamu: "" }).then(() => {
        input.value = "";
    });
});

// ===== RENDER DATA TAMU =====
function renderData() {
    elBodyTabel.innerHTML = "";
    if (!idAcaraAktif || !masterAcara[idAcaraAktif]) return;

    const objekTamu = masterAcara[idAcaraAktif].dataTamu || {};
    const keyword   = elKeyword.value.toLowerCase();

    const arrayTamu = Object.keys(objekTamu)
        .map(key => ({ idFirebase: key, ...objekTamu[key] }))
        .reverse();

    const disaring = arrayTamu.filter(item =>
        item.nama.toLowerCase().includes(keyword) ||
        item.asal.toLowerCase().includes(keyword)
    );

    if (disaring.length === 0) {
        const s = keyword
            ? { emoji:'🔍', msg:'Tidak ada hasil', sub:`Tidak ada tamu dengan kata kunci "${elKeyword.value}"` }
            : { emoji:'📭', msg:'Belum ada catatan tamu', sub:'Tambahkan tamu menggunakan form di sidebar kiri' };

        elBodyTabel.innerHTML = `
            <tr><td colspan="6" class="state-cell">
                <span class="state-emoji">${s.emoji}</span>
                <div class="state-msg">${s.msg}</div>
                <div class="state-sub">${s.sub}</div>
            </td></tr>`;
    } else {
        disaring.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="td-no">${index + 1}</td>
                <td class="td-nama">${escHtml(item.nama)}</td>
                <td class="td-asal">${escHtml(item.asal)}</td>
                <td class="td-nominal">${formatRupiah(item.nominal)}</td>
                <td></td>
                <td></td>
            `;

            const badge = document.createElement('span');
            badge.className = `status-badge ${item.sudahKembali ? 'status-sudah' : 'status-belum'}`;
            badge.innerHTML = item.sudahKembali ? '✓ Sudah Dibalas' : '⏳ Belum Dibalas';
            badge.title = 'Klik untuk toggle status';
            badge.addEventListener('click', () => {
                update(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu/${item.idFirebase}`), {
                    sudahKembali: !item.sudahKembali
                });
            });
            tr.cells[4].appendChild(badge);

            const btnHapus = document.createElement('button');
            btnHapus.className = 'btn-delete';
            btnHapus.textContent = 'Hapus';
            btnHapus.addEventListener('click', () => {
                if (confirm(`Hapus catatan tamu "${item.nama}"?`)) {
                    remove(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu/${item.idFirebase}`));
                }
            });
            tr.cells[5].appendChild(btnHapus);

            elBodyTabel.appendChild(tr);
        });
    }

    if (elTableCount) {
        elTableCount.textContent = keyword
            ? `${disaring.length} dari ${arrayTamu.length} tamu`
            : `${arrayTamu.length} tamu`;
    }

    updateStatistik(arrayTamu);
}

elKeyword.addEventListener('keyup', renderData);

// ===== STATISTIK =====
function updateStatistik(arrayTamu) {
    let totalDana  = 0;
    let totalBelum = 0;

    arrayTamu.forEach(item => {
        totalDana += item.nominal || 0;
        if (!item.sudahKembali) totalBelum++;
    });

    document.getElementById('totalDana').textContent  = formatRupiah(totalDana);
    document.getElementById('totalTamu').textContent  = arrayTamu.length;
    document.getElementById('totalBelum').textContent = totalBelum;
}

// ===== TAMBAH TAMU =====
document.getElementById('formCatatan').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!idAcaraAktif) return;

    const nama    = document.getElementById('namaTamu').value.trim();
    const asal    = document.getElementById('asalTamu').value.trim();
    const nominal = parseInt(elNominalMasker.value.replace(/[^\d]/g, ""));

    if (!nama || !asal || isNaN(nominal)) return;

    const newRef = push(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu`));
    set(newRef, { nama, asal, nominal, sudahKembali: false, timestamp: Date.now() })
        .then(() => this.reset());
});
