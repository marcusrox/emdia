# TASK-036 - Criar página de ambiente de execução

## Contexto

O EmDia já possui páginas internas de configurações, auditoria e logs
operacionais, mas ainda não oferece uma visão consolidada do ambiente em que a
aplicação está sendo executada. Em atividades de suporte, diagnóstico e
validação de uma instalação local, hoje é necessário consultar o terminal ou
inspecionar arquivos separadamente para descobrir versões, plataforma,
dependências e configurações ativas.

Esta task propõe uma página interna, somente leitura, que reúna informações
técnicas úteis do processo atual sem expor senhas, tokens, conteúdo do `.env`,
caminhos sensíveis ou outros segredos.

## Objetivo

Criar a página **Ambiente de execução** para apresentar, de forma organizada e
segura:

- identificação e release atual do EmDia;
- sistema operacional e arquitetura;
- runtime Node.js e processo;
- módulos declarados, instalados/resolvidos e carregados;
- estado seguro das variáveis de ambiente relevantes;
- configurações técnicas úteis para diagnóstico.

Adicionar o item **Ambiente de execução** ao menu do usuário imediatamente
abaixo de **Logs operacionais**, tanto no menu desktop quanto no mobile.

## Decisões de produto

- A página é uma ferramenta de diagnóstico técnico, não uma tela de edição.
- A rota deve ser autenticada e seguir a mesma proteção das páginas de
  auditoria e logs operacionais.
- Nenhuma ação da página deve alterar `process.env`, dependências, arquivos,
  banco de dados ou estado da aplicação.
- As informações devem refletir o processo que atende à requisição.
- Dados potencialmente sensíveis devem ser omitidos ou mascarados no servidor,
  antes da renderização.
- A página não deve ler nem exibir o conteúdo bruto do arquivo `.env`.
- A implementação deve usar apenas recursos nativos do Node.js e estruturas já
  existentes no projeto, sem novas dependências.

## Rota e navegação

Criar uma rota GET protegida:

```text
GET /runtime-environment
```

Requisitos de navegação:

- adicionar **Ambiente de execução** abaixo de **Logs operacionais** em
  `src/views/layout.js`;
- manter a mesma ordem nos menus desktop e mobile;
- usar `/runtime-environment` como estado ativo da página;
- não adicionar a página à navegação financeira principal;
- manter **Sair** como último item do menu do usuário.

## Organização visual

A página deve usar `layout.js`, `pageHeading` e os helpers de
`src/services/viewHelpers.js`. Sugestão de cabeçalho:

- eyebrow: `Diagnóstico técnico`;
- título: `Ambiente de execução`;
- descrição: `Informações do processo atual para suporte e diagnóstico.`

Separar o conteúdo em seções ou painéis responsivos:

1. **Aplicação**;
2. **Sistema operacional**;
3. **Node.js e processo**;
4. **Módulos instalados**;
5. **Módulos carregados**;
6. **Variáveis de ambiente**;
7. **Configurações úteis**.

Usar tabelas para listas de módulos e variáveis. Em telas estreitas, preservar
legibilidade e impedir overflow horizontal da página. Não usar apenas cor para
indicar estados como configurada, ausente ou mascarada.

## Apresentação visual das informações

A página deve ter uma apresentação agradável, organizada e coerente com a
identidade visual do EmDia. Não deve parecer um dump técnico bruto nem uma
sequência extensa de pares de chave e valor sem hierarquia.

Diretrizes visuais:

- destacar as informações mais importantes em cards compactos de resumo, como
  release do EmDia, versão do Node.js, sistema operacional, arquitetura e tempo
  de atividade;
- organizar informações relacionadas em painéis bem delimitados, com título,
  descrição curta e espaçamento consistente;
- usar ícones do `lucide-static` por meio do helper `lucideIcon` para facilitar
  a identificação de aplicação, servidor, sistema operacional, memória,
  módulos, variáveis e configurações;
