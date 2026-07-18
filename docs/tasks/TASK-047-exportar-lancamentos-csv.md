# TASK-047 - Exportar lançamentos e baixas em CSV

## Contexto

O PRD prevê exportação CSV, mas o EmDia ainda não permite retirar os dados da
aplicação para análise, conferência ou arquivamento. A listagem já trabalha com
competência mensal e filtros; a exportação deve respeitar esse mesmo contexto
para que o arquivo corresponda ao que o usuário decidiu consultar.

## Objetivo

Permitir a exportação autenticada de lançamentos financeiros em CSV, incluindo
informações consolidadas das baixas, respeitando a competência e os filtros
informados, com formato legível por planilhas e proteção contra CSV injection.

## Escopo

- adicionar endpoint GET autenticado para exportação;
- disponibilizar ação **Exportar CSV** na listagem de lançamentos;
- preservar competência e filtros ativos no link de exportação;
- gerar o arquivo por usuário, sem acessar dados de terceiros;
- incluir campos relevantes do lançamento e totais realizados;
- representar baixas sem perder a relação com o lançamento;
- definir codificação, separador, cabeçalho e nome de arquivo previsíveis;
- registrar a exportação na auditoria sem armazenar o conteúdo completo.

## Formato proposto

Para evitar duplicação ambígua, a primeira implementação deve gerar um arquivo
de lançamentos com dados consolidados e uma coluna de quantidade de baixas. Se
for necessário preservar o detalhamento de cada baixa, o endpoint pode fornecer
um segundo CSV específico ou um pacote claramente documentado.

Colunas mínimas do CSV de lançamentos:

- identificador;
- tipo;
- descrição;
- competência;
- vencimento;
- status;
- valor previsto;
- valor realizado;
- saldo em aberto;
- categoria;
- favorecido ou pagador;
- conta do lançamento;
- origem;
- recorrência de origem;
- parcela e total de parcelas, quando existentes;
- quantidade de baixas vigentes;
- observações;
- criação e última atualização.

Se houver CSV de baixas, incluir:

- identificador da baixa;
- identificador do lançamento;
- data da baixa;
- conta utilizada;
- principal, juros, multa, desconto, acréscimos e total;
- observação;
- estado de estorno, quando a TASK-044 estiver implementada.

## Regras funcionais

- sem `competence`, exportar somente a competência corrente do usuário;
- nunca interpretar ausência de filtro como exportação de todo o histórico;
- filtros devem usar a mesma normalização e semântica da listagem;
- valores persistidos em centavos devem ser exportados em formato monetário
  documentado e consistente com a localidade escolhida;
- datas civis devem usar `YYYY-MM-DD` e instantes técnicos devem permanecer ISO;
- valores nulos devem resultar em campo vazio, não em `undefined` ou `null`;
- cabeçalhos e valores de domínio exibidos ao usuário devem estar em português;
- o nome deve incluir a competência, por exemplo
  `emdia-lancamentos-2026-07.csv`;
- o response deve usar `Content-Disposition: attachment` e tipo de conteúdo
  adequado;
- a geração não deve criar arquivo permanente no workspace.

## Segurança do CSV

- escapar corretamente separador, aspas e quebras de linha conforme CSV;
- impedir que campos textuais controlados pelo usuário sejam interpretados
  como fórmulas por Excel ou aplicações semelhantes;
- neutralizar valores cujo primeiro caractere significativo seja `=`, `+`,
  `-`, `@`, tabulação ou retorno de carro;
- não exportar senha, hash, sessão, tokens, credenciais de WhatsApp ou payloads
  internos de auditoria;
- aplicar todas as consultas com placeholders e `user_id`;
- não aceitar caminho ou nome de arquivo fornecido pelo usuário.

## Interface e acessibilidade

- posicionar a ação junto aos filtros ou ações da página, sem competir com
  **Novo lançamento**;
- usar ícone Lucide e texto ou rótulo acessível;
- deixar explícita a competência exportada;
- preservar a ação em viewport pequeno sem causar overflow;
- informar erro em português caso a exportação não possa ser gerada.

## Auditoria

Registrar usuário, instante, competência, filtros normalizados e quantidade de
registros exportados. Não registrar o conteúdo integral do CSV nem observações
financeiras em log operacional.

## Fora de escopo

- importação CSV;
- exportação XLSX, PDF ou OFX;
- envio do arquivo por e-mail ou WhatsApp;
- exportação de anexos;
- agendamento de exportações;
- exportação irrestrita de todos os usuários por administrador;
- relatórios contábeis ou fiscais;
- streaming avançado para milhões de registros.

## Critérios de aceite

- ação na listagem exporta a competência e os filtros atualmente selecionados;
- acesso sem competência exporta apenas o mês corrente do usuário;
- arquivo possui nome, cabeçalho, codificação e separador previsíveis;
- valores, datas, campos vazios, aspas e quebras de linha são válidos;
- texto iniciado por caracteres de fórmula é neutralizado;
- nenhum registro de outro usuário é incluído;
- lançamentos sem categoria, conta, parte ou baixa são exportados corretamente;
- baixas parciais e totais produzem consolidação coerente;
- exportação fica registrada na auditoria sem conteúdo sensível;
- nenhuma cópia permanente do arquivo é deixada no servidor;
- arquivo abre corretamente em Excel e em um leitor CSV independente;
- `npm run check` e os testes aplicáveis passam após a implementação.

## Cenários de validação

1. Exportar o mês atual sem filtros adicionais.
2. Exportar outro mês e confirmar nome e conteúdo do arquivo.
3. Aplicar filtros por tipo, status, categoria e texto e comparar com a lista.
4. Exportar lançamentos sem baixa, com baixa parcial e com várias baixas.
5. Usar descrição com vírgula, ponto e vírgula, aspas e quebra de linha.
6. Usar descrição iniciada por `=`, `+`, `-` e `@` e confirmar neutralização.
7. Testar acentos em português no Excel e em outro leitor CSV.
8. Testar dois usuários e confirmar isolamento.
9. Verificar headers HTTP e ausência de arquivo persistente no servidor.
10. Conferir o evento de auditoria e a ausência de conteúdo integral do CSV.
11. Em servidor próprio na porta 3100 ou próxima livre, validar o download sem
    usar a porta 3000.
12. Executar `npm run check` e os testes aplicáveis.

## Arquivos candidatos

- `src/server.js`;
- `src/models/FinancialEntry.js`;
- `src/models/Settlement.js`;
- `src/models/AuditLog.js`;
- `src/services/csvService.js`;
- `src/views/entriesView.js`;
- `src/services/viewHelpers.js`, somente se necessário;
- testes do serviço e da consulta;
- `src/config/release.js`, ao concluir a implementação.

## Observações de implementação

Centralizar serialização e neutralização de células em um service pequeno e
testável. A rota deve normalizar filtros, obter apenas dados autorizados e
entregar o resultado; não deve montar CSV por concatenação dispersa no handler.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando
o número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 23:46
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao
