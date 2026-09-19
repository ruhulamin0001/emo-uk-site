import 'package:flutter/material.dart';
import 'services/api.dart';
import 'screens/auth_screen.dart';
import 'screens/dashboard_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.loadToken();
  runApp(const QuickBiteRestaurantApp());
}

class QuickBiteRestaurantApp extends StatelessWidget {
  const QuickBiteRestaurantApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickBite Restaurant',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2E7D32)),
        useMaterial3: true,
      ),
      home: Api.isLoggedIn ? const DashboardScreen() : const AuthScreen(),
    );
  }
}
