import 'dart:async';
import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api.dart';
import 'auth_screen.dart';
import 'delivery_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _me;
  List<dynamic> _available = [];
  List<dynamic> _mine = [];
  Map<String, dynamic>? _earnings;
  Timer? _timer;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final me = await Api.get('/api/drivers/me');
      final mine = await Api.get('/api/orders/mine');
      final earnings = await Api.get('/api/drivers/me/earnings');
      List<dynamic> available = [];
      if (me['is_approved'] == true && me['is_online'] == true) {
        available = await Api.get('/api/orders/available');
      }
      if (!mounted) return;
      setState(() {
        _me = me;
        _mine = mine;
        _available = available;
        _earnings = earnings;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _toggleOnline(bool value) async {
    await Api.patch('/api/drivers/me', {'is_online': value});
    _load();
  }

  Future<void> _claim(int orderId) async {
    try {
      await Api.post('/api/orders/$orderId/claim');
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = _me;
    final active = _mine
        .where((o) => !['delivered', 'rejected', 'cancelled'].contains(o['status']))
        .toList();
    return Scaffold(
      appBar: AppBar(
        title: const Text('QuickBite Driver'),
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
      body: me == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Text(_error!))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  if (me['is_approved'] != true)
                    const Card(
                      color: Color(0xFFFFF3E0),
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text(
                            'Your account is awaiting admin approval. You will be able to go online once approved.'),
                      ),
                    )
                  else
                    SwitchListTile(
                      title: Text(me['is_online'] == true
                          ? 'You are ONLINE'
                          : 'You are offline'),
                      subtitle: const Text('Go online to see available deliveries'),
                      value: me['is_online'] == true,
                      onChanged: _toggleOnline,
                    ),
                  if (_earnings != null)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.payments),
                        title: Text(
                            'Earnings: ${formatGBP(_earnings!['earnings_pence'])}'),
                        subtitle: Text(
                            '${_earnings!['delivered_count']} deliveries completed'),
                      ),
                    ),
                  if (active.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text('My active deliveries',
                          style: Theme.of(context).textTheme.titleMedium),
                    ),
                    for (final o in active)
                      Card(
                        child: ListTile(
                          title: Text(
                              '#${o['id']} ${o['restaurant_name']} → ${o['delivery_postcode']}'),
                          subtitle: Text('Status: ${o['status']}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () async {
                            await Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        DeliveryScreen(orderId: o['id'])));
                            _load();
                          },
                        ),
                      ),
                  ],
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text('Available deliveries',
                        style: Theme.of(context).textTheme.titleMedium),
                  ),
                  if (_available.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(8),
                      child: Text('No deliveries available right now.'),
                    ),
                  for (final o in _available)
                    Card(
                      child: ListTile(
                        title: Text(
                            '#${o['id']} ${o['restaurant_name']} (${o['restaurant_postcode']})'),
                        subtitle: Text(
                            'Deliver to ${o['delivery_postcode']} · order ${formatGBP(o['total_pence'])}'),
                        trailing: FilledButton(
                          onPressed: () => _claim(o['id']),
                          child: const Text('Claim'),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}
