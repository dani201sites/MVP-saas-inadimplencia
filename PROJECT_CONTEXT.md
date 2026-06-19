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

Ainda nao estamos priorizando:

- backend completo de producao
- automacoes reais em canais externos
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
- WhatsApp e SMS permanecem no painel como canais futuros, bloqueados para envio no MVP atual.
- Condominios e condominos podem ser cadastrados e editados.
- Condominios podem ser visualizados por filtro operacional.
- Condominios possuem condominio, unidade, status, mensalidade, e-mail e telefone.
- O historico de mensagens registra status e destinatario quando disponivel.

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
- integracoes futuras com `WhatsApp`, `SMS` e possivelmente `Ucondo` ou `Superlogica`

## Forma de validacao do MVP

Este MVP precisa ser validado principalmente por:

- clareza visual
- fluxo de uso simples
- telas que mostrem valor comercial
- envio real de cobranca por e-mail
- organizacao por condominio
- facilidade de demonstracao para administradoras

## O que nao confundir

Nao devemos confundir:

- demonstracao com sistema final de producao
- login simples com autenticacao real
- simulacao de envio com integracao real
- MVP dedicado com plataforma multiempresa
- painel visual com operacao completa de backend

## Decisoes atuais registradas

- iniciar pelo frontend
- usar dados simulados no inicio
- preparar o MVP para exibicao local e deploy simples na `Vercel`
- evitar complexidade desnecessaria
- manter o foco em cobranca e inadimplencia

## Proximas referencias

Este arquivo guarda o contexto do projeto e as decisoes de direcionamento.

O detalhamento funcional do que precisa existir no MVP deve ficar em `SPEC.md`.
