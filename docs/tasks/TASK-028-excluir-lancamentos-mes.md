# TASK-028 - Excluir todos os lançamentos do mês

## Contexto

A tela de lançamentos trabalha por padrão com a competência do mês corrente e
permite que o usuário navegue entre competências mensais. Pode haver situações
excepcionais em que o usuário precise limpar todos os lançamentos de uma
competência, por exemplo após uma importação incorreta, seed de teste ou
cadastro em massa equivocado.

Essa ação é destrutiva, rara e crítica. Ela não deve ser destacada como fluxo
principal do produto e não pode ser disparada por engano.

## Objetivo

Adicionar uma funcionalidade discreta para excluir todos os lançamentos da
competência mensal atualmente filtrada, exigindo dupla confirmação e explicando
com clareza o impacto irreversível da ação antes da execução.

## Escopo

- Adicionar uma ação discreta na tela de lançamentos (`/entries`) para excluir
  todos os lançamentos da competência selecionada.
- Manter a ação visualmente secundária e distante das ações principais de
  cadastro, filtro e navegação mensal.
- Exigir dupla confirmação antes de executar a exclusão.
- Informar ao usuário, antes da confirmação final, que:
  - todos os lançamentos da competência selecionada serão excluídos;
  - as baixas vinculadas aos lançamentos também deixarão de existir ou ficarão
    inacessíveis conforme a regra de persistência adotada;
  - a ação não poderá ser desfeita pela interface;
  - outras competências não serão afetadas.
- Garantir que a exclusão atue somente na competência explicitamente exibida no
  filtro da tela.
- Persistir auditoria da ação, registrando usuário, competência, quantidade de
  lançamentos afetados e instante da operação.
- Proteger a rota com CSRF e método `POST`.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Criar backup automático antes da exclusão.
- Criar tela de restauração de lançamentos excluídos.
- Excluir lançamentos de múltiplas competências ao mesmo tempo.
- Excluir contas, categorias, partes ou configurações.
- Alterar o comportamento padrão de competência mensal do produto.
- Transformar a exclusão em ação de destaque no menu principal.

## Comportamento esperado

A ação deve ficar em local discreto da listagem de lançamentos, por exemplo em
uma área secundária de opções avançadas ou em um menu/expansor de ações
administrativas da competência.

Fluxo sugerido:

1. O usuário acessa `/entries` com uma competência selecionada.
2. O usuário abre uma opção discreta, como "Ações avançadas".
3. O usuário clica em "Excluir lançamentos deste mês".
4. A interface exibe uma primeira confirmação explicando que a ação é crítica e
   afeta todos os lançamentos da competência exibida.
5. A interface exige uma segunda confirmação explícita, preferencialmente com
   digitação da competência no formato `YYYY-MM` ou frase curta de confirmação.
6. Somente após a segunda confirmação correta, o formulário envia `POST` para a
   rota de exclusão.
7. Após a exclusão, a tela retorna para a listagem da mesma competência com uma
   mensagem clara contendo a quantidade de lançamentos removidos.

## Regras de negócio

- A competência deve ser obrigatória e válida no formato `YYYY-MM`.
- A competência usada na exclusão deve vir do formulário confirmado, não de
  estado implícito da sessão.
- O backend deve validar a confirmação final antes de excluir.
- A exclusão deve limitar os registros por `user_id` e `competence_month`.
- Usuários não podem excluir lançamentos de outros usuários.
- Se não houver lançamentos na competência, a ação deve retornar mensagem
  informativa e não tratar como erro crítico.
- A operação deve preservar a integridade das tabelas relacionadas.
- Se houver `settlements` vinculados aos lançamentos excluídos, a implementação
  deve seguir a regra definida no schema/model atual, evitando registros órfãos.
- A auditoria deve registrar o evento mesmo quando a quantidade excluída for
  zero, desde que a confirmação tenha sido válida.

## Experiência esperada

- A ação não aparece como botão primário.
- O texto evita linguagem ambígua como "limpar" sem explicar consequência.
- A tela mostra a competência exata que será afetada.
- A confirmação final deixa claro que a exclusão é irreversível pela interface.
- O usuário precisa executar uma ação consciente adicional, não apenas aceitar
  um `confirm()` simples do navegador.
- Em mobile, o fluxo continua legível e sem risco de toque acidental.
- Mensagens de sucesso e erro permanecem em português e seguem o padrão visual
  existente.

## Critérios de aceite

- A tela `/entries` exibe a ação de exclusão em local discreto.
- A ação informa a competência selecionada antes da confirmação final.
- A exclusão não é executada com apenas um clique.
- A exclusão não é executada quando a confirmação digitada está ausente ou
  incorreta.
- `POST` sem CSRF válido é rejeitado pelo middleware existente.
- `POST` com competência inválida retorna erro claro e não exclui registros.
- `POST` válido exclui somente lançamentos do usuário e da competência
  informada.
- Lançamentos de outras competências permanecem intactos.
- A quantidade de lançamentos removidos aparece na mensagem de retorno.
- A auditoria registra a ação com competência e quantidade afetada.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries` sem informar competência e confirmar que a tela usa o mês
  corrente;
- criar ou usar lançamentos de teste em duas competências diferentes;
- abrir a competência que deve ser excluída;
- tentar acionar a exclusão e cancelar na primeira confirmação;
- tentar confirmar sem preencher a segunda confirmação corretamente;
- confirmar corretamente e verificar que apenas a competência selecionada foi
  excluída;
- conferir que outra competência permaneceu com seus lançamentos;
- verificar mensagem de sucesso com a quantidade removida;
- repetir o fluxo em viewport mobile.

Validação HTTP automatizada sugerida em porta segura:

- usar `PORT=3100`;
- testar `GET /health`;
- testar `GET /entries`;
- testar `POST` da exclusão com CSRF inválido;
- testar `POST` da exclusão com competência inválida;
- testar `POST` da exclusão com confirmação inválida;
- testar `POST` válido em base de teste controlada.

## Observações de implementação

Preferir uma implementação pequena e localizada:

- adicionar método no model responsável por `financial_entries` para excluir por
  usuário e competência;
- garantir transação quando a exclusão envolver tabelas relacionadas;
- adicionar rota `POST` específica, por exemplo
  `/entries/month/delete` ou nome equivalente alinhado ao padrão atual;
- reaproveitar helpers de view existentes, como `csrfInput`, `buttonContent`,
  `escapeHtml` e componentes já usados na tela;
- evitar `confirm()` simples como única proteção;
- evitar texto alarmista permanente na tela principal; o alerta forte deve
  aparecer no fluxo de confirmação.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1.

## Implementação

- A tela `/entries` ganhou uma área discreta de "Ações avançadas da competência"
  para exclusão excepcional dos lançamentos do mês exibido.
- A confirmação exige duas ações explícitas: marcar ciência do impacto e digitar
  a competência exata no formato `YYYY-MM`.
- Foi adicionada validação backend para competência, ciência do impacto e texto
  de confirmação.
- Foi criada a rota `POST /entries/month/delete`, protegida por CSRF.
- `FinancialEntry.deleteMonth` marca os lançamentos da competência como
  excluídos por `deleted_at`, limitado a `user_id` e `competence_month`.
- A operação registra auditoria em `audit_logs` com competência e quantidade de
  lançamentos afetados.
- A tela retorna mensagem informativa ou de sucesso com a quantidade removida.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-13 19:51
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-13 19:56
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
