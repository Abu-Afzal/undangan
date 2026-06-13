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

// ===================================================
// ===== EKSPOR & IMPORT EXCEL (SheetJS) =====
// ===================================================

// ===== EKSPOR =====
document.getElementById('btnEkspor').addEventListener('click', () => {
    if (!idAcaraAktif || !masterAcara[idAcaraAktif]) {
        alert('Pilih acara terlebih dahulu.'); return;
    }

    const namaAcara = masterAcara[idAcaraAktif].namaAcara;
    const objekTamu = masterAcara[idAcaraAktif].dataTamu || {};

    const arrayTamu = Object.values(objekTamu).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (arrayTamu.length === 0) {
        alert('Belum ada data tamu untuk diekspor.'); return;
    }

    // Susun data rows
    const rows = arrayTamu.map((t, i) => ({
        'No':           i + 1,
        'Nama':         t.nama || '',
        'Asal':         t.asal || '',
        'Nominal':      t.nominal || 0,
        'Status Balas': t.sudahKembali ? 'Sudah Dibalas' : 'Belum Dibalas',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Atur lebar kolom
    ws['!cols'] = [
        { wch: 5  },  // No
        { wch: 30 },  // Nama
        { wch: 25 },  // Asal
        { wch: 15 },  // Nominal
        { wch: 18 },  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, namaAcara.substring(0, 31));

    const tgl = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Data_Tamu_${namaAcara}_${tgl}.xlsx`);
});

// ===== TEMPLATE DOWNLOAD =====
document.getElementById('linkUnduhTemplate').addEventListener('click', (e) => {
    e.preventDefault();

    const contoh = [
        { 'Nama': 'Abu Afzal',    'Asal': 'Bantaeng',  'Nominal': 200000, 'Status': 'Belum Dibalas' },
        { 'Nama': 'Siti Aminah',  'Asal': 'Makassar',  'Nominal': 150000, 'Status': 'Sudah Dibalas' },
        { 'Nama': 'Budi Santoso', 'Asal': 'Gowa',      'Nominal': 100000, 'Status': 'Belum Dibalas' },
    ];

    const ws = XLSX.utils.json_to_sheet(contoh);
    ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Tamu.xlsx');
});

// ===== MODAL IMPORT =====
const modalImport = document.getElementById('modalImport');
let dataImportSiap = [];

document.getElementById('btnImport').addEventListener('click', () => {
    if (!idAcaraAktif) { alert('Pilih acara terlebih dahulu.'); return; }
    modalImport.style.display = 'flex';
    resetModalImport();
});

document.getElementById('btnTutupModal').addEventListener('click', tutupModal);
document.getElementById('btnBatalImport').addEventListener('click', resetModalImport);

modalImport.addEventListener('click', (e) => {
    if (e.target === modalImport) tutupModal();
});

function tutupModal() {
    modalImport.style.display = 'none';
    resetModalImport();
}

function resetModalImport() {
    dataImportSiap = [];
    document.getElementById('previewArea').style.display  = 'none';
    document.getElementById('dropzone').style.display     = 'flex';
    document.getElementById('fileInput').value            = '';
    document.getElementById('previewTable').innerHTML     = '';
    document.getElementById('previewInfo').innerHTML      = '';
}

// File input
document.getElementById('fileInput').addEventListener('change', function () {
    if (this.files[0]) prosesFile(this.files[0]);
});

// Drag & drop
const dropzone = document.getElementById('dropzone');
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) prosesFile(file);
});

// Proses file Excel → preview
function prosesFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const wb   = XLSX.read(e.target.result, { type: 'array' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (rows.length === 0) { alert('File kosong atau format tidak dikenali.'); return; }

            // Normalisasi kolom (case-insensitive)
            dataImportSiap = rows.map(row => {
                const keys = Object.keys(row);
                const cari = (label) => {
                    const k = keys.find(k => k.toLowerCase().includes(label));
                    return k ? String(row[k]).trim() : '';
                };

                const nama    = cari('nama');
                const asal    = cari('asal');
                const nomRaw  = cari('nominal');
                const nominal = parseInt(String(nomRaw).replace(/[^\d]/g, '')) || 0;
                const status  = cari('status');
                const sudahKembali = status.toLowerCase().includes('sudah');

                return { nama, asal, nominal, sudahKembali };
            }).filter(t => t.nama && t.asal);

            if (dataImportSiap.length === 0) {
                alert('Tidak ada baris valid. Pastikan kolom Nama dan Asal terisi.'); return;
            }

            tampilkanPreview(dataImportSiap);
        } catch (err) {
            alert('Gagal membaca file. Pastikan format .xlsx / .xls / .csv yang valid.');
        }
    };
    reader.readAsArrayBuffer(file);
}

function tampilkanPreview(data) {
    document.getElementById('dropzone').style.display    = 'none';
    document.getElementById('previewArea').style.display = 'block';

    const namaAcara = masterAcara[idAcaraAktif]?.namaAcara || '';
    document.getElementById('previewInfo').innerHTML =
        `Ditemukan <strong>${data.length} baris</strong> siap diimport ke acara <strong>${escHtml(namaAcara)}</strong>`;

    // Tabel preview (max 5 baris)
    const preview = data.slice(0, 5);
    let html = `<table><thead><tr>
        <th>#</th><th>Nama</th><th>Asal</th><th>Nominal</th><th>Status</th>
    </tr></thead><tbody>`;

    preview.forEach((t, i) => {
        html += `<tr>
            <td>${i + 1}</td>
            <td>${escHtml(t.nama)}</td>
            <td>${escHtml(t.asal)}</td>
            <td>${formatRp(t.nominal)}</td>
            <td>${t.sudahKembali ? '✓ Sudah' : '⏳ Belum'}</td>
        </tr>`;
    });

    if (data.length > 5) {
        html += `<tr><td colspan="5" style="text-align:center;color:#9aa5b4;font-style:italic;padding:8px;">
            ... dan ${data.length - 5} baris lainnya
        </td></tr>`;
    }

    html += '</tbody></table>';
    document.getElementById('previewTable').innerHTML = html;
}

// Konfirmasi import → simpan ke Firebase
document.getElementById('btnKonfirmasiImport').addEventListener('click', async () => {
    if (!dataImportSiap.length || !idAcaraAktif) return;

    const btn = document.getElementById('btnKonfirmasiImport');
    btn.disabled = true;
    btn.textContent = 'Mengimport…';

    try {
        const promises = dataImportSiap.map(t => {
            const newRef = push(ref(db, `users/${currentUser.uid}/masterAcara/${idAcaraAktif}/dataTamu`));
            return set(newRef, {
                nama: t.nama,
                asal: t.asal,
                nominal: t.nominal,
                sudahKembali: t.sudahKembali,
                timestamp: Date.now()
            });
        });

        await Promise.all(promises);
        tutupModal();
        alert(`✅ Berhasil mengimport ${dataImportSiap.length} data tamu!`);
    } catch (err) {
        alert('Gagal mengimport data. Coba lagi.');
        btn.disabled = false;
        btn.textContent = '✓ Import Sekarang';
    }
});
