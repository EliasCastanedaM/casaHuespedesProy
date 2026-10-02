import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/ui.dart';

class NewBookingScreen extends StatefulWidget {
  const NewBookingScreen({
    super.key,
    required this.api,
    required this.onBookingCreated,
  });

  final ApiService api;
  final VoidCallback onBookingCreated;

  @override
  State<NewBookingScreen> createState() => _NewBookingScreenState();
}

class _NewBookingScreenState extends State<NewBookingScreen> {
  DateTime _checkIn = DateUtils.dateOnly(DateTime.now());
  int _nights = 1;
  int _guests = 1;
  bool _loading = true;
  String? _error;
  List<dynamic> _rooms = [];

  @override
  void initState() {
    super.initState();
    _loadRooms();
  }

  Future<void> _loadRooms() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await widget.api.getRooms(
        checkIn: isoDate(_checkIn),
        nights: _nights,
        guests: _guests,
      );

      if (!mounted) return;
      setState(() {
        _rooms = List<dynamic>.from(data['rooms'] ?? []);
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _rooms = [];
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _pickDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final selected = await showDatePicker(
      context: context,
      initialDate: _checkIn.isBefore(today) ? today : _checkIn,
      firstDate: today,
      lastDate: today.add(const Duration(days: 730)),
      helpText: 'Fecha de ingreso',
      cancelText: 'Cancelar',
      confirmText: 'Elegir',
    );

    if (selected == null || !mounted) return;

    setState(() {
      _checkIn = DateUtils.dateOnly(selected);
    });
    await _loadRooms();
  }

  Future<void> _changeNights(int delta) async {
    final next = (_nights + delta).clamp(1, 60);
    if (next == _nights) return;
    setState(() {
      _nights = next;
    });
    await _loadRooms();
  }

  Future<void> _changeGuests(int delta) async {
    final next = (_guests + delta).clamp(1, 5);
    if (next == _guests) return;
    setState(() {
      _guests = next;
    });
    await _loadRooms();
  }

  Future<void> _reserve(Map<String, dynamic> room) async {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final emailController = TextEditingController();
    bool submitting = false;
    String? formError;

    final booking = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: brandCream,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> submit() async {
              if (nameController.text.trim().isEmpty ||
                  phoneController.text.trim().isEmpty) {
                setSheetState(() {
                  formError = 'Nombre y celular son obligatorios.';
                });
                return;
              }

              setSheetState(() {
                submitting = true;
                formError = null;
              });

              try {
                final result = await widget.api.createBooking({
                  'room_id': room['id'],
                  'check_in': isoDate(_checkIn),
                  'nights': _nights,
                  'guests_count': _guests,
                  'customer': {
                    'full_name': nameController.text.trim(),
                    'phone': phoneController.text.trim(),
                    'email': emailController.text.trim(),
                  },
                });

                if (!sheetContext.mounted) return;
                Navigator.of(sheetContext).pop(result);
              } on ApiException catch (error) {
                setSheetState(() {
                  formError = error.message;
                  submitting = false;
                });
              } catch (_) {
                setSheetState(() {
                  formError = 'No se pudo registrar la reserva.';
                  submitting = false;
                });
              }
            }

            return SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.only(
                  left: 20,
                  right: 20,
                  top: 16,
                  bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 48,
                          height: 5,
                          decoration: BoxDecoration(
                            color: brandSand,
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        'Reservar habitación ' +
                            asText(room['room_number'] ?? ''),
                        style: const TextStyle(
                          color: brandBrown,
                          fontSize: 23,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        asText(room['category_name'] ?? '') +
                            ' · ' +
                            _nights.toString() +
                            (_nights == 1 ? ' noche' : ' noches') +
                            ' · ' +
                            money(room['total_amount']),
                        style: TextStyle(
                          color: Colors.brown.shade400,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 20),
                      TextField(
                        controller: nameController,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Nombre del huésped',
                          prefixIcon: Icon(Icons.person_outline_rounded),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Celular',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Correo (opcional)',
                          prefixIcon: Icon(Icons.mail_outline_rounded),
                        ),
                      ),
                      if (formError != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          formError!,
                          style: const TextStyle(
                            color: brandRed,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        onPressed: submitting ? null : submit,
                        icon: submitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline_rounded),
                        label: Text(
                          submitting
                              ? 'Reservando...'
                              : 'CONFIRMAR RESERVA',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    nameController.dispose();
    phoneController.dispose();
    emailController.dispose();

    if (booking == null || !mounted) return;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        final roomNumber = asText(booking['room_number'] ?? '');
        return AlertDialog(
          icon: const Icon(
            Icons.check_circle_rounded,
            color: brandGreen,
            size: 54,
          ),
          title: const Text(
            'Habitación reservada',
            textAlign: TextAlign.center,
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Habitación ' + roomNumber,
                style: const TextStyle(
                  color: brandBrown,
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                shortDate(booking['check_in']) +
                    ' al ' +
                    shortDate(booking['check_out']),
              ),
              const SizedBox(height: 4),
              Text(
                money(booking['total_amount']),
                style: const TextStyle(
                  color: brandGreen,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                asText(booking['booking_code'] ?? ''),
                style: TextStyle(
                  color: Colors.brown.shade400,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Listo'),
            ),
          ],
        );
      },
    );

    if (!mounted) return;
    widget.onBookingCreated();
  }

  @override
  Widget build(BuildContext context) {
    final availableCount = _rooms.where((item) {
      final room = Map<String, dynamic>.from(item);
      return room['is_available'] == true;
    }).length;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadRooms,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
          children: [
            const Text(
              'Nueva reserva',
              style: TextStyle(
                color: brandBrown,
                fontSize: 28,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Elige fechas y toca la habitación que quieres reservar.',
              style: TextStyle(
                color: Colors.brown.shade400,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 18),
            CasaCard(
              child: Column(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: _pickDate,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.calendar_today_rounded,
                            color: brandCopper,
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'Fecha de ingreso',
                              style: TextStyle(fontWeight: FontWeight.w800),
                            ),
                          ),
                          Text(
                            shortDate(isoDate(_checkIn)),
                            style: const TextStyle(
                              color: brandBrown,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.chevron_right_rounded),
                        ],
                      ),
                    ),
                  ),
                  const Divider(height: 28),
                  _CounterRow(
                    icon: Icons.nights_stay_outlined,
                    label: 'Noches',
                    value: _nights,
                    onMinus: () => _changeNights(-1),
                    onPlus: () => _changeNights(1),
                  ),
                  const Divider(height: 28),
                  _CounterRow(
                    icon: Icons.people_outline_rounded,
                    label: 'Huéspedes',
                    value: _guests,
                    onMinus: () => _changeGuests(-1),
                    onPlus: () => _changeGuests(1),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                const Expanded(
                  child: SectionTitle('Habitaciones'),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: brandGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    availableCount.toString() + ' libres',
                    style: const TextStyle(
                      color: brandGreen,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 80),
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
                      onPressed: _loadRooms,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              )
            else if (_rooms.isEmpty)
              const CasaCard(
                child: Text(
                  'No hay habitaciones compatibles con esa cantidad de huéspedes.',
                  textAlign: TextAlign.center,
                ),
              )
            else
              ..._rooms.map((item) {
                final room = Map<String, dynamic>.from(item);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _RoomCard(
                    room: room,
                    onReserve: room['is_available'] == true
                        ? () => _reserve(room)
                        : null,
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _CounterRow extends StatelessWidget {
  const _CounterRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onMinus,
    required this.onPlus,
  });

  final IconData icon;
  final String label;
  final int value;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: brandCopper),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        IconButton.filledTonal(
          onPressed: onMinus,
          icon: const Icon(Icons.remove_rounded),
        ),
        SizedBox(
          width: 42,
          child: Text(
            value.toString(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: brandBrown,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        IconButton.filled(
          onPressed: onPlus,
          style: IconButton.styleFrom(backgroundColor: brandBrown),
          icon: const Icon(Icons.add_rounded, color: Colors.white),
        ),
      ],
    );
  }
}

class _RoomCard extends StatelessWidget {
  const _RoomCard({
    required this.room,
    required this.onReserve,
  });

  final Map<String, dynamic> room;
  final VoidCallback? onReserve;

  @override
  Widget build(BuildContext context) {
    final available = room['is_available'] == true;
    final imageUrl = asText(room['image_url'] ?? '');

    return CasaCard(
      padding: EdgeInsets.zero,
      child: Opacity(
        opacity: available ? 1 : 0.62,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (imageUrl.isNotEmpty)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(23),
                ),
                child: Image.network(
                  imageUrl,
                  height: 145,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: available
                          ? brandSand
                          : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Text(
                      asText(room['room_number'] ?? '-'),
                      style: const TextStyle(
                        color: brandBrown,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 13),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          asText(room['category_name'] ?? ''),
                          style: const TextStyle(
                            color: brandBrown,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          money(room['price_per_night']) + ' / noche',
                          style: TextStyle(
                            color: Colors.brown.shade400,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          available
                              ? 'Total ' + money(room['total_amount'])
                              : asText(
                                  room['availability_reason'] ??
                                      'No disponible',
                                ),
                          maxLines: 2,
                          style: TextStyle(
                            color: available ? brandGreen : brandRed,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    onPressed: onReserve,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(92, 46),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    child: Text(available ? 'Reservar' : 'Ocupada'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
