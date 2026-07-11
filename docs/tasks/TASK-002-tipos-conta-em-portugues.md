# TASK-002 - Tipos de conta em portugues

## Contexto

Na tela de Contas, os tipos de conta aparecem hoje com os valores internos em
ingles:

- `CHECKING`
- `SAVINGS`
- `CASH`
- `DIGITAL_WALLET`
- `CREDIT_CARD`
- `OTHER`

Esses valores sao adequados como codigos internos de persistencia, mas nao
devem ser exibidos diretamente para o usuario final. A interface do EmDia deve
manter mensagens e rotulos em portugues.

## Objetivo

Exibir os tipos de conta em portugues em todas as telas e pontos de interface
do sistema, preservando os valores internos atuais no banco e no codigo de
negocio.

## Escopo

- Criar ou reaproveitar um helper de rotulo para tipos de conta financeira.
- Alterar o select de tipo na tela de Contas para mostrar rotulos em portugues.
- Alterar a tabela da tela de Contas para mostrar o tipo em portugues.
- Fazer uma varredura geral por exibicoes de `FinancialAccount.type` ou dos
  codigos `CHECKING`, `SAVINGS`, `CASH`, `DIGITAL_WALLET`, `CREDIT_CARD` e
  `OTHER`.
- Garantir que novas contas continuem sendo salvas com os codigos internos
  atuais.
- Preservar compatibilidade com bancos locais ja existentes.

## Fora do escopo

- Migrar dados ja gravados para valores em portugues.
- Alterar o schema do banco.
- Renomear enums internos ou contratos de model.
- Traduzir outros tipos do sistema, como `entry_type`, `party_type` ou
  `settlement_type`, salvo se aparecerem diretamente no mesmo fluxo de Contas e
  forem necessarios para consistencia visual.
- Criar CRUD completo de edicao ou remocao de contas.

## Rotulos esperados

| Valor interno | Rotulo em portugues |
| --- | --- |
| `CHECKING` | Conta corrente |
| `SAVINGS` | Poupanca |
| `CASH` | Dinheiro |
| `DIGITAL_WALLET` | Carteira digital |
| `CREDIT_CARD` | Cartao de credito |
| `OTHER` | Outro |

## Pontos encontrados na varredura inicial

- `src/services/viewEngine.js`: select de tipo na tela de Contas.
- `src/services/viewEngine.js`: tabela da tela de Contas.
- `src/models/FinancialAccount.js`: valor padrao interno `CHECKING`.
- `src/database/seed.js`: contas iniciais com `CHECKING` e `CASH`.
- `PRD_sistema_financas_pessoais.md`: referencia aos codigos internos de tipo
  de conta.

## Requisitos tecnicos

- Usar CommonJS e os padroes atuais do projeto.
- Manter os valores persistidos em ingles como codigos internos.
- Centralizar a traducao para evitar repeticao de ternarios ou mapas soltos em
  multiplas views.
- Usar `escapeHtml` ao renderizar qualquer valor derivado de dados persistidos.
- Caso seja encontrado um tipo desconhecido, exibir um fallback seguro, sem
  quebrar a tela.

## Criterios de aceite

- O select da tela de Contas exibe todos os tipos em portugues.
- A tabela da tela de Contas exibe o tipo em portugues para contas existentes.
- Ao criar uma conta, o valor salvo continua sendo o codigo interno esperado.
- A varredura nao deixa exibicoes conhecidas dos codigos internos na interface
  de Contas.
- `npm run check` passa apos a implementacao.

## Implementacao

- Rótulos de tipos de conta centralizados em `src/services/viewEngine.js`.
- Select da tela de Contas passa a exibir rótulos em português preservando os
  valores internos.
- Tabela da tela de Contas passa a traduzir `FinancialAccount.type` para o
  rótulo em português.
- Fallback seguro mantido para tipos desconhecidos.

## Validacao sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/accounts`;
- conferir os rotulos do campo Tipo;
- criar uma conta de cada tipo principal, quando fizer sentido;
- conferir a tabela de Contas;
- confirmar que valores ja existentes tambem aparecem traduzidos.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
