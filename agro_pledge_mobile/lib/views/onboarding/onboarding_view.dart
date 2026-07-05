import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../services/stellar_service.dart';

class OnboardingView extends StatefulWidget {
  final StellarService stellarService;
  final Function(String role, String secretKey, String publicKey) onSetupCompleted;

  const OnboardingView({
    Key? key,
    required this.stellarService,
    required this.onSetupCompleted,
  }) : super(key: key);

  @override
  _OnboardingViewState createState() => _OnboardingViewState();
}

class _OnboardingViewState extends State<OnboardingView> {
  String _selectedRole = "Investor";
  String _secretKey = "";
  String _publicKey = "";
  bool _isLoading = false;
  String _statusMsg = "";

  // Pre-configured Testnet Credentials for quick developer testing
  final String _defaultInvestorSecret = "SA345O64SM3M2F6564BEEZDRIP3RFLB7Z7KGLHUTT5FMXH3SLOQJSMMA";
  final String _defaultInvestorPublic = "GARE2PMRCYD4WNDBPEA3D3QRL2Y4O4SL6SB7LOHU4FTMXH3SLOQJSMMA";
  
  final String _defaultFarmerSecret = "SB555O64SM3M2F6564BEEZDRIP3RFLB7Z7KGLHUTT5FMXH3SLOQJSMMA";
  final String _defaultFarmerPublic = "GB27QCPMKZ5ISKXNRR52CHNB5C6SE7L6X4JXY6DUZP4WNWB2Q";

  @override
  void initState() {
    super.initState();
    // Default config values
    _secretKey = _defaultInvestorSecret;
    _publicKey = _defaultInvestorPublic;
  }

  void _updateRole(String role) {
    setState(() {
      _selectedRole = role;
      if (role == "Investor") {
        _secretKey = _defaultInvestorSecret;
        _publicKey = _defaultInvestorPublic;
      } else {
        _secretKey = _defaultFarmerSecret;
        _publicKey = _defaultFarmerPublic;
      }
    });
  }

  Future<void> _generateNewWallet() async {
    setState(() {
      _isLoading = true;
      _statusMsg = "Generating cryptographic keypair on Stellar...";
    });

    try {
      final credentials = widget.stellarService.generateKeyPair();
      setState(() {
        _publicKey = credentials["publicKey"]!;
        _secretKey = credentials["secretKey"]!;
        _statusMsg = "Funding wallet with 10,000 Testnet XLM via Friendbot...";
      });

      // Request testnet tokens
      final success = await widget.stellarService.fundWithFriendbot(_publicKey);
      
      setState(() {
        _isLoading = false;
        _statusMsg = success 
            ? "Wallet funded successfully!" 
            : "Friendbot rate-limited. Using client fallback balance.";
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _statusMsg = "Error: $e";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // seedling 🌱 logo
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.mintGreen.withOpacity(0.1),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.mintGreen.withOpacity(0.2), width: 2),
                  ),
                  child: const Text(
                    "🌱",
                    style: TextStyle(fontSize: 48),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  "AgroPledge",
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Decentralized Agricultural Forward Contracts",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 40),
                
                // Card for Selection
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: AppStyles.glassCard,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        "1. Choose Your Portal Role",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.accentGreen,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildRoleButton(
                              title: "Investor / Buyer",
                              icon: Icons.trending_up,
                              role: "Investor",
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildRoleButton(
                              title: "Local Farmer",
                              icon: Icons.agriculture,
                              role: "Farmer",
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        "2. Configure Developer Wallet",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.accentGreen,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "Stellar Public Address:",
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Text(
                          _publicKey.isEmpty ? "None Generated" : "${_publicKey.substring(0, 8)}...${_publicKey.substring(_publicKey.length - 8)}",
                          style: const TextStyle(
                            fontSize: 13,
                            fontFamily: 'monospace',
                            color: Colors.white70,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextButton.icon(
                              onPressed: _isLoading ? null : _generateNewWallet,
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text("Generate New Key"),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.accentGold,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextButton(
                              onPressed: _isLoading ? null : () {
                                _updateRole(_selectedRole);
                                setState(() {
                                  _statusMsg = "Restored default developer keys.";
                                });
                              },
                              child: const Text("Use Default Keys"),
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.white70,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_statusMsg.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          _statusMsg,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            color: _statusMsg.contains("error") ? AppColors.dangerRed : AppColors.accentGold,
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _isLoading 
                            ? null 
                            : () => widget.onSetupCompleted(_selectedRole, _secretKey, _publicKey),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accentGreen,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          "Enter ${_selectedRole} Dashboard",
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleButton({
    required String title,
    required IconData icon,
    required String role,
  }) {
    final isSelected = _selectedRole == role;
    return GestureDetector(
      onTap: () => _updateRole(role),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppColors.mintGreen.withOpacity(0.1) 
              : Colors.white.withOpacity(0.02),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected 
                ? AppColors.accentGreen 
                : Colors.white.withOpacity(0.05),
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 28,
              color: isSelected ? AppColors.accentGreen : AppColors.textSecondary,
            ),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
