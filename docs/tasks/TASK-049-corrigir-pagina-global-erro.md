# TASK-049 - Corrigir página global de erro

## Contexto

O middleware global de erros de `src/server.js` registra a falha e devolve ao
usuário uma página HTML montada diretamente com `err.message`.

Esse comportamento pode expor detalhes internos, como mensagens de banco,
caminhos e regras técnicas. Também permite que conteúdo inesperado presente na
mensagem seja inserido no HTML sem passar pelo padrão de escape das views.

A página atual não usa o layout, os componentes e a identidade visual das
demais telas do EmDia.

## Objetivo

Substituir a resposta atual por uma página de erro segura, consistente e útil,
mantendo os detalhes técnicos somente nos logs operacionais.

**Status:** implementada em 28/07/2026.

## Decisão técnica

Criar uma view dedicada para erros inesperados e exportá-la por
`src/services/viewEngine.js`.

A resposta ao usuário deve:

- usar mensagem genérica em português;
- nunca interpolar `err.message`, stack trace, SQL ou caminhos internos;
- apresentar uma ação segura para voltar ao dashboard ou à tela de login;
- usar o layout e os helpers compartilhados quando houver contexto suficiente;
- funcionar mesmo quando não existir usuário autenticado;
- preservar o status HTTP `500`.

O erro original deve continuar sendo registrado pelo logger operacional, com
os cuidados já existentes para não incluir segredos ou dados bancários
sensíveis.

## Identificador de diagnóstico

Gerar um identificador curto e não previsível para cada erro inesperado.

Regras:

- mostrar o identificador na página para facilitar suporte;
- registrar o mesmo identificador junto ao evento operacional;
- não derivar o identificador de usuário, sessão, mensagem ou stack trace;
- não expor informações adicionais por meio do identificador.

Não é necessário criar rastreamento distribuído ou integrar uma plataforma
externa de observabilidade nesta task.

## Respostas HTML e JSON

Para rotas HTML, renderizar a nova página de erro.

Para endpoints que já possuem contrato JSON, devolver uma estrutura genérica,
por exemplo:

```json
{
  "error": "Não foi possível concluir a operação.",
  "error_id": "identificador"
}
```

Não tentar inferir JSON apenas pelo método HTTP. Usar o contrato da rota ou uma
decisão centralizada e testável.

## Segurança

- não renderizar mensagens técnicas;
- não renderizar stack trace;
- não incluir dados da requisição na resposta;
- escapar todo dado dinâmico apresentado na página;
- não registrar cookies, token CSRF, senha ou conteúdo sensível;
- preservar o middleware final para erros ocorridos após o envio de headers.

## Interface e acessibilidade

- reutilizar tipografia, espaçamento, botões e ícones existentes;
- usar título claro, como **Não foi possível concluir a operação**;
- evitar linguagem alarmista ou atribuição de culpa ao usuário;
- indicar que o identificador pode ser informado ao suporte;
- manter foco visível e navegação por teclado;
- validar desktop e celular;
- não depender apenas de cor ou ícone para comunicar o erro.

## Escopo

- criar a view global de erro;
- exportar a view pelo agregador;
- ajustar o middleware global;
- adicionar identificador de diagnóstico;
- preservar logs técnicos no backend;
- cobrir respostas autenticadas e não autenticadas;
- adicionar testes HTTP e de renderização necessários;
- atualizar documentação de padrões se o contrato de erros for generalizado;
- atualizar o controle de release ao concluir a implementação.

## Fora de escopo

- criar páginas específicas para cada erro funcional;
- alterar mensagens normais de validação de formulários;
- integrar Sentry, OpenTelemetry ou serviço externo;
- refatorar todas as rotas;
- redesenhar páginas 403 e 404;
- exibir detalhes técnicos em ambiente de produção;
- alterar o formato dos logs além do necessário para o identificador.

## Critérios de aceite

- nenhuma resposta `500` contém `err.message` ou stack trace;
- HTML dinâmico é escapado pelos helpers do projeto;
- página usa o padrão visual do EmDia;
- página funciona com e sem usuário autenticado;
- resposta mantém status HTTP `500`;
- erro técnico completo permanece disponível no log operacional;
- página e log compartilham o mesmo identificador de diagnóstico;
- endpoint JSON coberto pela task não recebe página HTML;
- falha após envio de headers continua delegada corretamente ao Express;
- testes comprovam que HTML malicioso presente em uma exceção não é refletido;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Forçar erro inesperado em rota HTML autenticada.
2. Confirmar status `500`, layout e ação de retorno.
3. Forçar erro antes da autenticação e confirmar página válida.
4. Lançar erro contendo HTML e confirmar que o conteúdo não aparece na
   resposta.
5. Confirmar que mensagem, stack e identificador aparecem somente no log
   apropriado.
6. Validar rota JSON que gere erro inesperado.
7. Validar página em largura desktop e mobile.
8. Executar `npm run check` e `npm test`.

## Arquivos candidatos

- `src/server.js`;
- `src/views/errorView.js`;
- `src/views/layout.js`;
- `src/views/viewHelpers.js`;
- `src/services/viewEngine.js`;
- `src/services/operationalLogger.js`;
- `public/css/styles.css`;
- `test/integration/http.test.js`;
- `docs/patterns.md`;
- `src/config/release.js`.

## Dependências

Esta task deve ser implementada antes da TASK-054, pois o endurecimento de
segurança pressupõe que erros inesperados já não sejam refletidos ao usuário.

---

## Assinatura da LLM

- Data: 28/07/2026 21:04
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- `src/views/errorsView.js` passou a renderizar uma página segura e consistente
  com o EmDia, reutilizando o layout autenticado quando existe usuário e uma
  estrutura autônoma antes do login.
- Cada erro inesperado recebe um código aleatório no formato `ERR-...`.
- O evento `app.unexpected_error` registra o mesmo código em `requestId`, junto
  ao nome, à mensagem e ao stack técnico da exceção.
- Respostas HTML não apresentam `err.message`, stack trace, SQL ou caminhos
  internos.
- Endpoints com contrato JSON são identificados antes do carregamento da
  sessão e recebem mensagem genérica com `error_id`.
- O `console.error` duplicado foi removido do middleware global; o logger
  operacional permanece como destino técnico.
- Foram adicionados testes para erro autenticado, erro anterior à autenticação,
  conteúdo HTML malicioso, correlação com o log e resposta JSON.
- A página foi validada visualmente em navegador, sem erros no console.
- A release foi incrementada para `Release 28/07/2026 21:47 - 071`.

---

## Assinatura da LLM

- Data: 28/07/2026 21:47
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
