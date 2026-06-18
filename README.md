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
- banco de dados com `Neon Postgres`
- frontend em `Vite`
- possibilidade de migracao futura para `Next.js`, se fizer sentido
- integração futura com plataformas como `Ucondo` ou `Superlógica`

## Status atual

O projeto saiu da fase puramente conceitual e entrou na fase de estruturacao do frontend do MVP.

Ja existe uma primeira demonstracao funcional publicada com:

- login simples
- dashboard
- cadastro de condominios
- cadastro de condominos
- painel de agentes
- tela de cobrancas
- historico de mensagens
- fluxo de caixa simples
- estrutura pronta para deploy simples na `Vercel`
- persistencia no `Neon Postgres` via endpoints serverless em `api/`

As integracoes reais com WhatsApp, e-mail, SMS e automacoes ainda nao fazem parte desta etapa inicial. O banco de dados do MVP esta preparado no `Neon Postgres` para persistir dados da demonstracao.

Status validado:

- app publicado na `Vercel` carregando `/api/bootstrap` com status `200`
- login visual entrando no painel depois da correcao de renderizacao do frontend
- banco de dados zerado para novo cadastro manual da demonstracao
- tabelas operacionais sem dados iniciais: `condominiums`, `residents`, `billing_records`, `message_logs` e `cashflow_monthly`
- agentes de canal mantidos em `message_agents` para preservar WhatsApp, e-mail e SMS no painel

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
- marcar pelo menos `Production`; `Preview` tambem pode ser marcado
- fazer novo deploy depois de salvar a variavel

Teste minimo depois do deploy:

- abrir o app publicado
- entrar no painel
- confirmar nos logs da `Vercel` que `/api/bootstrap` retorna `200`
- cadastrar um condominio ou condomino de teste
- atualizar a pagina e confirmar que o dado continuou salvo

Se o app ficar preso na tela de login, olhar primeiro os logs da funcao `/api/bootstrap` na `Vercel`.

## Proximos passos

Proximos passos mais provaveis:

- cadastrar dados reais de demonstracao pelo painel publicado
- criar tela individual por condominio
- criar regua simples de cobranca
- melhorar tratamento visual para estados vazios do dashboard

## Arquivos de referencia

- `PROJECT_CONTEXT.md`: contexto, direcao e decisoes do projeto
- `SPEC.md`: escopo funcional do MVP
