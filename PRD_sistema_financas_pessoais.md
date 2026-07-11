# PRD Técnico — EmDia

> Documento orientador para implementação com Codex  
> Versão: 1.1  
> Data: 10/07/2026  
> Status: Proposta de MVP

## Identidade do produto

**Nome:** EmDia  
**Descrição:** Controle de contas, receitas e vencimentos  
**Slogan:** Suas finanças sempre em dia.


---

## 1. Visão geral

Construir o EmDia, uma aplicação web para controle de finanças pessoais, com foco principal em:

- controlar contas a pagar;
- evitar atrasos por meio de lembretes;
- cadastrar contas recorrentes;
- cadastrar despesas e receitas avulsas;
- registrar pagamentos e recebimentos;
- anexar comprovantes, boletos, notas fiscais e recibos;
- extrair automaticamente dados de imagens e documentos;
- receber documentos e comandos pelo WhatsApp;
- enviar lembretes pelo WhatsApp;
- trabalhar por padrão sobre as contas da competência do mês corrente;
- apresentar uma visão clara do fluxo financeiro mensal.

O EmDia deverá ser simples para uso cotidiano, mas organizado para permitir evolução futura para múltiplos usuários, contas compartilhadas, orçamento, conciliação e relatórios avançados.

---

## 2. Validação da ideia

A proposta é tecnicamente viável.

O stack sugerido é adequado para um MVP e para uso pessoal:

### Backend

- Node.js;
- TypeScript;
- Express.js 5;
- SQLite;
- Drizzle ORM;
- Zod para validação;
- EJS como template engine;
- node-cron ou fila de tarefas para rotinas agendadas.

### Frontend

- EJS;
- HTML;
- CSS;
- HTMX;
- JavaScript apenas quando necessário;
- Font Awesome;
- Chart.js para gráficos.

### Integrações

- Evolution API, preferencialmente auto-hospedada;
- serviço de OCR;
- armazenamento local no MVP;
- armazenamento compatível com S3 em produção.

### Recomendação importante

Embora JavaScript puro seja possível, recomenda-se TypeScript. O sistema lidará com datas, dinheiro, estados de pagamento, integrações externas e dados extraídos automaticamente. A tipagem reduz erros e melhora a capacidade do Codex de compreender e alterar o projeto.

---

## 3. Princípios de modelagem

### 3.1 Regra recorrente não é uma conta a pagar

Uma conta recorrente representa uma regra, por exemplo:

> Internet, mensal, vencimento no dia 10, valor previsto de R$ 119,90.

A conta efetiva de julho é outra entidade:

> Internet — competência julho/2026 — vencimento 10/07/2026 — R$ 119,90 — pendente.

Isso permite:

- editar a recorrência sem modificar meses anteriores;
- registrar valores diferentes a cada mês;
- pular um mês;
- antecipar ou adiar um vencimento específico;
- manter histórico completo;
- cancelar a recorrência sem apagar ocorrências anteriores.

### 3.2 O sistema deve trabalhar com competência e vencimento

Cada lançamento pode ter:

- competência: mês ao qual pertence;
- data de emissão;
- data de vencimento;
- data de pagamento ou recebimento.

Esses conceitos não devem ser tratados como equivalentes.

### 3.3 A competência mensal deve orientar a experiência padrão

O sistema deve ser organizado para o uso cotidiano mês a mês. Ao acessar telas de
contas, lançamentos, dashboard, calendário, relatórios operacionais e filtros,
a visão inicial deve considerar a competência do mês corrente do usuário.

Exemplo: em julho/2026, a listagem principal deve abrir filtrada por
`competência = 2026-07`, exibindo as contas, receitas e despesas daquele mês.

O usuário deve conseguir trocar rapidamente a competência para meses anteriores
ou futuros, mas essa troca deve ser uma ação explícita. Ao voltar para uma tela
sem filtro persistido, o padrão volta a ser o mês corrente.

Essa regra não elimina visões por vencimento, atraso ou próximos dias. Ela define
apenas o escopo padrão de trabalho: primeiro o mês atual, depois outros períodos
quando o usuário pedir.

### 3.4 Valores monetários devem usar centavos inteiros

Não utilizar `float` para dinheiro.

Exemplo:

- R$ 119,90 deve ser armazenado como `11990`;
- campo sugerido: `amount_cents INTEGER`.

### 3.5 Despesa e receita podem compartilhar uma entidade

É possível usar uma tabela única chamada `transactions` ou `financial_entries`, diferenciando:

- `EXPENSE`;
- `INCOME`.

Neste projeto será adotado o nome `financial_entries`.

### 3.6 Extração automática nunca deve confirmar silenciosamente

Dados obtidos por OCR ou IA devem ser exibidos para revisão antes da gravação definitiva, especialmente:

- valor;
- vencimento;
- beneficiário;
- CPF/CNPJ;
- código de barras;
- número da nota;
- data da compra;
- forma de pagamento.

---

## 4. Escopo do MVP

### Incluído

1. Autenticação local.
2. Cadastro de contas financeiras.
3. Cadastro de categorias.
4. Cadastro de favorecidos e pagadores.
5. Cadastro de despesas.
6. Cadastro de receitas.
7. Cadastro de recorrências.
8. Geração automática de ocorrências recorrentes.
9. Registro de pagamento ou recebimento.
10. Parcelamento básico.
11. Anexos.
12. Processamento de imagem ou PDF.
13. Tela de revisão dos dados extraídos.
14. Dashboard.
15. Agenda de vencimentos.
16. Notificações pelo WhatsApp.
17. Recepção de imagem pelo WhatsApp.
18. Registro de auditoria.
19. Exportação CSV.
20. Backup do banco e dos anexos.

### Fora do MVP

- instalação da Evolution API;
- atualização da Evolution API;
- criação ou administração da instância de WhatsApp;
- pareamento do número por QR Code;
- administração do servidor `evolution.idevsolutions.com.br`;
- backup e monitoramento operacional da Evolution API;
- integração bancária Open Finance;
- pagamento automático;
- emissão de PIX;
- leitura automática de extrato bancário;
- conciliação bancária completa;
- múltiplas moedas;
- investimentos;
- controle contábil;
- declaração de Imposto de Renda;
- aplicativo móvel nativo;
- divisão de despesas entre pessoas;
- emissão de cobrança;
- cartão de crédito com importação automática de fatura.

---

## 5. Perfis de uso

### MVP

Um usuário proprietário do sistema.

### Evolução futura

- proprietário;
- membro da família;
- somente leitura;
- administrador;
- conta familiar compartilhada.

Mesmo sendo de uso pessoal, as tabelas principais devem possuir `user_id`. Isso evita uma migração estrutural difícil no futuro.

---

## 6. Glossário

| Termo | Significado |
|---|---|
| Lançamento | Registro financeiro de despesa ou receita |
| Recorrência | Regra que gera lançamentos futuros |
| Competência | Mês ou período ao qual o lançamento pertence |
| Vencimento | Data limite para pagamento ou recebimento |
| Baixa | Confirmação de pagamento ou recebimento |
| Conta financeira | Banco, carteira, dinheiro, conta digital ou cartão |
| Favorecido | Pessoa ou empresa que recebe uma despesa |
| Pagador | Pessoa ou empresa que origina uma receita |
| Documento | Comprovante, boleto, recibo, nota fiscal ou fatura |
| OCR | Extração de texto de imagem ou PDF |
| Ocorrência | Lançamento criado a partir de uma recorrência |

---

## 7. Casos de uso principais

### 7.1 Cadastrar uma despesa avulsa

O usuário informa:

- descrição;
- categoria;
- favorecido;
- valor;
- vencimento;
- competência;
- conta financeira;
- observações;
- anexo opcional.

O lançamento começa como `PENDING`.

### 7.2 Cadastrar uma receita

Exemplo: salário do mês.

O usuário informa:

- descrição;
- fonte pagadora;
- valor;
- data prevista;
- competência;
- conta de destino;
- recorrência opcional.

### 7.3 Cadastrar uma conta recorrente

Exemplo:

- descrição: Internet;
- frequência: mensal;
- dia de vencimento: 10;
- valor previsto: R$ 119,90;
- início: julho/2026;
- sem data de término;
- aviso: 5, 2 e 0 dias antes.

O sistema gera cada lançamento mensal separadamente.

### 7.4 Registrar pagamento

O usuário abre uma despesa pendente e informa:

- data do pagamento;
- valor efetivamente pago;
- conta utilizada;
- juros;
- multa;
- desconto;
- comprovante;
- observação.

O status passa para `PAID`.

### 7.5 Receber imagem pelo WhatsApp

1. Usuário envia foto ou PDF.
2. Webhook recebe a mensagem.
3. Sistema valida o número remetente.
4. Sistema baixa a mídia.
5. Documento é armazenado.
6. OCR é executado.
7. Campos são extraídos.
8. Sistema tenta classificar o documento.
9. Sistema cria um rascunho.
10. Usuário recebe uma mensagem com resumo e link seguro para revisão.
11. Usuário confirma ou corrige pelo sistema web.

### 7.6 Enviar lembrete pelo WhatsApp

Exemplo:

> EmDia: sua conta de energia vence amanhã.  
> Valor previsto: R$ 284,70.  
> Status: pendente.

O lembrete deve conter um link autenticado ou temporário para abrir o lançamento.

### 7.7 Registrar conta a partir de formulário

O formulário deve permitir:

- preenchimento manual;
- upload de documento;
- preenchimento automático após processamento;
- edição antes de salvar.

---

## 8. Requisitos funcionais

### RF-001 — Autenticação

O sistema deve permitir login por e-mail e senha.

### RF-002 — Dashboard

Por padrão, o dashboard deve carregar a competência do mês corrente do usuário.
Todos os cards e gráficos mensais devem respeitar essa competência inicial,
exceto blocos explicitamente definidos por vencimento relativo, como "vencem
hoje" e "próximos 7 dias".

O dashboard deve exibir:

- saldo previsto do mês;
- receitas previstas;
- receitas recebidas;
- despesas previstas;
- despesas pagas;
- despesas vencidas;
- despesas a vencer;
- contas que vencem hoje;
- próximos vencimentos;
- gráfico por categoria;
- fluxo diário ou mensal;
- comparação previsto versus realizado.

### RF-003 — Contas financeiras

O usuário deve cadastrar:

- conta corrente;
- poupança;
- carteira;
- dinheiro;
- conta digital;
- cartão de crédito;
- outros.

Campos:

- nome;
- tipo;
- instituição;
- saldo inicial;
- data do saldo inicial;
- ativo;
- cor ou ícone;
- observações.

### RF-004 — Categorias

Categorias devem possuir:

- nome;
- tipo: despesa, receita ou ambos;
- categoria pai opcional;
- ícone;
- cor;
- ativo.

Exemplos de despesa:

- Moradia;
- Energia;
- Água;
- Internet;
- Alimentação;
- Transporte;
- Saúde;
- Educação;
- Lazer;
- Assinaturas;
- Impostos;
- Outros.

Exemplos de receita:

- Salário;
- Benefícios;
- Reembolso;
- Venda;
- Rendimentos;
- Outros.

### RF-005 — Lançamentos financeiros

As telas de listagem e manutenção de lançamentos devem abrir filtradas pela
competência do mês corrente, permitindo alterar o mês por seletor de competência.

Cada lançamento deve possuir:

- usuário;
- tipo;
- descrição;
- valor previsto;
- valor realizado;
- categoria;
- favorecido ou pagador;
- conta financeira prevista;
- conta financeira efetiva;
- competência;
- data de emissão;
- vencimento;
- data de pagamento ou recebimento;
- status;
- origem;
- observações;
- recorrência de origem;
- parcela;
- tags;
- anexos;
- timestamps.

### RF-006 — Status de lançamento

Estados sugeridos:

- `DRAFT`;
- `PENDING`;
- `PARTIALLY_PAID`;
- `PAID`;
- `OVERDUE`;
- `CANCELLED`;
- `RECEIVED`;
- `PARTIALLY_RECEIVED`.

O status `OVERDUE` pode ser calculado, em vez de persistido:

```text
tipo = despesa
status = PENDING
vencimento < hoje
=> vencida
```

Para reduzir inconsistência, recomenda-se persistir apenas estados operacionais e calcular “vencida” na consulta.

### RF-007 — Recorrências

Frequências:

- diária;
- semanal;
- quinzenal;
- mensal;
- bimestral;
- trimestral;
- semestral;
- anual;
- personalizada.

Campos:

- tipo da recorrência;
- intervalo;
- data inicial;
- data final opcional;
- dia do mês;
- dia da semana;
- regra para fim de mês;
- valor previsto;
- descrição padrão;
- categoria;
- conta financeira;
- favorecido ou pagador;
- geração antecipada;
- ativo;
- próxima geração.

### RF-008 — Tratamento do fim do mês

Para recorrências no dia 29, 30 ou 31:

- opção `LAST_VALID_DAY`: usar o último dia válido;
- opção `NEXT_MONTH`: mover para o mês seguinte;
- opção `PREVIOUS_BUSINESS_DAY`: usar dia útil anterior;
- opção `NEXT_BUSINESS_DAY`: usar próximo dia útil.

No MVP, implementar `LAST_VALID_DAY`.

### RF-009 — Geração de ocorrências

A rotina deve:

- executar diariamente;
- procurar recorrências ativas;
- gerar lançamentos até uma janela futura configurável;
- usar chave de idempotência;
- impedir duplicação;
- atualizar `next_generation_at`.

Sugestão: gerar lançamentos dos próximos 60 dias.

### RF-010 — Parcelamento

O usuário poderá informar:

- valor total;
- quantidade de parcelas;
- primeiro vencimento;
- intervalo mensal;
- descrição;
- categoria;
- conta prevista.

O sistema criará um lançamento para cada parcela.

Cada parcela deve armazenar:

- grupo do parcelamento;
- número da parcela;
- total de parcelas.

### RF-011 — Pagamento parcial

O sistema deve aceitar mais de uma movimentação de baixa para o mesmo lançamento.

Exemplo:

- conta de R$ 1.000;
- pagamento de R$ 600;
- saldo pendente de R$ 400.

Por isso, os pagamentos devem ser armazenados em tabela própria.

### RF-012 — Ajustes financeiros

Na baixa, permitir:

- principal;
- juros;
- multa;
- desconto;
- acréscimos;
- total pago.

### RF-013 — Favorecidos e pagadores

Campos:

- nome;
- tipo: pessoa, empresa ou governo;
- CPF/CNPJ opcional;
- e-mail;
- telefone;
- observações;
- ativo.

### RF-014 — Anexos

Tipos aceitos no MVP:

- JPEG;
- PNG;
- WebP;
- PDF.

Regras:

- validar MIME real;
- limitar tamanho;
- gerar nome interno;
- não confiar no nome original;
- registrar hash SHA-256;
- armazenar metadados;
- evitar exposição direta da pasta de arquivos;
- permitir download autenticado.

### RF-015 — Processamento documental

Estados:

