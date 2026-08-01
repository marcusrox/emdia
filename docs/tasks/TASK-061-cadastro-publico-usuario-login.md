# TASK-061 - Permitir cadastro público de usuário pela tela de login

## Contexto

O EmDia já permite autenticação por e-mail e senha, edição do próprio perfil e
administração de usuários. A criação de contas, porém, depende de um
administrador: uma pessoa que chega à tela inicial consegue entrar somente se
já possuir cadastro.

Além de impedir o autoatendimento, a tela atual concentra-se no formulário de
login e comunica pouco do valor do produto. É necessário apresentar, de forma
objetiva e convincente, como o EmDia ajuda a organizar o mês financeiro e
oferecer um caminho claro para a criação da conta.

## Objetivo

Permitir que uma pessoa crie a própria conta a partir da tela inicial/login e
comece a usar o EmDia sem intervenção administrativa, mantendo as proteções de
autenticação, isolamento de dados e competência mensal do produto.

A tela de login também deve ganhar uma área de apresentação com bom apelo,
destacando benefícios reais do EmDia e uma chamada visível para o cadastro.

## Decisões de produto

- O cadastro será público e estará disponível somente para visitantes sem
  sessão autenticada.
- Toda conta criada por autoatendimento deve nascer ativa e com perfil
  **Usuário** (`is_active = 1` e `is_admin = 0`). O formulário e o request não
  podem escolher ou sobrescrever esses valores.
- O cadastro inicial deve pedir apenas nome, e-mail, senha e confirmação da
  senha. Telefone e demais preferências poderão ser preenchidos depois em
  **Meu perfil**.
- A localidade inicial deve ser `pt-BR`.
- O fuso horário deve ser identificado no navegador quando possível e validado
  no backend. Na ausência de um valor válido, usar `America/Sao_Paulo` como
  fallback explícito, sem confiar cegamente em campo oculto.
- Após um cadastro concluído com sucesso, o sistema deve criar uma sessão e
  levar o novo usuário ao dashboard.
- O primeiro acesso deve respeitar a regra central do produto: sem competência
  informada, o dashboard abre no mês corrente calculado no fuso do usuário.
- O novo usuário deve receber contas e categorias iniciais próprias, vinculadas
  exclusivamente ao seu `user_id`, sem copiar identificadores ou vínculos de
  outro cadastro.
- Não criar lançamentos, recorrências, baixas nem saldos fictícios. O seed do
  cadastro fornece somente a estrutura inicial de contas e categorias.
- O cadastro público não substitui nem altera o cadastro administrativo da
  TASK-038.

## Proposta de mensagem e chamada para cadastro

A área de apresentação da tela inicial/login deve usar uma mensagem curta,
direta e compatível com as funcionalidades atuais. Usar como conteúdo-base:

> **Tenha clareza sobre o seu mês financeiro.**
>
> Organize receitas e despesas, acompanhe vencimentos e registre pagamentos em
> um só lugar. Crie sua conta e comece a cuidar do que vence hoje sem perder de
> vista o restante do mês.

Benefícios de apoio, apresentados de forma escaneável:

- veja o que vence, o que está atrasado e o que já foi pago;
- acompanhe receitas e despesas pela competência do mês;
- mantenha contas, categorias e recorrências organizadas.

Chamada principal para visitantes que ainda não possuem acesso:

- texto de apoio: **Ainda não usa o EmDia?**;
- botão/link: **Criar minha conta**;
- destino: `GET /signup`.

A implementação pode lapidar pontuação e comprimento para adequação
responsiva, mas deve preservar a promessa central e não afirmar gratuidade,
sincronização em nuvem, criptografia ponta a ponta ou outras características
que não estejam comprovadamente disponíveis.

## Fluxo e rotas

Adicionar as rotas públicas:

```text
GET  /signup
POST /signup
```

Fluxo esperado:

1. visitante acessa `/login` e encontra a apresentação do produto e a chamada
   **Criar minha conta**;
2. `GET /signup` exibe o formulário de criação de conta;
3. `POST /signup` normaliza e valida os dados no backend;
4. se houver erro, a tela é renderizada novamente, preservando apenas valores
   não sensíveis e exibindo mensagens específicas em português;
5. se os dados forem válidos, o usuário é criado como usuário comum e ativo,
   junto com suas contas e categorias iniciais;
