import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBase = String.fromEnvironment('API_URL',
    defaultValue: 'http://10.0.2.2:4000/api/v1');
const acid = Color(0xFFC8FF38);
const ink = Color(0xFF10120F);

ThemeData gadgetTheme() => ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: ink,
      colorScheme: ColorScheme.fromSeed(
          seedColor: acid,
          brightness: Brightness.dark,
          primary: acid,
          surface: const Color(0xFF191C17)),
      useMaterial3: true,
      cardTheme: const CardThemeData(
          color: Color(0xFF191B17),
          elevation: 0,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.zero,
              side: BorderSide(color: Color(0xFF30332E)))),
      appBarTheme: const AppBarTheme(
          backgroundColor: ink, foregroundColor: Colors.white),
      navigationBarTheme: const NavigationBarThemeData(
          backgroundColor: Color(0xFF161815), indicatorColor: acid),
      filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
              backgroundColor: acid,
              foregroundColor: ink,
              minimumSize: const Size.fromHeight(52),
              shape: const RoundedRectangleBorder())),
      inputDecorationTheme: const InputDecorationTheme(
          filled: true,
          fillColor: Color(0xFF1A1D18),
          border: OutlineInputBorder(borderSide: BorderSide.none)),
    );

class Product {
  final String id, name, description, brand, category, image, variantId;
  final double price;
  final int stock;
  const Product(
      {required this.id,
      required this.name,
      required this.description,
      required this.brand,
      required this.category,
      required this.image,
      required this.variantId,
      required this.price,
      required this.stock});
  factory Product.fromJson(Map<String, dynamic> j) {
    final variants = (j['variants'] as List?) ?? const [];
    final inventory = variants.isNotEmpty
        ? variants.first['inventory'] as Map<String, dynamic>?
        : null;
    final images = (j['images'] as List?) ?? const [];
    final rawPrice = j['discountPrice'] ?? j['price'] ?? 0;
    final price = rawPrice is num
        ? rawPrice.toDouble()
        : double.tryParse(rawPrice.toString()) ?? 0;
    return Product(
        id: '${j['id']}',
        name: '${j['name']}',
        description: '${j['description'] ?? ''}',
        brand: '${j['brand']?['name'] ?? ''}',
        category: '${j['category']?['name'] ?? 'Gadgets'}',
        image: images.isEmpty ? '' : '${images.first['url']}',
        variantId: variants.isEmpty ? '' : '${variants.first['id']}',
        price: price,
        stock: (inventory?['quantity'] as num?)?.toInt() ?? 0);
  }
}

class ApiError implements Exception {
  final String message;
  ApiError(this.message);
  @override
  String toString() => message;
}

class ApiClient extends ChangeNotifier {
  String? token;
  Map<String, dynamic>? user;
  List<Product> products = [];
  List<Map<String, dynamic>> orders = [];
  List<Map<String, dynamic>> wishlist = [];
  List<Map<String, dynamic>> addresses = [];
  List<Product> compare = [];
  Map<String, dynamic>? cart;
  bool busy = false;
  bool get signedIn => token != null;

  Future<void> restore() async {
    token = (await SharedPreferences.getInstance()).getString('token');
    if (token != null) {
      try {
        user = await get('/auth/me');
        await Future.wait(
            [loadCart(), loadOrders(), loadWishlist(), loadAddresses()]);
      } catch (_) {
        await logout();
      }
    }
  }

  Future<dynamic> request(String path,
      {String method = 'GET', Object? body}) async {
    final response = http.Request(method, Uri.parse('$apiBase$path'))
      ..headers.addAll({
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token'
      })
      ..body = body == null ? '' : jsonEncode(body);
    final streamed = await response.send();
    final text = await streamed.stream.bytesToString();
    dynamic data;
    if (text.isNotEmpty) {
      try {
        data = jsonDecode(text);
      } on FormatException {
        data = text;
      }
    }
    if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
      final message = data is Map
          ? data['message'] ?? data['error'] ?? 'Request failed'
          : (data?.toString().trim().isNotEmpty == true
              ? data
              : 'Request failed');
      throw ApiError('$message (${streamed.statusCode})');
    }
    return data;
  }

  Future<dynamic> get(String path) => request(path);
  int get cartCount => ((cart?['items'] as List?) ?? const []).fold<int>(
      0, (sum, item) => sum + ((item['quantity'] as num?)?.toInt() ?? 0));
  Future<void> login(String email, String password) async {
    final data = await request('/auth/login',
        method: 'POST', body: {'email': email, 'password': password});
    await _completeAuth(data);
  }

  Future<void> register(
      String first, String last, String email, String password,
      [String phone = '']) async {
    final data = await request('/auth/register', method: 'POST', body: {
      'firstName': first,
      'lastName': last,
      'email': email,
      'password': password,
      if (phone.trim().isNotEmpty) 'phone': phone.trim(),
    });
    await _completeAuth(data);
  }

  Future<void> _completeAuth(dynamic data) async {
    token = data['token'];
    user = Map<String, dynamic>.from(data['user']);
    await (await SharedPreferences.getInstance()).setString('token', token!);
    await Future.wait(
        [loadCart(), loadOrders(), loadWishlist(), loadAddresses()]);
    notifyListeners();
  }

  Future<void> logout() async {
    if (token != null) {
      try {
        await request('/auth/logout', method: 'POST');
      } catch (_) {}
    }
    token = null;
    user = null;
    orders = [];
    wishlist = [];
    addresses = [];
    compare = [];
    cart = null;
    (await SharedPreferences.getInstance()).remove('token');
    notifyListeners();
  }

  Future<void> loadProducts([String search = '', bool silent = false]) async {
    if (!silent) {
      busy = true;
      notifyListeners();
    }
    try {
      final data = await get(
          '/products?limit=40${search.isEmpty ? '' : '&search=${Uri.encodeQueryComponent(search)}'}');
      products =
          (data['items'] as List).map((e) => Product.fromJson(e)).toList();
    } finally {
      if (!silent) busy = false;
      notifyListeners();
    }
  }

  Future<void> addToCart(Product p) async {
    if (!signedIn) throw ApiError('Please sign in first');
    cart = await request('/cart/items', method: 'POST', body: {
      'productId': p.id,
      if (p.variantId.isNotEmpty) 'variantId': p.variantId,
      'quantity': 1
    });
    notifyListeners();
  }

  Future<void> loadCart() async {
    if (!signedIn) return;
    cart = await get('/cart');
    notifyListeners();
  }

  Future<void> removeCartItem(String id) async {
    await request('/cart/items/$id', method: 'DELETE');
    await loadCart();
  }

  Future<void> loadOrders() async {
    if (!signedIn) return;
    orders = List<Map<String, dynamic>>.from(await get('/orders'));
    notifyListeners();
  }

  Future<void> loadWishlist() async {
    if (!signedIn) return;
    wishlist = List<Map<String, dynamic>>.from(await get('/profile/wishlist'));
    notifyListeners();
  }

  Future<void> toggleWishlist(Product product) async {
    if (!signedIn) throw ApiError('Please sign in first');
    final saved = wishlist.any((item) => item['productId'] == product.id);
    await request('/profile/wishlist/${product.id}',
        method: saved ? 'DELETE' : 'POST');
    await loadWishlist();
  }

  void toggleCompare(Product product) {
    compare = compare.any((item) => item.id == product.id)
        ? compare.where((item) => item.id != product.id).toList()
        : compare.length < 4
            ? [...compare, product]
            : compare;
    notifyListeners();
  }

  Future<void> loadAddresses() async {
    if (!signedIn) return;
    addresses =
        List<Map<String, dynamic>>.from(await get('/profile/addresses'));
    notifyListeners();
  }

  Future<void> addAddress(Map<String, dynamic> data) async {
    await request('/profile/addresses', method: 'POST', body: data);
    await loadAddresses();
  }

  Future<void> createOrder(
      {required String addressId, String couponCode = ''}) async {
    await request('/orders', method: 'POST', body: {
      'addressId': addressId,
      'paymentMethod': 'CASH_ON_DELIVERY',
      'deliveryMethod': 'Standard delivery',
      'deliveryFee': 0,
      if (couponCode.trim().isNotEmpty) 'couponCode': couponCode.trim(),
    });
    await Future.wait([loadCart(), loadOrders()]);
  }

  Future<Map<String, dynamic>> tradeInEstimate(
          String model, String condition, int ageMonths) async =>
      Map<String, dynamic>.from(await request('/services/trade-ins/estimate',
          method: 'POST',
          body: {
            'deviceModel': model,
            'condition': condition,
            'ageMonths': ageMonths
          }));

  Future<void> submitSupport(String subject, String message) async {
    await request('/services/tickets',
        method: 'POST', body: {'subject': subject, 'message': message});
  }

  Future<Map<String, dynamic>> askAssistant(String message,
          [String? conversationId]) async =>
      Map<String, dynamic>.from(
          await request('/assistant/chat', method: 'POST', body: {
        'message': message,
        if (conversationId != null) 'conversationId': conversationId,
      }));

  Future<void> sendFeedback(
      {required String name,
      required String email,
      required String subject,
      required String message}) async {
    await request('/content/contact', method: 'POST', body: {
      'name': name,
      'email': email,
      'subject': subject,
      'message': message,
    });
  }
}

void showError(BuildContext context, Object error) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error.toString()), backgroundColor: Colors.red.shade700));
