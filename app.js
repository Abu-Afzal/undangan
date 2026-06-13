import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase, ref, set, push, onValue, remove, update, get, off
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
    getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ===== FIREBASE CONFIG =====
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

// ===== STATE =====
let masterAcara   = {};
let idAcaraAktif  = localStorage.getItem('idAcaraAktif') || null;
let currentUser   = null;
let dbListenerRef = null;

// ===== ELEMENTS =====
const elTabs        = document.getElementById('wadahTabs');
const elCardGrid    = document.getElementById('cardGrid');
const elKeyword     = document.getElementById('keywordSaring');
const elNominal     = document.getElementById('nominalMasker');
const elAreaUtama   = document.getElementById('areaAplikasiUtama');
const elAreaHeader  = document.getElementById('areaHeader');
const elKonten      = document.getElementById('kontenUtama');
const elNoAcara     = document.getElementById('noAcara');
const elEmpty       = document.getElementById('emptyState');
const elCount       = document.getElementById('tableRowCount');
const elFormPanel   = document.getElementById('formPanel');

// ===== UTILITY =====
const formatRp  = n  => "Rp " + parseInt(n || 0).toLocaleString('id-ID');
const escHtml   = s  => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ===== MASKING NOMINAL =====
elNominal.addEventListener('input', function () {
    const d = this.value.replace(/[^\d]/g, "");
    this.value = d ? parseInt(d).toLocaleString('id-ID') : "";
});

// ===== FORM PANEL TOGGLE =====
document.getElementById('btnToggleForm').addEventListener('click', () => {
    elFormPanel.style.display = elFormPanel.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('btnTutupForm').addEventListener('click', () => {
    elFormPanel.style.display = 'none';
    document.getElementById('formCatatan').reset();
});

// ===== AUTH =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        get(ref(db, `users/${user.uid}/isApproved`)).then(snap => {
            if (snap.val() === true) {
                currentUser = user;
                elAreaUtama.style.display = 'block';
                elAreaHeader.style.display = 'flex';
                sinkronisasi();
            } else {
                keLogin("Akun belum disetujui Admin.");
            }
        }).catch(() => keLogin("Gagal mengambil data autentikasi."));
    } else {
        keLogin();
    }
});

function keLogin(pesan = "") {
    if (pesan) alert(pesan);
    if (dbListenerRef && currentUser) off(dbListenerRef);
    signOut(auth).then(() => { window.location.href = "login.html"; });
}

document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('idAcaraAktif');
    keLogin();
});

// ===== SINKRONISASI =====
function sinkronisasi() {
    dbListenerRef = ref(db, `users/${currentUser.uid}/masterAcara`);
    onValue(dbListenerRef, snap => {
        masterAcara = snap.val() || {};

        const keys = Object.keys(masterAcara);
        if (keys.length > 0 && (!idAcaraAktif || !masterAcara[idAcaraAktif])) {
            idAcaraAktif = keys[0];
            localStorage.setItem('idAcaraAktif', idAcaraAktif);
        } else if (keys.length === 0) {
            idAcaraAktif = null;
        }

        renderTabs();
        renderCards();
    });
}

// ===== RENDER TABS =====
function renderTabs() {
    elTabs.innerHTML = "";
    const keys = Object.keys(masterAcara);

    if (keys.length === 0) {
        elTabs.innerHTML = `<span style="font-size:13px;color:#9aa5b4;font-style:italic;padding:6px 4px;">Belum ada acara.</span>`;
        elKonten.style.display  = 'none';
        elNoAcara.style.display = 'block';
        setLabelAcara('');
        return;
    }

    elKonten.style.display  = 'block';
    elNoAcara.style.display = 'none';

    keys.forEach(key => {
        const acara    = masterAcara[key];
        const isActive = key === idAcaraAktif;

        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `tab-pill${isActive ? ' active' : ''}`;

        const ico  = document.createElement('span');
        ico.textContent = '📋';

        const nama = document.createElement('span');
        nama.textContent = acara.namaAcara;

        const del  = document.createElement('button');
        del.type = 'button';
        del.className = 'tab-del';
        del.innerHTML = '&times;';
        del.title = 'Hapus acara';
        del.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm(`Hapus permanen "${acara.namaAcara}" beserta seluruh data tamu?`)) {
                remove(ref(db, `users/${currentUser.uid}/masterAcara/${key}`));
            }
        });

        pill.append(ico, nama, del);
        pill.addEventListener('click', () => {
            idAcaraAktif = key;
            localStorage.setItem('idAcaraAktif', idAcaraAktif);
            elKeyword.value = "";
            renderTabs();
            renderCards();
        });

        elTabs.appendChild(pill);
    });

    if (idAcaraAktif && masterAcara[idAcaraAktif]) {
        setLabelAcara(masterAcara[idAcaraAktif].namaAcara);
    }
}

function setLabelAcara(nama) {
    document.querySelectorAll('.label-acara-aktif').forEach(el => el.textContent = nama);
}

// ===== TAMBAH ACARA =====
document.getElementById('formAcara').addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('namaAcaraBaru');
    const nama  = input.value.trim();
    if (!nama) return;

    const newRef = push(ref(db, `users/${currentUser.uid}/masterAcara`));
    idAcaraAktif = newRef.key;
    localStorage.setItem('idAcaraAktif', idAcaraAktif);
    set(newRef, { namaAcara: nama, dataTamu: "" }).then(() => input.value = "");
});

// ===== RENDER CARDS =====
function renderCards() {
    elCardGrid.innerHTML = "";

    if (!idAcaraAktif || !masterAcara[idAcaraAktif]) return;

    const objekTamu = masterAcara[idAcaraAktif].dataTamu || {};
    const keyword   = elKeyword.value.toLowerCase();

    const arrayTamu = Object.keys(objekTamu)
        .map(key => ({ id: key, ...objekTamu[key] }))
        .reverse();

    const disaring = arrayTamu.filter(t =>
        t.nama.toLowerCase().includes(keyword) ||
        t.asal.toLowerCase().includes(keyword)
    );

    // Update count
    if (elCount) {
        elCount.textContent = keyword
            ? `${disaring.length} dari ${arrayTamu.length} tamu`
            : `${arrayTamu.length} tamu`;
    }

    // Empty state
    if (disaring.length === 0) {
        elEmpty.style.display = 'block';
        elCardGrid.style.display = 'none';
        document.getElementById('emptyEmoji').textContent = keyword ? '🔍' : '📭';
        document.getElementById('emptyMsg').textContent   = keyword ? 'Tidak ada hasil' : 'Belum ada catatan tamu';
        document.getElementById('emptySub').textContent   = keyword
            ? `Tidak ada tamu dengan kata kunci "${elKeyword.value}"`
            : 'Klik "＋ Tambah Tamu" untuk mulai mencatat';
    } else {
        elEmpty.style.display = 'none';
        elCardGrid.style.display = 'grid';

        disaring.forEach((tamu, i) => {
            const card = document.createElement('div');
            card.className = 'tamu-card';

            card.innerHTML = `
                <div class="card-no">#${i + 1}</div>
                <div class="card-nama">${escHtml(tamu.nama)}</div>
                <div class="card-asal">📍 ${escHtml(tamu.asal)}</div>
                <div class="card-nominal">${formatRp(tamu.nominal)}</div>
                <div class="card-footer"></div>
            `;

            const footer = card.querySelector('.card-footer');

            // Badge toggle status
            const badge = document.createElement('button');
            badge.className = `status-badge ${tamu.sudahKembali ? 'status-sudah' : 'status-belum'}`;
            badge.innerHTML = tamu.sudahKembali ? '✓ Sudah Dibalas' : '⏳ Belum Dibalas';
            badge.title = 'Klik untuk ubah status';
            badge.addEventListener('click', () => {
                update(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu/${tamu.id}`), {
                    sudahKembali: !tamu.sudahKembali
                });
            });

            // Hapus
            const del = document.createElement('button');
            del.className   = 'card-del';
            del.textContent = 'Hapus';
            del.addEventListener('click', () => {
                if (confirm(`Hapus catatan tamu "${tamu.nama}"?`)) {
                    remove(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu/${tamu.id}`));
                }
            });

            footer.appendChild(badge);
            footer.appendChild(del);
            elCardGrid.appendChild(card);
        });
    }

    updateStatistik(arrayTamu);
}

elKeyword.addEventListener('keyup', renderCards);

// ===== STATISTIK =====
function updateStatistik(arr) {
    let dana = 0, belum = 0;
    arr.forEach(t => { dana += t.nominal || 0; if (!t.sudahKembali) belum++; });
    document.getElementById('totalDana').textContent  = formatRp(dana);
    document.getElementById('totalTamu').textContent  = arr.length;
    document.getElementById('totalBelum').textContent = belum;
}

// ===== TAMBAH TAMU =====
document.getElementById('formCatatan').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!idAcaraAktif) return;

    const nama    = document.getElementById('namaTamu').value.trim();
    const asal    = document.getElementById('asalTamu').value.trim();
    const nominal = parseInt(elNominal.value.replace(/[^\d]/g, ""));

    if (!nama || !asal || isNaN(nominal)) return;

    const newRef = push(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu`));
    set(newRef, { nama, asal, nominal, sudahKembali: false, timestamp: Date.now() })
        .then(() => {
            this.reset();
            elFormPanel.style.display = 'none';
        });
});
