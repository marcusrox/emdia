# TASK-071 - Desacoplar a extração de comprovantes do modelo de IA

## Status

Implementada no código em 15/10/2026. Publicação e validação de um comprovante
real em produção permanecem pendentes.

## Contexto

O modelo de extração pode ser escolhido por `OPENROUTER_RECEIPT_MODEL`, mas
`receiptExtractionService.js` ainda compara o identificador com
`qwen/qwen3.7-flash` para escolher o formato de saída, incluir o schema no
prompt, normalizar avisos e executar a validação local completa.

Hoje o Qwen usa `json_object`, enquanto os demais modelos recebem
`json_schema` estrito. A troca do modelo por configuração pode selecionar um
fluxo incompatível com suas capacidades, exigindo nova alteração de código.

## Objetivo

Permitir a troca entre modelos compatíveis com imagens e JSON mode no
OpenRouter apenas por configuração e reinicialização da aplicação, mantendo
um único contrato de extração e o mesmo tratamento de resposta no EmDia.

## Decisão acordada

- Usar sempre `text.format.type: json_object` na Responses API.
- Enviar sempre no prompt o mesmo schema de comprovantes do EmDia.
- Normalizar e validar a resposta localmente em um fluxo comum a todos os
  modelos, sem condições baseadas em nome, fabricante ou família.
- Permitir configurar o objeto `reasoning` por JSON no ambiente, sem regras
  específicas pelo nome do modelo, usando exclusivamente a variável JSON.
- Não implementar seleção automática de formato nem alternância entre
  `json_schema` e `json_object` nesta task.

JSON mode solicita JSON válido, mas não impõe os campos do schema no provedor.
O schema no prompt orienta a geração; cabe ao EmDia verificar seu cumprimento.
Mesmo uma resposta estruturalmente válida pode conter leitura incorreta da
imagem, portanto a aprovação humana continua obrigatória.

## Escopo da implementação

### Requisição e configuração

- Remover `usesJsonObject(model)` e os desvios decorrentes dessa comparação.
- Manter o modelo selecionável por `OPENROUTER_RECEIPT_MODEL`; um modelo padrão
  pode continuar existindo como configuração de fallback, sem controlar regras.
- Preservar a Responses API, os parâmetros existentes de timeout, limite de
  saída e raciocínio opcional, além de `store: false`,
  `provider.require_parameters: true` e `provider.data_collection: deny`.
- Não enviar `json_schema` nem seus atributos exclusivos em `text.format`.
- Incluir o contrato completo no prompt para qualquer modelo configurado.
- Documentar que raciocínio opcional e demais parâmetros também precisam ser
  compatíveis com o modelo e os provedores disponíveis para a conta.

### Configuração de reasoning por JSON

Adicionar `OPENROUTER_RECEIPT_REASONING`, cujo valor deve ser um objeto JSON
válido com as opções desejadas. Não criar uma sintaxe própria como
`reasoning.enabled: false`: o objeto é interpretado e enviado no campo
`reasoning` da requisição.

Exemplos para documentar no `.env.example` e no README, mantendo somente uma
configuração ativa:

```env
# Solicitar raciocínio desabilitado, se suportado pelo modelo/provedor
OPENROUTER_RECEIPT_REASONING='{"enabled":false}'

# Alternativa: esforço mínimo, quando suportado
#OPENROUTER_RECEIPT_REASONING='{"effort":"minimal"}'

# Alternativa: habilitar com orçamento de tokens, quando suportado
#OPENROUTER_RECEIPT_REASONING='{"enabled":true,"max_tokens":1000}'
```

Configuração exclusiva por JSON:

- Se a variável contiver valor não vazio após trim, interpretá-la como JSON
  e usar somente seu objeto.
- Se estiver ausente ou vazia, omitir `reasoning` e respeitar o padrão do
  modelo/provedor. Não consultar variáveis anteriores de raciocínio.
- JSON inválido não pode acionar fallback nem ser ignorado silenciosamente.
- Não alterar `.env` real durante a implementação.

Validação local da nova variável:

- Aceitar somente objeto JSON não nulo, não array, com pelo menos uma opção.
- Usar allowlist de propriedades: `enabled`, `effort`, `max_tokens` e
  `exclude`. Rejeitar propriedades desconhecidas.
- `enabled` e `exclude` devem ser booleanos reais, não strings.
- `effort` deve pertencer à lista aceita pela integração: `none`, `minimal`,
  `low`, `medium`, `high`, `xhigh` ou `max`.
- `max_tokens` deve ser inteiro seguro positivo, sem coerção de strings.
- Não permitir `effort` e `max_tokens` simultaneamente; são formas alternativas
  de configurar o orçamento de raciocínio.
- Rejeitar combinações contraditórias, incluindo `enabled: false` com
  `effort` ou `max_tokens`, e `enabled: true` com `effort: none`.
- Configuração inválida deve produzir código e mensagem claros de erro de
  configuração antes de enviar a chamada à API, sem imprimir o valor bruto.
- Aplicar as mesmas regras no diagnóstico e na extração de produção.

A validação acima confere o formato da configuração, não garante suporte do
modelo escolhido. A compatibilidade efetiva continua dependendo do OpenRouter
e do provedor. Não confundir `exclude: true` com desligar o raciocínio: essa
opção controla sua exposição na resposta e não deve ser documentada como forma
de eliminar processamento ou cobrança. A opção `enabled: false` deve ser
enviada explicitamente quando configurada, sem depender de valores truthy.

O diagnóstico deve mostrar o objeto efetivo já validado e indicar sua origem
(`json` ou `provider_default`), sem exibir o texto bruto da
variável. Usar allowlist de campos caso a configuração seja registrada nos
logs. Revisar também `runtimeEnvironmentService.js` para reconhecer a nova
variável nas listas de diagnóstico, seguindo as regras de sanitização atuais.

### Tratamento comum da resposta

- Usar a sequência: interpretar JSON, normalizar avisos, validar o schema
  completo e aplicar a validação de negócio existente.
- Reutilizar uma única definição de schema para prompt e validação local.
- Aplicar a normalização de `warnings` a todos os modelos: ausente/null,
  texto único, limpeza, deduplicação e limites de tamanho/quantidade, mantendo
  o marcador `warnings_normalized` quando houver ajuste.
- Continuar rejeitando avisos em objetos ou listas com itens não textuais.
- Validar os campos obrigatórios, tipos, enums, limites e propriedades extras
  para todos os modelos antes da normalização de negócio.
- Não converter valor monetário textual ou fracionário em centavos, inventar
  datas, completar confiança ausente ou converter tipos financeiros para
  contornar o contrato. Preservar os valores nulos permitidos pelo schema.
- Preservar a conferência de datas civis e todas as demais regras de negócio.
- Tratar recusa, JSON inválido e saída incompleta sem aceitar dados parciais
  como extração concluída.

### Diagnóstico, testes e documentação

- Fazer `diagnose-openrouter.js` usar o mesmo fluxo de preparação e validação
  da extração, sem duplicar regras ou selecionar comportamento pelo modelo.
- Exibir o formato efetivamente enviado e o resultado da validação. Em falhas,
  preservar metadados seguros como etapa, campo, regra e tipo recebido, sem
  imprimir corpo da resposta, imagem, prompt, credenciais ou texto extraído.
- Atualizar os testes que esperam JSON Schema para modelos diferentes do Qwen.
- Testar o mesmo comportamento com identificadores distintos, inclusive um
  identificador fictício sem qualquer tratamento especial.
- Atualizar README, arquitetura, padrões e comentários pertinentes do
  `.env.example`, removendo a orientação de fluxos diferentes por modelo.
- Ao concluir a implementação, atualizar `src/config/release.js` com a data e
  hora atuais e incrementar o sequencial, conforme o AGENTS.md.

## Arquivos candidatos

- `src/services/receiptExtractionService.js`;
- `src/services/receiptReasoningService.js`;
- `scripts/diagnose-openrouter.js`;
- `src/services/receiptImportWorker.js`, somente se necessário aos diagnósticos;
- `src/services/runtimeEnvironmentService.js`, para a nova configuração;
- `test/openRouterDiagnostics.test.js` e `test/receiptImports.test.js`;
- `README.md`, `docs/architecture.md`, `docs/patterns.md` e `.env.example`;
- `src/config/release.js`, ao concluir a implementação.

## Fora do escopo

- Trocar OpenRouter por outro serviço ou migrar a Responses API.
- Garantir suporte a modelos sem entrada de imagem ou sem JSON mode.
- Consultar catálogos automaticamente, criar registros de modelos, implementar
  fallback para outros modelos ou repetir chamadas para tentar outros formatos.
- Relaxar políticas de privacidade ou criar lançamentos sem aprovação humana.
- Alterar schema do banco, competência, vencimento, status, settlements ou
  isolamento por usuário.
- Alterar `.env` real, dados de produção ou dependências.

## Critérios de aceite

- Trocar um modelo compatível exige apenas configuração e reinicialização.
- O identificador do modelo não escolhe formato, prompt, normalização ou
  validação; ele continua sendo enviado à API e registrado nos metadados seguros.
- Todas as requisições usam `json_object` e o mesmo schema no prompt.
- Todas as respostas passam pela mesma validação local completa e de negócio.
- Avisos toleráveis não interrompem a extração; dados financeiros fora do
  contrato continuam sendo recusados com diagnóstico seguro.
