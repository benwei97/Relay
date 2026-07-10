-- Development-only reset for the Relay MVP schema.
-- This deletes existing Relay app data. Do not run in production.

drop table if exists public.appointment_proposals cascade;
drop table if exists public.ticket_events cascade;
drop table if exists public.ticket_messages cascade;
drop table if exists public.ticket_files cascade;
drop table if exists public.maintenance_tickets cascade;
drop table if exists public.tenants cascade;
drop table if exists public.units cascade;
drop table if exists public.contractors cascade;
drop table if exists public.properties cascade;
drop table if exists public.landlords cascade;
