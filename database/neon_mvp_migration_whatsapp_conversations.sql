do $$
begin
  create type conversation_status as enum ('open', 'waiting_human', 'resolved', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type conversation_message_direction as enum ('inbound', 'outbound');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type conversation_message_origin as enum ('resident', 'operator', 'ai', 'system');
exception
  when duplicate_object then null;
end $$;

create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references residents(id) on delete set null,
  condominium_id uuid references condominiums(id) on delete set null,
  channel channel_type not null default 'whatsapp',
  contact_phone text,
  contact_lid text,
  contact_name text,
  status conversation_status not null default 'open',
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  ai_enabled boolean not null default false,
  ai_handoff_required boolean not null default false,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_conversations_contact_check
    check (contact_phone is not null or contact_lid is not null)
);

create table if not exists whatsapp_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  resident_id uuid references residents(id) on delete set null,
  condominium_id uuid references condominiums(id) on delete set null,
  message_log_id uuid references message_logs(id) on delete set null,
  direction conversation_message_direction not null,
  origin conversation_message_origin not null,
  body text not null,
  external_message_id text,
  external_inserted_id text,
  external_event text,
  sender_phone text,
  sender_lid text,
  sender_name text,
  raw_payload jsonb,
  received_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_conversations_phone_key
  on whatsapp_conversations(contact_phone)
  where contact_phone is not null;

create unique index if not exists whatsapp_conversations_lid_key
  on whatsapp_conversations(contact_lid)
  where contact_lid is not null;

create index if not exists whatsapp_conversations_resident_idx
  on whatsapp_conversations(resident_id);

create index if not exists whatsapp_conversations_status_idx
  on whatsapp_conversations(status, last_message_at desc);

create unique index if not exists whatsapp_conversation_messages_external_message_key
  on whatsapp_conversation_messages(external_message_id)
  where external_message_id is not null;

create index if not exists whatsapp_conversation_messages_conversation_idx
  on whatsapp_conversation_messages(conversation_id, created_at desc);

create index if not exists whatsapp_conversation_messages_resident_idx
  on whatsapp_conversation_messages(resident_id, created_at desc);

drop trigger if exists trg_whatsapp_conversations_updated_at on whatsapp_conversations;
create trigger trg_whatsapp_conversations_updated_at
before update on whatsapp_conversations
for each row
execute function set_updated_at();

create or replace view v_whatsapp_conversations as
select
  wc.id,
  wc.status,
  wc.contact_phone,
  wc.contact_lid,
  wc.contact_name,
  wc.last_message_at,
  wc.last_inbound_at,
  wc.last_outbound_at,
  wc.ai_enabled,
  wc.ai_handoff_required,
  wc.ai_summary,
  r.full_name as resident_name,
  r.unit_label,
  c.name as condominium_name,
  (
    select wcm.body
    from whatsapp_conversation_messages wcm
    where wcm.conversation_id = wc.id
    order by wcm.created_at desc
    limit 1
  ) as last_message_body
from whatsapp_conversations wc
left join residents r on r.id = wc.resident_id
left join condominiums c on c.id = wc.condominium_id
order by coalesce(wc.last_message_at, wc.created_at) desc;
