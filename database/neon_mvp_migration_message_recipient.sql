alter table message_logs
add column if not exists recipient text;

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
