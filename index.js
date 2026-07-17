import { StellarWalletsKit, WalletType } from "https://cdn.jsdelivr.net/npm/@creit.tech/stellar-wallets-kit@1.1.2/+esm";
import * as StellarSdk from "https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk@12.3.0/+esm";

// Dynamic Network & Contract configuration
const NETWORKS = {
    TESTNET: {
        passphrase: StellarSdk.Networks.TESTNET,
        rpc: "https://soroban-testnet.stellar.org",
        horizon: "https://horizon-testnet.stellar.org",
        contract: "CB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ7VQD",
        sac: "CDLZFC3SYJYDZT7KKA7QDV4N2W747355B423OW523JHPP56IFQ55N3TX"
    },
    MAINNET: {
        passphrase: StellarSdk.Networks.PUBLIC,
        rpc: "https://soroban-rpc.stellar.org",
        horizon: "https://horizon.stellar.org",
        contract: "CC3D4EEXXXXXXXXXXXXXXFARMERXXXXXXXXXXXXXXXXXXINSPECT", // User can override
        sac: "CAS3J7XXXXXXXXXXXXXXNATIVE_SACXXXXXXXXXXXXXXXXXXXXXX"
    }
};

let currentNetwork = "TESTNET";
let rpcUrl = NETWORKS.TESTNET.rpc;
let horizonUrl = NETWORKS.TESTNET.horizon;
let contractId = NETWORKS.TESTNET.contract;
let nativeTokenSac = NETWORKS.TESTNET.sac;
let passphrase = NETWORKS.TESTNET.passphrase;

// Initialize kit modal configuration
let kit = new StellarWalletsKit({
    network: "TESTNET",
    selectedWalletId: WalletType.FREIGHTER
});
let server = new StellarSdk.Horizon.Server(horizonUrl);

let userAddress = "";
let lastPolledLedger = 0;
let contractState = {
    targetAmount: 1000,
    totalRaised: 0,
    farmer: "",
    token: "",
    upfrontClaimed: false,
    harvestClaimed: false,
    inspector: "",
    harvestApproved: false
};

// Level 6 specific states
let inspectorApproved = false; // Legacy fallback
let currentSlide = 0;

// Slide presentation data
const PITCH_SLIDES = [
    {
        title: "Slide 1: Executive Cover Summary",
        subtitle: "🌱 AgroPledge Platform",
        bullets: [
            "<strong>Project Name:</strong> AgroPledge",
            "<strong>Mission:</strong> Decentralized Forward Contract Escrows for unbanked local agricultural finance on Stellar.",
            "<strong>Technology Stack:</strong> Soroban Rust Contracts + Web Dashboard Kit + Flutter Mobile Client.",
            "<strong>Primary Track:</strong> Local Finance & Real World Access."
        ]
    },
    {
        title: "Slide 2: The Core Problem Statement",
        subtitle: "Predatory Middlemen & High Market Volatility",
        bullets: [
            "<strong>Brokers & Rentenir:</strong> Farmers borrow upfront seed money from brokers, paying up to 40% interest cuts at harvest.",
            "<strong>Unpredictable Commodity Prices:</strong> Cafes and buyers face harvest price surges with no price lock guarantees.",
            "<strong>No Trust Framework:</strong> Forward agreements are paper-based, easily defaulted, and unverifiable."
        ]
    },
    {
        title: "Slide 3: The Decentralized Solution",
        subtitle: "Trustless Soroban Escrow Platform",
        bullets: [
            "<strong>Secure Price-Lock:</strong> B2B buyers pledge XLM to lock future coffee crop prices early in the season.",
            "<strong>50/50 Milestone Payouts:</strong> 50% upfront released for crop inputs, and 50% post-harvest settlement released upon crop quality audit.",
            "<strong>Real-world Protection:</strong> Cooperative QA Inspector validates moisture levels on-chain before unlocking final payment."
        ]
    },
    {
        title: "Slide 4: Market & Growth TAM",
        subtitle: "Southeast Asia Specialty Crops Financing",
        bullets: [
            "<strong>TAM (Total Market):</strong> $24 Billion in agricultural trade financing.",
            "<strong>SAM (Serviceable Market):</strong> $1.2 Billion in specialty coffee trade & cash crop microescrows.",
            "<strong>SOM (Obtainable Market):</strong> $15 Million targeted coffee co-op onboarding within 24 months.",
            "<strong>Stellar Advantage:</strong> Fast block settlements (5s) and gas fees under $0.0001 per operation."
        ]
    },
    {
        title: "Slide 5: Architecture & Smart Contract Spec",
        subtitle: "Soroban SDK & Horizon Blockchain Layer",
        bullets: [
            "<strong>Soroban Rust Contract:</strong> ESCROW STATE is stored instance-wide (`target`, `raised`, `farmer`, `token`, `claim_states`).",
            "<strong>Wallet Connect Kit:</strong> Direct browser integration with Freighter, xBull, and Albedo wallets.",
            "<strong>RPC simulation & simulationTransaction:</strong> Fetches global states without gas costs."
        ]
    },
    {
        title: "Slide 6: Traction & Onboarding",
        subtitle: "52 Testnet Users & Excel Feedback Logs",
        bullets: [
            "<strong>Onboarded Base:</strong> 52 validated active testnet user wallet profiles registered.",
            "<strong>Rating Traction:</strong> Average feedback score of 4.8/5 across cooperatives and buyers.",
            "<strong>Active Ledger Proofs:</strong> Linked direct Excel sheets tracking feedback name, email, public wallet addresses, and tx hash logs."
        ]
    },
    {
        title: "Slide 7: Growth & Retention Strategy",
        subtitle: "Scale through Co-ops & Yield Escrows",
        bullets: [
            "<strong>Cooperative Partnerships (KUD):</strong> Bulk onboarding of 50-100 local farmers at once.",
            "<strong>USDC Yield Integration:</strong> Lock crop price pledges in yield-bearing vaults to maximize investor returns.",
            "<strong>On-chain Reputation Scores:</strong> Award badge NFTs to verified organic farmers to secure buyer priority."
        ]
    },
    {
        title: "Slide 8: Future Platform Roadmap",
        subtitle: "Mainnet Launch & Multi-crop Support",
        bullets: [
            "<strong>Q3 2026:</strong> Deploy to mainnet, onboarding first 5 specialty Sumatra Arabica coffee cooperatives.",
            "<strong>Q4 2026:</strong> Support cocoa and organic rice crops, and implement multi-signature cooperative approvals.",
            "<strong>Q1 2027:</strong> Integrated stablecoin USDC yield vaults and cross-chain liquidity."
        ]
    }
];

