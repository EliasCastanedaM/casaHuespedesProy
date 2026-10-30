import { pool } from "../../config/db.js";

// Dashboard estrictamente agregado: no recuperar cuerpos de mensajes, IDs de
// canal, nombres, teléfonos, correos, documentos ni contenido de reservas.
export async function getPrivacyRetentionPreview(db = pool) {
  const [records, contexts] = await Promise.all([
    db.query(`
      SELECT 'messages' AS category, count(*)::integer AS total,
             count(*) FILTER (WHERE created_at < now() - interval '90 days')::integer AS older_than_90d
      FROM public.meta_messages
      UNION ALL
      SELECT 'coexistence_archive', count(*)::integer,
             count(*) FILTER (WHERE received_at < now() - interval '90 days')::integer
      FROM public.meta_coexistence_events
      UNION ALL
      SELECT 'ai_usage', count(*)::integer,
             count(*) FILTER (WHERE created_at < now() - interval '90 days')::integer
      FROM public.ai_usage_events
      UNION ALL
      SELECT 'ai_deduplication', count(*)::integer,
             count(*) FILTER (WHERE created_at < now() - interval '90 days')::integer
      FROM public.ai_processed_messages
      UNION ALL
      SELECT 'customers', count(*)::integer, NULL::integer FROM public.customers
      UNION ALL
      SELECT 'bookings', count(*)::integer, NULL::integer FROM public.bookings
      UNION ALL
      SELECT 'inquiries', count(*)::integer, NULL::integer FROM public.inquiries
      ORDER BY category;
    `),
    db.query(`
      SELECT
        count(*) FILTER (WHERE a.booking_context <> '{}'::jsonb)::integer AS populated,
        count(*) FILTER (
          WHERE a.booking_context <> '{}'::jsonb
            AND (a.booking_context_expires_at <= now()
                 OR a.booking_context_expires_at IS NULL)
            AND COALESCE(m.handoff_active, false) = false
        )::integer AS expired_without_handoff,
        count(*) FILTER (
          WHERE a.booking_context <> '{}'::jsonb
            AND (a.booking_context_expires_at <= now()
                 OR a.booking_context_expires_at IS NULL)
            AND COALESCE(m.handoff_active, false) = true
        )::integer AS expired_with_active_handoff,
        count(*) FILTER (
          WHERE a.booking_context <> '{}'::jsonb
            AND a.booking_context_expires_at > now()
        )::integer AS active_contexts
      FROM public.ai_conversations a
      LEFT JOIN public.meta_conversations m
        ON m.channel = a.channel AND m.external_user_id = a.external_user_id;
    `),
  ]);
  return {
    mode: "read_only",
    sampledAt: new Date().toISOString(),
    records: records.rows.map(({ category, total, older_than_90d }) => ({
      category,
      total: Number(total),
      olderThan90Days: older_than_90d == null ? null : Number(older_than_90d),
    })),
    bookingContext: {
      populated: Number(contexts.rows[0]?.populated || 0),
      expiredWithoutHandoff: Number(contexts.rows[0]?.expired_without_handoff || 0),
      expiredWithActiveHandoff: Number(contexts.rows[0]?.expired_with_active_handoff || 0),
      activeContexts: Number(contexts.rows[0]?.active_contexts || 0),
    },
    policy: {
      messageDeletion: "manual_review_required",
      coexistenceHistoryDeletion: "manual_review_required",
      bookingAndCustomerDeletion: "manual_review_required",
      contextExpiration: "dry_run_only",
    },
  };
}

