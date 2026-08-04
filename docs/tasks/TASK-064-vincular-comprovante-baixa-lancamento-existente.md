# TASK-064 - Vincular comprovante à baixa de lançamento existente

## Contexto

O EmDia já recebe comprovantes de pagamento pelo WhatsApp, extrai os dados e
exibe uma tela de revisão. Atualmente, a aprovação sempre cria uma nova despesa
já paga e registra a respectiva baixa em `settlements`.

Esse comportamento deve continuar disponível, mas antes da criação de um novo
lançamento o sistema deve procurar despesas em aberto que possam corresponder ao
pagamento comprovado. A identificação deve considerar o favorecido e o valor do
comprovante, sempre com confirmação humana antes de gravar a baixa.

A evolução deve ser incorporada à tela atual de aprovação de comprovantes sem
regredir sua usabilidade, seus campos editáveis, o preview da imagem, os avisos,
a rejeição, o reprocessamento ou o fluxo existente de criação de uma nova
despesa baixada.

## Objetivo

Permitir que um comprovante recebido pelo WhatsApp seja usado para:

1. registrar uma baixa em um lançamento existente sugerido pelo EmDia;
2. registrar uma baixa em outro lançamento em aberto escolhido manualmente pelo
   usuário, independentemente da competência; ou
3. criar uma nova despesa já baixada, preservando o comportamento atual.

O comprovante deve ficar vinculado de forma auditável à baixa efetivamente
criada.

## Regras funcionais

### Confirmação humana obrigatória

- A compatibilidade é somente uma sugestão e nunca pode aprovar o comprovante ou
  criar uma baixa automaticamente.
- A tela deve deixar explícito se a aprovação irá baixar um lançamento existente
  ou criar uma nova despesa.
- O usuário deve confirmar a ação pelo formulário protegido com CSRF já usado no
  fluxo atual.
- Alterações concorrentes devem ser revalidadas no momento da aprovação. Se o
  lançamento escolhido deixar de aceitar baixa, não criar nenhum registro e
  informar o motivo em português.

### Lançamentos elegíveis

A busca automática e a seleção manual devem considerar somente lançamentos:

- pertencentes ao usuário autenticado;
- do tipo `EXPENSE`;
- que aceitem uma nova baixa pelas regras existentes de
  `settlementEligibility`;
- não cancelados e não totalmente liquidados;
- de qualquer competência, sem aplicar o filtro mensal padrão das telas
  operacionais.

Lançamentos de outros usuários, receitas, lançamentos cancelados ou que não
aceitem nova baixa não podem ser exibidos nem aprovados, mesmo que seus IDs
sejam enviados manualmente na requisição.

### Compatibilidade pelo favorecido

Comparar o favorecido extraído do comprovante com o favorecido do lançamento.
Não exigir igualdade literal.

Antes da comparação, normalizar os dois nomes:

- converter para minúsculas;
- remover acentos e outros diacríticos;
- substituir pontuação por espaços;
- eliminar espaços repetidos e espaços nas extremidades;
- desconsiderar diferenças puramente ortográficas de caixa, acentuação e
  pontuação.

Implementar uma comparação fuzzy pequena, determinística, testável e sem nova
dependência externa. Pode ser usada uma métrica local por tokens, bigramas ou
outra técnica de complexidade semelhante. O algoritmo deve:

- retornar uma pontuação normalizada entre `0` e `1`;
- tratar igualdade após normalização como pontuação `1`;
- aceitar variações razoáveis do mesmo favorecido;
- evitar compatibilizar nomes sem relação apenas porque possuem palavras
  genéricas em comum;
- manter o limiar mínimo em uma constante centralizada, inicialmente `0,70`,
  para permitir calibração posterior sem alterar consultas ou views.

Se um dos nomes estiver vazio, não há compatibilidade automática por favorecido.
Isso não impede a seleção manual de um lançamento em aberto.

### Compatibilidade pelo valor

A tolerância deve ser calculada sobre o **valor total previsto do lançamento**,
e não sobre seu saldo em aberto.

Um lançamento é compatível quando:

```text
diferença absoluta = abs(valor do comprovante - valor total do lançamento)
limite = valor total do lançamento * 20%
diferença absoluta <= limite
```

Os cálculos devem usar centavos inteiros. Quando for necessário arredondar o
limite percentual, usar uma regra única e coberta por teste. Lançamentos com
valor total inválido ou igual a zero não são candidatos automáticos.

Exemplo: para um lançamento de `R$ 100,00`, comprovantes de `R$ 80,00` a
`R$ 120,00`, inclusive, atendem ao critério de valor.

A tolerância serve apenas para localizar candidatos. Ela não altera o valor
previsto do lançamento e não autoriza arredondar ou substituir o valor extraído
do comprovante.

### Formação e ordenação das sugestões

Um lançamento só entra nas sugestões automáticas quando atender
simultaneamente aos critérios de favorecido e de valor.

Quando houver mais de um candidato, listar todos os compatíveis na seguinte
ordem:

1. maior pontuação de semelhança do favorecido;
2. menor diferença absoluta entre os valores;
3. vencimento mais próximo da data do pagamento, como desempate;
4. identificador do lançamento, como último desempate estável.

O primeiro item deve receber um destaque visual como **Mais provável**, sem
afirmar que a correspondência é certa. Exibir de maneira acessível o mesmo
significado, sem depender apenas de cor ou da posição da linha.

### Seleção manual

Mesmo quando nenhuma sugestão for encontrada, permitir selecionar um lançamento
em aberto de qualquer competência. A seleção manual também deve permanecer
disponível quando houver sugestões, pois o lançamento correto pode não estar
entre os candidatos automáticos.

A listagem ou o seletor deve informar, no mínimo:

- descrição;
- vencimento em formato civil;
- valor total previsto formatado em reais.

Como a lista pode abranger todas as competências, oferecer busca por descrição
ou favorecido e uma apresentação que continue utilizável com muitos
lançamentos. Não carregar lançamentos encerrados apenas para completar a lista.

A escolha manual não precisa respeitar a margem de 20% nem o limiar fuzzy. Ela
representa uma decisão explícita do usuário, mas todas as regras financeiras de
elegibilidade e confirmação de diferenças continuam obrigatórias.

## Compatibilização da tela atual

Evoluir a mesma tela `GET /receipt-imports/:id`. Não criar uma segunda tela de
aprovação.

Manter:

- preview autenticado do comprovante;
- resumo da extração e avisos de confiança ou duplicidade;
- edição de descrição/favorecido, data, valor, categoria e conta no fluxo de
  criação de nova despesa;
- ações de aprovar, rejeitar e reprocessar conforme o status;
- mensagens de validação junto aos respectivos campos;
- layout responsivo e navegação existentes.

Adicionar uma escolha clara entre:

- **Baixar lançamento existente**; e
- **Criar nova despesa paga**.

Com sugestões automáticas, apresentar primeiro a opção de baixar lançamento
existente e pré-selecionar visualmente o candidato **Mais provável**, mas exigir
que a escolha esteja visível no formulário antes da confirmação. Sem sugestões,
manter **Criar nova despesa paga** como opção inicial e oferecer a seleção manual
de lançamento em aberto.

Ao escolher um lançamento existente:

- exibir os candidatos sugeridos, quando existirem;
- permitir abrir a seleção manual;
- manter editáveis a data, o valor pago e a conta usada na baixa;
- não exigir categoria, descrição ou criação de favorecido para aprovar, pois
  esses dados pertencem ao lançamento existente;
- não modificar descrição, favorecido, categoria, competência, vencimento,
  conta principal ou valor previsto do lançamento escolhido.

Ao escolher criar uma nova despesa, o formulário e as validações atuais devem
continuar funcionando sem mudança de resultado financeiro.

## Registro da baixa e vínculo do comprovante

Na aprovação vinculada a um lançamento existente:

- não criar um novo `financial_entry`;
- criar uma baixa em `settlements` usando o fluxo financeiro central já
  existente, sem duplicar regras no controller ou na view;
- usar como valor da baixa o valor confirmado do comprovante;
- usar como data da baixa a data confirmada do comprovante;
- usar a conta financeira escolhida para a baixa;
- definir `settlement_type` como `PAYMENT`;
- aplicar as regras atuais de baixa parcial, baixa final, pagamento acima do
  previsto e confirmação explícita de diferenças;
- recalcular o status com `deriveStatus` na mesma transação;
- marcar o comprovante como `APPROVED` somente após a baixa ser criada com
  sucesso.

A transação deve abranger baixa, atualização do lançamento, vínculo do
comprovante e auditorias. Qualquer erro deve causar rollback integral.

### Persistência

Adicionar uma migration compatível com bancos existentes para registrar em
`receipt_imports` a baixa criada, por exemplo:

```text
settlement_id TEXT NULL REFERENCES settlements(id)
```

