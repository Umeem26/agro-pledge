# 🌱 AgroPledge — Decentralized Forward Contract Platform

<p align="center">
  <strong>APAC Stellar Hackathon 2026 — Level 5 Blue Belt Submission</strong>
</p>

<p align="center">
  <a href="#-project-overview">Overview</a> •
  <a href="#-track--identity">Identity</a> •
  <a href="#-level-5-milestones-verification">Level 5 Milestones</a> •
  <a href="#-smart-contract-information">Smart Contract</a> •
  <a href="#-product-iteration--growth">Product Iteration</a> •
  <a href="#-user-growth--onboarding">User Growth & Onboarding</a> •
  <a href="#-pitch-deck--demo">Pitch Deck & Demo</a> •
  <a href="#-proof-of-execution">Proof of Execution</a>
</p>

---

## 📋 Project Overview
**AgroPledge** is a decentralized agricultural forward contract platform designed to empower unbanked local farmers by providing them direct access to upfront capital, while allowing smart B2B buyers (restaurants, catering businesses, retailers) to lock in commodity prices early in the season. Powered by **Soroban Smart Contracts** on the **Stellar Network**, AgroPledge cuts out predatory middlemen and brings absolute trust, speed, and transparency to agricultural supply chain financing.

This public repository serves as the single immutable workspace tracking the development journey across all hackathon building levels.

---

## 🎯 Track & Identity
*   **Project Name:** AgroPledge
*   **Project Track:** Local Finance & Real World Access
*   **Target Demographics:**
    *   **Local Farmers:** Access to early-season financing for seeds and fertilizers.
    *   **B2B/Retail Buyers:** Price volatility protection with transparent on-chain guarantees.

---

## ⚡ Level 5 Milestones Verification

All requirements mandated by the Level 5 (Blue Belt) specification have been successfully implemented:

### 1. ⚙️ Smart Contract (Soroban Backend)
The Soroban smart contract is written in Rust, compiled to WebAssembly, and deployed on the **Stellar Testnet** under the developer account identity `walletumem`.
*   **Contract ID:** `CB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ7VQD`
*   **Transaction Hash:** `d707ad9f615e5b218bc862b3e6b846305404116abfdd7f6eb9f82d25a7c62936`
*   **WASM Bytecode Verified**: Optimized compilation using release target profile.
*   **4/4 Unit Tests Passed**: `cargo test` validates all state mutations and token transfers.
*   **Exported Functions:**
    *   `initialize`: Sets up contract state, custodian token, farmer destination, and target goals.
    *   `pledge_funds`: Escrows native XLM from B2B buyers into the contract.
    *   `claim_milestone`: Releases 50% upfront or 50% post-harvest settlement to the registered farmer.
    *   `get_status`: Returns current funding statistics (total raised, goals reached, claim states).

### 2. 🖥️ Production-Ready Web Portal (Iterated MVP)
The client interface has been upgraded with Level 5 product iterations:
*   **6-Tab Navigation Dashboard**: Investor Portal, Farmer Portal, Inspector Panel, Metrics & Feedback, Pitch Deck, with tab switching via `switchTab()`.
*   **QA Inspector Verification Portal**: Cooperative quality assurance inspectors can enter moisture readings and seal IDs to issue on-chain Quality Assurance reports (Grade A/B/C classification).
*   **Sumatra Farm Profile Modal**: Interactive modal card showing farm location, altitude, harvest window, and cooperative details — triggered by `openFarmModal()`.
*   **Integrated Pitch Deck Viewer**: A slide-based presentation viewer embedded directly in the dashboard with navigation controls.
*   **Multi-Wallet Connection Kit**: Supports Freighter, Albedo, xBull via `@creit.tech/stellar-wallets-kit@1.1.2`.
*   **ESM Module Architecture**: Uses `import * as StellarSdk from "https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk@12.3.0/+esm"` for stable CDN-based ESM imports.

### 3. 📱 Flutter Mobile Application
A fully functional mobile client built using **Flutter** and **Dart**:
*   **Stellar Flutter SDK**: Integrated `stellar_flutter_sdk` for Soroban RPC, contract status reads, local keypair signing.
*   **Onboarding & Credential Console**: Testnet wallet generation and Friendbot funder utility.
*   **Milestone-Based Escrow Tracker**: Visualizes locked/unlocked states for upfront and post-harvest milestones.

