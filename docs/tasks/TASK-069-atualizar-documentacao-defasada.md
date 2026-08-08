# TASK-069 - Atualizar documentação defasada

## Contexto

O EmDia evoluiu além de partes da documentação arquitetural. O arquivo
`docs/architecture.md`, por exemplo, ainda lista autenticação, multiusuário,
recorrências, anexos e OCR como recursos inexistentes, embora o repositório já
contenha autenticação e sessões, administração de usuários, recorrências e o
fluxo de comprovantes com armazenamento privado e extração assistida por IA.

Também existem mapas de módulos, rotas e limites do MVP que não refletem todos
os models, services, workers, migrations e integrações atuais. Essa divergência
pode induzir implementações incorretas e avaliações técnicas desatualizadas.

## Objetivo

Reconciliar README, arquitetura, padrões e PRD técnico com o estado efetivamente
implementado, removendo contradições e preservando a distinção entre recurso
entregue, limitação atual e evolução futura.

## Regras da atualização

- Usar o código e os testes atuais como fonte de verdade para funcionalidades
  implementadas.
- Não declarar como concluído um recurso que exista apenas parcialmente.
- Distinguir claramente:
  - implementado e operacional;
  - implementado com limitação conhecida;
  - planejado ou fora do escopo atual.
- Atualizar o mapa de módulos com rotas, middleware, models, services, workers,
  migrações e views relevantes sem transformar a documentação em uma listagem
  exaustiva de arquivos.
- Corrigir a seção de limites do MVP, especialmente autenticação, multiusuário,
  recorrências, comprovantes, armazenamento privado e extração por IA.
- Explicar que OCR/extração automatizada exige revisão humana e não cria
  lançamento definitivo sem aprovação.
- Preservar a competência mensal, centavos inteiros, settlements e isolamento
  por usuário como regras centrais.
- Verificar coerência entre `README.md`, `docs/architecture.md`,
  `docs/patterns.md` e `PRD_sistema_financas_pessoais.md`.
- Quando o PRD representar intenção histórica ou futura, identificá-lo como tal
  em vez de reescrevê-lo integralmente para espelhar a implementação.
- Remover numeração duplicada de seções e referências obsoletas encontradas na
  revisão.
- Manter textos em português e links/caminhos válidos.

## Conteúdo mínimo a revisar

- stack e versão homologada do Node.js;
- bootstrap, composition root e módulos de rota;
- autenticação, cadastro público, sessões, CSRF e administração de usuários;
- competência mensal compartilhada entre dashboard, agenda e lançamentos;
- recorrências e geração idempotente;
- transações financeiras, baixas, estornos e exclusão lógica;
- migrations formais, backup, restauração e lock operacional;
- outbox de WhatsApp e e-mail;
- recebimento de comprovantes por WAHA, armazenamento privado, extração via
  OpenRouter e aprovação humana;
- observabilidade, readiness, logs operacionais e ambiente de execução;
- limites reais do MVP e caminhos de evolução ainda pendentes.

## Arquivos candidatos

- `README.md`;
- `docs/architecture.md`;
- `docs/patterns.md`;
- `PRD_sistema_financas_pessoais.md`, somente para correções factuais,
  marcações de estado ou referências necessárias;
- `AGENTS.md`, somente se alguma orientação operacional estiver objetivamente
  incompatível com o repositório;
- `src/config/release.js`, ao concluir a implementação desta task.

## Fora do escopo

- alterar código para fazê-lo coincidir com uma descrição antiga;
- redesenhar funcionalidades ou regras financeiras;
- criar documentação de API pública inexistente;
- apagar histórico ou assinaturas de tasks concluídas;
- reformatar integralmente o PRD sem necessidade;
- atualizar dependências;
- implementar as correções técnicas descritas nas TASK-065 a TASK-068;
- implementar esta task no momento de sua criação.

## Critérios de aceite

- a documentação não afirma que autenticação, multiusuário ou recorrências são
  inexistentes;
- o fluxo atual de comprovantes é descrito como implementado, privado e sujeito
  a revisão humana;
- mapas de arquitetura e fluxo HTTP representam a modularização atual;
- limites do MVP listam somente lacunas reais ou qualificam funcionalidades
  parciais;
- README, arquitetura e padrões não se contradizem sobre stack, banco,
  competência, segurança ou integrações;
- itens planejados permanecem claramente separados dos entregues;
- caminhos de arquivos e comandos documentados existem e estão corretos;
- nenhuma assinatura histórica de task é removida ou modificada;
- alterações ficam restritas à documentação e ao release exigido na conclusão.

## Verificações esperadas

- comparar afirmações funcionais com rotas, models, services e testes atuais;
- procurar expressões como `ainda não existe`, `futuro`, `planejado`,
  `autenticação`, `recorrência`, `OCR` e `anexo` em toda a documentação;
- conferir títulos, numeração de seções, links relativos e blocos de comandos;
- executar `npm run check` para garantir que a revisão não acompanhou mudança
  acidental de código;
- executar `npm test` se qualquer documentação operacional orientar fluxos
  cobertos pela suíte e houver dúvida sobre o comportamento real;
- revisar `git diff` para confirmar ausência de mudança funcional;
- atualizar `src/config/release.js` ao concluir a implementação, incrementando
  o sequencial conforme o padrão do projeto.

---

## Assinatura da LLM

- Data: 08/08/2026 10:45
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao
