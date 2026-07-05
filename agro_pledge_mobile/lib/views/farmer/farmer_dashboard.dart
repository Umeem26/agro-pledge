import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../services/stellar_service.dart';

class FarmerDashboard extends StatefulWidget {
  final StellarService stellarService;
  final String secretKey;
  final String publicKey;
  final VoidCallback onExit;

  const FarmerDashboard({
    Key? key,
    required this.stellarService,
    required this.secretKey,
    required this.publicKey,
    required this.onExit,
  }) : super(key: key);

  @override
  _FarmerDashboardState createState() => _FarmerDashboardState();
}

class _FarmerDashboardState extends State<FarmerDashboard> {
  double _balance = 0.0;
  int _raised = 1850;
  int _target = 5000;
  bool _isLoading = false;
  
  bool _isClaimingUpfront = false;
  bool _isClaimingHarvest = false;
  
  bool _upfrontClaimed = false;
  bool _harvestClaimed = false;

  String _statusState = "READY";
  String _statusMsg = "Farmer account successfully loaded. Milestones monitored.";
  String _txHash = "";

  @override
  void initState() {
    super.initState();
    _refreshDashboard();
    // Connect to stellar service updates
    widget.stellarService.eventStream.listen((event) {
      if (mounted) {
        setState(() {
          if (event["status"] == "SUCCESS") {
            _raised += event["amount"] as int;
          }
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

  Future<void> _claimMilestoneFunds(String type) async {
    setState(() {
      if (type == "Upfront") {
        _isClaimingUpfront = true;
      } else {
        _isClaimingHarvest = true;
      }
      _statusState = "PENDING";
      _statusMsg = "Signing Soroban claim request for $type Milestone...";
    });

    try {
      final result = await widget.stellarService.claimMilestone(widget.secretKey, type);
      if (mounted) {
        setState(() {
          _isClaimingUpfront = false;
          _isClaimingHarvest = false;
          
          if (result["success"]) {
            _statusState = "SUCCESS";
            _statusMsg = result["message"];
            _txHash = result["hash"];
            if (type == "Upfront") {
              _upfrontClaimed = true;
            } else {
              _harvestClaimed = true;
            }
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
          _isClaimingUpfront = false;
          _isClaimingHarvest = false;
          _statusState = "FAILED";
          _statusMsg = "Error invoking contract claim: $e";
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final percent = (_raised / _target).clamp(0.0, 1.0);
    final upfrontAmount = (_raised * 0.5).toInt();
    final harvestAmount = (_raised * 0.5).toInt();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          "Farmer Portal",
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
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Account details header
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
                            "Farmer Account",
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
                          "Total Balance",
                          style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "${_balance.toStringAsFixed(2)} XLM",
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.accentGold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 2. Escrow status summary
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AppStyles.solidCard,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "🌾 Soroban Escrow Funding Progress",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      "Contract ID: CB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2QRJ7VQD",
                      style: TextStyle(fontSize: 10, fontFamily: 'monospace', color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Raised: $_raised XLM",
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          "Goal: $_target XLM",
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: percent,
                        minHeight: 12,
                        backgroundColor: Colors.white12,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentGold),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "${(percent * 100).toStringAsFixed(1)}% of forward contract goal reached",
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 3. Milestone Disbursement Section
              const Text(
                "💸 Claim Milestone Disbursements",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 10),

              // Upfront working capital (50%)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: AppStyles.glassCard,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "🌱 Upfront Work Capital (50%)",
                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Text(
                          "$upfrontAmount XLM",
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.accentGreen,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "Disbursed automatically at the start of the season for seeds, fertilizers, and tools. Claimable instantly upon deposit.",
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: (_upfrontClaimed || _isClaimingUpfront || _raised <= 0)
                          ? null
                          : () => _claimMilestoneFunds("Upfront"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGreen,
                        foregroundColor: Colors.black,
                        disabledBackgroundColor: Colors.white10,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: _isClaimingUpfront
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                            )
                          : Text(
                              _upfrontClaimed ? "DISBURSED ✓" : "Claim Upfront Funds ($upfrontAmount XLM)",
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Harvest Balance (50%)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: AppStyles.glassCard,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "🌾 Post-Harvest Settlement (50%)",
                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Text(
                          "$harvestAmount XLM",
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.accentGold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "Released after crop harvest validation and commodity delivery confirmation to the retail buyers.",
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: (_harvestClaimed || _isClaimingHarvest || _raised <= 0)
                          ? null
                          : () => _claimMilestoneFunds("Harvest"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGold,
                        foregroundColor: Colors.black,
                        disabledBackgroundColor: Colors.white10,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: _isClaimingHarvest
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                            )
                          : Text(
                              _harvestClaimed ? "SETTLED ✓" : "Claim Harvest Balance ($harvestAmount XLM)",
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Transaction feedback console
              if (_statusMsg.isNotEmpty) ...[
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
                        "Console Status: $_statusState",
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
                          "Tx Hash: $_txHash",
                          style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Colors.white30),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // 4. Live Event Logs Console
              const Text(
                "📡 Local Activity event log:",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                height: 140,
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
                        child: Text("Listening for activities...", style: TextStyle(color: Colors.white24, fontSize: 12)),
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
                            "[${e['time']}] Activity: ${e['investor']} -> status: ${e['status']}",
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: AppColors.accentGold,
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
