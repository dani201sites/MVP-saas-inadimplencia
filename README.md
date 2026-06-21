# MVP Agente de IA para Administradoras Condominiais

Projeto em fase de MVP funcional para criar agentes de inteligência artificial voltados a administradoras condominiais.

## Visão geral

O sistema terá como objetivo automatizar comunicações relacionadas a pagamentos e inadimplência, com uma interface visual simples para que o administrador consiga acompanhar e gerenciar os dados com facilidade.

## Objetivo do MVP

Construir uma demonstração funcional para apresentar a administradoras condominiais, mostrando como agentes de IA podem apoiar processos de comunicação e cobrança de forma organizada, escalável e com operação simples.

Neste momento, o foco do projeto e manter um MVP funcional para demonstracao, com painel administrativo, persistencia no Neon Postgres, envio real de cobrancas por e-mail via Resend, envio real de WhatsApp via W-API em fase de teste e primeira camada de IA via OpenRouter em modo assistido.

## Contexto do projeto

O foco principal é automatizar contatos com moradores e unidades em diferentes situações, como:

- lembretes amigáveis antes do vencimento
- avisos leves na data de vencimento
- novos avisos após o vencimento
- mensagens com tom mais firme em atrasos maiores
- comunicações de pré-jurídico e extrajudicial, quando necessário

Além da cobrança, o sistema também poderá evoluir para outras comunicações operacionais, como avisos de assembleias e outras notificações de interesse da administração.

## Escopo atual do MVP

O MVP atual e uma demonstracao visual e funcional com banco persistente. O canal de e-mail ja possui envio real; WhatsApp foi conectado via W-API para envio manual de cobrancas; SMS segue representado no painel, mas ainda indisponivel para envio.

O painel deve permitir:

- visualizar um dashboard de adimplentes e inadimplentes
- acompanhar cobrancas por WhatsApp, e-mail e SMS
- gerenciar agentes responsaveis pelos envios
- cadastrar condominios
- cadastrar condominos
- visualizar cada condominio separadamente
- exibir um fluxo de caixa simples para demonstracao

Neste estagio, o objetivo e validar a proposta comercial e operacional do produto, nao construir ainda a estrutura final de producao.

## Regra importante sobre login e estrutura do sistema

Este projeto NAO deve ser tratado como um sistema multilogin ou multi-tenant neste MVP.

Para evitar confusao futuras:

- o MVP nao tera arquitetura de varias administradoras usando o mesmo painel com separacao complexa de acesso
- o objetivo atual nao e criar um SaaS multiempresa completo
- mesmo em uma fase futura mais realista, a direcao do projeto e que cada administradora tenha seu proprio sistema ou ambiente separado

Ou seja:

- nao devemos desenhar agora uma arquitetura complexa de multilogin
- nao devemos assumir uma unica plataforma compartilhada por varias administradoras
- o produto deve ser pensado como um sistema dedicado por operacao ou por cliente

## Público-alvo

- administradoras condominiais
- síndicos
- equipes administrativas

## Estrutura atual do MVP

- backend serverless em `api/` com `Node.js`
- banco de dados com `Neon Postgres`
- frontend em `Vite`
- envio de e-mail com `Resend`
- envio de WhatsApp com `W-API`
- possibilidade de migracao futura para `Next.js`, se fizer sentido
- integracao futura com plataformas como `Ucondo` ou `Superlógica`

## Status atual

O projeto saiu da fase puramente conceitual e entrou na fase de estruturacao do frontend do MVP.

Ja existe uma primeira demonstracao funcional publicada com:

- login simples
- dashboard
- cadastro e edicao de condominios
- cadastro e edicao de condominos com e-mail e telefone
- painel de agentes
- tela de cobrancas com envio real por e-mail
- tela de cobrancas com envio real por WhatsApp via W-API
- aba `Configurações > Cobranças de teste` com envio real por e-mail ou WhatsApp usando condômino base e destinatário manual
- historico de mensagens com status e destinatario
- fluxo de caixa simples
- estrutura pronta para deploy simples na `Vercel`
- persistencia no `Neon Postgres` via endpoints serverless em `api/`

SMS e automacoes de producao ainda nao fazem parte desta etapa funcional. O WhatsApp ja pode ser usado para envio manual de cobrancas, e a IA conversacional ja existe em modo controlado por variaveis de ambiente para analise, sugestao e resposta automatica limitada.

Status validado:

- app publicado na `Vercel` carregando `/api/bootstrap` com status `200`
- login visual entrando no painel depois da correcao de renderizacao do frontend
- banco de dados zerado para novo cadastro manual da demonstracao
- tabelas operacionais sem dados iniciais: `condominiums`, `residents`, `billing_records`, `message_logs` e `cashflow_monthly`
- agentes de canal mantidos em `message_agents` para preservar WhatsApp, e-mail e SMS no painel
- migracao `database/neon_mvp_migration_message_recipient.sql` aplicada no Neon para registrar destinatario real no historico
- endpoint `api/wapi/webhook.js` criado para receber eventos da W-API com segredo em query string
- endpoint `api/wapi/diagnostics.js` criado para validar variaveis, status da instancia e fila de mensagens da W-API
- envio manual por WhatsApp validado com a instancia LITE de teste da W-API
- durante o periodo de teste, a W-API adiciona automaticamente um aviso de "INSTANCIA DE TESTE" antes da mensagem enviada
- migracao `database/neon_mvp_migration_whatsapp_conversations.sql` aplicada no Neon para preparar conversas de WhatsApp
- backend preparado para salvar mensagens recebidas pelo webhook `webhookReceived` e envios manuais na estrutura de conversas
- camada inicial de IA via OpenRouter criada para analisar mensagens recebidas, classificar intencao e salvar sugestao de resposta, sem envio automatico
- migracao `database/neon_mvp_migration_whatsapp_ai_analysis.sql` aplicada no Neon para registrar analise e sugestao da IA nas mensagens de WhatsApp
- area `IA WhatsApp` criada no painel para revisar mensagens recebidas, editar sugestoes e enviar respostas aprovadas manualmente
- vinculo de conversas tenta localizar o condomino mesmo quando o WhatsApp retorna numero brasileiro sem o nono digito
- resposta automatica da IA preparada por variaveis, com confianca minima e bloqueio para contestacao, pedido humano e pagamento realizado
- prompt da IA recebe contexto temporal calculado pelo backend em `America/Sao_Paulo`, permitindo responder se o vencimento ja passou, vence hoje ou ainda vai vencer
- webhooks de status do WhatsApp, como `status@broadcast`, devem ser ignorados para nao aparecerem na area `IA WhatsApp` nem acionarem resposta automatica
- cobrancas de teste sao salvas no mesmo `message_logs`, com assunto iniciado por `Teste -`, sem exigir nova migracao de banco nesta etapa
- SMS permanece apenas como canal futuro representado no painel; nao faz parte da operacao real prevista para este MVP

## Próximos passos

À medida que o projeto evoluir, este arquivo pode ser expandido com:

- regras de negócio
- fluxo das notificações
- arquitetura do sistema
- integrações
- funcionalidades do MVP
- decisões técnicas

## Deploy e conexao com Neon

O MVP esta organizado para deploy na `Vercel`, usando `Vite` no frontend e funcoes serverless em `api/` para conversar com o `Neon Postgres`.

Arquivos e pastas que devem ser publicados no `GitHub`:

