# TASK-002 - Tipos de conta em português

## Contexto

Na tela de Contas, os tipos de conta aparecem hoje com os valores internos em
ingles:

- `CHECKING`
- `SAVINGS`
- `CASH`
- `DIGITAL_WALLET`
- `CREDIT_CARD`
- `OTHER`

Esses valores sao adequados como códigos internos de persistência, mas não
devem ser exibidos diretamente para o usuário final. A interface do EmDia deve
manter mensagens e rótulos em português.

## Objetivo

Exibir os tipos de conta em português em todas as telas e pontos de interface
do sistema, preservando os valores internos atuais no banco e no código de
negocio.

## Escopo

- Criar ou reaproveitar um helper de rótulo para tipos de conta financeira.
- Alterar o select de tipo na tela de Contas para mostrar rótulos em português.
- Alterar a tabela da tela de Contas para mostrar o tipo em português.
- Fazer uma varredura geral por exibicoes de `FinancialAccount.type` ou dos
  códigos `CHECKING`, `SAVINGS`, `CASH`, `DIGITAL_WALLET`, `CREDIT_CARD` e
  `OTHER`.
- Garantir que novas contas continuem sendo salvas com os códigos internos
  atuais.
- Preservar compatibilidade com bancos locais já existentes.

## Fora do escopo

- Migrar dados já gravados para valores em português.
- Alterar o schema do banco.
- Renomear enums internos ou contratos de model.
- Traduzir outros tipos do sistema, como `entry_type`, `party_type` ou
  `settlement_type`, salvo se aparecerem diretamente no mesmo fluxo de Contas e
  forem necessários para consistência visual.
- Criar CRUD completo de edição ou remocao de contas.

## Rótulos esperados

| Valor interno | Rótulo em português |
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
- `src/models/FinancialAccount.js`: valor padrão interno `CHECKING`.
- `src/database/seed.js`: contas iniciais com `CHECKING` e `CASH`.
- `PRD_sistema_financas_pessoais.md`: referência aos códigos internos de tipo
  de conta.

## Requisitos técnicos

- Usar CommonJS e os padrões atuais do projeto.
- Manter os valores persistidos em ingles como códigos internos.
- Centralizar a traducao para evitar repeticao de ternarios ou mapas soltos em
  múltiplas views.
- Usar `escapeHtml` ao renderizar qualquer valor derivado de dados persistidos.
- Caso seja encontrado um tipo desconhecido, exibir um fallback seguro, sem
  quebrar a tela.

## Critérios de aceite

- O select da tela de Contas exibe todos os tipos em português.
- A tabela da tela de Contas exibe o tipo em português para contas existentes.
- Ao criar uma conta, o valor salvo continua sendo o código interno esperado.
- A varredura não deixa exibicoes conhecidas dos códigos internos na interface
  de Contas.
- `npm run check` passa após a implementação.

## Implementação

- Rótulos de tipos de conta centralizados em `src/services/viewEngine.js`.
- Select da tela de Contas passa a exibir rótulos em português preservando os
  valores internos.
- Tabela da tela de Contas passa a traduzir `FinancialAccount.type` para o
  rótulo em português.
- Fallback seguro mantido para tipos desconhecidos.

## Validação sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/accounts`;
- conferir os rótulos do campo Tipo;
- criar uma conta de cada tipo principal, quando fizer sentido;
- conferir a tabela de Contas;
- confirmar que valores já existentes também aparecem traduzidos.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
