# MVP Agente de IA para Administradoras Condominiais

Projeto em fase inicial de planejamento para criar agentes de inteligência artificial voltados a administradoras condominiais.

## Visão geral

O sistema terá como objetivo automatizar comunicações relacionadas a pagamentos e inadimplência, com uma interface visual simples para que o administrador consiga acompanhar e gerenciar os dados com facilidade.

## Objetivo do MVP

Construir uma demonstração funcional para apresentar a administradoras condominiais, mostrando como agentes de IA podem apoiar processos de comunicação e cobrança de forma organizada, escalável e com operação simples.

Neste momento, o foco do projeto e iniciar pelo frontend funcional do painel administrativo, com dados simulados e fluxos visuais claros para demonstracao.

## Contexto do projeto

O foco principal é automatizar contatos com moradores e unidades em diferentes situações, como:

- lembretes amigáveis antes do vencimento
- avisos leves na data de vencimento
- novos avisos após o vencimento
- mensagens com tom mais firme em atrasos maiores
- comunicações de pré-jurídico e extrajudicial, quando necessário

Além da cobrança, o sistema também poderá evoluir para outras comunicações operacionais, como avisos de assembleias e outras notificações de interesse da administração.

## Escopo atual do MVP

O MVP atual sera pensado primeiro como uma demonstracao visual e funcional, antes das integracoes reais com canais externos.

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

- backend com `Node.js` e `TypeScript`
- banco de dados com `Supabase`
- frontend em `Vite`
- possibilidade de migracao futura para `Next.js`, se fizer sentido
- integração futura com plataformas como `Ucondo` ou `Superlógica`

## Status atual

O projeto saiu da fase puramente conceitual e entrou na fase de estruturacao do frontend do MVP.

Ja existe uma primeira demonstracao visual com:

- login simples
- dashboard
- cadastro de condominios
- cadastro de condominos
- painel de agentes
- tela de cobrancas
- historico de mensagens
- fluxo de caixa simples
- estrutura pronta para deploy simples na `Vercel`

As integracoes reais com WhatsApp, e-mail, SMS, banco de dados e automacoes ainda nao fazem parte desta etapa inicial.

## Próximos passos

À medida que o projeto evoluir, este arquivo pode ser expandido com:

- regras de negócio
- fluxo das notificações
- arquitetura do sistema
- integrações
- funcionalidades do MVP
- decisões técnicas

## Deploy do frontend

O frontend agora está organizado para deploy simples na `Vercel`, com:

- `Vite`
- `package.json` com scripts de desenvolvimento e build
- `vercel.json`
- `src/` com arquivos da interface

Fluxo esperado de publicacao:

- subir o projeto no `GitHub`
- importar o repositorio na `Vercel`
- executar o build padrao `npm run build`

## Proximos passos

Proximos passos mais provaveis:

- adicionar persistencia local para a demonstracao
- criar tela individual por condominio
- criar regua simples de cobranca
- preparar publicacao do MVP na `Vercel`

## Arquivos de referencia

- `PROJECT_CONTEXT.md`: contexto, direcao e decisoes do projeto
- `SPEC.md`: escopo funcional do MVP
