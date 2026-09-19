import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../cart.dart';
import '../config.dart';
import '../services/api.dart';
import 'track_order_screen.dart';

const deliveryFeePence = 299;
const serviceFeePence = 50;

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _address = TextEditingController();
  final _postcode = TextEditingController();
  final _notes = TextEditingController();
  bool _busy = false;

  Future<void> _placeOrder(Cart cart) async {
    if (_address.text.trim().isEmpty || _postcode.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Delivery address and postcode are required')));
      return;
    }
    setState(() => _busy = true);
    try {
      final order = await Api.post('/api/orders', {
        'restaurant_id': cart.restaurantId,
        'items': [
          for (final i in cart.items) {'menu_item_id': i.menuItemId, 'qty': i.qty}
        ],
        'delivery_address': _address.text.trim(),
        'delivery_postcode': _postcode.text.trim().toUpperCase(),
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      });
      cart.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => TrackOrderScreen(orderId: order['id'])));
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
    final cart = context.watch<Cart>();
    final total = cart.subtotalPence + deliveryFeePence + serviceFeePence;
    return Scaffold(
      appBar: AppBar(title: Text('Basket — ${cart.restaurantName ?? ''}')),
      body: cart.items.isEmpty
          ? const Center(child: Text('Your basket is empty'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final i in cart.items)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${i.qty} × ${i.name}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(formatGBP(i.pricePence * i.qty)),
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: () => cart.removeOne(i),
                        ),
                      ],
                    ),
                  ),
                const Divider(),
                _row('Subtotal', cart.subtotalPence),
                _row('Delivery fee', deliveryFeePence),
                _row('Service fee', serviceFeePence),
                _row('Total', total, bold: true),
                const SizedBox(height: 16),
                TextField(
                    controller: _address,
                    decoration:
                        const InputDecoration(labelText: 'Delivery address')),
                TextField(
                    controller: _postcode,
                    decoration: const InputDecoration(labelText: 'Postcode')),
                TextField(
                    controller: _notes,
                    decoration: const InputDecoration(
                        labelText: 'Notes for the restaurant (optional)')),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _busy ? null : () => _placeOrder(cart),
                  child: Text(_busy
                      ? 'Placing order…'
                      : 'Place order · ${formatGBP(total)}'),
                ),
              ],
            ),
    );
  }

  Widget _row(String label, int pence, {bool bold = false}) {
    final style = bold ? const TextStyle(fontWeight: FontWeight.bold) : null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label, style: style), Text(formatGBP(pence), style: style)],
      ),
    );
  }
}
