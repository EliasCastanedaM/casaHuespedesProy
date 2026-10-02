import 'package:flutter/material.dart';

const Color brandBrown = Color(0xFF3B2418);
const Color brandCopper = Color(0xFFA87545);
const Color brandCream = Color(0xFFF8F3EB);
const Color brandSand = Color(0xFFEDE0CF);
const Color brandGreen = Color(0xFF2E7D61);
const Color brandRed = Color(0xFFB84A4A);

double asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(String(value ?? '')) ?? 0;
}

int asInt(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse(String(value ?? '')) ?? 0;
}

String money(dynamic value) {
  return 'S/ ' + asDouble(value).toStringAsFixed(2);
}

String shortDate(dynamic value) {
  final text = String(value ?? '');
  if (text.length < 10) return text;
  final parts = text.substring(0, 10).split('-');
  if (parts.length != 3) return text;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

String isoDate(DateTime date) {
  final y = date.year.toString().padLeft(4, '0');
  final m = date.month.toString().padLeft(2, '0');
  final d = date.day.toString().padLeft(2, '0');
  return y + '-' + m + '-' + d;
}

Color statusColor(String status) {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return brandGreen;
    case 'completed':
      return const Color(0xFF486A9A);
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return brandRed;
    case 'payment_reported':
      return const Color(0xFF8B6B00);
    default:
      return brandCopper;
  }
}

String statusLabel(String status) {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'Confirmada';
    case 'completed':
      return 'Completada';
    case 'cancelled':
      return 'Cancelada';
    case 'rejected':
      return 'Rechazada';
    case 'expired':
      return 'Vencida';
    case 'payment_reported':
      return 'Pago reportado';
    case 'pending_payment':
      return 'Pendiente de pago';
    case 'pending':
      return 'Pendiente';
    default:
      return status;
  }
}

class CasaCard extends StatelessWidget {
  const CasaCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: brandSand),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}

class MetricCard extends StatelessWidget {
  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.tint = brandCopper,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return CasaCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: tint),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: brandBrown,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  maxLines: 2,
                  style: TextStyle(
                    color: Colors.brown.shade400,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: brandBrown,
            fontSize: 21,
            fontWeight: FontWeight.w900,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            style: TextStyle(
              color: Colors.brown.shade400,
              height: 1.35,
            ),
          ),
        ],
      ],
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill(this.status, {super.key});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        statusLabel(status),
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}
