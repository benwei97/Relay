create extension if not exists pgcrypto;

create table if not exists public.landlords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id) on delete cascade,
  name text not null,
  address text not null,
  access_notes text,
  parking_notes text,
  request_link_slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_number text not null,
  created_at timestamptz not null default now(),
  unique (property_id, unit_number)
);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id) on delete cascade,
  name text not null,
  company_name text,
  phone text not null,
  email text,
  trades text[] not null default '{}',
  priority integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  assigned_contractor_id uuid references public.contractors(id) on delete set null,
  tenant_name text not null,
  tenant_phone text not null,
  tenant_email text,
  unit_number text not null,
  category text not null,
  description text not null,
  emergency_flag boolean not null default false,
  active_water_leak boolean not null default false,
  gas_smell boolean not null default false,
  electrical_sparking boolean not null default false,
  permission_to_enter boolean not null default false,
  pets_present boolean not null default false,
  availability_windows text not null default '',
  status text not null default 'Submitted',
  tenant_token text not null unique,
  contractor_token text not null unique,
  ai_title text,
  ai_urgency text,
  ai_trade text,
  ai_summary_for_landlord text,
  ai_summary_for_contractor text,
  ai_missing_information text[],
  ai_recommended_contractor_id uuid references public.contractors(id) on delete set null,
  ai_dispatch_confidence numeric(4, 2),
  ai_recommended_next_step text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completion_notes text,
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
  type text not null,
  message text not null,
  actor_type text not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_proposals (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  contractor_id uuid references public.contractors(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'Proposed',
  created_at timestamptz not null default now()
);

create index if not exists properties_landlord_id_idx on public.properties(landlord_id);
create index if not exists units_property_id_idx on public.units(property_id);
create index if not exists contractors_landlord_id_idx on public.contractors(landlord_id);
create index if not exists maintenance_tickets_landlord_id_idx on public.maintenance_tickets(landlord_id);
create index if not exists maintenance_tickets_property_id_idx on public.maintenance_tickets(property_id);
create index if not exists maintenance_tickets_status_idx on public.maintenance_tickets(status);
create index if not exists maintenance_tickets_tenant_token_idx on public.maintenance_tickets(tenant_token);
create index if not exists maintenance_tickets_contractor_token_idx on public.maintenance_tickets(contractor_token);
create index if not exists ticket_events_ticket_id_idx on public.ticket_events(ticket_id);
create index if not exists ticket_files_ticket_id_idx on public.ticket_files(ticket_id);
create index if not exists appointment_proposals_ticket_id_idx on public.appointment_proposals(ticket_id);

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
alter table public.contractors enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.ticket_files enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_events enable row level security;
alter table public.appointment_proposals enable row level security;

create policy "landlords can read own profile" on public.landlords
for select using (auth.uid() = user_id);

create policy "landlords can update own profile" on public.landlords
for update using (auth.uid() = user_id);

create policy "landlords can read properties" on public.properties
for select using (landlord_id in (select id from public.landlords where user_id = auth.uid()));

create policy "landlords can manage properties" on public.properties
for all using (landlord_id in (select id from public.landlords where user_id = auth.uid()));

create policy "landlords can read units" on public.units
for select using (
  property_id in (
    select p.id from public.properties p
    join public.landlords l on l.id = p.landlord_id
    where l.user_id = auth.uid()
  )
);

create policy "landlords can manage units" on public.units
for all using (
  property_id in (
    select p.id from public.properties p
    join public.landlords l on l.id = p.landlord_id
    where l.user_id = auth.uid()
  )
);

create policy "landlords can read contractors" on public.contractors
for select using (landlord_id in (select id from public.landlords where user_id = auth.uid()));

create policy "landlords can manage contractors" on public.contractors
for all using (landlord_id in (select id from public.landlords where user_id = auth.uid()));

create policy "landlords can read tickets" on public.maintenance_tickets
for select using (landlord_id in (select id from public.landlords where user_id = auth.uid()));

create policy "landlords can update tickets" on public.maintenance_tickets
for update using (landlord_id in (select id from public.landlords where user_id = auth.uid()));

create policy "landlords can read ticket files" on public.ticket_files
for select using (
  ticket_id in (
    select t.id from public.maintenance_tickets t
    join public.landlords l on l.id = t.landlord_id
    where l.user_id = auth.uid()
  )
);

create policy "landlords can read ticket events" on public.ticket_events
for select using (
  ticket_id in (
    select t.id from public.maintenance_tickets t
    join public.landlords l on l.id = t.landlord_id
    where l.user_id = auth.uid()
  )
);

create policy "landlords can read ticket messages" on public.ticket_messages
for select using (
  ticket_id in (
    select t.id from public.maintenance_tickets t
    join public.landlords l on l.id = t.landlord_id
    where l.user_id = auth.uid()
  )
);

create policy "landlords can read appointment proposals" on public.appointment_proposals
for select using (
  ticket_id in (
    select t.id from public.maintenance_tickets t
    join public.landlords l on l.id = t.landlord_id
    where l.user_id = auth.uid()
  )
);