Manter `financial_entry_id` e preenchê-lo tanto quando a aprovação criar uma
nova despesa quanto quando usar uma despesa existente. Para novas aprovações,
preencher também `settlement_id` nos dois fluxos.

Registros antigos podem permanecer com `settlement_id` nulo. Não inferir nem
regravar vínculos históricos sem uma correspondência inequívoca.

Depois de aprovado, o detalhe do comprovante deve oferecer acesso ao lançamento
vinculado e identificar que o comprovante originou uma baixa. Se houver uma rota
segura para destacar a baixa no detalhe do lançamento, ela pode ser usada sem
expor IDs de outros usuários.

## Auditoria e notificações

Registrar auditoria suficiente para distinguir:

- aprovação criando uma nova despesa e sua baixa;
- aprovação baixando um lançamento existente;
- `receipt_import_id`, `financial_entry_id` e `settlement_id` envolvidos;
- seleção automática sugerida ou seleção manual, sem registrar a imagem ou
  dados sensíveis desnecessários.

A notificação de comprovante aprovado deve continuar sendo enfileirada somente
depois do commit. Ajustar o texto ou o contexto apenas se necessário para não
afirmar que uma nova despesa foi criada quando houve baixa de lançamento
existente. Falha na notificação não pode desfazer a operação financeira.

## Segurança e integridade

- Isolar sugestões, busca manual, lançamento e baixa por `user_id`.
- Revalidar no servidor a ação, o lançamento escolhido, a conta e os valores;
  não confiar em campos ocultos ou na ordenação enviada pelo navegador.
- Usar placeholders `?` em todas as consultas SQLite.
- Usar centavos inteiros em comparações e persistência financeira.
- Escapar descrição, favorecido e demais valores antes de renderizar HTML.
- Não expor mídia, lançamento ou baixa de outro usuário.
- Preservar a proteção contra aprovação repetida e comprovante duplicado.
- Não executar comparação fuzzy dentro do SQL por concatenação ou por funções
  definidas a partir de entrada do usuário.

## Arquivos candidatos

Arquivos provavelmente envolvidos, sujeitos à organização encontrada durante a
implementação:

- `src/models/ReceiptImport.js`;
- `src/models/FinancialEntry.js`;
- `src/models/Settlement.js`;
- `src/services/receiptMatchingService.js` (novo, se ajudar a isolar a regra);
- `src/routes/receiptImportRoutes.js`;
- `src/views/receiptImportsView.js`;
- `src/services/viewEngine.js`, somente se houver novo export de view/helper;
- `src/database/migrations/*.js`;
- `public/css/styles.css`;
- testes do model, serviço, rota e renderização afetados;
- `docs/patterns.md` e `docs/architecture.md`, apenas se a implementação criar
  um novo padrão duradouro;
- `src/config/release.js`, ao concluir a implementação desta task.

Evitar mudanças no webhook, download da mídia, provedor WAHA ou prompt do
OpenRouter quando não forem necessárias para o pareamento.

## Fora do escopo

- aprovação automática sem ação do usuário;
- alterar a margem de 20% por usuário;
- usar IA externa ou uma nova dependência para comparação de nomes;
- alterar o lançamento escolhido para fazê-lo coincidir com o comprovante;
- conciliação bancária geral ou importação de extrato;
- vincular um único comprovante a mais de uma baixa;
- vincular vários lançamentos a um único comprovante;
- procurar receitas ou registrar recebimentos a partir deste fluxo;
- reprocessar em massa comprovantes já aprovados;
- retroagir vínculos históricos ambíguos.

## Critérios de aceite

- a tela atual de revisão continua sendo o único local de aprovação e mantém as
  funcionalidades existentes;
- o EmDia compara nomes semelhantes por algoritmo fuzzy local e valores com
  tolerância inclusiva de 20% sobre o valor total previsto;
- somente lançamentos que atendem aos dois critérios aparecem como sugestões;
- todos os candidatos compatíveis são exibidos na ordem definida;
- o primeiro candidato recebe a indicação acessível **Mais provável**;
- o usuário pode escolher manualmente qualquer despesa em aberto de qualquer
  competência;
- a seleção informa ao menos descrição, vencimento e valor total;
- o usuário pode optar por criar uma nova despesa paga como antes;
- a aprovação nunca ocorre automaticamente;
- aprovar um candidato existente cria somente a baixa, sem criar outro
  lançamento ou alterar os dados previstos do lançamento escolhido;
- valor, data e conta da baixa correspondem aos dados confirmados pelo usuário;
- baixa parcial, final, acima do previsto e diferenças seguem as regras
  financeiras existentes;
