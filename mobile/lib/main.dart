import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'widgets/ui.dart';

void main() {
  runApp(const CasaHuespedesMobileApp());
}

class CasaHuespedesMobileApp extends StatefulWidget {
  const CasaHuespedesMobileApp({super.key});

  @override
  State<CasaHuespedesMobileApp> createState() =>
      _CasaHuespedesMobileAppState();
}

class _CasaHuespedesMobileAppState extends State<CasaHuespedesMobileApp> {
  String? _token;
  Map<String, dynamic>? _user;

  void _handleLoggedIn(Map<String, dynamic> session) {
    setState(() {
      _token = String(session['token'] ?? '');
      _user = Map<String, dynamic>.from(session['user'] ?? {});
    });
  }

  void _logout() {
    setState(() {
      _token = null;
      _user = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: brandCopper,
      brightness: Brightness.light,
      surface: brandCream,
    );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Casa Huéspedes Pimentel',
      locale: const Locale('es', 'PE'),
      supportedLocales: const [
        Locale('es', 'PE'),
        Locale('es'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: brandCream,
        fontFamily: 'Roboto',
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: brandSand),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: brandSand),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(
              color: brandCopper,
              width: 1.6,
            ),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: brandBrown,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(54),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
            textStyle: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 15,
            ),
          ),
        ),
      ),
      home: _token == null
          ? LoginScreen(onLoggedIn: _handleLoggedIn)
          : HomeShell(
              api: ApiService(token: _token),
              user: _user ?? const {},
              onLogout: _logout,
            ),
    );
  }
}
