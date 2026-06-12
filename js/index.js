// index.js
import { auth, db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Proteksi Halaman Utama User
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Jika belum login, lempar ke halaman login
        window.location.href = "sitamu.html";
    } else {
        // Jika sudah login, pastikan statusnya memang sudah disetujui Admin
        get(ref(db, `users/${user.uid}/isApproved`)).then((snapshot) => {
            if (!snapshot.exists() || snapshot.val() !== true) {
                // Jika isApproved = false (atau data tidak ada), keluarkan paksa
                alert("Sesi Berakhir: Akun Anda belum disetujui atau akses telah dicabut oleh Admin.");
                signOut(auth).then(() => {
                    window.location.href = "sitamu.html";
                });
            }
        }).catch((error) => {
            console.error("Gagal memverifikasi status persetujuan:", error);
        });
    }
});

// Tombol Keluar User
document.getElementById("btnLogoutUser").addEventListener("click", () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        signOut(auth).then(() => {
            window.location.href = "sitamu.html";
        });
    }
});
