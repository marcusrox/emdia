# TASK-003 - Menu do usuario e configuracao de tamanho de fonte

## Contexto

No topo da interface, ao lado direito, o sistema exibe atualmente o nome do
usuario autenticado e o botao Sair como elementos separados.

Esse espaco deve evoluir para um menu associado ao nome do usuario. A primeira
necessidade desse menu e dar acesso a uma nova tela de Configuracoes, onde cada
usuario possa ajustar o tamanho das fontes da interface do sistema.

O ajuste de fonte deve ajudar usuarios que trabalham em monitores menores ou que
preferem fontes menores para visualizar mais informacoes na tela, sem alterar a
experiencia dos demais usuarios.

## Objetivo

Transformar o nome do usuario autenticado, exibido no topo direito da interface,
em um menu com as opcoes Configuracoes e Sair, e criar uma tela inicial de
Configuracoes com controle de tamanho de fonte da interface por usuario.

## Escopo

- Substituir a exibicao simples do nome do usuario no topo por um menu acionado
  pelo proprio nome do usuario.
- Incluir no menu as opcoes:
  - Configuracoes;
  - Sair.
- Preservar o comportamento atual de logout pela opcao Sair.
- Criar uma nova rota/tela de Configuracoes.
- Criar inicialmente apenas a configuracao de tamanho de fonte da interface.
- Persistir a preferencia de tamanho de fonte por usuario autenticado.
- Aplicar a preferencia do usuario nas telas do sistema apos login.
- Manter um valor padrao seguro quando o usuario ainda nao tiver configuracao
  salva.
- Manter mensagens, rotulos e a interface em portugues.

## Fora do escopo

- Criar outras configuracoes de usuario alem do tamanho de fonte.
- Criar pagina de perfil completa.
- Alterar dados cadastrais do usuario, senha, email ou permissoes.
- Implementar temas, modo escuro ou customizacao de cores.
- Criar preferencias globais que afetem todos os usuarios.
- Refatorar a estrutura geral de navegacao alem do menu do usuario no topo.

## Comportamento esperado

### Menu do usuario

- O topo direito deve exibir o nome do usuario autenticado como acionador de um
  menu.
- Ao abrir o menu, devem aparecer as opcoes Configuracoes e Sair.
- A opcao Configuracoes deve levar para a nova tela de configuracoes.
- A opcao Sair deve executar o logout atual.
- O menu deve funcionar com mouse e teclado sempre que possivel dentro dos
  padroes simples do MVP.

### Tela de Configuracoes

- A tela deve exibir um formulario simples para selecionar o tamanho das fontes
  da interface.
- A configuracao deve ser claramente descrita para o usuario como uma
  preferencia pessoal.
- O usuario deve conseguir salvar a preferencia.
- Apos salvar, o sistema deve confirmar a atualizacao com uma mensagem em
  portugues.
- A preferencia salva deve ser aplicada nas telas seguintes do sistema.

## Opcoes sugeridas de tamanho

As opcoes exatas podem ser ajustadas durante a implementacao, mas a task deve
considerar uma escala simples e segura, por exemplo:

| Valor | Rotulo sugerido | Uso esperado |
| --- | --- | --- |
| `small` | Pequena | Mais informacoes visiveis em telas menores |
| `medium` | Padrao | Tamanho atual ou equivalente ao padrao do sistema |
| `large` | Grande | Melhor leitura para usuarios que preferem fonte maior |

Alternativamente, a implementacao pode usar percentuais internos, desde que a
interface apresente rotulos claros em portugues e mantenha um valor padrao.

## Requisitos tecnicos

- Usar CommonJS e os padroes atuais do projeto.
- Manter formularios que alteram dados usando POST.
- Persistir a preferencia por usuario, sem afetar outros usuarios.
- Preservar compatibilidade com bancos locais existentes.
- Caso seja necessario alterar o schema, fazer a mudanca em
  `src/database/schema.js` de forma compativel com bancos ja criados.
- Evitar dependencias externas para o menu ou para a aplicacao da escala de
  fontes.
- Escapar dados de usuario ao renderizar HTML com `escapeHtml`.
- Manter a regra de competencia mensal atual intacta nas telas operacionais.
- Evitar refatoracoes amplas em `src/server.js` e `src/services/viewEngine.js`
  quando ajustes pontuais forem suficientes.

## Pontos provaveis de implementacao

- `src/server.js`: rotas de configuracoes e integracao do menu com as rotas
  existentes.
- `src/services/viewEngine.js`: renderizacao do topo, menu do usuario, tela de
  configuracoes e aplicacao de classe/atributo de escala de fonte.
- `src/models/User.js` ou novo model/service apropriado: leitura e gravacao da
  preferencia por usuario.
- `src/database/schema.js`: possivel coluna ou tabela de preferencias de
  usuario, se a estrutura atual nao comportar a configuracao.
- `public/css/styles.css`: regras de escala de fonte da interface.

## Criterios de aceite

- O nome do usuario no topo abre um menu com Configuracoes e Sair.
- A opcao Sair continua encerrando a sessao como antes.
- A opcao Configuracoes abre a nova tela de configuracoes.
- A tela permite escolher e salvar o tamanho da fonte da interface.
- A preferencia e salva por usuario autenticado.
- A preferencia e aplicada apos salvar e em acessos posteriores do mesmo
  usuario.
- Usuarios sem configuracao salva continuam usando o tamanho padrao.
- A mudanca nao remove nem quebra a navegacao mensal das telas operacionais.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- fazer login;
- abrir o menu pelo nome do usuario no topo direito;
- acessar Configuracoes;
- alterar o tamanho da fonte e salvar;
- navegar por dashboard, lancamentos e contas verificando se a escala foi
  aplicada;
- sair pelo menu do usuario;
- fazer novo login e confirmar que a preferencia foi mantida;
- testar outro usuario, se disponivel, para confirmar que a preferencia e
  individual.

## Observacao de implementacao

Esta task registra o escopo solicitado, mas a implementacao ainda nao deve ser
feita neste momento.

## Implementacao

- Nome do usuario no topo convertido em menu com as opcoes Configuracoes e Sair.
- Nova tela `/settings` criada para preferencias individuais do usuario.
- Preferencia de tamanho de fonte persistida em `users.font_scale`.
- Escalas `small`, `medium` e `large` aplicadas no `body` por classe CSS.
- Logout preservado como POST com token CSRF dentro do menu.

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
