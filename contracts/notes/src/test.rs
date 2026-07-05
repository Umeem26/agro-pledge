#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, testutils::Address as _};

#[test]
fn test_pledge_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AgroPledgeContract);
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    let investor = Address::generate(&env);

    // Initialize contract
    client.initialize(&farmer, &1000);

    // Check initial state
    let state = client.get_status();
    assert_eq!(state.target_amount, 1000);
    assert_eq!(state.total_raised, 0);
    assert_eq!(state.farmer, farmer);

    // First pledge
    let total = client.pledge_funds(&investor, &250);
    assert_eq!(total, 250);

    // Check updated state
    let state = client.get_status();
    assert_eq!(state.total_raised, 250);

    // Second pledge
    let total = client.pledge_funds(&investor, &350);
    assert_eq!(total, 600);
}

#[test]
#[should_panic(expected = "Proyek sudah di-inisialisasi!")]
fn test_double_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AgroPledgeContract);
    let client = AgroPledgeContractClient::new(&env, &contract_id);

    let farmer = Address::generate(&env);
    client.initialize(&farmer, &1000);
    client.initialize(&farmer, &500);
}
