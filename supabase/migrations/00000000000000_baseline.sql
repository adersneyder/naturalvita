-- ────────────────────────────────────────────────────────────────────────────
-- NaturalVita · BASELINE del esquema de Supabase (proyecto qheynvhdjdnqywyaekpq)
--
-- Este archivo es un volcado del esquema `public` de producción al momento
-- de su generación. NO es ejecutado por la app; existe para:
--   1. Disaster recovery: poder reconstruir el esquema desde cero en una nueva
--      instancia si Supabase se cae o hay que migrar de cuenta.
--   2. Code review: ver en PR cómo cambia el esquema sin abrir el dashboard.
--   3. Onboarding: que cualquier dev nuevo entienda la estructura sin acceso
--      al panel.
--
-- Fuente de verdad sigue siendo la base de datos remota. Toda migración nueva
-- se aplica vía el MCP de Supabase (`apply_migration`) y se versiona en un
-- archivo `supabase/migrations/<YYYYMMDDHHMMSS>_<nombre>.sql` aparte. Este
-- baseline se regenera periódicamente para reflejar el estado real.
--
-- Reconstruido vía catálogo de Postgres (pg_get_*def, information_schema).
-- Las tablas/objetos gestionados por Supabase (auth, storage, vault, realtime)
-- NO se incluyen aquí: solo schema `public`.
-- ────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================

create extension if not exists "pg_cron" with schema pg_catalog;
create extension if not exists "pg_net" with schema public;
create extension if not exists "pg_stat_statements" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "supabase_vault" with schema vault;
create extension if not exists "uuid-ossp" with schema extensions;

-- ============================================================================
-- 2. TABLAS (schema public)
-- ============================================================================

create table public.addresses (
  id uuid default gen_random_uuid() not null,
  customer_id uuid not null,
  label text,
  recipient_name text not null,
  phone text not null,
  street text not null,
  details text,
  city text not null,
  department text not null,
  postal_code text,
  country text default 'CO'::text not null,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.admin_allowlist (
  email text not null,
  role text not null,
  full_name text,
  added_at timestamptz default now() not null
);

create table public.admin_invitations (
  id uuid default gen_random_uuid() not null,
  email text not null,
  role text not null,
  full_name text,
  invited_by uuid,
  status text default 'pending'::text not null,
  invited_at timestamptz default now() not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz default (now() + '7 days'::interval) not null
);

create table public.admin_users (
  id uuid not null,
  email text not null,
  full_name text,
  role text not null,
  is_active boolean default true not null,
  last_login_at timestamptz,
  created_at timestamptz default now() not null
);

create table public.ai_generation_log (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  triggered_by uuid,
  prompt_template_id text not null,
  prompt_input jsonb,
  model text not null,
  status text not null,
  output_raw text,
  output_parsed jsonb,
  regulatory_issues text[],
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10,6),
  duration_ms integer,
  error_message text,
  applied_to_product boolean default false,
  applied_at timestamptz,
  created_at timestamptz default now() not null
);

