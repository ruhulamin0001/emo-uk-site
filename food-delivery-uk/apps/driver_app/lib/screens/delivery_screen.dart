import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api.dart';

class DeliveryScreen extends StatefulWidget {
  final int orderId;
  const DeliveryScreen({super.key, required this.orderId});
  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  Map<String, dynamic>? _order;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await Api.get('/api/orders/${widget.orderId}');
    if (mounted) setState(() => _order = data);
  }

  Future<void> _setStatus(String status) async {
    setState(() => _busy = true);
    try {
      await Api.patch('/api/orders/${widget.orderId}/status', {'status': status});
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _order;
    if (o == null) {
      return Scaffold(
          appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    }
    final status = o['status'] as String;
    return Scaffold(
      appBar: AppBar(title: Text('Delivery #${o['id']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.restaurant),
              title: Text(o['restaurant_name'] ?? 'Restaurant'),
              subtitle: const Text('Pick up from restaurant'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.home),
              title: Text(o['delivery_address']),
              subtitle: Text(o['delivery_postcode']),
            ),
          ),
          ListTile(
            title: const Text('Order total'),
            trailing: Text(formatGBP(o['total_pence'])),
          ),
          ListTile(title: Text('Current status: $status')),
          const SizedBox(height: 16),
          if (status == 'ready_for_pickup')
            FilledButton.icon(
              icon: const Icon(Icons.takeout_dining),
              onPressed: _busy ? null : () => _setStatus('picked_up'),
              label: const Text('I have picked up the order'),
            )
          else if (status == 'picked_up')
            FilledButton.icon(
              icon: const Icon(Icons.check_circle),
              onPressed: _busy ? null : () => _setStatus('delivered'),
              label: const Text('Mark as delivered'),
            )
          else if (['accepted', 'preparing'].contains(status))
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                    'The restaurant is still preparing this order. You can pick it up once it is ready.'),
              ),
            ),
        ],
      ),
    );
  }
}