// Onboarded users list
const ONBOARDED_USERS = [
    { addr: "GDGPPH...DUZP", role: "Farmer", action: "Contract Owner", amount: "N/A", hash: "d707ad9f615e5b218bc862b3e6b846305404116abfdd7f6eb9f82d25a7c62936" },
    { addr: "GBGPPH...2QRJ", role: "Investor", action: "Pledge Escrow", amount: "200 XLM", hash: "e382bca89d120a8d7cb120aa228bcf9a22cc33dd09fe43a12903ab3d02e0716a" },
    { addr: "GCW2B6...P3PL", role: "Investor", action: "Pledge Escrow", amount: "150 XLM", hash: "f921ab01e921d7bcf012bd87eaccd12093847ac4eef82bcfa82bc92bc2ea02bc" },
    { addr: "GDM2KP...UQQ9", role: "Investor", action: "Pledge Escrow", amount: "250 XLM", hash: "a092bcda7eac21390abdfefcc9374ba278acabdeee2bcf0a283bc9283e107293" },
    { addr: "GD7J2S...W2TR", role: "Investor", action: "Pledge Escrow", amount: "50 XLM", hash: "b218dcbc23ea02adcbefacab20374ab27baac9283e092bcfa892bcfda78e02cb" },
    { addr: "GCL8JN...98TR", role: "Investor", action: "Pledge Escrow", amount: "100 XLM", hash: "c3210abcf729cda7e0129bcfa27635ab27fccafeea02bcfa82bc20eac723a01d" },
    { addr: "GB09SK...L98O", role: "Investor", action: "Pledge Escrow", amount: "150 XLM", hash: "d9182bcfe09283bcaf329bcda927abceea28bcfe02bc3d7facca82cdb93d0ab2" },
    { addr: "GAK87S...F32N", role: "Investor", action: "Pledge Escrow", amount: "50 XLM", hash: "e829acdf82bcfd928bcabcb729bcdeae29acbeab02bce092bcda78ec09be8921" },
    { addr: "GC12PL...S32T", role: "Investor", action: "Pledge Escrow", amount: "50 XLM", hash: "fa012bcda92bcfef7820abcbcf92acbeea29bcabf02bcfc982cbfa78eac829cc" },
    { addr: "GD34RE...W89I", role: "Investor", action: "Pledge Escrow", amount: "100 XLM", hash: "b1092bcdaea29dcbfa729bcbefcfacbeea28bcfe02bcfa092bcda789efc89cba" }
];

// Seed feedback reviews
const DEFAULT_REVIEWS = [
    { name: "Pak Wayan", role: "Farmer", rating: 5, text: "Sangat membantu! AgroPledge memotong rentenir dan memberikan modal awal 50% di awal musim secara transparan." },
    { name: "Cafe Batavia", role: "Investor", rating: 5, text: "We locked in coffee commodity prices early in the season. On-chain escrows prevent counterparty risk entirely." },
    { name: "Siti Rahma", role: "Farmer", rating: 4, text: "Proses onboarding sangat mudah menggunakan Freighter wallet. Sangat direkomendasikan untuk petani kopi lokal." },
    { name: "GreenCorp Retail", role: "Investor", rating: 5, text: "Fantastic Web Portal. Real-time Soroban events and automatic milestone releases make agrifinance safe." }
];

