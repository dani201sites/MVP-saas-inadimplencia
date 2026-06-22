# Banco do MVP no Neon

Estruturei este banco com base no frontend publicado em `https://sistema-de-inadimplentes.vercel.app/` e no que o app realmente mostra hoje:

- login simples
- dashboard com métricas de inadimplência
- gestão de agentes por canal
- cobrança manual por e-mail e WhatsApp com histórico de mensagens
- cadastro e edição de condomínios
- cadastro e edição de condôminos com e-mail e telefone
- fluxo de caixa mensal

## Ordem de execução no SQL Editor do Neon

1. Rode `database/neon_mvp_schema.sql`
2. Rode `database/neon_mvp_seed.sql`

## Migrações incrementais

Se o banco já existir no Neon, rode também:

- `database/neon_mvp_migration_message_recipient.sql`: adiciona o destinatário real no histórico de mensagens.
- `database/neon_mvp_migration_whatsapp_conversations.sql`: cria conversas e mensagens recebidas/enviadas do WhatsApp para futura IA conversacional.
- `database/neon_mvp_migration_whatsapp_ai_analysis.sql`: adiciona campos de analise da IA nas mensagens de WhatsApp e expõe a ultima sugestao na view de conversas.
- `database/neon_mvp_migration_condominium_fee_due_rule.sql`: adiciona a regra de vencimento da taxa condominial por condominio, com padrao de `5º dia util`.

## Tabelas principais

- `app_users`: operadores do painel
- `condominiums`: condomínios cadastrados, incluindo regra de vencimento da taxa condominial
- `residents`: condôminos vinculados a um condomínio e unidade
- `billing_records`: cobranças/mensalidades e situação de pagamento
- `message_agents`: configuração dos canais de cobrança
- `message_logs`: histórico de mensagens, status de envio e destinatário
- `whatsapp_conversations`: conversa por contato do WhatsApp, com vínculo opcional ao condômino
- `whatsapp_conversation_messages`: mensagens individuais da conversa, separando entrada, saída, origem humana, IA ou sistema, com campos opcionais para intencao e sugestao da IA
- `cashflow_monthly`: resumo mensal de caixa

## Views prontas para o frontend

- `v_resident_portfolio`: resumo operacional do condômino com status atual
- `v_overdue_residents`: lista pronta para a tela de cobrança e prioridade do dashboard
- `v_message_history`: histórico pronto para listagem, incluindo destinatário quando disponível
- `v_whatsapp_conversations`: resumo das conversas de WhatsApp com última mensagem e vínculo com condômino

## Observações de modelagem

- Mantive o banco propositalmente enxuto para o MVP.
- Não tratei o sistema como multi-tenant SaaS.
- A regra de vencimento do condominio fica em `fee_due_rule` e `fee_due_day`; o padrao para condominios existentes e `business_day` com dia `5`.
- O histórico de cobrança fica em `billing_records` e `message_logs`, o que já permite evoluir depois sem refazer tudo.
- O fluxo de caixa aceita linhas globais do portfólio e, se quisermos depois, linhas por condomínio.
- O envio por WhatsApp usa o mesmo `message_logs`, gravando `channel = whatsapp`, destinatario e `external_message_id` retornado pela W-API quando disponivel.
- Para conversa bidirecional com IA, a migracao `neon_mvp_migration_whatsapp_conversations.sql` prepara as tabelas de conversa, direcao da mensagem, origem e identificadores como telefone e `senderLid`.
- A migracao `neon_mvp_migration_whatsapp_ai_analysis.sql` ja foi aplicada no Neon antes de ligar `OPENROUTER_AI_ENABLED=true` em producao.

## Status atual do banco

O banco foi zerado para permitir cadastrar a demonstracao do zero pelo painel publicado.

Tabelas zeradas:

- `condominiums`
- `residents`
- `billing_records`
- `message_logs`
- `cashflow_monthly`

A tabela `message_agents` foi mantida com os canais do MVP para o frontend continuar exibindo WhatsApp, e-mail e SMS. No MVP atual, e-mail e WhatsApp estao integrados para envio real; SMS permanece como canal futuro.

## Status atual da integracao W-API

- A instancia W-API usada no teste e LITE e esta em periodo de teste.
- O backend usa `WAPI_INSTANCE_ID`, `WAPI_TOKEN`, `WAPI_SEND_MODE`, `WAPI_DEFAULT_DELAY_SECONDS` e `WAPI_WEBHOOK_SECRET` na Vercel.
- `api/_lib/wapi.js` centraliza envio de texto, status da instancia e consulta de fila.
- `api/wapi/webhook.js` recebe eventos de webhook protegidos por segredo.
- `api/wapi/diagnostics.js` permite validar status da instancia e fila via URL protegida.
- O primeiro envio real por WhatsApp foi validado, com aviso automatico da W-API indicando instancia de teste.
- A migracao `database/neon_mvp_migration_whatsapp_conversations.sql` foi aplicada no Neon e verificada com as tabelas `whatsapp_conversations`, `whatsapp_conversation_messages` e a view `v_whatsapp_conversations`.
- A migracao `database/neon_mvp_migration_whatsapp_ai_analysis.sql` foi aplicada no Neon e verificada com os campos de IA, os indices auxiliares e as colunas `last_ai_*` da view `v_whatsapp_conversations`.
- O backend foi preparado para gravar `webhookReceived` como mensagem `inbound` e envios manuais por WhatsApp como mensagem `outbound`.
- A LLM via OpenRouter deve entrar depois desta camada, lendo a conversa salva para sugerir resposta ou acionar envio automatico em regras seguras.
- A primeira integracao OpenRouter foi criada no backend em modo assistido: ela analisa apenas mensagens recebidas, classifica a intencao e salva uma sugestao curta quando `OPENROUTER_AI_ENABLED=true`.
- A resposta automatica pelo WhatsApp fica controlada por variavel de ambiente e, quando acionada, registra a mensagem enviada em `whatsapp_conversation_messages` com origem `ai`.
