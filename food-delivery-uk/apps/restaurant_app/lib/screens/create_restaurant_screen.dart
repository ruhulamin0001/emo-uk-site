import 'package:flutter/material.dart';
import '../services/api.dart';

class CreateRestaurantScreen extends StatefulWidget {
  final VoidCallback onCreated;
  const CreateRestaurantScreen({super.key, required this.onCreated});
  @override
  State<CreateRestaurantScreen> createState() => _CreateRestaurantScreenState();
}

class _CreateRestaurantScreenState extends State<CreateRestaurantScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _cuisine = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _postcode = TextEditingController();
  final _phone = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.post('/api/restaurants/mine', {
        'name': _name.text.trim(),
        'description': _description.text.trim(),
        'cuisine': _cuisine.text.trim(),
        'address_line1': _address.text.trim(),
        'city': _city.text.trim(),
        'postcode': _postcode.text.trim().toUpperCase(),
        'phone': _phone.text.trim(),
      });
      widget.onCreated();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Set up your restaurant')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Restaurant name *')),
          TextField(
              controller: _description,
              decoration: const InputDecoration(labelText: 'Description')),
          TextField(
              controller: _cuisine,
              decoration: const InputDecoration(
                  labelText: 'Cuisine (e.g. Indian, Pizza, Chinese)')),
          TextField(
              controller: _address,
              decoration: const InputDecoration(labelText: 'Address line 1 *')),
          TextField(
              controller: _city,
              decoration: const InputDecoration(labelText: 'City *')),
          TextField(
              controller: _postcode,
              decoration: const InputDecoration(labelText: 'Postcode *')),
          TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone')),
          const SizedBox(height: 16),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Submitting…' : 'Submit for approval'),
          ),
        ],
      ),
    );
  }
}
