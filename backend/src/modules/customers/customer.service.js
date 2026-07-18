// Importamos el pool de conexión a PostgreSQL
import { pool } from "../../config/db.js";

// Servicio para listar clientes con resumen de reservas
export async function getAllCustomersService() {
  // Esta consulta trae clientes y calcula:
  // cantidad de reservas, total gastado y última reserva.
  const query = `
    SELECT
      c.id,
      c.full_name,
      c.phone,
      c.email,
      c.document_type,
      c.document_number,
      c.created_at,
      COUNT(b.id) AS total_bookings,
      COALESCE(SUM(
        CASE
          WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount
          ELSE 0
        END
      ), 0) AS total_spent,
      MAX(b.created_at) AS last_booking_date
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id
    GROUP BY c.id
    ORDER BY last_booking_date DESC NULLS LAST, c.created_at DESC;
  `;

  // Ejecutamos consulta
  const result = await pool.query(query);

  // Retornamos clientes
  return result.rows;
}

// Servicio para obtener detalle de un cliente con sus reservas
export async function getCustomerByIdService(id) {
  // Consulta para obtener datos del cliente
  const customerQuery = `
    SELECT *
    FROM customers
    WHERE id = $1;
  `;

  // Consulta para obtener reservas del cliente
  const bookingsQuery = `
    SELECT
      b.*,
      r.name AS room_name
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    WHERE b.customer_id = $1
    ORDER BY b.created_at DESC;
  `;

  // Ejecutamos ambas consultas
  const customerResult = await pool.query(customerQuery, [id]);
  const bookingsResult = await pool.query(bookingsQuery, [id]);

  // Si no existe cliente, retornamos null
  if (customerResult.rows.length === 0) {
    return null;
  }

  // Retornamos cliente con reservas
  return {
    customer: customerResult.rows[0],
    bookings: bookingsResult.rows,
  };
}