- Testes cobrem modelos distintos, respostas válidas, normalização de avisos,
  campos ausentes, tipos incorretos, limites, recusa e JSON inválido/incompleto.
- O diagnóstico aplica as mesmas regras da extração de produção.
- `OPENROUTER_RECEIPT_REASONING` permite ajustar o objeto enviado sem alterar
  código, é a única variável de raciocínio e preserva `enabled: false`.
- Configuração JSON inválida impede a chamada com diagnóstico claro; a
  configuração vazia omite `reasoning` sem consultar qualquer variável legada.
- Testes cobrem variável ausente ou vazia, booleano false, esforço, orçamento de tokens, `exclude`, JSON
  malformado, objetos vazios, tipos incorretos, propriedades desconhecidas e
  combinações contraditórias. Confirmar que valores inválidos não vazam para
  logs ou mensagens e não disparam chamadas reais.
- A documentação distingue compatibilidade técnica de qualidade de OCR e não
  promete que qualquer modelo funcionará apenas pela troca do identificador.

## Validação esperada

- Executar `npm run check` e a suíte completa com `npm test`.
- Usar bancos isolados e mocks nos testes automatizados, sem consumir a API real.
- Fazer teste manual com imagem sintética e pelo menos dois modelos compatíveis
  disponíveis, registrando modelo, formato e resultado sem conteúdo sensível.
  Chamadas reais podem ter custo; indisponibilidade de chave ou de segundo
  modelo deve ser informada como pendência, sem declarar validação não realizada.
- Após publicação, validar um comprovante real até a caixa de revisão humana,
  sem aprovar lançamento financeiro automaticamente.
- Revisar o diff para confirmar ausência de mudança em `.env`, bancos e
  dependências. Informar a necessidade de commit ao concluir a implementação.

---

## Assinatura da LLM

- Data: 15/10/2026 20:54 (America/Sao_Paulo)
- Modelo: GPT-6
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 15/10/2026 21:33 (America/Sao_Paulo)
- Modelo: GPT-6
- Versao: não informado
- Acao: atualizacao

---

## Resultado da implementação

- Removida a seleção de comportamento pelo identificador do modelo. Todos
  usam `json_object`, schema no prompt e preparação/validação local comuns.
- Criado `receiptReasoningService` para interpretar e validar exclusivamente
  o JSON e impedir chamadas com configuração inválida. A página de
  ambiente mascara a variável; o diagnóstico mostra apenas o objeto validado
  e sua origem.
- Rejeitadas respostas marcadas como incompletas mesmo quando contêm JSON
  sintaticamente válido. Mantidas as regras financeiras e a revisão humana.
- Corrigido o PNG sintético do diagnóstico: a constante anterior tinha dados
  truncados; a imagem agora é gerada com estrutura e CRC válidos.
- `npm test`: 201 testes aprovados com banco isolado e mocks de provedores.
- Testes manuais com o mesmo PNG branco íntegro de 64×64 e JSON mode:
  `qwen/qwen3.7-flash`, `reasoning: {"enabled":false}`, HTTP 200 em 4.408 ms;
  `openai/gpt-5-mini`, `reasoning: {"effort":"minimal"}`, HTTP 200 em 3.539 ms.
  Ambos retornaram JSON com o contrato validado, sem gravar dados financeiros.
- Esses testes não medem qualidade de OCR. O primeiro teste do segundo modelo
  rejeitou o PNG antigo; a chamada passou após a correção da imagem de teste.
- Release atualizada para `Release 15/10/2026 21:45 - 121`.
- Pendente após publicação: reprocessar um comprovante real até a caixa de
  revisão e conferir o conteúdo extraído, sem aprovação automática.
- `.env` real, dependências e bancos de usuário não foram alterados.

---

## Assinatura da LLM

- Data: 15/10/2026 21:40 (America/Sao_Paulo)
- Modelo: GPT-6
- Versao: não informado
- Acao: atualizacao

---

## Ajuste solicitado após a implementação

- Removido o suporte a `OPENROUTER_RECEIPT_REASONING_EFFORT`, inclusive das
  listas de diagnóstico, exemplos e testes de compatibilidade.
- Somente `OPENROUTER_RECEIPT_REASONING` controla o objeto enviado; vazia ou
  ausente respeita o padrão do provedor. Nenhum fallback legado é consultado.
- O `.env` real não foi alterado. Configurações de esforço devem ser escritas
  no JSON, por exemplo `{"effort":"minimal"}`.

---

## Assinatura da LLM

- Data: 15/10/2026 21:45 (America/Sao_Paulo)
- Modelo: GPT-6
- Versao: não informado
- Acao: atualizacao
