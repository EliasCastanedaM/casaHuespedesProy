-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Es seguro volver a ejecutarlo: usa IF NOT EXISTS.

ALTER TABLE IF EXISTS rooms
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS room_images
  ADD COLUMN IF NOT EXISTS title VARCHAR(180),
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS room_videos (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  public_id TEXT,
  title VARCHAR(180),
  poster_url TEXT,
  is_main BOOLEAN DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_images_room_id
ON room_images(room_id);

CREATE INDEX IF NOT EXISTS idx_room_videos_room_id
ON room_videos(room_id);

-- Repara el orden de registros antiguos que todavía estén en 0.
WITH ordered_images AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY is_main DESC, id) AS new_order
  FROM room_images
)
UPDATE room_images ri
SET display_order = oi.new_order
FROM ordered_images oi
WHERE ri.id = oi.id
  AND ri.display_order = 0;

WITH ordered_videos AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY is_main DESC, id) AS new_order
  FROM room_videos
)
UPDATE room_videos rv
SET display_order = ov.new_order
FROM ordered_videos ov
WHERE rv.id = ov.id
  AND rv.display_order = 0;

-- Si existieran varias portadas antiguas en una habitación, conserva solo
-- la primera antes de crear las restricciones de portada única.
WITH ranked_main_images AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY room_id
           ORDER BY display_order NULLS LAST, id
         ) AS position
  FROM room_images
  WHERE is_main = TRUE
)
UPDATE room_images ri
SET is_main = FALSE
FROM ranked_main_images rmi
WHERE ri.id = rmi.id
  AND rmi.position > 1;

WITH ranked_main_videos AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY room_id
           ORDER BY display_order NULLS LAST, id
         ) AS position
  FROM room_videos
  WHERE is_main = TRUE
)
UPDATE room_videos rv
SET is_main = FALSE
FROM ranked_main_videos rmv
WHERE rv.id = rmv.id
  AND rmv.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_room_images_one_main
ON room_images(room_id)
WHERE is_main = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_room_videos_one_main
ON room_videos(room_id)
WHERE is_main = TRUE;
