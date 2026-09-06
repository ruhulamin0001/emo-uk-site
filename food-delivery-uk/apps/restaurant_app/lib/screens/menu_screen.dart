import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});
  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  List<dynamic> _menu = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await Api.get('/api/restaurants/mine');
      if (mounted) {
        setState(() {
          _menu = data['menu'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showItemDialog([Map<String, dynamic>? item]) async {
    final name = TextEditingController(text: item?['name'] ?? '');
    final description = TextEditingController(text: item?['description'] ?? '');
    final category = TextEditingController(text: item?['category'] ?? 'Mains');
    final price = TextEditingController(
        text: item == null
            ? ''
            : ((item['price_pence'] as int) / 100).toStringAsFixed(2));

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item == null ? 'Add menu item' : 'Edit menu item'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Name')),
              TextField(
                  controller: description,
                  decoration: const InputDecoration(labelText: 'Description')),
              TextField(
                  controller: category,
                  decoration: const InputDecoration(
                      labelText: 'Category (Starters/Mains/Sides/Drinks)')),
              TextField(
                  controller: price,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration:
                      const InputDecoration(labelText: 'Price (£, e.g. 9.95)')),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Save')),
        ],
      ),
    );

    if (saved != true) return;
    final pricePence = ((double.tryParse(price.text) ?? 0) * 100).round();
    final body = {
      'name': name.text.trim(),
      'description': description.text.trim(),
      'category': category.text.trim().isEmpty ? 'Mains' : category.text.trim(),
      'price_pence': pricePence,
    };
    try {
      if (item == null) {
        await Api.post('/api/restaurants/mine/menu', body);
      } else {
        await Api.patch('/api/restaurants/mine/menu/${item['id']}', body);
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _toggleAvailable(Map<String, dynamic> item) async {
    await Api.patch('/api/restaurants/mine/menu/${item['id']}',
        {'is_available': !(item['is_available'] == true)});
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Menu')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showItemDialog(),
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _menu.length,
              itemBuilder: (context, i) {
                final m = _menu[i];
                final available = m['is_available'] == true;
                return ListTile(
                  title: Text(m['name'],
                      style: available
                          ? null
                          : const TextStyle(
                              decoration: TextDecoration.lineThrough)),
                  subtitle: Text(
                      '${m['category']} · ${formatGBP(m['price_pence'])}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Switch(
                          value: available,
                          onChanged: (_) => _toggleAvailable(m)),
                      IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _showItemDialog(m)),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