6. a aplicação cria a sessão com o mecanismo atual e redireciona para
   `/dashboard`;
7. o dashboard abre na competência corrente do fuso cadastrado.

Usuários já autenticados que acessarem `GET /login` ou `GET /signup` devem ser
redirecionados para `/dashboard`. Um `POST /signup` feito com sessão ativa não
deve criar outra conta.

## Tela de login e apresentação visual

- Evoluir `src/views/authView.js` sem duplicar a marca ou criar uma segunda
  página inicial desconectada do login.
- Em desktop, organizar a tela em duas áreas equilibradas: apresentação do
  produto e acesso à conta.
- Em telas estreitas, empilhar o conteúdo com o formulário e as ações em ordem
  clara, sem rolagem horizontal.
- Manter **Entrar** como ação primária do formulário de login e diferenciar
  visualmente **Criar minha conta** como chamada de cadastro sem gerar dúvida
  entre os dois fluxos.
- Usar ícones de `lucide-static` por meio de `lucideIcon` quando agregarem
  compreensão; não inserir SVG avulso.
- Preservar foco visível, contraste, labels associados, navegação por teclado,
  alvos de toque confortáveis e leitura adequada por tecnologia assistiva.
- Não usar estilos ou handlers inline, preservando a CSP do projeto.

## Formulário de cadastro

Exibir:

- nome, obrigatório;
- e-mail, obrigatório;
- senha, obrigatória;
- confirmação da senha, obrigatória;
- informação objetiva de que a senha precisa ter pelo menos 12 caracteres;
- link **Já tenho uma conta** para `/login`;
- botão **Criar minha conta**.

Requisitos de interação:

- usar `autocomplete="name"`, `autocomplete="email"` e
  `autocomplete="new-password"` nos campos correspondentes;
- permitir que o gerenciador de senhas identifique corretamente a criação da
  credencial;
- nunca repopular senha ou confirmação após erro;
- preservar nome e e-mail válidos após erro de validação;
- associar mensagens aos campos com os helpers e atributos de acessibilidade
  adotados no projeto;
- impedir submissões acidentais repetidas no frontend quando o padrão global
  existente suportar isso, sem depender dessa proteção para a integridade no
  backend.

## Validação e persistência

Criar uma operação específica de cadastro público em `src/models/User.js` ou em
um service de domínio dedicado. Não reutilizar `createAdmin` aceitando campos
administrativos vindos do formulário.

Validar no backend:

- nome preenchido após `trim`;
- e-mail em formato válido, normalizado em minúsculas e único sem diferenciar
  maiúsculas de minúsculas;
- senha com a política central de `passwordPolicyError`;
- confirmação idêntica à senha;
- fuso horário com `Intl.DateTimeFormat`, aplicando o fallback definido quando
  necessário;
- lista explícita de campos aceitos, ignorando ou recusando propriedades como
  `is_admin`, `is_active`, `role`, `status`, `id` e `password_hash`.

Persistência:

- gerar o ID com o helper `newId`;
- armazenar apenas o hash produzido por `hashPassword`;
- usar placeholders `?` em todo SQL;
- gravar `created_at` e `updated_at` com o mesmo instante ISO;
- forçar `is_admin = 0` e `is_active = 1` na operação de domínio;
- tratar a restrição única do banco como última barreira para cadastros
  concorrentes com o mesmo e-mail;
- criar usuário, contas e categorias iniciais na mesma transação, sem deixar
  cadastro parcial se qualquer etapa falhar;
- não retornar `password_hash` para a view, resposta HTTP, auditoria ou log.

O tratamento de e-mail duplicado deve mostrar mensagem útil no formulário,
como **Este e-mail já está cadastrado. Entre na sua conta.**, sem incluir dados
de outros usuários. A mensagem de login inválido existente deve continuar
genérica para não alterar a proteção daquele fluxo.

## Seed inicial do novo usuário

Todo cadastro público concluído deve provisionar dados iniciais próprios para
que a pessoa possa começar a registrar receitas e despesas sem montar toda a
estrutura básica manualmente.

### Contas iniciais

Criar as seguintes contas ativas, ambas com saldo inicial de zero centavos:

| Nome | Tipo | Instituição | Ícone | Cor |
| --- | --- | --- | --- | --- |
| Conta corrente | `CHECKING` | não informada | `bank` | `#2563eb` |
| Carteira | `CASH` | não informada | `wallet` | `#16a34a` |

Regras:

- usar como data do saldo inicial o primeiro dia da competência corrente no
  fuso horário do novo usuário;
- não reutilizar os saldos demonstrativos de `src/database/seed.js`;
- permitir que o usuário edite, arquive ou substitua essas contas depois pelos
  fluxos normais do produto;
- não marcar uma conta como banco real nem preencher instituição fictícia.

### Categorias iniciais

Criar as categorias ativas já usadas pelo seed local:

| Nome | Tipo | Cor |
| --- | --- | --- |
| Moradia | `EXPENSE` | `#7c3aed` |
| Energia | `EXPENSE` | `#f59e0b` |
| Internet | `EXPENSE` | `#0891b2` |
| Alimentação | `EXPENSE` | `#dc2626` |
| Saúde | `EXPENSE` | `#0f766e` |
| Salário | `INCOME` | `#16a34a` |
| Reembolso | `INCOME` | `#2563eb` |

Se, no momento da implementação, o projeto já possuir um catálogo central de
ícones e cores para categorias, o provisionamento deve reutilizá-lo e atribuir
ícones coerentes. Não duplicar regras visuais dentro da rota de cadastro.

### Atomicidade e reutilização

- Extrair o catálogo e o provisionamento para um service ou helper de domínio
  reutilizável pelo cadastro público e pelo seed local, evitando duas listas
  divergentes.
- O provisionamento deve receber explicitamente o novo `user_id` e nunca
  consultar o primeiro usuário do banco como destino.
- A operação deve ser idempotente para o mesmo usuário: uma repetição técnica
  não pode duplicar contas ou categorias.
- Usuário, contas e categorias devem ser persistidos em uma única transação. Se
  uma conta ou categoria falhar, reverter todo o cadastro e não criar sessão.
- A sessão só pode ser criada depois do commit bem-sucedido da transação.
- Não executar esse provisionamento em todo login nem em toda requisição.
- Não criar lançamentos, partes, recorrências, notificações ou baixas como parte
  do seed do cadastro.

## Sessão, abuso e segurança

- Reutilizar `Auth.createSession` e as configurações atuais de cookie
  `HttpOnly`, `SameSite` e `Secure` em produção.
- Proteger o `POST /signup` contra CSRF também sem sessão autenticada. Como o
  token atual deriva da sessão de login, implementar um token público
  apropriado ao formulário de cadastro, com segredo imprevisível, expiração,
  validação segura e cookie compatível com a política atual; não desabilitar a
  proteção apenas porque a rota é pública.
- Aplicar limitação de tentativas ao cadastro por IP confiável e, quando
  apropriado, por impressão do e-mail normalizado. O limitador não deve guardar
  nem registrar senha ou e-mail completo.
- Definir respostas e limites que reduzam criação automatizada em massa sem
  prejudicar o uso normal. CAPTCHA, confirmação por e-mail e aprovação manual
  permanecem fora do escopo desta primeira versão.
- Nunca registrar senha, confirmação, hash, token CSRF, cookie, sessão, header
  sensível ou payload bruto.
- Logs operacionais podem registrar resultado, código de erro, identificador
  interno do usuário criado e detalhes técnicos sanitizados da requisição.
- Escapar com `escapeHtml` qualquer valor devolvido ao HTML.
- Preservar os headers de segurança e a CSP atuais.

## Auditoria e observabilidade

- Registrar o sucesso do cadastro no log operacional com evento próprio, sem
  dados sensíveis.
- Registrar recusas relevantes, como limite excedido, falha de CSRF e conflito
  de e-mail, usando códigos previsíveis e dados sanitizados.
- Não é obrigatório criar um `audit_log` autorreferente para o cadastro, pois o
  usuário ainda não existia no início da operação. Se a implementação optar
  por registrar auditoria após a criação, usar apenas o novo `user_id`, ação
  específica e payload não sensível.
- Falhas inesperadas devem seguir o tratamento global e não revelar SQL,
  caminhos, stack trace ou detalhes internos ao visitante.

## Organização do código

- Manter as rotas públicas de autenticação em `src/routes/authRoutes.js` ou
  extrair um módulo específico apenas se isso tornar o fluxo mais coeso.
