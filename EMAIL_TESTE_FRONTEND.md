# Email teste no frontend

Este documento explica a nova janela de `Email teste` criada na aba de cobrancas.

## O que foi criado

Na aba `Cobrancas`, foi adicionado um botao chamado `Email teste`.

Ao clicar nesse botao, o app abre uma janela menor por cima da tela atual. Essa janela pode ser fechada pelo botao `x` no canto superior.

Dentro da janela existem os campos:

- condomino
- email de destino
- assunto
- mensagem

O formulario usa apenas o canal de email. Ele nao mostra WhatsApp nem SMS.

## Como funciona no frontend

Quando o usuario escolhe um condomino, o sistema preenche automaticamente:

- o email do condomino, se existir no cadastro
- um assunto com `[TESTE]`
- uma mensagem base de cobranca

O usuario pode editar o email, o assunto e a mensagem antes de enviar.

Ao clicar em `Enviar email teste`, o frontend chama este endpoint:

```txt
POST /api/test-email
```

O corpo enviado pelo frontend tem este formato:

```json
{
  "residentId": "id-do-condomino",
  "to": "destino@email.com",
  "subject": "[TESTE] Cobrança da unidade A-204",
  "message": "Texto da mensagem de cobrança"
}
```

## O que a API precisa fazer

A outra thread que vai configurar o Resend deve criar o endpoint `/api/test-email`.

Esse endpoint deve:

- receber `residentId`, `to`, `subject` e `message`
- enviar o email pelo Resend
- registrar a mensagem no historico normal de cobrancas
- salvar o assunto contendo `[TESTE]`, para o frontend mostrar a etiqueta amarela `teste`

## Como o historico identifica o teste

O frontend mostra a etiqueta amarela `teste` quando a mensagem do historico vem com `subject` contendo a palavra `teste`.

Exemplo:

```txt
[TESTE] Cobrança da unidade A-204
```

Depois que o endpoint salvar essa mensagem no banco e o frontend atualizar os dados, ela aparece em `Mensagens recentes` com:

- canal `E-mail`
- etiqueta amarela `teste`
- assunto
- texto da mensagem
- horario de envio

## Arquivos alterados

- `index.html`: adiciona o botao `Email teste` e a janela modal
- `src/main.js`: conecta o formulario, chama `/api/test-email` e renderiza a etiqueta `teste`
- `src/styles.css`: adiciona estilos da janela modal e da etiqueta amarela
- `api/bootstrap.js`: passa `email`, `subject`, `status` e `isTest` para o frontend

## Observacao importante

O frontend esta pronto para chamar `/api/test-email`, mas o envio real depende da API com Resend.

Enquanto esse endpoint nao existir, clicar em `Enviar email teste` vai retornar erro de API.
