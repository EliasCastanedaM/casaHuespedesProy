import { pool } from "../../config/db.js";

export async function getPublicRoomsService() {
  const query = `
    SELECT *
    FROM rooms
    WHERE status = 'active'
    ORDER BY COALESCE(display_order, 9999), id;
  `;

  const result = await pool.query(query);
  return result.rows;
}

export async function getAllRoomsService() {
  const query = `
    SELECT
      r.*,
      (
        SELECT COUNT(*)::INTEGER
        FROM room_images ri
        WHERE ri.room_id = r.id
      ) AS image_count,
      (
        SELECT COUNT(*)::INTEGER
        FROM room_videos rv
        WHERE rv.room_id = r.id
      ) AS video_count
    FROM rooms r
    ORDER BY COALESCE(r.display_order, 9999), r.id;
  `;

  const result = await pool.query(query);
  return result.rows;
}

export async function getRoomByIdService(id) {
  const query = `
    SELECT
      to_jsonb(r)
      || jsonb_build_object(
        'main_image_url', COALESCE(
          r.main_image_url,
          (
            SELECT ri.image_url
            FROM room_images ri
            WHERE ri.room_id = r.id
            ORDER BY ri.is_main DESC, ri.display_order, ri.id
            LIMIT 1
          )
        ),
        'images', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ri.id,
                'room_id', ri.room_id,
                'image_url', ri.image_url,
                'public_id', ri.public_id,
                'title', ri.title,
                'alt_text', ri.alt_text,
                'is_main', ri.is_main,
                'display_order', ri.display_order,
                'created_at', ri.created_at
              )
              ORDER BY ri.is_main DESC, ri.display_order, ri.id
            )
            FROM room_images ri
            WHERE ri.room_id = r.id
          ),
          '[]'::jsonb
        ),
        'videos', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', rv.id,
                'room_id', rv.room_id,
                'video_url', rv.video_url,
                'public_id', rv.public_id,
                'title', rv.title,
                'poster_url', rv.poster_url,
                'is_main', rv.is_main,
                'display_order', rv.display_order,
                'created_at', rv.created_at
              )
              ORDER BY rv.is_main DESC, rv.display_order, rv.id
            )
            FROM room_videos rv
            WHERE rv.room_id = r.id
          ),
          '[]'::jsonb
        )
      ) AS room
    FROM rooms r
    WHERE r.id = $1;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0]?.room;
}

export async function createRoomService(roomData) {
  const {
    name,
    description,
    capacity,
    price_per_night,
    status,
    main_image_url,
  } = roomData;

  const query = `
    INSERT INTO rooms (
      name,
      description,
      capacity,
      price_per_night,
      status,
      main_image_url
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    name,
    description || null,
    capacity || 1,
    price_per_night || 0,
    status || "active",
    main_image_url || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function updateRoomService(id, roomData) {
  const {
    name,
    description,
    capacity,
    price_per_night,
    status,
    main_image_url,
  } = roomData;

  const query = `
    UPDATE rooms
    SET
      name = $1,
      description = $2,
      capacity = $3,
      price_per_night = $4,
      status = $5,
      main_image_url = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *;
  `;

  const values = [
    name,
    description || null,
    capacity || 1,
    price_per_night || 0,
    status || "active",
    main_image_url || null,
    id,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function deleteRoomService(id) {
  const query = `
    DELETE FROM rooms
    WHERE id = $1
    RETURNING id;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
}

// Sube una sola imagen y la convierte en portada.
export async function addRoomImageService(
  roomId,
  imageUrl,
  publicId,
  isMain = true
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (isMain) {
      await client.query(
        `UPDATE room_images SET is_main = FALSE WHERE room_id = $1;`,
        [roomId]
      );
    }

    const orderResult = await client.query(
      `
        SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order
        FROM room_images
        WHERE room_id = $1;
      `,
      [roomId]
    );

    const insertResult = await client.query(
      `
        INSERT INTO room_images (
          room_id,
          image_url,
          public_id,
          title,
          alt_text,
          is_main,
          display_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `,
      [
        roomId,
        imageUrl,
        publicId,
        "Foto principal",
        "Foto principal de la habitación",
        isMain,
        orderResult.rows[0].next_order,
      ]
    );

    if (isMain) {
      await client.query(
        `
          UPDATE rooms
          SET main_image_url = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `,
        [imageUrl, roomId]
      );
    }

    await client.query("COMMIT");
    return insertResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Registra varias fotos adicionales sin reemplazar la portada existente.
export async function addRoomImagesService(roomId, uploadedImages) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `SELECT id, name, main_image_url FROM rooms WHERE id = $1 FOR UPDATE;`,
      [roomId]
    );

    if (roomResult.rowCount === 0) {
      const error = new Error("Habitación no encontrada");
      error.status = 404;
      throw error;
    }

    const orderResult = await client.query(
      `
        SELECT COALESCE(MAX(display_order), 0) AS last_order,
               BOOL_OR(is_main) AS has_main
        FROM room_images
        WHERE room_id = $1;
      `,
      [roomId]
    );

    let nextOrder = Number(orderResult.rows[0].last_order || 0) + 1;
    const hasMainImage = Boolean(
      orderResult.rows[0].has_main || roomResult.rows[0].main_image_url
    );
    const savedImages = [];

    for (let index = 0; index < uploadedImages.length; index += 1) {
      const image = uploadedImages[index];
      const isMain = !hasMainImage && index === 0;

      const result = await client.query(
        `
          INSERT INTO room_images (
            room_id,
            image_url,
            public_id,
            title,
            alt_text,
            is_main,
            display_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `,
        [
          roomId,
          image.url,
          image.publicId,
          image.title,
          image.altText,
          isMain,
          nextOrder,
        ]
      );

      savedImages.push(result.rows[0]);

      if (isMain) {
        await client.query(
          `
            UPDATE rooms
            SET main_image_url = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
          `,
          [image.url, roomId]
        );
      }

      nextOrder += 1;
    }

    await client.query("COMMIT");
    return savedImages;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addRoomVideosService(roomId, uploadedVideos) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `SELECT id FROM rooms WHERE id = $1 FOR UPDATE;`,
      [roomId]
    );

    if (roomResult.rowCount === 0) {
      const error = new Error("Habitación no encontrada");
      error.status = 404;
      throw error;
    }

    const orderResult = await client.query(
      `
        SELECT COALESCE(MAX(display_order), 0) AS last_order,
               BOOL_OR(is_main) AS has_main
        FROM room_videos
        WHERE room_id = $1;
      `,
      [roomId]
    );

    let nextOrder = Number(orderResult.rows[0].last_order || 0) + 1;
    const hasMainVideo = Boolean(orderResult.rows[0].has_main);
    const savedVideos = [];

    for (let index = 0; index < uploadedVideos.length; index += 1) {
      const video = uploadedVideos[index];
      const isMain = !hasMainVideo && index === 0;

      const result = await client.query(
        `
          INSERT INTO room_videos (
            room_id,
            video_url,
            public_id,
            title,
            poster_url,
            is_main,
            display_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `,
        [
          roomId,
          video.url,
          video.publicId,
          video.title,
          video.posterUrl,
          isMain,
          nextOrder,
        ]
      );

      savedVideos.push(result.rows[0]);
      nextOrder += 1;
    }

    await client.query("COMMIT");
    return savedVideos;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Elimina una foto concreta. Si era la portada, convierte la siguiente foto
// disponible en portada y mantiene rooms.main_image_url sincronizado.
export async function deleteRoomImageService(roomId, imageId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `SELECT id, main_image_url FROM rooms WHERE id = $1 FOR UPDATE;`,
      [roomId]
    );

    if (roomResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const imageResult = await client.query(
      `
        SELECT *
        FROM room_images
        WHERE id = $1 AND room_id = $2
        FOR UPDATE;
      `,
      [imageId, roomId]
    );

    if (imageResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const image = imageResult.rows[0];
    const wasMain =
      Boolean(image.is_main) ||
      roomResult.rows[0].main_image_url === image.image_url;

    await client.query(
      `DELETE FROM room_images WHERE id = $1 AND room_id = $2;`,
      [imageId, roomId]
    );

    let replacementImage = null;

    if (wasMain) {
      await client.query(
        `UPDATE room_images SET is_main = FALSE WHERE room_id = $1;`,
        [roomId]
      );

      const replacementResult = await client.query(
        `
          SELECT id, image_url
          FROM room_images
          WHERE room_id = $1
          ORDER BY display_order NULLS LAST, id
          LIMIT 1
          FOR UPDATE;
        `,
        [roomId]
      );

      replacementImage = replacementResult.rows[0] || null;

      if (replacementImage) {
        await client.query(
          `UPDATE room_images SET is_main = TRUE WHERE id = $1;`,
          [replacementImage.id]
        );
      }

      await client.query(
        `
          UPDATE rooms
          SET main_image_url = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `,
        [replacementImage?.image_url || null, roomId]
      );
    }

    await client.query("COMMIT");

    return {
      ...image,
      replacement_image_url: replacementImage?.image_url || null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Elimina un video concreto. Si era el principal, promociona el siguiente.
export async function deleteRoomVideoService(roomId, videoId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const videoResult = await client.query(
      `
        SELECT *
        FROM room_videos
        WHERE id = $1 AND room_id = $2
        FOR UPDATE;
      `,
      [videoId, roomId]
    );

    if (videoResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const video = videoResult.rows[0];

    await client.query(
      `DELETE FROM room_videos WHERE id = $1 AND room_id = $2;`,
      [videoId, roomId]
    );

    let replacementVideo = null;

    if (video.is_main) {
      await client.query(
        `UPDATE room_videos SET is_main = FALSE WHERE room_id = $1;`,
        [roomId]
      );

      const replacementResult = await client.query(
        `
          SELECT id, video_url
          FROM room_videos
          WHERE room_id = $1
          ORDER BY display_order NULLS LAST, id
          LIMIT 1
          FOR UPDATE;
        `,
        [roomId]
      );

      replacementVideo = replacementResult.rows[0] || null;

      if (replacementVideo) {
        await client.query(
          `UPDATE room_videos SET is_main = TRUE WHERE id = $1;`,
          [replacementVideo.id]
        );
      }
    }

    await client.query("COMMIT");

    return {
      ...video,
      replacement_video_url: replacementVideo?.video_url || null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
