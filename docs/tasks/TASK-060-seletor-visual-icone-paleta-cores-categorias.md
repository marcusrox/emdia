# TASK-060 - Criar seletor visual de ícone e paleta de cores para categorias

## Contexto

O formulário de cadastro e edição em `/categories` usa atualmente um `select`
textual para escolher o ícone e um `input type="color"` para definir a cor da
categoria.

As opções do seletor de ícones mostram apenas a descrição, embora a interface
utilize ícones do `lucide-static`. Além disso, o seletor livre de cor exige que
o usuário encontre manualmente uma cor simples e marcante, tornando uma escolha
comum mais trabalhosa do que o necessário.

## Objetivo

Melhorar o formulário de categorias para:

- exibir o desenho de cada ícone ao lado de sua descrição durante a seleção;
- exibir o ícone e a descrição da opção atualmente selecionada;
- substituir o seletor livre de cor por uma paleta pequena de cores
  predefinidas, reconhecíveis e adequadas à identidade visual das categorias;
- manter o envio e a validação dos valores atuais de `icon` e `color` sem
  alterar o modelo de dados.

## Decisão de interface

### Seletor de ícone

- criar um seletor visual que apresente o SVG Lucide e a descrição de cada
  opção;
- continuar usando `CATEGORY_ICON_OPTIONS` como fonte única dos valores e
  rótulos permitidos;
- renderizar os SVGs exclusivamente com o helper `lucideIcon`, sem adicionar
  SVGs avulsos;
- manter a opção `Sem ícone` clara e selecionável;
- mostrar no controle fechado o ícone e o rótulo atualmente selecionados;
- permitir abrir e fechar a lista por clique, fechar ao clicar fora e fechar
  com `Escape`;
- oferecer seleção e navegação por teclado;
- preservar um `select` nativo como fallback quando o JavaScript não estiver
  disponível, aplicando a interface visual como aprimoramento progressivo;
- garantir que somente o campo `icon` esperado pelo servidor seja enviado no
  formulário.

Um `select` HTML nativo não deve receber SVG dentro de `option`, pois essa
renderização não é suportada de forma consistente pelos navegadores. A exibição
visual deve ser feita por um controle acessível associado ao valor do campo
nativo.

### Paleta de cores

- substituir o `input type="color"` por opções visuais de seleção única;
- exibir cada opção como uma amostra de cor acompanhada de nome textual ou
  texto acessível;
- usar inicialmente a seguinte paleta:
  - Vermelho: `#DC2626`;
  - Laranja: `#EA580C`;
  - Amarelo: `#EAB308`;
  - Verde: `#16A34A`;
  - Verde-petróleo: `#0F766E`;
  - Ciano: `#0891B2`;
  - Azul: `#2563EB`;
  - Índigo: `#4F46E5`;
  - Roxo: `#9333EA`;
  - Magenta: `#C026D3`;
  - Rosa: `#DB2777`;
  - Marrom: `#92400E`;
- manter `#0F766E` como cor padrão para novas categorias;
- armazenar o valor escolhido no campo `color`, no formato hexadecimal já
  aceito pelo servidor;
- indicar visualmente e semanticamente qual cor está selecionada;
- centralizar a definição dos valores e rótulos da paleta para evitar
  duplicação entre renderização e validação;
- usar classes CSS predefinidas para as amostras, sem depender de atributo
  `style`, em conformidade com a política `Content-Security-Policy` atual.

## Compatibilidade com categorias existentes

- não migrar nem regravar categorias já persistidas;
- ao editar uma categoria cuja cor pertença à paleta, marcar a opção
  correspondente;
- ao editar uma categoria com cor válida que não pertença à paleta, preservar
  o valor enquanto o usuário não escolher outra cor;
- representar uma cor legada fora da paleta como `Cor atual`, sem habilitar
  novamente a seleção livre;
- depois que o usuário escolher uma cor da paleta, enviar e persistir a nova
  opção normalmente;
- manter a normalização e a validação hexadecimal já usadas pelo sistema.

## Escopo técnico

- alterar o formulário de criação e edição em `src/views/categoriesView.js`;
- reutilizar os helpers de `src/services/viewHelpers.js` quando apropriado;
- manter a lista de ícones em `src/services/categoryIconService.js` como fonte
  única;
- criar um serviço ou constante compartilhada para a paleta caso isso reduza
  duplicação e mantenha a validação fora da view;
- adicionar ao `public/js/app.js` apenas o comportamento necessário ao seletor
  visual de ícones;
- adicionar estilos localizados em `public/css/styles.css`;
- preservar as rotas, os nomes dos campos e o contrato atual do formulário;
- adicionar testes para a renderização e para os fallbacks relevantes, seguindo
  a estrutura de testes existente no projeto.

## Acessibilidade

- o controle visual de ícones deve expor nome, estado aberto/fechado e opção
  selecionada para tecnologias assistivas;
