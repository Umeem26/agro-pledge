#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Symbol, Address, token};

// Advanced state tracking for pledge statistics & milestone payouts
#[contracttype]
#[derive(Clone, Debug)]
pub struct PledgeState {
    pub target_amount: i128,
    pub total_raised: i128,
    pub farmer: Address,
    pub token: Address,
    pub upfront_claimed: bool,
    pub harvest_claimed: bool,
}

// Storage keys
const STATE: Symbol = symbol_short!("STATE");

// Events
const PLEDGE_EVENT: Symbol = symbol_short!("pledged");
const CLAIM_EVENT: Symbol = symbol_short!("claimed");

#[contract]
pub struct AgroPledgeContract;

#[contractimpl]
impl AgroPledgeContract {
    // 1. Initialize forward contract with token custodian and target goals
    pub fn initialize(env: Env, token: Address, farmer: Address, target: i128) {
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
        };
        env.storage().instance().set(&STATE, &state);
    }

    // 2. Pledge funds (Inter-contract token transfer from investor to contract escrow)
    pub fn pledge_funds(env: Env, investor: Address, amount: i128) -> i128 {
        investor.require_auth();

        let mut state: PledgeState = env.storage().instance().get(&STATE).expect("Contract not initialized.");
        
        // INTER-CONTRACT TRANSFER: Pull tokens from investor to this contract escrow
        let token_client = token::Client::new(&env, &state.token);
        token_client.transfer(&investor, &env.current_contract_address(), &amount);

        // Update total raised
        state.total_raised += amount;
        env.storage().instance().set(&STATE, &state);

        // Emit on-chain event
        env.events().publish((PLEDGE_EVENT, investor), amount);

        state.total_raised
    }

    // 3. Claim milestone payouts (Inter-contract token transfer from escrow to farmer)
    pub fn claim_milestone(env: Env, farmer: Address, milestone: Symbol) -> i128 {
        farmer.require_auth();

        let mut state: PledgeState = env.storage().instance().get(&STATE).expect("Contract not initialized.");
        
        // Assert caller is the registered farmer
        if farmer != state.farmer {
            panic!("Only the registered farmer can claim milestone disbursements!");
        }

        // Must raise at least some funds to make a claim
        if state.total_raised == 0 {
            panic!("Cannot claim milestone disbursement: no funds raised yet!");
        }

        // Calculate milestone payout (50% split)
        let payout = state.total_raised * 50 / 100;
        if payout <= 0 {
            panic!("Calculated payout is too low.");
        }

        // Verify milestone type and claim status
        if milestone == symbol_short!("upfront") {
            if state.upfront_claimed {
                panic!("Upfront milestone disbursement has already been claimed!");
            }
            state.upfront_claimed = true;
        } else if milestone == symbol_short!("harvest") {
            if !state.upfront_claimed {
                panic!("Cannot claim harvest milestone before upfront milestone is claimed!");
            }
            if state.harvest_claimed {
                panic!("Harvest milestone disbursement has already been claimed!");
            }
            state.harvest_claimed = true;
        } else {
            panic!("Invalid milestone type. Use symbol 'upfront' or 'harvest'.");
        }

        // Save state updates
        env.storage().instance().set(&STATE, &state);

        // INTER-CONTRACT TRANSFER: Transfer payout from this contract escrow to the farmer
        let token_client = token::Client::new(&env, &state.token);
        token_client.transfer(&env.current_contract_address(), &farmer, &payout);

        // Emit claim event
        env.events().publish((CLAIM_EVENT, farmer), payout);

        payout
    }

    // 4. Get contract status (read-only)
    pub fn get_status(env: Env) -> PledgeState {
        env.storage().instance().get(&STATE).expect("Contract not initialized.")
    }
}

#[cfg(test)]
mod test;