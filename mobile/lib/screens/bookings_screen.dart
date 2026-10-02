import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/ui.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({
    super.key,
    required this.api,
    required this.onBookingChanged,
  });

  final ApiService api;
  final VoidCallback onBookingChanged;

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

  Future<void> _cancelBooking(Map<String, dynamic> booking) async {
    final bookingId = asInt(booking['id']);
    final bookingCode = asText(booking['booking_code']);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(
          Icons.delete_outline_rounded,
          color: brandRed,
          size: 46,
        ),
        title: const Text('¿Eliminar reserva?'),
        content: Text(
          'Se quitará de las reservas activas y la categoría volverá a quedar disponible. '
          'El registro se conservará como cancelado para mantener el historial.',
          style: TextStyle(
            color: Colors.brown.shade500,
            height: 1.4,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('No eliminar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: brandRed),
            child: const Text('Sí, eliminar'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await widget.api.cancelBooking(
        bookingId: bookingId,
        bookingCode: bookingCode,
      );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Reserva eliminada y disponibilidad liberada.'),
        ),
      );

      widget.onBookingChanged();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
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
                final stayType = asText(booking['stay_type'] ?? 'full_day');
                final checkOutTime = asText(booking['check_out_time']);
                final stayLabel = stayType == 'until_time'
                    ? 'Hasta las ' +
                        (checkOutTime.length >= 5
                            ? checkOutTime.substring(0, 5)
                            : checkOutTime)
                    : 'Día completo';

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
                              child: const Icon(
                                Icons.hotel_class_rounded,
                                color: brandCopper,
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
                                  const SizedBox(height: 2),
                                  Text(
                                    stayLabel,
                                    style: const TextStyle(
                                      color: brandCopper,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
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
                                label: stayType == 'until_time'
                                    ? 'Hora límite'
                                    : 'Salida',
                                value: stayType == 'until_time'
                                    ? (checkOutTime.length >= 5
                                        ? checkOutTime.substring(0, 5)
                                        : checkOutTime)
                                    : shortDate(booking['check_out']),
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
                        if (asText(booking['source']) == 'mobile') ...[
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () => _cancelBooking(booking),
                              icon: const Icon(Icons.delete_outline_rounded),
                              label: const Text('Eliminar reserva'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: brandRed,
                                side: const BorderSide(color: brandRed),
                                minimumSize: const Size.fromHeight(48),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ),
                        ],
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