- Manter as views de login e cadastro em `src/views/authView.js`, separando
  helpers internos para evitar duplicação de estrutura e marca.
- Exportar a nova view por `src/services/viewEngine.js`.
- Centralizar regras de criação no model/service; não espalhar persistência pela
  rota ou pela view.
- Adicionar somente as classes necessárias em `public/css/styles.css` e
  preservar as alterações locais existentes nesse arquivo.
- Se for necessário detectar o fuso no navegador, usar o JavaScript externo já
  servido em `public/js/`, sem script inline.
- Não adicionar dependências nem alterar `package-lock.json` para esta task.

## Fora do escopo

- confirmação ou ativação de conta por e-mail;
- recuperação de senha;
- CAPTCHA ou integração com serviço antifraude;
- autenticação multifator, social ou sem senha;
- cadastro com perfil administrativo;
- convite por link ou aprovação por administrador;
- termos de uso, política de privacidade ou consentimentos jurídicos ainda não
  definidos pelo produto;
- criação automática de lançamentos, recorrências, baixas ou saldos
  demonstrativos;
- onboarding completo em múltiplas etapas;
- alteração do CRUD administrativo de usuários;
- mudanças amplas no dashboard ou nas telas financeiras.

## Critérios de aceite

- a tela de login apresenta uma mensagem persuasiva baseada em benefícios reais
  do EmDia e uma chamada visível **Criar minha conta**;
- a apresentação e os formulários são claros e responsivos em desktop e mobile;
- `GET /signup` exibe nome, e-mail, senha, confirmação, orientação da política
  de senha e retorno ao login;
- visitante consegue criar conta com dados válidos sem ação administrativa;
- o novo cadastro sempre recebe `is_active = 1` e `is_admin = 0`, mesmo que o
  request tente enviar campos de privilégio;
- e-mail é normalizado e não pode ser duplicado por diferença de caixa nem por
  submissões concorrentes;
- senhas divergentes ou fora da política são recusadas sem serem repopuladas ou
  expostas;
- cadastro válido cria uma sessão segura e redireciona ao dashboard;
- o primeiro dashboard abre na competência do mês corrente no fuso do novo
  usuário;
- o novo usuário recebe **Conta corrente** e **Carteira**, ativas, próprias e
  com saldo inicial zerado;
- o novo usuário recebe as sete categorias iniciais definidas nesta task, com
  tipo e cor corretos;
- falha ao criar qualquer conta ou categoria reverte também o usuário e não
  cria sessão;
- repetir tecnicamente o provisionamento para o mesmo usuário não duplica
  contas nem categorias;
- a conta nova não enxerga dados de nenhum usuário preexistente;
- usuário autenticado não consegue criar outra conta pelas rotas públicas;
- o POST público possui proteção CSRF e limitação de tentativas;
- logs, HTML e respostas não expõem senha, confirmação, hash, token, cookie ou
  detalhes internos;
- login e cadastro continuam acessíveis e utilizáveis por teclado;
- os testes automatizados cobrem regras de cadastro, privilégios forçados,
  duplicidade, sessão, CSRF, rate limit e isolamento básico;
- `npm run check` e `npm test` passam após a implementação.

## Cenários de validação

1. Abrir `/login` em desktop e mobile e conferir mensagem, benefícios, CTA,
   ordem de leitura, foco e contraste.
2. Acessar `/signup`, usar **Já tenho uma conta** e retornar ao login.
3. Enviar formulário vazio e confirmar mensagens em português associadas aos
   campos.
4. Testar e-mail inválido, senha com menos de 12 caracteres e confirmação
   divergente.
5. Confirmar que um erro preserva nome e e-mail, mas limpa os dois campos de
   senha.
6. Criar uma conta válida e confirmar sessão, redirecionamento e competência
   corrente no fuso cadastrado.
7. Inspecionar o usuário criado e confirmar perfil comum, estado ativo,
   localidade, fuso e hash sem senha em texto claro.
8. Confirmar que o novo `user_id` possui **Conta corrente** e **Carteira**, com
   tipos corretos, saldo inicial zero e data inicial no primeiro dia da
   competência corrente do seu fuso.
9. Confirmar que as sete categorias iniciais pertencem ao novo usuário e têm
   tipos e cores conforme esta task.