- `UPLOADED`;
- `QUEUED`;
- `PROCESSING`;
- `NEEDS_REVIEW`;
- `CONFIRMED`;
- `FAILED`.

Campos extraíveis:

- tipo de documento;
- emissor;
- CPF/CNPJ;
- descrição;
- data de emissão;
- vencimento;
- valor total;
- código de barras;
- linha digitável;
- chave de acesso;
- número da nota;
- forma de pagamento;
- últimos dígitos do cartão;
- itens, quando aplicável;
- confiança de cada campo.

### RF-016 — Revisão humana

A tela de revisão deve mostrar:

- imagem ou PDF;
- texto extraído;
- campos sugeridos;
- confiança;
- possíveis duplicidades;
- formulário editável;
- botão para confirmar;
- botão para descartar;
- botão para reprocessar.

### RF-017 — Detecção de duplicidade

Antes de criar um lançamento por documento, comparar:

- hash do arquivo;
- CNPJ;
- valor;
- data;
- número do documento;
- código de barras;
- chave de acesso.

O sistema deve alertar, não bloquear automaticamente em todos os casos.

### RF-018 — Notificações

Canais:

- WhatsApp;
- painel interno;
- e-mail em evolução futura.

Eventos:

- conta próxima do vencimento;
- conta vencendo hoje;
- conta vencida;
- receita prevista;
- documento processado;
- falha no processamento;
- recorrência com erro;
- resumo diário.

### RF-019 — Preferências de notificação

Configurações:

- dias de antecedência;
- horário;
- fuso horário;
- receber resumo diário;
- receber lembrete no vencimento;
- repetir aviso de atraso;
- dias da semana;
- silenciar categoria;
- silenciar lançamento.

Fuso padrão:

```text
America/Bahia
```

### RF-020 — Busca e filtros

Quando nenhum filtro de período ou competência for informado, as buscas e
listagens devem aplicar automaticamente a competência do mês corrente do usuário.
Esse padrão deve ser visível na interface para evitar a impressão de que dados de
outros meses desapareceram.

Filtros:

- período;
- competência;
- vencimento;
- status;
- tipo;
- categoria;
- conta;
- favorecido;
- origem;
- recorrente;
- com anexo;
- texto livre.

### RF-021 — Exportação

Exportar CSV contendo:

- lançamentos;
- pagamentos;
- receitas;
- categorias;
- contas.

### RF-022 — Auditoria

Registrar:

- criação;
- edição;
- exclusão lógica;
- baixa;
- estorno;
- upload;
- processamento;
- confirmação de OCR;
- notificação enviada;
- mensagem recebida.

---

## 9. Requisitos não funcionais

### RNF-001 — Segurança

- senhas com Argon2id;
- sessões em cookie `HttpOnly`;
- cookie `Secure` em produção;
- `SameSite=Lax` ou `Strict`;
- proteção CSRF;
- rate limiting;
- Helmet;
- validação com Zod;
- queries parametrizadas;
- controle de acesso por usuário;
- segredos em variáveis de ambiente;
- logs sem tokens ou documentos sensíveis.

### RNF-002 — Privacidade

Os documentos podem conter:

- CPF;
- CNPJ;
- endereço;
- dados bancários;
- códigos de barras;
- informações de compra.

O sistema deve:

- coletar apenas dados necessários;
- restringir acesso;
- permitir exclusão;
- definir retenção;
- evitar enviar documentos completos a serviços externos sem ciência do usuário;
- registrar qual provedor processou o arquivo.

### RNF-003 — Desempenho

Para o MVP:

- listagens paginadas;
- índices de banco;
- processamento de OCR assíncrono;
- miniaturas para imagens;
- evitar OCR dentro da requisição HTTP.

### RNF-004 — Confiabilidade

- transações de banco;
- tarefas idempotentes;
- backup automático;
- recuperação documentada;
- status de processamento;
- retentativas com limite;
- dead-letter ou registro de falhas.

### RNF-005 — Observabilidade

- logs estruturados;
- identificador por requisição;
- log de jobs;
- log de webhooks;
- tela simples de saúde;
- endpoint `/health`;
- endpoint `/ready`.

### RNF-006 — Acessibilidade

- labels em formulários;
- navegação por teclado;
- contraste;
- mensagens de erro claras;
- ícones acompanhados de texto;
- não depender apenas de cor.

### RNF-007 — Responsividade

A interface deve funcionar em:

- desktop;
- tablet;
- celular.

O fluxo de upload e revisão deve ser priorizado para celular.

---

## 10. Arquitetura proposta

```text
Navegador
   |
   | HTTPS
   v
Express.js + EJS + HTMX
   |
   +-- Controllers
   +-- Services
   +-- Repositories
   +-- Jobs
   +-- Integrations
   |
   +--> SQLite
   +--> Storage de arquivos
   +--> Provedor de OCR/IA
   +--> Evolution API
```

### Camadas

```text
src/
  config/
  controllers/
  services/
  repositories/
  routes/
  middleware/
  validators/
  views/
  public/
  db/
  jobs/
  integrations/
  utils/
  types/
```

### Arquitetura interna

- Controllers recebem HTTP e retornam HTML ou fragmentos HTMX.
- Services implementam regras de negócio.
- Repositories isolam acesso ao banco.
- Jobs executam tarefas periódicas.
- Integrations encapsulam WhatsApp, OCR e storage.
- Validators concentram esquemas Zod.
- Views não acessam banco diretamente.

---

## 11. Stack recomendada

### Dependências principais

```text
express
ejs
htmx.org
drizzle-orm
better-sqlite3
zod
express-session
connect-sqlite3
argon2
helmet
express-rate-limit
multer
file-type
sharp
pino
pino-http
luxon
node-cron
nanoid
```

### Desenvolvimento

```text
typescript
tsx
eslint
prettier
vitest
supertest
playwright
drizzle-kit
@types/node
@types/express
@types/ejs
```

### Consideração sobre fila

Para o MVP, uma fila persistida no próprio SQLite pode ser implementada com a tabela `jobs`.

Não depender apenas de `node-cron`, pois uma tarefa perdida durante indisponibilidade precisa ser retomada.

`node-cron` pode apenas disparar o worker que consulta a tabela.

---

## 12. Estratégia para SQLite

SQLite é adequado quando:

- há poucos usuários;
- a aplicação roda em uma única instância;
- o arquivo do banco fica em disco local;
- as gravações concorrentes são limitadas.

Configurações sugeridas:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

Regras:

- não colocar o arquivo SQLite em compartilhamento de rede;
- manter banco, WAL e SHM no mesmo volume local;
- criar backups consistentes;
- migrar para PostgreSQL se houver múltiplas instâncias ou concorrência significativa.

---

## 13. Modelo de dados

### 13.1 Diagrama lógico simplificado

```text
users
  |
  +-- financial_accounts
  +-- categories
  +-- parties
  +-- recurrence_rules
  |      |
  |      +-- financial_entries
  |
  +-- installment_groups
  |      |
  |      +-- financial_entries
  |
  +-- financial_entries
         |
         +-- settlements
         +-- attachments
         +-- entry_tags
         +-- notifications
```

### 13.2 Tabela `users`

