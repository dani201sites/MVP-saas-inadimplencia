# Spec do MVP

## Objetivo

Construir um frontend funcional de demonstracao para um agente de cobranca voltado a administradoras condominiais.

O MVP deve permitir visualizar como o sistema organiza:

- inadimplencia
- comunicacao por canal
- cadastro operacional
- acompanhamento por condominio

## Escopo funcional do MVP

O MVP deve conter as seguintes areas:

1. Login simples
2. Dashboard principal
3. Gestao de agentes
4. Gestao de cobrancas
5. Cadastro de condominios
6. Cadastro de condominos
7. Visao individual por condominio
8. Fluxo de caixa simples

## Telas do MVP

### 1. Login

Tela simples com:

- campo de e-mail
- campo de senha
- botao de entrada

Objetivo:

- apenas permitir acesso visual ao painel
- sem autenticacao real nesta fase

### 2. Dashboard principal

Deve mostrar:

- total previsto de receita
- total em aberto
- total de adimplentes
- total de inadimplentes
- total de mensagens enviadas
- distribuicao entre adimplentes e inadimplentes
- resumo dos canais ativos
- lista de condominos com maior prioridade de cobranca

### 3. Gestao de agentes

Deve mostrar:

- agente de WhatsApp
- agente de e-mail
- agente de SMS
- status de cada agente
- fila de mensagens por canal
- tom configurado por canal

Tambem deve permitir:

- editar mensagem base
- definir tom padrao
- simular configuracao do comportamento da IA

### 4. Gestao de cobrancas

Deve permitir:

- selecionar um condomino inadimplente
- escolher o canal de envio
- gerar uma mensagem de cobranca
- simular envio
- registrar o envio no historico

Historico deve mostrar:

- nome do condomino
- canal utilizado
- conteudo da mensagem
- horario do envio

### 5. Cadastro de condominios

Deve permitir:

- cadastrar nome do condominio
- cadastrar bairro ou regiao
- cadastrar quantidade de unidades
- cadastrar taxa media

Tambem deve exibir:

- lista de condominios cadastrados
- resumo simples de cada condominio
- total de condominos
- total de inadimplentes

### 6. Cadastro de condominos

Deve permitir:

- cadastrar nome
- vincular a um condominio
- informar unidade
- informar valor mensal
- marcar status como adimplente ou inadimplente
- informar dias em atraso

Tambem deve exibir:

- tabela de condominos
- status individual
- valor mensal
- condominio vinculado

### 7. Visao individual por condominio

Cada condominio deve poder ser visto separadamente.

Essa visao deve permitir:

- filtrar os dados por condominio
- enxergar condominos daquele condominio
- enxergar inadimplentes daquele condominio
- enxergar indicadores financeiros basicos daquele condominio

## Fluxo de caixa simples

Deve existir uma area com:

- grafico simples
- recebido no periodo
- pendente no periodo
- previsao total

Objetivo:

- reforcar valor visual e gerencial do MVP

## Regras funcionais desta fase

- os dados podem ser simulados
- os envios podem ser simulados
- os status podem ser simulados
- nao e necessario backend real nesta etapa
- nao e necessario login real nesta etapa

## Regras que nao fazem parte deste MVP

- multilogin entre varias administradoras
- arquitetura SaaS multi-tenant
- permissao complexa por perfil
- integracao real com Meta
- integracao real com Evolution API
- automacao real de envio
- leitura real de respostas
- banco de dados final de producao

## Criterios de validacao do MVP

O MVP sera considerado validado nesta fase se:

1. a navegacao entre as areas estiver clara
2. o painel comunicar visualmente a proposta do produto
3. a demonstracao de cobranca estiver convincente
4. a separacao por condominio estiver clara
5. as areas de WhatsApp, e-mail e SMS estiverem representadas
6. o dashboard passar percepcao de organizacao operacional

## Proximos passos provaveis apos esta fase

1. conectar o frontend aos endpoints da `Vercel`
2. usar o `Neon Postgres` como banco persistente do MVP
3. criar tela mais detalhada por condominio
4. criar regua de cobranca simples
5. validar o MVP publicado na `Vercel`
6. depois iniciar backend e integracoes reais de canais
