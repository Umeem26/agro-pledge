# 🌱 AgroPledge — Decentralized Forward Contract Platform

<p align="center">
  <strong>APAC Stellar Hackathon 2026 — Level 3 Orange Belt Submission</strong>
</p>

<p align="center">
  <a href="#-project-overview">Overview</a> •
  <a href="#-track--identity">Identity</a> •
  <a href="#-level-3-milestones-verification">Milestones</a> •
  <a href="#-smart-contract-information">Smart Contract</a> •
  <a href="#-frontend-integration">Frontend</a> •
  <a href="#-proof-of-execution">Proof of Execution</a>
</p>

---

## 📋 Project Overview
**AgroPledge** is a decentralized forward contract platform designed to empower unbanked local farmers by providing them direct access to upfront capital, while allowing smart institutional buyers (restaurants, catering businesses) to lock in commodity prices early in the season. Powered by **Soroban Smart Contracts** on the **Stellar Network**, AgroPledge completely cuts out predatory middlemen and brings absolute trust and transparency to agricultural supply chain financing.

This public repository serves as the single immutable workspace tracking the development journey across all hackathon building levels.

---

## 🎯 Track & Identity
*   **Project Name:** AgroPledge
*   **Project Track:** Local Finance & Real World Access
*   **Target Demographics:**
    *   **Local Farmers:** Access to early-season financing for seeds and fertilizers.
    *   **B2B/Retail Buyers:** Price volatility protection with transparent on-chain guarantees.

---

## ⚡ Level 3 Milestones Verification

All technical baselines mandated by the Level 3 (Orange Belt) specification have been successfully built, validated, and deployed:

### 1. ⚙️ Smart Contract (Soroban Backend)
The Soroban smart contract is built in Rust, successfully compiled to WebAssembly, and deployed on the **Stellar Testnet** under the developer account identity `walletumem`.
*   **Contract ID:** `CB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ7VQD`
*   **Transaction Hash:** `d707ad9f615e5b218bc862b3e6b846305404116abfdd7f6eb9f82d25a7c62936`
*   **Exported Functions:**
    *   `initialize`: Sets up the contract state and terms.
    *   `pledge_funds`: Escrows investment tokens (XLM) from B2B buyers into the contract.
    *   `get_status`: Returns current funding statistics (total raised, goals reached).

### 2. 🖥️ Web Portal (Frontend Level 2)
The client interface interacts directly with the Stellar Testnet and features:
*   **Multi-Wallet Connection Kit:** Integrated `@creit.tech/stellar-wallets-kit` enabling a connection modal supporting various Stellar ecosystem wallets (Freighter, Albedo, xBull, etc.).
*   **Robust Error Handling:** Handles three critical client error vectors:
    1.  *User Rejected*: Gracefully handles transaction signature declines.
    2.  *Insufficient Balance*: Intercepts `op_underfunded` errors before/during submission.
    3.  *Wallet Not Found*: Detects missing extensions or failed API initializations.
*   **Real-Time Status & Events:** Visual progress indicators (Pending / Success / Fail states) and a live polling event stream simulating/monitoring on-chain contract events.

### 3. 📱 Flutter Mobile Application (Frontend Level 3)
A fully functional mobile client built using **Flutter** and **Dart** for premium mobile experience:
*   **Stellar Flutter SDK**: Integrated `stellar_flutter_sdk` to perform Soroban RPC simulations, read contract status (`get_status`), sign transactions locally via keypairs, and send requests.
*   **Onboarding & Credential Console**: Offers dynamic selection between Investor and Farmer portals, containing an integrated testnet wallet generator and Friendbot funder utility.
*   **Milestone-Based Escrow Tracker**: Visualizes the locked/unlocked state of the 50% Upfront working capital and 50% post-harvest settlement milestones.
*   **Investor & Farmer Dashboards**: Separated dashboards displaying live blockchain logs, campaign progress bars, and pledge/milestone claim buttons.

---

## 📸 Proof of Execution

Below is the verified graphical proof showing the authenticated execution states directly inside the development sandbox environment:

### 1. Authorized GitHub Sync & Integrated Studio Workspace
<p align="center">
  <img src="./screenshots/ss_workspace.png" alt="Workspace Verification" width="85%">
</p>

### 2. On-Chain Contract Registry (Verified Explorer State)
The deployment engine has successfully broadcasted the build payload, binding it to a unique network address.
<p align="center">
  <img src="./screenshots/ss_explorer.png" alt="Contract Explorer Identity" width="85%">
</p>

### 3. Successful Testnet Transaction Settlement (StellarExpert)
Immutable cryptographic verification proving successful operations execution, clear fee allocation, and formal network consensus validation.
<p align="center">
  <img src="./screenshots/ss_tx.png" alt="StellarExpert Transaction Proof" width="85%">
</p>

### 4. Multi-Wallet Connection Modal
Integrated wallet selection dialog displayed dynamically when the investor connects their wallet on the web portal.
<p align="center">
  <img src="./screenshots/ss_multiwallet.png" alt="Multi-Wallet Dialog Integration" width="85%">
</p>

### 5. Flutter Mobile App Onboarding Screen
Visual setup screen allowing keypair generation and Friendbot testing console integration.
<p align="center">
  <img src="./screenshots/ss_mobile_onboarding.png" alt="Flutter Mobile Onboarding Screen" width="50%">
</p>

### 6. Flutter Mobile App Investor Dashboard
Frosted dark emerald dashboard allowing retail buyers to submit Soroban pledges and view live feeds.
<p align="center">
  <img src="./screenshots/ss_mobile_investor.png" alt="Flutter Mobile Investor Dashboard" width="50%">
</p>

### 7. Flutter Mobile App Farmer Dashboard
Disbursement interface allowing local farmers to trigger milestone claims.
<p align="center">
  <img src="./screenshots/ss_mobile_farmer.png" alt="Flutter Mobile Farmer Dashboard" width="50%">
</p>

### 8. Automated Smart Contract Test Suites (4/4 Passed)
Rust cargo testing framework validating all state mutations and token transfers.
<p align="center">
  <img src="./screenshots/ss_test_output.png" alt="Smart Contract Test Output" width="85%">
</p>

### 9. CI/CD Integration (GitHub Actions Workflow)
Automatic builds, test suite executions, and Flutter static analysis checks.
<p align="center">
  <img src="./screenshots/ss_cicd_pipeline.png" alt="CI/CD Pipeline Running Status" width="85%">
</p>

---

## 🛠️ Local Compiling & Running Guide

To compile or test the project code structures locally on your machine:

1. Clone this repository link:
```bash
git clone https://github.com/Umeem26/agro-pledge.git
```

2. Build the target project WASM binary:
```bash
cargo build --target wasm32-unknown-unknown --release
```

3. Run embedded smart contract unit tests:
```bash
cargo test
```

4. Run the Web Portal locally:
```bash
# Serves index.html on port 5500
npx http-server -p 5500
```
Open `http://127.0.0.1:5500/` in your browser.

5. Run the Flutter Mobile App locally:
```bash
cd agro_pledge_mobile
flutter run -d chrome
```
