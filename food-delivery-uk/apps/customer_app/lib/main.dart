import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'cart.dart';
import 'services/api.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.loadToken();
  runApp(
    ChangeNotifierProvider(create: (_) => Cart(), child: const QuickBiteApp()),
  );
}

class QuickBiteApp extends StatelessWidget {
  const QuickBiteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickBite UK',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFE23744)),
        useMaterial3: true,
      ),
      home: Api.isLoggedIn ? const HomeScreen() : const AuthScreen(),
    );
  }
}