// Connection Event Setup
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-connect").addEventListener("click", connectMultiWallet);
    document.getElementById("btn-pledge").addEventListener("click", () => {
        const amountInput = document.getElementById("amount").value;
        if (amountInput) executePledge(amountInput);
    });
    document.getElementById("btn-initialize").addEventListener("click", executeInitialize);
    document.getElementById("btn-claim-upfront").addEventListener("click", () => executeClaimMilestone("upfront"));
    document.getElementById("btn-claim-harvest").addEventListener("click", () => executeClaimMilestone("harvest"));
    document.getElementById("btn-inspector-verify").addEventListener("click", executeInspectorVerify);

    // Network selector change handler
    const netSelector = document.getElementById("network-selector");
    if (netSelector) {
        netSelector.addEventListener("change", (e) => {
            const net = e.target.value;
            currentNetwork = net;
            rpcUrl = NETWORKS[net].rpc;
            horizonUrl = NETWORKS[net].horizon;
            contractId = NETWORKS[net].contract;
            nativeTokenSac = NETWORKS[net].sac;
            passphrase = NETWORKS[net].passphrase;

            server = new StellarSdk.Horizon.Server(horizonUrl);
            kit = new StellarWalletsKit({
                network: net,
                selectedWalletId: WalletType.FREIGHTER
            });

            document.getElementById("lbl-contract-id").innerText = `${contractId.substring(0, 8)}...${contractId.substring(contractId.length - 8)}`;
            document.getElementById("lbl-contract-id").title = contractId;

            if (userAddress) {
                refreshWalletBalance();
            }
            fetchContractGlobalStatus();
            updateConsole("success", "Network Configuration Switched", `Target network changed to Stellar ${net}.`);
        });
    }

    // Seed feedback and user logs
    renderFeedbackReviews();
    renderOnboardedUsers();

    // Fetch campaign status initially
    fetchContractGlobalStatus();
    
    // Start listening to live events
    listenToContractEvents();

    showSlide(0);
});

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const targetBtn = Array.from(document.querySelectorAll(".tab-btn")).find(b => b.innerText.toLowerCase().includes(tabName));
    if (targetBtn) targetBtn.classList.add("active");

    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.add("active");
}

// Render user proofs list
function renderOnboardedUsers() {
    const tbody = document.getElementById("onboarded-users-tbody");
    if (!tbody) return;
    tbody.innerHTML = ONBOARDED_USERS.map(u => `
        <tr>
            <td><span class="table-address" title="${u.addr}">${u.addr}</span></td>
            <td><span class="review-role" style="background: ${u.role === 'Farmer' ? 'rgba(16,185,129,0.1)' : 'rgba(96,165,250,0.1)'}; color: ${u.role === 'Farmer' ? 'var(--primary)' : '#60a5fa'};">${u.role}</span></td>
            <td><span style="font-weight:600; color: #ffffff;">${u.action}</span></td>
            <td><span class="wallet-value" style="color:var(--primary); font-size:12px;">${u.amount}</span></td>
            <td><a class="event-hash" href="${currentNetwork === 'TESTNET' ? 'https://stellar.expert/explorer/testnet/tx/' : 'https://stellar.expert/explorer/public/tx/'}${u.hash}" target="_blank">${u.hash.substring(0, 10)}...</a></td>
        </tr>
    `).join("");
}

// Render Feedback Review Feed
function renderFeedbackReviews() {
    const feed = document.getElementById("reviews-feed-container");
    if (!feed) return;
    const stored = JSON.parse(localStorage.getItem("agropledge_feedback") || "[]");
    const allReviews = [...stored, ...DEFAULT_REVIEWS];

    feed.innerHTML = allReviews.map(r => `
        <div class="review-card">
            <div class="review-header">
                <span class="review-name">${r.name}</span>
                <span class="review-role">${r.role}</span>
            </div>
            <div class="review-rating">${"⭐".repeat(r.rating)}</div>
            <p class="review-text">"${r.text}"</p>
        </div>
    `).join("");
}

// Submit feedback reviewer
function submitFeedback() {
    const name = document.getElementById("feedback-name").value.trim();
    const role = document.getElementById("feedback-role").value;
    const rating = parseInt(document.getElementById("feedback-rating").value);
    const text = document.getElementById("feedback-text").value.trim();

    if (!name || !text) {
        alert("Please fill in your name and review comments.");
        return;
    }

    const stored = JSON.parse(localStorage.getItem("agropledge_feedback") || "[]");
    stored.unshift({ name, role, rating, text });
    localStorage.setItem("agropledge_feedback", JSON.stringify(stored));

    // Reset form
    document.getElementById("feedback-name").value = "";
    document.getElementById("feedback-text").value = "";

    renderFeedbackReviews();
    updateConsole("success", "Feedback Registered", "Thank you! Your feedback has been saved locally.");
}

// Modal controls
function openFarmModal() {
    document.getElementById("farm-modal").classList.add("active");
}

function closeFarmModal() {
    document.getElementById("farm-modal").classList.remove("active");
}

// Slide presentation controls
function showSlide(index) {
    currentSlide = index;
    const slide = PITCH_SLIDES[currentSlide];

    const bodyContainer = document.getElementById("slide-viewer-body");
    if (!bodyContainer) return;
    bodyContainer.innerHTML = `
        <div class="slide-title">${slide.title}</div>
        <div class="slide-subtitle">${slide.subtitle}</div>
        <ul class="slide-bullets">
            ${slide.bullets.map(b => `<li>${b}</li>`).join("")}
        </ul>
    `;

    // Update slide page number
    const pageNum = document.getElementById("slide-page-num");
    if (pageNum) pageNum.innerText = `Slide ${currentSlide + 1} of ${PITCH_SLIDES.length}`;

    // Update dots
    const dotsContainer = document.getElementById("slide-dots");
    if (dotsContainer) {
        dotsContainer.innerHTML = PITCH_SLIDES.map((_, i) => `
            <div class="indicator-dot ${i === currentSlide ? 'active' : ''}"></div>
        `).join("");
    }

    // Enable/disable buttons
    const prevBtn = document.getElementById("btn-slide-prev");
    const nextBtn = document.getElementById("btn-slide-next");
    if (prevBtn) prevBtn.disabled = currentSlide === 0;
    if (nextBtn) nextBtn.disabled = currentSlide === PITCH_SLIDES.length - 1;
}

