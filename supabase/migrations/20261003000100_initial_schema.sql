create extension if not exists pgcrypto;

create table if not exists public.pizzas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  items jsonb not null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  delivery_time timestamptz not null,
  payment_method text not null check (payment_method in ('pix', 'card', 'cash')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint orders_items_array check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  constraint orders_customer_name_length check (char_length(btrim(customer_name)) between 2 and 120),
  constraint orders_customer_phone_length check (char_length(btrim(customer_phone)) between 8 and 30)
);

create index if not exists pizzas_available_idx on public.pizzas (is_available);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_delivery_time_idx on public.orders (delivery_time);

alter table public.pizzas enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Public can view available pizzas" on public.pizzas;
create policy "Public can view available pizzas"
on public.pizzas for select to anon, authenticated
using (is_available = true);

drop policy if exists "Anonymous customers can create orders" on public.orders;
create policy "Anonymous customers can create orders"
on public.orders for insert to anon
with check (
  char_length(btrim(customer_name)) between 2 and 120
  and customer_phone ~ '^[0-9+(). -]{8,30}$'
  and jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) between 1 and 20
  and total_amount >= 0
  and delivery_time >= now()
  and payment_method in ('pix', 'card', 'cash')
  and status = 'pending'
);

revoke all on table public.orders from anon, authenticated;
grant insert on table public.orders to anon;
grant select on table public.pizzas to anon, authenticated;

insert into public.pizzas (id, name, description, price, image_url, is_available)
values
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b201', 'Margherita', 'Molho de tomate, muçarela, manjericão fresco e azeite.', 39.90, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82', true),
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b202', 'Calabresa', 'Muçarela, calabresa fatiada, cebola e orégano.', 44.90, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=900&q=82', true),
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b203', 'Frango com Catupiry', 'Frango temperado, catupiry cremoso, muçarela e orégano.', 49.90, 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=900&q=82', true),
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b204', 'Pepperoni', 'Muçarela, pepperoni crocante e molho de tomate artesanal.', 52.90, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=82', true),
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b205', 'Quatro Queijos', 'Muçarela, provolone, parmesão e gorgonzola.', 54.90, 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=82', true),
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b206', 'Portuguesa', 'Muçarela, presunto, ovos, cebola, ervilha, milho e azeitona.', 51.90, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=82', true),
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b207', 'Vegetariana', 'Muçarela, tomate, pimentão, cebola, champignon e azeitona.', 47.90, 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=900&q=82', true),
  ('6cf90d91-5ec8-4f80-8c2b-9e2cc5c2b208', 'Bacon com Milho', 'Muçarela, bacon crocante, milho e orégano.', 49.90, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=82', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  is_available = excluded.is_available;
