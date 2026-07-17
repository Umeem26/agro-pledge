#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, symbol_short, testutils::Address as _};

#[test]
fn test_initialization() {
    let env = Env::default();
    let contract_id = env.register(AgroPledgeContract, ());
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    let inspector = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&token, &farmer, &inspector, &5000);

    let state = client.get_status();
    assert_eq!(state.target_amount, 5000);
    assert_eq!(state.total_raised, 0);
    assert_eq!(state.farmer, farmer);
    assert_eq!(state.token, token);
    assert_eq!(state.inspector, inspector);
    assert_eq!(state.upfront_claimed, false);
    assert_eq!(state.harvest_claimed, false);
    assert_eq!(state.harvest_approved, false);
}

#[test]
fn test_pledge_token_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgroPledgeContract, ());
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    let inspector = Address::generate(&env);
    let investor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    // Register Stellar Asset Contract (SAC) in test environment
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_address = sac.address();
    
    let token_client = token::Client::new(&env, &token_address);
    let asset_client = token::StellarAssetClient::new(&env, &token_address);

    // Initialize our AgroPledge contract
    client.initialize(&token_address, &farmer, &inspector, &1000);

    // Mint tokens to investor using asset client
    asset_client.mint(&investor, &1000);
    assert_eq!(token_client.balance(&investor), 1000);

    // Pledge funds
    let total_raised = client.pledge_funds(&investor, &400);
    assert_eq!(total_raised, 400);

    // Check balances
    assert_eq!(token_client.balance(&investor), 600);
    assert_eq!(token_client.balance(&contract_id), 400);

    let state = client.get_status();
    assert_eq!(state.total_raised, 400);
}

#[test]
fn test_milestone_claims() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgroPledgeContract, ());
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    let inspector = Address::generate(&env);
    let investor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_address = sac.address();
    
    let token_client = token::Client::new(&env, &token_address);
    let asset_client = token::StellarAssetClient::new(&env, &token_address);

    // Initialize contract and fund investor
    client.initialize(&token_address, &farmer, &inspector, &2000);
    asset_client.mint(&investor, &2000);

    // Pledge 1000 tokens
    client.pledge_funds(&investor, &1000);
    assert_eq!(token_client.balance(&contract_id), 1000);
    assert_eq!(token_client.balance(&farmer), 0);

    // Claim Upfront milestone (50% of 1000 = 500)
    let upfront_payout = client.claim_milestone(&farmer, &symbol_short!("upfront"));
    assert_eq!(upfront_payout, 500);
    assert_eq!(token_client.balance(&farmer), 500);
    assert_eq!(token_client.balance(&contract_id), 500);

    let state = client.get_status();
    assert!(state.upfront_claimed);
    assert!(!state.harvest_claimed);
    assert!(!state.harvest_approved);

    // Inspector approves harvest on-chain
    client.approve_harvest(&inspector);

    let state = client.get_status();
    assert!(state.harvest_approved);

    // Claim Harvest milestone (remaining 50% = 500)
    let harvest_payout = client.claim_milestone(&farmer, &symbol_short!("harvest"));
    assert_eq!(harvest_payout, 500);
    assert_eq!(token_client.balance(&farmer), 1000);
    assert_eq!(token_client.balance(&contract_id), 0);

    let state = client.get_status();
    assert!(state.harvest_claimed);
}

#[test]
#[should_panic(expected = "Cannot claim harvest milestone before upfront milestone is claimed!")]
fn test_invalid_milestone_order_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgroPledgeContract, ());
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    let inspector = Address::generate(&env);
    let investor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_address = sac.address();
    let asset_client = token::StellarAssetClient::new(&env, &token_address);

    client.initialize(&token_address, &farmer, &inspector, &2000);
    asset_client.mint(&investor, &2000);
    client.pledge_funds(&investor, &1000);

    // Try claiming harvest before upfront. This should panic.
    client.claim_milestone(&farmer, &symbol_short!("harvest"));
}

#[test]
#[should_panic(expected = "Cannot claim harvest milestone before inspector approvals are recorded!")]
fn test_claim_harvest_without_approval_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgroPledgeContract, ());
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    let inspector = Address::generate(&env);
    let investor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_address = sac.address();
    let asset_client = token::StellarAssetClient::new(&env, &token_address);

    client.initialize(&token_address, &farmer, &inspector, &2000);
    asset_client.mint(&investor, &2000);
    client.pledge_funds(&investor, &1000);

    // Claim upfront
    client.claim_milestone(&farmer, &symbol_short!("upfront"));

    // Try claiming harvest without calling approve_harvest. This should panic.
    client.claim_milestone(&farmer, &symbol_short!("harvest"));
}