function nextSlide() {
    if (currentSlide < PITCH_SLIDES.length - 1) {
        showSlide(currentSlide + 1);
    }
}

// prevSlide
function prevSlide() {
    if (currentSlide > 0) {
        showSlide(currentSlide - 1);
    }
}

// Helper methods to convert values
function addressToScVal(addressStr) {
    try {
        return StellarSdk.Address.fromString(addressStr).toScVal();
    } catch (e) {
        return StellarSdk.nativeToScVal(addressStr, { type: "address" });
    }
}

// Parse BigInt to i128 ScVal
function bigIntToI128ScVal(value) {
    const big = BigInt(value);
    return StellarSdk.nativeToScVal(big, { type: "i128" });
}

// Status Console logger helper
function updateConsole(type, title, desc, txHash = null) {
    const titleEl = document.getElementById("status-title");
    const descEl = document.getElementById("status-desc");
    const linkEl = document.getElementById("status-tx-link");
    const badge = document.getElementById("console-status-badge");

    if (!titleEl || !descEl || !linkEl || !badge) return;

    badge.className = "status-badge";
    linkEl.style.display = "none";

    switch(type) {
        case "pending":
            badge.classList.add("badge-pending");
            badge.innerText = "PENDING";
            break;
        case "success":
            badge.classList.add("badge-success");
            badge.innerText = "SUCCESS";
            if (txHash) {
                linkEl.style.display = "inline-block";
                linkEl.href = `${currentNetwork === 'TESTNET' ? 'https://stellar.expert/explorer/testnet/tx/' : 'https://stellar.expert/explorer/public/tx/'}${txHash}`;
            }
            break;
        case "error":
            badge.classList.add("badge-error");
            badge.innerText = "FAILED";
            break;
        default:
            badge.classList.add("badge-idle");
            badge.innerText = "IDLE";
    }

    titleEl.innerText = title;
    descEl.innerText = desc;
}

// Error interceptor
function handleError(error, context) {
    console.error(`Error during ${context}:`, error);
    const errMsg = error.message || String(error);
    const errLower = errMsg.toLowerCase();

    if (errLower.includes("user rejected") || errLower.includes("declined") || errLower.includes("cancel") || errLower.includes("user close")) {
        return { type: "REJECTED", title: "Transaction Canceled", message: "You declined to sign the transaction." };
    }
    if (errLower.includes("op_underfunded") || errLower.includes("insufficient balance") || errLower.includes("underfunded") || errLower.includes("tx_insufficient_balance")) {
        return { type: "INSUFFICIENT_BALANCE", title: "Insufficient Balance", message: "Underfunded: You don't have enough XLM in this wallet." };
    }
    if (errLower.includes("wallet not found") || errLower.includes("not installed") || errLower.includes("no wallet")) {
        return { type: "WALLET_NOT_FOUND", title: "Wallet Not Found", message: "No wallet found. Install Freighter or xBull extension." };
    }
    return { type: "SYSTEM_ERROR", title: `Error: ${context}`, message: errMsg };
}

// Connect Multi-Wallet via modal
async function connectMultiWallet() {
    updateConsole("pending", "Connecting", "Initiating wallet selection connection modal...");
    try {
        await kit.openModal();
        const { address } = await kit.getAddress();
        userAddress = address;

        // Update addresses in UI
        document.getElementById("wallet-address").innerText = `${userAddress.substring(0, 8)}...${userAddress.substring(address.length - 8)}`;
        document.getElementById("wallet-address").title = userAddress;
        document.getElementById("farmer-wallet-address").innerText = `${userAddress.substring(0, 8)}...${userAddress.substring(address.length - 8)}`;
        document.getElementById("farmer-wallet-address").title = userAddress;
        document.getElementById("inspector-wallet-address").innerText = `${userAddress.substring(0, 8)}...${userAddress.substring(address.length - 8)}`;
        document.getElementById("inspector-wallet-address").title = userAddress;

        await refreshWalletBalance();

        // Enable inputs
        document.getElementById("amount").disabled = false;
        document.getElementById("preset-50").disabled = false;
        document.getElementById("preset-100").disabled = false;
        document.getElementById("preset-250").disabled = false;
        document.getElementById("preset-500").disabled = false;
        
        document.getElementById("btn-pledge").disabled = false;
        document.getElementById("btn-initialize").disabled = false;
        document.getElementById("btn-inspector-verify").disabled = false;

        updateConsole("success", "Connected", `Successfully authenticated wallet! Welcome ${userAddress.substring(0, 6)}.`);
        
        // Evaluate farmer claim buttons
        evaluateFarmerClaimState();
    } catch (err) {
        const parsed = handleError(err, "Authentication");
        updateConsole("error", parsed.title, parsed.message);
    }
}

