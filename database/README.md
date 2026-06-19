# Banco do MVP no Neon

Estruturei este banco com base no frontend publicado em `https://sistema-de-inadimplentes.vercel.app/` e no que o app realmente mostra hoje:

- login simples
- dashboard com métricas de inadimplência
- gestão de agentes por canal
- cobrança manual com histórico de mensagens
- cadastro de condomínios
- cadastro de condôminos
- fluxo de caixa mensal

## Ordem de execução no SQL Editor do Neon

1. Rode `database/neon_mvp_schema.sql`
2. Rode `database/neon_mvp_seed.sql`

## Migrações incrementais

Se o banco já existir no Neon, rode também:

- `database/neon_mvp_migration_message_recipient.sql`: adiciona o destinatário real no histórico de mensagens.

## Tabelas principais

- `app_users`: operadores do painel
- `condominiums`: condomínios cadastrados
- `residents`: condôminos vinculados a um condomínio e unidade
- `billing_records`: cobranças/mensalidades e situação de pagamento
- `message_agents`: configuração dos canais de cobrança
- `message_logs`: histórico de mensagens enviadas ou simuladas
- `cashflow_monthly`: resumo mensal de caixa

## Views prontas para o frontend

- `v_resident_portfolio`: resumo operacional do condômino com status atual
- `v_overdue_residents`: lista pronta para a tela de cobrança e prioridade do dashboard
- `v_message_history`: histórico pronto para listagem

## Observações de modelagem

- Mantive o banco propositalmente enxuto para o MVP.
- Não tratei o sistema como multi-tenant SaaS.
- O histórico de cobrança fica em `billing_records` e `message_logs`, o que já permite evoluir depois sem refazer tudo.
- O fluxo de caixa aceita linhas globais do portfólio e, se quisermos depois, linhas por condomínio.

## Status atual do banco

O banco foi zerado para permitir cadastrar a demonstracao do zero pelo painel publicado.

Tabelas zeradas:

- `condominiums`
- `residents`
- `billing_records`
- `message_logs`
- `cashflow_monthly`

A tabela `message_agents` foi mantida com os canais do MVP para o frontend continuar exibindo WhatsApp, e-mail e SMS.
