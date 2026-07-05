import { StellarWalletsKit, WalletType } from "https://esm.sh/@creit.tech/stellar-wallets-kit";
import StellarSdk from "https://esm.sh/@stellar/stellar-sdk";

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

// Initialize app when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-connect").addEventListener("click", connectMultiWallet);
    document.getElementById("btn-pledge").addEventListener("click", () => {
        const amountInput = document.getElementById("amount").value;
        if (amountInput) executePledge(amountInput);
    });

    // Fetch campaign status initially
    fetchContractGlobalStatus();
    
    // Start listening to live events
    listenToContractEvents();
});

// Helper: Safely convert string address to ScVal
function addressToScVal(addressStr) {
    try {
        return StellarSdk.Address.fromString(addressStr).toScVal();
    } catch (e) {
        try {
            return new StellarSdk.Address(addressStr).toScVal();
        } catch (e2) {
            return StellarSdk.nativeToScVal(addressStr, { type: "address" });
        }
    }
}

// Helper: Safely convert number or BigInt to i128 ScVal
function bigIntToI128ScVal(value) {
    const big = BigInt(value);
    const lo = big & 0xffffffffffffffffn;
    const hi = big >> 64n;
    
    try {
        return StellarSdk.nativeToScVal(big, { type: "i128" });
    } catch (e) {
        const loParts = new StellarSdk.xdr.Uint64({
            high: Number(lo >> 32n),
            low: Number(lo & 0xffffffffn)
        });
        const hiParts = new StellarSdk.xdr.Int64({
            high: Number(hi >> 32n),
            low: Number(hi & 0xffffffffn)
        });
        const int128Parts = new StellarSdk.xdr.Int128Parts({
            lo: loParts,
            hi: hiParts
        });
        return StellarSdk.xdr.ScVal.scvI128(int128Parts);
    }
}

// Error Interceptor for the required 3 error types
function handleError(error, context) {
    console.error(`Error during ${context}:`, error);
    
    const errMsg = error.message || String(error);
    const errLower = errMsg.toLowerCase();
    
    // 1. Transaction Rejected by User
    if (errLower.includes("user rejected") || errLower.includes("declined") || errLower.includes("cancel") || errLower.includes("user close")) {
        return {
            type: "REJECTED",
            title: "Transaction Canceled",
            message: "You declined to sign the transaction in your wallet."
        };
    }
    // 2. Insufficient XLM Balance
    else if (errLower.includes("op_underfunded") || errLower.includes("insufficient balance") || errLower.includes("underfunded") || errLower.includes("tx_insufficient_balance")) {
        return {
            type: "INSUFFICIENT_BALANCE",
            title: "Insufficient Balance",
            message: "Your connected wallet does not contain enough XLM to pay for this contribution and gas fees."
        };
    }
    // 3. Wallet / Extension Not Found
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
    const consoleBox = document.getElementById("status-box");
    const titleEl = document.getElementById("status-title");
    const descEl = document.getElementById("status-desc");
    const linkEl = document.getElementById("status-tx-link");

    consoleBox.className = "status-console";
    linkEl.style.display = "none";

    switch(type) {
        case "pending":
            consoleBox.classList.add("status-pending");
            break;
        case "success":
            consoleBox.classList.add("status-success");
            if (txHash) {
                linkEl.style.display = "inline-block";
                linkEl.href = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
            }
            break;
        case "error":
            consoleBox.classList.add("status-error");
            break;
        default:
            consoleBox.classList.add("status-idle");
    }

    titleEl.innerText = title;
    descEl.innerText = desc;
}

