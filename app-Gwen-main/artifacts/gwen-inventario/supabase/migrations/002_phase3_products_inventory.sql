-- Fase 3: catálogo e inventario aislados por tienda.
-- Ejecutar después de 001_phase2_auth_and_stores.sql.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  brand text not null default '',
  category_id uuid not null references public.categories(id) on delete restrict,
  supplier text,
  unit text not null default 'unidad',
  stock numeric not null default 0 check (stock >= 0),
  price numeric not null default 0 check (price >= 0),
  minimum_stock numeric not null default 0 check (minimum_stock >= 0),
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_store_id_idx on public.categories(store_id);
create index if not exists products_store_id_idx on public.products(store_id);
create index if not exists products_category_id_idx on public.products(category_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "users can manage own store categories" on public.categories;
create policy "users can manage own store categories"
  on public.categories for all
  to authenticated
  using (
    store_id = (
      select profiles.store_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  )
  with check (
    store_id = (
      select profiles.store_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

drop policy if exists "users can manage own store products" on public.products;
create policy "users can manage own store products"
  on public.products for all
  to authenticated
  using (
    store_id = (
      select profiles.store_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  )
  with check (
    store_id = (
      select profiles.store_id
      from public.profiles
      where profiles.id = (select auth.uid())
    )
  );