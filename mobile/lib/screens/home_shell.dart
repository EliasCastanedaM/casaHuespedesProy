import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/ui.dart';
import 'bookings_screen.dart';
import 'dashboard_screen.dart';
import 'new_booking_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.api,
    required this.user,
    required this.onLogout,
  });

  final ApiService api;
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  int _revision = 0;

  void _bookingCreated() {
    setState(() {
      _revision += 1;
      _index = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardScreen(
        key: ValueKey('dashboard-' + _revision.toString()),
        api: widget.api,
        user: widget.user,
        onLogout: widget.onLogout,
      ),
      NewBookingScreen(
        key: ValueKey('booking-' + _revision.toString()),
        api: widget.api,
        onBookingCreated: _bookingCreated,
      ),
      BookingsScreen(
        key: ValueKey('bookings-' + _revision.toString()),
        api: widget.api,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        height: 72,
        backgroundColor: Colors.white,
        indicatorColor: brandSand,
        selectedIndex: _index,
        onDestinationSelected: (value) {
          setState(() {
            _index = value;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_business_outlined),
            selectedIcon: Icon(Icons.add_business_rounded),
            label: 'Reservar',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_note_outlined),
            selectedIcon: Icon(Icons.event_note_rounded),
            label: 'Reservas',
          ),
        ],
      ),
    );
  }
}
