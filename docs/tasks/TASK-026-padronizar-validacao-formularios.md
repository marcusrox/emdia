# TASK-026 - Padronizar validação de formulários

## Contexto

Na tela de nova recorrência mensal (`/recurrences/new`), o campo `Valor
previsto` aceita entrada textual inadequada, como letras. Ao tentar salvar, o
usuário não recebe uma mensagem clara de crítica sobre o preenchimento inválido.

Esse comportamento pode induzir erros silenciosos: o usuário acredita que
preencheu um valor, mas o sistema pode interpretar, normalizar ou rejeitar o
dado de forma pouco evidente. O problema não deve ser corrigido apenas nesse
campo, pois outros formulários do sistema também lidam com dinheiro, datas,
números, seleções obrigatórias e textos obrigatórios.

## Objetivo

Criar um padrão único e reutilizável de validação de formulários no EmDia,
combinando validação no cliente para resposta imediata e validação no backend
como fonte definitiva de segurança e consistência.

O padrão deve evitar que cada tela implemente mensagens, estilos e regras de
validação de forma diferente.

## Escopo

- Definir um componente visual reutilizável para erro de campo.
- Definir helpers ou serviços reutilizáveis para validar payloads de
  formulários.
- Aplicar o padrão inicialmente ao formulário de recorrência mensal.
- Validar corretamente campos monetários, como `Valor previsto`.
- Exibir mensagem clara quando o campo monetário receber letras, símbolos
  inválidos ou formato ambíguo.
- Preservar os valores digitados quando houver erro de validação.
- Exibir mensagens em português, próximas ao campo afetado e/ou na pilha global
  de notificações quando apropriado.
- Garantir que a validação backend impeça persistência de dados inválidos mesmo
  se o JavaScript do navegador estiver desabilitado.
- Preparar a solução para reaproveitamento em lançamentos, contas, categorias,
  perfil e configurações.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Redesenhar todos os formulários do sistema nesta task.
- Alterar regras financeiras de recorrência, lançamentos ou baixas.
- Criar biblioteca externa de validação.
- Migrar para TypeScript, EJS ou framework frontend.
- Criar validação assíncrona remota enquanto o usuário digita.
- Implementar esta task neste momento.

## Padronização proposta

Criar um padrão com três camadas:

1. Validação HTML nativa:
   - usar `required`, `min`, `max`, `maxlength`, `inputmode`, `autocomplete` e
     tipos adequados quando fizer sentido;
   - evitar `type="number"` para dinheiro quando a máscara ou vírgula decimal
     brasileira for necessária;
   - usar `pattern` apenas quando a expressão for simples e legível.

2. Validação cliente-side progressiva:
   - interceptar envio do formulário quando houver campos inválidos;
   - destacar o campo com erro;
   - exibir mensagem curta em português junto ao campo;
   - focar o primeiro campo inválido;
   - não depender dessa camada para segurança.

3. Validação backend obrigatória:
   - normalizar e validar os dados antes de chamar models;
   - retornar mensagens estruturadas por campo;
   - re-renderizar a tela com os valores informados e erros correspondentes;
   - impedir persistência quando houver erro.

## Campos monetários

Campos de dinheiro devem aceitar formatos cotidianos em português brasileiro,
como:

- `100`;
- `100,50`;
- `1.000,50`;
- `0,99`.

Entradas inválidas devem ser rejeitadas com mensagem clara, por exemplo:

- `abc`;
- `12abc`;
- `10,`;
- `R$ texto`;
- valores negativos quando o campo não permitir negativo;
- campo vazio quando obrigatório.

Mensagem sugerida:

```text
Informe um valor válido, como 100,00.
```

Internamente, valores monetários devem continuar sendo convertidos para centavos
inteiros e nunca persistidos como `float`.

## Experiência esperada

- Ao digitar letras em `Valor previsto` e tentar salvar uma recorrência, o
  usuário vê uma crítica clara antes de acreditar que a operação funcionou.
- O campo inválido fica visualmente identificado.
- A mensagem não desloca o formulário de forma brusca nem quebra o layout
  compacto.
- O usuário consegue corrigir o valor sem perder os demais campos preenchidos.
- O botão de salvar não deve parecer bem-sucedido quando a gravação não ocorreu.
- Mensagens de validação devem seguir tom consistente com o restante do EmDia.

## Estrutura sugerida

Possíveis pontos de implementação:

- `src/services/formValidation.js` para funções puras de validação e
  normalização de payloads;
- helpers em `src/services/viewHelpers.js` para renderizar erros por campo;
- CSS global em `public/css/styles.css` para estado inválido e mensagens de
  campo;
- JavaScript em `public/js/app.js` para validação cliente-side progressiva.

A nomenclatura exata pode ser ajustada durante a implementação, desde que o
padrão fique centralizado e reutilizável.

## Critérios de aceite

- O formulário de recorrência mensal critica `Valor previsto` quando o usuário
  informa letras ou formato monetário inválido.
- A mensagem de erro aparece em português e indica como corrigir o campo.
- O campo com erro recebe destaque visual acessível.
- O primeiro campo inválido recebe foco ao tentar salvar.
- Os dados já digitados permanecem preenchidos após erro retornado pelo backend.
- A validação backend impede cadastro ou edição de recorrência com valor
  monetário inválido.
- O padrão criado pode ser reaproveitado por outros formulários sem duplicar
  mensagens e estilos em cada view.
- Campos obrigatórios, números, datas e selects possuem caminho claro para usar
  o mesmo padrão.
- O HTML continua escapando dados de usuário.
- Valores monetários continuam sendo tratados em centavos inteiros.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais iniciais:

- acessar `/recurrences/new`;
- preencher `Valor previsto` com `abc` e tentar salvar;
- confirmar mensagem de erro junto ao campo;
- confirmar que os demais campos permanecem preenchidos;
- preencher `Valor previsto` com `12abc` e confirmar rejeição;
- preencher `Valor previsto` com `100,50` e confirmar aceitação;
- preencher `Valor previsto` com `1.000,50` e confirmar conversão correta;
- testar envio com JavaScript desabilitado ou ignorando validação cliente-side,
  confirmando que o backend rejeita valores inválidos;
- repetir em viewport desktop e mobile.

Fluxos futuros, ao expandir o padrão:

- validar dinheiro em lançamentos;
- validar dia de vencimento entre 1 e 31;
- validar competência inicial e final;
- validar selects obrigatórios;
- validar textos obrigatórios sem aceitar apenas espaços.

## Observações de implementação

Evitar soluções isoladas como mensagens hardcoded apenas em
`recurrencesView.js`. A correção deve criar uma base comum para que novos
formulários usem o mesmo padrão visual e comportamental.

Quando a task for implementada, atualizar `src/config/release.js`, incrementando
o número sequencial em 1.

## Implementação

- Criado `src/services/formValidation.js` com validação estruturada de
  formulários, parser monetário reutilizável e erro de validação com mensagens
  por campo.
- `toCents` passou a rejeitar entradas monetárias textuais inválidas em vez de
  convertê-las silenciosamente para zero.
- O formulário de recorrência mensal passou a renderizar erros por campo,
  preservar os valores digitados e marcar campos inválidos com atributos de
  acessibilidade.
- As rotas de criação e edição de recorrências passaram a re-renderizar o
  formulário com status 400 quando houver erro de validação.
- Adicionado padrão visual global para erros de campo em `public/css/styles.css`.
- Adicionada validação cliente-side progressiva para campos monetários marcados
  com `data-validate-money`.
- `npm run check` passou a validar o novo serviço de validação.
- Atualizado o controle de release para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-13 19:17
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-13 19:26
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
