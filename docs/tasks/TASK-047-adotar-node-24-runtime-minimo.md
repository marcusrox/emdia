# TASK-047 - Adotar Node.js 24 como runtime mínimo suportado

## Contexto

O EmDia foi iniciado com Node.js 22+ porque depende do módulo nativo
`node:sqlite`, introduzido nessa linha. Em julho de 2026, o ambiente local e o
projeto de produção no aaPanel já usam Node.js 24, enquanto a documentação, o
GitHub Actions e os metadados do pacote ainda declaram ou validam Node.js 22.

Essa divergência permite que o CI aprove código em uma versão diferente da
produção e obriga o script de testes a usar o nome experimental da opção de
isolamento. Além disso, Node.js 22 está em Maintenance LTS, com fim de suporte
previsto para abril de 2027, enquanto Node.js 24 permanece suportado até abril
de 2028. A partir do Node.js 24.15.0, `node:sqlite` passou ao estágio release
candidate.

## Objetivo

Definir Node.js 24.15 ou superior, dentro da linha principal 24, como único
runtime oficialmente suportado pelo EmDia e alinhar desenvolvimento, CI,
deploy, aaPanel e documentação com essa decisão.

## Versão suportada

O intervalo oficial deve ser:

```text
>=24.15.0 <25
```

O piso 24.15.0 preserva a versão em que `node:sqlite` avançou para release
candidate. O limite `<25` impede aceitar automaticamente uma linha principal
não homologada. Uma futura adoção do Node.js 26 deve ser feita por tarefa e
validação próprias.

## Escopo

- Declarar o intervalo suportado em `package.json` por meio de `engines.node`.
- Sincronizar o metadado do pacote raiz em `package-lock.json`, sem atualizar
  dependências ou reescrever o lockfile além do necessário.
- Adicionar configuração versionada do runtime para desenvolvimento local,
  preferencialmente `.nvmrc` com a linha 24.
- Avaliar e adicionar `.npmrc` com `engine-strict=true` para impedir instalação
  com uma versão não suportada do Node.js.
- Alterar o GitHub Actions para validar Node.js 24.
- Testar no CI o piso `24.15.0` e o patch mais recente disponível da linha 24,
  evitando uso acidental de API ausente no mínimo declarado.
- Manter apenas um acionamento do deploy, depois que toda a matriz de CI for
  aprovada.
- Trocar a opção de testes para o nome estável
  `--test-isolation=none`.
- Adicionar ao script versionado de deploy uma validação explícita do runtime
  antes de `git fetch`, `git merge`, `npm ci` ou restart.
- Confirmar que Node, npm e o interpretador do processo PM2 pertencem à linha
  24 e apontam para a instalação esperada no aaPanel.
- Atualizar a documentação técnica ativa que ainda declara Node.js 22+ ou
  descreve o aviso experimental dessa versão.
- Preservar CommonJS, Express, SQLite e o funcionamento atual da aplicação.
- Atualizar o controle de release ao concluir a implementação.

## Alterações propostas

### 1. Metadados e instalação

Adicionar a `package.json`:

```json
"engines": {
  "node": ">=24.15.0 <25"
}
```

Atualizar somente o metadado correspondente no pacote raiz de
`package-lock.json`. Não executar atualização de dependências nem alterar
versões resolvidas como parte desta task.

Adicionar `.nvmrc` com:

```text
24
```

Caso `.npmrc` seja adotado, usar apenas configuração de projeto necessária à
política de runtime, sem copiar configurações globais do servidor:

```text
engine-strict=true
```

### 2. Testes automatizados

Alterar o script `npm test` para usar:

```text
--test-isolation=none
```

Remover `--experimental-test-isolation=none`, pois a linha 24 suporta o nome
estável. Preservar `--test-concurrency=1` e a execução explícita das suítes para
manter o banco SQLite em memória e o estado compartilhado previsíveis.

### 3. GitHub Actions

Alterar `.github/workflows/deploy-aapanel.yml` para usar uma matriz equivalente
a:

```yaml
strategy:
  matrix:
    node-version:
      - "24.15.0"
      - "24.x"
```

