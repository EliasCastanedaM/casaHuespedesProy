import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/ui.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({
    super.key,
    required this.api,
  });

  final ApiService api;

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _bookings = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await widget.api.getBookings();
      if (!mounted) return;
      setState(() {
        _bookings = data;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
          children: [
            const Text(
              'Reservas',
              style: TextStyle(
                color: brandBrown,
                fontSize: 28,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Reservas registradas en todos los canales.',
              style: TextStyle(
                color: Colors.brown.shade400,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 18),
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 120),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              CasaCard(
                child: Column(
                  children: [
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: brandRed,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _load,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              )
            else if (_bookings.isEmpty)
              const CasaCard(
                child: Text(
                  'Todavía no hay reservas registradas.',
                  textAlign: TextAlign.center,
                ),
              )
            else
              ..._bookings.map((item) {
                final booking = Map<String, dynamic>.from(item);
                final customer = Map<String, dynamic>.from(
                  booking['customer'] ?? {},
                );

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: CasaCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 54,
                              height: 54,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: brandSand,
                                borderRadius: BorderRadius.circular(17),
                              ),
                              child: Text(
                                asText(booking['room_number'] ?? '-'),
                                style: const TextStyle(
                                  color: brandBrown,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    asText(
                                      customer['full_name'] ?? 'Huésped',
                                    ),
                                    style: const TextStyle(
                                      color: brandBrown,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    asText(booking['category_name'] ?? ''),
                                    style: TextStyle(
                                      color: Colors.brown.shade400,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            StatusPill(asText(booking['status'] ?? '')),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Divider(height: 1),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _Info(
                                label: 'Ingreso',
                                value: shortDate(booking['check_in']),
                              ),
                            ),
                            Expanded(
                              child: _Info(
                                label: 'Salida',
                                value: shortDate(booking['check_out']),
                              ),
                            ),
                            Expanded(
                              child: _Info(
                                label: 'Total',
                                value: money(booking['total_amount']),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(
                              Icons.phone_outlined,
                              size: 17,
                              color: brandCopper,
                            ),
                            const SizedBox(width: 7),
                            Text(
                              asText(customer['phone'] ?? '-'),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              asText(booking['booking_code'] ?? ''),
                              style: TextStyle(
                                color: Colors.brown.shade400,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.brown.shade400,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(
            color: brandBrown,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}
