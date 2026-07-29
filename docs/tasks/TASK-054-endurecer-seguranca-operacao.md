# TASK-054 - Endurecer segurança e operação

## Contexto

O EmDia já possui fundamentos importantes: hash de senha com `scrypt`, token de
sessão aleatório armazenado como hash, cookie `HttpOnly`, `SameSite=Lax`, CSRF,
SQL parametrizado e isolamento por usuário.

Como a aplicação possui fluxo de deploy em produção, faltam algumas proteções
de borda e sinais operacionais: limitação de login, headers HTTP, política de
senha mais forte, limpeza de sessões e separação real entre liveness e
readiness.

## Objetivo

Adicionar uma linha de base de segurança e operação adequada ao monólito atual,
sem introduzir infraestrutura desproporcional ao MVP.

**Status:** implementada.

## Princípios

- aplicar mudanças incrementais e testáveis;
- preservar compatibilidade com usuários existentes;
- não registrar credenciais ou dados financeiros;
- preferir controles simples e explícitos;
- falhar de modo seguro;
- não depender apenas do frontend;
- documentar impacto operacional e forma de diagnóstico.

## Limitação de login

Adicionar limitação de tentativas ao `POST /login`.

Requisitos:

- chave composta por endereço de origem confiável e email normalizado, sem
  registrar a senha;
- janela e quantidade máxima configuráveis;
- mensagem genérica, sem confirmar existência da conta;
- resposta HTTP apropriada, preferencialmente `429`;
- limpeza de chaves expiradas;
- logs sem email completo quando não for necessário;
- comportamento correto atrás do proxy confiável configurado;
- testes que não dependam de espera real.

Para a implantação atual em processo único, armazenamento em memória pode ser
aceitável. Documentar que múltiplas instâncias exigirão armazenamento
compartilhado.

## Política de senha

Elevar o mínimo para novas senhas e redefinições, preferencialmente para 10 ou
12 caracteres.

- não invalidar hashes existentes automaticamente;
- aplicar a regra em cadastro, redefinição administrativa e troca pelo perfil;
- centralizar validação e mensagem;
- permitir frases-senha e não impor combinações arbitrárias de símbolos;
- manter confirmação de senha;
- revogar sessões após alteração, conforme comportamento atual;
- documentar estratégia futura de rehash se parâmetros do `scrypt` mudarem.

## Headers HTTP

Adicionar middleware central para, no mínimo:

- `X-Content-Type-Options: nosniff`;
- proteção contra incorporação em frames;
- `Referrer-Policy`;
- política adequada de permissões do navegador;
- remoção ou neutralização de identificação desnecessária do Express;
- HSTS somente quando HTTPS em produção estiver garantido.

Preparar uma Content Security Policy, mas habilitá-la em modo efetivo somente
depois de inventariar scripts, estilos, ícones e integrações externas como
Gravatar.

Não liberar `unsafe-inline` amplamente apenas para fazer a política passar.

## Sessões

- remover periodicamente sessões expiradas e revogadas antigas;
- usar operação limitada e indexada;
- não executar limpeza pesada a cada requisição;
- manter expiração validada no acesso;
- preservar cookie `Secure` em produção;
- revisar duração padrão e documentá-la;
- garantir logout e alteração de senha como operações idempotentes.

## Health e readiness

Separar os contratos:

- `/health`: indica que o processo HTTP está vivo e não depende de serviços
  externos;
- `/ready`: confirma que o banco está acessível, migrations esperadas estão
  aplicadas e a aplicação pode atender tráfego.

O readiness deve usar consulta leve, possuir timeout operacional e devolver
`503` quando a dependência obrigatória não estiver pronta.

WhatsApp não deve tornar a aplicação inteira indisponível, pois é integração
secundária. Seu estado continua em endpoint ou tela operacional própria.

## Tratamento de erros e logs

- depender da página segura criada na TASK-049;
- padronizar eventos para login bloqueado, readiness falho e limpeza de sessão;
- evitar duplicar o mesmo erro em logger operacional e `console.error`;
- não registrar headers sensíveis, cookies, senha ou token;
- manter identificador de diagnóstico para falhas inesperadas.

## Escopo

- rate limiting do login;
- política centralizada para novas senhas;
- headers HTTP de segurança;
- inventário e primeira política CSP segura;
- limpeza de sessões expiradas e revogadas;
- health e readiness com contratos distintos;
- testes unitários e HTTP;
- configuração e documentação operacional;
- atualizar arquitetura, padrões, `.env.example` e README quando necessário;
- atualizar o controle de release ao concluir a implementação.

## Fora de escopo

- autenticação multifator;
- OAuth ou login social;
- WAF externo;
- SIEM;
- armazenamento distribuído de rate limiting;
- rotação forçada imediata de todas as senhas;
- certificados TLS gerenciados pela aplicação;
- tornar WhatsApp requisito de readiness;
- alterar provedor de deploy.

## Critérios de aceite

- tentativas excessivas de login recebem bloqueio temporário;
- bloqueio não revela se o email existe;
- login normal volta a funcionar após expiração da janela;
- testes controlam relógio sem espera real;
- novas senhas obedecem política centralizada;
- usuários existentes continuam podendo autenticar;
- respostas incluem headers de segurança definidos;
- HSTS não é enviado em ambiente HTTP local;
- CSP não quebra páginas, scripts, ícones ou Gravatar;
- sessões antigas são removidas por rotina limitada;
- `/health` continua leve e independente do banco;
- `/ready` consulta o banco e devolve `503` quando indisponível;
- integração de WhatsApp indisponível não derruba readiness;
- logs não contêm senha, cookie ou token;
- página de erro não expõe detalhes técnicos;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Efetuar login válido abaixo do limite.
2. Exceder tentativas com email existente e inexistente.
3. Confirmar mensagem equivalente nos dois casos.
4. Avançar relógio controlado e confirmar liberação.
5. Criar usuário com senha curta e frase-senha válida.
6. Autenticar usuário criado antes da nova política.
7. Inspecionar headers em login, dashboard, assets e respostas de erro.
8. Validar CSP nas principais telas e no Gravatar.
9. Criar sessões expiradas e executar limpeza.
10. Simular indisponibilidade do banco e consultar `/ready`.
11. Simular WhatsApp indisponível e manter `/ready` saudável.
12. Executar `npm run check` e `npm test`.
13. Em validação HTTP própria, usar porta 3100 ou a próxima livre, nunca 3000.

## Arquivos candidatos

- `src/server.js`;
- `src/middleware/securityHeaders.js`;
- `src/services/authService.js`;
- `src/services/loginRateLimitService.js`;
- `src/services/formValidation.js`;
- `src/models/User.js`;
- `src/database/connection.js`;
- `src/database/migrations/*.js`;
- `test/unit/authService.test.js`;
- `test/integration/auth.test.js`;
- `test/integration/http.test.js`;
- `.env.example`;
- `README.md`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Dependências

- implementar após a TASK-049;
- coordenar a movimentação dos middlewares com a TASK-051;
- aproveitar os cenários e a organização definidos na TASK-053.

---

## Assinatura da LLM

- Data: 28/07/2026 21:04
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 28/07/2026 23:45
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
