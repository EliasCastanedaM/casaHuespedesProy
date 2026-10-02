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
  DateTime _checkIn = DateTime.now();
  int _nights = 1;
  int _guests = 2;
  String _stayType = 'full_day';
  TimeOfDay _checkOutTime = const TimeOfDay(hour: 18, minute: 0);
  bool _loading = true;
  String? _error;
  List<dynamic> _categories = [];

  int get _availabilityNights => _stayType == 'until_time' ? 1 : _nights;

  String get _checkOutTimeText {
    final hour = _checkOutTime.hour.toString().padLeft(2, '0');
    final minute = _checkOutTime.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String get _stayLabel => _stayType == 'until_time'
      ? 'Hasta las $_checkOutTimeText'
      : 'Día entero';

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await widget.api.getCategories(
        checkIn: isoDate(_checkIn),
        nights: _availabilityNights,
        guests: _guests,
      );
      if (!mounted) return;
      setState(() {
        _categories = List<dynamic>.from(data['categories'] ?? []);
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _checkIn,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('es', 'PE'),
    );
    if (picked == null) return;
    setState(() => _checkIn = picked);
    await _loadCategories();
  }

  Future<void> _pickCheckOutTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _checkOutTime,
      helpText: '¿Hasta qué hora se reserva?',
      cancelText: 'Cancelar',
      confirmText: 'Aceptar',
    );
    if (picked == null) return;
    setState(() => _checkOutTime = picked);
  }

  Future<void> _changeStayType(String value) async {
    if (value == _stayType) return;
    setState(() => _stayType = value);
    await _loadCategories();
  }

  Future<void> _changeNights(int delta) async {
    final next = (_nights + delta).clamp(1, 60).toInt();
    if (next == _nights) return;
    setState(() => _nights = next);
    await _loadCategories();
  }

  Future<void> _changeGuests(int delta) async {
    final next = (_guests + delta).clamp(1, 30).toInt();
    if (next == _guests) return;
    setState(() => _guests = next);
    await _loadCategories();
  }

  Future<void> _reserve(Map<String, dynamic> category) async {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    bool saving = false;
    String? formError;

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> submit() async {
              final name = nameController.text.trim();
              final phone = phoneController.text.trim();

              if (name.isEmpty || phone.isEmpty) {
                setDialogState(() {
                  formError = 'Ingresa nombre y celular del huésped.';
                });
                return;
              }

              setDialogState(() {
                saving = true;
                formError = null;
              });

              try {
                final booking = await widget.api.createBooking({
                  'category_slug': category['slug'],
                  'check_in': isoDate(_checkIn),
                  'nights': _availabilityNights,
                  'guests_count': _guests,
                  'stay_type': _stayType,
                  if (_stayType == 'until_time')
                    'check_out_time': _checkOutTimeText,
                  'customer': {
                    'full_name': name,
                    'phone': phone,
                  },
                });

                if (!dialogContext.mounted) return;
                Navigator.of(dialogContext).pop(booking);
              } on ApiException catch (error) {
                setDialogState(() {
                  saving = false;
                  formError = error.message;
                });
              }
            }

            return AlertDialog(
              title: Text(asText(category['name'])),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: brandSand,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          _SummaryRow(
                            label: 'Ingreso',
                            value: shortDate(isoDate(_checkIn)),
                          ),
                          const SizedBox(height: 8),
                          _SummaryRow(
                            label: 'Tipo',
                            value: _stayLabel,
                          ),
                          if (_stayType == 'full_day') ...[
                            const SizedBox(height: 8),
                            _SummaryRow(
                              label: 'Noches',
                              value: _nights.toString(),
                            ),
                          ],
                          const SizedBox(height: 8),
                          _SummaryRow(
                            label: 'Total',
                            value: money(category['total_amount']),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
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
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: saving
                      ? null
                      : () => Navigator.of(dialogContext).pop(),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: saving ? null : submit,
                  child: saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Confirmar reserva'),
                ),
              ],
            );
          },
        );
      },
    );

    nameController.dispose();
    phoneController.dispose();

    if (result == null || !mounted) return;

    final resultStayType = asText(result['stay_type']);
    final resultTime = asText(result['check_out_time']);
    final resultStayLabel = resultStayType == 'until_time'
        ? 'Hasta las ${resultTime.length >= 5 ? resultTime.substring(0, 5) : resultTime}'
        : 'Día entero';

    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.check_circle_rounded,
          color: brandGreen,
          size: 54,
        ),
        title: const Text('Reserva confirmada'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              asText(result['category_name'] ?? category['name']),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: brandBrown,
                fontSize: 19,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              shortDate(result['check_in']) + ' · ' + resultStayLabel,
            ),
            const SizedBox(height: 6),
            Text(
              money(result['total_amount']),
              style: const TextStyle(
                color: brandGreen,
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'El sistema asignó internamente una habitación disponible de esta categoría.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.brown.shade400),
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Listo'),
          ),
        ],
      ),
    );

    if (!mounted) return;
    widget.onBookingCreated();
  }

  @override
  Widget build(BuildContext context) {
    final availableCount = _categories.where((item) {
      final category = Map<String, dynamic>.from(item);
      return category['is_available'] == true;
    }).length;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadCategories,
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
              'Elige la fecha, modalidad y categoría. La habitación física se asigna automáticamente.',
              style: TextStyle(
                color: Colors.brown.shade400,
                fontWeight: FontWeight.w600,
                height: 1.35,
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
                          const Icon(Icons.chevron_right_rounded),
                        ],
                      ),
                    ),
                  ),
                  const Divider(height: 28),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Modalidad de reserva',
                      style: TextStyle(
                        color: Colors.brown.shade400,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'full_day',
                          icon: Icon(Icons.calendar_view_day_rounded),
                          label: Text('Día entero'),
                        ),
                        ButtonSegment(
                          value: 'until_time',
                          icon: Icon(Icons.schedule_rounded),
                          label: Text('Hasta una hora'),
                        ),
                      ],
                      selected: {_stayType},
                      onSelectionChanged: (selection) {
                        _changeStayType(selection.first);
                      },
                    ),
                  ),
                  const Divider(height: 28),
                  if (_stayType == 'full_day')
                    _CounterRow(
                      icon: Icons.nights_stay_outlined,
                      label: 'Noches',
                      value: _nights,
                      onMinus: () => _changeNights(-1),
                      onPlus: () => _changeNights(1),
                    )
                  else
                    InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: _pickCheckOutTime,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.schedule_rounded,
                              color: brandCopper,
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'Hora límite',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                            Text(
                              _checkOutTimeText,
                              style: const TextStyle(
                                color: brandBrown,
                                fontSize: 17,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const Icon(Icons.chevron_right_rounded),
                          ],
                        ),
                      ),
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
                const Expanded(child: SectionTitle('Categorías')),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: brandGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    '$availableCount disponibles',
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
                      onPressed: _loadCategories,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              )
            else
              ..._categories.map((item) {
                final category = Map<String, dynamic>.from(item);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _CategoryCard(
                    category: category,
                    stayType: _stayType,
                    onReserve: category['is_available'] == true
                        ? () => _reserve(category)
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

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({
    required this.category,
    required this.stayType,
    required this.onReserve,
  });

  final Map<String, dynamic> category;
  final String stayType;
  final VoidCallback? onReserve;

  @override
  Widget build(BuildContext context) {
    final available = category['is_available'] == true;
    final imageUrl = asText(category['image_url']);
    final availableQuantity = asInt(category['available_quantity']);
    final unitLabel = stayType == 'until_time' ? ' / reserva' : ' / noche';

    return CasaCard(
      padding: EdgeInsets.zero,
      child: Opacity(
        opacity: available ? 1 : 0.6,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (imageUrl.isNotEmpty)
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(23)),
                child: Image.network(
                  imageUrl,
                  height: 150,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(17),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          asText(category['name']),
                          style: const TextStyle(
                            color: brandBrown,
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      Text(
                        money(category['price_per_night']) + unitLabel,
                        style: const TextStyle(
                          color: brandCopper,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    asText(category['bed_description']),
                    style: TextStyle(
                      color: Colors.brown.shade400,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(
                        available
                            ? Icons.check_circle_outline_rounded
                            : Icons.event_busy_rounded,
                        color: available ? brandGreen : brandRed,
                        size: 19,
                      ),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Text(
                          available
                              ? '$availableQuantity disponible(s) para esta reserva'
                              : 'Sin disponibilidad para esta reserva',
                          style: TextStyle(
                            color: available ? brandGreen : brandRed,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Total ${money(category['total_amount'])}',
                          style: const TextStyle(
                            color: brandBrown,
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      FilledButton(
                        onPressed: onReserve,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(110, 48),
                        ),
                        child: Text(available ? 'Reservar' : 'No disponible'),
                      ),
                    ],
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

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: Colors.brown.shade400,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
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
