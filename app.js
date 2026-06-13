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
const elTabs      = document.getElementById('wadahTabs');
const elBody      = document.getElementById('bodyTabel');
const elKeyword   = document.getElementById('keywordSaring');
const elNominal   = document.getElementById('nominalMasker');
const elAreaUtama = document.getElementById('areaAplikasiUtama');
const elKonten    = document.getElementById('kontenUtama');
const elNoAcara   = document.getElementById('noAcara');
const elCount     = document.getElementById('tableRowCount');

// ===== UTILITY =====
const formatRp = n => "Rp " + parseInt(n || 0).toLocaleString('id-ID');
const escHtml  = s => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ===== MASKING NOMINAL =====
elNominal.addEventListener('input', function () {
    const d = this.value.replace(/[^\d]/g, "");
    this.value = d ? parseInt(d).toLocaleString('id-ID') : "";
});

// ===== AUTH =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        get(ref(db, `users/${user.uid}/isApproved`)).then(snap => {
            if (snap.val() === true) {
                currentUser = user;
                document.getElementById('userEmailAktif').textContent = user.email;
                elAreaUtama.style.display = 'block';
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

// ===== SINKRONISASI REALTIME =====
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
        renderData();
    });
}

// ===== RENDER TAB PILLS =====
function renderTabs() {
    elTabs.innerHTML = "";
    const keys = Object.keys(masterAcara);

    if (keys.length === 0) {
        elTabs.innerHTML = `<span class="tabs-empty">Belum ada acara. Buat acara baru di atas.</span>`;
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
            renderData();
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
document.getElementById('formAcara').addEventListener('submit', function (e) {
    e.preventDefault();
    const input = document.getElementById('namaAcaraBaru');
    const nama  = input.value.trim();
    if (!nama) return;

    const newRef = push(ref(db, `users/${currentUser.uid}/masterAcara`));
    idAcaraAktif = newRef.key;
    localStorage.setItem('idAcaraAktif', idAcaraAktif);
    set(newRef, { namaAcara: nama, dataTamu: "" }).then(() => input.value = "");
});

// ===== RENDER DATA TAMU =====
function renderData() {
    elBody.innerHTML = "";
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

    if (elCount) {
        elCount.textContent = keyword
            ? `${disaring.length} dari ${arrayTamu.length} tamu`
            : `${arrayTamu.length} tamu`;
    }

    if (disaring.length === 0) {
        const s = keyword
            ? { emoji:'🔍', msg:'Tidak ada hasil pencarian', sub:`Tidak ada tamu dengan kata kunci "${elKeyword.value}"` }
            : { emoji:'📭', msg:'Belum ada catatan tamu', sub:'Tambahkan tamu menggunakan form di atas' };

        elBody.innerHTML = `
            <tr><td colspan="6" class="state-cell">
                <span class="state-emoji">${s.emoji}</span>
                <div class="state-msg">${s.msg}</div>
                <div class="state-sub">${s.sub}</div>
            </td></tr>`;
        updateStatistik(arrayTamu);
        return;
    }

    disaring.forEach((t, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="td-no">${i + 1}</td>
            <td class="td-nama">${escHtml(t.nama)}</td>
            <td class="td-asal">${escHtml(t.asal)}</td>
            <td class="td-nominal">${formatRp(t.nominal)}</td>
            <td></td>
            <td></td>
        `;

        const badge = document.createElement('button');
        badge.className = `status-badge ${t.sudahKembali ? 'status-sudah' : 'status-belum'}`;
        badge.innerHTML = t.sudahKembali ? '✓ Sudah Dibalas' : '⏳ Belum Dibalas';
        badge.title = 'Klik untuk ubah status';
        badge.addEventListener('click', () => {
            update(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu/${t.id}`), {
                sudahKembali: !t.sudahKembali
            });
        });
        tr.cells[4].appendChild(badge);

        const del = document.createElement('button');
        del.className = 'btn-delete';
        del.textContent = 'Hapus';
        del.addEventListener('click', () => {
            if (confirm(`Hapus catatan tamu "${t.nama}"?`)) {
                remove(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu/${t.id}`));
            }
        });
        tr.cells[5].appendChild(del);

        elBody.appendChild(tr);
    });

    updateStatistik(arrayTamu);
}

elKeyword.addEventListener('keyup', renderData);

// ===== STATISTIK =====
function updateStatistik(arr) {
    let dana = 0, belum = 0;
    arr.forEach(t => { dana += t.nominal || 0; if (!t.sudahKembali) belum++; });
    document.getElementById('totalDana').textContent  = formatRp(dana);
    document.getElementById('totalTamu').textContent  = arr.length;
    document.getElementById('totalBelum').textContent = belum;
}

// ===== TAMBAH TAMU =====
document.getElementById('formCatatan').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!idAcaraAktif) return;

    const nama    = document.getElementById('namaTamu').value.trim();
    const asal    = document.getElementById('asalTamu').value.trim();
    const nominal = parseInt(elNominal.value.replace(/[^\d]/g, ""));

    if (!nama || !asal || isNaN(nominal)) return;

    const newRef = push(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu`));
    set(newRef, { nama, asal, nominal, sudahKembali: false, timestamp: Date.now() })
        .then(() => this.reset());
});
