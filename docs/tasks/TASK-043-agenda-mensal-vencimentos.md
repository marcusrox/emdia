# TASK-043 - Criar agenda mensal de vencimentos

## Contexto

O dashboard e a listagem de lançamentos já trabalham por competência mensal,
mas o EmDia ainda não oferece a agenda de vencimentos prevista no PRD. Para o
uso cotidiano, o usuário precisa visualizar rapidamente em quais dias haverá
contas a pagar ou receitas a receber, sem percorrer uma tabela completa.

## Objetivo

Criar uma tela autenticada de agenda financeira mensal, orientada pela
competência selecionada, que agrupe lançamentos por vencimento e permita abrir
o respectivo detalhe.

## Comportamento esperado

- abrir na competência corrente do usuário quando `competence` estiver ausente;
- manter visíveis mês anterior, próximo mês, seletor e retorno ao mês atual;
- apresentar os dias do mês em calendário ou agenda cronológica responsiva;
- exibir receitas e despesas com texto e ícone, sem depender somente de cor;
- destacar hoje, lançamentos vencidos, pendentes e liquidados;
- permitir abrir o detalhe de cada lançamento;
- informar claramente os dias sem movimentação e o mês sem lançamentos.

## Escopo

- adicionar `GET /calendar` ou rota equivalente coerente com a navegação;
- criar consulta de lançamentos da competência para a agenda;
- criar view dedicada em `src/views/` e exportá-la pelo `viewEngine`;
- adicionar acesso à agenda na navegação principal;
- reutilizar `pageHeading`, `monthSwitcher`, helpers e ícones Lucide;
- adicionar estilos responsivos e acessíveis;
- preservar o isolamento por usuário.

## Regras funcionais

- `competence` deve usar `YYYY-MM` e passar pela normalização existente;
- a competência ausente ou inválida deve seguir o tratamento padrão das telas
  mensais, sem ampliar silenciosamente a consulta para todos os meses;
- o agrupamento usa `due_date`, não `created_at` nem data de baixa;
- cada item deve mostrar, no mínimo, descrição, tipo, valor previsto e status;
- lançamentos sem vencimento, se aceitos pelo modelo, devem aparecer em uma
  seção explícita **Sem vencimento**;
- status vencido deve respeitar `deriveStatus` e a data civil no fuso do
  usuário;
- valores devem ser formatados pelo `moneyService`;
- dados externos devem ser escapados antes da renderização;
- links para detalhes devem preservar a competência para facilitar o retorno.

## Apresentação e acessibilidade

- usar exatamente um `h1` por meio do cabeçalho padrão;
- identificar o dia atual também por texto ou atributo acessível;
- manter ordem de leitura cronológica no HTML;
- garantir navegação por teclado nos lançamentos;
- fornecer rótulos acessíveis para botões somente com ícone;
- evitar células estreitas ou conteúdo ilegível no celular;
- em viewport pequeno, permitir uma lista cronológica como adaptação do
  calendário, sem remover lançamentos;
- tabelas ou grades não devem gerar overflow horizontal desnecessário.

## Fora de escopo

- criar ou editar lançamentos diretamente no calendário;
- arrastar lançamentos entre dias;
- visualizações semanal, anual ou por vencimento global;
- sincronização com Google Calendar, Outlook ou calendário do dispositivo;
- feriados e dias úteis;
- notificações novas;
- gráficos ou relatórios históricos.

## Critérios de aceite

- acesso sem `competence` abre o mês corrente do usuário;
- troca de competência é explícita, visível e preservada na navegação;
- lançamentos aparecem no dia correto de `due_date`;
- receitas e despesas são distinguíveis sem depender apenas de cor;
- hoje, vencidos, pendentes e liquidados possuem indicação compreensível;
- clicar em um lançamento abre seu detalhe;
- usuário não visualiza lançamentos de outro usuário;
- mês vazio e lançamentos sem vencimento recebem estados vazios adequados;
- a tela funciona em desktop, celular e nas escalas de fonte disponíveis;
- dados de usuário são escapados;
- `npm run check` passa após a implementação.

## Cenários de validação

1. Abrir a agenda sem query string e confirmar a competência atual.
2. Navegar entre dezembro e janeiro, incluindo a mudança de ano.
3. Testar fevereiro em ano bissexto e meses de 30 e 31 dias.
4. Criar receita e despesa para o mesmo dia e verificar ordem e diferenciação.
5. Conferir lançamento vencido, pendente, parcialmente liquidado e liquidado.
6. Abrir o detalhe e retornar mantendo a competência selecionada.
7. Validar um mês vazio e, se aplicável, um lançamento sem vencimento.
8. Testar dois usuários e confirmar isolamento dos registros.
9. Validar teclado, viewport estreita e escalas de fonte.
10. Em servidor próprio na porta 3100 ou próxima livre, testar `GET /health`,
    `GET /dashboard`, `GET /entries` e a nova rota, sem usar a porta 3000.
11. Executar `npm run check`.

## Arquivos candidatos

- `src/server.js`;
- `src/models/FinancialEntry.js`;
- `src/views/calendarView.js`;
- `src/views/layout.js`;
- `src/services/viewEngine.js`;
- `src/services/dateService.js`;
- `public/css/styles.css`;
- `src/config/release.js`, ao concluir a implementação.

## Observações de implementação

Preferir uma consulta mensal única e agrupar os resultados antes da
renderização. Não realizar uma consulta ao banco para cada dia. A view deve
receber dados já organizados e limitar-se à apresentação.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando
o número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 23:46
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao
