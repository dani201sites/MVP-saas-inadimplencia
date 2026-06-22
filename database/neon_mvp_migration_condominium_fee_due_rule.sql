alter table condominiums
  add column if not exists fee_due_rule text not null default 'business_day',
  add column if not exists fee_due_day integer not null default 5;

do $$
begin
  alter table condominiums
    add constraint condominiums_fee_due_rule_check
    check (fee_due_rule in ('calendar_day', 'business_day'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table condominiums
    add constraint condominiums_fee_due_day_check
    check (
      (fee_due_rule = 'calendar_day' and fee_due_day between 1 and 31)
      or (fee_due_rule = 'business_day' and fee_due_day between 1 and 22)
    );
exception
  when duplicate_object then null;
end $$;

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