- não inserir SVG avulso nem adicionar outra biblioteca de ícones;
- usar tabelas compactas, com cabeçalhos claros, alinhamento consistente,
  densidade visual adequada e linhas fáceis de percorrer;
- respeitar a preferência de densidade de listagem já existente no layout;
- aplicar cores diferentes e discretas para distinguir categorias e estados,
  como resolvido, ausente, configurado, mascarado e indisponível;
- limitar a paleta aos tokens e cores existentes sempre que possível, evitando
  excesso de cores, gradientes decorativos ou aparência de dashboard externo
  ao restante do sistema;
- combinar cor com texto e, quando útil, ícone, para que o significado não
  dependa somente da percepção de cor;
- usar badges compactas para estados, com contraste suficiente e rótulos em
  português;
- alternância sutil de linhas, separadores ou realce no hover pode ser usada
  para melhorar a leitura das tabelas, sem prejudicar a sobriedade;
- valores técnicos como versões e nomes de módulos podem usar fonte
  monoespaçada de forma pontual, sem transformar toda a página em console;
- manter bom equilíbrio entre quantidade de informação e espaço em branco;
- evitar painéis excessivamente altos, cards redundantes e repetição do mesmo
  dado em múltiplas seções;
- manter o layout agradável e legível tanto no desktop quanto no mobile.

A implementação pode criar classes específicas em `public/css/styles.css`,
desde que reutilize os padrões existentes de cards, badges, tabelas,
`page-heading`, espaçamentos, bordas e responsividade. Não redesenhar o layout
global para acomodar esta página.

## Informações da aplicação

Exibir, no mínimo:

- nome do pacote;
- versão presente em `package.json`;
- `RELEASE_LABEL` de `src/config/release.js`;
- ambiente lógico, se configurado, com valor limitado a opções não sensíveis;
- instante em que os dados da página foram coletados.

Não inferir uma versão diferente da registrada no projeto e não duplicar a
constante de release.

## Sistema operacional

Usar `node:os` e propriedades seguras do processo para apresentar:

- plataforma;
- tipo e release do sistema operacional;
- arquitetura;
- nome público/seguro do host, mascarado ou omitido se puder identificar a
  máquina;
- quantidade de CPUs disponíveis ao processo;
- memória total e livre, com unidade legível.

Não executar comandos de shell para obter essas informações. Não exibir nome de
usuário do sistema, diretório pessoal, interfaces de rede, endereços IP, MAC ou
identificadores exclusivos da máquina.

## Node.js e processo

Exibir informações úteis e não secretas, como:

- `process.version`;
- versões relevantes de `process.versions`;
- arquitetura e plataforma do processo;
- PID;
- tempo de atividade do processo;
- uso de memória resumido e formatado;
- argumentos de execução apenas quando sanitizados.

Não exibir argumentos completos se contiverem valores, caminhos absolutos,
tokens ou opções potencialmente sensíveis. Não exibir `process.execPath`,
diretório pessoal ou caminho absoluto do workspace.

## Módulos instalados

Nesta página, considerar como módulos instalados as dependências declaradas em
`dependencies` e, se existirem, `optionalDependencies` de `package.json`.

Para cada módulo, apresentar:

- nome;
- faixa de versão declarada;
- versão efetivamente resolvida quando puder ser obtida com segurança;
- estado: `Resolvido`, `Não resolvido` ou `Opcional ausente`.

Regras:

- não varrer recursivamente `node_modules`;
- não listar dependências transitivas como se fossem dependências diretas;
- não alterar ou instalar pacotes para completar a lista;
- não expor caminhos físicos dos pacotes;
- tratar falha ao resolver um pacote sem derrubar a página.

## Módulos carregados

Apresentar um retrato dos módulos presentes no cache CommonJS no momento da
requisição, distinguindo pelo menos:

- módulos internos do EmDia;
- pacotes externos carregados.