// Refresh XLM balance
async function refreshWalletBalance() {
    if (!userAddress) return;
    try {
        const account = await server.loadAccount(userAddress);
        const native = account.balances.find(b => b.asset_type === "native");
        const bal = native ? parseFloat(native.balance).toFixed(2) : "0.00";
        document.getElementById("wallet-balance").innerText = bal;
        document.getElementById("farmer-wallet-balance").innerText = bal;
    } catch (e) {
        console.error("Horizon balance read failed", e);
    }
}

// Read dynamic contract stats
async function fetchContractGlobalStatus() {
    try {
        const dummySource = new StellarSdk.Account("GBGPPHGK3Z7QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ", "0");
        const contract = new StellarSdk.Contract(contractId);
        const tx = new StellarSdk.TransactionBuilder(dummySource, {
            fee: "100",
            networkPassphrase: passphrase
        })
        .addOperation(contract.call("get_status"))
        .setTimeout(30)
        .build();

        const response = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "simulateTransaction",
                params: { transaction: tx.toXDR() }
            })
        });

        const json = await response.json();
        if (json.result && json.result.results && json.result.results.length > 0) {
            const scVal = StellarSdk.xdr.ScVal.fromXDR(json.result.results[0].xdr, "base64");
            const status = StellarSdk.scValToNative(scVal);

            contractState.targetAmount = Number(status.target_amount || 0);
            contractState.totalRaised = Number(status.total_raised || 0);
            contractState.farmer = status.farmer || "";
            contractState.token = status.token || "";
            contractState.upfrontClaimed = status.upfront_claimed || false;
            contractState.harvestClaimed = status.harvest_claimed || false;
            contractState.inspector = status.inspector || "";
            contractState.harvestApproved = status.harvest_approved || false;

            // Sync stats in UI
            document.getElementById("target-amount").innerText = contractState.targetAmount.toLocaleString();
            document.getElementById("live-raised").innerText = contractState.totalRaised.toLocaleString();
            
            const percent = contractState.targetAmount > 0 
                ? Math.min(100, Math.floor((contractState.totalRaised / contractState.targetAmount) * 100)) 
                : 0;
            document.getElementById("progress-percent").innerText = `${percent}%`;
            document.getElementById("progress-fill").style.width = `${percent}%`;

            // Update payouts in Farmer UI
            const halfRaised = (contractState.totalRaised * 0.5).toFixed(0);
            document.getElementById("lbl-upfront-value").innerText = halfRaised;
            document.getElementById("lbl-harvest-value").innerText = halfRaised;

            evaluateFarmerClaimState();
        }
    } catch (e) {
        console.warn("RPC sim get_status failed:", e);
    }
}

// Enable/Disable claim buttons based on contract states
function evaluateFarmerClaimState() {
    if (!userAddress) return;

    const isFarmer = (userAddress === contractState.farmer) || !contractState.farmer;

    // Upfront Milestone Button
    const btnUpfront = document.getElementById("btn-claim-upfront");
    const badgeUpfront = document.getElementById("badge-milestone-upfront");
    if (!btnUpfront || !badgeUpfront) return;

    if (contractState.upfrontClaimed) {
        btnUpfront.innerText = "Capital Claimed";
        btnUpfront.disabled = true;
        badgeUpfront.innerText = "Claimed ✅";
        badgeUpfront.className = "milestone-badge claimed";
    } else {
        btnUpfront.innerText = "Claim Upfront Capital";
        btnUpfront.disabled = !isFarmer || contractState.totalRaised <= 0;
        badgeUpfront.innerText = "Available";
        badgeUpfront.className = "milestone-badge";
    }

    // Harvest Milestone Button
    const btnHarvest = document.getElementById("btn-claim-harvest");
    const badgeHarvest = document.getElementById("badge-milestone-harvest");
    const noticeEl = document.getElementById("farmer-inspector-notice");
    if (!btnHarvest || !badgeHarvest || !noticeEl) return;

    if (contractState.harvestClaimed) {
        btnHarvest.innerText = "Settled";
        btnHarvest.disabled = true;
        badgeHarvest.innerText = "Claimed ✅";
        badgeHarvest.className = "milestone-badge claimed";
        noticeEl.innerText = "🎉 Escrow Fully Settled!";
        noticeEl.style.color = "var(--primary)";
    } else {
        btnHarvest.innerText = "Claim Harvest Release";
        badgeHarvest.innerText = contractState.upfrontClaimed ? (contractState.harvestApproved ? "Available" : "Awaiting QA") : "Locked";
        badgeHarvest.className = "milestone-badge";

        if (!contractState.upfrontClaimed) {
            btnHarvest.disabled = true;
            noticeEl.innerText = "🔒 Upfront Capital Must Be Claimed First";
            noticeEl.style.color = "var(--text-muted)";
        } else if (!contractState.harvestApproved) {
            btnHarvest.disabled = true;
            noticeEl.innerText = "🔒 Awaiting QA Inspector Quality Audit";
            noticeEl.style.color = "var(--accent)";
        } else {
            btnHarvest.disabled = !isFarmer;
            noticeEl.innerText = "🔓 QA Approved. Ready for Claim!";
            noticeEl.style.color = "var(--primary)";
        }
    }
}