10. Forçar uma falha durante o provisionamento e confirmar rollback do usuário,
    das contas, das categorias e ausência de sessão.
11. Executar novamente o provisionamento para o mesmo usuário e confirmar que
    contas e categorias não são duplicadas.
12. Tentar cadastrar o mesmo e-mail com outra combinação de maiúsculas e
   minúsculas e confirmar recusa sem erro técnico.
13. Simular duas criações concorrentes para o mesmo e-mail e confirmar que apenas
   uma conta é persistida.
14. Enviar `is_admin`, `role`, `is_active`, `password_hash` e `id` adulterados e
    confirmar que não há elevação de privilégio nem mass assignment.
15. Remover ou adulterar o token CSRF e confirmar que nenhum usuário é criado.
16. Exceder o limite de cadastro e confirmar resposta controlada, sem registrar
    e-mail completo ou credencial.
17. Com sessão ativa, acessar e submeter `/signup` e confirmar que nenhuma
    segunda conta é criada.
18. Entrar com o novo usuário e confirmar que somente suas contas e categorias
    iniciais aparecem e que lançamentos e recorrências permanecem vazios.
19. Confirmar que contas, categorias, lançamentos e recorrências de outro
    usuário não aparecem.
20. Inspecionar HTML, banco, logs e respostas para confirmar ausência de senha,
    confirmação, hash, cookie e token.
21. Executar `npm run check` e `npm test`.
22. Iniciar o servidor de validação com `PORT=3100` ou a próxima porta livre,
    validar `GET /health`, `GET /login`, `GET /signup`, `POST /signup` e
    `GET /dashboard`, encerrando somente o PID iniciado para o teste.

## Arquivos candidatos

- `src/views/authView.js`;
- `src/services/viewEngine.js`;
- `src/routes/authRoutes.js`;
- `src/models/User.js`;
- `src/models/FinancialAccount.js`;
- `src/models/Category.js`;
- `src/database/seed.js`;
- novo service de provisionamento inicial do usuário;
- `src/services/authService.js`;
- novo service de limitação de cadastro, se a separação for necessária;
- `public/css/styles.css`;
- `public/js/app.js`, somente se necessário para fuso ou interação progressiva;
- testes em `test/`;
- `src/config/release.js` ao concluir a implementação.

## Validação esperada

```powershell
npm run check
npm test
```

Para validação HTTP manual, usar explicitamente a porta `3100` ou a próxima
porta livre, conforme `AGENTS.md`. Nunca iniciar, reutilizar ou encerrar processo
na porta `3000`.

---

## Assinatura da LLM

- Data: 01/08/2026 16:18
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 01/08/2026 16:23
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Implementação

- criada apresentação de benefícios na tela de login, com chamada para o novo
  fluxo público em `GET /signup`;
- criado formulário responsivo e acessível de cadastro, com detecção progressiva
  do fuso horário e preservação somente de campos não sensíveis em erros;
- implementado `POST /signup` com validação, usuário comum ativo, sessão após
  commit, logs sanitizados e bloqueio de cadastro durante sessão existente;
- adicionado token CSRF público assinado, com cookie `HttpOnly`, expiração e
  rotação após falhas;
- adicionado limitador de cadastro em memória por IP confiável e impressão
  sanitizada do e-mail para observabilidade;
- centralizado o provisionamento idempotente de **Conta corrente**, **Carteira**
  e sete categorias iniciais, reutilizado também pelo seed local;
- criação de usuário, contas, categorias e respectivas auditorias passou a
  ocorrer em uma única transação; a sessão só é criada após o commit;
- adicionados testes de interface HTTP, validação, privilégios, CSRF, limite,
  isolamento, rollback e idempotência;
- atualizados `.env.example`, `README.md`, `docs/patterns.md`,
  `docs/architecture.md` e o controle de release.

---

## Assinatura da LLM

- Data: 01/08/2026 17:04
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: padronização da rota de cadastro

As rotas e os links do autoatendimento foram alterados de `/cadastro` para
`/signup`, preservando o padrão de URLs em inglês já adotado por `/login`,
`/dashboard`, `/entries`, `/accounts` e `/categories`. Como a funcionalidade
ainda não havia sido publicada, não foi mantido alias ou redirecionamento para
o caminho anterior.

---

## Assinatura da LLM

- Data: 01/08/2026 17:14
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
