import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api.dart';
import 'track_order_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<dynamic> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await Api.get('/api/orders/mine');
      setState(() => _orders = data);
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My orders')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                itemCount: _orders.length,
                itemBuilder: (context, i) {
                  final o = _orders[i];
                  return ListTile(
                    title: Text('${o['restaurant_name']} — ${formatGBP(o['total_pence'])}'),
                    subtitle: Text('Status: ${o['status']} · ${o['created_at'].toString().substring(0, 16)}'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => TrackOrderScreen(orderId: o['id']))),
                  );
                },
              ),
            ),
    );
  }
}