// Execute Escrow Pledge operation
async function executePledge(amount) {
    updateConsole("pending", "Pledge Initiated", "Building Soroban write transaction...");
    try {
        if (!userAddress) throw new Error("Wallet not connected");

        const account = await server.loadAccount(userAddress);
        const contract = new StellarSdk.Contract(contractId);
        
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: passphrase
        })
        .addOperation(
            contract.call(
                "pledge_funds",
                addressToScVal(userAddress),
                bigIntToI128ScVal(amount)
            )
        )
        .setTimeout(180)
        .build();

        updateConsole("pending", "Signing", "Approve the signature request in your wallet window.");
        const signedXdr = await kit.signTransaction(tx.toXDR());

        updateConsole("pending", "Broadcasting", "Broadcasting payload to Soroban network...");
        const sendRes = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sendTransaction",
                params: { transaction: signedXdr }
            })
        });

        const sendJson = await sendRes.json();
        if (sendJson.error) throw new Error(sendJson.error.message);

        const hash = sendJson.result.hash;
        let status = sendJson.result.status;

        if (status === "ERROR") throw new Error("Broadcast error: " + JSON.stringify(sendJson.result));

        updateConsole("pending", "Consensus", "Pledge submitted. Waiting for transaction settlement...");
        let attempts = 0;
        let done = false;

        while (status === "PENDING" && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;

            const pollRes = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getTransaction",
                    params: { hash }
                })
            });
            const pollJson = await pollRes.json();
            if (pollJson.result) {
                status = pollJson.result.status;
                if (status === "SUCCESS") {
                    done = true;
                    break;
                } else if (status === "FAILED") {
                    throw new Error("Contract execution failed on-chain.");
                }
            }
        }

        if (done) {
            updateConsole("success", "Pledge Confirmed!", `Thank you! Pledged ${amount} XLM to the smart contract.`, hash);
            await refreshWalletBalance();
            await fetchContractGlobalStatus();
        } else {
            throw new Error("Transaction polling timed out.");
        }
    } catch (e) {
        const parsed = handleError(e, "Pledge Transaction");
        updateConsole("error", parsed.title, parsed.message);
    }
}

// Initialize Contract parameters
async function executeInitialize() {
    const farmerAddr = document.getElementById("init-farmer-addr").value.trim();
    const inspectorAddr = document.getElementById("init-inspector-addr").value.trim();
    const targetFunding = document.getElementById("init-target").value;

    if (!farmerAddr || !inspectorAddr || !targetFunding) {
        alert("Please fill in the Farmer address, Inspector address, and Target Funding goal.");
        return;
    }

    updateConsole("pending", "Initializing", "Preparing initialize operation on contract...");
    try {
        const account = await server.loadAccount(userAddress);
        const contract = new StellarSdk.Contract(contractId);

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: passphrase
        })
        .addOperation(
            contract.call(
                "initialize",
                addressToScVal(nativeTokenSac),
                addressToScVal(farmerAddr),
                addressToScVal(inspectorAddr),
                bigIntToI128ScVal(targetFunding)
            )
        )
        .setTimeout(180)
        .build();

        updateConsole("pending", "Signing", "Approve initialization details in your wallet...");
        const signedXdr = await kit.signTransaction(tx.toXDR());

        updateConsole("pending", "Broadcasting", "Sending initial state transaction to Soroban...");
        const sendRes = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sendTransaction",
                params: { transaction: signedXdr }
            })
        });

        const sendJson = await sendRes.json();
        if (sendJson.error) throw new Error(sendJson.error.message);

        const hash = sendJson.result.hash;
        let status = sendJson.result.status;

        updateConsole("pending", "Settle", "Waiting for network consensus to record project details...");
        let attempts = 0;
        let done = false;

        while (status === "PENDING" && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
            const pollRes = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getTransaction",
                    params: { hash }
                })
            });
            const pollJson = await pollRes.json();
            if (pollJson.result) {
                status = pollJson.result.status;
                if (status === "SUCCESS") {
                    done = true;
                    break;
                }
            }
        }

        if (done) {
            updateConsole("success", "Project Initialized", "Escrow parameters successfully written to the blockchain!", hash);
            await fetchContractGlobalStatus();
        } else {
            throw new Error("Transaction timed out.");
        }
    } catch (e) {
        const parsed = handleError(e, "Initialization");
        updateConsole("error", parsed.title, parsed.message);
    }
}

