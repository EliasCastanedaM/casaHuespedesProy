-- Immutable delivery plan for text and clickable URL button parts.
ALTER TABLE public.meta_messages
  ADD COLUMN IF NOT EXISTS delivery_parts jsonb;
