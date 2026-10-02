import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../config/app_config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiService {
  ApiService({this.token});

  String? token;
  final HttpClient _client = HttpClient();

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
  }) async {
    final base = Uri.parse(AppConfig.apiBaseUrl);
    final uri = base.replace(
      path: base.path + path,
      queryParameters: query?.map(
        (key, value) => MapEntry(key, value.toString()),
      ),
    );

    try {
      final request = await _client.openUrl(method, uri).timeout(
            const Duration(seconds: 20),
          );

      request.headers.set(HttpHeaders.acceptHeader, 'application/json');

      if (token != null && token!.isNotEmpty) {
        request.headers.set(
          HttpHeaders.authorizationHeader,
          'Bearer ' + token!,
        );
      }

      if (body != null) {
        request.headers.contentType = ContentType.json;
        request.write(jsonEncode(body));
      }

      final response = await request.close().timeout(
            const Duration(seconds: 30),
          );
      final raw = await utf8.decoder.bind(response).join();

      Map<String, dynamic> payload = {};
      if (raw.trim().isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          payload = decoded;
        }
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(
          (payload['message'] ?? 'No se pudo completar la operación.').toString(),
          statusCode: response.statusCode,
        );
      }

      return payload;
    } on TimeoutException {
      throw ApiException('El servidor está tardando demasiado en responder.');
    } on SocketException {
      throw ApiException('No hay conexión con el servidor.');
    } on FormatException {
      throw ApiException('El servidor devolvió una respuesta no válida.');
    }
  }

  Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await _request(
      'POST',
      '/auth/login',
      body: {
        'email': email.trim(),
        'password': password,
      },
    );

    final data = Map<String, dynamic>.from(response['data'] ?? {});
    token = (data['token'] ?? '').toString();
    return data;
  }

  Future<Map<String, dynamic>> getDashboard() async {
    final response = await _request('GET', '/mobile/dashboard');
    return Map<String, dynamic>.from(response['data'] ?? {});
  }

  Future<Map<String, dynamic>> getCategories({
    required String checkIn,
    required int nights,
    required int guests,
  }) async {
    final response = await _request(
      'GET',
      '/mobile/categories',
      query: {
        'check_in': checkIn,
        'nights': nights,
        'guests_count': guests,
      },
    );

    return Map<String, dynamic>.from(response['data'] ?? {});
  }

  Future<Map<String, dynamic>> createBooking(
    Map<String, dynamic> data,
  ) async {
    final response = await _request(
      'POST',
      '/mobile/bookings',
      body: data,
    );

    return Map<String, dynamic>.from(response['data'] ?? {});
  }

  Future<List<dynamic>> getBookings() async {
    final response = await _request(
      'GET',
      '/mobile/bookings',
      query: {'limit': 150},
    );

    return List<dynamic>.from(response['data'] ?? []);
  }
}
