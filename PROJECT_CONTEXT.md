# Project Context

## Resumo do projeto

Este projeto e um MVP de agente de IA para administradoras condominiais.

O objetivo inicial nao e construir o produto final completo, e sim criar uma demonstracao funcional e clara para apresentar a potenciais administradoras, mostrando como a cobranca e a comunicacao com moradores inadimplentes podem ser organizadas por um sistema com apoio de IA.

## Objetivo desta fase

Nesta etapa, estamos priorizando:

- frontend funcional
- demonstracao visual convincente
- fluxos claros de cobranca
- organizacao por condominio
- envio real por e-mail com operacao simples
- envio real por WhatsApp via W-API em fluxo manual controlado

Ainda nao estamos priorizando:

- backend completo de producao
- automacoes reais em canais externos
- regua diaria completa de cobranca com agendamento por vencimento
- arquitetura final escalavel
- autenticacao complexa
- multiempresa compartilhada

## Direcao do produto

O sistema deve ajudar administradoras a:

- visualizar adimplentes e inadimplentes
- acompanhar cobrancas por canal
- gerenciar mensagens por WhatsApp, e-mail e SMS
- cadastrar condominios
- cadastrar condominos
- acompanhar historico de comunicacoes
- visualizar cada condominio separadamente
- acompanhar um fluxo de caixa simples

## Estado funcional atual

- O canal de e-mail esta ativo com envio via Resend.
- O canal de WhatsApp esta ativo para envio manual via W-API.
- SMS permanece no painel como canal futuro, bloqueado para envio no MVP atual.
- Condominios e condominos podem ser cadastrados e editados.
- Condominios podem ser visualizados por filtro operacional.
- Condominios possuem nome, bairro/regiao, quantidade de unidades e taxa media.
- Condominos possuem condominio, unidade, status, mensalidade, e-mail e telefone.
- O historico de mensagens registra status e destinatario quando disponivel.
- A aba `Configurações > Cobranças de teste` envia testes reais por e-mail ou WhatsApp, usando um condômino base para contexto e um destinatário manual.
- Webhooks da W-API apontam para o backend em `api/wapi/webhook.js`, protegidos por `WAPI_WEBHOOK_SECRET`.
- A rota `api/wapi/diagnostics.js` permite conferir configuracao, status da instancia e fila da W-API.
- A instancia atual e LITE em periodo de teste; por isso a W-API adiciona aviso automatico de instancia de teste nas mensagens.
- A estrutura de conversas do WhatsApp foi criada no Neon e o backend foi preparado localmente para salvar mensagens recebidas em `whatsapp_conversation_messages`.
- Envios manuais por WhatsApp tambem passam a ser gravados na estrutura de conversa, alem do historico operacional em `message_logs`.
- A primeira camada de IA via OpenRouter foi criada para analisar mensagens recebidas, classificar intencao e gerar sugestao curta, mas fica desligada enquanto `OPENROUTER_AI_ENABLED` nao estiver como `true`.
- O modelo inicial escolhido para baixo custo e `google/gemini-2.5-flash-lite`.
- A migracao de analise da IA foi aplicada no Neon, adicionando campos para intencao, confianca, sugestao e modelo usado em `whatsapp_conversation_messages`.
- A area `IA WhatsApp` do painel permite revisar a mensagem recebida, editar a sugestao da IA e enviar a resposta aprovada manualmente.
- A vinculacao por telefone considera a variacao brasileira com e sem o nono digito apos o DDD.
- A resposta automatica da IA pode ser liberada por `OPENROUTER_AI_AUTOREPLY_ENABLED=true`, respeitando confianca minima e bloqueios de seguranca.
- O backend calcula a data atual em `America/Sao_Paulo` e envia contexto temporal para a IA comparar vencimento, atraso e contestacoes do condomino.
- O webhook deve ignorar payloads de status do WhatsApp, especialmente `status@broadcast`, para evitar que publicacoes de status entrem como conversa privada ou acionem IA.

## Regra critica sobre arquitetura

Este projeto NAO deve ser tratado como SaaS multi-tenant neste MVP.

Pontos que precisam permanecer claros:

- nao estamos criando um sistema multilogin para varias administradoras no mesmo painel
- nao estamos desenhando uma arquitetura compartilhada entre muitos clientes
- nao devemos assumir separacao complexa de acesso por empresa dentro da mesma aplicacao

Direcao assumida para o projeto:

- o MVP sera pensado como uma demonstracao de sistema dedicado
- mesmo em uma fase futura mais madura, a referencia atual e que cada administradora tenha seu proprio ambiente ou sistema separado

Isso deve evitar que decisoes futuras empurrem o projeto para uma arquitetura mais complexa do que o necessario nesta fase.

## Stack e abordagem atual

- frontend em `Vite`, com `HTML`, `CSS` e `JavaScript`
- backend serverless em `api/` com `Node.js`
- banco do MVP com `Neon Postgres`
- envio de e-mail com `Resend`
- envio de WhatsApp com `W-API`
- integracoes futuras com `WhatsApp`, `SMS` e possivelmente `Ucondo` ou `Superlogica`

## Forma de validacao do MVP

Este MVP precisa ser validado principalmente por:

- clareza visual
- fluxo de uso simples
- telas que mostrem valor comercial
- envio real de cobranca por e-mail
- envio real de cobranca por WhatsApp
- organizacao por condominio
- facilidade de demonstracao para administradoras

## O que nao confundir

Nao devemos confundir:

- demonstracao com sistema final de producao
- login simples com autenticacao real
- simulacao de envio com integracao real
- MVP dedicado com plataforma multiempresa
- painel visual com operacao completa de backend
- envio manual por WhatsApp com conversa automatica por IA

## Decisoes atuais registradas

- iniciar pelo frontend
- usar dados simulados no inicio
- preparar o MVP para exibicao local e deploy simples na `Vercel`
- evitar complexidade desnecessaria
- manter o foco em cobranca e inadimplencia
- manter SMS sinalizado como indisponivel ate existir integracao real
- manter WhatsApp em fluxo manual controlado antes de qualquer automacao
- nao ativar IA conversacional ate que mensagens recebidas estejam salvas e auditaveis
- usar LLM primeiro como sugestao assistida, antes de liberar resposta automatica direta no WhatsApp
- manter resposta automatica atras de variavel de ambiente, permitindo desligar a IA sem alterar codigo
- quando a resposta automatica estiver desligada, respostas sugeridas pela IA so devem sair pelo WhatsApp apos clique manual do operador na area `IA WhatsApp`
- quando a resposta automatica estiver ligada, bloquear contestacao, pedido humano e pagamento realizado; nesses casos deve seguir para revisao humana
- se o condomino contestar data ou valor, a IA deve comparar com dados do sistema antes de reconhecer erro; se o sistema nao comprovar, deve encaminhar para humano
- SMS deve permanecer fora do escopo operacional real deste MVP, ficando apenas como canal futuro representado no painel
- a direcao do produto real e substituir boa parte do envio manual por uma regua automatica baseada no vencimento de cada fatura, com datas calculadas pelo sistema e disparos controlados por regras configuraveis
- nao mexer no fluxo de caixa por enquanto sem necessidade clara de banco
- testes de cobrança devem reaproveitar `message_logs` e marcar o assunto com `Teste -`, evitando nova tabela enquanto o MVP nao tiver régua automática real

## Proximas referencias

Este arquivo guarda o contexto do projeto e as decisoes de direcionamento.

O detalhamento funcional do que precisa existir no MVP deve ficar em `SPEC.md`.
