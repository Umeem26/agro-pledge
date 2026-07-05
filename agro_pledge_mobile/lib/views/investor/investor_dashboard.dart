import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../services/stellar_service.dart';

class InvestorDashboard extends StatefulWidget {
  final StellarService stellarService;
  final String secretKey;
  final String publicKey;
  final VoidRefBack onExit;

  const InvestorDashboard({
    Key? key,
    required this.stellarService,
    required this.secretKey,
    required this.publicKey,
    required this.onExit,
  }) : super(key: key);

  @override
  _InvestorDashboardState createState() => _InvestorDashboardState();
}

// Custom callback helper
typedef VoidRefBack = void Function();

class _InvestorDashboardState extends State<InvestorDashboard> {
  double _balance = 0.0;
  int _raised = 1850;
  int _target = 5000;
  bool _isLoading = false;
  bool _isPledging = false;
  final TextEditingController _amountController = TextEditingController();
  
  String _statusState = "READY"; // READY, PENDING, SUCCESS, FAILED
  String _statusMsg = "Connect successful. Ready to pledge funds.";
  String _txHash = "";

  @override
  void initState() {
    super.initState();
    _refreshDashboard();
    // Connect to stellar service updates
    widget.stellarService.eventStream.listen((event) {
      if (mounted) {
        setState(() {
          _raised = event["status"] == "SUCCESS" ? _raised + (event["amount"] as int) : _raised;
        });
      }
    });
  }

  Future<void> _refreshDashboard() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final balance = await widget.stellarService.getXlmBalance(widget.publicKey);
      final contractState = await widget.stellarService.getContractStatus();
      
      if (mounted) {
        setState(() {
          _balance = balance;
          _raised = contractState.totalRaised;
          _target = contractState.targetAmount;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _submitPledge() async {
    final amountText = _amountController.text.trim();
    if (amountText.isEmpty) return;

    final amount = int.tryParse(amountText);
    if (amount == null || amount <= 0) {
      setState(() {
        _statusState = "FAILED";
        _statusMsg = "Please enter a valid investment amount.";
      });
      return;
    }

    setState(() {
      _isPledging = true;
      _statusState = "PENDING";
      _statusMsg = "Constructing Soroban invocation transaction...";
    });

    try {
      final result = await widget.stellarService.executePledge(widget.secretKey, amount);
      if (mounted) {
        setState(() {
          _isPledging = false;
          _amountController.clear();
          if (result["success"]) {
            _statusState = "SUCCESS";
            _statusMsg = result["message"];
            _txHash = result["hash"];
            _raised = result["raised"];
          } else {
            _statusState = "FAILED";
            _statusMsg = result["message"];
          }
        });
        _refreshDashboard();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isPledging = false;
          _statusState = "FAILED";
          _statusMsg = "Error: $e";
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final percent = (_raised / _target).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          "Buyer Portal",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.exit_to_app, color: AppColors.dangerRed),
            onPressed: widget.onExit,
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshDashboard,
        color: AppColors.accentGreen,
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 650),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
              // 1. Account Info Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: AppStyles.glassCard,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Account ID",
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "${widget.publicKey.substring(0, 8)}...${widget.publicKey.substring(widget.publicKey.length - 8)}",
                            style: const TextStyle(
                              fontSize: 13,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          "XLM Balance",
                          style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "${_balance.toStringAsFixed(2)} XLM",
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.accentGreen,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 2. Soroban Smart Contract Overview Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AppStyles.solidCard,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "🚜 Project: Tani Mandiri Jaya",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.accentGreen.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                          ),
                          child: const Text(
                            "ACTIVE",
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppColors.accentGreen,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      "Contract ID: CB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ7VQD",
                      style: TextStyle(fontSize: 10, fontFamily: 'monospace', color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 20),
                    
                    // Raised Goal Text
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Fund Raised: $_raised XLM",
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          "Target: $_target XLM",
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Progress Bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: percent,
                        minHeight: 12,
                        backgroundColor: Colors.white12,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentGreen),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "${(percent * 100).toStringAsFixed(1)}% funded by retail/B2B buyers",
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                    
                    const Divider(color: Colors.white12, height: 32),
                    
                    // Escrow Split info
                    const Text(
                      "Milestone Escrow Policy (Soroban):",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.accentGold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildMilestoneRow("🌱 Upfront Capital (50%)", "Automatically unlocked on funding milestones to buy seed & fertilizer.", true),
                    const SizedBox(height: 6),
                    _buildMilestoneRow("🌾 Harvest Delivery (50%)", "Released upon grain receipt delivery validation.", false),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 3. Investment Action Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AppStyles.glassCard,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      "Commit Funds to Escrow",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _amountController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: "Enter amount (e.g. 50)",
                              hintStyle: const TextStyle(color: Colors.white30),
                              filled: true,
                              fillColor: Colors.black.withOpacity(0.3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: Colors.white10),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(color: AppColors.accentGreen),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: _isPledging ? null : _submitPledge,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accentGreen,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: _isPledging
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                                )
                              : const Text("Pledge", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    
                    // Transaction Status Message
                    if (_statusMsg.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _getStatusBgColor(),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: _getStatusBorderColor()),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Status: $_statusState",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: _getStatusTextColor(),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _statusMsg,
                              style: const TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                            if (_txHash.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                "Hash: $_txHash",
                                style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Colors.white30),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 4. Live Event Feed Console
              const Text(
                "📡 Live Ledger events:",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                height: 160,
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: StreamBuilder<Map<String, dynamic>>(
                  stream: widget.stellarService.eventStream,
                  builder: (context, snapshot) {
                    final events = widget.stellarService.events;
                    if (events.isEmpty) {
                      return const Center(
                        child: Text("Listening for contract events...", style: TextStyle(color: Colors.white24, fontSize: 12)),
                      );
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: events.length,
                      itemBuilder: (context, index) {
                        final e = events[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6.0),
                          child: Text(
                            "[${e['time']}] 🎉 ${e['investor']} pledged ${e['amount']} XLM to escrow! Status: ${e['status']}",
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: AppColors.accentGreen,
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  ),
);
  }

  Widget _buildMilestoneRow(String title, String desc, bool isUnlocked) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          isUnlocked ? Icons.check_circle : Icons.lock,
          size: 16,
          color: isUnlocked ? AppColors.accentGreen : AppColors.textSecondary,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Color _getStatusBgColor() {
    switch (_statusState) {
      case "PENDING": return const Color(0xFF2A2307);
      case "SUCCESS": return const Color(0xFF072A07);
      case "FAILED": return const Color(0xFF2A0707);
      default: return Colors.transparent;
    }
  }

  Color _getStatusBorderColor() {
    switch (_statusState) {
      case "PENDING": return const Color(0xFF665200);
      case "SUCCESS": return const Color(0xFF006600);
      case "FAILED": return const Color(0xFF660000);
      default: return Colors.transparent;
    }
  }

  Color _getStatusTextColor() {
    switch (_statusState) {
      case "PENDING": return AppColors.accentGold;
      case "SUCCESS": return AppColors.accentGreen;
      case "FAILED": return AppColors.dangerRed;
      default: return Colors.white;
    }
  }
}
