-- ============================================================
-- 004_supplies_subscriptions.sql
-- Adds subscription plans, supply item catalog, and supply
-- orders to support the janitorial/supplies service.
-- ============================================================

-- ------------------------------------------------------------
-- subscriptions
-- One active subscription per host. Tracks plan and status.
-- ------------------------------------------------------------
create table public.subscriptions (
  id             uuid        primary key default gen_random_uuid(),
  host_id        uuid        not null references public.profiles (id) on delete cascade,
  plan           text        not null check (plan in ('starter', 'pro', 'enterprise')),
  status         text        not null default 'active'
                   check (status in ('active', 'cancelled', 'past_due')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Hosts can read and manage their own subscription
create policy "subscriptions: host select"
  on public.subscriptions for select
  using (auth.uid() = host_id);

create policy "subscriptions: host insert"
  on public.subscriptions for insert
  with check (auth.uid() = host_id);

create policy "subscriptions: host update"
  on public.subscriptions for update
  using (auth.uid() = host_id);

-- Admins have full access
create policy "subscriptions: admin all"
  on public.subscriptions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- supply_items
-- Catalog of available supply products.
-- Managed by admins, readable by all authenticated users.
-- ------------------------------------------------------------
create table public.supply_items (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  category    text        not null check (category in ('paper', 'towels', 'toiletries', 'other')),
  description text,
  unit        text        not null default 'pack',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.supply_items enable row level security;

-- All authenticated users can view the catalog
create policy "supply_items: authenticated read"
  on public.supply_items for select
  using (auth.role() = 'authenticated');

-- Admins manage the catalog
create policy "supply_items: admin all"
  on public.supply_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- supply_orders
-- A supply delivery request from a host for a property.
-- ------------------------------------------------------------
create table public.supply_orders (
  id            uuid        primary key default gen_random_uuid(),
  property_id   uuid        not null references public.properties (id) on delete cascade,
  host_id       uuid        not null references public.profiles (id) on delete cascade,
  status        text        not null default 'pending'
                  check (status in ('pending', 'confirmed', 'delivered', 'cancelled')),
  notes         text,
  scheduled_date date       not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.supply_orders enable row level security;

-- Hosts can manage their own supply orders
create policy "supply_orders: host select"
  on public.supply_orders for select
  using (auth.uid() = host_id);

create policy "supply_orders: host insert"
  on public.supply_orders for insert
  with check (auth.uid() = host_id);

create policy "supply_orders: host update"
  on public.supply_orders for update
  using (auth.uid() = host_id);

create policy "supply_orders: host delete"
  on public.supply_orders for delete
  using (auth.uid() = host_id);

-- Admins have full access
create policy "supply_orders: admin all"
  on public.supply_orders for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- supply_order_items
-- Line items for each supply order (which items, how many).
-- ------------------------------------------------------------
create table public.supply_order_items (
  id              uuid    primary key default gen_random_uuid(),
  supply_order_id uuid    not null references public.supply_orders (id) on delete cascade,
  supply_item_id  uuid    not null references public.supply_items (id) on delete restrict,
  quantity        integer not null default 1 check (quantity > 0)
);

alter table public.supply_order_items enable row level security;

-- Hosts can access order items for their own orders
create policy "supply_order_items: host select"
  on public.supply_order_items for select
  using (
    exists (
      select 1 from public.supply_orders o
      where o.id = supply_order_items.supply_order_id
        and o.host_id = auth.uid()
    )
  );

create policy "supply_order_items: host insert"
  on public.supply_order_items for insert
  with check (
    exists (
      select 1 from public.supply_orders o
      where o.id = supply_order_items.supply_order_id
        and o.host_id = auth.uid()
    )
  );

create policy "supply_order_items: host delete"
  on public.supply_order_items for delete
  using (
    exists (
      select 1 from public.supply_orders o
      where o.id = supply_order_items.supply_order_id
        and o.host_id = auth.uid()
    )
  );

-- Admins have full access
create policy "supply_order_items: admin all"
  on public.supply_order_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- Seed default supply items
-- ------------------------------------------------------------
insert into public.supply_items (name, category, description, unit) values
  ('Toilet Paper',       'paper',      '2-ply, 12 rolls per pack',              'pack'),
  ('Paper Towels',       'paper',      'Select-a-size, 6 rolls per pack',       'pack'),
  ('Bath Towels',        'towels',     'White hotel-style bath towels, set of 4','set'),
  ('Hand Towels',        'towels',     'White hand towels, set of 4',           'set'),
  ('Beach Towels',       'towels',     'Oversized striped beach towels, set of 2','set'),
  ('Dish Soap',          'toiletries', '16 oz bottle',                          'bottle'),
  ('Hand Soap',          'toiletries', 'Foaming hand soap, 12 oz',              'bottle'),
  ('Trash Bags',         'other',      '13-gallon kitchen bags, 40 count',      'box');
