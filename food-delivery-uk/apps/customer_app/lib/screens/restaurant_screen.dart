import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../cart.dart';
import '../config.dart';
import '../services/api.dart';

class RestaurantScreen extends StatefulWidget {
  final int restaurantId;
  const RestaurantScreen({super.key, required this.restaurantId});
  @override
  State<RestaurantScreen> createState() => _RestaurantScreenState();
}

class _RestaurantScreenState extends State<RestaurantScreen> {
  Map<String, dynamic>? _restaurant;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await Api.get('/api/restaurants/${widget.restaurantId}');
      setState(() => _restaurant = data);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    if (_error != null) {
      return Scaffold(appBar: AppBar(), body: Center(child: Text(_error!)));
    }
    if (_restaurant == null) {
      return Scaffold(
          appBar: AppBar(),
          body: const Center(child: CircularProgressIndicator()));
    }
    final r = _restaurant!;
    final menu = (r['menu'] as List).where((m) => m['is_available'] == true).toList();
    final categories = <String, List<dynamic>>{};
    for (final m in menu) {
      categories.putIfAbsent(m['category'] ?? 'Menu', () => []).add(m);
    }
    return Scaffold(
      appBar: AppBar(title: Text(r['name'])),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 80),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(r['description'] ?? '',
                style: Theme.of(context).textTheme.bodyLarge),
          ),
          for (final entry in categories.entries) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Text(entry.key,
                  style: Theme.of(context).textTheme.titleMedium),
            ),
            for (final m in entry.value)
              ListTile(
                title: Text(m['name']),
                subtitle:
                    m['description'] == null ? null : Text(m['description']),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(formatGBP(m['price_pence'])),
                    IconButton(
                      icon: const Icon(Icons.add_circle,
                          color: Color(0xFFE23744)),
                      onPressed: () {
                        final ok = cart.add(r['id'], r['name'], m);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text(ok
                              ? 'Added ${m['name']}'
                              : 'Your basket has items from another restaurant. Clear it first.'),
                          duration: const Duration(seconds: 1),
                        ));
                      },
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}
