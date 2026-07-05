#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Symbol, Address};

// Struktur data untuk menyimpan status pendanaan AgroPledge
#[contracttype]
#[derive(Clone, Debug)]
pub struct PledgeState {
    pub target_amount: i128,
    pub total_raised: i128,
    pub farmer: Address,
}

// Storage keys
const STATE: Symbol = symbol_short!("STATE");

// Nama Event untuk sinkronisasi real-time frontend
const PLEDGE_EVENT: Symbol = symbol_short!("pledged");

#[contract]
pub struct AgroPledgeContract;

#[contractimpl]
impl AgroPledgeContract {
    // 1. Inisialisasi Proyek Tani (Menentukan Target Modal & Alamat Petani)
    pub fn initialize(env: Env, farmer: Address, target: i128) {
        if env.storage().instance().has(&STATE) {
            panic!("Proyek sudah di-inisialisasi!");
        }
        
        let state = PledgeState {
            target_amount: target,
            total_raised: 0,
            farmer,
        };
        env.storage().instance().set(&STATE, &state);
    }

    // 2. Fungsi Setor Modal (Write Data + Trigger Event)
    pub fn pledge_funds(env: Env, investor: Address, amount: i128) -> i128 {
        investor.require_auth(); // Memastikan tanda tangan dompet investor sah

        let mut state: PledgeState = env.storage().instance().get(&STATE).expect("Kontrak belum siap.");
        
        // Update saldo total modal yang terkumpul
        state.total_raised += amount;
        env.storage().instance().set(&STATE, &state);

        // Kunci Utama Level 2: Mengirim Event Real-Time ke Jaringan Stellar
        env.events().publish(
            (PLEDGE_EVENT, investor), 
            amount
        );

        return state.total_raised;
    }

    // 3. Fungsi Ambil Data Status Pendanaan (Read Data)
    pub fn get_status(env: Env) -> PledgeState {
        env.storage().instance().get(&STATE).expect("Kontrak tidak ditemukan.")
    }
}

#[cfg(test)]
mod test;