// Wallet Authentication
async function connectMultiWallet() {
    updateConsole("pending", "Wallet Connection", "Opening wallet selection modal...");

    try {
        // Open stellar-wallets-kit connection modal
        await kit.openModal({
            onWalletSelected: async (wallet) => {
                console.log("Wallet selected:", wallet.id);
            }
        });

        const { address } = await kit.getAddress();
        userAddress = address;
        
        // Show wallet address in UI
        document.getElementById("wallet-address").innerText = `${userAddress.substring(0, 8)}...${userAddress.substring(address.length - 8)}`;
        document.getElementById("wallet-address").title = userAddress;

        // Fetch wallet balance from Horizon
        await refreshWalletBalance();

        // Enable pledge action inputs and buttons
        document.getElementById("amount").disabled = false;
        document.getElementById("btn-pledge").disabled = false;

        updateConsole("success", "Wallet Connected", "Successfully authenticated with wallet!");
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
    } catch (e) {
        console.error("Failed to load wallet balance:", e);
    }
}

// Smart Contract State Read: simulateTransaction JSON-RPC
async function fetchContractGlobalStatus() {
    try {
        // Use a dummy address with sequence 0 to build get_status call simulation
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
        if (json.error) {
            throw new Error(json.error.message);
        }

        const result = json.result;
        if (result.results && result.results.length > 0) {
            const resultXdr = result.results[0].xdr;
            const scVal = StellarSdk.xdr.ScVal.fromXDR(resultXdr, "base64");
            const nativeVal = StellarSdk.scValToNative(scVal);

            // PledgeState mapping
            const targetAmount = Number(nativeVal.target_amount || 0);
            const totalRaised = Number(nativeVal.total_raised || 0);

            document.getElementById("target-amount").innerText = targetAmount.toLocaleString();
            document.getElementById("live-raised").innerText = totalRaised.toLocaleString();

            const percent = targetAmount > 0 ? Math.min(100, Math.floor((totalRaised / targetAmount) * 100)) : 0;
            document.getElementById("progress-percent").innerText = `${percent}%`;
            document.getElementById("progress-fill").style.width = `${percent}%`;
        }
    } catch (e) {
        console.warn("Failed to fetch contract status via RPC (normal during contract initialization or RPC handshake):", e);
    }
}

// Smart Contract Write: pledge_funds function execution
async function executePledge(amount) {
    updateConsole("pending", "Pledge Initiated", "Preparing Soroban transaction...");

    try {
        if (!userAddress) {
            throw new Error("Wallet not connected");
        }

        // 1. Fetch account sequence number from Horizon
        const account = await server.loadAccount(userAddress);
        
        // 2. Construct contract write call (pledge_funds)
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: "100000", // Max fee allocation for complex execution
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

        // 3. Request wallet kit signature
        updateConsole("pending", "Signing Transaction", "Please approve the transaction signature request in your wallet.");
        const signedTxXdr = await kit.signTransaction(tx.toXDR());
        
        // 4. Submit to Soroban RPC sendTransaction endpoint
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

        // 5. Poll transaction status
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
            // Refresh interface state
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

// Real-Time Contract Events polling via getEvents Soroban RPC
async function listenToContractEvents() {
    const feed = document.getElementById("event-feed");
    
    try {
        // Fetch current network ledger height
        const horizonInfo = await fetch(HORIZON_URL).then(res => res.json());
        lastPolledLedger = Number(horizonInfo.history_latest_ledger || 0) - 10;
        
        feed.innerHTML = `
            <div class="event-item">
                <span class="event-time">[System]</span>
                <span class="event-body" style="color: var(--primary);">Real-time blockchain sync active from ledger ${lastPolledLedger}. Listening for pledge events...</span>
            </div>
        `;
    } catch (e) {
        console.error("Horizon status sync error:", e);
        lastPolledLedger = 0;
    }

    // Periodically poll events
    setInterval(async () => {
        if (lastPolledLedger <= 0) return;

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
                    // Update pointer to avoid duplicate reads
                    if (event.ledger >= lastPolledLedger) {
                        lastPolledLedger = event.ledger + 1;
                    }

                    // Decode event topics & value
                    const topics = event.topic.map(t => StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(t, "base64")));
                    const value = StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(event.value, "base64"));

                    const eventName = topics[0]; // "pledged"
                    const investor = topics[1];  // Address
                    const amount = Number(value); // BigInt or Number

                    const time = new Date(event.ledgerClosedAt).toLocaleTimeString();

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