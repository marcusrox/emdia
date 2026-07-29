# TASK-050 - Implementar backup e restauração verificável do SQLite

## Contexto

O banco SQLite local concentra os dados financeiros do EmDia. Migrations são
executadas automaticamente, mas ainda não existe um fluxo operacional
padronizado para criar, verificar e restaurar backups.

Copiar somente o arquivo principal enquanto o banco usa WAL pode produzir um
backup inconsistente. Um fluxo de restauração também precisa impedir
sobrescrita acidental do banco ativo e oferecer evidência de integridade.

## Objetivo

Disponibilizar comandos seguros e documentados para criar, verificar, listar e
restaurar backups consistentes do banco local.

**Status:** planejada.

## Decisão técnica

Usar um mecanismo suportado pelo SQLite que gere uma imagem consistente do
banco, mesmo com WAL habilitado, como a API de backup homologada no runtime ou
`VACUUM INTO`.

Não implementar o backup como simples cópia de `emdia.sqlite`, salvo quando o
banco estiver comprovadamente fechado e os arquivos auxiliares forem tratados
corretamente.

Centralizar a lógica em um serviço reutilizável por scripts operacionais.

## Estrutura proposta

```text
src/services/databaseBackupService.js
scripts/backup.js
scripts/verify-backup.js
scripts/restore-backup.js
backups/
```

O diretório definitivo pode ser configurável, mas deve ficar fora de `data/` e
ser ignorado pelo Git.

Comandos esperados:

```text
npm run backup
npm run backup:verify -- caminho-do-backup
npm run backup:list
npm run restore -- caminho-do-backup --confirm
```

Os nomes podem ser ajustados mantendo responsabilidades equivalentes.

## Criação do backup

- criar nome previsível com data e hora em UTC ou com fuso explicitamente
  documentado;
- nunca sobrescrever arquivo existente;
- criar o diretório de destino quando necessário;
- registrar tamanho, data, origem sanitizada e resultado;
- executar verificação de integridade após a criação;
- remover backup incompleto quando a criação falhar;
- não imprimir credenciais ou conteúdo financeiro;
- retornar código de saída diferente de zero em qualquer falha.

Opcionalmente, gerar um manifesto ao lado do backup contendo metadados técnicos
e checksum. O manifesto não deve conter dados financeiros.

## Verificação

A verificação deve abrir o backup isoladamente, em modo seguro, e executar no
mínimo:

```text
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

Também deve confirmar:

- presença da tabela de migrations;
- leitura da versão de schema aplicada;
- ausência de alteração no banco original;
- fechamento correto da conexão temporária.

Um arquivo existir ou possuir tamanho maior que zero não é verificação
suficiente.

## Restauração

A restauração é uma operação destrutiva e deve exigir confirmação explícita.

Fluxo esperado:

1. validar caminho e integridade do backup;
2. confirmar que o destino é exatamente o banco configurado do EmDia;
3. impedir restauração com a aplicação usando o banco;
4. criar backup de segurança do banco atual;
5. restaurar para arquivo temporário no mesmo volume;
6. substituir o destino de maneira controlada;
7. abrir o banco restaurado e repetir as verificações;
8. informar claramente como recuperar o backup anterior se houver falha.

Não aceitar diretórios amplos, globs ou caminhos não resolvidos como alvo.

## Retenção

Implementar retenção apenas com configuração explícita e padrão conservador.

- nunca apagar o único backup válido;
- listar exatamente os arquivos candidatos antes da remoção;
- limitar operações ao diretório configurado;
- preferir manter uma combinação de backups recentes e históricos;
- documentar que backup local no mesmo disco não substitui cópia externa.

Se a retenção segura ampliar demais a task, entregar criação, verificação e
restauração primeiro e manter exclusão automática desabilitada.

## Integração com migrations e deploy

Preparar o serviço para ser chamado antes da aplicação de novas migrations,
mas não tornar todo startup dependente de backup sem avaliar disponibilidade e
permissões do ambiente.

No deploy, falha ao criar ou verificar o backup pré-migration deve interromper
a evolução do schema. Essa integração deve ser documentada e testada antes de
ser habilitada em produção.

## Segurança

- não versionar backups;
- não expor caminhos completos na interface web;
- respeitar permissões do diretório;
- não disponibilizar download por rota HTTP nesta task;
- validar extensão, assinatura SQLite e integridade antes da restauração;
- impedir path traversal;
- não incluir `.env`, logs, uploads ou outros arquivos no backup do banco.

## Escopo

- serviço de backup consistente;
- script de criação;
- script de listagem;
- verificação real de integridade;
- restauração com confirmação e backup de segurança;
- configuração segura de diretório;
- regras de Git ignore;
- testes automatizados em bancos temporários;
- documentação de operação e recuperação;
- atualizar arquitetura e padrões quando necessário;
- atualizar o controle de release ao concluir a implementação.

## Fora de escopo

- armazenamento em nuvem;
- criptografia gerenciada de backups;
- interface web de backup;
- replicação contínua;
- recuperação de arquivos corrompidos;
- backup de anexos futuros;
- agendamento pelo sistema operacional;
- apagar automaticamente backups sem política aprovada.

## Critérios de aceite

- backup representa estado consistente de banco em WAL;
- banco original não é modificado pela verificação;
- cada backup recebe nome único;
- backup incompleto não permanece como se fosse válido;
- `integrity_check` e `foreign_key_check` são executados;
- restauração rejeita backup inválido;
- restauração exige confirmação explícita;
- banco atual recebe backup de segurança antes da substituição;
- aplicação ativa impede restauração insegura;
- caminhos permanecem limitados aos alvos configurados;
- diretório de backups não é versionado;
- documentação permite executar um exercício completo de recuperação;
- testes usam banco temporário, nunca `data/emdia.sqlite`;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Criar backup de banco vazio migrado.
2. Criar backup contendo usuários, lançamentos, baixas e auditoria.
3. Validar banco com WAL ativo.
4. Corromper uma cópia e confirmar rejeição.
5. Tentar sobrescrever backup existente.
6. Restaurar em ambiente temporário e comparar registros essenciais.
7. Simular falha durante restauração e recuperar o banco anterior.
8. Tentar path traversal e destino fora do escopo.
9. Confirmar que nenhum teste toca o banco real.
10. Executar `npm run check` e `npm test`.

## Arquivos candidatos

- `src/services/databaseBackupService.js`;
- `src/database/connection.js`;
- `src/database/migrator.js`;
- `scripts/backup.js`;
- `scripts/verify-backup.js`;
- `scripts/restore-backup.js`;
- `package.json`;
- `.gitignore`;
- `.env.example`;
- `test/integration/databaseBackup.test.js`;
- `README.md`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Dependências

Pode ser implementada independentemente das demais tasks. Deve ser concluída
antes de automatizar backups pré-migration em produção.

---

## Assinatura da LLM

- Data: 28/07/2026 21:04
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao
