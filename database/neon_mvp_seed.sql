insert into app_users (full_name, email, password_hash, role)
values (
  'Administrador Demo',
  'admin@condoagent.com',
  '$demo$substituir-quando-auth-real$demo$',
  'admin'
)
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  updated_at = now();

insert into condominiums (name, slug, district, units_count, average_fee_cents)
values
  ('Residencial Aurora', 'residencial-aurora', 'Centro', 84, 62000),
  ('Condomínio Jardins', 'condominio-jardins', 'Vila Nova', 126, 74000),
  ('Edifício Atlantic', 'edificio-atlantic', 'Boa Vista', 58, 91000)
on conflict (slug) do update
set
  name = excluded.name,
  district = excluded.district,
  units_count = excluded.units_count,
  average_fee_cents = excluded.average_fee_cents,
  updated_at = now();

insert into residents (condominium_id, full_name, unit_label, monthly_fee_cents)
select c.id, data.full_name, data.unit_label, data.monthly_fee_cents
from (
  values
    ('residencial-aurora', 'Marina Alves', 'A-204', 62000),
    ('residencial-aurora', 'Rafael Nogueira', 'B-110', 62000),
    ('condominio-jardins', 'Camila Torres', '302', 74000),
    ('condominio-jardins', 'Bruno Martins', '611', 74000),
    ('edificio-atlantic', 'Paula Menezes', '1201', 91000),
    ('edificio-atlantic', 'Sérgio Lima', '804', 91000)
) as data(slug, full_name, unit_label, monthly_fee_cents)
join condominiums c on c.slug = data.slug
on conflict (condominium_id, unit_label) do update
set
  full_name = excluded.full_name,
  monthly_fee_cents = excluded.monthly_fee_cents,
  updated_at = now();

insert into billing_records (
  resident_id,
  condominium_id,
  reference_month,
  due_date,
  amount_cents,
  status,
  days_overdue,
  stage,
  paid_at,
  notes
)
select
  r.id,
  r.condominium_id,
  date_trunc('month', current_date)::date,
  current_date - data.days_overdue,
  data.amount_cents,
  data.status::billing_status,
  data.days_overdue,
  data.stage::collection_stage,
  case
    when data.status = 'paid' then now() - interval '2 days'
    else null
  end,
  data.notes
from (
  values
    ('Residencial Aurora', 'A-204', 62000, 'overdue', 9, 'overdue_light', 'Pendência ativa do mês corrente'),
    ('Residencial Aurora', 'B-110', 62000, 'paid', 0, null, 'Pagamento confirmado no mês corrente'),
    ('Condomínio Jardins', '302', 74000, 'overdue', 18, 'overdue_moderate', 'Cobrança em acompanhamento'),
    ('Condomínio Jardins', '611', 74000, 'paid', 0, null, 'Pagamento confirmado no mês corrente'),
    ('Edifício Atlantic', '1201', 91000, 'overdue', 31, 'pre_legal', 'Caso crítico para o MVP'),
    ('Edifício Atlantic', '804', 91000, 'paid', 0, null, 'Pagamento confirmado no mês corrente')
) as data(condominium_name, unit_label, amount_cents, status, days_overdue, stage, notes)
join condominiums c on c.name = data.condominium_name
join residents r
  on r.condominium_id = c.id
 and r.unit_label = data.unit_label
on conflict (resident_id, reference_month) do update
set
  due_date = excluded.due_date,
  amount_cents = excluded.amount_cents,
  status = excluded.status,
  days_overdue = excluded.days_overdue,
  stage = excluded.stage,
  paid_at = excluded.paid_at,
  notes = excluded.notes,
  updated_at = now();

insert into message_agents (channel, status, queue_size, tone_label, base_template)
values
  (
    'whatsapp',
    'active',
    12,
    'objetivo e humano',
    'Olá, {{nome}}. Identificamos uma pendência referente à unidade {{unidade}} do {{condominio}}. Podemos te ajudar com a regularização?'
  ),
  (
    'email',
    'active',
    7,
    'formal e claro',
    'Prezado(a) {{nome}}, identificamos uma pendência financeira referente à unidade {{unidade}} do {{condominio}}. Seguem os detalhes para regularização.'
  ),
  (
    'sms',
    'paused',
    3,
    'curto e direto',
    'Olá, {{nome}}. Há uma pendência da unidade {{unidade}}. Entre em contato para regularizar.'
  )
on conflict (channel) do update
set
  status = excluded.status,
  queue_size = excluded.queue_size,
  tone_label = excluded.tone_label,
  base_template = excluded.base_template,
  updated_at = now();

insert into message_logs (
  billing_record_id,
  resident_id,
  condominium_id,
  agent_id,
  created_by_user_id,
  channel,
  stage,
  body,
  status,
  queued_at,
  sent_at
)
select
  br.id,
  r.id,
  c.id,
  ma.id,
  u.id,
  data.channel::channel_type,
  data.stage::collection_stage,
  data.body,
  'simulated',
  now() - data.queue_offset,
  now() - data.sent_offset
from (
  values
    (
      'Residencial Aurora',
      'A-204',
      'whatsapp',
      'overdue_light',
      'Lembrete enviado sobre pendência da unidade A-204.',
      interval '3 hours',
      interval '2 hours'
    ),
    (
      'Condomínio Jardins',
      '302',
      'email',
      'overdue_moderate',
      'E-mail enviado com resumo do débito e segunda via.',
      interval '1 day',
      interval '20 hours'
    )
) as data(condominium_name, unit_label, channel, stage, body, queue_offset, sent_offset)
join condominiums c on c.name = data.condominium_name
join residents r
  on r.condominium_id = c.id
 and r.unit_label = data.unit_label
join billing_records br
  on br.resident_id = r.id
 and br.reference_month = date_trunc('month', current_date)::date
join message_agents ma on ma.channel = data.channel::channel_type
join app_users u on u.email = 'admin@condoagent.com'
where not exists (
  select 1
  from message_logs ml
  where ml.billing_record_id = br.id
    and ml.channel = data.channel::channel_type
    and ml.body = data.body
);

insert into cashflow_monthly (condominium_id, reference_month, amount_received_cents, amount_pending_cents, notes)
select *
from (
  values
    (null::uuid, date '2026-01-01', 9200000, 940000, 'Visão consolidada do MVP'),
    (null::uuid, date '2026-02-01', 9850000, 780000, 'Visão consolidada do MVP'),
    (null::uuid, date '2026-03-01', 9480000, 1120000, 'Visão consolidada do MVP'),
    (null::uuid, date '2026-04-01', 10240000, 690000, 'Visão consolidada do MVP'),
    (null::uuid, date '2026-05-01', 9710000, 1240000, 'Visão consolidada do MVP'),
    (null::uuid, date '2026-06-01', 10680000, 817000, 'Visão consolidada do MVP')
) as data(condominium_id, reference_month, amount_received_cents, amount_pending_cents, notes)
where not exists (
  select 1
  from cashflow_monthly cm
  where cm.condominium_id is null
    and cm.reference_month = data.reference_month
);
