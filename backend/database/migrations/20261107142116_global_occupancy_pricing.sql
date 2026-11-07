-- Approved occupancy prices, internal to the reservation backend.
CREATE TABLE public.room_category_occupancy_rates (
  category_slug varchar(80) NOT NULL REFERENCES public.room_categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  occupancy smallint NOT NULL CHECK (occupancy BETWEEN 1 AND 5),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  PRIMARY KEY (category_slug, occupancy)
);
ALTER TABLE public.room_category_occupancy_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.room_category_occupancy_rates FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE public.room_category_occupancy_rates IS 'Internal occupancy pricing. Not exposed through the guest-facing APIs or model tools.';
INSERT INTO public.room_category_occupancy_rates(category_slug, occupancy, amount) VALUES
  ('matrimonial',1,100),('matrimonial',2,120),
  ('matrimonial-ejecutiva',1,120),('matrimonial-ejecutiva',2,140),
  ('doble',1,120),('doble',2,140),
  ('triple',1,170),('triple',2,190),('triple',3,210),
  ('familiar',1,170),('familiar',2,190),('familiar',3,210),('familiar',4,230),('familiar',5,250),
  ('familiar-2',1,170),('familiar-2',2,190),('familiar-2',3,210),('familiar-2',4,230),('familiar-2',5,250);
-- One durable processing acknowledgement, separate from the final assistant reply.
CREATE UNIQUE INDEX uq_meta_messages_processing_reply
  ON public.meta_messages(in_reply_to_message_id)
  WHERE direction = 'outgoing' AND author = 'system' AND in_reply_to_message_id IS NOT NULL;

-- Keep the administrative policy register aligned with the approved calculation.
UPDATE public.hotel_policy_rules
SET config = (config - 'percent_of_min_max_differential') ||
  '{"percent_of_adult_single_differential":50,"differential_basis":"adult_occupancy_rate_minus_single_rate","maximum_charge_basis":"all_guests_as_adults_same_category","automatic_final_quote":true,"availability_requires_human_review":true,"guest_facing_age_thresholds":false}'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE code = 'ninos_5_8';
