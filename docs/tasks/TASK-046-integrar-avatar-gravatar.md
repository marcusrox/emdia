# TASK-046 - Integrar avatar de usuário com Gravatar

## Contexto

O EmDia exibe o nome do usuário autenticado no topo e mantém dados de perfil e
cadastros administrativos de usuários, mas ainda usa um ícone genérico para
representar a pessoa. O usuário solicitou o uso do Gravatar como fonte única do
avatar, sem criar upload ou persistência local de imagens.

## Objetivo

Exibir o avatar associado ao e-mail cadastrado no Gravatar no topo do sistema,
na tela de perfil e no cadastro administrativo de usuários, oferecendo no
perfil um link para o serviço onde a imagem pode ser definida ou alterada.

## Escopo

- Gerar o identificador do Gravatar com SHA-256 do e-mail sem espaços e em
  letras minúsculas.
- Centralizar a construção segura da URL e da tag de avatar em helper de view.
- Solicitar somente imagens com classificação `G`.
- Usar o avatar de iniciais oferecido pelo Gravatar quando não houver foto.
- Mostrar o avatar no menu do usuário no desktop e no mobile.
- Mostrar avatar ampliado e explicação na tela `/profile`.
- Adicionar link externo para o usuário gerenciar seu avatar no Gravatar.
- Mostrar o avatar na listagem e nos formulários administrativos de usuários.
- Preservar a edição do e-mail como origem da associação com o Gravatar.
- Ajustar o CSS de forma responsiva e consistente com a interface atual.

## Fora de escopo

- Upload, recorte ou armazenamento local de imagens.
- Persistir URL, hash ou dados de perfil do Gravatar no banco.
- Consumir a API REST de perfis ou exigir chave de API.
- Sincronizar nome, biografia ou outros dados do Gravatar.
- Incorporar o Quick Editor ou autenticação do Gravatar dentro do EmDia.

## Regras funcionais

1. O avatar deve ser derivado sempre do e-mail exibido no cadastro.
2. Alterar o e-mail muda automaticamente o avatar solicitado após salvar.
3. Ausência de foto no serviço deve produzir um avatar de iniciais legível.
4. O link da tela de perfil deve abrir o gerenciamento de avatares do Gravatar
   em nova aba, sem conceder acesso da nova página ao contexto do EmDia.
5. A imagem deve ter texto alternativo com o nome do usuário.
6. O topo deve carregar o avatar imediatamente; imagens administrativas podem
   usar carregamento tardio.

## Segurança e privacidade

- Não enviar nome, e-mail em texto puro, senha, token ou sessão ao serviço.
- Enviar ao endpoint de imagem apenas o hash SHA-256 normalizado e parâmetros
  visuais documentados pelo Gravatar.
- Escapar URL, classes e texto alternativo na renderização HTML.
- Usar HTTPS, `referrerpolicy="no-referrer"` nas imagens e
  `rel="noopener noreferrer"` no link externo.
- Não registrar o hash ou a URL do avatar em logs e auditoria.

## Critérios de aceite

- O topo desktop exibe o Gravatar ao lado do nome do usuário.
- O topo mobile usa o Gravatar como acionador visual do menu do usuário.
- A tela de perfil exibe o avatar em destaque e o link para gerenciá-lo.
- A administração mostra avatares na listagem e no formulário de usuário.
- Um e-mail sem foto recebe fallback de iniciais sem imagem quebrada.
- A URL usa SHA-256 do e-mail normalizado, tamanho explícito, classificação `G`
  e fallback `initials`.
- `npm run check` e os testes automatizados permanecem aprovados.
- A navegação e os formulários continuam responsivos.

## Arquivos alterados

- `src/services/viewHelpers.js`;
- `src/views/layout.js`;
- `src/views/profileView.js`;
- `src/views/usersAdminView.js`;
- `public/css/styles.css`;
- `test/integration/http.test.js`;
- `src/config/release.js`.

## Referências técnicas

- Documentação oficial de imagens: `https://docs.gravatar.com/sdk/images/`.
- Gerenciamento de avatares: `https://gravatar.com/profile/avatars`.

---

## Assinatura da LLM

- Data: 18/07/2026 17:34
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao
