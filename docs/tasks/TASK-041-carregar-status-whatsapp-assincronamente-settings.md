# TASK-041 - Carregar status do WhatsApp de forma assíncrona em Configurações

## Contexto

A rota `GET /settings` consulta atualmente o estado da integração com o
WhatsApp por meio de `await getWhatsAppStatus()` antes de renderizar e enviar o
HTML da página. Quando o WAHA está lento, indisponível ou próximo do tempo
limite configurado, toda a tela de Configurações demora para aparecer.

Um indicador de carregamento inserido apenas no HTML atual não resolveria o
problema, pois esse HTML também fica aguardando a resposta do WAHA no servidor.
Para que o usuário receba retorno visual imediato, a renderização da página e a
consulta remota precisam ocorrer em requisições separadas.

## Objetivo

Fazer a tela `/settings` carregar imediatamente com as preferências já
disponíveis no banco local e consultar o estado do WhatsApp em segundo plano.
Enquanto essa consulta estiver em andamento, exibir um loading centralizado na
área de status da integração, sem bloquear a leitura, a edição ou o salvamento
das demais configurações.

## Comportamento esperado

1. O usuário acessa `/settings`.
2. O servidor renderiza a página sem aguardar uma chamada ao WAHA.
3. O cartão **Status da integração** aparece em estado de carregamento, com
   indicador visual e o texto **Verificando integração...**.
4. Após o carregamento do HTML, o navegador consulta um endpoint interno
   autenticado para obter o estado do WhatsApp.
5. Ao receber a resposta, o cartão substitui o loading pelo estado e pela
   mensagem retornados.
6. Se a consulta falhar, exceder o tempo limite ou retornar uma resposta
   inválida, apenas o cartão apresenta o erro; o restante da página continua
   utilizável.

O carregamento deve acontecer também em acesso direto, recarregamento e
abertura da página em nova aba. Não depender de interceptar apenas o clique no
link **Configurações**.

## Backend

### Renderização inicial

Alterar `GET /settings` para:

- continuar obtendo as preferências locais com
  `NotificationPreference.getOrCreate(req.user.id)`;
- não executar `await getWhatsAppStatus()` antes de `sendHtml`;
- renderizar `settingsView` com o estado inicial de carregamento, sem simular
  que a integração já está conectada ou desconectada;
- preservar autenticação, mensagens de sucesso e o formulário atual.

### Endpoint de status

Adicionar um endpoint interno, preferencialmente:

```text
GET /settings/whatsapp-status
```

Requisitos:

- exigir usuário autenticado pelo mesmo fluxo usado em `/settings`;
- chamar `getWhatsAppStatus()` no backend, sem expor a URL, a chave da API, o
  nome de sessão ou outras configurações sensíveis do provedor;
- responder JSON com contrato pequeno e previsível;
- usar status HTTP coerente e uma mensagem segura em falhas inesperadas;
- não aceitar URL, sessão ou credenciais vindas da query string;
- não registrar tokens, chaves, headers ou payloads sensíveis;
- preservar o timeout já aplicado pelo cliente do WhatsApp;
- não exigir CSRF por ser uma consulta `GET` sem alteração de estado.

Contrato sugerido para sucesso:

```json
{
  "ok": true,
  "state": "WORKING",
  "message": "WhatsApp conectado."
}
```

Contrato sugerido para indisponibilidade conhecida:

```json
{
  "ok": false,
  "state": "ERROR",
  "message": "Não foi possível consultar a integração com o WhatsApp."
}
```

Os nomes exatos dos estados podem seguir o retorno já normalizado por
`getWhatsAppStatus()`. A interface não deve depender de campos específicos do
payload bruto do WAHA.

## View e marcação HTML

Atualizar `src/views/settingsView.js` para que o cartão de status:

- seja renderizado inicialmente em estado de carregamento;
- possua um contêiner identificável por atributo `data-*`;
- informe a URL interna por atributo próprio ou use uma rota interna estável no
  JavaScript;
- contenha regiões separadas para estado e mensagem, permitindo atualização
  com `textContent`;
- use `aria-live="polite"` e `aria-busy="true"` enquanto a consulta estiver em
  andamento;
- mantenha texto visível além do spinner;
- não injete HTML recebido pela resposta do endpoint;
- permaneça dentro da seção **Notificações por WhatsApp**, sem bloquear os
  campos do formulário.

O estado inicial não deve ser renderizado como `UNKNOWN` se a consulta ainda
não terminou. Deve comunicar explicitamente que a verificação está em curso.

## JavaScript do navegador

Adicionar em `public/js/app.js` uma inicialização específica para o cartão de
status do WhatsApp.

Essa rotina deve:

- encerrar sem efeitos nas páginas que não possuem o cartão;
- verificar a disponibilidade de `window.fetch` e apresentar fallback textual
  quando necessário;
- consultar o endpoint após a página estar disponível;
- solicitar e validar uma resposta JSON;
- atualizar estado e mensagem exclusivamente com `textContent`;
- remover o indicador de carregamento ao finalizar, com sucesso ou erro;
- definir `aria-busy="false"` após a conclusão;
- aplicar uma classe visual coerente para sucesso, alerta ou erro;
- tratar falha de rede, timeout do servidor, HTTP não esperado e JSON inválido;
- não impedir o envio do formulário caso a consulta ainda esteja pendente;
- evitar múltiplas consultas concorrentes durante a mesma inicialização.

Não implementar polling contínuo nesta task. Uma consulta por carregamento da
página é suficiente.

## Apresentação e acessibilidade

Atualizar `public/css/styles.css` com estilos pequenos e restritos ao cartão de
status:

- centralizar o conjunto formado por spinner e texto durante o carregamento;
- criar uma animação discreta e coerente com a interface do EmDia;
- manter dimensões estáveis para evitar salto excessivo de layout quando o
  resultado chegar;
- apresentar contraste adequado nos estados de carregamento, sucesso e erro;
- não depender somente de cor para comunicar o resultado;
- manter foco, legibilidade e responsividade nas escalas de fonte disponíveis;
- desativar ou simplificar a animação em `prefers-reduced-motion: reduce`;
- evitar overlay global que impeça o usuário de utilizar configurações não
  relacionadas ao WhatsApp.

O loading deve ficar visualmente centralizado na área do cartão. Em telas
estreitas, não pode causar overflow ou sobreposição com os campos próximos.

## Segurança e privacidade

- Manter a chamada ao WAHA exclusivamente no servidor.
- Não enviar ao navegador `WAHA_API_KEY`, `WAHA_API_BASE_URL`, `WAHA_SESSION`
  ou valores equivalentes.
- Não retornar detalhes de rede, stack trace ou conteúdo bruto de erro que
  possa revelar infraestrutura interna.
- Não usar `innerHTML` com valores recebidos do endpoint.
- Manter o endpoint protegido por autenticação.
- Preservar a sanitização e o log operacional já existentes no cliente do
  WhatsApp.

## Fora de escopo

- Adicionar loading global a todas as navegações do sistema.
- Interceptar todos os links ou formulários da aplicação.
- Implementar streaming de HTML ou renderização parcial no servidor.
- Alterar credenciais, sessão, provedor ou configuração do WAHA.
- Reduzir `WAHA_REQUEST_TIMEOUT_MS` automaticamente.
- Implementar tentativas automáticas, polling contínuo ou atualização em tempo
  real do estado.
- Alterar regras de envio, fila ou agendamento de notificações.
- Redesenhar as demais seções da tela de Configurações.
- Adicionar dependência externa para produzir o spinner.
- Implementar esta task neste momento.

## Critérios de aceite

- `/settings` envia o HTML sem aguardar a resposta do WAHA.
- As preferências locais continuam aparecendo corretamente na carga inicial.
- O cartão mostra **Verificando integração...** e um indicador visual enquanto
  a consulta estiver pendente.