Normalizar e deduplicar a lista. Para módulos internos, mostrar um identificador
relativo seguro, como `src/services/dateService.js`. Para pacotes externos,
mostrar somente o nome do pacote, incluindo o escopo quando aplicável. Nunca
renderizar chaves brutas de `require.cache`, caminhos absolutos, diretórios do
usuário ou a árvore completa de `node_modules`.

Registrar na interface que a lista representa apenas os módulos carregados
naquele processo até o instante da coleta, e não todos os módulos instalados.

## Variáveis de ambiente

Esta seção deve adotar uma lista permitida de chaves conhecidas pelo EmDia, em
vez de renderizar livremente todo o conteúdo de `process.env`.

Para cada chave permitida, exibir apenas:

- nome da variável;
- estado `Configurada` ou `Não configurada`;
- origem conhecida, quando for possível distinguir sem ler ou revelar o valor;
- valor somente para chaves explicitamente classificadas como públicas e
  seguras.

Chaves relacionadas a senha, token, segredo, chave, cookie, sessão,
autorização, credencial, webhook ou conexão devem ter o valor sempre omitido e
o estado apresentado como **Mascarado**, mesmo que sejam acrescentadas à lista
permitida no futuro.

Requisitos obrigatórios:

- não listar variáveis desconhecidas herdadas do sistema operacional;
- não abrir, analisar ou devolver o arquivo `.env` na rota;
- não enviar valores sensíveis ao HTML, comentários, atributos `data-*`, logs
  ou respostas auxiliares;
- aplicar a proteção no serviço de coleta, e não depender apenas de
  `escapeHtml` ou CSS;
- escapar todos os nomes, rótulos e valores públicos antes da renderização.

## Configurações úteis

Exibir apenas configurações diagnósticas previamente classificadas como
seguras. Exemplos:

- porta lógica configurada, sem expor endereço de rede;
- fuso horário padrão da aplicação;
- locale usado na interface;
- modo de persistência (`SQLite local`), sem caminho absoluto do arquivo;
- provedor de notificação selecionado, sem URL, token ou credenciais;
- status de recursos opcionais como `Configurado`, `Desabilitado` ou
  `Incompleto`;
- diretório de logs apenas como caminho relativo conhecido (`log/`);
- política de competência padrão (`mês corrente do usuário`).

Não realizar testes de rede, conexão com provedores, escrita em disco ou
consultas mutáveis para preencher esta seção.

## Serviço de coleta

Criar um service dedicado, por exemplo:

```text
src/services/runtimeEnvironmentService.js
```

Responsabilidades:

- coletar e normalizar os dados técnicos;
- aplicar allowlist e mascaramento antes de devolver os dados;
- converter bytes, duração e instantes para estruturas previsíveis;
- resolver versões de dependências com tratamento de erro;
- transformar caminhos de módulos em identificadores relativos seguros;
- devolver objetos simples, sem HTML e sem referências mutáveis ao processo.

A view deve somente organizar e escapar os dados recebidos. Regras de
sanitização não devem ficar espalhadas em `src/server.js` ou depender da view.

## Arquivos prováveis

- `src/services/runtimeEnvironmentService.js`: coleta e sanitização;
- `src/views/runtimeEnvironmentView.js`: renderização da página;
- `src/services/viewEngine.js`: export da nova view;
- `src/views/layout.js`: item nos menus desktop e mobile;
- `src/server.js`: rota GET protegida;
- `public/css/styles.css`: layout responsivo específico, se necessário;
- `package.json`: incluir novos arquivos no script `npm run check`, sem alterar
  dependências;
- `docs/patterns.md`: documentar a regra de diagnóstico seguro, se ela se
  tornar padrão reutilizável;
- `src/config/release.js`: atualizar somente ao concluir a implementação.

## Segurança e privacidade

- A rota nunca pode ser pública.
- Não retornar os dados da página em endpoint JSON adicional nesta task.
- Não incluir botão de copiar tudo, exportar ou baixar diagnóstico.
- Não exibir conteúdo de `.env`, `process.env` completo ou dump de objetos do
  processo.
- Não exibir senhas, hashes, tokens, cookies, CSRF, headers, URLs com
  credenciais ou dados bancários.
- Não exibir caminhos absolutos, nome do usuário do sistema, IP, MAC ou
  conteúdo de arquivos locais.
- Não registrar os dados coletados no log operacional.
- Dados dinâmicos devem ser escapados com `escapeHtml`.
- Erros de coleta devem produzir estado indisponível e mensagem curta em
  português, sem stack trace ou caminho interno na interface.

## Acessibilidade e responsividade

- Manter exatamente um `h1` visível por página.
- Usar títulos semânticos para identificar cada seção.
- Tabelas devem possuir cabeçalhos de coluna claros.
- Estados devem ser comunicados por texto, não apenas por cor ou ícone.
- Conteúdo longo deve quebrar ou ficar contido em `table-wrap`.
- A página deve permanecer utilizável em desktop e mobile.
- Se forem usados ícones, utilizar `lucideIcon` e nomes acessíveis conforme os
  helpers existentes.
- Ícones decorativos devem usar `aria-hidden="true"`; ícones que comunicam uma
  ação ou estado devem possuir rótulo acessível equivalente.
- Cores de badges e estados devem manter contraste legível e sempre ser
  acompanhadas de texto.

## Fora do escopo

- Editar variáveis de ambiente ou configurações pela interface.
- Instalar, atualizar ou remover módulos.
- Exibir dependências transitivas completas.
- Executar comandos de sistema ou scripts de diagnóstico.
- Testar conectividade externa ou saúde de provedores.
- Expor métricas continuamente ou atualizar a página em tempo real.
- Criar endpoint público, API JSON, download ou relatório de diagnóstico.
- Criar controle de acesso por função caso o projeto ainda não possua papéis.
- Alterar banco de dados, models financeiros ou regra de competência.
- Adicionar dependências.
- Implementar esta task neste momento.

## Critérios de aceite

- Existe uma rota GET autenticada em `/runtime-environment`.
- O item **Ambiente de execução** aparece imediatamente abaixo de **Logs
  operacionais** nos menus desktop e mobile.
- O item ativo é identificado corretamente ao abrir a página.
- A página segue `layout.js`, `pageHeading` e o padrão visual do EmDia.
- A apresentação possui hierarquia visual clara, cards compactos de resumo,
  painéis organizados, ícones Lucide e tabelas compactas.
- Categorias e estados usam cores discretas e consistentes, sem excesso e sem
  depender exclusivamente de cor para transmitir significado.
- A preferência de densidade das listagens continua sendo respeitada nas
  tabelas da página.
- Aplicação, sistema operacional, Node.js, processo, módulos, variáveis e
  configurações aparecem em seções identificáveis.
- A release exibida vem de `src/config/release.js`.
- Dependências diretas mostram versão declarada e versão resolvida, quando
  disponível, sem varrer `node_modules`.
- Módulos carregados são deduplicados e não expõem caminhos absolutos.
- A interface explica a diferença entre módulo instalado e módulo carregado.
- Variáveis são limitadas à allowlist e valores sensíveis nunca chegam ao HTML.
- Nenhum conteúdo do `.env` é lido ou exibido pela página.
- Nome de usuário do sistema, diretório pessoal, IP, MAC e caminhos absolutos
  não são expostos.
- Falha parcial de coleta não derruba a página nem revela stack trace.
- A página é somente leitura e não causa efeitos colaterais.
- Não há overflow horizontal em desktop ou mobile.
- Mensagens e rótulos permanecem em português.
- `npm run check` e `git diff --check` passam após a implementação.

## Validação sugerida

Validação sintática:

```powershell
npm run check
git diff --check
```

Validação automatizada ou por script controlado:

- confirmar que a coleta retorna objetos simples;
- configurar variáveis fictícias contendo `PASSWORD`, `TOKEN`, `SECRET`,
  `KEY`, `COOKIE` e `AUTH` e verificar que nenhum valor aparece no resultado;
- criar uma variável desconhecida fictícia e confirmar que seu nome e valor
  não aparecem;
