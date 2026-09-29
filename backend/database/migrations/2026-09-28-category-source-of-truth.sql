-- ============================================================
-- CATEGORÍA COMO FUENTE DE VERDAD COMERCIAL
-- Precio, capacidad e inventario se manejan por categoría.
-- Las habitaciones físicas son unidades internas asignables.
-- ============================================================

UPDATE public.rooms r
SET
  capacity = rc.capacity,
  price_per_night = rc.price_per_night,
  updated_at = CURRENT_TIMESTAMP
FROM public.room_categories rc
WHERE r.category_slug = rc.slug;

UPDATE public.room_categories rc
SET
  total_quantity = (
    SELECT COUNT(*)::INTEGER
    FROM public.rooms r
    WHERE r.category_slug = rc.slug
  ),
  updated_at = CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION public.sync_room_category_commercial_values()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category_slug IS NOT NULL THEN
    SELECT rc.capacity, rc.price_per_night
    INTO NEW.capacity, NEW.price_per_night
    FROM public.room_categories rc
    WHERE rc.slug = NEW.category_slug;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Categoría de habitación no válida: %', NEW.category_slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rooms_sync_category_values ON public.rooms;
CREATE TRIGGER trg_rooms_sync_category_values
BEFORE INSERT OR UPDATE OF category_slug
ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.sync_room_category_commercial_values();

CREATE OR REPLACE FUNCTION public.refresh_room_category_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  old_slug TEXT;
  new_slug TEXT;
BEGIN
  old_slug := CASE WHEN TG_OP <> 'INSERT' THEN OLD.category_slug ELSE NULL END;
  new_slug := CASE WHEN TG_OP <> 'DELETE' THEN NEW.category_slug ELSE NULL END;

  IF old_slug IS NOT NULL THEN
    UPDATE public.room_categories rc
    SET
      total_quantity = (
        SELECT COUNT(*)::INTEGER
        FROM public.rooms r
        WHERE r.category_slug = old_slug
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE rc.slug = old_slug;
  END IF;

  IF new_slug IS NOT NULL AND new_slug IS DISTINCT FROM old_slug THEN
    UPDATE public.room_categories rc
    SET
      total_quantity = (
        SELECT COUNT(*)::INTEGER
        FROM public.rooms r
        WHERE r.category_slug = new_slug
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE rc.slug = new_slug;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_rooms_refresh_category_quantity ON public.rooms;
CREATE TRIGGER trg_rooms_refresh_category_quantity
AFTER INSERT OR DELETE OR UPDATE OF category_slug
ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.refresh_room_category_quantity();

CREATE OR REPLACE FUNCTION public.propagate_category_commercial_values()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.rooms
  SET
    capacity = NEW.capacity,
    price_per_night = NEW.price_per_night,
    updated_at = CURRENT_TIMESTAMP
  WHERE category_slug = NEW.slug;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_propagate_values ON public.room_categories;
CREATE TRIGGER trg_categories_propagate_values
AFTER UPDATE OF capacity, price_per_night
ON public.room_categories
FOR EACH ROW
WHEN (
  OLD.capacity IS DISTINCT FROM NEW.capacity
  OR OLD.price_per_night IS DISTINCT FROM NEW.price_per_night
)
EXECUTE FUNCTION public.propagate_category_commercial_values();