```text
id TEXT PK
name TEXT NOT NULL
email TEXT NOT NULL UNIQUE
password_hash TEXT NOT NULL
phone_e164 TEXT
timezone TEXT NOT NULL DEFAULT 'America/Bahia'
locale TEXT NOT NULL DEFAULT 'pt-BR'
is_active INTEGER NOT NULL DEFAULT 1
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 13.3 Tabela `financial_accounts`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
name TEXT NOT NULL
type TEXT NOT NULL
institution_name TEXT
initial_balance_cents INTEGER NOT NULL DEFAULT 0
initial_balance_date TEXT
icon TEXT
color TEXT
is_active INTEGER NOT NULL DEFAULT 1
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

Tipos:

```text
CHECKING
SAVINGS
CASH
DIGITAL_WALLET
CREDIT_CARD
OTHER
```

### 13.4 Tabela `categories`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
parent_id TEXT FK categories
name TEXT NOT NULL
entry_type TEXT NOT NULL
icon TEXT
color TEXT
is_active INTEGER NOT NULL DEFAULT 1
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### 13.5 Tabela `parties`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
name TEXT NOT NULL
party_type TEXT NOT NULL
document_number TEXT
email TEXT
phone TEXT
notes TEXT
is_active INTEGER NOT NULL DEFAULT 1
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### 13.6 Tabela `recurrence_rules`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
entry_type TEXT NOT NULL
description TEXT NOT NULL
category_id TEXT FK categories
party_id TEXT FK parties
financial_account_id TEXT FK financial_accounts
expected_amount_cents INTEGER
frequency TEXT NOT NULL
interval_value INTEGER NOT NULL DEFAULT 1
start_date TEXT NOT NULL
end_date TEXT
day_of_month INTEGER
day_of_week INTEGER
month_of_year INTEGER
end_of_month_policy TEXT NOT NULL DEFAULT 'LAST_VALID_DAY'
generation_horizon_days INTEGER NOT NULL DEFAULT 60
next_generation_at TEXT
default_due_offset_days INTEGER NOT NULL DEFAULT 0
is_active INTEGER NOT NULL DEFAULT 1
notes TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### 13.7 Tabela `installment_groups`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
description TEXT NOT NULL
total_amount_cents INTEGER NOT NULL
installment_count INTEGER NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 13.8 Tabela `financial_entries`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
entry_type TEXT NOT NULL
description TEXT NOT NULL
category_id TEXT FK categories
party_id TEXT FK parties
expected_account_id TEXT FK financial_accounts
actual_account_id TEXT FK financial_accounts
expected_amount_cents INTEGER NOT NULL
realized_amount_cents INTEGER NOT NULL DEFAULT 0
issue_date TEXT
competence_month TEXT NOT NULL
due_date TEXT NOT NULL
settled_at TEXT
status TEXT NOT NULL
origin TEXT NOT NULL
recurrence_rule_id TEXT FK recurrence_rules
installment_group_id TEXT FK installment_groups
installment_number INTEGER
installment_count INTEGER
external_reference TEXT
barcode TEXT
digitable_line TEXT
notes TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

Tipos:

```text
EXPENSE
INCOME
```

Origens:

```text
MANUAL
RECURRENCE
INSTALLMENT
UPLOAD
WHATSAPP
IMPORT
API
```

### 13.9 Tabela `settlements`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
financial_entry_id TEXT NOT NULL FK financial_entries
financial_account_id TEXT NOT NULL FK financial_accounts
settlement_type TEXT NOT NULL
principal_cents INTEGER NOT NULL
interest_cents INTEGER NOT NULL DEFAULT 0
penalty_cents INTEGER NOT NULL DEFAULT 0
discount_cents INTEGER NOT NULL DEFAULT 0
other_adjustment_cents INTEGER NOT NULL DEFAULT 0
total_cents INTEGER NOT NULL
settled_at TEXT NOT NULL
notes TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### 13.10 Tabela `attachments`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
financial_entry_id TEXT FK financial_entries
source TEXT NOT NULL
document_type TEXT
original_filename TEXT
storage_key TEXT NOT NULL
mime_type TEXT NOT NULL
size_bytes INTEGER NOT NULL
sha256 TEXT NOT NULL
processing_status TEXT NOT NULL
ocr_provider TEXT
ocr_text TEXT
extracted_data_json TEXT
confidence_json TEXT
error_message TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### 13.11 Tabela `notification_preferences`

```text
id TEXT PK
user_id TEXT NOT NULL UNIQUE FK users
whatsapp_enabled INTEGER NOT NULL DEFAULT 0
daily_summary_enabled INTEGER NOT NULL DEFAULT 1
daily_summary_time TEXT NOT NULL DEFAULT '08:00'
due_reminder_offsets_json TEXT NOT NULL DEFAULT '[5,2,0]'
overdue_reminder_interval_days INTEGER NOT NULL DEFAULT 3
quiet_hours_start TEXT
quiet_hours_end TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 13.12 Tabela `notifications`

```text
id TEXT PK
user_id TEXT NOT NULL FK users
financial_entry_id TEXT FK financial_entries
channel TEXT NOT NULL
event_type TEXT NOT NULL
scheduled_at TEXT NOT NULL
sent_at TEXT
status TEXT NOT NULL
provider_message_id TEXT
attempt_count INTEGER NOT NULL DEFAULT 0
idempotency_key TEXT NOT NULL UNIQUE
payload_json TEXT
error_message TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 13.13 Tabela `whatsapp_messages`

```text
id TEXT PK
user_id TEXT FK users
provider_message_id TEXT NOT NULL UNIQUE
direction TEXT NOT NULL
phone_e164 TEXT NOT NULL
message_type TEXT NOT NULL
text_body TEXT
media_id TEXT
attachment_id TEXT FK attachments
status TEXT NOT NULL
raw_payload_json TEXT
received_at TEXT
sent_at TEXT
created_at TEXT NOT NULL
```

### 13.14 Tabela `jobs`

```text
id TEXT PK
job_type TEXT NOT NULL
payload_json TEXT NOT NULL
status TEXT NOT NULL
run_at TEXT NOT NULL
locked_at TEXT
locked_by TEXT
attempt_count INTEGER NOT NULL DEFAULT 0
max_attempts INTEGER NOT NULL DEFAULT 5
last_error TEXT
idempotency_key TEXT UNIQUE
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
completed_at TEXT
```

### 13.15 Tabela `audit_logs`

```text
id TEXT PK
user_id TEXT FK users
entity_type TEXT NOT NULL
entity_id TEXT NOT NULL
action TEXT NOT NULL
old_data_json TEXT
new_data_json TEXT
ip_address TEXT
user_agent TEXT
request_id TEXT
created_at TEXT NOT NULL
```

### 13.16 Tags

```text
tags
  id
  user_id
  name
  color

entry_tags
  financial_entry_id
  tag_id
```

---

## 14. Índices importantes

```sql
CREATE INDEX idx_entries_user_due
ON financial_entries(user_id, due_date);

CREATE INDEX idx_entries_user_competence
ON financial_entries(user_id, competence_month);

CREATE INDEX idx_entries_user_status
ON financial_entries(user_id, status);

CREATE INDEX idx_entries_recurrence
ON financial_entries(recurrence_rule_id);

CREATE INDEX idx_settlements_entry
ON settlements(financial_entry_id);

CREATE UNIQUE INDEX idx_recurrence_occurrence_unique
ON financial_entries(recurrence_rule_id, due_date)
WHERE recurrence_rule_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_notifications_schedule
ON notifications(status, scheduled_at);

CREATE INDEX idx_jobs_pending
ON jobs(status, run_at);

