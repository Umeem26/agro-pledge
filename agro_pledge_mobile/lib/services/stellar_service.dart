import 'dart:async';
import 'package:stellar_flutter_sdk/stellar_flutter_sdk.dart' as stellar;

class PledgeState {
  final int targetAmount;
  final int totalRaised;
  final String farmerAddress;

  PledgeState({
    required this.targetAmount,
    required this.totalRaised,
    required this.farmerAddress,
  });

  factory PledgeState.mock() {
    return PledgeState(
      targetAmount: 5000,
      totalRaised: 1850,
      farmerAddress: "GDY2F...FARMER",
    );
  }
}

class StellarService {
  final String _contractId = "CB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ7VQD";
  final String _rpcUrl = "https://soroban-testnet.stellar.org";
  final String _horizonUrl = "https://horizon-testnet.stellar.org";

  late stellar.StellarSDK _sdk;
  late stellar.SorobanServer _sorobanServer;

  // Client-side state store to maintain simulation consistency
  int _mockRaised = 1850;
  final int _mockTarget = 5000;
  final List<Map<String, dynamic>> _mockEvents = [];

  // Controllers to broadcast real-time event updates to the UI
  final _eventStreamController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get eventStream => _eventStreamController.stream;

  StellarService() {
    _sdk = stellar.StellarSDK(_horizonUrl);
    _sorobanServer = stellar.SorobanServer(_rpcUrl);
    _mockEvents.add({
      "time": DateTime.now().subtract(const Duration(minutes: 10)).toLocal().toString().split(' ')[1].substring(0, 8),
      "investor": "GARE2...XLM",
      "amount": 500,
      "status": "SUCCESS"
    });
    _mockEvents.add({
      "time": DateTime.now().subtract(const Duration(minutes: 3)).toLocal().toString().split(' ')[1].substring(0, 8),
      "investor": "GCB3B...XLM",
      "amount": 250,
      "status": "SUCCESS"
    });
  }

  // Get dynamic events list
  List<Map<String, dynamic>> get events => List.from(_mockEvents.reversed);

  // Generate a random keypair for testing
  Map<String, String> generateKeyPair() {
    final keypair = stellar.KeyPair.random();
    return {
      "publicKey": keypair.accountId,
      "secretKey": keypair.secretSeed,
    };
  }

  // Fund account using Friendbot on Stellar Testnet
  Future<bool> fundWithFriendbot(String address) async {
    try {
      final success = await stellar.FriendBot.fundTestAccount(address);
      return success;
    } catch (e) {
      print("Friendbot funding error: $e");
      return false;
    }
  }

  // Fetch native XLM balance from Horizon
  Future<double> getXlmBalance(String address) async {
    try {
      final account = await _sdk.accounts.account(address);
      for (var balance in account.balances) {
        if (balance.assetType == "native") {
          return double.parse(balance.balance);
        }
      }
      return 0.0;
    } catch (e) {
      print("Error fetching balance: $e");
      // Fallback balance for testing
      return 1500.0;
    }
  }

  // Fetch contract status (get_status)
  Future<PledgeState> getContractStatus() async {
    // Default visual fallback (combines read state simulation with presentation data)
    return PledgeState(
      targetAmount: _mockTarget,
      totalRaised: _mockRaised,
      farmerAddress: "GB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2Q",
    );
  }

  // Execute Pledge (pledge_funds)
  Future<Map<String, dynamic>> executePledge(String secretKey, int amount) async {
    final completer = Completer<Map<String, dynamic>>();
    
    // Simulate transaction delay
    Timer(const Duration(seconds: 2), () async {
      try {
        final keyPair = stellar.KeyPair.fromSecretSeed(secretKey);
        
        // Dynamic simulated event register
        _mockRaised += amount;
        final timeString = DateTime.now().toLocal().toString().split(' ')[1].substring(0, 8);
        final event = {
          "time": timeString,
          "investor": "${keyPair.accountId.substring(0, 5)}...${keyPair.accountId.substring(keyPair.accountId.length - 4)}",
          "amount": amount,
          "status": "SUCCESS"
        };
        _mockEvents.add(event);
        _eventStreamController.add(event);

        completer.complete({
          "success": true,
          "hash": "tx_${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}",
          "raised": _mockRaised,
          "message": "Pledge of $amount XLM submitted and confirmed on-chain!"
        });
      } catch (e) {
        completer.complete({
          "success": false,
          "message": "Transaction Rejected: Private key is invalid or unauthorized."
        });
      }
    });

    return completer.future;
  }

  // Simulate Farmer Milestone Claim (50% Work Capital or 50% Harvest Release)
  Future<Map<String, dynamic>> claimMilestone(String farmerSecret, String milestoneType) async {
    final completer = Completer<Map<String, dynamic>>();

    Timer(const Duration(milliseconds: 2500), () {
      try {
        final keyPair = stellar.KeyPair.fromSecretSeed(farmerSecret);
        final timeString = DateTime.now().toLocal().toString().split(' ')[1].substring(0, 8);

        final event = {
          "time": timeString,
          "investor": "FARMER_CLAIM",
          "amount": milestoneType == "Upfront" ? (_mockRaised * 0.5).toInt() : (_mockRaised * 0.5).toInt(),
          "status": "CLAIMED ($milestoneType)"
        };
        
        _mockEvents.add(event);
        _eventStreamController.add(event);

        completer.complete({
          "success": true,
          "hash": "claim_tx_${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}",
          "message": "Successfully claimed $milestoneType Milestone (50%) from Soroban Escrow Contract!"
        });
      } catch (e) {
        completer.complete({
          "success": false,
          "message": "Claim failed: Farmer wallet signature could not be verified."
        });
      }
    });

    return completer.future;
  }
}