Passar `matrix.node-version` para `actions/setup-node`, registrar `node
--version` nos logs e executar `npm ci`, `npm run check` e `npm test` em cada
versão. O job de deploy deve continuar dependendo do job completo de CI e ser
acionado uma única vez, somente após a aprovação das duas execuções da matriz.

Manter `permissions: contents: read`, `environment: production`, controle de
concorrência e armazenamento da URL do WebHook exclusivamente em secret.

### 4. Proteção no deploy

Atualizar `scripts/deploy-aapanel.sh` para verificar, antes de qualquer mudança
no checkout, se o `node` disponível atende a `>=24.15.0 <25`. A falha deve:

- produzir mensagem clara com a versão encontrada e a esperada;
- encerrar com código diferente de zero;
- não executar `git merge`, `npm ci`, restart ou gravação de
  `.deploy-commit`;
- permanecer visível no log do WebHook do aaPanel.

Além da versão encontrada pelo WebHook como `root`, validar operacionalmente o
runtime usado pelo processo `emdia` do usuário `www`. O script não deve assumir
que atualizar `/usr/bin/node` altera automaticamente o interpretador já
registrado no PM2.

### 5. Documentação

Atualizar as referências ativas:

- `README.md`;
- `AGENTS.md`;
- `docs/patterns.md`;
- `docs/architecture.md`.

Substituir Node.js 22+ por Node.js 24.15+ e revisar a observação sobre o estágio
de `node:sqlite`. Tasks históricas que apenas citam SQLite não precisam ser
reescritas.

Documentar os comandos de conferência do servidor sem incluir segredos:

```bash
node --version
npm --version
runuser -u www -- /usr/bin/pm2 describe emdia
curl --fail http://127.0.0.1:3100/ready
```

## Regras de implementação

- Não atualizar Express, `lucide-static`, Supertest ou outras dependências.
- Não migrar CommonJS para ESM.
- Não trocar SQLite por biblioteca externa.
- Não alterar schema, migrations, seed ou dados financeiros.
- Não ler, imprimir, versionar ou substituir `.env`.
- Não alterar o banco SQLite durante a validação do runtime sem backup prévio.
- Não usar uma versão `latest` sem limite de major como requisito de produção.
- O CI deve validar exatamente o menor runtime prometido, além do último patch
  da linha homologada.
- O deploy deve falhar fechado quando a versão do runtime não puder ser
  determinada.

## Fora de escopo

- Adotar Node.js 25 ou 26.
- Introduzir Docker ou trocar o gerenciador de processos.
- Substituir PM2 ou o gerenciamento do projeto pelo aaPanel.
- Atualizar dependências npm sem relação direta com a versão do Node.js.
- Usar recursos novos exclusivos do Node.js 24 sem necessidade funcional.
- Alterar regras financeiras, competência mensal, status, baixas ou auditoria.
- Refatorar testes, banco ou bootstrap além do necessário para a migração.

## Riscos e mitigação

### Divergência entre CI e produção

O workflow pode usar Node.js 24 enquanto o PM2 permanece associado a outro
interpretador. Mitigar conferindo o runtime efetivo no `pm2 describe emdia`,
reiniciando o projeto pelo aaPanel e validando `/ready` após a alteração.

### Mudança da versão SQLite incorporada

Node.js 24 inclui uma versão mais nova de SQLite e opções defensivas mais
recentes. Mitigar com backup verificável de `data/emdia.sqlite`, execução da
suíte completa e teste das migrations sobre uma cópia segura antes do primeiro
deploy da task.

### Restrição de ambientes antigos

Desenvolvedores e servidores com Node.js 22 deixarão de ser suportados. Mitigar
com `engines`, `.nvmrc`, documentação clara e erro antecipado no deploy.

### Atualização indevida do lockfile

Executar npm com versões diferentes pode normalizar metadados do lockfile.
Mitigar revisando o diff e rejeitando mudanças em dependências ou resoluções
que não sejam necessárias para registrar o requisito de runtime.

## Plano de implementação

1. Confirmar Node.js 24.15+ no ambiente local, no aaPanel e no processo PM2.
2. Fazer backup verificável do SQLite de produção antes da validação do novo
   runtime.
