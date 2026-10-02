BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stay_type varchar NOT NULL DEFAULT 'full_day',
  ADD COLUMN IF NOT EXISTS check_out_time time without time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_stay_type_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_stay_type_check
      CHECK (stay_type IN ('full_day', 'until_time'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_until_time_requires_checkout_time'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_until_time_requires_checkout_time
      CHECK (
        stay_type <> 'until_time'
        OR check_out_time IS NOT NULL
      );
  END IF;
END $$;

COMMIT;