CREATE INDEX idx_attachments_sha
ON attachments(user_id, sha256);
```

---

## 15. Regras de negócio

### RN-001

Um lançamento pago não pode ser excluído fisicamente.

### RN-002

A exclusão deve ser lógica por `deleted_at`.

### RN-003

Uma recorrência cancelada não deve apagar ocorrências existentes.

### RN-004

Editar o valor padrão de uma recorrência afeta apenas ocorrências futuras ainda não geradas, salvo ação explícita.

### RN-005

Editar uma ocorrência recorrente não deve alterar automaticamente a regra.

### RN-006

O valor realizado de um lançamento corresponde à soma das baixas não excluídas.

### RN-007

O lançamento é considerado liquidado quando a soma das baixas atingir o valor devido após ajustes.

### RN-008

Estorno deve criar ou marcar uma reversão auditável, nunca simplesmente apagar a baixa.

### RN-009

Uma mensagem de WhatsApp deve ser processada uma única vez por `provider_message_id`.

### RN-010

Uma notificação não deve ser reenviada para o mesmo evento e janela quando possuir a mesma chave de idempotência.

### RN-011

Documento processado automaticamente deve permanecer em rascunho até confirmação.

### RN-012

O sistema deve preservar o arquivo original.

### RN-013

Datas devem ser persistidas em formato ISO 8601.

### RN-014

Instantes devem ser armazenados em UTC. Datas civis, como vencimento, devem ser tratadas no fuso do usuário.

### RN-015

A competência deve usar `YYYY-MM`.

### RN-016

Consultas operacionais de contas, receitas, despesas e lançamentos devem assumir
a competência do mês corrente como filtro padrão quando a requisição não informar
outra competência. A competência corrente deve ser calculada no fuso horário do
usuário.

---

## 16. Fluxo de OCR e extração

### Etapa 1 — Recepção

Fontes:

- formulário web;
- WhatsApp;
- futura API.

### Etapa 2 — Validação

- tamanho;
- tipo real;
- extensão;
- hash;
- malware, quando disponível;
- quantidade de páginas;
- resolução mínima.

### Etapa 3 — Pré-processamento

Para imagem:

- correção de rotação;
- redimensionamento;
- contraste;
- remoção de ruído;
- geração de miniatura.

### Etapa 4 — OCR

Alternativas:

1. OCR local com Tesseract;
2. API de visão;
3. serviço documental especializado;
4. abordagem híbrida.

### Recomendação para o MVP

Criar uma interface abstrata:

```ts
interface DocumentExtractor {
  extract(input: ExtractDocumentInput): Promise<ExtractDocumentResult>;
}
```

Implementações futuras:

```text
TesseractDocumentExtractor
CloudVisionDocumentExtractor
LlmVisionDocumentExtractor
```

### Etapa 5 — Normalização

- converter moeda brasileira;
- interpretar datas;
- remover formatação de CPF/CNPJ;
- reconhecer nomes;
- validar código de barras;
- distinguir valor total de valor unitário;
- identificar vencimento.

### Etapa 6 — Classificação

Tipos:

- boleto;
- nota fiscal;
- cupom fiscal;
- recibo;
- comprovante PIX;
- comprovante bancário;
- fatura;
- documento desconhecido.

### Etapa 7 — Sugestão de categoria

Usar:

1. regras por favorecido;
2. histórico;
3. palavras-chave;
4. modelo de IA como fallback.

### Etapa 8 — Revisão

Nada é confirmado automaticamente na primeira versão.

---

## 17. Integração com WhatsApp usando Evolution API

### 17.1 Abordagem recomendada

Utilizar uma instância auto-hospedada da Evolution API como gateway entre o sistema financeiro e o WhatsApp.

A aplicação financeira não deve implementar diretamente o protocolo do WhatsApp. Toda comunicação deve passar por uma abstração `WhatsAppClient`, cuja implementação inicial será `EvolutionApiWhatsAppClient`.

A Evolution API pode trabalhar com diferentes mecanismos de conexão. Para o MVP, considerar uma instância baseada em conexão por QR Code, mantendo o provedor configurável para permitir futura migração para a API oficial da Meta sem alterar as regras de negócio.

A conexão baseada em WhatsApp Web não é uma integração oficial da Meta e pode sofrer desconexões, mudanças de protocolo ou bloqueio da conta. Por isso:

- utilizar, de preferência, um número exclusivo para o sistema;
- não realizar disparos em massa;
- não enviar mensagens não solicitadas;
- limitar frequência e volume;
- implementar monitoramento da conexão;
- manter a integração desacoplada;
- não tratar a Evolution API como fonte definitiva dos dados financeiros.

### 17.2 Infraestrutura necessária

- Evolution API auto-hospedada;
- banco PostgreSQL usado pela Evolution API, conforme a versão adotada;
- Redis quando recomendado pela topologia escolhida;
- domínio HTTPS para a Evolution API;
- domínio HTTPS para a aplicação financeira;
- chave global ou chave de autenticação da instância;
- nome único da instância;
- número de WhatsApp dedicado ou autorizado;
- volume persistente para credenciais e dados da instância;
- política de backup da configuração;
- proxy reverso, como Nginx, Caddy ou Traefik.

A Evolution API deve ser executada como serviço separado. Ela não deve compartilhar o mesmo banco SQLite da aplicação financeira.

### 17.3 Ciclo de vida da instância

A integração deverá prever:

1. criação ou identificação da instância;
2. obtenção do QR Code ou código de pareamento;
3. conexão do número;
4. consulta periódica do estado da conexão;
5. reconexão;
6. tratamento de logout;
7. configuração do webhook;
8. desativação segura da instância.

Estados internos sugeridos:

```text
DISABLED
CREATED
WAITING_QR_CODE
CONNECTING
CONNECTED
DISCONNECTED
ERROR
```

O sistema deve mostrar o estado da conexão na tela de configurações.

### 17.4 Configuração de webhook

A Evolution API deve ser configurada para enviar eventos para:

```text
POST /webhooks/evolution
```

Opcionalmente, manter um alias:

```text
POST /webhooks/whatsapp
```

Eventos mínimos de interesse:

- atualização da conexão;
- mensagem recebida;
- mensagem enviada;
- atualização de mensagem;
- status de entrega;
- mídia recebida;
- erro de envio;
- remoção ou desconexão da instância.

Os nomes exatos dos eventos devem ser isolados em um adaptador, pois podem variar entre versões da Evolution API.

### 17.5 Segurança do webhook

- aceitar apenas HTTPS;
- usar um segredo próprio no caminho, cabeçalho ou proxy reverso;
- validar a instância informada no payload;
- restringir origem por rede quando a infraestrutura permitir;
- aplicar rate limiting;
- registrar identificador do evento;
- responder rapidamente com sucesso;
- enfileirar o processamento;
- aplicar idempotência;
- não executar OCR na requisição do webhook;
- não registrar documentos ou chaves de API em logs;
- manter a Evolution API fora da Internet pública quando possível, expondo-a por rede privada ou VPN.

Como a validação de assinatura pode depender da versão e configuração da Evolution API, a aplicação deverá implementar uma camada própria de autenticação entre os serviços.

### 17.6 Cliente de integração

Definir uma interface independente do provedor:

```ts
interface WhatsAppClient {
  getConnectionState(): Promise<WhatsAppConnectionState>;
  sendText(input: SendTextInput): Promise<SendMessageResult>;
  sendDocument(input: SendDocumentInput): Promise<SendMessageResult>;
  sendImage(input: SendImageInput): Promise<SendMessageResult>;
  downloadMedia(input: DownloadMediaInput): Promise<DownloadedMedia>;
}
```

Implementações:

```text
MockWhatsAppClient
EvolutionApiWhatsAppClient
```

Toda chamada HTTP deve possuir:

- timeout;
- retentativa limitada;
- backoff exponencial;
- identificador de correlação;
- tratamento de respostas não JSON;
- circuit breaker opcional;
- logs sem credenciais.

### 17.7 Associação do remetente

No MVP:

- aceitar apenas o telefone cadastrado do usuário;
- comparar o identificador remoto normalizado;
- remover sufixos internos, quando aplicável;
- converter o número para E.164;
- ignorar mensagens enviadas pelo próprio sistema;
- ignorar grupos;
- ignorar status e newsletters;
- rejeitar números desconhecidos ou enviar uma orientação genérica.

O identificador original recebido deve ser preservado para auditoria.

### 17.8 Mensagens e comandos aceitos

Tipos mínimos:

- texto;
- imagem;
- documento PDF;
- legenda de mídia.

Comandos sugeridos:

```text
ajuda
pendentes
vence hoje
vencidas
próximas
resumo
receita 5000 salário
despesa 120 internet vence 10/08
```

No MVP, priorizar:

1. envio de imagem ou PDF;
2. criação de rascunho;
3. lembretes;
4. consultas simples.

Comandos em linguagem natural podem ser adicionados depois.

### 17.9 Fluxo de mídia

```text
WhatsApp
   -> Evolution API
   -> webhook da aplicação
   -> validação do remetente e da instância
   -> criação de registro de mensagem
   -> obtenção da mídia pela Evolution API
   -> validação do arquivo
   -> storage privado
   -> job de OCR
   -> rascunho de lançamento
   -> link de revisão enviado pela Evolution API
```

A mídia pode chegar como referência, URL temporária ou conteúdo Base64, conforme o endpoint e a versão utilizados. Essa diferença deve ficar encapsulada no adaptador.

### 17.10 Envio de lembretes

O worker de notificações deverá chamar a Evolution API para enviar mensagens de texto.

Exemplo conceitual de endpoint:

```text
POST {EVOLUTION_API_URL}/message/sendText/{instance}
```

A aplicação não deve espalhar URLs da Evolution API pelo código. Os endpoints devem ficar centralizados no cliente de integração.

Conteúdo mínimo:

- descrição;
- vencimento;
- valor;
- status;
- identificador curto;
- link temporário para o lançamento.

Não incluir:

- senha;
- token;
- dados bancários completos;
- documento completo;
- código de barras integral sem necessidade.

### 17.11 Controle de frequência

Implementar limites configuráveis:

- quantidade máxima por minuto;
- quantidade máxima por hora;
- intervalo mínimo entre lembretes iguais;
- horário silencioso;
- bloqueio de mensagens duplicadas;
- pausa automática em caso de falhas consecutivas.

### 17.12 Indisponibilidade

Quando a Evolution API estiver indisponível:

- manter a notificação como pendente;
- aplicar retentativa com backoff;
- não duplicar mensagens;
- registrar a falha;
- exibir alerta administrativo;
- permitir reenvio manual;
- interromper tentativas após o limite configurado.

### 17.13 Atualizações e compatibilidade

A versão da Evolution API deve ser fixada na implantação, evitando imagens Docker com tag `latest`.

Antes de atualizar:

- revisar notas da versão;
- verificar alterações de endpoints e payloads;
- testar webhooks;
- testar envio de texto;
- testar download de imagem e PDF;
- validar reconexão da instância;
- manter plano de rollback.

---



### 17.10 Exemplos de mensagens do EmDia

```text
EmDia: sua conta de energia vence amanhã.
Valor previsto: R$ 284,70.

EmDia: recebemos seu comprovante e os dados estão prontos para revisão.

EmDia: você tem 3 contas pendentes nesta semana.

EmDia: seu resumo financeiro de julho está disponível.
```


## 18. Contrato de integração com a Evolution API existente

### 18.1 Serviço externo

```text
Base URL: https://evolution.idevsolutions.com.br/
```

A aplicação não deve presumir rotas fixas espalhadas pelo código. Todos os endpoints devem ficar encapsulados em um único cliente de integração.

Exemplo:

```ts
interface WhatsAppClient {
  sendText(input: SendTextInput): Promise<SendMessageResult>;
  sendMedia(input: SendMediaInput): Promise<SendMessageResult>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  downloadMedia(input: DownloadMediaInput): Promise<DownloadedMedia>;
}
```

Implementação:

```text
EvolutionApiWhatsAppClient
```

### 18.2 Configuração

```dotenv
EVOLUTION_API_BASE_URL=https://evolution.idevsolutions.com.br
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
EVOLUTION_WEBHOOK_SECRET=
EVOLUTION_REQUEST_TIMEOUT_MS=15000
```

As credenciais nunca devem ser gravadas no repositório.

### 18.3 Responsabilidades deste projeto

- autenticar chamadas à Evolution API;
- definir timeout;
- tratar códigos HTTP;
- registrar erros de integração;
- aplicar retentativas com backoff;
- impedir envio duplicado;
- receber webhooks;
- validar a origem do webhook conforme os recursos disponíveis;
- armazenar eventos recebidos;
- consultar a disponibilidade da instância;
- degradar graciosamente quando o serviço externo estiver indisponível.

### 18.4 Fora do escopo

- instalação;
- atualização;
- configuração de infraestrutura;
- banco de dados da Evolution API;
- Redis da Evolution API;
- proxy reverso;
- certificados TLS do domínio;
- criação da instância;
- pareamento com WhatsApp;
- QR Code;
- manutenção do número conectado;
- backup do serviço;
- observabilidade operacional do serviço externo.

### 18.5 Comportamento em indisponibilidade

Quando `https://evolution.idevsolutions.com.br/` estiver indisponível:

1. o sistema financeiro continua funcionando;
2. notificações ficam pendentes;
3. o job registra a falha;
4. novas tentativas usam backoff;
5. o usuário visualiza o estado da integração;
6. nenhuma conta ou pagamento é perdido;
7. mensagens não devem ser duplicadas após a recuperação.

### 18.6 Webhook

A instância existente deverá ser configurada externamente para enviar eventos ao endpoint:

```text
POST /webhooks/whatsapp
```

O projeto deve processar, no mínimo:

- mensagens de texto;
- imagens;
- documentos;
- identificador da mensagem;
- telefone remetente;
- data e hora;
- eventos de envio;
- eventos de entrega;
- erros.

O webhook deve responder rapidamente e enfileirar o processamento pesado.


## 19. Scheduler e jobs

### Jobs necessários

```text
GENERATE_RECURRENCES
SCHEDULE_NOTIFICATIONS
SEND_NOTIFICATION
PROCESS_ATTACHMENT
GENERATE_DAILY_SUMMARY
CLEAN_TEMP_FILES
BACKUP_DATABASE
RETRY_FAILED_WEBHOOK
```

### Worker

Fluxo:

1. busca job `PENDING` com `run_at <= agora`;
2. tenta obter lock;
3. marca `PROCESSING`;
4. executa;
5. marca `COMPLETED`;
6. em erro, incrementa tentativa;
7. aplica backoff;
8. marca `FAILED` após limite.

### Idempotência

Exemplos:

```text
recurrence:{ruleId}:{dueDate}
notification:{entryId}:{event}:{date}
whatsapp-in:{providerMessageId}
attachment-process:{attachmentId}:{version}
```

---

## 20. Interface

### 19.1 Menu principal

- Dashboard;
- Lançamentos;
- Calendário;
- Recorrências;
- Contas;
- Categorias;
- Favorecidos;
- Documentos;
- Relatórios;
- Configurações.

### 19.2 Dashboard

Ao abrir o dashboard, a competência selecionada deve ser o mês corrente. A
interface deve exibir claramente o mês em uso e oferecer navegação rápida para
mês anterior, próximo mês e voltar para o mês atual.