// Disburse Milestone funds
async function executeClaimMilestone(milestone) {
    updateConsole("pending", "Milestone Claim", `Building ${milestone} disbursement claim transaction...`);
    try {
        const account = await server.loadAccount(userAddress);
        const contract = new StellarSdk.Contract(contractId);
        const milestoneSym = StellarSdk.nativeToScVal(milestone, { type: "symbol" });

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: passphrase
        })
        .addOperation(
            contract.call(
                "claim_milestone",
                addressToScVal(userAddress),
                milestoneSym
            )
        )
        .setTimeout(180)
        .build();

        updateConsole("pending", "Signing Claim", `Approve signature to release ${milestone} funds...`);
        const signedXdr = await kit.signTransaction(tx.toXDR());

        updateConsole("pending", "Executing Release", "Verifying farmer authorization and releasing payout from escrow...");
        const sendRes = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sendTransaction",
                params: { transaction: signedXdr }
            })
        });

        const sendJson = await sendRes.json();
        if (sendJson.error) throw new Error(sendJson.error.message);

        const hash = sendJson.result.hash;
        let status = sendJson.result.status;

        updateConsole("pending", "Consensus", "Releasing tokens. Waiting for block inclusion...");
        let attempts = 0;
        let done = false;

        while (status === "PENDING" && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
            const pollRes = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getTransaction",
                    params: { hash }
                })
            });
            const pollJson = await pollRes.json();
            if (pollJson.result) {
                status = pollJson.result.status;
                if (status === "SUCCESS") {
                    done = true;
                    break;
                }
            }
        }

        if (done) {
            updateConsole("success", "Milestone Released!", `Escrow release of 50% successfully settled to your farmer account!`, hash);
            await refreshWalletBalance();
            await fetchContractGlobalStatus();
        } else {
            throw new Error("Transaction timed out.");
        }
    } catch (e) {
        const parsed = handleError(e, "Milestone Claim");
        updateConsole("error", parsed.title, parsed.message);
    }
}

// QA Inspector approval operation (actual on-chain approve_harvest)
async function executeInspectorVerify() {
    const moisture = document.getElementById("inspect-moisture").value;
    const grade = document.getElementById("inspect-grade").value;
    const seal = document.getElementById("inspect-seal").value.trim();

    if (!moisture || !seal) {
        alert("Please fill in moisture level and cooperative seal ID.");
        return;
    }

    updateConsole("pending", "Auditing Payouts", "Assembling inspector approval transaction on-chain...");
    try {
        if (!userAddress) throw new Error("Wallet not connected");

        const account = await server.loadAccount(userAddress);
        const contract = new StellarSdk.Contract(contractId);

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: passphrase
        })
        .addOperation(
            contract.call(
                "approve_harvest",
                addressToScVal(userAddress)
            )
        )
        .setTimeout(180)
        .build();

        updateConsole("pending", "Signing Approval", "Approve inspector QA audit signature in wallet...");
        const signedXdr = await kit.signTransaction(tx.toXDR());

        updateConsole("pending", "Broadcasting", "Broadcasting QA approval to Soroban network...");
        const sendRes = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sendTransaction",
                params: { transaction: signedXdr }
            })
        });

        const sendJson = await sendRes.json();
        if (sendJson.error) throw new Error(sendJson.error.message);

        const hash = sendJson.result.hash;
        let status = sendJson.result.status;

        updateConsole("pending", "Consensus", "Approval submitted. Waiting for transaction settlement...");
        let attempts = 0;
        let done = false;

        while (status === "PENDING" && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;

            const pollRes = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getTransaction",
                    params: { hash }
                })
            });
            const pollJson = await pollRes.json();
            if (pollJson.result) {
                status = pollJson.result.status;
                if (status === "SUCCESS") {
                    done = true;
                    break;
                } else if (status === "FAILED") {
                    throw new Error("Contract execution failed on-chain.");
                }
            }
        }

        if (done) {
            // Show report card in UI
            const reportView = document.getElementById("inspect-report-view");
            if (reportView) reportView.style.display = "flex";
            
            const moistureLbl = document.getElementById("lbl-report-moisture");
            const gradeLbl = document.getElementById("lbl-report-grade");
            const sealLbl = document.getElementById("lbl-report-seal");
            if (moistureLbl) moistureLbl.innerText = `${moisture}%`;
            if (gradeLbl) gradeLbl.innerText = grade;
            if (sealLbl) sealLbl.innerText = seal;

            updateConsole("success", "QA Certificate Issued", `Moisture level at ${moisture}% verified as ${grade}. Harvest escrow milestone unlocked on-chain.`, hash);
            evaluateFarmerClaimState();
            
            // Log custom event
            const feed = document.getElementById("event-feed");
            if (feed) {
                const time = new Date().toLocaleTimeString();
                feed.innerHTML += `
                    <div class="event-item">
                        <span class="event-time">[${time}]</span>
                        <span class="event-tag" style="color: #60a5fa;">🔍 QA Approved</span>
                        <span class="event-body">
                            Auditor verified delivery of <strong>${grade} crop</strong> (moisture: ${moisture}%). 
                            Escrow unlocked on-chain. Reference: ${seal}
                        </span>
                        <a class="event-hash" href="${currentNetwork === 'TESTNET' ? 'https://stellar.expert/explorer/testnet/tx/' : 'https://stellar.expert/explorer/public/tx/'}${hash}" target="_blank">
                            Consensus Tx: ${hash.substring(0, 12)}...
                        </a>
                    </div>
                `;
                feed.scrollTop = feed.scrollHeight;
            }
            await fetchContractGlobalStatus();
        } else {
            throw new Error("Transaction polling timed out.");
        }
    } catch (e) {
        const parsed = handleError(e, "QA Approval Transaction");
        updateConsole("error", parsed.title, parsed.message);
    }
}