3. Adicionar `engines`, `.nvmrc` e, após avaliação, `engine-strict`.
4. Atualizar o lockfile apenas quanto ao metadado do pacote raiz.
5. Alterar `npm test` para a opção estável de isolamento.
6. Atualizar o workflow para a matriz 24.15.0 e 24.x.
7. Adicionar a proteção de versão no início do script de deploy.
8. Atualizar README, AGENTS e documentação técnica ativa.
9. Executar validações locais e no CI.
10. Publicar em produção, confirmar o interpretador PM2, health check, páginas
    principais e metadado de commit no rodapé.
11. Atualizar `src/config/release.js` com data/hora atual e próximo número
    sequencial.

## Cenários de validação

1. Executar `npm ci` com Node.js 24.15.0 e confirmar sucesso.
2. Executar `npm run check` e `npm test` no Node.js 24.15.0.
3. Repetir as validações no patch mais recente da linha 24.
4. Confirmar que instalação ou deploy com Node.js 22 falha com mensagem clara.
5. Confirmar que o guard do deploy falha antes de alterar o checkout.
6. Confirmar que a matriz do CI aciona o WebHook somente uma vez.
7. Confirmar `node --version` no terminal do aaPanel.
8. Confirmar no PM2 que `emdia` usa Node.js 24.
9. Executar `GET /health`, `GET /ready`, `GET /dashboard` e `GET /entries`.
10. Reiniciar o projeto e confirmar migrations, autenticação e acesso ao banco
    existente sem perda de dados.
11. Confirmar que release e commit publicado continuam visíveis no rodapé.
12. Revisar `git diff` e garantir ausência de atualização de dependências,
    banco, `.env`, logs ou artefatos locais.

## Critérios de aceite

- `package.json` declara `>=24.15.0 <25` como runtime suportado.
- O lockfile registra o mesmo requisito sem alteração de dependências.
- `.nvmrc` orienta o uso da linha 24.
- Instalações npm rejeitam versões fora da linha homologada quando
  `engine-strict` estiver ativo.
- `npm test` usa `--test-isolation=none` e todas as suítes passam.
- O GitHub Actions testa Node.js 24.15.0 e o último patch 24.x.
- O deploy é acionado uma única vez após toda a matriz passar.
- O script de deploy rejeita runtime incompatível antes de modificar o
  checkout.
- O processo `emdia` no PM2 usa efetivamente Node.js 24.15 ou superior.
- README, AGENTS, patterns e architecture não declaram Node.js 22+.
- Health check e páginas operacionais funcionam após restart.
- Banco, migrations, seed, regras financeiras e dados existentes permanecem
  íntegros.
- `npm run check` e `npm test` passam.
- `src/config/release.js` recebe o próximo número e a data/hora da conclusão.

## Arquivos candidatos

- `package.json`;
- `package-lock.json`;
- `.nvmrc`;
- `.npmrc`, se adotado;
- `.github/workflows/deploy-aapanel.yml`;
- `scripts/deploy-aapanel.sh`;
- `README.md`;
- `AGENTS.md`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Referências técnicas

- Calendário oficial de releases:
  `https://github.com/nodejs/Release#release-schedule`.
- Migração Node.js 22 para 24:
  `https://nodejs.org/en/blog/migrations/v22-to-v24`.
- Documentação de `node:sqlite` no Node.js 24:
  `https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html`.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando
o número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 19/07/2026 20:15
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Resultado da implementação

- Status: implementação concluída no repositório.
- Runtime suportado definido como `>=24.15.0 <25` em package e lockfile.
- `.nvmrc` e enforcement do npm adicionados.
- Test runner migrado para a opção estável de isolamento.
- CI configurado para validar Node.js 24.15.0 e o último patch 24.x antes de um
  único deploy.
- Deploy protegido por validação antecipada do Node.js do WebHook e do
  executável real do processo PM2.
- Documentação técnica ativa alinhada ao Node.js 24.
- Release atualizada para `Release 19/07/2026 20:19 - 067`.
- `npm ci`, `npm run check`, `npm test`, `bash -n` e `git diff --check`
  aprovados localmente no Node.js 24.18.0.
- A execução real da matriz do GitHub Actions e a validação do deploy no
  aaPanel dependem de commit, push e acionamento do pipeline.

---

## Assinatura da LLM

- Data: 19/07/2026 20:21
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
