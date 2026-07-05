import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF090D09);
  static const Color cardBg = Color(0xFF131A13);
  static const Color accentGreen = Color(0xFF00E676);
  static const Color mintGreen = Color(0xFF05C46B);
  static const Color accentGold = Color(0xFFFFA500);
  static const Color dangerRed = Color(0xFFFF3333);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFAAAAAA);
  static const Color border = Color(0xFF223322);
}

class AppStyles {
  static BoxDecoration glassCard = BoxDecoration(
    color: Colors.white.withOpacity(0.04),
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: Colors.white.withOpacity(0.08), width: 1.0),
  );

  static BoxDecoration solidCard = BoxDecoration(
    color: AppColors.cardBg,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: AppColors.border, width: 1.0),
  );
}