- `receipt_imports` referencia o lançamento e a baixa criados ou vinculados;
- a operação financeira e os vínculos são atômicos e auditáveis;
- IDs forjados, lançamentos de outro usuário ou lançamentos inelegíveis são
  rejeitados no servidor;
- a notificação pós-aprovação continua ocorrendo depois do commit;
- comprovantes já aprovados não podem gerar uma segunda baixa;
- a interface permanece responsiva e utilizável com e sem sugestões.

## Testes esperados

### Comparação e ordenação

- nomes iguais após normalização recebem pontuação máxima;
- diferenças de caixa, acentos, pontuação e espaços não impedem a sugestão;
- variações semelhantes de favorecido ultrapassam o limiar configurado;
- nomes sem relação ou vazios não geram sugestão automática;
- valores exatamente em `-20%` e `+20%` são aceitos;
- valores além dos limites são rejeitados;
- a margem usa o valor total, mesmo quando o lançamento possui baixa parcial;
- candidatos são ordenados por semelhança, diferença de valor e desempates
  definidos;
- somente o primeiro recebe a indicação **Mais provável**.

### Aprovação

- aprovação vinculada cria settlement no lançamento existente e não cria nova
  despesa;
- aprovação pelo fluxo atual continua criando despesa e settlement;
- baixa usa data, valor e conta confirmados;
- baixa parcial mantém o lançamento aberto com status correto;
- baixa final encerra o lançamento conforme as regras atuais;
- excesso e diferença que exigem confirmação continuam protegidos;
- falha intermediária reverte settlement, status, vínculo e auditoria;
- duas aprovações concorrentes não criam duas baixas para o mesmo comprovante;
- `financial_entry_id` e `settlement_id` são preenchidos após o commit.

### Seleção e segurança

- sugestões e busca manual não retornam dados de outro usuário;
- seleção manual encontra lançamento aberto fora da competência atual;
- receitas, despesas canceladas e lançamentos liquidados não aparecem;
- ID forjado ou lançamento que se tornou inelegível é rejeitado;
- valores de usuário permanecem escapados na renderização;
- comprovante aprovado mantém acesso apenas autenticado ao lançamento
  correspondente.

### Regressão da interface

- tela sem candidatos mantém o fluxo atual de criação como opção inicial;
- tela com um ou vários candidatos mantém preview, dados extraídos e avisos;
- criação de nova despesa ainda valida descrição, favorecido, data, valor,
  categoria, conta e duplicidade como antes;
- rejeição e reprocessamento continuam disponíveis nos mesmos estados;
- versão móvel permite compreender e selecionar candidatos sem depender de
  tabela com rolagem horizontal obrigatória.

## Validação esperada

- executar `npm run check`;
- executar os testes automatizados afetados;
- validar a migration em banco temporário novo e em banco temporário com schema
  anterior;
- iniciar servidor de validação exclusivamente em `PORT=3100` ou na próxima
  porta livre permitida;
- testar `GET /health`, `GET /receipt-imports` e
  `GET /receipt-imports/:id` com sessão válida;
- testar aprovação de candidato sugerido, escolha manual fora da competência e
  criação de nova despesa;
- conferir visualmente a tela em larguras desktop e móvel;
- encerrar somente o processo de servidor iniciado pelo próprio agente;
- atualizar `src/config/release.js` ao concluir a implementação, incrementando o
  sequencial conforme o padrão do projeto.

---

## Assinatura da LLM

- Data: 04/08/2026 19:37
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Implementação concluída

A funcionalidade foi implementada com:

- comparação fuzzy local e determinística de favorecidos, com limiar `0,70`;
- tolerância inclusiva de 20% sobre o valor total previsto;
- busca de despesas em aberto de qualquer competência, isolada por usuário;
- sugestões ordenadas e indicação acessível **Mais provável**;
- seleção manual com busca por descrição ou favorecido;
- escolha, na mesma tela, entre baixar lançamento existente e criar nova
  despesa paga;
- reaproveitamento transacional das regras de baixa existentes;
- vínculo de `receipt_imports` com `financial_entry_id` e `settlement_id`;
- auditoria do tipo e da origem da seleção;
- mensagens pós-aprovação compatíveis com os dois fluxos;
- testes unitários, financeiros, HTTP, migrations e regressão da interface;
- documentação de arquitetura e padrões atualizada;
- release incrementada para `Release 04/08/2026 19:56 - 104`.

---

## Assinatura da LLM

- Data: 04/08/2026 19:56
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
