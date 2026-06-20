alter table whatsapp_conversation_messages
  add column if not exists ai_intent text,
  add column if not exists ai_confidence numeric(4, 3),
  add column if not exists ai_should_reply boolean,
  add column if not exists ai_handoff_required boolean not null default false,
  add column if not exists ai_suggested_reply text,
  add column if not exists ai_analysis jsonb,
  add column if not exists ai_model text,
  add column if not exists ai_processed_at timestamptz;

create index if not exists whatsapp_conversation_messages_ai_intent_idx
  on whatsapp_conversation_messages(ai_intent, ai_processed_at desc)
  where ai_intent is not null;

create index if not exists whatsapp_conversation_messages_ai_handoff_idx
  on whatsapp_conversation_messages(ai_handoff_required, ai_processed_at desc)
  where ai_processed_at is not null;

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
  latest.body as last_message_body,
  latest.ai_intent as last_ai_intent,
  latest.ai_confidence as last_ai_confidence,
  latest.ai_should_reply as last_ai_should_reply,
  latest.ai_suggested_reply as last_ai_suggested_reply,
  latest.ai_processed_at as last_ai_processed_at
from whatsapp_conversations wc
left join residents r on r.id = wc.resident_id
left join condominiums c on c.id = wc.condominium_id
left join lateral (
  select
    wcm.body,
    wcm.ai_intent,
    wcm.ai_confidence,
    wcm.ai_should_reply,
    wcm.ai_suggested_reply,
    wcm.ai_processed_at
  from whatsapp_conversation_messages wcm
  where wcm.conversation_id = wc.id
  order by wcm.created_at desc
  limit 1
) latest on true
order by coalesce(wc.last_message_at, wc.created_at) desc;
