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
9. Configuracoes com calendario de cobranca e cobrancas de teste

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
- indicacao clara quando um canal ainda nao esta integrado

Tambem deve permitir:

- editar mensagem base
- definir tom padrao
- configurar a mensagem usada na geracao da cobranca

### 4. Gestao de cobrancas

Deve permitir:

- selecionar um condomino cadastrado
- escolher o canal de envio
- gerar uma mensagem de cobranca usando o template configurado do agente
- enviar cobranca real por e-mail
- enviar cobranca real por WhatsApp via W-API quando o condomino possuir telefone cadastrado
- bloquear SMS enquanto nao estiver integrado
- registrar o envio no historico

Historico deve mostrar:

- nome do condomino
- canal utilizado
- status do envio
- destinatario quando disponivel
- conteudo da mensagem
- horario do envio

Modelos extremos devem permitir:

- editar um aviso pre-judicial
- editar um aviso extrajudicial
- aplicar o modelo escolhido na mensagem de cobranca manual
- manter esses modelos como apoio operacional, sem envio automatico nesta etapa

Tambem deve existir uma area de teste em `Configurações > Cobranças de teste` para:

- selecionar canal de teste
- selecionar tipo de mensagem
- selecionar um condomino base
- informar destinatario manual de teste
- enviar teste real por e-mail ou WhatsApp
- registrar o teste no historico com etiqueta visual

### 5. Cadastro de condominios

Deve permitir:

- cadastrar nome do condominio
- cadastrar bairro ou regiao
- cadastrar quantidade de unidades
- cadastrar taxa media
- cadastrar a regra de vencimento da taxa condominial, como dia fixo ou dia util
- editar dados basicos do condominio

Tambem deve exibir:

- lista de condominios cadastrados
- resumo simples de cada condominio
- total de condominos
- total de inadimplentes

### 6. Cadastro de condominos

Deve permitir:

- cadastrar nome
- cadastrar e-mail
- cadastrar telefone
- vincular a um condominio
- informar unidade
- informar valor mensal
- marcar status como adimplente ou inadimplente
- informar dias em atraso
- editar dados basicos do condomino

Tambem deve exibir:

- tabela de condominos
- status individual
- valor mensal
- vencimento da taxa herdado do condominio
- condominio vinculado
- contato principal

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
- o envio por e-mail pode ser real via Resend
- o envio por WhatsApp pode ser real via W-API
- cobrancas de teste usam o mesmo endpoint de envio real e o mesmo historico `message_logs`
- SMS deve ficar sinalizado como indisponivel ate a integracao existir
- os status podem ser simulados
- o backend atual e serverless na Vercel para operacoes do MVP
- nao e necessario login real nesta etapa
- mensagens recebidas pelo WhatsApp ainda nao devem acionar IA automaticamente nesta fase
- respostas de IA so devem ser implementadas depois de salvar e auditar mensagens recebidas
- a primeira integracao com LLM deve operar em modo assistido, sugerindo respostas antes de enviar automaticamente
- a IA via OpenRouter deve permanecer atras de uma variavel liga/desliga e nao pode enviar mensagem sozinha nesta fase
- a area de sugestoes da IA deve ficar dentro de `Cobranças`, permitindo revisar, editar e enviar manualmente uma resposta sugerida pela IA
- resposta automatica da IA so pode ocorrer quando a variavel estiver ligada, a confianca minima for atingida e a intencao nao estiver bloqueada
- a IA deve receber data atual e status temporal do vencimento calculados pelo backend, nao por valor fixo no prompt
- se a fatura ainda nao tiver vencimento explicito, a IA deve calcular o vencimento pela regra cadastrada no condominio
- publicacoes de status do WhatsApp devem ser ignoradas pelo webhook e nao podem aparecer como conversa nem gerar resposta da IA
- SMS deve continuar indisponivel para uso real neste MVP, mesmo permanecendo visivel no painel como canal futuro

## Regras que nao fazem parte deste MVP

- multilogin entre varias administradoras
- arquitetura SaaS multi-tenant
- permissao complexa por perfil
- integracao real com Meta
- integracao real com Evolution API
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
7. o envio manual por WhatsApp puder ser demonstrado com numero de teste conectado na W-API

## Proximos passos provaveis apos esta fase

1. cadastrar dados reais de demonstracao no painel publicado
2. evoluir a visao individual por condominio alem do filtro operacional atual
3. salvar mensagens recebidas pelo WhatsApp como conversa estruturada
4. testar a interface de revisao das sugestoes da IA em promessas de pagamento e duvidas simples
5. desenhar a regua simples de cobranca com marcos configuraveis a partir do vencimento
6. planejar agendamento de e-mails e WhatsApp com banco, rotina agendada e disparo automatico por data calculada
7. melhorar estados vazios e mensagens de erro da interface
8. manter SMS como canal futuro e reavaliar integracao so depois
