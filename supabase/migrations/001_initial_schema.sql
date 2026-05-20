-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Sellers
create table sellers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  coaching_notes text,
  created_at timestamptz default now()
);

-- Products with pricing constraints
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  min_price decimal(12,2) not null,
  suggested_price decimal(12,2) not null,
  features text[] default '{}',
  created_at timestamptz default now()
);

-- Clients (CRM)
create table clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company text,
  industry text,
  email text,
  phone text,
  pain_points text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Calls with transcript + AI notes
create table calls (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade not null,
  seller_id uuid references sellers(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  status text check (status in ('active', 'completed', 'failed')) default 'active',
  transcript jsonb default '[]'::jsonb,
  ai_notes text,
  outcome text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_calls_client_id on calls(client_id);
create index idx_calls_seller_id on calls(seller_id);
create index idx_calls_created_at on calls(created_at desc);

-- Auto-update updated_at on clients
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_clients_updated_at
  before update on clients
  for each row execute function update_updated_at_column();

-- Row Level Security
alter table sellers enable row level security;
alter table products enable row level security;
alter table clients enable row level security;
alter table calls enable row level security;

create policy "auth_all" on sellers for all using (auth.role() = 'authenticated');
create policy "auth_all" on products for all using (auth.role() = 'authenticated');
create policy "auth_all" on clients for all using (auth.role() = 'authenticated');
create policy "auth_all" on calls for all using (auth.role() = 'authenticated');

-- Seed data for development
insert into sellers (name, email, coaching_notes) values
  ('Demo Vendedor', 'demo@orkesta.com', 'Fuerte en demos técnicas. Necesita mejorar manejo de objeciones de precio.');

insert into products (name, description, min_price, suggested_price, features) values
  ('Orkesta Pro', 'Suite de automatización de ventas con coaching por IA en tiempo real', 2500.00, 3500.00,
   ARRAY['CRM integrado', 'AI Coach en llamadas', 'Analytics de ventas', 'Integraciones CRM']);

insert into clients (name, company, industry, email, phone, pain_points) values
  ('Carlos Méndez', 'TechCorp MX', 'Tecnología', 'carlos@techcorp.mx', '+52 55 1234 5678',
   'Equipo de ventas no alcanza cuotas. Proceso completamente manual. Sin visibilidad del pipeline.'),
  ('Ana García', 'Distribuidora Nacional', 'Distribución', 'ana@distnacional.com', '+52 33 9876 5432',
   'Alta rotación de vendedores. Sin sistema de entrenamiento. Pérdida de conocimiento institucional.');