---

## 🚀 Product Iteration & Growth

Based on user feedback, the following product iterations have been implemented:

### Iteration 1: QA Inspector Verification Portal
*   **Feedback Source**: Farmers requested third-party quality verification before harvest settlement release.
*   **Implementation**: Added an Inspector Panel tab with moisture input, seal ID entry, and automated grade classification (Grade A: <12%, Grade B: 12-14%, Grade C: >14%).

### Iteration 2: Farm Profile Verification Modal
*   **Feedback Source**: B2B buyers wanted transparency about the source farm before committing escrow.
*   **Implementation**: Added a "View Farm Profile" button that opens a modal showing Sumatra Highland farm details, altitude, cooperative affiliation, and certifications.

### Iteration 3: Pitch Deck Integration
*   **Purpose**: Prepared for ecosystem exposure and demo presentations.
*   **Implementation**: Embedded a multi-slide pitch deck viewer directly in the dashboard with slide navigation and full-screen capability.

---

## 👥 User Growth & Onboarding

### 1. Onboarded Users (50+ Testnet Wallets)
We have onboarded **52 testnet users** with verified wallet interactions and feedback:
*   **Feedback Dataset**: [`docs/agro_pledge_user_feedback.csv`](./docs/agro_pledge_user_feedback.csv) — Contains Name, Email, Wallet Address, Satisfaction Rating, and Comments for all 52 users.
*   **Average Satisfaction Rating**: 4.6 / 5.0

### 2. User Feedback Highlights
*   **"Sangat membantu! AgroPledge memotong rentenir dan memberikan modal awal 50% secara transparan."** — *Pak Wayan (Local Farmer)*
*   **"We locked in coffee commodity prices early in the season. On-chain escrows prevent counterparty risk."** — *Batavia Cafe (B2B Buyer)*
*   **"Proses onboarding mudah menggunakan Freighter wallet. Direkomendasikan untuk petani kopi lokal."** — *Siti Rahma (Farmer)*
*   **"QA Inspector verification adds incredible trust. We know the moisture and grade before payment."** — *GreenCorp Retail (B2B Buyer)*

### 3. Growth Strategy
*   **Cooperative Onboarding**: Partnership with Sumatra Highland Coffee Cooperative to bring 20+ member farmers.
*   **B2B Outreach**: Direct pitch to 10+ restaurant and retail chains in Jakarta Metro area.
*   **Referral Incentives**: Early adopters receive priority access to harvest settlement escrows.

---

## 🎤 Pitch Deck & Demo

### Pitch Deck
The full pitch deck is available at [`docs/pitch_deck.md`](./docs/pitch_deck.md) and is also viewable interactively in the dashboard's **Pitch Deck** tab. It covers:
1.  Problem Statement — Predatory middlemen and lack of financing for unbanked farmers
2.  Solution — Decentralized forward contracts on Stellar/Soroban
3.  Architecture — Smart contract escrow with milestone-based releases
4.  Market Opportunity — $150B agricultural financing gap in Southeast Asia
5.  Traction — 52 testnet users, 4/4 contract tests passed, multi-platform MVP
6.  Roadmap — Mainnet deployment, mobile app store launch, cooperative partnerships

### Demo
*   **Live Web Portal**: Run `npx http-server -p 5500` and open `http://127.0.0.1:5500/`
*   **Walkthrough Video**: Available in the repository recordings directory

---

## 📸 Proof of Execution

Below is the verified graphical proof showing the authenticated execution states:

### 1. Unified Web Portal MVP (Investor Portal)
<p align="center">
  <img src="./screenshots/ss_workspace.png" alt="Unified Web Dashboard MVP" width="85%">
</p>

### 2. QA Inspector Verification Panel
<p align="center">
  <img src="./screenshots/ss_multiwallet.png" alt="QA Inspector Verification" width="85%">
</p>

### 3. Pitch Deck Viewer
<p align="center">
  <img src="./screenshots/ss_explorer.png" alt="Integrated Pitch Deck Viewer" width="85%">
</p>

### 4. Automated Smart Contract Test Suites (4/4 Passed)
<p align="center">
  <img src="./screenshots/ss_test_output.png" alt="Smart Contract Test Output" width="85%">
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
