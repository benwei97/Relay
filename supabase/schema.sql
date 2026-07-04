create extension if not exists pgcrypto;

create table if not exists public.landlords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid references public.landlords(id) on delete cascade,
  address text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  unit_number text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete set null,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id) on delete cascade,
  name text not null,
  trade text not null,
  phone text,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid references public.landlords(id) on delete set null,
  contractor_id uuid references public.contractors(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  tenant_name text not null,
  tenant_phone text not null,
  tenant_email text not null,
  property_address text not null,
  unit_number text,
  request_type text not null,
  description text not null,
  availability_windows text not null default '',
  status text not null default 'new',
  public_token text not null unique,
  ai_title text,
  ai_category text,
  ai_urgency text,
  ai_summary text,
  ai_missing_info text[],
  ai_tenant_follow_up text,
  ai_contractor_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_files (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  sender_type text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  actor_type text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_tickets_status_idx on public.maintenance_tickets(status);
create index if not exists maintenance_tickets_public_token_idx on public.maintenance_tickets(public_token);
create index if not exists contractors_landlord_id_idx on public.contractors(landlord_id);
create index if not exists ticket_events_ticket_id_idx on public.ticket_events(ticket_id);
create index if not exists ticket_files_ticket_id_idx on public.ticket_files(ticket_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists maintenance_tickets_set_updated_at on public.maintenance_tickets;
create trigger maintenance_tickets_set_updated_at
before update on public.maintenance_tickets
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('ticket-files', 'ticket-files', false)
on conflict (id) do nothing;

alter table public.landlords enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.contractors enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.ticket_files enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_events enable row level security;

create policy "landlords can read own profile" on public.landlords
for select using (auth.uid() = user_id);

create policy "landlords can update own profile" on public.landlords
for update using (auth.uid() = user_id);

create policy "landlords can read contractors" on public.contractors
for select using (
  landlord_id in (select id from public.landlords where user_id = auth.uid())
);

create policy "landlords can manage contractors" on public.contractors
for all using (
  landlord_id in (select id from public.landlords where user_id = auth.uid())
);

create policy "landlords can read tickets" on public.maintenance_tickets
for select using (
  landlord_id is null or landlord_id in (select id from public.landlords where user_id = auth.uid())
);

create policy "landlords can read ticket files" on public.ticket_files
for select using (
  ticket_id in (
    select id from public.maintenance_tickets
    where landlord_id is null or landlord_id in (select id from public.landlords where user_id = auth.uid())
  )
);

create policy "landlords can read ticket events" on public.ticket_events
for select using (
  ticket_id in (
    select id from public.maintenance_tickets
    where landlord_id is null or landlord_id in (select id from public.landlords where user_id = auth.uid())
  )
);

create policy "landlords can read ticket messages" on public.ticket_messages
for select using (
  ticket_id in (
    select id from public.maintenance_tickets
    where landlord_id is null or landlord_id in (select id from public.landlords where user_id = auth.uid())
  )
);
