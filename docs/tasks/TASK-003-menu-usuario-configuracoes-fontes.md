# TASK-003 - Menu do usuário e configuração de tamanho de fonte

## Contexto

No topo da interface, ao lado direito, o sistema exibe atualmente o nome do
usuário autenticado e o botão Sair como elementos separados.

Esse espaco deve evoluir para um menu associado ao nome do usuário. A primeira
necessidade desse menu e dar acesso a uma nova tela de Configurações, onde cada
usuário possa ajustar o tamanho das fontes da interface do sistema.

O ajuste de fonte deve ajudar usuários que trabalham em monitores menores ou que
preferem fontes menores para visualizar mais informações na tela, sem alterar a
experiência dos demais usuários.

## Objetivo

Transformar o nome do usuário autenticado, exibido no topo direito da interface,
em um menu com as opções Configurações e Sair, e criar uma tela inicial de
Configurações com controle de tamanho de fonte da interface por usuário.

## Escopo

- Substituir a exibição simples do nome do usuário no topo por um menu acionado
  pelo próprio nome do usuário.
- Incluir no menu as opções:
  - Configurações;
  - Sair.
- Preservar o comportamento atual de logout pela opção Sair.
- Criar uma nova rota/tela de Configurações.
- Criar inicialmente apenas a configuração de tamanho de fonte da interface.
- Persistir a preferência de tamanho de fonte por usuário autenticado.
- Aplicar a preferência do usuário nas telas do sistema após login.
- Manter um valor padrão seguro quando o usuário ainda não tiver configuração
  salva.
- Manter mensagens, rótulos e a interface em português.

## Fora do escopo

- Criar outras configurações de usuário além do tamanho de fonte.
- Criar página de perfil completa.
- Alterar dados cadastrais do usuário, senha, email ou permissões.
- Implementar temas, modo escuro ou customizacao de cores.
- Criar preferências globais que afetem todos os usuários.
- Refatorar a estrutura geral de navegação além do menu do usuário no topo.

## Comportamento esperado

### Menu do usuário

- O topo direito deve exibir o nome do usuário autenticado como acionador de um
  menu.
- Ao abrir o menu, devem aparecer as opções Configurações e Sair.
- A opção Configurações deve levar para a nova tela de configurações.
- A opção Sair deve executar o logout atual.
- O menu deve funcionar com mouse e teclado sempre que possível dentro dos
  padrões simples do MVP.

### Tela de Configurações

- A tela deve exibir um formulário simples para selecionar o tamanho das fontes
  da interface.
- A configuração deve ser claramente descrita para o usuário como uma
  preferência pessoal.
- O usuário deve conseguir salvar a preferência.
- Após salvar, o sistema deve confirmar a atualização com uma mensagem em
  português.
- A preferência salva deve ser aplicada nas telas seguintes do sistema.

## Opções sugeridas de tamanho

As opções exatas podem ser ajustadas durante a implementação, mas a task deve
considerar uma escala simples e segura, por exemplo:

| Valor | Rótulo sugerido | Uso esperado |
| --- | --- | --- |
| `small` | Pequena | Mais informações visíveis em telas menores |
| `medium` | Padrão | Tamanho atual ou equivalente ao padrão do sistema |
| `large` | Grande | Melhor leitura para usuários que preferem fonte maior |

Alternativamente, a implementação pode usar percentuais internos, desde que a
interface apresente rótulos claros em português e mantenha um valor padrão.

## Requisitos técnicos

- Usar CommonJS e os padrões atuais do projeto.
- Manter formulários que alteram dados usando POST.
- Persistir a preferência por usuário, sem afetar outros usuários.
- Preservar compatibilidade com bancos locais existentes.
- Caso seja necessário alterar o schema, fazer a mudanca em
  `src/database/schema.js` de forma compatível com bancos já criados.
- Evitar dependências externas para o menu ou para a aplicação da escala de
  fontes.
- Escapar dados de usuário ao renderizar HTML com `escapeHtml`.
- Manter a regra de competência mensal atual intacta nas telas operacionais.
- Evitar refatoracoes amplas em `src/server.js` e `src/services/viewEngine.js`
  quando ajustes pontuais forem suficientes.

## Pontos prováveis de implementação

- `src/server.js`: rotas de configurações e integração do menu com as rotas
  existentes.
- `src/services/viewEngine.js`: renderização do topo, menu do usuário, tela de
  configurações e aplicação de classe/atributo de escala de fonte.
- `src/models/User.js` ou novo model/service apropriado: leitura e gravacao da
  preferência por usuário.
- `src/database/schema.js`: possível coluna ou tabela de preferências de
  usuário, se a estrutura atual não comportar a configuração.
- `public/css/styles.css`: regras de escala de fonte da interface.

## Critérios de aceite

- O nome do usuário no topo abre um menu com Configurações e Sair.
- A opção Sair continua encerrando a sessão como antes.
- A opção Configurações abre a nova tela de configurações.
- A tela permite escolher e salvar o tamanho da fonte da interface.
- A preferência e salva por usuário autenticado.
- A preferência e aplicada após salvar e em acessos posteriores do mesmo
  usuário.
- Usuários sem configuração salva continuam usando o tamanho padrão.
- A mudanca não remove nem quebra a navegação mensal das telas operacionais.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- fazer login;
- abrir o menu pelo nome do usuário no topo direito;
- acessar Configurações;
- alterar o tamanho da fonte e salvar;
- navegar por dashboard, lançamentos e contas verificando se a escala foi
  aplicada;
- sair pelo menu do usuário;
- fazer novo login e confirmar que a preferência foi mantida;
- testar outro usuário, se disponível, para confirmar que a preferência e
  individual.

## Observação de implementação

Esta task registra o escopo solicitado, mas a implementação ainda não deve ser
feita neste momento.

## Implementação

- Nome do usuário no topo convertido em menu com as opções Configurações e Sair.
- Nova tela `/settings` criada para preferências individuais do usuário.
- Preferência de tamanho de fonte persistida em `users.font_scale`.
- Escalas `small`, `medium` e `large` aplicadas no `body` por classe CSS.
- Logout preservado como POST com token CSRF dentro do menu.

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
