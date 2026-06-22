create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  create type user_role as enum ('admin', 'operator');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type channel_type as enum ('whatsapp', 'email', 'sms');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type agent_status as enum ('active', 'paused');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type billing_status as enum ('pending', 'paid', 'overdue', 'negotiated', 'canceled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type collection_stage as enum (
    'preventive',
    'due_today',
    'overdue_light',
    'overdue_moderate',
    'pre_legal',
    'extrajudicial'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type message_status as enum ('queued', 'sent', 'failed', 'simulated');
exception
  when duplicate_object then null;
end $$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email citext not null unique,
  password_hash text,
  role user_role not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists condominiums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  district text not null,
  units_count integer not null check (units_count > 0),
  average_fee_cents integer not null check (average_fee_cents >= 0),
  fee_due_rule text not null default 'business_day',
  fee_due_day integer not null default 5,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominiums_name_key unique (name),
  constraint condominiums_slug_key unique (slug),
  constraint condominiums_fee_due_rule_check
    check (fee_due_rule in ('calendar_day', 'business_day')),
  constraint condominiums_fee_due_day_check
    check (
      (fee_due_rule = 'calendar_day' and fee_due_day between 1 and 31)
      or (fee_due_rule = 'business_day' and fee_due_day between 1 and 22)
    )
);

create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references condominiums(id) on delete cascade,
  full_name text not null,
  unit_label text not null,
  phone text,
  email citext,
  monthly_fee_cents integer not null check (monthly_fee_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint residents_condominium_unit_key unique (condominium_id, unit_label)
);

create table if not exists billing_records (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  condominium_id uuid not null references condominiums(id) on delete cascade,
  reference_month date not null,
  due_date date not null,
  amount_cents integer not null check (amount_cents >= 0),
  status billing_status not null default 'pending',
  days_overdue integer not null default 0 check (days_overdue >= 0),
  stage collection_stage,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_records_resident_month_key unique (resident_id, reference_month)
);

create table if not exists message_agents (
  id uuid primary key default gen_random_uuid(),
  channel channel_type not null unique,
  status agent_status not null default 'active',
  queue_size integer not null default 0 check (queue_size >= 0),
  tone_label text not null,
  base_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid references billing_records(id) on delete set null,
  resident_id uuid not null references residents(id) on delete cascade,
  condominium_id uuid not null references condominiums(id) on delete cascade,
  agent_id uuid references message_agents(id) on delete set null,
  created_by_user_id uuid references app_users(id) on delete set null,
  channel channel_type not null,
  stage collection_stage,
  subject text,
  recipient text,
  body text not null,
  status message_status not null default 'simulated',
  queued_at timestamptz,
  sent_at timestamptz,
  external_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists cashflow_monthly (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references condominiums(id) on delete cascade,
  reference_month date not null,
  amount_received_cents integer not null check (amount_received_cents >= 0),
  amount_pending_cents integer not null check (amount_pending_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cashflow_monthly_global_month_key
  on cashflow_monthly(reference_month)
  where condominium_id is null;

create unique index if not exists cashflow_monthly_condominium_month_key
  on cashflow_monthly(condominium_id, reference_month)
  where condominium_id is not null;

create index if not exists residents_condominium_idx
  on residents(condominium_id);

create index if not exists billing_records_condominium_idx
  on billing_records(condominium_id, status, reference_month desc);

create index if not exists billing_records_resident_idx
  on billing_records(resident_id, reference_month desc);

create index if not exists message_logs_condominium_idx
  on message_logs(condominium_id, sent_at desc);

create index if not exists message_logs_resident_idx
  on message_logs(resident_id, sent_at desc);

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at
before update on app_users
for each row
execute function set_updated_at();

drop trigger if exists trg_condominiums_updated_at on condominiums;
create trigger trg_condominiums_updated_at
before update on condominiums
for each row
execute function set_updated_at();

drop trigger if exists trg_residents_updated_at on residents;
create trigger trg_residents_updated_at
before update on residents
for each row
execute function set_updated_at();

drop trigger if exists trg_billing_records_updated_at on billing_records;
create trigger trg_billing_records_updated_at
before update on billing_records
for each row
execute function set_updated_at();

drop trigger if exists trg_message_agents_updated_at on message_agents;
create trigger trg_message_agents_updated_at
before update on message_agents
for each row
execute function set_updated_at();

drop trigger if exists trg_cashflow_monthly_updated_at on cashflow_monthly;
create trigger trg_cashflow_monthly_updated_at
before update on cashflow_monthly
for each row
execute function set_updated_at();

create or replace view v_resident_portfolio as
with ranked_billing as (
  select
    br.*,
    row_number() over (
      partition by br.resident_id
      order by br.reference_month desc, br.due_date desc, br.created_at desc
    ) as rn
  from billing_records br
)
select
  r.id as resident_id,
  r.full_name,
  r.unit_label,
  r.phone,
  r.email,
  r.monthly_fee_cents,
  r.is_active,
  c.id as condominium_id,
  c.name as condominium_name,
  c.district,
  rb.id as current_billing_record_id,
  coalesce(rb.status, 'paid'::billing_status) as current_status,
  coalesce(rb.days_overdue, 0) as current_days_overdue,
  coalesce(rb.amount_cents, r.monthly_fee_cents) as current_amount_cents,
  rb.reference_month,
  rb.due_date,
  rb.stage,
  c.fee_due_rule,
  c.fee_due_day
from residents r
join condominiums c on c.id = r.condominium_id
left join ranked_billing rb
  on rb.resident_id = r.id
 and rb.rn = 1;

create or replace view v_overdue_residents as
select *
from v_resident_portfolio
where current_status = 'overdue';

create or replace view v_message_history as
select
  ml.id,
  ml.sent_at,
  ml.created_at,
  ml.status,
  ml.channel,
  ml.stage,
  r.full_name as resident_name,
  r.unit_label,
  c.name as condominium_name,
  ma.channel as agent_channel,
  ml.subject,
  ml.body,
  coalesce(ml.recipient, r.email::text, '') as recipient
from message_logs ml
join residents r on r.id = ml.resident_id
join condominiums c on c.id = ml.condominium_id
left join message_agents ma on ma.id = ml.agent_id
order by coalesce(ml.sent_at, ml.created_at) desc;
