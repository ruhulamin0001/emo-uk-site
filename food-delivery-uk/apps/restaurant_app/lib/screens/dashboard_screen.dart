import 'package:flutter/material.dart';
import '../services/api.dart';
import 'auth_screen.dart';
import 'create_restaurant_screen.dart';
import 'menu_screen.dart';
import 'orders_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _restaurant;
  bool _loading = true;
  bool _needsSetup = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Api.get('/api/restaurants/mine');
      setState(() {
        _restaurant = data;
        _needsSetup = false;
      });
    } on ApiException catch (e) {
      if (e.message.contains('create one first') || e.message.contains('No restaurant')) {
        setState(() => _needsSetup = true);
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleOpen(bool open) async {
    await Api.patch('/api/restaurants/mine', {'is_open': open});
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_needsSetup) {
      return CreateRestaurantScreen(onCreated: _load);
    }
    final r = _restaurant;
    if (r == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Could not load your restaurant.'),
              TextButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(r['name']),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await Api.logout();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const AuthScreen()),
                  (_) => false);
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (r['is_approved'] != true)
            const Card(
              color: Color(0xFFFFF3E0),
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                    'Your restaurant is awaiting admin approval. It will appear to customers once approved.'),
              ),
            )
          else
            SwitchListTile(
              title: Text(r['is_open'] == true
                  ? 'OPEN — accepting orders'
                  : 'CLOSED'),
              value: r['is_open'] == true,
              onChanged: _toggleOpen,
            ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.receipt_long),
              title: const Text('Orders'),
              subtitle: const Text('Accept, prepare and hand over orders'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const OrdersScreen())),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.menu_book),
              title: const Text('Menu'),
              subtitle: Text('${(r['menu'] as List?)?.length ?? 0} items'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                await Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const MenuScreen()));
                _load();
              },
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.location_on),
              title: Text('${r['address_line1']}, ${r['city']}'),
              subtitle: Text(r['postcode']),
            ),
          ),
        ],
      ),
    );
  }
}
