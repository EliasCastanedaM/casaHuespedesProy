// Importamos el pool de conexión a PostgreSQL
import { pool } from "../../config/db.js";

// Servicio para listar imágenes públicas de galería
export async function getPublicGalleryService() {
  const query = `
    SELECT *
    FROM gallery
    ORDER BY is_featured DESC, created_at DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

// Servicio para listar imágenes para admin
export async function getAllGalleryService() {
  const query = `
    SELECT *
    FROM gallery
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

// Servicio para crear un elemento de galería
export async function createGalleryItemService(data) {
  const {
    title,
    description,
    media_type,
    url,
    public_id,
    category,
    is_featured,
  } = data;

  const query = `
    INSERT INTO gallery (
      title,
      description,
      media_type,
      url,
      public_id,
      category,
      is_featured
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    title,
    description || null,
    media_type || "image",
    url,
    public_id || null,
    category || "general",
    is_featured || false,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

// Servicio para actualizar un elemento de galería
export async function updateGalleryItemService(id, data) {
  const {
    title,
    description,
    media_type,
    url,
    public_id,
    category,
    is_featured,
  } = data;

  const query = `
    UPDATE gallery
    SET
      title = $1,
      description = $2,
      media_type = $3,
      url = $4,
      public_id = $5,
      category = $6,
      is_featured = $7,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *;
  `;

  const values = [
    title,
    description || null,
    media_type || "image",
    url,
    public_id || null,
    category || "general",
    is_featured || false,
    id,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

// Servicio para eliminar un elemento de galería
export async function deleteGalleryItemService(id) {
  const query = `
    DELETE FROM gallery
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
}