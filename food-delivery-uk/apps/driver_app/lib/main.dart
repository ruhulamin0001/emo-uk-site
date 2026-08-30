import 'package:flutter/material.dart';
import 'services/api.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.loadToken();
  runApp(const QuickBiteDriverApp());
}

class QuickBiteDriverApp extends StatelessWidget {
  const QuickBiteDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickBite Driver',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1565C0)),
        useMaterial3: true,
      ),
      home: Api.isLoggedIn ? const HomeScreen() : const AuthScreen(),
    );
  }
}
