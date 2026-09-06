import 'dart:async';
import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api.dart';

// status -> next actions for the restaurant
const nextActions = {
  'pending': [
    ['accepted', 'Accept'],
    ['rejected', 'Reject'],
  ],
  'accepted': [
    ['preparing', 'Start preparing'],
  ],
  'preparing': [
    ['ready_for_pickup', 'Ready for pickup'],
  ],
};

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<dynamic> _orders = [];
  bool _loading = true;
  Timer? _timer;

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
      final data = await Api.get('/api/orders/mine');
      if (mounted) {
        setState(() {
          _orders = data;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setStatus(int orderId, String status) async {
    try {
      await Api.patch('/api/orders/$orderId/status', {'status': status});
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
    final live = _orders
        .where((o) => !['delivered', 'rejected', 'cancelled'].contains(o['status']))
        .toList();
    final past = _orders
        .where((o) => ['delivered', 'rejected', 'cancelled'].contains(o['status']))
        .toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  Text('Live orders (${live.length})',
                      style: Theme.of(context).textTheme.titleMedium),
                  if (live.isEmpty)
                    const Padding(
                        padding: EdgeInsets.all(8),
                        child: Text('No live orders right now.')),
                  for (final o in live) _orderCard(o, actions: true),
                  const SizedBox(height: 16),
                  Text('History', style: Theme.of(context).textTheme.titleMedium),
                  for (final o in past.take(20)) _orderCard(o, actions: false),
                ],
              ),
            ),
    );
  }

  Widget _orderCard(Map<String, dynamic> o, {required bool actions}) {
    final items = (o['items'] as List)
        .map((i) => '${i['qty']}× ${i['name']}')
        .join(', ');
    final buttons = nextActions[o['status']] ?? [];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('#${o['id']} · ${o['customer_name'] ?? 'Customer'}',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(formatGBP(o['total_pence'])),
              ],
            ),
            const SizedBox(height: 4),
            Text(items),
            if (o['notes'] != null && (o['notes'] as String).isNotEmpty)
              Text('Note: ${o['notes']}',
                  style: const TextStyle(fontStyle: FontStyle.italic)),
            Text('Deliver to: ${o['delivery_postcode']} · Status: ${o['status']}'),
            if (actions && buttons.isNotEmpty)
              Row(
                children: [
                  for (final b in buttons)
                    Padding(
                      padding: const EdgeInsets.only(right: 8, top: 8),
                      child: b[0] == 'rejected'
                          ? OutlinedButton(
                              onPressed: () => _setStatus(o['id'], b[0]),
                              child: Text(b[1]))
                          : FilledButton(
                              onPressed: () => _setStatus(o['id'], b[0]),
                              child: Text(b[1])),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
