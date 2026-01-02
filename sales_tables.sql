-- Sales tables for Supabase

create table if not exists public.sales_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.sales_agents(id) on delete cascade,
  type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sales_events_agent_id_idx on public.sales_events(agent_id);
create index if not exists sales_events_created_at_idx on public.sales_events(created_at);

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.sales_agents(id) on delete cascade,
  email text not null,
  name text,
  status text not null default 'new',
  notes text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_leads_agent_id_idx on public.sales_leads(agent_id);
create index if not exists sales_leads_created_at_idx on public.sales_leads(created_at);

create or replace function public.sales_leads_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sales_leads_set_updated_at on public.sales_leads;
create trigger sales_leads_set_updated_at
before update on public.sales_leads
for each row execute function public.sales_leads_set_updated_at();
