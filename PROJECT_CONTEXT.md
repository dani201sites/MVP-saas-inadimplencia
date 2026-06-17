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
- simulacao de operacao real sem depender ainda de integracoes externas

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
- backend futuro com `Node.js` e `TypeScript`
- banco do MVP com `Neon Postgres`
- integracoes futuras com `WhatsApp`, `E-mail`, `SMS` e possivelmente `Ucondo` ou `Superlogica`

## Forma de validacao do MVP

Este MVP precisa ser validado principalmente por:

- clareza visual
- fluxo de uso simples
- telas que mostrem valor comercial
- simulacao convincente de cobranca
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