- confirmar que módulos carregados não contêm raiz do workspace, diretório do
  usuário ou `node_modules` em seus rótulos;
- simular falha ao resolver dependência e confirmar estado seguro;
- renderizar a view com caracteres HTML e confirmar escape.

Validação HTTP própria, com `PORT=3100` ou a próxima porta livre:

- `GET /health` continua respondendo;
- `GET /runtime-environment` sem sessão segue o fluxo de autenticação;
- `GET /runtime-environment` autenticado responde `200`;
- o HTML possui exatamente um `h1` e uma `page-heading`;
- o HTML não contém valores secretos fictícios, caminhos absolutos ou dump de
  `process.env`;
- `GET /dashboard`, `GET /entries` e `GET /operational-logs` continuam
  funcionando;
- nunca iniciar, reutilizar ou encerrar processo na porta 3000;
- encerrar somente o processo de validação iniciado pelo agente.

Validação visual:

- conferir a página em desktop e mobile;
- verificar ordem e destaque do novo item nos dois menus;
- conferir hierarquia, espaçamentos, alinhamento, ícones, badges e uso moderado
  de cores;
- validar contraste e entendimento dos estados também sem considerar as cores;
- testar as tabelas nas densidades confortável e compacta disponíveis no
  EmDia;
- testar listas curtas e longas de módulos;
- confirmar legibilidade das tabelas e ausência de overflow da página;
- confirmar que estados mascarados e indisponíveis são compreensíveis sem
  depender de cor.

## Observações de implementação

Evitar usar `npm list`, comandos PowerShell ou varredura de diretórios durante
a requisição. As informações necessárias podem ser obtidas com `node:os`,
`process`, `package.json`, resolução controlada de pacotes e `require.cache`.

O sanitizador deve trabalhar com negação segura: qualquer dado não
explicitamente classificado como público deve ser omitido. Se uma informação
for útil, mas houver dúvida sobre sua sensibilidade, mostrar somente o estado
ou a categoria, nunca o valor bruto.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 00:19
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 17/07/2026 00:23
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao

## Implementação

- Foi criado `src/services/runtimeEnvironmentService.js` para coletar e
  sanitizar dados da aplicação, sistema operacional, processo, dependências,
  cache CommonJS, variáveis permitidas e configurações seguras.
- Foi criada a view `src/views/runtimeEnvironmentView.js`, com cards de resumo,
  painéis, ícones Lucide, badges, tabelas compactas e layout responsivo.
- A rota autenticada `GET /runtime-environment` foi integrada ao servidor.
- O item **Ambiente de execução** foi adicionado abaixo de **Logs operacionais**
  nos menus desktop e mobile.
- Variáveis desconhecidas não são enumeradas; senhas, tokens, URLs, caminhos,
  chaves e demais valores sensíveis são omitidos antes da renderização.
- Módulos internos são apresentados por caminho relativo e pacotes externos
  somente pelo nome, sem expor caminhos de `require.cache`.
- Dependências diretas exibem versões declaradas e resolvidas a partir dos
  manifests locais, sem varrer `node_modules`.
- `package.json`, `docs/patterns.md`, `docs/architecture.md` e o controle de
  release foram atualizados.
- `npm run check` e `git diff --check` passaram.
- As rotas `/health`, `/dashboard`, `/entries`, `/operational-logs` e
  `/runtime-environment` responderam `200` no servidor temporário da porta
  3100.
- A renderização foi validada com exatamente um `h1`, uma `page-heading`, item
  ativo no menu, todas as seções previstas e ausência do caminho absoluto do
  projeto.
- Valores secretos fictícios e variáveis fora da allowlist não apareceram no
  HTML renderizado.
- O layout foi validado visualmente em desktop e em viewport mobile de 390 x
  844, sem overflow horizontal; o viewport foi restaurado e o servidor
  temporário foi encerrado pelo PID capturado.

---

## Assinatura da LLM

- Data: 17/07/2026 00:29
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
