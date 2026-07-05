import 'package:flutter/material.dart';
import 'theme/colors.dart';
import 'services/stellar_service.dart';
import 'views/onboarding/onboarding_view.dart';
import 'views/investor/investor_dashboard.dart';
import 'views/farmer/farmer_dashboard.dart';

void main() {
  runApp(const AgroPledgeApp());
}

class AgroPledgeApp extends StatelessWidget {
  const AgroPledgeApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgroPledge Portal',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: AppColors.background,
        primaryColor: AppColors.accentGreen,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
      ),
      home: const MainNavigationHandler(),
    );
  }
}

class MainNavigationHandler extends StatefulWidget {
  const MainNavigationHandler({Key? key}) : super(key: key);

  @override
  _MainNavigationHandlerState createState() => _MainNavigationHandlerState();
}

class _MainNavigationHandlerState extends State<MainNavigationHandler> {
  final StellarService _stellarService = StellarService();
  
  String? _role;
  String _secretKey = "";
  String _publicKey = "";

  void _handleSetupCompleted(String role, String secret, String public) {
    setState(() {
      _role = role;
      _secretKey = secret;
      _publicKey = public;
    });
  }

  void _handleExitDashboard() {
    setState(() {
      _role = null;
      _secretKey = "";
      _publicKey = "";
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_role == null) {
      return OnboardingView(
        stellarService: _stellarService,
        onSetupCompleted: _handleSetupCompleted,
      );
    } else if (_role == "Investor") {
      return InvestorDashboard(
        stellarService: _stellarService,
        secretKey: _secretKey,
        publicKey: _publicKey,
        onExit: _handleExitDashboard,
      );
    } else if (_role == "Farmer") {
      return FarmerDashboard(
        stellarService: _stellarService,
        secretKey: _secretKey,
        publicKey: _publicKey,
        onExit: _handleExitDashboard,
      );
    } else {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.accentGreen),
        ),
      );
    }
  }
}
