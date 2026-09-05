import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../cart.dart';
import '../services/api.dart';
import 'auth_screen.dart';
import 'cart_screen.dart';
import 'orders_screen.dart';
import 'restaurant_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _restaurants = [];
  bool _loading = true;
  String? _error;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final q = _search.text.trim();
      final data = await Api.get('/api/restaurants${q.isEmpty ? '' : '?q=$q'}');
      setState(() => _restaurants = data);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('QuickBite UK'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'My orders',
            onPressed: () => Navigator.push(
                context, MaterialPageRoute(builder: (_) => const OrdersScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Log out',
            onPressed: () async {
              await Api.logout();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const AuthScreen()), (_) => false);
            },
          ),
        ],
      ),
      floatingActionButton: cart.count == 0
          ? null
          : FloatingActionButton.extended(
              icon: const Icon(Icons.shopping_basket),
              label: Text('Basket (${cart.count})'),
              onPressed: () => Navigator.push(
                  context, MaterialPageRoute(builder: (_) => const CartScreen())),
            ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                hintText: 'Search restaurants…',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onSubmitted: (_) => _load(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          itemCount: _restaurants.length,
                          itemBuilder: (context, i) {
                            final r = _restaurants[i];
                            final open = r['is_open'] == true;
                            return Card(
                              margin: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: open
                                      ? const Color(0xFFE23744)
                                      : Colors.grey,
                                  child: const Icon(Icons.restaurant,
                                      color: Colors.white),
                                ),
                                title: Text(r['name']),
                                subtitle: Text(
                                    '${r['cuisine'] ?? 'Various'} · ${r['city']} · ★${r['rating']}'),
                                trailing: Text(open ? 'Open' : 'Closed',
                                    style: TextStyle(
                                        color: open ? Colors.green : Colors.red)),
                                onTap: open
                                    ? () => Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                            builder: (_) => RestaurantScreen(
                                                restaurantId: r['id'])))
                                    : null,
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
