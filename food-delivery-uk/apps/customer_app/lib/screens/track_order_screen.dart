import 'dart:async';
import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api.dart';

const statusSteps = [
  'pending',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'picked_up',
  'delivered',
];

const statusLabels = {
  'pending': 'Waiting for the restaurant',
  'accepted': 'Order accepted',
  'preparing': 'Being prepared',
  'ready_for_pickup': 'Ready — waiting for driver',
  'picked_up': 'On its way to you',
  'delivered': 'Delivered — enjoy!',
  'rejected': 'Rejected by the restaurant',
  'cancelled': 'Cancelled',
};

class TrackOrderScreen extends StatefulWidget {
  final int orderId;
  const TrackOrderScreen({super.key, required this.orderId});
  @override
  State<TrackOrderScreen> createState() => _TrackOrderScreenState();
}

class _TrackOrderScreenState extends State<TrackOrderScreen> {
  Map<String, dynamic>? _order;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await Api.get('/api/orders/${widget.orderId}');
      if (mounted) setState(() => _order = data);
      if (['delivered', 'rejected', 'cancelled'].contains(data['status'])) {
        _timer?.cancel();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_order == null) {
      return Scaffold(
          appBar: AppBar(title: Text('Order #${widget.orderId}')),
          body: const Center(child: CircularProgressIndicator()));
    }
    final o = _order!;
    final status = o['status'] as String;
    final currentStep = statusSteps.indexOf(status);
    final failed = status == 'rejected' || status == 'cancelled';
    return Scaffold(
      appBar: AppBar(title: Text('Order #${o['id']} — ${o['restaurant_name']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: failed ? Colors.red.shade50 : null,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(statusLabels[status] ?? status,
                  style: Theme.of(context).textTheme.titleLarge),
            ),
          ),
          const SizedBox(height: 16),
          if (!failed)
            for (var i = 0; i < statusSteps.length; i++)
              ListTile(
                dense: true,
                leading: Icon(
                  i <= currentStep
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: i <= currentStep ? Colors.green : Colors.grey,
                ),
                title: Text(statusLabels[statusSteps[i]]!),
              ),
          const Divider(),
          if (o['driver_name'] != null)
            ListTile(
              leading: const Icon(Icons.sports_motorsports),
              title: Text('Driver: ${o['driver_name']}'),
            ),
          for (final item in (o['items'] as List))
            ListTile(
              dense: true,
              title: Text('${item['qty']} × ${item['name']}'),
              trailing: Text(formatGBP(item['price_pence'] * (item['qty'] as int))),
            ),
          ListTile(
            title: const Text('Total',
                style: TextStyle(fontWeight: FontWeight.bold)),
            trailing: Text(formatGBP(o['total_pence']),
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          if (status == 'pending')
            OutlinedButton(
              onPressed: () async {
                try {
                  await Api.patch(
                      '/api/orders/${o['id']}/status', {'status': 'cancelled'});
                  _load();
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context)
                        .showSnackBar(SnackBar(content: Text(e.toString())));
                  }
                }
              },
              child: const Text('Cancel order'),
            ),
        ],
      ),
    );
  }
}
