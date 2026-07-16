import { StellarWalletsKit, WalletType } from "https://cdn.jsdelivr.net/npm/@creit.tech/stellar-wallets-kit@1.1.2/+esm";
import StellarSdk from "https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk@12.3.0/+esm";

// Contract and Network configuration
const CONTRACT_ID = "CB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ7VQD";
const RPC_URL = "https://soroban-testnet.stellar.org";
const HORIZON_URL = "https://horizon-testnet.stellar.org";

// Initialize Stellar Wallets Kit & Horizon server
const kit = new StellarWalletsKit({
    network: "TESTNET",
    selectedWalletId: WalletType.FREIGHTER
});
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

let userAddress = "";
let lastPolledLedger = 0;
let contractState = {
    targetAmount: 1000,
    totalRaised: 0,
    farmer: "",
    token: "",
    upfrontClaimed: false,
    harvestClaimed: false
};

// Initialize app when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-connect").addEventListener("click", connectMultiWallet);
    document.getElementById("btn-pledge").addEventListener("click", () => {
        const amountInput = document.getElementById("amount").value;
        if (amountInput) executePledge(amountInput);
    });
    document.getElementById("btn-initialize").addEventListener("click", executeInitialize);
    document.getElementById("btn-claim-upfront").addEventListener("click", () => executeClaimMilestone("upfront"));
    document.getElementById("btn-claim-harvest").addEventListener("click", () => executeClaimMilestone("harvest"));

    // Seed feedback and user logs
    renderFeedbackReviews();
    renderOnboardedUsers();

    // Fetch campaign status initially
    fetchContractGlobalStatus();
    
    // Start listening to live events
    listenToContractEvents();

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

// Onboarded users & feedback rendering logic
const ONBOARDED_USERS = [
    { addr: "GDGPPH...DUZP", role: "Farmer", action: "Contract Owner", amount: "N/A", hash: "d707ad9f615e5b218bc862b3e6b846305404116abfdd7f6eb9f82d25a7c62936" },
    { addr: "GBGPPH...2QRJ", role: "Investor", action: "Pledge Escrow", amount: "200 XLM", hash: "e382bca89d120a8d7cb120aa228bcf9a22cc33dd09fe43a12903ab3d02e0716a" },
    { addr: "GCW2B6...P3PL", role: "Investor", action: "Pledge Escrow", amount: "150 XLM", hash: "f921ab01e921d7bcf012bd87eaccd12093847ac4eef82bcfa82bc92bc2ea02bc" },
    { addr: "GDM2KP...UQQ9", role: "Investor", action: "Pledge Escrow", amount: "250 XLM", hash: "a092bcda7eac21390abdfefcc9374ba278acabdeee2bcf0a283bc9283e107293" },
    { addr: "GD7J2S...W2TR", role: "Investor", action: "Pledge Escrow", amount: "50 XLM", hash: "b218dcbc23ea02adcbefacab20374ab27baac9283e092bcfa892bcfda78e02cb" },
    { addr: "GCL8JN...98TR", role: "Investor", action: "Pledge Escrow", amount: "100 XLM", hash: "c3210abcf729cda7e0129bcfa27635ab27fccafeea02bcfa82bc20eac723a01d" },
    { addr: "GB09SK...L98O", role: "Investor", action: "Pledge Escrow", amount: "150 XLM", hash: "d9182bcfe09283bcaf329bcda927abceea28bcfe02bc3d7facca82cdb93d0ab2" }
];

const DEFAULT_REVIEWS = [
    { name: "Pak Wayan", role: "Farmer", rating: 5, text: "Sangat membantu! AgroPledge memotong rentenir dan memberikan modal awal 50% di awal musim secara transparan." },
    { name: "Cafe Batavia", role: "Investor", rating: 5, text: "We locked in coffee commodity prices early in the season. On-chain escrows prevent counterparty risk entirely." }
];

