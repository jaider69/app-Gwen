-- Fase 4: entradas, ventas y movimientos históricos.
-- Ejecutar después de 002_phase3_products_inventory.sql.

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  user_name text not null default 'Usuario',
  quantity integer not null check (quantity > 0),
  type text not null check (type in ('entry', 'sale', 'adjustment')),
  occurred_at timestamptz not null,
  stock_before numeric not null check (stock_before >= 0),
  stock_after numeric not null check (stock_after >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  user_name text not null default 'Usuario',
  sold_at timestamptz not null,
  total numeric not null check (total >= 0),
  status text not null default 'completed' check (status in ('draft', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  subtotal numeric not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_movements_store_occurred_idx
  on public.inventory_movements(store_id, occurred_at desc);
create index if not exists inventory_movements_product_idx
  on public.inventory_movements(product_id);
create index if not exists sales_store_sold_at_idx
  on public.sales(store_id, sold_at desc);
create index if not exists sale_items_sale_idx
  on public.sale_items(sale_id);

alter table public.inventory_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "users can manage own store movements" on public.inventory_movements;
create policy "users can manage own store movements"
  on public.inventory_movements for all
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
    and user_id = (select auth.uid())
  );

drop policy if exists "users can manage own store sales" on public.sales;
create policy "users can manage own store sales"
  on public.sales for all
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
    and user_id = (select auth.uid())
  );

drop policy if exists "users can manage own store sale items" on public.sale_items;
create policy "users can manage own store sale items"
  on public.sale_items for all
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