- `api/`
- `database/`
- `src/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `vercel.json`
- `.gitignore`
- `.env.example`
- `README.md`
- `PROJECT_CONTEXT.md`
- `SPEC.md`

Arquivos e pastas que nao devem ser publicados:

- `.env`
- `.env.local`
- `node_modules/`
- `dist/`
- `.vercel/`
- `.DS_Store`

Configuracao obrigatoria na `Vercel`:

- criar a variavel de ambiente `DATABASE_URL`
- usar a connection string real do `Neon`
- criar `RESEND_API_KEY`, `EMAIL_FROM` e `EMAIL_SEND_MODE=live` para envio real de e-mail
- criar `WAPI_INSTANCE_ID`, `WAPI_TOKEN`, `WAPI_SEND_MODE=live`, `WAPI_DEFAULT_DELAY_SECONDS` e `WAPI_WEBHOOK_SECRET` para envio real de WhatsApp
- criar `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=google/gemini-2.5-flash-lite`, `OPENROUTER_APP_NAME` e `OPENROUTER_SITE_URL` para a camada de IA
- criar `OPENROUTER_AI_AUTOREPLY_ENABLED=false` e `OPENROUTER_AI_AUTOREPLY_MIN_CONFIDENCE=0.75` para controlar resposta automatica
- manter `OPENROUTER_AI_ENABLED=false` ate o primeiro teste controlado da IA ser autorizado
- marcar pelo menos `Production`; `Preview` tambem pode ser marcado
- fazer novo deploy depois de salvar a variavel

Teste minimo depois do deploy:

- abrir o app publicado
- entrar no painel
- confirmar nos logs da `Vercel` que `/api/bootstrap` retorna `200`
- cadastrar um condominio ou condomino de teste
- atualizar a pagina e confirmar que o dado continuou salvo
- abrir `/api/wapi/diagnostics?secret=SEU_SEGREDO` e confirmar que a W-API reconhece a instancia conectada
- enviar uma cobranca pequena por WhatsApp para um numero de teste com formato `55` + DDD + numero, sem espacos ou simbolos
- em `Configurações > Cobranças de teste`, selecionar um condômino base, informar e-mail ou telefone de teste e confirmar que o envio aparece no histórico com etiqueta `Teste`
- para testar IA, ligar `OPENROUTER_AI_ENABLED=true`, responder uma mensagem no WhatsApp e conferir se a ultima mensagem recebeu `ai_intent` e `ai_suggested_reply`
- para testar resposta automatica, ligar `OPENROUTER_AI_AUTOREPLY_ENABLED=true` somente depois do deploy e mandar uma mensagem simples, como promessa de pagamento ou duvida de valor

Se o app ficar preso na tela de login, olhar primeiro os logs da funcao `/api/bootstrap` na `Vercel`.

## Proximos passos

Proximos passos mais provaveis:

- cadastrar dados reais de demonstracao pelo painel publicado
- evoluir a visao individual por condominio alem do filtro operacional atual
- criar regua simples de cobranca
- planejar agendamento de e-mails com banco e rotina agendada
- ativar a IA em modo assistido para interpretar respostas dos condominos e sugerir respostas dentro de limites operacionais
- testar a area `IA WhatsApp` com respostas reais e aprovar manualmente as sugestoes antes de considerar automacao
- melhorar tratamento visual para estados vazios do dashboard

## Direcao futura da regua

Pensando no produto real, a direcao esperada e evoluir de envio manual para uma regua automatica de cobranca baseada no vencimento de cada fatura.

Exemplo de fluxo esperado:

- lembrete preventivo alguns dias antes do vencimento
- aviso no dia do vencimento
- follow-up alguns dias apos o vencimento
- novos avisos em marcos como 7, 14, 21 e 30 dias
- aviso extrajudicial ou pre-juridico em atrasos mais longos

Esses marcos nao devem ficar fixos no codigo. A ideia futura e que sejam configuraveis por operacao, com o sistema calculando as datas a partir do vencimento de cada condominio ou condomino e disparando automaticamente no momento certo.

## Arquivos de referencia

- `PROJECT_CONTEXT.md`: contexto, direcao e decisoes do projeto
- `SPEC.md`: escopo funcional do MVP