Cards:

- saldo previsto;
- contas vencidas;
- vencem hoje;
- próximos 7 dias;
- receitas do mês;
- despesas do mês.

Blocos:

- agenda financeira;
- despesas por categoria;
- fluxo previsto;
- documentos aguardando revisão;
- últimos pagamentos.

### 19.3 Listagem de lançamentos

A listagem deve abrir com filtro de competência igual ao mês corrente. O seletor
de competência deve permanecer visível durante filtros, paginação e ações HTMX.

Colunas:

- vencimento;
- descrição;
- categoria;
- conta;
- valor;
- status;
- ações.

Ações:

- visualizar;
- editar;
- pagar;
- anexar;
- duplicar;
- cancelar.

### 19.4 HTMX

Usar HTMX para:

- filtros;
- paginação;
- modal de baixa;
- alteração rápida de status;
- busca de favorecido;
- formulário de categoria;
- upload e acompanhamento;
- atualização de cards;
- seleção de competência;
- retorno rápido para a competência do mês corrente.

### 19.5 Rotas de fragmentos

```text
GET  /ui/entries/table
GET  /ui/dashboard/upcoming
GET  /ui/attachments/:id/status
POST /ui/entries/:id/settle
POST /ui/entries/:id/cancel
```

### 19.6 Calendário

Visualizações:

- mensal;
- lista;
- próximos 7 dias.

Cores:

- pendente;
- pago;
- vencido;
- receita;
- rascunho.

Não depender apenas das cores; incluir texto ou ícone.

---

## 21. Rotas HTTP propostas

### Autenticação

```text
GET  /login
POST /login
POST /logout
```

### Dashboard

```text
GET /dashboard
```

### Lançamentos

```text
GET    /entries
GET    /entries/new
POST   /entries
GET    /entries/:id
GET    /entries/:id/edit
POST   /entries/:id
POST   /entries/:id/cancel
POST   /entries/:id/restore
POST   /entries/:id/duplicate
```

### Baixas

```text
POST /entries/:id/settlements
POST /settlements/:id/reverse
```

### Recorrências

```text
GET  /recurrences
GET  /recurrences/new
POST /recurrences
GET  /recurrences/:id/edit
POST /recurrences/:id
POST /recurrences/:id/deactivate
POST /recurrences/:id/generate
```

### Documentos

```text
GET  /documents
POST /documents
GET  /documents/:id
GET  /documents/:id/review
POST /documents/:id/confirm
POST /documents/:id/reprocess
POST /documents/:id/discard
GET  /documents/:id/file
```

### Cadastros

```text
/accounts
/categories
/parties
/tags
```

### Configurações

```text
GET  /settings
POST /settings/profile
POST /settings/notifications
POST /settings/whatsapp
```

### Webhooks

```text
POST /webhooks/evolution
POST /webhooks/whatsapp  # alias opcional
```

### Saúde

```text
GET /health
GET /ready
```

---

## 22. Estrutura de diretórios

```text
emdia/
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/
│  │  ├─ env.ts
│  │  ├─ logger.ts
│  │  └─ database.ts
│  ├─ db/
│  │  ├─ schema/
│  │  ├─ migrations/
│  │  ├─ seeds/
│  │  └─ connection.ts
│  ├─ routes/
│  ├─ controllers/
│  ├─ services/
│  ├─ repositories/
│  ├─ validators/
│  ├─ middleware/
│  ├─ jobs/
│  ├─ integrations/
│  │  ├─ whatsapp/
│  │  ├─ ocr/
│  │  └─ storage/
│  ├─ views/
│  │  ├─ layouts/
│  │  ├─ partials/
│  │  ├─ dashboard/
│  │  ├─ entries/
│  │  ├─ recurrences/
│  │  └─ documents/
│  ├─ public/
│  │  ├─ css/
│  │  ├─ js/
│  │  └─ images/
│  ├─ utils/
│  └─ types/
├─ storage/
│  ├─ uploads/
│  ├─ thumbnails/
│  ├─ temp/
│  └─ backups/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
├─ scripts/
├─ .env.example
├─ package.json
├─ tsconfig.json
├─ drizzle.config.ts
├─ Dockerfile
├─ docker-compose.yml
├─ README.md
└─ PRD.md
```

---

## 23. Variáveis de ambiente

```dotenv
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
SESSION_SECRET=change-me
DATABASE_PATH=./storage/app.db
STORAGE_DRIVER=local
STORAGE_PATH=./storage/uploads
MAX_UPLOAD_MB=15
DEFAULT_TIMEZONE=America/Bahia

WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=evolution-api
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=personal-finance
EVOLUTION_WEBHOOK_SECRET=
EVOLUTION_REQUEST_TIMEOUT_MS=10000
EVOLUTION_MAX_RETRIES=3

OCR_PROVIDER=mock
OCR_API_KEY=

LOG_LEVEL=info
```

---

## 24. Estratégia de autenticação

### MVP

- um usuário criado por seed ou tela inicial;
- sessão persistida no SQLite;
- senha com Argon2id;
- regenerar sessão no login;
- invalidar sessão no logout;
- tempo de expiração configurável.

### Evolução

- recuperação de senha;
- autenticação multifator;
- login sem senha;
- múltiplos usuários;
- OAuth.

---

## 25. Backup e restauração

### Conteúdo do backup

- banco SQLite;
- arquivos anexados;
- arquivo de manifesto;
- versão da aplicação;
- data do backup;
- hashes.

### Frequência

- diário;
- retenção de 7 backups diários;
- 4 semanais;
- 6 mensais.

### Requisitos

- backup não deve copiar o banco de maneira inconsistente;
- usar API de backup do SQLite ou checkpoint adequado;
- testar restauração;
- permitir backup manual;
- criptografar backup externo.

---

## 26. Relatórios do MVP

Relatórios mensais devem abrir, por padrão, na competência do mês corrente. O
usuário deve poder trocar a competência ou selecionar um período maior quando o
relatório permitir análise histórica.

1. Resumo mensal.
2. Despesas por categoria.
3. Receitas por categoria.
4. Previsto versus realizado.
5. Contas vencidas.
6. Próximos vencimentos.
7. Evolução mensal.
8. Gastos por favorecido.
9. Pagamentos com juros ou multa.
10. Lançamentos sem categoria.

---

## 27. Testes

### Unitários

- cálculo de saldo;
- cálculo de status;
- recorrência;
- fim do mês;
- parcelamento;
- juros e descontos;
- normalização de moeda;
- datas;
- idempotência.

### Integração

- criação de lançamento;
- baixa parcial;
- baixa total;
- geração recorrente;
- upload;
- webhook;
- job;
- sessão.

### E2E

- login;
- cadastrar conta;
- cadastrar recorrência;
- visualizar ocorrência;
- abrir dashboard e listagem filtrados pela competência do mês corrente;
- pagar;
- anexar comprovante;
- revisar OCR;
- filtrar;
- exportar CSV.

### Casos críticos

- recorrência no dia 31 em fevereiro;
- ano bissexto;
- alteração de fuso;
- mensagem duplicada do WhatsApp;
- job executado duas vezes;
- arquivo com MIME falso;
- OCR sem valor;
- dois documentos com mesmo valor;
- pagamento superior ao saldo;
- estorno.

---

## 28. Critérios de aceite do MVP

### CA-001

O usuário consegue cadastrar uma despesa manual.

### CA-002

O usuário consegue cadastrar uma receita manual.

### CA-003

O usuário consegue criar uma recorrência mensal.

### CA-004

O sistema gera a ocorrência sem duplicação.

### CA-005

