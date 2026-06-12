// sitamu.js
import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const secLogin = document.getElementById('sectionLogin');
const secDaftar = document.getElementById('sectionDaftar');
const overlayStatus = document.getElementById('overlayStatus');

// Navigasi UI
document.getElementById('LariKeDaftar').addEventListener('click', () => { secLogin.style.display='none'; secDaftar.style.display='block'; });
document.getElementById('LariKeLogin').addEventListener('click', () => { secDaftar.style.display='none'; secLogin.style.display='block'; });
document.getElementById('btnKembaliLogin').addEventListener('click', () => { overlayStatus.style.display='none'; secDaftar.style.display='none'; secLogin.style.display='block'; });

// Fitur Intip Password (harus global agar bisa dipanggil onclick HTML)
window.intipPassword = function(idInput, element) {
    const input = document.getElementById(idInput);
    if (input.type === "password") {
        input.type = "text"; element.innerText = "SEMBUNYIKAN";
    } else {
        input.type = "password"; element.innerText = "LIHAT";
    }
};

// FITUR DAFTAR
document.getElementById('formDaftar').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('daftarEmail').value.trim();
    const password = document.getElementById('daftarPassword').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Simpan langsung ke node 'users' dengan isApproved: false
            set(ref(db, `users/${user.uid}`), {
                email: email,
                isApproved: false
            }).then(() => {
                signOut(auth).then(() => {
                    overlayStatus.style.display = 'flex';
                    document.getElementById('formDaftar').reset();
                });
            });
        })
        .catch(err => alert("Gagal Daftar: " + err.message));
});

// FITUR LOGIN
document.getElementById('formLogin').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // Pengecekan Admin
            if (email === ADMIN_EMAIL) {
                alert("Sesi Admin. Membuka Panel Kontrol...");
                window.location.href = "admin.html";
                return;
            }

            // Pengecekan User Biasa
            get(ref(db, `users/${user.uid}/isApproved`)).then((snapshot) => {
                if (snapshot.exists() && snapshot.val() === true) {
                    window.location.href = "index.html";
                } else {
                    signOut(auth).then(() => {
                        alert("Akses Ditolak: Akun Anda belum disetujui oleh Admin.");
                    });
                }
            });
        })
        .catch(err => alert("Gagal Masuk: Cek email dan password Anda."));
});

// FITUR LUPA PASSWORD
document.getElementById('btnLupaPassword').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) return alert("Ketik email Anda di kolom input terlebih dahulu!");
    
    sendPasswordResetEmail(auth, email)
        .then(() => alert("Link reset password telah dikirim ke email Anda."))
        .catch(err => alert("Gagal mengirim link: " + err.message));
});
