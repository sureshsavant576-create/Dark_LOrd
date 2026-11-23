-- Estimated session lengths and human-reviewed duration change requests.
alter table public.bookings add column if not exists estimated_hours numeric(4,1);
alter table public.bookings add column if not exists proposed_hours numeric(4,1);
alter table public.bookings add column if not exists duration_change_note text not null default '';
alter table public.bookings add column if not exists duration_change_by integer references public.users(id);

-- A missing check-in is only a candidate. Staff verification is required before
-- it becomes a verified no-show used by future allocation decisions.
create index if not exists usage_events_booking_source_status
  on public.usage_events(booking_id, source, status);

create table if not exists public.booking_usage_reviews (
  booking_id integer primary key references public.bookings(id),
  status text not null check (status in ('candidate','verified_no_show')),
  detected_at timestamptz not null default now(),
  verified_by integer references public.users(id),
  verified_at timestamptz
);
alter table public.booking_usage_reviews enable row level security;
grant select, insert, update, delete on public.booking_usage_reviews to service_role;
