import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/ui.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.api,
    required this.user,
  });

  final ApiService api;
  final Map<String, dynamic> user;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

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
      final data = await widget.api.getDashboard();
      if (!mounted) return;
      setState(() {
        _data = data;
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
    final userName = asText(widget.user['name'] ?? 'Recepción');

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 26),
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: brandBrown,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.hotel_rounded,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Casa Huéspedes Pimentel',
                        style: TextStyle(
                          color: brandBrown,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        'Hola, ' + userName,
                        style: TextStyle(
                          color: Colors.brown.shade400,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),
              ],
            ),
            const SizedBox(height: 22),
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 120),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              CasaCard(
                child: Column(
                  children: [
                    const Icon(
                      Icons.cloud_off_rounded,
                      color: brandRed,
                      size: 40,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: _load,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              )
            else
              ..._dashboardContent(),
          ],
        ),
      ),
    );
  }

  List<Widget> _dashboardContent() {
    final summary = Map<String, dynamic>.from(_data?['summary'] ?? {});
    final categories = List<dynamic>.from(_data?['categories'] ?? []);
    final monthly = List<dynamic>.from(_data?['monthly'] ?? []);
    final arrivals = List<dynamic>.from(_data?['upcoming_arrivals'] ?? []);

    final total = asInt(summary['total_rooms']);
    final occupied = asInt(summary['occupied_rooms']);
    final available = asInt(summary['available_rooms']);
    final blocked = asInt(summary['blocked_rooms']);

    return [
      const SectionTitle(
        'Resumen de hoy',
        subtitle: 'Disponibilidad y movimiento del hospedaje.',
      ),
      const SizedBox(height: 14),
      LayoutBuilder(
        builder: (context, constraints) {
          final width = (constraints.maxWidth - 12) / 2;
          return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              SizedBox(
                width: width,
                child: MetricCard(
                  label: 'Disponibles',
                  value: available.toString(),
                  icon: Icons.meeting_room_outlined,
                  tint: brandGreen,
                ),
              ),
              SizedBox(
                width: width,
                child: MetricCard(
                  label: 'Ocupadas',
                  value: occupied.toString(),
                  icon: Icons.bed_rounded,
                  tint: brandCopper,
                ),
              ),
              SizedBox(
                width: width,
                child: MetricCard(
                  label: 'Ingresos hoy',
                  value: asInt(summary['arrivals_today']).toString(),
                  icon: Icons.login_rounded,
                ),
              ),
              SizedBox(
                width: width,
                child: MetricCard(
                  label: 'Salidas hoy',
                  value: asInt(summary['departures_today']).toString(),
                  icon: Icons.logout_rounded,
                  tint: const Color(0xFF486A9A),
                ),
              ),
            ],
          );
        },
      ),
      const SizedBox(height: 16),
      CasaCard(
        child: Row(
          children: [
            SizedBox(
              width: 142,
              height: 142,
              child: CustomPaint(
                painter: _DonutPainter(
                  occupied: occupied,
                  blocked: blocked,
                  total: total,
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        total == 0
                            ? '0%'
                            : ((occupied / total) * 100)
                                .round()
                                .toString() + '%',
                        style: const TextStyle(
                          color: brandBrown,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const Text(
                        'ocupación',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Estado de habitaciones',
                    style: TextStyle(
                      color: brandBrown,
                      fontWeight: FontWeight.w900,
                      fontSize: 17,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _LegendRow(
                    color: brandGreen,
                    label: 'Disponibles',
                    value: available,
                  ),
                  const SizedBox(height: 8),
                  _LegendRow(
                    color: brandCopper,
                    label: 'Ocupadas',
                    value: occupied,
                  ),
                  if (blocked > 0) ...[
                    const SizedBox(height: 8),
                    _LegendRow(
                      color: brandRed,
                      label: 'Bloqueadas',
                      value: blocked,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 24),
      const SectionTitle(
        'Ocupación por categoría',
        subtitle: 'Habitaciones ocupadas en este momento.',
      ),
      const SizedBox(height: 12),
      CasaCard(
        child: Column(
          children: categories.map((item) {
            final row = Map<String, dynamic>.from(item);
            final categoryTotal = asInt(row['total_rooms']);
            final categoryOccupied = asInt(row['occupied_rooms']);
            final ratio = categoryTotal == 0
                ? 0.0
                : categoryOccupied / categoryTotal;

            return Padding(
              padding: const EdgeInsets.only(bottom: 17),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          asText(row['name'] ?? ''),
                          style: const TextStyle(
                            color: brandBrown,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Text(
                        categoryOccupied.toString() +
                            '/' +
                            categoryTotal.toString(),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: ratio,
                      minHeight: 9,
                      backgroundColor: brandSand,
                      color: brandCopper,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
      const SizedBox(height: 24),
      const SectionTitle(
        'Reservas de los últimos meses',
        subtitle: 'Cantidad de reservas registradas por mes.',
      ),
      const SizedBox(height: 12),
      CasaCard(
        child: _MonthlyBars(items: monthly),
      ),
      const SizedBox(height: 18),
      LayoutBuilder(
        builder: (context, constraints) {
          final width = (constraints.maxWidth - 12) / 2;
          return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              SizedBox(
                width: width,
                child: MetricCard(
                  label: 'Reservas este mes',
                  value: asInt(summary['month_bookings']).toString(),
                  icon: Icons.calendar_month_rounded,
                ),
              ),
              SizedBox(
                width: width,
                child: MetricCard(
                  label: 'Monto reservado',
                  value: money(summary['month_revenue']),
                  icon: Icons.payments_outlined,
                  tint: brandGreen,
                ),
              ),
            ],
          );
        },
      ),
      const SizedBox(height: 24),
      const SectionTitle(
        'Próximos ingresos',
        subtitle: 'Las siguientes reservas por llegar.',
      ),
      const SizedBox(height: 12),
      if (arrivals.isEmpty)
        const CasaCard(
          child: Text(
            'No hay ingresos próximos registrados.',
            textAlign: TextAlign.center,
          ),
        )
      else
        ...arrivals.map((item) {
          final row = Map<String, dynamic>.from(item);
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: CasaCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: brandSand,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      asText(row['room_number'] ?? '-'),
                      style: const TextStyle(
                        color: brandBrown,
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
                          asText(row['customer_name'] ?? ''),
                          style: const TextStyle(
                            color: brandBrown,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          asText(row['category_name'] ?? '') +
                              ' · ' +
                              shortDate(row['check_in']),
                          style: TextStyle(
                            color: Colors.brown.shade400,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    money(row['total_amount']),
                    style: const TextStyle(
                      color: brandBrown,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
    ];
  }
}

class _LegendRow extends StatelessWidget {
  const _LegendRow({
    required this.color,
    required this.label,
    required this.value,
  });

  final Color color;
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        Text(
          value.toString(),
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ],
    );
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({
    required this.occupied,
    required this.blocked,
    required this.total,
  });

  final int occupied;
  final int blocked;
  final int total;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = 14.0;
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(stroke / 2);
    final base = Paint()
      ..color = brandSand
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    final occupiedPaint = Paint()
      ..color = brandCopper
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    final blockedPaint = Paint()
      ..color = brandRed
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(arcRect, 0, math.pi * 2, false, base);

    if (total <= 0) return;

    final occupiedSweep = math.pi * 2 * occupied / total;
    final blockedSweep = math.pi * 2 * blocked / total;
    const start = -math.pi / 2;

    if (occupiedSweep > 0) {
      canvas.drawArc(
        arcRect,
        start,
        occupiedSweep,
        false,
        occupiedPaint,
      );
    }

    if (blockedSweep > 0) {
      canvas.drawArc(
        arcRect,
        start + occupiedSweep,
        blockedSweep,
        false,
        blockedPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) {
    return oldDelegate.occupied != occupied ||
        oldDelegate.blocked != blocked ||
        oldDelegate.total != total;
  }
}

class _MonthlyBars extends StatelessWidget {
  const _MonthlyBars({required this.items});

  final List<dynamic> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Text('Todavía no hay datos para mostrar.');
    }

    final values = items
        .map((item) => asInt(Map<String, dynamic>.from(item)['bookings']))
        .toList();
    final maxValue = values.fold<int>(1, (current, value) => value > current ? value : current);

    return SizedBox(
      height: 170,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(items.length, (index) {
          final item = Map<String, dynamic>.from(items[index]);
          final value = values[index];
          final height = 24 + (100 * value / maxValue);
          final month = asText(item['month_start'] ?? '');
          final label = month.length >= 7 ? month.substring(5, 7) : month;

          return Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  value.toString(),
                  style: const TextStyle(
                    color: brandBrown,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 350),
                  height: height,
                  width: 28,
                  decoration: BoxDecoration(
                    color: brandCopper,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.brown.shade400,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}