create table public.cart_items (
  id uuid default gen_random_uuid() not null,
  cart_id uuid not null,
  product_id uuid not null,
  quantity integer not null,
  price_cop_at_add integer not null,
  added_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.carts (
  id uuid default gen_random_uuid() not null,
  customer_id uuid,
  visitor_id uuid,
  status text default 'active'::text not null,
  abandoned_at timestamptz,
  recovery_email_sent_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.categories (
  id uuid default gen_random_uuid() not null,
  name text not null,
  slug text not null,
  description text,
  parent_id uuid,
  image_url text,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  suggested_tax_rate_id uuid
);

create table public.chat_conversations (
  id uuid default gen_random_uuid() not null,
  visitor_id uuid,
  customer_id uuid,
  started_at timestamptz default now() not null,
  last_message_at timestamptz default now() not null,
  message_count integer default 0 not null,
  resolved boolean default false not null,
  led_to_purchase boolean default false not null
);

create table public.chat_messages (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid not null,
  role text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create table public.collections (
  id uuid default gen_random_uuid() not null,
  name text not null,
  slug text not null,
  description text,
  cover_image_url text,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  is_featured boolean default false not null,
  meta_title text,
  meta_description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.content_units (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  symbol text not null,
  unit_family text not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table public.coupon_redemptions (
  id uuid default gen_random_uuid() not null,
  coupon_id uuid not null,
  order_id uuid not null,
  customer_email text not null,
  discount_applied_cop integer not null,
  redeemed_at timestamptz default now() not null
);

create table public.coupons (
  id uuid default gen_random_uuid() not null,
  code text not null,
  description text not null,
  discount_type text not null,
  discount_value integer not null,
  max_discount_cop integer,
  min_order_cop integer default 0 not null,
  max_total_uses integer,
  max_uses_per_customer integer default 1 not null,
  used_count integer default 0 not null,
  is_active boolean default true not null,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.csv_imports (
  id uuid default gen_random_uuid() not null,
  data_source_id uuid,
  admin_user_id uuid,
  filename text not null,
  file_url text,
  rows_total integer,
  rows_imported integer default 0,
  rows_failed integer default 0,
  status text default 'pending'::text not null,
  error_log jsonb,
  created_at timestamptz default now() not null,
  completed_at timestamptz
);

create table public.customers (
  id uuid not null,
  email text not null,
  full_name text,
  phone text,
  document_type text,
  document_number text,
  accepts_marketing boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.data_sources (
  id uuid default gen_random_uuid() not null,
  laboratory_id uuid,
  name text not null,
  type text not null,
  base_url text,
  catalog_url text,
  scraper_strategy text,
  scraper_config jsonb default '{}'::jsonb,
  last_run_at timestamptz,
  last_run_status text,
  last_run_products_found integer default 0,
  last_run_error text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.email_suppressions (
  id uuid default gen_random_uuid() not null,
  email text not null,
  reason text not null,
  sub_reason text,
  diagnostic_code text,
  source text default 'aws_ses'::text not null,
  suppressed_at timestamptz default now() not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.events (
  id uuid default gen_random_uuid() not null,
  visitor_id uuid,
  customer_id uuid,
  session_id uuid,
  event_type text not null,
  product_id uuid,
  category_id uuid,
  page_url text,
  page_title text,
  referrer text,
  properties jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now() not null
);

create table public.inventory_locations (
  id uuid default gen_random_uuid() not null,
  name text not null,
  type text not null,
  address text,
  city text,
  is_default boolean default false not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table public.laboratories (
  id uuid default gen_random_uuid() not null,
  name text not null,
  slug text not null,
  website_url text,
  scrape_url text,
  logo_url text,
  description text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.newsletter_subscribers (
  id uuid default gen_random_uuid() not null,
  email text not null,
  status text default 'subscribed'::text not null,
  source text,
  unsubscribe_token text default replace((gen_random_uuid())::text, '-'::text, ''::text) not null,
  full_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unsubscribed_at timestamptz,
  quiz_properties jsonb
);

create table public.order_items (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  product_id uuid,
  product_name text not null,
  product_sku text,
  product_image_url text,
  quantity integer not null,
  unit_price_cop integer not null,
  subtotal_cop integer not null,
  created_at timestamptz default now() not null
);

create table public.orders (
  id uuid default gen_random_uuid() not null,
  order_number text not null,
  customer_id uuid,
  cart_id uuid,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  shipping_recipient text not null,
  shipping_phone text not null,
  shipping_street text not null,
  shipping_details text,
  shipping_city text not null,
  shipping_department text not null,
  shipping_postal_code text,
  shipping_country text default 'CO'::text not null,
  subtotal_cop integer not null,
  shipping_cop integer default 0 not null,
  tax_cop integer default 0 not null,
  discount_cop integer default 0 not null,
  total_cop integer not null,
  status text default 'pending'::text not null,
  payment_status text default 'pending'::text not null,
  fulfillment_status text default 'unfulfilled'::text not null,
  bold_payment_id text,
  bold_payment_link text,
  paid_at timestamptz,
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  shipping_carrier text,
  coupon_code text
);

create table public.presentation_types (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  description text,
  default_unit text default 'units'::text not null,
  unit_family text not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table public.product_attribute_options (
  id uuid default gen_random_uuid() not null,
  attribute_id uuid not null,
  value text not null,
  slug text not null,
  sort_order integer default 0
);

create table public.product_attribute_values (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  attribute_id uuid not null,
  option_id uuid,
  text_value text,
  created_at timestamptz default now() not null
);

create table public.product_attributes (
  id uuid default gen_random_uuid() not null,
  name text not null,
  slug text not null,
  description text,
  attribute_type text default 'boolean'::text not null,
  is_filterable boolean default true not null,
  show_in_card boolean default false not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table public.product_collections (
  product_id uuid not null,
  collection_id uuid not null,
  sort_order integer default 0,
  added_at timestamptz default now() not null
);

create table public.product_images (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  url text not null,
  alt_text text,
  sort_order integer default 0 not null,
  is_primary boolean default false not null,
  created_at timestamptz default now() not null
);

create table public.product_inventory (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  location_id uuid not null,
  stock integer default 0 not null,
  reserved integer default 0 not null,
  low_stock_threshold integer default 5,
  updated_at timestamptz default now() not null
);

create table public.product_reviews (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  customer_id uuid not null,
  order_id uuid,
  rating smallint not null,
  title text,
  body text,
  status text default 'approved'::text not null,
  admin_reply text,
  admin_replied_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.products (
  id uuid default gen_random_uuid() not null,
  laboratory_id uuid not null,
  category_id uuid,
  name text not null,
  slug text not null,
  sku text,
  external_id text,
  short_description text,
  description text,
  ingredients text,
  usage_instructions text,
  warnings text,
  price_cop integer not null,
  compare_at_price_cop integer,
  cost_cop integer,
  stock integer default 0 not null,
  track_stock boolean default false not null,
  meta_title text,
  meta_description text,
  search_keywords text,
  is_active boolean default true not null,
  is_featured boolean default false not null,
  scraped_at timestamptz,
  scrape_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  invima_number text,
  presentation text,
  weight_grams integer,
  tags text[] default '{}'::text[],
  status text default 'draft'::text not null,
  source_url text,
  needs_review boolean default true not null,
  source_type text default 'lab_partner'::text not null,
  data_source_id uuid,
  source_price_cop integer,
  source_price_updated_at timestamptz,
  tax_rate_id uuid not null,
  last_synced_at timestamptz,
  presentation_type text,
  content_value numeric(10,3),
  content_unit text,
  last_image_error text,
  last_image_attempt_at timestamptz,
  full_description text,
  composition_use text,
  dosage text,
  ai_metadata jsonb,
  search_vector tsvector,
  reco_content_hash text,
  reco_synced_hash text,
  reco_synced_at timestamptz,
  equivalence_group text
);

create table public.quiz_match_cache (
  id uuid default gen_random_uuid() not null,
  cache_key text not null,
  etapa text not null,
  objetivo text not null,
  recommendations jsonb not null,
  model text default 'claude-haiku-4-5-20251001'::text not null,
  hit_count integer default 0 not null,
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + '24:00:00'::interval) not null
);

create table public.quiz_needs (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  name text not null,
  tagline text,
  description text,
  icon text,
  sort_order integer default 100 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.quiz_reco_sync_runs (
  id uuid default gen_random_uuid() not null,
  trigger_source text not null,
  dirty_count integer default 0 not null,
  processed integer default 0 not null,
  failed integer default 0 not null,
  status text default 'running'::text not null,
  error_detail text,
  started_at timestamptz default now() not null,
  finished_at timestamptz
);

create table public.quiz_recommendations (
  id uuid default gen_random_uuid() not null,
  need_id uuid not null,
  product_id uuid not null,
  relevance_tier text not null,
  score integer default 0 not null,
  reason text,
  suitable_stages text[] default '{}'::text[] not null,
  review_status text default 'pending'::text not null,
  generated_by text,
  generated_at timestamptz default now() not null
);

create table public.quiz_results (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  etapa text not null,
  objetivo text not null,
  products jsonb not null,
  customer_id uuid,
  email text,
  view_count integer default 0 not null,
  created_at timestamptz default now() not null
);

create table public.scraping_jobs (
  id uuid default gen_random_uuid() not null,
  data_source_id uuid not null,
  triggered_by uuid,
  status text default 'pending'::text not null,
  products_found integer default 0,
  products_created integer default 0,
  products_updated integer default 0,
  products_skipped integer default 0,
  products_failed integer default 0,
  batch_size integer default 20,
  last_offset integer default 0,
  total_pages integer,
  error_message text,
  log jsonb default '[]'::jsonb,
  started_at timestamptz default now() not null,
  paused_at timestamptz,
  completed_at timestamptz,
  last_progress_at timestamptz default now()
);

create table public.shipping_rates (
  id uuid default gen_random_uuid() not null,
  department text not null,
  flat_cop integer not null,
  free_above_cop integer,
  is_active boolean default true not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.tax_rates (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  rate_percent numeric(5,2) not null,
  tax_type text not null,
  description text,
  is_default boolean default false not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table public.visitors (
  id uuid default gen_random_uuid() not null,
  customer_id uuid,
  fingerprint text,
  user_agent text,
  ip_address inet,
  country text,
  city text,
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  first_referrer text,
  first_landing_page text,
  visit_count integer default 1 not null,
  page_view_count integer default 0 not null,
  total_time_seconds integer default 0 not null,
  first_seen_at timestamptz default now() not null,
  last_seen_at timestamptz default now() not null
);

create table public.wishlist_items (
  id uuid default gen_random_uuid() not null,
  customer_id uuid not null,
  product_id uuid not null,
  created_at timestamptz default now() not null
);

-- ============================================================================
-- 3. PRIMARY KEYS Y UNIQUE CONSTRAINTS
-- ============================================================================

alter table public.addresses add constraint addresses_pkey primary key (id);
alter table public.admin_allowlist add constraint admin_allowlist_pkey primary key (email);
alter table public.admin_invitations add constraint admin_invitations_email_key unique (email);
alter table public.admin_invitations add constraint admin_invitations_pkey primary key (id);
alter table public.admin_users add constraint admin_users_email_key unique (email);
alter table public.admin_users add constraint admin_users_pkey primary key (id);
alter table public.ai_generation_log add constraint ai_generation_log_pkey primary key (id);
alter table public.cart_items add constraint cart_items_cart_id_product_id_key unique (cart_id, product_id);
alter table public.cart_items add constraint cart_items_pkey primary key (id);
alter table public.carts add constraint carts_pkey primary key (id);
alter table public.categories add constraint categories_slug_key unique (slug);
alter table public.categories add constraint categories_pkey primary key (id);
alter table public.chat_conversations add constraint chat_conversations_pkey primary key (id);
alter table public.chat_messages add constraint chat_messages_pkey primary key (id);
alter table public.collections add constraint collections_slug_key unique (slug);
alter table public.collections add constraint collections_pkey primary key (id);
alter table public.content_units add constraint content_units_code_key unique (code);
alter table public.content_units add constraint content_units_pkey primary key (id);
alter table public.coupon_redemptions add constraint coupon_redemptions_pkey primary key (id);
alter table public.coupons add constraint coupons_code_key unique (code);
alter table public.coupons add constraint coupons_pkey primary key (id);
alter table public.csv_imports add constraint csv_imports_pkey primary key (id);
alter table public.customers add constraint customers_email_key unique (email);
alter table public.customers add constraint customers_pkey primary key (id);
alter table public.data_sources add constraint data_sources_pkey primary key (id);
alter table public.email_suppressions add constraint email_suppressions_email_key unique (email);
alter table public.email_suppressions add constraint email_suppressions_pkey primary key (id);
alter table public.events add constraint events_pkey primary key (id);
alter table public.inventory_locations add constraint inventory_locations_pkey primary key (id);
alter table public.laboratories add constraint laboratories_name_key unique (name);
alter table public.laboratories add constraint laboratories_slug_key unique (slug);
alter table public.laboratories add constraint laboratories_pkey primary key (id);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_email_key unique (email);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_pkey primary key (id);
alter table public.order_items add constraint order_items_pkey primary key (id);
alter table public.orders add constraint orders_order_number_key unique (order_number);
alter table public.orders add constraint orders_pkey primary key (id);
alter table public.presentation_types add constraint presentation_types_code_key unique (code);
alter table public.presentation_types add constraint presentation_types_pkey primary key (id);
alter table public.product_attribute_options add constraint product_attribute_options_attribute_id_slug_key unique (attribute_id, slug);
alter table public.product_attribute_options add constraint product_attribute_options_pkey primary key (id);
alter table public.product_attribute_values add constraint product_attribute_values_pkey primary key (id);
alter table public.product_attributes add constraint product_attributes_slug_key unique (slug);
alter table public.product_attributes add constraint product_attributes_pkey primary key (id);
alter table public.product_collections add constraint product_collections_pkey primary key (product_id, collection_id);
alter table public.product_images add constraint product_images_pkey primary key (id);
alter table public.product_inventory add constraint product_inventory_product_id_location_id_key unique (product_id, location_id);
alter table public.product_inventory add constraint product_inventory_pkey primary key (id);
alter table public.product_reviews add constraint product_reviews_customer_id_product_id_key unique (customer_id, product_id);
alter table public.product_reviews add constraint product_reviews_pkey primary key (id);
alter table public.products add constraint products_laboratory_id_external_id_key unique (laboratory_id, external_id);
alter table public.products add constraint products_sku_key unique (sku);
alter table public.products add constraint products_slug_key unique (slug);
alter table public.products add constraint products_pkey primary key (id);
alter table public.quiz_match_cache add constraint quiz_match_cache_cache_key_key unique (cache_key);
alter table public.quiz_match_cache add constraint quiz_match_cache_pkey primary key (id);
alter table public.quiz_needs add constraint quiz_needs_slug_key unique (slug);
alter table public.quiz_needs add constraint quiz_needs_pkey primary key (id);
alter table public.quiz_reco_sync_runs add constraint quiz_reco_sync_runs_pkey primary key (id);
alter table public.quiz_recommendations add constraint quiz_recommendations_need_id_product_id_key unique (need_id, product_id);
alter table public.quiz_recommendations add constraint quiz_recommendations_pkey primary key (id);
alter table public.quiz_results add constraint quiz_results_slug_key unique (slug);
alter table public.quiz_results add constraint quiz_results_pkey primary key (id);
alter table public.scraping_jobs add constraint scraping_jobs_pkey primary key (id);
alter table public.shipping_rates add constraint shipping_rates_department_key unique (department);
alter table public.shipping_rates add constraint shipping_rates_pkey primary key (id);
alter table public.tax_rates add constraint tax_rates_code_key unique (code);
alter table public.tax_rates add constraint tax_rates_pkey primary key (id);
alter table public.visitors add constraint visitors_pkey primary key (id);
alter table public.wishlist_items add constraint wishlist_items_customer_id_product_id_key unique (customer_id, product_id);
alter table public.wishlist_items add constraint wishlist_items_pkey primary key (id);

-- ============================================================================
-- 4. CHECK CONSTRAINTS
-- ============================================================================

alter table public.admin_allowlist add constraint admin_allowlist_role_check check ((role = any (array['owner'::text, 'admin'::text, 'editor'::text, 'cashier'::text, 'warehouse'::text])));
alter table public.admin_invitations add constraint admin_invitations_role_check check ((role = any (array['owner'::text, 'admin'::text, 'editor'::text, 'cashier'::text, 'warehouse'::text])));
alter table public.admin_invitations add constraint admin_invitations_status_check check ((status = any (array['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text])));
alter table public.admin_users add constraint admin_users_role_check check ((role = any (array['owner'::text, 'admin'::text, 'editor'::text, 'cashier'::text, 'warehouse'::text])));
alter table public.ai_generation_log add constraint ai_generation_log_status_check check ((status = any (array['success'::text, 'regulatory_failed'::text, 'api_error'::text, 'parse_error'::text])));
alter table public.cart_items add constraint cart_items_quantity_check check ((quantity > 0));
alter table public.carts add constraint carts_check check (((customer_id is not null) or (visitor_id is not null)));
alter table public.carts add constraint carts_status_check check ((status = any (array['active'::text, 'abandoned'::text, 'converted'::text, 'expired'::text])));
alter table public.chat_messages add constraint chat_messages_role_check check ((role = any (array['user'::text, 'assistant'::text, 'system'::text])));
alter table public.content_units add constraint content_units_unit_family_check check ((unit_family = any (array['mass'::text, 'volume'::text, 'count'::text, 'other'::text])));
alter table public.coupon_redemptions add constraint coupon_redemptions_discount_applied_cop_check check ((discount_applied_cop >= 0));
alter table public.coupons add constraint coupons_discount_type_check check ((discount_type = any (array['percentage'::text, 'fixed'::text])));
alter table public.coupons add constraint coupons_discount_value_check check ((discount_value > 0));
alter table public.csv_imports add constraint csv_imports_status_check check ((status = any (array['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])));
alter table public.data_sources add constraint data_sources_last_run_status_check check ((last_run_status = any (array['success'::text, 'partial'::text, 'failed'::text, 'running'::text])));
alter table public.data_sources add constraint data_sources_scraper_strategy_check check ((scraper_strategy = any (array['woocommerce'::text, 'magento'::text, 'shopify'::text, 'custom_html'::text, 'headless_browser'::text])));
alter table public.data_sources add constraint data_sources_type_check check ((type = any (array['scraper'::text, 'csv_import'::text, 'manual'::text, 'api'::text])));
alter table public.email_suppressions add constraint email_suppressions_reason_check check ((reason = any (array['hard_bounce'::text, 'complaint'::text, 'unsubscribe'::text, 'manual'::text, 'role_address'::text])));
alter table public.inventory_locations add constraint inventory_locations_type_check check ((type = any (array['warehouse'::text, 'retail_store'::text, 'dropship'::text])));
alter table public.newsletter_subscribers add constraint newsletter_subscribers_status_check check ((status = any (array['subscribed'::text, 'unsubscribed'::text, 'bounced'::text])));
alter table public.order_items add constraint order_items_quantity_check check ((quantity > 0));
alter table public.order_items add constraint order_items_subtotal_cop_check check ((subtotal_cop >= 0));
alter table public.order_items add constraint order_items_unit_price_cop_check check ((unit_price_cop >= 0));
alter table public.orders add constraint orders_discount_cop_check check ((discount_cop >= 0));
alter table public.orders add constraint orders_fulfillment_status_check check ((fulfillment_status = any (array['unfulfilled'::text, 'partial'::text, 'fulfilled'::text])));
alter table public.orders add constraint orders_payment_status_check check ((payment_status = any (array['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'partially_refunded'::text])));
alter table public.orders add constraint orders_shipping_cop_check check ((shipping_cop >= 0));
alter table public.orders add constraint orders_status_check check ((status = any (array['pending'::text, 'paid'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text])));
alter table public.orders add constraint orders_subtotal_cop_check check ((subtotal_cop >= 0));
alter table public.orders add constraint orders_tax_cop_check check ((tax_cop >= 0));
alter table public.orders add constraint orders_total_cop_check check ((total_cop >= 0));
alter table public.presentation_types add constraint presentation_types_unit_family_check check ((unit_family = any (array['mass'::text, 'volume'::text, 'count'::text, 'other'::text])));
alter table public.product_attributes add constraint product_attributes_attribute_type_check check ((attribute_type = any (array['boolean'::text, 'select'::text, 'multi_select'::text])));
alter table public.product_inventory add constraint product_inventory_reserved_check check ((reserved >= 0));
alter table public.product_inventory add constraint product_inventory_stock_check check ((stock >= 0));
alter table public.product_reviews add constraint product_reviews_body_check check ((char_length(body) <= 2000));
alter table public.product_reviews add constraint product_reviews_rating_check check (((rating >= 1) and (rating <= 5)));
alter table public.product_reviews add constraint product_reviews_status_check check ((status = any (array['pending'::text, 'approved'::text, 'rejected'::text])));
alter table public.product_reviews add constraint product_reviews_title_check check ((char_length(title) <= 120));
alter table public.products add constraint products_check check (((compare_at_price_cop is null) or (compare_at_price_cop >= price_cop)));
alter table public.products add constraint products_price_cop_check check ((price_cop >= 0));
alter table public.products add constraint products_source_type_check check ((source_type = any (array['lab_partner'::text, 'own_brand'::text, 'third_party'::text])));
alter table public.products add constraint products_status_check check ((status = any (array['draft'::text, 'pending_review'::text, 'active'::text, 'archived'::text, 'out_of_stock'::text])));
alter table public.products add constraint products_stock_check check ((stock >= 0));
alter table public.quiz_reco_sync_runs add constraint quiz_reco_sync_runs_status_check check ((status = any (array['running'::text, 'completed'::text, 'failed'::text])));
alter table public.quiz_recommendations add constraint quiz_recommendations_relevance_tier_check check ((relevance_tier = any (array['direct'::text, 'adjuvant'::text])));
alter table public.quiz_recommendations add constraint quiz_recommendations_review_status_check check ((review_status = any (array['pending'::text, 'approved'::text, 'rejected'::text])));
alter table public.quiz_recommendations add constraint quiz_recommendations_score_check check (((score >= 0) and (score <= 100)));
alter table public.scraping_jobs add constraint scraping_jobs_status_check check ((status = any (array['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])));
alter table public.shipping_rates add constraint shipping_rates_flat_cop_check check ((flat_cop >= 0));
alter table public.tax_rates add constraint tax_rates_rate_percent_check check (((rate_percent >= (0)::numeric) and (rate_percent <= (100)::numeric)));
alter table public.tax_rates add constraint tax_rates_tax_type_check check ((tax_type = any (array['included'::text, 'excluded'::text, 'exempt'::text, 'zero_rated'::text])));

-- ============================================================================
-- 5. FOREIGN KEYS
-- ============================================================================

alter table public.addresses add constraint addresses_customer_id_fkey foreign key (customer_id) references customers(id) on delete cascade;
alter table public.admin_invitations add constraint admin_invitations_invited_by_fkey foreign key (invited_by) references admin_users(id) on delete set null;
alter table public.admin_users add constraint admin_users_id_fkey foreign key (id) references auth.users(id) on delete cascade;
alter table public.ai_generation_log add constraint ai_generation_log_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.ai_generation_log add constraint ai_generation_log_triggered_by_fkey foreign key (triggered_by) references admin_users(id) on delete set null;
alter table public.cart_items add constraint cart_items_cart_id_fkey foreign key (cart_id) references carts(id) on delete cascade;
alter table public.cart_items add constraint cart_items_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.carts add constraint carts_customer_id_fkey foreign key (customer_id) references customers(id) on delete cascade;
alter table public.carts add constraint carts_visitor_id_fkey foreign key (visitor_id) references visitors(id) on delete set null;
alter table public.categories add constraint categories_parent_id_fkey foreign key (parent_id) references categories(id) on delete set null;
alter table public.categories add constraint categories_suggested_tax_rate_id_fkey foreign key (suggested_tax_rate_id) references tax_rates(id) on delete set null;
alter table public.chat_conversations add constraint chat_conversations_customer_id_fkey foreign key (customer_id) references customers(id) on delete set null;
alter table public.chat_conversations add constraint chat_conversations_visitor_id_fkey foreign key (visitor_id) references visitors(id) on delete set null;
alter table public.chat_messages add constraint chat_messages_conversation_id_fkey foreign key (conversation_id) references chat_conversations(id) on delete cascade;
alter table public.coupon_redemptions add constraint coupon_redemptions_coupon_id_fkey foreign key (coupon_id) references coupons(id) on delete restrict;
alter table public.coupon_redemptions add constraint coupon_redemptions_order_id_fkey foreign key (order_id) references orders(id) on delete cascade;
alter table public.csv_imports add constraint csv_imports_admin_user_id_fkey foreign key (admin_user_id) references admin_users(id) on delete set null;
alter table public.csv_imports add constraint csv_imports_data_source_id_fkey foreign key (data_source_id) references data_sources(id) on delete set null;
alter table public.customers add constraint customers_id_fkey foreign key (id) references auth.users(id) on delete cascade;
alter table public.data_sources add constraint data_sources_laboratory_id_fkey foreign key (laboratory_id) references laboratories(id) on delete cascade;
alter table public.events add constraint events_category_id_fkey foreign key (category_id) references categories(id) on delete set null;
alter table public.events add constraint events_customer_id_fkey foreign key (customer_id) references customers(id) on delete set null;
alter table public.events add constraint events_product_id_fkey foreign key (product_id) references products(id) on delete set null;
alter table public.events add constraint events_visitor_id_fkey foreign key (visitor_id) references visitors(id) on delete set null;
alter table public.order_items add constraint order_items_order_id_fkey foreign key (order_id) references orders(id) on delete cascade;
alter table public.order_items add constraint order_items_product_id_fkey foreign key (product_id) references products(id) on delete set null;
alter table public.orders add constraint orders_cart_id_fkey foreign key (cart_id) references carts(id) on delete set null;
alter table public.orders add constraint orders_customer_id_fkey foreign key (customer_id) references customers(id) on delete set null;
alter table public.product_attribute_options add constraint product_attribute_options_attribute_id_fkey foreign key (attribute_id) references product_attributes(id) on delete cascade;
alter table public.product_attribute_values add constraint product_attribute_values_attribute_id_fkey foreign key (attribute_id) references product_attributes(id) on delete cascade;
alter table public.product_attribute_values add constraint product_attribute_values_option_id_fkey foreign key (option_id) references product_attribute_options(id) on delete cascade;
alter table public.product_attribute_values add constraint product_attribute_values_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.product_collections add constraint product_collections_collection_id_fkey foreign key (collection_id) references collections(id) on delete cascade;
alter table public.product_collections add constraint product_collections_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.product_images add constraint product_images_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.product_inventory add constraint product_inventory_location_id_fkey foreign key (location_id) references inventory_locations(id) on delete cascade;
alter table public.product_inventory add constraint product_inventory_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.product_reviews add constraint product_reviews_customer_id_fkey foreign key (customer_id) references customers(id) on delete cascade;
alter table public.product_reviews add constraint product_reviews_order_id_fkey foreign key (order_id) references orders(id) on delete set null;
alter table public.product_reviews add constraint product_reviews_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.products add constraint products_category_id_fkey foreign key (category_id) references categories(id) on delete set null;
alter table public.products add constraint products_data_source_id_fkey foreign key (data_source_id) references data_sources(id) on delete set null;
alter table public.products add constraint products_laboratory_id_fkey foreign key (laboratory_id) references laboratories(id) on delete restrict;
alter table public.products add constraint products_tax_rate_id_fkey foreign key (tax_rate_id) references tax_rates(id) on delete restrict;
alter table public.quiz_recommendations add constraint quiz_recommendations_need_id_fkey foreign key (need_id) references quiz_needs(id) on delete cascade;
alter table public.quiz_recommendations add constraint quiz_recommendations_product_id_fkey foreign key (product_id) references products(id) on delete cascade;
alter table public.quiz_results add constraint quiz_results_customer_id_fkey foreign key (customer_id) references customers(id) on delete set null;
alter table public.scraping_jobs add constraint scraping_jobs_data_source_id_fkey foreign key (data_source_id) references data_sources(id) on delete cascade;
alter table public.scraping_jobs add constraint scraping_jobs_triggered_by_fkey foreign key (triggered_by) references admin_users(id) on delete set null;
alter table public.visitors add constraint visitors_customer_id_fkey foreign key (customer_id) references customers(id) on delete set null;
alter table public.wishlist_items add constraint wishlist_items_customer_id_fkey foreign key (customer_id) references customers(id) on delete cascade;
alter table public.wishlist_items add constraint wishlist_items_product_id_fkey foreign key (product_id) references products(id) on delete cascade;

-- ============================================================================
-- 6. ÍNDICES (no implícitos de PK/UNIQUE)
-- ============================================================================

CREATE INDEX idx_addresses_customer ON public.addresses USING btree (customer_id);
CREATE INDEX idx_admin_invitations_email ON public.admin_invitations USING btree (email);
CREATE INDEX idx_admin_invitations_status ON public.admin_invitations USING btree (status);
CREATE INDEX idx_ai_log_applied ON public.ai_generation_log USING btree (applied_to_product, created_at DESC);
CREATE INDEX idx_ai_log_product ON public.ai_generation_log USING btree (product_id, created_at DESC);
CREATE INDEX idx_ai_log_status ON public.ai_generation_log USING btree (status, created_at DESC);
CREATE INDEX idx_cart_items_cart ON public.cart_items USING btree (cart_id);
CREATE INDEX idx_cart_items_product ON public.cart_items USING btree (product_id);
CREATE INDEX idx_carts_abandoned ON public.carts USING btree (status, abandoned_at) WHERE (status = 'abandoned'::text);
CREATE INDEX idx_carts_customer ON public.carts USING btree (customer_id);
CREATE INDEX idx_carts_visitor ON public.carts USING btree (visitor_id);
CREATE INDEX idx_categories_active ON public.categories USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);
CREATE INDEX idx_chat_customer ON public.chat_conversations USING btree (customer_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id, created_at);
CREATE INDEX idx_chat_visitor ON public.chat_conversations USING btree (visitor_id);
CREATE INDEX idx_collections_active ON public.collections USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_collections_featured ON public.collections USING btree (is_featured) WHERE (is_featured = true);
CREATE INDEX idx_collections_slug ON public.collections USING btree (slug);
CREATE INDEX idx_content_units_active ON public.content_units USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_content_units_family ON public.content_units USING btree (unit_family);
CREATE INDEX idx_coupons_active ON public.coupons USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_coupons_code ON public.coupons USING btree (upper(code));
CREATE INDEX idx_csv_imports_source ON public.csv_imports USING btree (data_source_id);
CREATE INDEX idx_csv_imports_status ON public.csv_imports USING btree (status);
CREATE INDEX idx_customers_email ON public.customers USING btree (email);
CREATE INDEX idx_data_sources_active ON public.data_sources USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_data_sources_laboratory ON public.data_sources USING btree (laboratory_id);
CREATE INDEX idx_email_suppressions_email ON public.email_suppressions USING btree (email);
CREATE INDEX idx_email_suppressions_reason ON public.email_suppressions USING btree (reason);
CREATE INDEX idx_email_suppressions_suppressed_at ON public.email_suppressions USING btree (suppressed_at DESC);
CREATE INDEX idx_events_created ON public.events USING btree (created_at DESC);
CREATE INDEX idx_events_customer ON public.events USING btree (customer_id, created_at DESC);
CREATE INDEX idx_events_product ON public.events USING btree (product_id) WHERE (product_id IS NOT NULL);
CREATE INDEX idx_events_session ON public.events USING btree (session_id);
CREATE INDEX idx_events_type ON public.events USING btree (event_type, created_at DESC);
CREATE INDEX idx_events_visitor ON public.events USING btree (visitor_id, created_at DESC);
CREATE INDEX idx_laboratories_active ON public.laboratories USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_newsletter_email ON public.newsletter_subscribers USING btree (email);
CREATE INDEX idx_newsletter_status ON public.newsletter_subscribers USING btree (status);
CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);
CREATE INDEX idx_order_items_product ON public.order_items USING btree (product_id);
CREATE INDEX idx_orders_created ON public.orders USING btree (created_at DESC);
CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);
CREATE INDEX idx_orders_email ON public.orders USING btree (customer_email);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_pav_attribute ON public.product_attribute_values USING btree (attribute_id);
CREATE INDEX idx_pav_option ON public.product_attribute_values USING btree (option_id);
CREATE INDEX idx_pav_product ON public.product_attribute_values USING btree (product_id);
CREATE INDEX idx_presentation_types_active ON public.presentation_types USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_presentation_types_code ON public.presentation_types USING btree (code);
CREATE INDEX idx_product_attribute_options_attribute ON public.product_attribute_options USING btree (attribute_id);
CREATE INDEX idx_product_attributes_active ON public.product_attributes USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_product_attributes_filterable ON public.product_attributes USING btree (is_filterable) WHERE (is_filterable = true);
CREATE INDEX idx_product_collections_collection ON public.product_collections USING btree (collection_id);
CREATE INDEX idx_product_collections_product ON public.product_collections USING btree (product_id);
CREATE INDEX idx_product_images_product ON public.product_images USING btree (product_id);
CREATE INDEX idx_product_inventory_location ON public.product_inventory USING btree (location_id);
CREATE INDEX idx_product_inventory_low_stock ON public.product_inventory USING btree (product_id) WHERE (stock <= low_stock_threshold);
CREATE INDEX idx_product_inventory_product ON public.product_inventory USING btree (product_id);
CREATE INDEX idx_products_active ON public.products USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_products_ai_metadata ON public.products USING gin (ai_metadata);
CREATE INDEX idx_products_category ON public.products USING btree (category_id);
CREATE INDEX idx_products_data_source ON public.products USING btree (data_source_id);
CREATE INDEX idx_products_equivalence_group ON public.products USING btree (equivalence_group) WHERE (equivalence_group IS NOT NULL);
CREATE INDEX idx_products_external_lookup ON public.products USING btree (data_source_id, external_id) WHERE (external_id IS NOT NULL);
CREATE INDEX idx_products_featured ON public.products USING btree (is_featured) WHERE (is_featured = true);
CREATE INDEX idx_products_in_stock ON public.products USING btree (stock) WHERE (stock > 0);
CREATE INDEX idx_products_invima ON public.products USING btree (invima_number);
CREATE INDEX idx_products_laboratory ON public.products USING btree (laboratory_id);
CREATE INDEX idx_products_needs_review ON public.products USING btree (needs_review) WHERE (needs_review = true);
CREATE INDEX idx_products_pending_ai ON public.products USING btree (id) WHERE ((full_description IS NULL) OR (full_description = ''::text));
CREATE INDEX idx_products_presentation ON public.products USING btree (presentation_type) WHERE (presentation_type IS NOT NULL);
CREATE INDEX idx_products_search_vector ON public.products USING gin (search_vector);
CREATE INDEX idx_products_source_type ON public.products USING btree (source_type);
CREATE INDEX idx_products_status ON public.products USING btree (status);
CREATE INDEX idx_products_tags ON public.products USING gin (tags);
CREATE INDEX idx_products_tax_rate ON public.products USING btree (tax_rate_id);
CREATE INDEX idx_quiz_match_cache_expires ON public.quiz_match_cache USING btree (expires_at);
CREATE INDEX idx_quiz_match_cache_key ON public.quiz_match_cache USING btree (cache_key);
CREATE INDEX idx_quiz_reco_need ON public.quiz_recommendations USING btree (need_id, review_status, relevance_tier, score DESC);
CREATE INDEX idx_quiz_reco_product ON public.quiz_recommendations USING btree (product_id);
CREATE INDEX idx_quiz_results_created ON public.quiz_results USING btree (created_at DESC);
CREATE INDEX idx_quiz_results_customer ON public.quiz_results USING btree (customer_id) WHERE (customer_id IS NOT NULL);
CREATE INDEX idx_quiz_results_slug ON public.quiz_results USING btree (slug);
CREATE INDEX idx_redemptions_coupon ON public.coupon_redemptions USING btree (coupon_id);
CREATE INDEX idx_redemptions_email ON public.coupon_redemptions USING btree (customer_email);
CREATE INDEX idx_redemptions_order ON public.coupon_redemptions USING btree (order_id);
CREATE INDEX idx_reviews_customer ON public.product_reviews USING btree (customer_id);
CREATE INDEX idx_reviews_product ON public.product_reviews USING btree (product_id) WHERE (status = 'approved'::text);
CREATE INDEX idx_reviews_status ON public.product_reviews USING btree (status);
CREATE INDEX idx_scraping_jobs_active_progress ON public.scraping_jobs USING btree (last_progress_at) WHERE (status = ANY (ARRAY['pending'::text, 'running'::text]));
CREATE INDEX idx_scraping_jobs_data_source ON public.scraping_jobs USING btree (data_source_id);
CREATE INDEX idx_scraping_jobs_started_at ON public.scraping_jobs USING btree (started_at DESC);
CREATE INDEX idx_scraping_jobs_status ON public.scraping_jobs USING btree (status);
CREATE INDEX idx_shipping_rates_department ON public.shipping_rates USING btree (department);
CREATE INDEX idx_visitors_customer ON public.visitors USING btree (customer_id);
CREATE INDEX idx_visitors_fingerprint ON public.visitors USING btree (fingerprint);
CREATE INDEX idx_visitors_last_seen ON public.visitors USING btree (last_seen_at DESC);
CREATE INDEX idx_wishlist_customer ON public.wishlist_items USING btree (customer_id);
CREATE INDEX idx_wishlist_product ON public.wishlist_items USING btree (product_id);

-- ============================================================================
-- 7. FUNCIONES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_quiz_cache()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.quiz_match_cache WHERE expires_at < now();
$function$;

CREATE OR REPLACE FUNCTION public.compute_reco_content_hash(p_product_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT md5(
    coalesce(p.name,'')              || '|' ||
    coalesce(p.category_id::text,'') || '|' ||
    coalesce(p.short_description,'') || '|' ||
    coalesce(p.description,'')       || '|' ||
    coalesce(p.full_description,'')  || '|' ||
    coalesce(p.composition_use,'')   || '|' ||
    coalesce(p.dosage,'')            || '|' ||
    coalesce(p.ingredients,'')       || '|' ||
    coalesce(p.presentation,'')      || '|' ||
    coalesce(p.presentation_type,'') || '|' ||
    coalesce((
      SELECT string_agg(pc.collection_id::text, ',' ORDER BY pc.collection_id::text)
      FROM public.product_collections pc
      WHERE pc.product_id = p.id
    ), '')
  )
  FROM public.products p
  WHERE p.id = p_product_id;
$function$;

CREATE OR REPLACE FUNCTION public.current_admin_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT role FROM public.admin_users
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_home_featured(p_limit integer DEFAULT 8)
 RETURNS TABLE(product_id uuid, name text, slug text, price_cop integer, image_url text, source text, priority integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ventas_60d AS (
    SELECT oi.product_id, SUM(oi.quantity) AS unidades
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
      AND o.created_at >= now() - interval '60 days'
    GROUP BY oi.product_id
  ),
  candidatos AS (
    SELECT
      p.id AS product_id,
      p.name,
      p.slug,
      p.price_cop,
      (SELECT pi.url FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC NULLS LAST
        LIMIT 1) AS image_url,
      CASE
        WHEN p.is_featured = true THEN 1
        WHEN v.unidades IS NOT NULL THEN 2
        WHEN rs.average_rating IS NOT NULL AND rs.review_count > 0 THEN 3
        ELSE 4
      END AS priority,
      CASE
        WHEN p.is_featured = true THEN 'curado'
        WHEN v.unidades IS NOT NULL THEN 'mas_vendido'
        WHEN rs.average_rating IS NOT NULL AND rs.review_count > 0 THEN 'mejor_calificado'
        ELSE 'novedad'
      END AS source,
      coalesce(v.unidades, 0) AS unidades,
      coalesce(rs.average_rating, 0) AS rating,
      coalesce(rs.review_count, 0) AS reviews,
      p.created_at
    FROM products p
    LEFT JOIN ventas_60d v ON v.product_id = p.id
    LEFT JOIN product_review_stats rs ON rs.product_id = p.id
    WHERE p.is_active = true AND p.status = 'active'
  )
  SELECT product_id, name, slug, price_cop, image_url, source, priority
  FROM candidatos
  ORDER BY
    priority ASC,
    unidades DESC,
    rating DESC,
    reviews DESC,
    created_at DESC,
    product_id
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  allowed_role text;
  allowed_name text;
  v_invitation record;
BEGIN
  SELECT * INTO v_invitation
  FROM public.admin_invitations
  WHERE email = NEW.email AND status = 'pending' AND expires_at > now()
  ORDER BY invited_at DESC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.admin_users (id, email, full_name, role, last_login_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(v_invitation.full_name, split_part(NEW.email, '@', 1)),
      v_invitation.role,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET last_login_at = now();

    UPDATE public.admin_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation.id;

    RETURN NEW;
  END IF;

  SELECT role, full_name INTO allowed_role, allowed_name
  FROM public.admin_allowlist
  WHERE email = NEW.email;

  IF allowed_role IS NOT NULL THEN
    INSERT INTO public.admin_users (id, email, full_name, role, last_login_at)
    VALUES (NEW.id, NEW.email, COALESCE(allowed_name, split_part(NEW.email, '@', 1)), allowed_role, now())
    ON CONFLICT (id) DO UPDATE SET last_login_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.home_top_selling_product_ids(p_limit integer DEFAULT 6, p_days integer DEFAULT NULL::integer)
 RETURNS TABLE(product_id uuid, units_sold bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT oi.product_id, SUM(oi.quantity)::bigint AS units_sold
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  WHERE o.payment_status = 'paid'
    AND p.status = 'active'
    AND p.is_active = true
    AND (p_days IS NULL OR o.created_at >= now() - make_interval(days => p_days))
  GROUP BY oi.product_id
  ORDER BY units_sold DESC
  LIMIT GREATEST(p_limit, 1);
$function$;

CREATE OR REPLACE FUNCTION public.increment_coupon_uses(p_coupon_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE coupons
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = p_coupon_id;
$function$;

CREATE OR REPLACE FUNCTION public.increment_quiz_result_views(result_slug text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.quiz_results SET view_count = view_count + 1 WHERE slug = result_slug;
$function$;

CREATE OR REPLACE FUNCTION public.is_email_suppressed(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM email_suppressions
    WHERE email = LOWER(p_email)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_last_owner_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  owner_count integer;
BEGIN
  IF (OLD.role = 'owner' AND NEW.role != 'owner')
     OR (OLD.role = 'owner' AND OLD.is_active = true AND NEW.is_active = false)
  THEN
    SELECT count(*) INTO owner_count
    FROM public.admin_users
    WHERE role = 'owner' AND is_active = true AND id != OLD.id;

    IF owner_count = 0 THEN
      RAISE EXCEPTION 'No se puede %. Debe haber al menos un owner activo en el sistema.',
        CASE WHEN NEW.role != 'owner' THEN 'cambiar el rol del único owner'
             ELSE 'desactivar al único owner' END;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_last_owner_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  owner_count integer;
BEGIN
  IF OLD.role = 'owner' AND OLD.is_active = true THEN
    SELECT count(*) INTO owner_count
    FROM public.admin_users
    WHERE role = 'owner' AND is_active = true AND id != OLD.id;

    IF owner_count = 0 THEN
      RAISE EXCEPTION 'No se puede eliminar al último owner activo del sistema.';
    END IF;
  END IF;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.products_reco_hash_tg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.reco_content_hash := public.compute_reco_content_hash(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_quiz(p_need_slug text, p_stage text, p_min_adjuvant_score integer DEFAULT 45)
 RETURNS TABLE(product_id uuid, name text, slug text, price_cop integer, image_url text, tier text, score integer, reason text, average_rating numeric, review_count integer, rnk bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ranked AS (
    SELECT
      p.id AS product_id,
      p.name,
      p.slug,
      p.price_cop,
      (SELECT pi.url FROM public.product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC NULLS LAST
        LIMIT 1) AS image_url,
      r.relevance_tier AS tier,
      r.score,
      r.reason,
      rs.average_rating,
      coalesce(rs.review_count, 0) AS review_count,
      p.equivalence_group,
      ROW_NUMBER() OVER (
        ORDER BY
          (r.relevance_tier = 'direct') DESC,
          r.score DESC,
          coalesce(rs.average_rating, 0) DESC,
          coalesce(rs.review_count, 0) DESC,
          p.created_at DESC,
          p.id
      ) AS global_order
    FROM public.quiz_recommendations r
    JOIN public.quiz_needs nq ON nq.id = r.need_id AND nq.slug = p_need_slug AND nq.is_active = true
    JOIN public.products p ON p.id = r.product_id AND p.is_active = true AND p.status = 'active'
    LEFT JOIN public.product_review_stats rs ON rs.product_id = p.id
    WHERE r.review_status = 'approved'
      AND p_stage = ANY(r.suitable_stages)
      AND (r.relevance_tier = 'direct'
           OR (r.relevance_tier = 'adjuvant' AND r.score >= p_min_adjuvant_score))
  ),
  dedup AS (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY coalesce(equivalence_group, product_id::text)
        ORDER BY global_order
      ) AS dup_rank
    FROM ranked
  ),
  filtrado AS (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY tier
        ORDER BY global_order
      ) AS rnk
    FROM dedup
    WHERE dup_rank = 1
  )
  SELECT product_id, name, slug, price_cop, image_url, tier, score, reason,
         average_rating, review_count, rnk
  FROM filtrado
  WHERE (tier = 'direct' AND rnk <= 2)
     OR (tier = 'adjuvant' AND rnk <= 1)
  ORDER BY (tier = 'direct') DESC, score DESC;
$function$;

CREATE OR REPLACE FUNCTION public.search_products(q text, page_size integer DEFAULT 24, page_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    ts_rank(p.search_vector, websearch_to_tsquery('spanish', q)) AS rank
  FROM public.products p
  WHERE
    p.status = 'active'
    AND p.search_vector @@ websearch_to_tsquery('spanish', q)
  ORDER BY rank DESC, p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_product_is_active()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_quiz_reco_sync(p_source text DEFAULT 'cron'::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE
  v_base_url text;
  v_secret   text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_base_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_secret   FROM vault.decrypted_secrets WHERE name = 'quiz_sync_secret' LIMIT 1;

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'quiz_reco_sync: faltan secretos en Vault (project_url / quiz_sync_secret). No se invoca.';
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.quiz_reco_dirty_products LIMIT 1) THEN
    RAISE NOTICE 'quiz_reco_sync: no hay productos sucios, nada que hacer.';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_base_url || '/functions/v1/quiz-reco-sync',
    headers := jsonb_build_object('Content-Type','application/json','x-sync-secret', v_secret),
    body := jsonb_build_object('trigger_source', p_source),
    timeout_milliseconds := 120000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_last_login()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.admin_users
  SET last_login_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_suppressions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 8. VISTAS
-- ============================================================================

create or replace view public.product_review_stats as
 SELECT product_id,
    count(*)::integer AS review_count,
    round(avg(rating), 1) AS average_rating,
    count(*) FILTER (WHERE rating = 5)::integer AS count_5,
    count(*) FILTER (WHERE rating = 4)::integer AS count_4,
    count(*) FILTER (WHERE rating = 3)::integer AS count_3,
    count(*) FILTER (WHERE rating = 2)::integer AS count_2,
    count(*) FILTER (WHERE rating = 1)::integer AS count_1
   FROM product_reviews
  WHERE status = 'approved'::text
  GROUP BY product_id;

create or replace view public.quiz_reco_dirty_products as
 SELECT id,
    name,
    reco_content_hash,
    reco_synced_hash,
    reco_synced_at
   FROM products p
  WHERE is_active = true AND status = 'active'::text AND reco_synced_hash IS DISTINCT FROM reco_content_hash;

-- ============================================================================
-- 9. TRIGGERS (schema public)
-- ============================================================================

CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_prevent_last_owner BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_change();
CREATE TRIGGER trg_prevent_last_owner_delete BEFORE DELETE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_delete();
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_data_sources_updated_at BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_email_suppressions_updated_at BEFORE UPDATE ON public.email_suppressions FOR EACH ROW EXECUTE FUNCTION public.update_email_suppressions_updated_at();
CREATE TRIGGER trg_laboratories_updated_at BEFORE UPDATE ON public.laboratories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_product_inventory_updated_at BEFORE UPDATE ON public.product_inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_reco_hash BEFORE INSERT OR UPDATE OF name, category_id, short_description, description, full_description, composition_use, dosage, ingredients, presentation, presentation_type ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_reco_hash_tg();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sync_is_active BEFORE INSERT OR UPDATE OF status ON public.products FOR EACH ROW EXECUTE FUNCTION public.sync_product_is_active();

-- Triggers sobre auth.users (gestionado por Supabase, no recreables desde una
-- baseline pura — quedan documentados aquí. Aplicar manualmente tras recrear:
--
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();
-- CREATE TRIGGER on_auth_user_login AFTER UPDATE OF last_sign_in_at ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.update_admin_last_login();

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================

alter table public.addresses enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.admin_invitations enable row level security;
alter table public.admin_users enable row level security;
alter table public.ai_generation_log enable row level security;
alter table public.cart_items enable row level security;
alter table public.carts enable row level security;
alter table public.categories enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.collections enable row level security;
alter table public.content_units enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.coupons enable row level security;
alter table public.csv_imports enable row level security;
alter table public.customers enable row level security;
alter table public.data_sources enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.events enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.laboratories enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.order_items enable row level security;
alter table public.orders enable row level security;
alter table public.presentation_types enable row level security;
alter table public.product_attribute_options enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.product_attributes enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_images enable row level security;
alter table public.product_inventory enable row level security;
alter table public.product_reviews enable row level security;
alter table public.products enable row level security;
alter table public.quiz_match_cache enable row level security;
alter table public.quiz_needs enable row level security;
alter table public.quiz_reco_sync_runs enable row level security;
alter table public.quiz_recommendations enable row level security;
alter table public.quiz_results enable row level security;
alter table public.scraping_jobs enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.tax_rates enable row level security;
alter table public.visitors enable row level security;
alter table public.wishlist_items enable row level security;

-- Políticas

create policy "Admins read all addresses" on public.addresses as permissive for select to authenticated using ((current_admin_role() IS NOT NULL));
create policy "Customers manage own addresses" on public.addresses as permissive for all to public using ((auth.uid() = customer_id)) with check ((auth.uid() = customer_id));
create policy "Owner manages allowlist" on public.admin_allowlist as permissive for all to public using ((current_admin_role() = 'owner'::text)) with check ((current_admin_role() = 'owner'::text));
create policy "Owners manage invitations" on public.admin_invitations as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Admin reads own profile" on public.admin_users as permissive for select to public using ((auth.uid() = id));
create policy "Owner deletes admins" on public.admin_users as permissive for delete to public using ((current_admin_role() = 'owner'::text));
create policy "Owner reads all admins" on public.admin_users as permissive for select to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Owner updates admins" on public.admin_users as permissive for update to public using ((current_admin_role() = 'owner'::text)) with check ((current_admin_role() = 'owner'::text));
create policy "Owner writes admins" on public.admin_users as permissive for insert to public with check ((current_admin_role() = 'owner'::text));
create policy ai_log_admin_all on public.ai_generation_log as permissive for all to public using ((EXISTS (SELECT 1 FROM admin_users WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) with check ((EXISTS (SELECT 1 FROM admin_users WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
create policy "Customers manage own cart items" on public.cart_items as permissive for all to public using ((EXISTS (SELECT 1 FROM carts WHERE ((carts.id = cart_items.cart_id) AND (carts.customer_id = auth.uid()))))) with check ((EXISTS (SELECT 1 FROM carts WHERE ((carts.id = cart_items.cart_id) AND (carts.customer_id = auth.uid())))));
create policy "Customers manage own carts" on public.carts as permissive for all to public using ((auth.uid() = customer_id)) with check ((auth.uid() = customer_id));
create policy "Admins manage categories" on public.categories as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Anyone can read active categories" on public.categories as permissive for select to public using ((is_active = true));
create policy "Customers read own conversations" on public.chat_conversations as permissive for select to public using ((auth.uid() = customer_id));
create policy "Customers read own messages" on public.chat_messages as permissive for select to public using ((EXISTS (SELECT 1 FROM chat_conversations WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.customer_id = auth.uid())))));
create policy "Admins manage collections" on public.collections as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Public reads active collections" on public.collections as permissive for select to public using ((is_active = true));
create policy "Admins manage content units" on public.content_units as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Public reads content units" on public.content_units as permissive for select to public using ((is_active = true));
create policy "Admins read redemptions" on public.coupon_redemptions as permissive for select to authenticated using ((current_admin_role() IS NOT NULL));
create policy "Admins manage coupons" on public.coupons as permissive for all to authenticated using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Admins create csv imports" on public.csv_imports as permissive for insert to public with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Admins read csv imports" on public.csv_imports as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Admins read all customers" on public.customers as permissive for select to authenticated using ((current_admin_role() IS NOT NULL));
create policy "Customers can insert own profile" on public.customers as permissive for insert to public with check ((auth.uid() = id));
create policy "Customers can read own profile" on public.customers as permissive for select to public using ((auth.uid() = id));
create policy "Customers can update own profile" on public.customers as permissive for update to public using ((auth.uid() = id));
create policy "Admins manage data sources" on public.data_sources as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Admins read data sources" on public.data_sources as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Service role full access on email_suppressions" on public.email_suppressions as permissive for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "Admins read events" on public.events as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Public can insert events" on public.events as permissive for insert to public with check (true);
create policy "Admins manage locations" on public.inventory_locations as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Admins read locations" on public.inventory_locations as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Admins manage laboratories" on public.laboratories as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Admins read all laboratories" on public.laboratories as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Anyone can read active laboratories" on public.laboratories as permissive for select to public using ((is_active = true));
create policy "Admins read newsletter subscribers" on public.newsletter_subscribers as permissive for select to authenticated using ((current_admin_role() IS NOT NULL));
create policy "Admins write newsletter subscribers" on public.newsletter_subscribers as permissive for all to authenticated using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Admins read all order items" on public.order_items as permissive for select to authenticated using ((current_admin_role() IS NOT NULL));
create policy "Customers create own order items" on public.order_items as permissive for insert to authenticated with check ((EXISTS (SELECT 1 FROM orders WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid())))));
create policy "Customers read own order items" on public.order_items as permissive for select to public using ((EXISTS (SELECT 1 FROM orders WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid())))));
create policy "Admins read all orders" on public.orders as permissive for select to authenticated using ((current_admin_role() IS NOT NULL));
create policy "Admins update orders" on public.orders as permissive for update to authenticated using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Customers create own orders" on public.orders as permissive for insert to authenticated with check ((auth.uid() = customer_id));
create policy "Customers read own orders" on public.orders as permissive for select to public using ((auth.uid() = customer_id));
create policy "Customers update own pending orders" on public.orders as permissive for update to authenticated using (((auth.uid() = customer_id) AND (status = 'pending'::text))) with check ((auth.uid() = customer_id));
create policy "Admins manage presentation types" on public.presentation_types as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Public reads presentation types" on public.presentation_types as permissive for select to public using ((is_active = true));
create policy "Admins manage attribute options" on public.product_attribute_options as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Public reads attribute options" on public.product_attribute_options as permissive for select to public using ((EXISTS (SELECT 1 FROM product_attributes a WHERE ((a.id = product_attribute_options.attribute_id) AND (a.is_active = true)))));
create policy "Admins manage product attribute values" on public.product_attribute_values as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Public reads attribute values of active" on public.product_attribute_values as permissive for select to public using ((EXISTS (SELECT 1 FROM products p WHERE ((p.id = product_attribute_values.product_id) AND (p.is_active = true) AND (p.status = 'active'::text)))));
create policy "Admins manage attributes" on public.product_attributes as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Public reads active attributes" on public.product_attributes as permissive for select to public using ((is_active = true));
create policy "Admins manage product collections" on public.product_collections as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Public reads product collections of active" on public.product_collections as permissive for select to public using ((EXISTS (SELECT 1 FROM collections c WHERE ((c.id = product_collections.collection_id) AND (c.is_active = true)))));
create policy "Admins manage product images" on public.product_images as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Admins read all product images" on public.product_images as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Public reads images of active products" on public.product_images as permissive for select to public using ((EXISTS (SELECT 1 FROM products WHERE ((products.id = product_images.product_id) AND (products.is_active = true) AND (products.status = 'active'::text)))));
create policy "Admins manage inventory" on public.product_inventory as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'warehouse'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'warehouse'::text])));
create policy "Admins read inventory" on public.product_inventory as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Admins manage reviews" on public.product_reviews as permissive for all to authenticated using ((current_admin_role() IS NOT NULL)) with check ((current_admin_role() IS NOT NULL));
create policy "Anyone reads approved reviews" on public.product_reviews as permissive for select to public using ((status = 'approved'::text));
create policy "Customers update own pending reviews" on public.product_reviews as permissive for update to authenticated using (((customer_id = auth.uid()) AND (status = 'pending'::text))) with check ((customer_id = auth.uid()));
create policy "Customers write own reviews" on public.product_reviews as permissive for insert to authenticated with check ((customer_id = auth.uid()));
create policy "Admins manage products" on public.products as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Admins read all products" on public.products as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Public reads active products" on public.products as permissive for select to public using (((is_active = true) AND (status = 'active'::text)));
create policy quiz_match_cache_service_only on public.quiz_match_cache as permissive for all to service_role using (true) with check (true);
create policy quiz_needs_public_read on public.quiz_needs as permissive for select to public using ((is_active = true));
create policy quiz_reco_public_read on public.quiz_recommendations as permissive for select to public using ((review_status = 'approved'::text));
create policy quiz_results_public_read on public.quiz_results as permissive for select to anon, authenticated using (true);
create policy quiz_results_service_write on public.quiz_results as permissive for all to service_role using (true) with check (true);
create policy "Admins manage scraping jobs" on public.scraping_jobs as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));
create policy "Admins read scraping jobs" on public.scraping_jobs as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy shipping_rates_admin_write on public.shipping_rates as permissive for all to authenticated using ((EXISTS (SELECT 1 FROM admin_users WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
create policy shipping_rates_public_read on public.shipping_rates as permissive for select to anon, authenticated using (true);
create policy "Admins manage tax rates" on public.tax_rates as permissive for all to public using ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((current_admin_role() = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "Public reads active tax rates" on public.tax_rates as permissive for select to public using ((is_active = true));
create policy "Admins read visitors" on public.visitors as permissive for select to public using ((current_admin_role() IS NOT NULL));
create policy "Public can insert visitors" on public.visitors as permissive for insert to public with check (true);
create policy "Public can update own visitor" on public.visitors as permissive for update to public using (true) with check (true);
create policy "Admins read wishlist" on public.wishlist_items as permissive for select to authenticated using ((current_admin_role() IS NOT NULL));
create policy "Customers manage own wishlist" on public.wishlist_items as permissive for all to authenticated using ((customer_id = auth.uid())) with check ((customer_id = auth.uid()));

-- ============================================================================
-- 11. CRON JOBS (pg_cron)
--
-- Solo idempotente vía cron.schedule (sobreescribe el job si ya existe con el
-- mismo nombre). Las funciones llamadas viven en schema public y están
-- definidas arriba.
-- ============================================================================

select cron.schedule('quiz-reco-weekly-sync',    '0 3 * * 0',     $$select public.trigger_quiz_reco_sync('cron');$$);
select cron.schedule('quiz-reco-debounce-sync',  '*/15 * * * *',  $$select public.trigger_quiz_reco_sync('cron_debounce');$$);

-- ============================================================================
-- FIN DEL BASELINE
-- ============================================================================
