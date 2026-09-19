import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class Api {
  static String? _token;

  static Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
  }

  static bool get isLoggedIn => _token != null;

  static Future<void> _saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  static dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(body is Map && body['error'] != null
          ? body['error']
          : 'Request failed (${res.statusCode})');
    }
    return body;
  }

  static Future<dynamic> get(String path) async =>
      _decode(await http.get(Uri.parse('$apiBaseUrl$path'), headers: _headers));

  static Future<dynamic> post(String path, [Map<String, dynamic>? body]) async =>
      _decode(await http.post(Uri.parse('$apiBaseUrl$path'),
          headers: _headers, body: jsonEncode(body ?? {})));

  static Future<dynamic> patch(String path, Map<String, dynamic> body) async =>
      _decode(await http.patch(Uri.parse('$apiBaseUrl$path'),
          headers: _headers, body: jsonEncode(body)));

  // ---- Auth ----
  static Future<void> login(String email, String password) async {
    final data = await post('/api/auth/login', {'email': email, 'password': password});
    await _saveToken(data['token']);
  }

  static Future<void> register(String name, String email, String password) async {
    final data = await post('/api/auth/register',
        {'name': name, 'email': email, 'password': password, 'role': 'restaurant'});
    await _saveToken(data['token']);
  }
}
