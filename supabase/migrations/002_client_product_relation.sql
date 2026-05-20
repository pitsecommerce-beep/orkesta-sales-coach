-- Add default product assignment to clients
alter table clients add column if not exists default_product_id uuid references products(id) on delete set null;

-- Add current_plan JSONB for tracking sales stage per client
alter table clients add column if not exists current_plan jsonb;

-- Add pricing_model and pricing_tiers to products (used in coaching context)
alter table products add column if not exists pricing_model text;
alter table products add column if not exists pricing_tiers jsonb;
