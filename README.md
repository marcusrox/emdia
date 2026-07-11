# EmDia

MVP local para controle de contas, receitas e vencimentos baseado no PRD técnico
`PRD_sistema_financas_pessoais.md`.

## Como rodar

```bash
npm start
```

A aplicação sobe em:

```text
http://localhost:3000
```

O banco SQLite local fica em `data/emdia.sqlite` e é criado automaticamente na
primeira execução, junto com dados de exemplo do mês corrente.

## Scripts

```bash
npm run seed
npm run check
npm run dev
```

## Escopo implementado

- Dashboard mensal com competência corrente como padrão.
- Navegação entre mês anterior, próximo mês e mês atual.
- Listagem de lançamentos filtrada por competência corrente por padrão.
- Cadastro e edição de lançamentos.
- Baixa de receitas/despesas em tabela própria de settlements.
- Cancelamento e duplicação de lançamentos.
- Cadastro básico de contas financeiras.
- Cadastro básico de categorias.
- Seed inicial com usuário local, contas, categorias e lançamentos do mês.

## Observações

Esta versão usa o módulo nativo `node:sqlite` do Node 22 para evitar dependências
externas no MVP. O Node pode exibir um aviso experimental ao iniciar o banco.