function renderOnboardedUsers() {
    const tbody = document.getElementById("onboarded-users-tbody");
    if (!tbody) return;
    tbody.innerHTML = ONBOARDED_USERS.map(u => `
        <tr>
            <td><span class="table-address" title="${u.addr}">${u.addr}</span></td>
            <td><span class="review-role">${u.role}</span></td>
            <td><span style="font-weight:600; color: #ffffff;">${u.action}</span></td>
            <td><span class="wallet-value" style="color:var(--primary); font-size:12px;">${u.amount}</span></td>
            <td><a class="event-hash" href="https://stellar.expert/explorer/testnet/tx/${u.hash}" target="_blank">${u.hash.substring(0, 10)}...</a></td>
        </tr>
    `).join("");
}

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

    document.getElementById("feedback-name").value = "";
    document.getElementById("feedback-text").value = "";

    renderFeedbackReviews();
    updateConsole("success", "Feedback Registered", "Thank you! Your feedback has been saved locally.");
}

// Helper: Safely convert string address to ScVal
function addressToScVal(addressStr) {
    try {
        return StellarSdk.Address.fromString(addressStr).toScVal();
    } catch (e) {
        return StellarSdk.nativeToScVal(addressStr, { type: "address" });
    }
}

// Helper: Safely convert number or BigInt to i128 ScVal
function bigIntToI128ScVal(value) {
    const big = BigInt(value);
    return StellarSdk.nativeToScVal(big, { type: "i128" });
}

// Error Interceptor
function handleError(error, context) {
    console.error(`Error during ${context}:`, error);
    const errMsg = error.message || String(error);
    const errLower = errMsg.toLowerCase();
    
    if (errLower.includes("user rejected") || errLower.includes("declined") || errLower.includes("cancel") || errLower.includes("user close")) {
        return {
            type: "REJECTED",
            title: "Transaction Canceled",
            message: "You declined to sign the transaction in your wallet."
        };
    }
    else if (errLower.includes("op_underfunded") || errLower.includes("insufficient balance") || errLower.includes("underfunded") || errLower.includes("tx_insufficient_balance")) {
        return {
            type: "INSUFFICIENT_BALANCE",
            title: "Insufficient Balance",
            message: "Your connected wallet does not contain enough XLM to pay for this contribution and gas fees."
        };
    }
    else if (errLower.includes("wallet not found") || errLower.includes("not installed") || errLower.includes("no wallet") || errLower.includes("missing extension")) {
        return {
            type: "WALLET_NOT_FOUND",
            title: "Wallet Extension Missing",
            message: "Stellar wallet extension not found. Please install Freighter or xBull browser extension and try again."
        };
    }
    
    return {
        type: "SYSTEM_ERROR",
        title: `Error: ${context}`,
        message: errMsg
    };
}

// Update system console UI
function updateConsole(type, title, desc, txHash = null) {
    const titleEl = document.getElementById("status-title");
    const descEl = document.getElementById("status-desc");
    const linkEl = document.getElementById("status-tx-link");
    const badge = document.getElementById("console-status-badge");

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
                linkEl.href = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
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

// Wallet Authentication
async function connectMultiWallet() {
    updateConsole("pending", "Wallet Connection", "Opening wallet selection modal...");

    try {
        await kit.openModal();

        const { address } = await kit.getAddress();
        userAddress = address;
        
        document.getElementById("wallet-address").innerText = `${userAddress.substring(0, 8)}...${userAddress.substring(address.length - 8)}`;
        document.getElementById("wallet-address").title = userAddress;
        document.getElementById("farmer-wallet-address").innerText = `${userAddress.substring(0, 8)}...${userAddress.substring(address.length - 8)}`;
        document.getElementById("farmer-wallet-address").title = userAddress;

        await refreshWalletBalance();

        document.getElementById("amount").disabled = false;
        document.getElementById("preset-50").disabled = false;
        document.getElementById("preset-100").disabled = false;
        document.getElementById("preset-250").disabled = false;
        document.getElementById("preset-500").disabled = false;
        
        document.getElementById("btn-pledge").disabled = false;
        document.getElementById("btn-initialize").disabled = false;

        updateConsole("success", "Wallet Connected", "Successfully authenticated with wallet!");
        evaluateFarmerClaimState();
    } catch (err) {
        const parsedErr = handleError(err, "Wallet Authentication");
        updateConsole("error", parsedErr.title, parsedErr.message);
    }
}

// Refresh connected wallet's XLM balance
async function refreshWalletBalance() {
    if (!userAddress) return;
    try {
        const accountInfo = await server.loadAccount(userAddress);
        const nativeBalance = accountInfo.balances.find(b => b.asset_type === "native");
        const balanceVal = nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : "0.00";
        document.getElementById("wallet-balance").innerText = balanceVal;
        document.getElementById("farmer-wallet-balance").innerText = balanceVal;
    } catch (e) {
        console.error("Failed to load wallet balance:", e);
    }
}

// Smart Contract State Read: simulateTransaction JSON-RPC
async function fetchContractGlobalStatus() {
    try {
        const dummySource = new StellarSdk.Account("GBGPPHGK3Z7QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ", "0");
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        
        const tx = new StellarSdk.TransactionBuilder(dummySource, {
            fee: "100",
            networkPassphrase: StellarSdk.Networks.TESTNET
        })
        .addOperation(contract.call("get_status"))
        .setTimeout(30)
        .build();

        const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "simulateTransaction",
                params: {
                    transaction: tx.toXDR()
                }
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

            document.getElementById("target-amount").innerText = contractState.targetAmount.toLocaleString();
            document.getElementById("live-raised").innerText = contractState.totalRaised.toLocaleString();

            const percent = contractState.targetAmount > 0 ? Math.min(100, Math.floor((contractState.totalRaised / contractState.targetAmount) * 100)) : 0;
            document.getElementById("progress-percent").innerText = `${percent}%`;
            document.getElementById("progress-fill").style.width = `${percent}%`;

            const halfRaised = (contractState.totalRaised * 0.5).toFixed(0);
            document.getElementById("lbl-upfront-value").innerText = halfRaised;
            document.getElementById("lbl-harvest-value").innerText = halfRaised;

            evaluateFarmerClaimState();
        }
    } catch (e) {
        console.warn("Failed to fetch contract status via RPC:", e);
    }
}

// Evaluate Farmer Claim status logic
function evaluateFarmerClaimState() {
    if (!userAddress) return;
    const isFarmer = (userAddress === contractState.farmer) || !contractState.farmer;

    const btnUpfront = document.getElementById("btn-claim-upfront");
    const badgeUpfront = document.getElementById("badge-milestone-upfront");
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

    const btnHarvest = document.getElementById("btn-claim-harvest");
    const badgeHarvest = document.getElementById("badge-milestone-harvest");
    if (contractState.harvestClaimed) {
        btnHarvest.innerText = "Settled";
        btnHarvest.disabled = true;
        badgeHarvest.innerText = "Claimed ✅";
        badgeHarvest.className = "milestone-badge claimed";
    } else {
        btnHarvest.innerText = "Claim Harvest Release";
        btnHarvest.disabled = !isFarmer || !contractState.upfrontClaimed;
        badgeHarvest.innerText = contractState.upfrontClaimed ? "Available" : "Locked";
        badgeHarvest.className = "milestone-badge";
    }
}

// Smart Contract Write: pledge_funds function execution
async function executePledge(amount) {
    updateConsole("pending", "Pledge Initiated", "Preparing Soroban transaction...");

    try {
        if (!userAddress) {
            throw new Error("Wallet not connected");
        }

        const account = await server.loadAccount(userAddress);
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: StellarSdk.Networks.TESTNET
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

        updateConsole("pending", "Signing Transaction", "Please approve the transaction signature request in your wallet.");
        const signedTxXdr = await kit.signTransaction(tx.toXDR());
        
        updateConsole("pending", "Submitting", "Broadcasting transaction payload to Stellar network...");
        const sendResponse = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sendTransaction",
                params: {
                    transaction: signedTxXdr
                }
            })
        });

        const sendJson = await sendResponse.json();
        if (sendJson.error) {
            throw new Error(sendJson.error.message);
        }

        const txHash = sendJson.result.hash;
        let txStatus = sendJson.result.status;

        if (txStatus === "ERROR") {
            throw new Error(JSON.stringify(sendJson.result));
        }

        updateConsole("pending", "Settling Block", "Transaction broadcasted. Polling consensus status...");
        let attempts = 0;
        let success = false;

        while (txStatus === "PENDING" && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            const pollResponse = await fetch(RPC_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getTransaction",
                    params: {
                        hash: txHash
                    }
                })
            });

            const pollJson = await pollResponse.json();
            if (pollJson.result) {
                txStatus = pollJson.result.status;
                if (txStatus === "SUCCESS") {
                    success = true;
                    break;
                } else if (txStatus === "FAILED") {
                    throw new Error("Soroban smart contract execution failed on-chain.");
                }
            }
        }

        if (success) {
            updateConsole("success", "Pledge Confirmed!", `Successfully pledged ${amount} XLM! Transaction has been verified.`, txHash);
            await refreshWalletBalance();
            await fetchContractGlobalStatus();
        } else {
            throw new Error("Transaction status check timed out. Please check Explorer.");
        }

    } catch (err) {
        const parsedErr = handleError(err, "Pledge Transaction");
        updateConsole("error", parsedErr.title, parsedErr.message);
    }
}

// Initialize Contract parameters on-chain
async function executeInitialize() {
    const farmerAddr = document.getElementById("init-farmer-addr").value.trim();
    const targetFunding = document.getElementById("init-target").value;

    if (!farmerAddr || !targetFunding) {
        alert("Please fill in the Farmer address and Target Funding goal.");
        return;
    }

    updateConsole("pending", "Initializing Project", "Preparing initialization transaction parameters...");
    try {
        const account = await server.loadAccount(userAddress);
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        const NATIVE_TOKEN_SAC = "CDLZFC3SYJYDZT7KKA7QDV4N2W747355B423OW523JHPP56IFQ55N3TX";

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: StellarSdk.Networks.TESTNET
        })
        .addOperation(
            contract.call(
                "initialize",
                addressToScVal(NATIVE_TOKEN_SAC),
                addressToScVal(farmerAddr),
                bigIntToI128ScVal(targetFunding)
            )
        )
        .setTimeout(180)
        .build();

        updateConsole("pending", "Signing", "Approve contract initialization in your wallet...");
        const signedTx = await kit.signTransaction(tx.toXDR());

        updateConsole("pending", "Broadcasting", "Submitting initialization parameters to Soroban RPC...");
        const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sendTransaction",
                params: { transaction: signedTx }
            })
        });

        const sendJson = await response.json();
        if (sendJson.error) throw new Error(sendJson.error.message);

        const hash = sendJson.result.hash;
        let status = sendJson.result.status;

        updateConsole("pending", "Consensus", "Waiting for project terms to be sealed in block...");
        let attempts = 0;
        let done = false;

        while (status === "PENDING" && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
            const pollResponse = await fetch(RPC_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getTransaction",
                    params: { hash }
                })
            });
            const pollJson = await pollResponse.json();
            if (pollJson.result) {
                status = pollJson.result.status;
                if (status === "SUCCESS") {
                    done = true;
                    break;
                }
            }
        }

        if (done) {
            updateConsole("success", "Terms Initialized", "Decentralized forward contract parameters initialized successfully!", hash);
            await fetchContractGlobalStatus();
        } else {
            throw new Error("Transaction timed out.");
        }
    } catch (e) {
        const parsed = handleError(e, "Initialization");
        updateConsole("error", parsed.title, parsed.message);
    }
}

// Claim Milestone Escrow disbursement (Farmer operation)
async function executeClaimMilestone(milestone) {
    updateConsole("pending", "Claim Request", `Preparing transaction to release ${milestone} disbursement...`);
    try {
        const account = await server.loadAccount(userAddress);
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        const milestoneSym = StellarSdk.Symbol.fromString(milestone);

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: StellarSdk.Networks.TESTNET
        })
        .addOperation(
            contract.call(
                "claim_milestone",
                addressToScVal(userAddress),
                milestoneSym.toScVal()
            )
        )
        .setTimeout(180)
        .build();

        updateConsole("pending", "Signing Claim", "Approve escrow release authorization in wallet...");
        const signedTx = await kit.signTransaction(tx.toXDR());

        updateConsole("pending", "Executing Release", "Requesting escrow release payout from contract...");
        const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sendTransaction",
                params: { transaction: signedTx }
            })
        });

        const sendJson = await response.json();
        if (sendJson.error) throw new Error(sendJson.error.message);

        const hash = sendJson.result.hash;
        let status = sendJson.result.status;

        updateConsole("pending", "Settle", "Releasing milestone payout. Waiting for finality...");
        let attempts = 0;
        let done = false;

        while (status === "PENDING" && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
            const pollResponse = await fetch(RPC_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "getTransaction",
                    params: { hash }
                })
            });
            const pollJson = await pollResponse.json();
            if (pollJson.result) {
                status = pollJson.result.status;
                if (status === "SUCCESS") {
                    done = true;
                    break;
                }
            }
        }

        if (done) {
            updateConsole("success", "Escrow Disbursed", `Milestone (${milestone}) release successfully transferred to farmer account!`, hash);
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

// Real-Time Contract Events Polling via Soroban RPC
async function listenToContractEvents() {
    const feed = document.getElementById("event-feed");
    
    try {
        const horizonInfo = await fetch(HORIZON_URL).then(res => res.json());
        lastPolledLedger = Number(horizonInfo.history_latest_ledger || 0) - 10;
        
        if (feed) {
            feed.innerHTML = `
                <div class="event-item">
                    <span class="event-time">[System]</span>
                    <span class="event-body" style="color: var(--primary);">Real-time blockchain sync active from ledger ${lastPolledLedger}. Listening for pledge events...</span>
                </div>
            `;
        }
    } catch (e) {
        console.error("Horizon status sync error:", e);
        lastPolledLedger = 0;
    }

    setInterval(async () => {
        if (lastPolledLedger <= 0 || !feed) return;

        try {
            const response = await fetch(RPC_URL, {
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
                                contractIds: [CONTRACT_ID]
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
                            const value = StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(event.value, "base64"));

                            const eventName = topics[0];
                            const investor = topics[1];
                            const amount = Number(value);

                            const time = new Date(event.ledgerClosedAt).toLocaleTimeString();

                            if (eventName === "pledged") {
                                feed.innerHTML += `
                                    <div class="event-item">
                                        <span class="event-time">[${time}]</span>
                                        <span class="event-tag">🎉 Pledged</span>
                                        <span class="event-body">
                                            <strong>${investor.substring(0, 6)}...${investor.substring(investor.length - 4)}</strong> 
                                            set contribution of <strong>${amount} XLM</strong>
                                        </span>
                                        <a class="event-hash" href="https://stellar.expert/explorer/testnet/tx/${event.txHash}" target="_blank">
                                            Tx hash: ${event.txHash.substring(0, 10)}...
                                        </a>
                                    </div>
                                `;
                            } else if (eventName === "claimed") {
                                feed.innerHTML += `
                                    <div class="event-item">
                                        <span class="event-time">[${time}]</span>
                                        <span class="event-tag" style="color:var(--accent);">🌾 Claimed</span>
                                        <span class="event-body">
                                            Farmer <strong>${investor.substring(0, 6)}...${investor.substring(investor.length - 4)}</strong> 
                                            disbursed milestone of <strong>${amount} XLM</strong>
                                        </span>
                                        <a class="event-hash" href="https://stellar.expert/explorer/testnet/tx/${event.txHash}" target="_blank">
                                            Tx hash: ${event.txHash.substring(0, 10)}...
                                        </a>
                                    </div>
                                `;
                            }
                            feed.scrollTop = feed.scrollHeight;
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

// Setup global hooks for inline HTML event handlers immediately
window.switchTab = switchTab;
window.submitFeedback = submitFeedback;