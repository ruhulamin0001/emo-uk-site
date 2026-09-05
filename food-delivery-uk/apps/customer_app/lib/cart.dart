import 'package:flutter/foundation.dart';

class CartItem {
  final int menuItemId;
  final String name;
  final int pricePence;
  int qty;
  CartItem({required this.menuItemId, required this.name, required this.pricePence, this.qty = 1});
}

class Cart extends ChangeNotifier {
  int? restaurantId;
  String? restaurantName;
  final List<CartItem> items = [];

  int get subtotalPence => items.fold(0, (sum, i) => sum + i.pricePence * i.qty);
  int get count => items.fold(0, (sum, i) => sum + i.qty);

  /// Returns false if the item belongs to a different restaurant than the cart.
  bool add(int restId, String restName, Map<String, dynamic> menuItem) {
    if (restaurantId != null && restaurantId != restId) return false;
    restaurantId = restId;
    restaurantName = restName;
    final existing = items.where((i) => i.menuItemId == menuItem['id']).toList();
    if (existing.isNotEmpty) {
      existing.first.qty++;
    } else {
      items.add(CartItem(
        menuItemId: menuItem['id'],
        name: menuItem['name'],
        pricePence: menuItem['price_pence'],
      ));
    }
    notifyListeners();
    return true;
  }

  void removeOne(CartItem item) {
    item.qty--;
    if (item.qty <= 0) items.remove(item);
    if (items.isEmpty) restaurantId = null;
    notifyListeners();
  }

  void clear() {
    items.clear();
    restaurantId = null;
    restaurantName = null;
    notifyListeners();
  }
}