- a navegação por teclado deve permitir alcançar e selecionar todas as opções;
- o foco deve permanecer visível no acionador, nas opções de ícone e nas cores;
- o significado das cores não pode depender somente da amostra visual: cada
  opção deve possuir nome acessível;
- a seleção atual deve ser identificável sem depender apenas da cor;
- os ícones decorativos não devem provocar leitura redundante por leitores de
  tela;
- o formulário deve permanecer utilizável com zoom e em layout mobile.

## Fora de escopo

- alterar a tabela ou o model de categorias;
- permitir entrada manual de hexadecimal, RGB ou seletor de cor livre;
- alterar a identidade visual das categorias nas listagens já cobertas pelas
  tasks anteriores;
- modificar competência, lançamentos, recorrências, baixas ou outras regras
  financeiras;
- incluir bibliotecas externas para implementar o seletor;
- flexibilizar a política `Content-Security-Policy`.

## Critérios de aceite

- o seletor aberto mostra o ícone Lucide ao lado da descrição de cada opção;
- o controle fechado mostra o ícone e a descrição atualmente selecionados;
- `Sem ícone` continua disponível e é enviado corretamente;
- o campo `icon` enviado mantém um valor aceito por
  `normalizeCategoryIcon`;
- sem JavaScript, o formulário continua permitindo escolher o ícone por um
  `select` nativo;
- o seletor livre de cor deixa de ser exibido no formulário;
- a paleta apresenta as 12 cores definidas com nomes acessíveis;
- somente uma cor pode ser selecionada por vez;
- novas categorias usam `#0F766E` por padrão;
- criação e edição persistem a cor selecionada no formato hexadecimal;
- uma cor legada fora da paleta é preservada se o usuário não a alterar;
- escolher uma opção da paleta substitui corretamente uma cor legada;
- foco, teclado, `Escape` e clique fora funcionam no seletor de ícones;
- não são introduzidos estilos inline nem violações de CSP;
- o formulário permanece adequado em desktop e mobile;
- `npm run check` termina sem erros;
- os testes automatizados relacionados terminam sem erros.

## Validação sugerida

- criar categoria com ícone e cor da paleta;
- criar categoria usando `Sem ícone`;
- editar categoria e trocar somente o ícone;
- editar categoria e trocar somente a cor;
- editar categoria com uma cor legada fora da paleta sem alterar o campo;
- substituir uma cor legada por uma cor da paleta;
- testar o seletor de ícones com mouse e somente com teclado;
- testar o fallback com JavaScript desabilitado;
- verificar a apresentação em largura desktop e mobile;
- confirmar no console do navegador que não há violações de CSP;
- executar `npm run check` e a suíte automatizada relacionada.

---

## Assinatura da LLM

- Data: 01/08/2026 15:41
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Implementação concluída

- criado seletor visual de ícones com SVGs do `lucide-static`, descrição,
  indicação da opção atual e lista rolável;
- preservado o `select` nativo como fallback sem JavaScript;
- adicionadas interações por mouse e teclado, incluindo setas, `Home`, `End`,
  `Enter`, espaço, `Escape`, `Tab` e fechamento por clique fora;
- substituído o seletor livre por uma paleta acessível com as 12 cores
  predefinidas;
- centralizados valores, rótulos, cor padrão e normalização em um serviço de
  cores de categoria;
- cores legadas válidas fora da paleta são preservadas como `Cor atual` até que
  o usuário selecione outra opção;
- adicionados estilos responsivos sem `style` inline ou flexibilização da CSP;
- adicionados testes unitários da paleta, normalização, fallback, renderização e
  compatibilidade com cores legadas;
- atualizada a identificação da release para `Release 01/08/2026 15:54 - 097`.

## Validações executadas

- `npm run check`: 119 arquivos JavaScript validados;
- `npm test`: 113 testes aprovados;
- validação visual em desktop do seletor aberto, ícones, descrições e paleta;
- validação de seleção do ícone `Moradia` e persistência do valor `house` no
  campo nativo;
- validação de seleção exclusiva da cor `Vermelho` com valor `#DC2626`;
- validação responsiva em viewport de 390 x 844 pixels, sem overflow horizontal;
- console do navegador sem erros ou alertas durante a validação.

---

## Assinatura da LLM

- Data: 01/08/2026 15:54
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Refinamento da variedade da paleta

- mantido o limite de 12 cores;
- incluídas explicitamente as cores primárias vermelho, amarelo e azul;
- redistribuídas as demais opções para ampliar a diferenciação entre matizes;
- a paleta final passou a usar vermelho, laranja, amarelo, verde,
  verde-petróleo, ciano, azul, índigo, roxo, magenta, rosa e marrom;
- removidas opções visualmente próximas ou neutras que reduziam a variedade,
  como violeta, fúcsia, âmbar, lima e ardósia;
- preservado `#0F766E` como padrão para novas categorias;
- atualizada a identificação da release para `Release 01/08/2026 16:00 - 098`;
- repetidos `npm run check`, os 113 testes automatizados e a validação visual,
  sem erros.

---

## Assinatura da LLM

- Data: 01/08/2026 16:00
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
