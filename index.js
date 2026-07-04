// Mengimpor library resmi Stellar dan Freighter via CDN agar langsung berfungsi di browser
import { isConnected, getPublicKey, signTransaction } from "https://esm.sh/@stellar/freighter-api";
import StellarSdk from "https://esm.sh/@stellar/stellar-sdk";

// Konfigurasi Server Jaringan Jaringan Testnet Stellar
const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
const networkPassphrase = StellarSdk.Networks.TESTNET;

// Referensi Elemen UI dari HTML
const btnConnect = document.getElementById("btn-connect");
const btnSend = document.getElementById("btn-send");
const txtAddress = document.getElementById("wallet-address");
const txtBalance = document.getElementById("wallet-balance");
const inputTarget = document.getElementById("target-address");
const inputAmount = document.getElementById("amount");
const divStatus = document.getElementById("status");

let userPublicKey = "";

// ==========================================
// 1. FUNGSI KONEKSI & STRATEGI DISCONNECT
// ==========================================
async function toggleWallet() {
    // Jika wallet sudah terhubung, lakukan aksi Disconnect
    if (userPublicKey) {
        userPublicKey = "";
        txtAddress.innerText = "-";
        txtBalance.innerText = "-";
        btnConnect.innerText = "Connect Freighter";
        btnConnect.style.backgroundColor = "#00e676";
        btnSend.disabled = true;
        divStatus.innerText = "Wallet disconnected.";
        return;
    }

    // Jika belum terhubung, lakukan aksi Connect
    if (await isConnected()) {
        try {
            divStatus.innerText = "Connecting to Freighter...";
            userPublicKey = await getPublicKey();
            
            // Tampilkan alamat di UI
            txtAddress.innerText = userPublicKey;
            btnConnect.innerText = "Disconnect Wallet";
            btnConnect.style.backgroundColor = "#ff1744"; // Ubah warna jadi merah saat terhubung
            
            // Ambil Saldo
            await updateBalance();
            btnSend.disabled = false;
        } catch (error) {
            divStatus.innerText = "Koneksi dibatalkan oleh pengguna.";
        }
    } else {
        divStatus.innerText = "Harap instal ekstensi Freighter Wallet terlebih dahulu!";
    }
}

// ==========================================
// 2. FUNGSI AMBIL SALDO (BALANCE HANDLING)
// ==========================================
async function updateBalance() {
    try {
        const account = await server.loadAccount(userPublicKey);
        const nativeBalance = account.balances.find(b => b.asset_type === "native");
        txtBalance.innerText = nativeBalance ? nativeBalance.balance : "0";
        divStatus.innerText = "Saldo berhasil diperbarui.";
    } catch (error) {
        txtBalance.innerText = "0 (Akun Baru/Belum Didanai)";
        divStatus.innerText = "Akun belum aktif di Testnet. Silakan isi saldo via Friendbot.";
    }
}

// ==========================================
// 3. FUNGSI KIRIM TRANSAKSI (TRANSACTION FLOW)
// ==========================================
async function handlePayment() {
    const destination = inputTarget.value.trim();
    const amount = inputAmount.value.trim();

    if (!destination || !amount) {
        divStatus.innerText = "Harap isi alamat tujuan dan jumlah XLM!";
        return;
    }

    try {
        divStatus.style.color = "#ffffff";
        divStatus.innerText = "Menyiapkan transaksi...";

        // Ambil urutan sequence number terbaru dari akun pengirim
        const sourceAccount = await server.loadAccount(userPublicKey);

        // Bangun objek transaksi
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: networkPassphrase
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: destination,
            asset: StellarSdk.Asset.native(),
            amount: amount
        }))
        .setTimeout(60)
        .build();

        divStatus.innerText = "Menunggu tanda tangan di Freighter...";
        
        // Minta tanda tangan digital aman dari Freighter Wallet
        const signedXdr = await signTransaction(transaction.toXDR(), { network: "TESTNET" });

        divStatus.innerText = "Mengirim transaksi ke Jaringan Stellar...";
        
        // Kirim transaksi ke Horizon RPC Node
        const transactionResult = await server.submitTransaction(
            StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase)
        );

        // Berikan umpan balik sukses ke pengguna beserta Hash
        divStatus.style.color = "#00e676";
        divStatus.innerHTML = `
            🎉 Transaksi Sukses!<br>
            <strong>Hash:</strong> <a href="https://stellarexpert.org/tag/testnet/${transactionResult.hash}" target="_blank" style="color: #00e676;">
                ${transactionResult.hash.substring(0, 15)}...
            </a>
        `;
        
        // Perbarui saldo pengirim setelah transaksi berhasil
        await updateBalance();

    } catch (error) {
        divStatus.style.color = "#ff1744";
        divStatus.innerText = "Transaksi Gagal: " + (error.message || "Periksa konsol atau saldo Anda.");
        console.error(error);
    }
}

// Menghubungkan Fungsi ke Tombol UI
btnConnect.addEventListener("click", toggleWallet);
btnSend.addEventListener("click", handlePayment);