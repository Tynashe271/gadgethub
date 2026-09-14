import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBase = String.fromEnvironment('API_URL',
    defaultValue: 'http://10.0.2.2:4000/api/v1');
const lime = Color(0xFFC8FF38),
    charcoal = Color(0xFF10120F),
    ink = Color(0xFF191C17);

ThemeData adminTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  return ThemeData(
      brightness: brightness,
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
          seedColor: lime,
          brightness: brightness,
          surface: dark ? ink : const Color(0xFFF4F6EF)),
      scaffoldBackgroundColor: dark ? charcoal : const Color(0xFFF4F6EF),
      cardTheme: CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: dark ? Colors.white10 : Colors.black12))),
      inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: dark ? const Color(0xFF20241D) : Colors.white,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none)));
}

class AdminApi extends ChangeNotifier {
  String? token;
  Map<String, dynamic>? user;
  Map<String, dynamic> snapshot = {};
  bool busy = false, darkMode = true;
  String? error;
  bool get signedIn => token != null;
  Map<String, dynamic> get metrics =>
      Map<String, dynamic>.from(snapshot['metrics'] ?? {});
  List<dynamic> rows(String key) =>
      List<dynamic>.from(snapshot[key] ?? const []);

  Future<dynamic> call(String path,
      {String method = 'GET', Object? body}) async {
    final request = http.Request(method, Uri.parse('$apiBase$path'))
      ..headers.addAll({
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token'
      })
      ..body = body == null ? '' : jsonEncode(body);
    final response = await request.send().timeout(const Duration(seconds: 25));
    final text = await response.stream.bytesToString();
    dynamic data;
    if (text.isNotEmpty) data = jsonDecode(text);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(data is Map
          ? data['message'] ?? data['error'] ?? 'Request failed'
          : 'Request failed (${response.statusCode})');
    }
    return data;
  }

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('admin_token');
    darkMode = prefs.getBool('admin_dark_mode') ?? true;
    if (token == null) return;
    try {
      user = Map<String, dynamic>.from(await call('/auth/me'));
      if (!['STORE_MANAGER', 'SUPER_ADMIN'].contains(user?['role'])) {
        throw Exception('Staff access required');
      }
      await loadAll();
    } catch (_) {
      await logout();
    }
  }

  Future<void> login(String email, String password) async {
    final data = await call('/auth/login',
        method: 'POST', body: {'email': email, 'password': password});
    if (!['STORE_MANAGER', 'SUPER_ADMIN'].contains(data['user']['role'])) {
      throw Exception('This account does not have admin access');
    }
    token = data['token'];
    user = Map<String, dynamic>.from(data['user']);
    await (await SharedPreferences.getInstance())
        .setString('admin_token', token!);
    await loadAll();
  }

  Future<void> loadAll() async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      snapshot =
          Map<String, dynamic>.from(await call('/admin-console/snapshot'));
    } catch (e) {
      error = e.toString();
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<List<dynamic>> search(String query) async {
    if (query.trim().isEmpty) return [];
    final data = Map<String, dynamic>.from(await call(
        '/admin-console/search?q=${Uri.encodeQueryComponent(query.trim())}'));
    return data.entries
        .expand((e) => List<dynamic>.from(e.value)
            .map((v) => {...Map<String, dynamic>.from(v), '_type': e.key}))
        .toList();
  }

  Future<void> mutate(String path,
      {String method = 'POST', Object? body, bool refresh = true}) async {
    await call(path, method: method, body: body);
    if (refresh) await loadAll();
  }

  Future<void> createRecord(String type, Map<String, dynamic> data) =>
      mutate('/admin-console/records/$type', body: data);
  Future<void> updateRecord(
          String type, String id, Map<String, dynamic> data) =>
      mutate('/admin-console/records/$type/$id', method: 'PATCH', body: data);
  Future<void> deleteRecord(String type, String id) =>
      mutate('/admin-console/records/$type/$id', method: 'DELETE');
  Future<void> toggleTheme() async {
    darkMode = !darkMode;
    await (await SharedPreferences.getInstance())
        .setBool('admin_dark_mode', darkMode);
    notifyListeners();
  }

  Future<void> logout() async {
    if (token != null) {
      try {
        await call('/auth/logout', method: 'POST');
      } catch (_) {}
    }
    token = null;
    user = null;
    snapshot = {};
    await (await SharedPreferences.getInstance()).remove('admin_token');
    notifyListeners();
  }
}

void errorSnack(BuildContext context, Object error) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', '')),
        backgroundColor: Colors.red.shade800));
void successSnack(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(message), backgroundColor: Colors.green.shade700));
String money(dynamic value) =>
    '\$${(num.tryParse('$value') ?? 0).toStringAsFixed(2)}';
String pretty(String value) => value
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .split(' ')
    .where((e) => e.isNotEmpty)
    .map((e) => '${e[0].toUpperCase()}${e.substring(1).toLowerCase()}')
    .join(' ');
String dateText(dynamic value) {
  final d = DateTime.tryParse('$value')?.toLocal();
  return d == null
      ? '—'
      : '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
