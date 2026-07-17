# 📚 Building Multi-Party Approval Escrow Contracts on Stellar Soroban

This tutorial is written as an ecosystem contribution to the Stellar Builder Challenge community. It provides a step-by-step guide to designing, testing, and integrating role-based smart contracts using **Soroban (Rust)**.

---

## 💡 Overview

In decentralized finance (DeFi) and real-world asset (RWA) financing, releasing escrow funds based on single-party signals is dangerous. Multi-party approvals (or multi-signature constraints) guarantee that funds are only released after a designated evaluator verifies delivery or quality of goods.

In this tutorial, we will construct a multi-party escrow contract:
- **Investor**: Escrows funds in the contract.
- **Farmer (Beneficiary)**: Can claim upfront capital and post-harvest payouts.
- **Inspector (Auditor)**: A third-party cooperative auditor who verifies harvest moisture and seals quality, signing on-chain before the final release.

---

## 🛠️ 1. Designing the Contract State

We represent the contract parameters in a `PledgeState` struct, storing the registered roles as `Address` types and tracking milestone completion:

```rust
#[contracttype]
#[derive(Clone, Debug)]
pub struct PledgeState {
    pub target_amount: i128,
    pub total_raised: i128,
    pub farmer: Address,
    pub token: Address,
    pub upfront_claimed: bool,
    pub harvest_claimed: bool,
    pub inspector: Address,
    pub harvest_approved: bool,
}
```

---

## 🔒 2. Enforcing Roles and Authorization Checks

In Soroban, cryptographic signatures are validated using the `Address.require_auth()` method. The contract environment validates signatures against the transaction payload.

### Campaign Initialization
Initialize parameters, designating both the farmer and auditor:

```rust
pub fn initialize(env: Env, token: Address, farmer: Address, inspector: Address, target: i128) {
    if env.storage().instance().has(&STATE) {
        panic!("Project already initialized!");
    }

    let state = PledgeState {
        target_amount: target,
        total_raised: 0,
        farmer,
        token,
        upfront_claimed: false,
        harvest_claimed: false,
        inspector,
        harvest_approved: false,
    };
    env.storage().instance().set(&STATE, &state);
}
```

### On-Chain Quality Audit Approval
Only the designated `inspector` address is permitted to approve crop moisture delivery. When called, the function verifies their signature and updates the escrow release state:

```rust
pub fn approve_harvest(env: Env, inspector: Address) {
    // Assert signature verification
    inspector.require_auth();

    let mut state: PledgeState = env.storage().instance().get(&STATE)
        .expect("Contract not initialized.");

    // Assert caller is the registered inspector
    if inspector != state.inspector {
        panic!("Only the registered inspector can approve harvest release!");
    }

    if state.harvest_approved {
        panic!("Harvest release has already been approved!");
    }

    state.harvest_approved = true;
    env.storage().instance().set(&STATE, &state);

    // Emit event on-chain
    env.events().publish((symbol_short!("approved"), inspector), 1);
}
```

### Milestone Disbursement Release
The farmer can request their payouts. The contract forces sequencing rules to guarantee that the farmer cannot claim the harvest settlement until the inspector's approval has been recorded:

```rust
pub fn claim_milestone(env: Env, farmer: Address, milestone: Symbol) -> i128 {
    farmer.require_auth();
    let mut state: PledgeState = env.storage().instance().get(&STATE)
        .expect("Contract not initialized.");

    if farmer != state.farmer {
        panic!("Only the registered farmer can claim milestone disbursements!");
    }

    let payout = state.total_raised * 50 / 100;

    if milestone == symbol_short!("upfront") {
        if state.upfront_claimed {
            panic!("Upfront milestone already claimed!");
        }
        state.upfront_claimed = true;
    } else if milestone == symbol_short!("harvest") {
        if !state.upfront_claimed {
            panic!("Upfront capital must be claimed first.");
        }
        // Force security check on inspector verification
        if !state.harvest_approved {
            panic!("Cannot claim harvest milestone before inspector approvals are recorded!");
        }
        if state.harvest_claimed {
            panic!("Harvest already claimed.");
        }
        state.harvest_claimed = true;
    }
    
    env.storage().instance().set(&STATE, &state);

    // Transfer token payout to farmer
    let token_client = token::Client::new(&env, &state.token);
    token_client.transfer(&env.current_contract_address(), &farmer, &payout);

    payout
}
```

---

## 🧪 3. Writing Unit Tests

Writing automated tests in Soroban is simplified using the mock test helper utilities. Here is how you can test that the contract reverts when a farmer attempts to claim the harvest prematurely:

```rust
#[test]
#[should_panic(expected = "Cannot claim harvest milestone before inspector approvals are recorded!")]
fn test_claim_harvest_without_approval_panics() {
    let env = Env::default();
    env.mock_all_auths(); // Mock authorization signatures automatically

    let contract_id = env.register(AgroPledgeContract, ());
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    let inspector = Address::generate(&env);
    let investor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_address = sac.address();
    let asset_client = token::StellarAssetClient::new(&env, &token_address);

    // Initialize campaign
    client.initialize(&token_address, &farmer, &inspector, &2000);
    asset_client.mint(&investor, &2000);
    client.pledge_funds(&investor, &1000);

    // Farmer claims upfront
    client.claim_milestone(&farmer, &symbol_short!("upfront"));

    // Attempting to claim harvest before inspector.approve_harvest() will revert!
    client.claim_milestone(&farmer, &symbol_short!("harvest"));
}
```

Run tests locally:
```bash
cargo test
```

---

## 💡 Key Lessons for Builders
1. **Never Trust Off-chain Audits blindly**: Storing inspector reports in local browser state allows users to easily manipulate client-side variables and bypass audit barriers. Move your security constraints *on-chain* into the contract code.
2. **Role isolation**: Keep your auditor and owner identities completely isolated. Enforce strict checks that roles cannot initialize themselves.
3. **Decouple functions**: Keeping QA verification and claims as separate contract execution transactions helps reduce transaction fees and simplifies transaction troubleshooting.
