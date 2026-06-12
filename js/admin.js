// admin.js
import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import { ref, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Proteksi Halaman Admin
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "sitamu.html";
    } else if (user.email !== ADMIN_EMAIL) {
        alert("Akses Ilegal: Anda bukan Admin Utama!");
        signOut(auth).then(() => window.location.href = "sitamu.html");
    } else {
        muatAntreanPengguna();
    }
});

function muatAntreanPengguna() {
    // Kita langsung mengambil dari node 'users', bukan 'approval_requests' lagi.
    const dbRef = ref(db, "users"); 
    
    onValue(dbRef, (snapshot) => {
        const listBody = document.getElementById("listPersetujuan");
        listBody.innerHTML = "";
        
        document.getElementById("loadingStatus").style.display = "none";
        document.getElementById("tabelKonten").style.display = "block";

        if (!snapshot.exists()) {
            listBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999;">Belum ada pengguna yang mendaftar.</td></tr>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const userKey = childSnapshot.key;

            // Sembunyikan akun master admin dari tabel
            if (data.email === ADMIN_EMAIL) return;

            const statusTeks = data.isApproved ? "Disetujui" : "Menunggu";
            const badgeClass = data.isApproved ? "badge-success" : "badge-pending";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${data.email}</b></td>
                <td style="font-family: monospace; color:#666; font-size:12px;">${userKey}</td>
                <td><span class="${badgeClass}">${statusTeks}</span></td>
                <td>
                    ${!data.isApproved ? `<button class="btn-approve" onclick="prosesAktivasi('${userKey}')">Setujui</button>` : ''}
                    <button class="btn-reject" onclick="prosesTolak('${userKey}')">Hapus</button>
                </td>
            `;
            listBody.appendChild(tr);
        });
    });
}

// Fungsi Eksekusi Global (Harus di window agar bisa diklik dari HTML)
window.prosesAktivasi = function(uid) {
    if(confirm("Aktifkan pengguna ini?")) {
        update(ref(db, `users/${uid}`), { isApproved: true })
            .catch(err => alert("Gagal menyetujui: " + err.message));
    }
};

window.prosesTolak = function(uid) {
    if(confirm("Tolak dan hapus akun ini?")) {
        remove(ref(db, `users/${uid}`))
            .catch(err => alert("Gagal menghapus: " + err.message));
    }
};

document.getElementById("btnLogoutAdmin").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "sitamu.html");
});
