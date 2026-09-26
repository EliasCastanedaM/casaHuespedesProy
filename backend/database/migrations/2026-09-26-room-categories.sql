-- ============================================================
-- CATEGORÍAS DE HABITACIONES - Casa Huéspedes Pimentel
-- Presentación comercial por categoría, manteniendo las
-- habitaciones físicas para operación y reservas existentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.room_categories (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(80) NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    bed_description TEXT,
    description TEXT,
    price_low NUMERIC(10,2),
    price_medium NUMERIC(10,2),
    price_high NUMERIC(10,2),
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.room_categories (
    slug,
    name,
    total_quantity,
    capacity,
    bed_description,
    description,
    price_low,
    price_medium,
    price_high,
    image_url,
    display_order,
    is_active
)
VALUES
    (
        'matrimonial',
        'Matrimonial',
        5,
        2,
        '1 cama de 2 plazas',
        'Ideal para parejas o dos huéspedes que buscan una estadía cómoda y tranquila.',
        100,
        120,
        155,
        'https://res.cloudinary.com/do48g4nod/image/upload/v1784762236/casa-huespedes-pimentel/rooms/11/images/file_ajrlta.jpg',
        1,
        TRUE
    ),
    (
        'doble',
        'Doble',
        2,
        2,
        '2 camas de 1½ plaza',
        'Una opción práctica para dos huéspedes que prefieren camas separadas.',
        90,
        110,
        140,
        'https://res.cloudinary.com/do48g4nod/image/upload/v1784240278/casa-huespedes-pimentel/rooms/cqcbc0gwblckvqpgnleq.jpg',
        2,
        TRUE
    ),
    (
        'triple',
        'Triple',
        4,
        3,
        '3 camas de 1½ plaza',
        'Pensada para grupos pequeños o familias de hasta tres huéspedes.',
        120,
        150,
        170,
        'https://res.cloudinary.com/do48g4nod/image/upload/v1784240493/casa-huespedes-pimentel/rooms/ags9mfxnpnxckzrig0ap.jpg',
        3,
        TRUE
    ),
    (
        'familiar',
        'Familiar',
        2,
        5,
        'Distribución familiar',
        'Una alternativa amplia para familias o grupos de hasta cinco huéspedes.',
        160,
        190,
        220,
        'https://res.cloudinary.com/do48g4nod/image/upload/v1784240528/casa-huespedes-pimentel/rooms/xchf8b85qtstgp7wb0w2.jpg',
        4,
        TRUE
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    total_quantity = EXCLUDED.total_quantity,
    capacity = EXCLUDED.capacity,
    bed_description = EXCLUDED.bed_description,
    description = EXCLUDED.description,
    price_low = EXCLUDED.price_low,
    price_medium = EXCLUDED.price_medium,
    price_high = EXCLUDED.price_high,
    image_url = EXCLUDED.image_url,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS category_slug VARCHAR(40);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rooms_category_slug_fkey'
    ) THEN
        ALTER TABLE public.rooms
            ADD CONSTRAINT rooms_category_slug_fkey
            FOREIGN KEY (category_slug)
            REFERENCES public.room_categories(slug)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;
END $$;

UPDATE public.rooms
SET category_slug = CASE
    WHEN name ILIKE '%Matrimonial%' THEN 'matrimonial'
    WHEN name ILIKE '%Doble%' THEN 'doble'
    WHEN name ILIKE '%Triple%' THEN 'triple'
    WHEN name ILIKE '%Familiar%' THEN 'familiar'
    ELSE category_slug
END
WHERE
    name ILIKE '%Matrimonial%'
    OR name ILIKE '%Doble%'
    OR name ILIKE '%Triple%'
    OR name ILIKE '%Familiar%';

CREATE INDEX IF NOT EXISTS idx_rooms_category_slug
ON public.rooms(category_slug);