- O loading aparece em acesso direto, recarregamento e nova aba.
- O navegador consulta um endpoint interno autenticado após receber a página.
- O resultado substitui o loading sem recarregar a página inteira.
- Sucesso, indisponibilidade e erro possuem texto compreensível, sem depender
  apenas de cor.
- Falha ou demora do WAHA não bloqueia os demais campos nem o botão de salvar.
- O endpoint não expõe URL, chave, sessão, headers ou payload bruto do WAHA.
- Conteúdo retornado é inserido no DOM com APIs seguras, sem `innerHTML`.
- O cartão usa `aria-live` e atualiza corretamente `aria-busy`.
- A animação respeita `prefers-reduced-motion`.
- Não há polling contínuo nem chamadas duplicadas no carregamento normal.
- Desktop, mobile e escalas de fonte não apresentam overflow ou sobreposição.
- O salvamento das configurações continua funcionando com POST e CSRF.
- `npm run check` passa após a implementação.

## Cenários de validação

1. Com o WAHA disponível, acessar `/settings` e confirmar que o formulário
   aparece antes do resultado da integração.
2. Confirmar que o cartão mostra o loading e depois exibe o estado retornado,
   sem recarregar a página.
3. Abrir `/settings` diretamente em nova aba e repetir a verificação.
4. Simular WAHA lento e confirmar que os campos podem ser alterados e salvos
   enquanto o status permanece pendente.
5. Simular WAHA indisponível e confirmar que somente o cartão apresenta erro.
6. Forçar resposta HTTP inesperada ou JSON inválido no endpoint e verificar a
   mensagem de fallback.
7. Acessar o endpoint sem autenticação e confirmar o comportamento padrão de
   proteção adotado pela aplicação.
8. Inspecionar o JSON e o HTML para confirmar ausência de credenciais, URL
   interna, sessão e detalhes sensíveis.
9. Navegar por teclado e confirmar que a atualização é anunciada sem deslocar
   o foco.
10. Ativar `prefers-reduced-motion` e confirmar ausência ou simplificação da
    animação.
11. Testar desktop, viewport estreita e todas as escalas de fonte disponíveis.
12. Confirmar pelo painel de rede que ocorre somente uma consulta de status por
    carregamento normal.
13. Executar `npm run check`.
14. Em servidor próprio iniciado explicitamente em `PORT=3100` ou na próxima
    porta livre, validar `GET /health`, `GET /settings` e
    `GET /settings/whatsapp-status`, sem utilizar a porta 3000.

## Arquivos candidatos

- `src/server.js`;
- `src/views/settingsView.js`;
- `public/js/app.js`;
- `public/css/styles.css`;
- `src/config/release.js`, ao concluir a implementação.

## Observações de implementação

Preferir a separação entre a renderização inicial e a consulta assíncrona do
status. Um overlay criado na página anterior, ao clicar em **Configurações**,
não cobre acessos diretos nem resolve o bloqueio da resposta HTTP atual.

Reutilizar `getWhatsAppStatus()` e `sendJson` existentes, mantendo a regra de
negócio e a comunicação com o provedor fora da view. O JavaScript deve cuidar
somente da requisição ao endpoint interno e da apresentação do resultado.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando
o número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 23:28
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- removida da renderização inicial de `/settings` a espera pela consulta ao
  provedor de WhatsApp;
- criado `GET /settings/whatsapp-status`, protegido pela autenticação global e
  com resposta JSON sanitizada;
- adicionado ao cartão da integração o estado inicial de carregamento com
  `aria-live`, `aria-busy`, texto visível e spinner decorativo;
- adicionada consulta assíncrona no navegador, com validação do JSON, atualização
  por `textContent` e fallback para falhas de rede ou resposta inválida;
- adicionados estilos de carregamento, sucesso e erro, com altura estável e
  respeito a `prefers-reduced-motion`;
- preservados os campos e o salvamento das demais configurações enquanto o
  estado do WhatsApp é consultado;
- atualizado o controle de release para a sequência 050;
- `npm run check`, validação estrutural da view, registro das rotas e
  `git diff --check` passaram.

---

## Assinatura da LLM

- Data: 17/07/2026 23:31
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