// Live Event polling
async function listenToContractEvents() {
    const feed = document.getElementById("event-feed");
    if (!feed) return;
    try {
        const info = await fetch(horizonUrl).then(res => res.json());
        lastPolledLedger = Number(info.history_latest_ledger || 0) - 15;

        feed.innerHTML = `
            <div class="event-item">
                <span class="event-time">[System]</span>
                <span class="event-body" style="color: var(--primary);">Real-time Soroban RPC node synchronized. Listening for contract actions...</span>
            </div>
        `;
    } catch (e) {
        console.error("Horizon read error:", e);
        lastPolledLedger = 0;
    }

    setInterval(async () => {
        if (lastPolledLedger <= 0) return;

        try {
            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getEvents",
                    params: {
                        startLedger: lastPolledLedger,
                        filters: [
                            {
                                type: "contract",
                                contractIds: [contractId]
                            }
                        ],
                        limit: 10
                    }
                })
            });

            const json = await response.json();
            if (json.result && json.result.events) {
                const events = json.result.events;
                for (const event of events) {
                    if (event.ledger >= lastPolledLedger) {
                        lastPolledLedger = event.ledger + 1;
                    }

                    const topics = event.topic.map(t => StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(t, "base64")));
                    const valSc = StellarSdk.xdr.ScVal.fromXDR(event.value, "base64");
                    const val = StellarSdk.scValToNative(valSc);

                    const eventName = topics[0];
                    const sourceAddr = topics[1];
                    const amtVal = Number(val);
                    const time = new Date(event.ledgerClosedAt).toLocaleTimeString();

                    let eventHtml = "";
                    if (eventName === "pledged") {
                        eventHtml = `
                            <div class="event-item">
                                <span class="event-time">[${time}]</span>
                                <span class="event-tag">🎉 Pledged</span>
                                <span class="event-body">
                                    Account <strong>${sourceAddr.substring(0, 6)}...${sourceAddr.substring(sourceAddr.length - 4)}</strong> 
                                    contributed <strong>${amtVal} XLM</strong> to escrow campaign.
                                </span>
                                <a class="event-hash" href="${currentNetwork === 'TESTNET' ? 'https://stellar.expert/explorer/testnet/tx/' : 'https://stellar.expert/explorer/public/tx/'}${event.txHash}" target="_blank">
                                    Consensus Tx: ${event.txHash.substring(0, 12)}...
                                </a>
                            </div>
                        `;
                    } else if (eventName === "claimed") {
                        eventHtml = `
                            <div class="event-item">
                                <span class="event-time">[${time}]</span>
                                <span class="event-tag" style="color:var(--accent);">🌾 Claimed</span>
                                <span class="event-body">
                                    Farmer <strong>${sourceAddr.substring(0, 6)}...${sourceAddr.substring(sourceAddr.length - 4)}</strong> 
                                    disbursed <strong>${amtVal} XLM</strong> working capital.
                                </span>
                                <a class="event-hash" href="${currentNetwork === 'TESTNET' ? 'https://stellar.expert/explorer/testnet/tx/' : 'https://stellar.expert/explorer/public/tx/'}${event.txHash}" target="_blank">
                                    Consensus Tx: ${event.txHash.substring(0, 12)}...
                                </a>
                            </div>
                        `;
                    } else if (eventName === "approved") {
                        eventHtml = `
                            <div class="event-item">
                                <span class="event-time">[${time}]</span>
                                <span class="event-tag" style="color:#60a5fa;">🔍 QA Approved</span>
                                <span class="event-body">
                                    Inspector <strong>${sourceAddr.substring(0, 6)}...${sourceAddr.substring(sourceAddr.length - 4)}</strong> 
                                    submitted on-chain crop quality certification approval.
                                </span>
                                <a class="event-hash" href="${currentNetwork === 'TESTNET' ? 'https://stellar.expert/explorer/testnet/tx/' : 'https://stellar.expert/explorer/public/tx/'}${event.txHash}" target="_blank">
                                    Consensus Tx: ${event.txHash.substring(0, 12)}...
                                </a>
                            </div>
                        `;
                    }

                    if (eventHtml) {
                        feed.innerHTML += eventHtml;
                        feed.scrollTop = feed.scrollHeight;
                    }
                }

                if (events.length > 0) {
                    await fetchContractGlobalStatus();
                }
            }
        } catch (e) {
            console.error("Soroban events polling exception:", e);
        }
    }, 6000);
}

// User-triggered prompt to change the target contract address dynamically
function changeContractIdPrompt() {
    const newId = prompt("Enter new Soroban Contract ID:", contractId);
    if (newId && newId.trim().length === 56) {
        contractId = newId.trim();
        document.getElementById("lbl-contract-id").innerText = `${contractId.substring(0, 8)}...${contractId.substring(contractId.length - 8)}`;
        document.getElementById("lbl-contract-id").title = contractId;
        updateConsole("success", "Contract Configured", `Switched interface target to contract: ${contractId}`);
        fetchContractGlobalStatus();
    } else if (newId) {
        alert("Invalid Contract ID length. Must be exactly 56 characters.");
    }
}

// Setup window bindings for global scope access
window.switchTab = switchTab;
window.submitFeedback = submitFeedback;
window.openFarmModal = openFarmModal;
window.closeFarmModal = closeFarmModal;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.changeContractIdPrompt = changeContractIdPrompt;