O dashboard mostra contas vencidas e próximas.

### CA-006

O usuário registra pagamento total ou parcial.

### CA-007

O usuário anexa imagem ou PDF.

### CA-008

O documento é processado fora da requisição HTTP.

### CA-009

Os dados extraídos são apresentados para revisão.

### CA-010

O sistema recebe uma imagem enviada pelo número autorizado no WhatsApp.

### CA-011

O sistema envia lembrete de uma conta próxima.

### CA-012

O sistema mantém auditoria das operações críticas.

### CA-013

O sistema gera backup restaurável.

### CA-014

O sistema impede acesso aos dados de outro usuário.

---

## 29. Roadmap

### Fase 0 — Fundação

- projeto TypeScript;
- Express;
- EJS;
- HTMX;
- SQLite;
- Drizzle;
- autenticação;
- layout;
- logs;
- testes;
- migrations.

### Fase 1 — Financeiro básico

- contas;
- categorias;
- favorecidos;
- lançamentos;
- receitas;
- despesas;
- baixa;
- dashboard.

### Fase 2 — Recorrências

- regras;
- geração;
- parcelamento;
- agenda;
- notificações internas.

### Fase 3 — Documentos

- upload;
- storage;
- OCR mock;
- OCR real;
- revisão;
- duplicidade.

### Fase 4 — WhatsApp com Evolution API

- implantação separada da Evolution API;
- criação e conexão da instância;
- QR Code ou código de pareamento;
- webhook;
- mídia;
- associação de telefone;
- notificações;
- monitoramento da conexão;
- logs de entrega;
- retentativas e idempotência.

### Fase 5 — Qualidade

- exportação;
- backup;
- auditoria;
- E2E;
- segurança;
- Docker;
- documentação.

### Fase 6 — Evoluções

- cartão de crédito;
- faturas;
- orçamento mensal;
- metas;
- Open Finance;
- conciliação;
- conta familiar.

---

## 30. Melhorias futuras recomendadas

### Cartão de crédito

Modelar futuramente:

- cartão;
- fechamento;
- vencimento;
- compras;
- parcelas;
- fatura;
- pagamento da fatura.

Evitar tratar cada compra no cartão como uma conta bancária comum sem conceito de fatura.

### Orçamento

- limite por categoria;
- limite mensal;
- alertas;
- percentual consumido.

### Regras inteligentes

Exemplo:

```text
Se favorecido contém "Neoenergia", usar categoria "Energia".
```

### Conciliação

- importar CSV/OFX;
- comparar com lançamentos;
- sugerir correspondências.

### Metas financeiras

- reserva;
- viagem;
- compra;
- amortização;
- acompanhamento.

---

## 31. Decisões assumidas neste documento

1. Aplicação inicialmente para uma pessoa.
2. Moeda principal BRL.
3. Fuso `America/Bahia`.
4. Interface em português do Brasil.
5. SQLite em disco local.
6. Deploy em uma única instância.
7. WhatsApp integrado por uma instância auto-hospedada da Evolution API.
8. OCR sempre com revisão humana.
9. Arquivos locais no desenvolvimento e storage S3 em produção.
10. TypeScript em vez de JavaScript puro.
11. Valores armazenados em centavos.
12. Exclusão lógica e auditoria.
13. Recorrência separada da ocorrência.
14. Baixas em tabela própria.
15. Jobs persistentes no banco.

---

## 32. Questões para decisão antes ou durante a implementação

Estas perguntas não impedem o início do MVP, pois os padrões sugeridos já foram definidos:

1. O sistema será apenas pessoal ou será usado também pela família?
2. Será hospedado em servidor próprio, VPS ou serviço cloud?
3. O número conectado à Evolution API será exclusivo para o sistema?
4. O sistema poderá usar um serviço externo de IA/OCR com documentos financeiros?
5. Os comprovantes devem ser mantidos indefinidamente?
6. É necessário controlar cartão de crédito já no MVP?
7. As receitas recorrentes devem ser geradas antes da data prevista?
8. Uma conta recorrente poderá ter valor variável?
9. O sistema deve repetir lembretes diariamente enquanto uma conta estiver vencida?
10. O usuário poderá confirmar pagamento diretamente pelo WhatsApp?
11. Haverá necessidade de separar despesas pessoais e familiares?
12. O saldo das contas será apenas informativo ou calculado a partir de todas as movimentações?
13. Será necessária importação de dados existentes?
14. É necessário anexar vários documentos a um lançamento?
15. Deve haver proteção adicional para documentos, como criptografia em repouso?

---

## 33. Instrução inicial para o Codex

Implementar o projeto descrito neste PRD em etapas pequenas e verificáveis.

### Diretrizes obrigatórias

1. Usar Node.js, TypeScript, Express.js 5, EJS, HTMX, SQLite e Drizzle ORM.
2. Usar arquitetura em camadas.
3. Não colocar regras de negócio em rotas ou views.
4. Validar entradas com Zod.
5. Armazenar valores monetários em centavos inteiros.
6. Usar migrations.
7. Usar chaves textuais geradas com Nano ID ou UUID.
8. Implementar autenticação segura baseada em sessão.
9. Implementar exclusão lógica.
10. Implementar auditoria de ações críticas.
11. Implementar testes unitários e de integração.
12. Não integrar imediatamente com um serviço real de OCR.
13. Criar primeiro uma interface `DocumentExtractor` e implementação mock.
14. Não integrar imediatamente com uma instância real da Evolution API.
15. Criar primeiro uma interface `WhatsAppClient`, uma implementação mock e depois `EvolutionApiWhatsAppClient`.
17. Manter todos os textos da interface em português do Brasil.
18. Criar `.env.example`.
19. Criar seeds.
20. Criar README com instalação, execução, testes, backup e deploy.
21. Executar lint, typecheck e testes após cada etapa.

### Ordem de implementação

```text
1. Fundação do projeto
2. Banco e migrations
3. Autenticação
4. Cadastros auxiliares
5. Lançamentos
6. Baixas
7. Dashboard
8. Recorrências
9. Jobs persistentes
10. Upload
11. OCR mock
12. Revisão documental
13. WhatsApp mock
14. Evolution API real
15. Backup, auditoria e hardening
```

### Primeira entrega esperada do Codex

Criar:

- estrutura do projeto;
- `package.json`;
- configuração TypeScript;
- Express;
- EJS;
- HTMX;
- CSS base;
- Drizzle;
- SQLite;
- migrations iniciais;
- autenticação;
- layout;
- página de login;
- dashboard vazio;
- testes básicos;
- `.env.example`;
- README.

Não implementar todas as funcionalidades em uma única alteração.

---

## 35. Referências técnicas

- Evolution API utilizada pelo projeto: https://evolution.idevsolutions.com.br/
- Express 5 API: https://expressjs.com/en/5x/api.html
- SQLite WAL: https://sqlite.org/wal.html
- SQLite pragmas: https://sqlite.org/pragma.html
- Evolution API — documentação oficial: https://docs.evolutionfoundation.com.br/evolution-api
- Evolution API — repositório oficial: https://github.com/evolution-foundation/evolution-api
- HTMX: https://htmx.org/docs/
- Drizzle ORM: https://orm.drizzle.team/docs/overview
- Zod: https://zod.dev/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/

---

## 35. Definição resumida do produto

> EmDia é uma aplicação web pessoal para registrar receitas e despesas, gerar contas recorrentes, acompanhar vencimentos, registrar pagamentos, armazenar comprovantes e usar WhatsApp para receber documentos e enviar lembretes, com confirmação humana dos dados extraídos automaticamente.
