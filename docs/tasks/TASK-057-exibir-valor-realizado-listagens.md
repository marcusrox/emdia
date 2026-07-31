# TASK-057 - Exibir valor realizado nas listagens após baixa

## Contexto

As listagens do dashboard e da tela de lançamentos exibem atualmente o valor
previsto na coluna `Valor`, independentemente de o lançamento possuir baixas.

Depois de uma baixa, o valor realizado passa a ser a informação mais relevante.
Entretanto, substituir o número sem identificar sua natureza pode confundir o
usuário, especialmente durante uma leitura rápida. Adicionar colunas separadas
para previsto e realizado também aumentaria a densidade visual das tabelas.

## Objetivo

Manter uma única coluna `Valor` e adaptar seu conteúdo ao estado financeiro do
lançamento, deixando explícito se o número principal é previsto ou realizado.

## Decisão de UX

A coluna continuará com o título genérico `Valor` e apresentará:

- um valor principal com maior destaque;
- uma legenda curta logo abaixo para identificar o significado do valor;
- o valor previsto como referência adicional apenas quando necessário.

Não depender apenas de cor, status ou tooltip para distinguir previsto de
realizado.

## Regras de exibição

### Lançamento sem baixa

- mostrar o valor previsto como valor principal;
- mostrar a legenda `previsto`.

Exemplo:

```text
R$ 1.000,00
previsto
```

### Lançamento parcialmente baixado

- mostrar o total realizado como valor principal;
- mostrar abaixo `realizado de R$ X previsto`.

Exemplo:

```text
R$ 600,00
realizado de R$ 1.000,00 previsto
```

### Lançamento integralmente baixado pelo valor previsto

- mostrar o valor realizado como principal;
- mostrar a legenda `realizado`;
- não repetir o previsto quando os valores forem iguais.

### Lançamento quitado com diferença

- mostrar o valor realizado como principal;
- mostrar abaixo o valor originalmente previsto;
- aplicar a mesma regra tanto para valor realizado abaixo quanto acima do
  previsto.

Exemplo:

```text
R$ 950,00
previsto R$ 1.000,00
```

### Lançamento cancelado

- manter o valor previsto riscado, conforme o padrão visual atual;
- mostrar a legenda `previsto`;
- não tratar o cancelamento como valor realizado.

## Escopo

- aplicar a regra na listagem de lançamentos;
- aplicar a mesma regra aos lançamentos exibidos no dashboard;
- aplicar apresentação equivalente nos cartões mobile;
- reutilizar um helper ou componente de renderização para evitar divergência
  entre as telas;
- preservar os sinais visuais de receita, despesa, cancelamento e status;
- considerar baixas vigentes, desconsiderando baixas estornadas;
- manter valores monetários em centavos inteiros.

## Fora de escopo

- adicionar colunas permanentes separadas para previsto e realizado;
- alterar cálculos financeiros, settlements, estornos ou derivação de status;
- modificar cards de totais e indicadores agregados do dashboard;
- alterar exportação CSV ou relatórios;
- ocultar o valor previsto do detalhe do lançamento.

## Acessibilidade e clareza

- as legendas devem permanecer legíveis sem depender de hover;
- cor não deve ser o único meio de comunicar o significado;
- o valor principal e sua legenda devem manter associação visual clara;
- textos auxiliares devem permanecer compreensíveis em zoom e fontes maiores;
- no mobile, evitar truncar valores monetários ou esconder a legenda essencial.

## Critérios de aceite

- lançamentos sem baixa mostram o previsto com a legenda `previsto`;
- após a primeira baixa vigente, o valor principal passa a ser o realizado;
- baixas parciais mostram realizado e previsto na mesma célula;
- lançamentos quitados sem diferença não repetem o mesmo valor;
- quitações acima ou abaixo do previsto mantêm ambos os valores identificados;
- lançamentos cancelados não apresentam o previsto como realizado;
- baixas estornadas não continuam influenciando o valor exibido;
- dashboard, listagem desktop e cartões mobile seguem a mesma regra;
- nenhuma segunda coluna monetária permanente é adicionada;
- dados e regras de negócio existentes não são alterados;
- `npm run check` e a suíte de testes terminam sem erros.

## Validação sugerida

- lançamento pendente sem baixa;
- lançamento atrasado sem baixa;
- lançamento parcialmente pago;
- lançamento parcialmente recebido;
- despesa paga exatamente pelo previsto;
- receita recebida exatamente pelo previsto;
- quitação abaixo do previsto;
- quitação acima do previsto;
- baixa parcial seguida de estorno;
- baixa final seguida de estorno;
- lançamento cancelado;
- comparação entre dashboard, listagem desktop e cartão mobile.

---

## Assinatura da LLM

- Data: 30/07/2026 19:30
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Implementação concluída

- criado um helper único para apresentar o valor dos lançamentos nas listas;
- mantido o previsto como valor principal enquanto não houver baixa vigente;
- após a primeira baixa vigente, o realizado passa a ser o valor principal;
- baixas parciais mostram o realizado e o previsto na mesma célula;
- quitações com diferença preservam o previsto como referência;
- lançamentos cancelados continuam mostrando o previsto riscado;
- o helper considera `active_settlement_count`, portanto baixas estornadas não
  mantêm a apresentação como realizado;
- dashboard, listagem desktop e cartões mobile reutilizam a mesma renderização;
- adicionados testes unitários para os principais estados da apresentação;
- validação sintática e suíte completa executadas com sucesso.

---

## Assinatura da LLM

- Data: 30/07/2026 19:36
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
