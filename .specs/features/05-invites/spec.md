# Invites Specification

**Approved**: 2026-11-23 - user: "Aprovo a spec como está."
**Amended**: 2026-11-23 - no Design: robôs de preview têm limite próprio de 600 por minuto por IP (INV-02 AC 14 e AC 15), user: "Limite próprio de 600/min (Recomendado)", entre essa, "Manter 60/min para todos" e "Robôs sem limite"; acima do limite por IP, abrir e entrar respondem 429 antes de procurar o código (INV-02 AC 16, exceção ao AD-016), user: "429 antes no convite (Recomendado)", entre essa e "Manter a ordem do AD-016".

## Problem Statement

Um grupo hoje só tem quem o criou: não há como chamar ninguém, e o sorteio da `06-draw` precisa de pelo menos três participantes aprovados. O convite chega quase sempre pelo WhatsApp e é aberto no celular, muitas vezes por quem ainda não tem conta; o organizador precisa espalhar o link, decidir quem entra quando o grupo exige aprovação, tirar quem não deveria estar lá e, se precisar, passar a organização a outra pessoa.

## Goals

- [ ] Pelo celular, uma pessoa sem conta sai do link recebido no WhatsApp, cria a conta e entra no grupo em menos de 2 minutos.
- [ ] Quem organiza vê, numa aba do grupo, quem está dentro e quem espera aprovação, e decide cada pedido com um toque.
- [ ] Gerar um link novo barra o link antigo na hora, e ninguém de fora descobre que um grupo existe sem um link válido.
- [ ] A `06-draw` encontra participantes aprovados, pendentes e a regra de que grupo sorteado não aceita entrada nem saída, sem refazer o modelo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Link de convite próprio para cada e-mail | Decisão do usuário: o e-mail leva o link do grupo - user: "O mesmo link do grupo (Recomendado)". |
| Lista dos convites por e-mail enviados e "Reenviar" | Decisão do usuário - user: "Não mostra (Recomendado)". |
| Cancelar o próprio pedido de entrada | Decisão do usuário - user: "Não (Recomendado)". |
| Transferir a organização de um grupo ENCERRADO | Decisão do usuário - user: "ABERTO e SORTEADO (Recomendado)". |
| Imagem de preview com o nome do grupo | Decisão do usuário: imagem fixa - user: "Imagem fixa da marca (Recomendado)". |
| Sorteio, cancelar sorteio e a passagem para SORTEADO | Feature `06-draw`; aqui os grupos SORTEADOS dos testes são criados direto no banco. |
| Transferência exigida antes de excluir a conta (RN12, RN15) | Feature `11-account-deletion`. |
| Apagar convites por e-mail não aceitos ao encerrar o grupo (`scope.md` 8.1) | Feature `10-lifecycle`. |
| Abas de lista de desejos, mural e mensagens | Cada uma nasce com a feature dela (`07`, `08`, `09`). |
| Convite e lembretes pela API oficial do WhatsApp | Pós-MVP (`scope.md` 4.9). |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Lugar do convite e da lista | Abas "Grupo" (`/grupos/{id}`) e "Participantes" (`/grupos/{id}/participantes`); o convite fica no topo da aba Participantes | As próximas features acrescentam uma aba cada | y - user: "Abas Grupo e Participantes (Recomendado)", "/grupos/{id} e /grupos/{id}/participantes (Recomendado)" |
| Quem compartilha o link | Todo participante aprovado; só quem organiza gera link novo | Como o InviteBlock do design system | y - user: "Todo participante aprovado (Recomendado)" |
| Quem vê a lista | Todo participante aprovado vê os aprovados; pendentes, recusados e ações só para quem organiza | Participante sabe com quem vai trocar | y - user: "Todos veem os aprovados (Recomendado)" |
| Entrada pelo link | Botão na página do convite; abrir o link não faz entrar | Evita entrar por engano | y - user: "Botão \"Entrar no grupo\" (Recomendado)" |
| O que o convite mostra | Nome do grupo e nome de quem organiza, a qualquer pessoa com o link | Mínimo do `scope.md` 4.3 | y - user: "Nome e organizador (Recomendado)" |
| E-mail não confirmado | Pode entrar, como pode criar grupo | Menos atrito no celular | y - user: "Pode entrar (Recomendado)" |
| Recusa | A pessoa recusada não pede de novo; quem organiza vê os recusados e pode aprová-los | Recusar tem efeito enquanto o link for o mesmo | y - user: "Bloqueia; organizador pode aprovar depois (Recomendado)" |
| Desligar a aprovação | Desmarcar "Exigir aprovação para entrar" aprova os pendentes do grupo | Pendente sobrando travaria o sorteio (RN03) | y - user: "Viram aprovados (Recomendado)" |
| Quem convida por e-mail | Só quem organiza; diverge do InviteBlock do design system | E-mail a terceiros sai do nosso domínio | y - user: "Só quem organiza (Recomendado)" |
| Convites enviados | A tela não lista; o envio é gravado (grupo, e-mail, data) para a retenção da `10-lifecycle` | Modelo `EmailInvite` do `scope.md` 6 | y - user: "Não mostra (Recomendado)" |
| Limite do e-mail | Até 20 endereços por envio e 100 por grupo em 24 horas | Cabe uma empresa em poucos envios | y - user: "20 por envio, 100 por dia por grupo (Recomendado)" |
| Link do e-mail | O link do grupo; gerar link novo invalida os e-mails já enviados | Como o design system | y - user: "O mesmo link do grupo (Recomendado)" |
| Removido | Vira recusado: não volta pelo link; quem organiza pode aprovar depois | Remover tem efeito sem trocar o link | y - user: "Não; vira recusada (Recomendado)" |
| Transferir | Com o grupo ABERTO ou SORTEADO | ENCERRADO é só leitura | y - user: "ABERTO e SORTEADO (Recomendado)" |
| Aviso de pedido | Um e-mail a quem organiza por pedido | Simples | y - user: "Um e-mail por pedido (Recomendado)" |
| Avisos além da tabela 4.7 | Removido (à pessoa), nova organização (a quem recebe), saída (a quem organiza), entrada sem aprovação (a quem organiza) | Pedido do usuário | y - user: "Removido do grupo (Recomendado), Nova organização (Recomendado), Alguém saiu do grupo, Alguém entrou no grupo" |
| Ordem da lista | Pendentes, aprovados por nome, recusados por último (só para quem organiza) | Quem organiza vê primeiro o que decidir | y - user: "Pendentes, depois por nome (Recomendado)" |
| Paginação | "Carregar mais", 20 por vez; busca por nome na API | Celular primeiro; sem limite de participantes (RN14) | y - user: "\"Carregar mais\", 20 por vez (Recomendado)" |
| Imagem do preview | Imagem fixa da marca, 1200 x 630, gerada com o `next/og` do Next | Sem dependência nova | y - user: "Imagem fixa da marca (Recomendado)" |
| Quem já participa abre o link | Vai direto para `/grupos/{id}` | Um toque a menos | y - user: "Vai direto para o grupo (Recomendado)" |
| Pendente em "Meus grupos" | Card sem link na seção Ativos, com nome, "Organizado por {nome}" e a tag "Aguardando aprovação" | A pessoa acha o pedido sem o link | y - user: "Sim, card sem link (Recomendado)" |
| Eventos | `invite.viewed`, `membership.requested`, `membership.joined`, `membership.approved`, `membership.rejected`, `membership.left`, `membership.removed`, `invite.regenerated`, `invite.emails_sent`, `group.ownership_transferred` | Métricas e funil do `scope.md` 8 e 10 (AD-005) | y - user: "invite.viewed (Recomendado), Entradas (Recomendado), Saídas (Recomendado), Convite e organização (Recomendado)" |
| Código do convite | 10 caracteres sorteados com fonte criptográfica do alfabeto `23456789abcdefghjkmnpqrstuvwxyz` (sem 0, 1, i, l, o); a URL aceita maiúsculas; grupos já existentes ganham código na migration | Não sequencial nem adivinhável (`scope.md` 8); fácil de ditar | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Limites de tentativa | Abrir ou usar convite: 60 por minuto por IP, e 600 para robôs de preview (emenda de 2026-11-23); entrar em grupo: 30 por hora por conta; gerar link novo: 10 por hora por grupo; acima, 429 "Muitas tentativas. Tente de novo em N minutos." | Freia adivinhar códigos (`scope.md` 8) sem atrapalhar uso real | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Prioridades | Todas as histórias P1 | O `scope.md` marca todas como MVP | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Página do convite, logado | `h1` com o nome do grupo, "Organizado por {nome}" e o botão "Entrar no grupo"; com aprovação, o texto "Quem organiza precisa aprovar sua entrada." e o botão "Pedir para entrar" | A pessoa sabe antes de tocar | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Página do convite, sem login | Nome e organizador, o texto "Para entrar no grupo, entre na sua conta ou crie uma." e os links "Entrar" (`/entrar?next=/convite/{código}`) e "Criar conta" (`/cadastro?next=/convite/{código}`) | Volta ao convite pelo destino de origem da `03-auth` | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Textos de estado do convite | Pendente: "Seu pedido está aguardando a aprovação de {organizador}."; recusado: "Sua entrada neste grupo não foi aprovada."; SORTEADO: "Este grupo já fez o sorteio e não aceita novas entradas."; ENCERRADO: "Este grupo foi encerrado e não aceita novas entradas."; código inválido: título "Convite não encontrado" e "Este link de convite não vale mais. Peça um link novo a quem organiza o grupo." | Cada estado diz o que fazer | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Textos do preview | Título "Convite: {nome do grupo}"; descrição "{organizador} convidou você para o amigo secreto."; código inválido: título "Convite do Amigo Secreto", sem dados de grupo | Preview diz de quem é o convite | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Mensagem do WhatsApp | "Vamos fazer amigo secreto! Entre no grupo {nome}: {link}", aberta por `https://wa.me/?text=` | Nome e link já escritos (design system) | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Bloco de convite | Botão principal "Compartilhar no WhatsApp"; o link inteiro num campo só leitura com "Copiar link", aviso "Link copiado" (se o navegador recusar, o link fica selecionado); quem organiza vê também "Convidar por e-mail" e "Gerar novo link"; com o grupo SORTEADO ou ENCERRADO, o bloco vira o aviso do estado | InviteBlock do design system | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Campo de e-mails | Um campo "E-mails", separados por vírgula, ponto e vírgula, espaço ou quebra de linha; repetidos (sem diferenciar maiúsculas) contam uma vez; envio para todos, mesmo quem já participa; sucesso: "Convite enviado para 1 e-mail." / "Convites enviados para N e-mails." | Sem consulta de contas por e-mail | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Gerar novo link | ConfirmDialog "Gerar um novo link?" / "O link atual e os convites por e-mail já enviados deixam de funcionar. Quem já entrou continua no grupo." / "Gerar novo link" e "Manter link"; depois, aviso "Novo link gerado" | Botões repetem a ação (ConfirmDialog) | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Remover | Menu da linha do aprovado, só com o grupo ABERTO; ConfirmDialog "Remover {nome} do grupo?" / "{nome} sai do grupo e só volta se você aprovar." / "Remover do grupo" e "Manter no grupo" | ParticipantRow do design system | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Recusar | Sem confirmação, porque dá para aprovar depois | Um toque por pedido | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Sair | Botão "Sair do grupo" na aba Grupo, para quem não organiza, com o grupo ABERTO; ConfirmDialog "Sair do grupo {nome}?" / "Você deixa de ver o grupo. Para voltar, use o link de convite de novo." / "Sair do grupo" e "Ficar no grupo"; leva a `/grupos`; quem sai pode voltar pelo link, como qualquer pessoa | Sair é escolha da pessoa, diferente de ser removida | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Quem organiza e quer sair | Não vê "Sair do grupo"; a API responde 409 "Transfira a organização antes de sair do grupo." Sozinho no grupo, exclui o grupo | RN15 | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Transferir | Menu da linha de outro aprovado; ConfirmDialog "Passar a organização para {nome}?" / "{nome} passa a cuidar do grupo, dos convites e do sorteio. Você continua no grupo como participante." / "Transferir organização" e "Manter organização"; depois a página recarrega sem as ações de quem organiza | RN15 | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Linha da lista | Avatar (foto ou iniciais), nome em uma linha com reticências, tag "Organiza" em quem organiza, tag "Pendente" ou "Recusado"; nunca o e-mail | ParticipantRow do design system | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Busca | Campo "Buscar participante"; ignora maiúsculas e acentos; sem resultado: "Ninguém encontrado com esse nome." | Nomes com acento são comuns | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Pendentes no card | Para quem organiza, "1 pendente" / "N pendentes" no card do grupo quando há pedidos | GroupCard do design system | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Textos dos e-mails | Na história "Avisos por e-mail" (INV-12) | Assunto diz o que é; um botão por e-mail, como na `04-groups` | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Payload dos eventos | `groupId` em todos; `invite.emails_sent` com `count`; `membership.approved` com `trigger` (`manual` ou `auto`); `membership.joined` sem dado de pessoa. Nenhum nome, e-mail, código de convite ou id de pessoa | Métrica sem dado pessoal (LGPD), como na `04-groups` | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Revisões da `04-groups` | GRP-02 AC 2 passa a mostrar também os pedidos pendentes (card sem link); GRP-03 ganha as abas | Consequência das decisões acima | y - user: "Aprovo a spec como está." (proposto pelo agente) |
| Acessibilidade e larguras | `/convite/{código}`, `/grupos/{id}/participantes`, `/grupos/{id}` e `/grupos` sem violações WCAG 2.1 A/AA (axe) nos temas claro e escuro e sem rolagem horizontal em 360 px e 1440 px | Mesmas regras da `04-groups` (`scope.md` 8) | y - user: "Aprovo a spec como está." (proposto pelo agente) |

**Open questions:** none - as decisões de produto foram respondidas pelo usuário, e os padrões propostos pelo agente foram confirmados na aprovação da spec.

---

## User Stories

### P1: Compartilhar o link ⭐ MVP

**User Story**: Como participante, quero mandar o link do grupo pelo WhatsApp ou copiá-lo, para chamar as pessoas onde elas estão.

**Why P1**: É por onde o convite circula (`scope.md` 4.3, 9.1).

**Acceptance Criteria**:

1. WHEN um participante aprovado abre `/grupos/{id}/participantes` de um grupo ABERTO THEN o site SHALL mostrar o bloco de convite com o botão "Compartilhar no WhatsApp" e o link `{site}/convite/{código}` inteiro num campo só leitura com o botão "Copiar link".
2. WHEN o participante usa "Compartilhar no WhatsApp" THEN o site SHALL abrir `https://wa.me/?text=` com o texto "Vamos fazer amigo secreto! Entre no grupo {nome}: {link}".
3. WHEN o participante usa "Copiar link" e o navegador permite THEN o site SHALL copiar o link e mostrar o aviso "Link copiado".
4. IF o navegador recusa a cópia THEN o site SHALL selecionar o texto do link no campo.
5. The bloco de convite SHALL mostrar "Convidar por e-mail" e "Gerar novo link" só para quem organiza o grupo.
6. WHILE o grupo está SORTEADO o site SHALL trocar o bloco de convite pelo aviso "Este grupo já fez o sorteio e não aceita novas entradas."
7. WHILE o grupo está ENCERRADO o site SHALL trocar o bloco de convite pelo aviso "Este grupo foi encerrado e não aceita novas entradas."
8. WHEN um grupo é criado THEN o sistema SHALL dar a ele um código de convite de 10 caracteres do alfabeto `23456789abcdefghjkmnpqrstuvwxyz`, sorteados com fonte criptográfica e únicos entre os grupos.

**Independent Test**: Num grupo ABERTO, um participante que não organiza vê o link e o botão do WhatsApp, sem "Gerar novo link"; num grupo SORTEADO criado no banco, vê o aviso no lugar do bloco.

---

### P1: Página do convite ⭐ MVP

**User Story**: Como pessoa que recebeu o link, quero ver de que grupo é e quem organiza, para decidir entrar.

**Why P1**: É a primeira tela de quem é convidado, quase sempre no celular.

**Acceptance Criteria**:

1. WHEN uma pessoa sem sessão abre `/convite/{código}` de um grupo ABERTO THEN o site SHALL mostrar o nome do grupo, "Organizado por {nome}", o texto "Para entrar no grupo, entre na sua conta ou crie uma." e os links "Entrar", para `/entrar?next=/convite/{código}`, e "Criar conta", para `/cadastro?next=/convite/{código}`.
2. The página do convite SHALL mostrar do grupo só o nome e o nome de quem organiza, a quem não participa dele.
3. WHEN uma pessoa logada que não tem participação abre o convite de um grupo ABERTO sem aprovação THEN o site SHALL mostrar o botão "Entrar no grupo".
4. WHEN uma pessoa logada que não tem participação abre o convite de um grupo ABERTO com aprovação THEN o site SHALL mostrar o texto "Quem organiza precisa aprovar sua entrada." e o botão "Pedir para entrar".
5. WHEN um participante aprovado abre o convite do próprio grupo THEN o site SHALL levar a `/grupos/{id}`.
6. WHEN uma pessoa com pedido pendente abre o convite THEN o site SHALL mostrar "Seu pedido está aguardando a aprovação de {organizador}." sem botão de entrar.
7. WHEN uma pessoa recusada ou removida abre o convite THEN o site SHALL mostrar "Sua entrada neste grupo não foi aprovada." sem botão de entrar.
8. WHEN o grupo do convite está SORTEADO THEN o site SHALL mostrar "Este grupo já fez o sorteio e não aceita novas entradas." sem botão de entrar.
9. WHEN o grupo do convite está ENCERRADO THEN o site SHALL mostrar "Este grupo foi encerrado e não aceita novas entradas." sem botão de entrar.
10. IF o código não existe ou foi trocado por um link novo THEN a API SHALL responder 404 e o site SHALL mostrar o título "Convite não encontrado" e o texto "Este link de convite não vale mais. Peça um link novo a quem organiza o grupo."
11. WHEN o código chega com letras maiúsculas THEN o sistema SHALL tratá-lo como o mesmo código em minúsculas.
12. WHEN um robô de preview lê `/convite/{código}` válido THEN o site SHALL responder com as meta tags Open Graph de título "Convite: {nome do grupo}", descrição "{organizador} convidou você para o amigo secreto." e a imagem fixa da marca de 1200 x 630.
13. IF o código do preview é inválido THEN o site SHALL usar o título "Convite do Amigo Secreto", sem nome de grupo nem de pessoa.
14. IF um IP que não é robô de preview abre ou usa mais de 60 convites no mesmo minuto THEN a API SHALL responder 429 e o site SHALL mostrar "Muitas tentativas. Tente de novo em N minutos." ("em 1 minuto." quando N = 1).
15. IF um robô de preview (reconhecido pelo User-Agent) lê mais de 600 convites no mesmo minuto a partir do mesmo IP THEN a API SHALL responder 429 e o site SHALL montar o preview sem dados de grupo, como em AC 13.
16. WHILE o IP está acima do limite a API SHALL responder 429 a abrir e a entrar por qualquer código, existente ou não, sem procurar o código.

**Independent Test**: Sem sessão, o convite mostra nome, organizador e os dois links com `next`; um código trocado mostra "Convite não encontrado" igual a um código que nunca existiu.

---

### P1: Entrar no grupo ⭐ MVP

**User Story**: Como pessoa convidada, quero entrar no grupo com um toque, para participar do sorteio.

**Why P1**: Sem entrada não há participantes nem sorteio (RN03).

**Acceptance Criteria**:

1. WHEN uma pessoa logada usa "Entrar no grupo" num grupo ABERTO sem aprovação THEN o sistema SHALL criar a participação aprovada e levar a `/grupos/{id}`.
2. WHEN uma pessoa logada usa "Pedir para entrar" num grupo ABERTO com aprovação THEN o sistema SHALL criar a participação pendente e mostrar na página do convite "Seu pedido está aguardando a aprovação de {organizador}."
3. WHILE o e-mail da conta não está confirmado o sistema SHALL aceitar a entrada como para uma conta confirmada.
4. IF a pessoa já tem participação no grupo (aprovada, pendente ou recusada) THEN o sistema SHALL manter a participação como está, sem criar outra (RN09), e responder com o estado dela.
5. IF o grupo está SORTEADO THEN a API SHALL responder 409 "Este grupo já fez o sorteio e não aceita novas entradas." e não criar participação (RN07).
6. IF o grupo está ENCERRADO THEN a API SHALL responder 409 "Este grupo foi encerrado e não aceita novas entradas." e não criar participação.
7. IF o código não existe ou foi trocado THEN a API SHALL responder 404 "Convite não encontrado." e não criar participação.
8. IF a conta já entrou ou pediu para entrar em 30 grupos na janela de 1 hora em curso THEN a API SHALL responder 429 com "Muitas tentativas. Tente de novo em N minutos." e não criar participação.
9. WHILE a entrada espera a resposta o site SHALL desabilitar o botão e mostrar "Entrando…".
10. IF a entrada falha por erro inesperado (5xx ou rede) THEN o site SHALL mostrar "Não foi possível entrar no grupo. Tente de novo." e manter o botão.
11. WHEN uma pessoa sem conta sai do convite por "Criar conta", com e-mail e senha ou com Google, THEN o site SHALL trazê-la de volta a `/convite/{código}` depois do cadastro.

**Independent Test**: Uma pessoa logada entra num grupo sem aprovação e cai na página dele; noutro grupo com aprovação, fica pendente; o mesmo pedido num grupo SORTEADO criado no banco devolve 409.

---

### P1: Aprovar e recusar ⭐ MVP

**User Story**: Como organizador de um grupo com aprovação, quero aprovar ou recusar cada pedido, para decidir quem participa.

**Why P1**: "Exigir aprovação" já existe na `04-groups` e só faz sentido com esta decisão (`scope.md` 4.3).

**Acceptance Criteria**:

1. WHEN quem organiza abre `/grupos/{id}/participantes` THEN o site SHALL mostrar cada pedido pendente com a tag "Pendente" e os botões "Aprovar {nome}" e "Recusar {nome}" (rótulos acessíveis com o nome).
2. WHEN quem organiza usa "Aprovar" THEN o sistema SHALL passar a participação para aprovada e mostrar a pessoa entre os aprovados.
3. WHEN quem organiza usa "Recusar" THEN o sistema SHALL passar a participação para recusada, sem confirmação, e mostrar a pessoa entre os recusados com a tag "Recusado" e o botão "Aprovar {nome}".
4. WHEN quem organiza aprova uma pessoa recusada com o grupo ABERTO THEN o sistema SHALL passar a participação para aprovada.
5. WHEN quem organiza desmarca "Exigir aprovação para entrar" e salva o grupo THEN o sistema SHALL aprovar, na mesma transação, todos os pedidos pendentes do grupo.
6. IF o grupo não está ABERTO THEN a API SHALL responder 409 "Com o sorteio feito, ninguém entra nem sai do grupo." a aprovar ou recusar, sem mudar a participação (RN07).
7. IF quem aprova ou recusa é participante aprovado mas não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e não mudar a participação.
8. IF a participação não existe ou não é do grupo THEN a API SHALL responder 404 "Participante não encontrado." e não mudar nada.
9. IF a participação já está no estado pedido THEN a API SHALL devolver o estado atual sem enviar outro aviso.
10. The sistema SHALL não mostrar pendentes nem recusados a quem não organiza o grupo, nem pela tela nem pela API.

**Independent Test**: Num grupo com aprovação, o organizador aprova um pedido e recusa outro; o recusado aparece com "Aprovar" e, aprovado depois, vai para a lista; um participante comum recebe 403 ao tentar aprovar pela API.

---

### P1: Lista de participantes ⭐ MVP

**User Story**: Como participante, quero ver quem está no grupo e achar alguém pelo nome, mesmo num grupo grande.

**Why P1**: Não há limite de participantes (RN14); o organizador acompanha quem entrou (`scope.md` 4.3).

**Acceptance Criteria**:

1. WHEN um participante aprovado abre `/grupos/{id}/participantes` THEN o site SHALL listar os participantes aprovados por nome, em ordem alfabética, com avatar (foto ou iniciais), nome em uma linha com reticências e a tag "Organiza" em quem organiza.
2. WHEN quem organiza abre a lista THEN o site SHALL mostrar primeiro os pendentes, depois os aprovados por nome e por último os recusados.
3. The lista SHALL trazer 20 pessoas por vez e mostrar "Carregar mais" enquanto houver mais pessoas, acrescentando as 20 seguintes ao final.
4. WHEN a pessoa digita em "Buscar participante" THEN a API SHALL devolver só quem tem o termo no nome, sem diferenciar maiúsculas nem acentos, na mesma ordem e paginação.
5. IF a busca não encontra ninguém THEN o site SHALL mostrar "Ninguém encontrado com esse nome."
6. The lista e a API dela SHALL não mostrar o e-mail de ninguém.
7. The aba SHALL mostrar o total de participantes aprovados ("1 participante", "N participantes").
8. IF a pessoa não é participante aprovada do grupo THEN a API SHALL responder 404 "Grupo não encontrado." e o site SHALL mostrar "Grupo não encontrado.", igual a um grupo que não existe (AD-016).

**Independent Test**: Num grupo com 25 aprovados criados no banco, a lista mostra 20 em ordem alfabética e "Carregar mais" traz os 5 restantes; buscar "joao" encontra "João".

---

### P1: Abas e Meus grupos ⭐ MVP

**User Story**: Como participante, quero chegar à lista e ao convite a partir do grupo e ver em "Meus grupos" os pedidos que fiz e os que esperam por mim.

**Why P1**: Liga o convite ao resto da área logada.

**Acceptance Criteria**:

1. WHEN um participante aprovado abre `/grupos/{id}` ou `/grupos/{id}/participantes` THEN o site SHALL mostrar as abas "Grupo" e "Participantes", com a aba da página atual marcada.
2. WHEN a pessoa usa uma aba THEN o site SHALL levar à rota dela (`/grupos/{id}` ou `/grupos/{id}/participantes`).
3. WHEN uma pessoa com pedido pendente abre `/grupos` THEN o site SHALL mostrar o grupo na seção "Ativos" num card sem link, com o nome, "Organizado por {nome}" e a tag "Aguardando aprovação".
4. The `/grupos` SHALL não mostrar grupos em que a pessoa foi recusada ou removida.
5. WHEN quem organiza abre `/grupos` e o grupo tem pedidos pendentes THEN o card SHALL mostrar "1 pendente" ou "N pendentes".
6. IF a pessoa com pedido pendente abre `/grupos/{id}` THEN a API SHALL responder 404 "Grupo não encontrado." (GRP-03 AC 10).

**Independent Test**: Uma pessoa pendente vê o card "Aguardando aprovação" sem link; o organizador vê "2 pendentes" no card do mesmo grupo; as abas levam de uma rota à outra.

---

### P1: Remover participante ⭐ MVP

**User Story**: Como organizador, quero remover alguém do grupo enquanto ele está aberto, para corrigir um convite que chegou a quem não devia.

**Why P1**: `scope.md` 4.3 e RN10.

**Acceptance Criteria**:

1. WHILE o grupo está ABERTO o site SHALL mostrar a quem organiza, na linha de cada outro participante aprovado, um menu de ações com "Remover do grupo".
2. WHEN quem organiza usa "Remover do grupo" THEN o site SHALL abrir a confirmação "Remover {nome} do grupo?", com o texto "{nome} sai do grupo e só volta se você aprovar." e os botões "Remover do grupo" e "Manter no grupo".
3. WHEN quem organiza confirma THEN o sistema SHALL passar a participação para recusada e tirar a pessoa dos aprovados.
4. WHEN quem organiza usa "Manter no grupo", aperta Esc ou toca fora THEN o site SHALL fechar a confirmação sem mudar nada.
5. IF o grupo não está ABERTO THEN a API SHALL responder 409 "Com o sorteio feito, ninguém entra nem sai do grupo." e não remover (RN07).
6. IF o alvo é quem organiza o grupo THEN a API SHALL responder 409 "Quem organiza não pode ser removido." e não remover.
7. IF quem remove é participante aprovado mas não organiza THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e não remover.

**Independent Test**: O organizador remove um participante de um grupo ABERTO; a pessoa some dos aprovados, aparece em recusados e não entra de novo pelo link; num grupo SORTEADO a API devolve 409.

---

### P1: Sair do grupo ⭐ MVP

**User Story**: Como participante, quero sair de um grupo aberto, para não entrar num sorteio de que não vou participar.

**Why P1**: `scope.md` 4.3.

**Acceptance Criteria**:

1. WHILE o grupo está ABERTO o site SHALL mostrar o botão "Sair do grupo" na aba Grupo a quem participa e não organiza.
2. WHEN a pessoa usa "Sair do grupo" THEN o site SHALL abrir a confirmação "Sair do grupo {nome}?", com o texto "Você deixa de ver o grupo. Para voltar, use o link de convite de novo." e os botões "Sair do grupo" e "Ficar no grupo".
3. WHEN a pessoa confirma THEN o sistema SHALL apagar a participação dela e levar a `/grupos`, onde o grupo não aparece.
4. WHEN quem saiu abre o link de convite de novo THEN o sistema SHALL tratá-la como uma pessoa que nunca participou.
5. IF o grupo não está ABERTO THEN a API SHALL responder 409 "Com o sorteio feito, ninguém entra nem sai do grupo." e manter a participação (RN07).
6. IF quem pede para sair organiza o grupo THEN a API SHALL responder 409 "Transfira a organização antes de sair do grupo." e manter a participação (RN15).
7. The site SHALL não mostrar "Sair do grupo" a quem organiza o grupo.

**Independent Test**: Um participante sai de um grupo ABERTO e o grupo some de "Meus grupos"; o organizador recebe 409 pela API; num grupo SORTEADO o participante recebe 409.

---

### P1: Transferir a organização ⭐ MVP

**User Story**: Como organizador, quero passar a organização a outro participante, para que outra pessoa cuide do grupo.

**Why P1**: RN15; a `11-account-deletion` depende dela.

**Acceptance Criteria**:

1. WHILE o grupo está ABERTO ou SORTEADO o site SHALL mostrar a quem organiza, no menu de cada outro participante aprovado, "Transferir organização".
2. WHEN quem organiza usa "Transferir organização" THEN o site SHALL abrir a confirmação "Passar a organização para {nome}?", com o texto "{nome} passa a cuidar do grupo, dos convites e do sorteio. Você continua no grupo como participante." e os botões "Transferir organização" e "Manter organização".
3. WHEN quem organiza confirma THEN o sistema SHALL fazer da pessoa escolhida quem organiza o grupo, manter quem organizava como participante aprovado e recarregar a página sem as ações de quem organiza.
4. IF o grupo está ENCERRADO THEN a API SHALL responder 409 "Grupo encerrado não pode ser alterado." e não transferir.
5. IF a pessoa escolhida não é participante aprovada do grupo ou é quem já organiza THEN a API SHALL responder 404 "Participante não encontrado." e não transferir.
6. IF quem pede a transferência não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e não transferir.
7. The transferência SHALL não dar a quem recebe a organização acesso a nenhum resultado de sorteio (RN06, RN15).

**Independent Test**: O organizador transfere para outro participante; o novo organizador vê os botões de editar e a lista com pendentes; o antigo vê o grupo como participante e recebe 403 ao tentar editar.

---

### P1: Gerar novo link ⭐ MVP

**User Story**: Como organizador, quero trocar o link de convite, para barrar um link que se espalhou demais.

**Why P1**: `scope.md` 4.3.

**Acceptance Criteria**:

1. WHEN quem organiza usa "Gerar novo link" THEN o site SHALL abrir a confirmação "Gerar um novo link?", com o texto "O link atual e os convites por e-mail já enviados deixam de funcionar. Quem já entrou continua no grupo." e os botões "Gerar novo link" e "Manter link".
2. WHEN quem organiza confirma THEN o sistema SHALL trocar o código do grupo por um novo, mostrar o link novo no bloco e o aviso "Novo link gerado".
3. WHEN alguém abre o link antigo depois da troca THEN o site SHALL mostrar "Convite não encontrado" (INV-02 AC 10).
4. The troca SHALL manter todas as participações do grupo como estavam.
5. IF o grupo não está ABERTO THEN a API SHALL responder 409 "Com o sorteio feito, ninguém entra nem sai do grupo." e manter o código.
6. IF quem pede a troca não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e manter o código.
7. IF o grupo já trocou de link 10 vezes na janela de 1 hora em curso THEN a API SHALL responder 429 "Muitas tentativas. Tente de novo em N minutos." e manter o código.

**Independent Test**: Depois de gerar um link novo, o antigo mostra "Convite não encontrado", o novo mostra o grupo, e os participantes continuam na lista.

---

### P1: Convidar por e-mail ⭐ MVP

**User Story**: Como organizador, quero mandar o convite por e-mail, para chamar quem não está no WhatsApp do grupo.

**Why P1**: Diferencial aprovado (`scope.md` 2.2, 4.3).

**Acceptance Criteria**:

1. WHEN quem organiza usa "Convidar por e-mail" THEN o site SHALL mostrar o campo "E-mails", que aceita endereços separados por vírgula, ponto e vírgula, espaço ou quebra de linha, e o botão "Enviar convites".
2. WHEN quem organiza envia de 1 a 20 endereços válidos THEN o sistema SHALL enfileirar, na mesma transação, um e-mail de convite por endereço distinto (sem diferenciar maiúsculas), gravar grupo, e-mail e data de cada envio, e mostrar "Convite enviado para 1 e-mail." ou "Convites enviados para N e-mails."
3. IF algum endereço é inválido THEN o sistema SHALL recusar com 400, mostrar "Confira estes e-mails: {lista dos inválidos}" e não enviar nenhum.
4. IF o envio tem mais de 20 endereços distintos THEN o sistema SHALL recusar com 400, mostrar "Envie no máximo 20 e-mails por vez." e não enviar nenhum.
5. IF o campo está vazio THEN o site SHALL mostrar "Informe pelo menos um e-mail." sem enviar.
6. IF o envio faria o grupo passar de 100 convites por e-mail na janela de 24 horas em curso THEN a API SHALL responder 429 "Este grupo chegou ao limite de 100 convites por e-mail em 24 horas. Tente de novo em N horas." ("em 1 hora." quando N = 1; "em N minutos." abaixo de 1 hora) e não enviar nenhum.
7. IF o grupo não está ABERTO THEN a API SHALL responder 409 "Com o sorteio feito, ninguém entra nem sai do grupo." e não enviar.
8. IF quem envia não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e não enviar.
9. WHILE o envio espera a resposta o site SHALL desabilitar o botão e mostrar "Enviando…".

**Independent Test**: O organizador manda três endereços, um repetido em maiúsculas: dois e-mails vão para a fila com o link do grupo; um endereço inválido na lista bloqueia o envio inteiro.

---

### P1: Avisos por e-mail ⭐ MVP

**User Story**: Como participante ou organizador, quero saber por e-mail o que mudou na minha participação, sem precisar abrir o site.

**Why P1**: Tabela 4.7 do `scope.md` e os avisos pedidos pelo usuário.

**Acceptance Criteria**:

1. WHEN um convite por e-mail é enviado THEN o e-mail SHALL ter o assunto "{organizador} convidou você para o amigo secreto {grupo}", o texto "{organizador} convidou você para participar do amigo secreto {grupo}. Para entrar, você vai precisar de uma conta no Amigo Secreto." e o botão "Ver convite", que leva a `/convite/{código}`.
2. WHEN alguém pede para entrar num grupo com aprovação THEN o sistema SHALL enfileirar, na mesma transação, um e-mail a quem organiza com o assunto "{pessoa} pediu para entrar em {grupo}", o texto "{pessoa} pediu para entrar no grupo {grupo} no Amigo Secreto." e o botão "Ver pedidos", que leva a `/grupos/{id}/participantes`.
3. WHEN alguém entra num grupo sem aprovação THEN o sistema SHALL enfileirar, na mesma transação, um e-mail a quem organiza com o assunto "{pessoa} entrou em {grupo}", o texto "{pessoa} entrou no grupo {grupo} pelo link de convite." e o botão "Ver participantes", que leva a `/grupos/{id}/participantes`.
4. WHEN um pedido é aprovado, à mão ou ao desligar a aprovação, THEN o sistema SHALL enfileirar, na mesma transação, um e-mail à pessoa com o assunto "Você entrou no grupo {grupo}", o texto "{organizador} aprovou sua entrada no grupo {grupo} no Amigo Secreto." e o botão "Ver grupo", que leva a `/grupos/{id}`.
5. WHEN um pedido é recusado THEN o sistema SHALL enfileirar, na mesma transação, um e-mail à pessoa com o assunto "Sua entrada em {grupo} não foi aprovada", o texto "{organizador} não aprovou sua entrada no grupo {grupo} no Amigo Secreto." e o botão "Ver meus grupos", que leva a `/grupos`.
6. WHEN um participante é removido THEN o sistema SHALL enfileirar, na mesma transação, um e-mail à pessoa com o assunto "{organizador} removeu você de {grupo}", o texto "{organizador} removeu você do grupo {grupo} no Amigo Secreto." e o botão "Ver meus grupos", que leva a `/grupos`.
7. WHEN um participante sai THEN o sistema SHALL enfileirar, na mesma transação, um e-mail a quem organiza com o assunto "{pessoa} saiu de {grupo}", o texto "{pessoa} saiu do grupo {grupo} no Amigo Secreto." e o botão "Ver participantes", que leva a `/grupos/{id}/participantes`.
8. WHEN a organização é transferida THEN o sistema SHALL enfileirar, na mesma transação, um e-mail a quem recebe com o assunto "Agora você organiza {grupo}", o texto "{antigo organizador} passou para você a organização do grupo {grupo} no Amigo Secreto." e o botão "Ver grupo", que leva a `/grupos/{id}`.
9. IF nomes de pessoa ou de grupo contêm marcação HTML THEN os e-mails SHALL mostrar o texto literal.
10. IF a operação que originou o aviso é desfeita ou recusada THEN o sistema SHALL não enviar o aviso.

**Independent Test**: Num grupo com aprovação, um pedido enfileira o aviso a quem organiza; aprovar enfileira o aviso à pessoa; um nome com `<b>` aparece literal no e-mail.

---

### P1: Eventos de convite ⭐ MVP

**User Story**: Como dono do produto, quero contar aberturas de convite, entradas, saídas e trocas de organização, para medir o funil do convite (`scope.md` 10).

**Why P1**: AD-005.

**Acceptance Criteria**:

1. WHEN um convite válido é aberto THEN o sistema SHALL emitir `invite.viewed` com o `groupId`.
2. WHEN uma participação pendente é criada THEN o sistema SHALL emitir `membership.requested`.
3. WHEN uma participação aprovada é criada pelo link THEN o sistema SHALL emitir `membership.joined`.
4. WHEN uma participação é aprovada THEN o sistema SHALL emitir `membership.approved` com `trigger` `manual` (aprovação na lista) ou `auto` (aprovação desligada).
5. WHEN uma participação é recusada THEN o sistema SHALL emitir `membership.rejected`.
6. WHEN um participante sai THEN o sistema SHALL emitir `membership.left`.
7. WHEN um participante é removido THEN o sistema SHALL emitir `membership.removed`.
8. WHEN o link é trocado THEN o sistema SHALL emitir `invite.regenerated`.
9. WHEN convites por e-mail são enviados THEN o sistema SHALL emitir `invite.emails_sent` com `count`.
10. WHEN a organização é transferida THEN o sistema SHALL emitir `group.ownership_transferred`.
11. The eventos de convite SHALL levar o `groupId` e não conter nome, e-mail, código de convite nem id de pessoa.
12. IF a operação é recusada (4xx) ou falha THEN o sistema SHALL não emitir o evento dela.

**Independent Test**: Abrir o convite, entrar e sair produz `invite.viewed`, `membership.joined` e `membership.left` no log, sem o código nem o nome do grupo.

---

### P1: Telas acessíveis ⭐ MVP

**User Story**: Como pessoa usando o celular ou um leitor de tela, quero usar o convite e a lista sem barreiras.

**Why P1**: WCAG 2.1 AA nas telas principais (`scope.md` 8); o convite chega pelo celular.

**Acceptance Criteria**:

1. The `/convite/{código}`, `/grupos/{id}/participantes`, `/grupos/{id}` e `/grupos` SHALL ter zero violações WCAG 2.1 A/AA no axe, no tema claro e no tema escuro.
2. The `/convite/{código}`, `/grupos/{id}/participantes`, `/grupos/{id}` e `/grupos` SHALL não rolar na horizontal em 360 px e em 1440 px de largura.
3. WHEN uma confirmação desta feature abre THEN o site SHALL pôr o foco no botão que mantém o estado ("Manter link", "Manter no grupo", "Ficar no grupo", "Manter organização") e prender o Tab dentro dela.
4. The aviso "Link copiado" e "Novo link gerado" SHALL ser anunciado a leitores de tela.

**Independent Test**: O axe roda nas quatro telas nos dois temas sem violações; nenhuma rola na horizontal em 360 px.

---

## Edge Cases

- IF a mesma pessoa toca duas vezes em "Entrar no grupo" ao mesmo tempo THEN o sistema SHALL criar uma participação só e enviar um aviso só (INV-03 AC 4, INV-12 AC 3).
- IF a entrada chega enquanto outro pedido passa o grupo para SORTEADO THEN o sistema SHALL ou criar a participação antes da mudança ou responder 409, nunca criar participação num grupo SORTEADO (INV-03 AC 5).
- IF a entrada chega com o código antigo logo depois da troca do link THEN o sistema SHALL responder 404 (INV-03 AC 7).
- IF dois pedidos de transferência do mesmo grupo chegam ao mesmo tempo THEN o sistema SHALL aplicar um e responder 403 ao outro, porque quem pediu deixou de organizar (INV-09 AC 6).
- IF quem organiza aprova e recusa o mesmo pedido ao mesmo tempo THEN o sistema SHALL aplicar o primeiro e enviar só o aviso dele (INV-04 AC 9).
- IF a pessoa sai enquanto quem organiza a remove THEN o sistema SHALL aplicar o primeiro pedido; o segundo SHALL responder 404 "Participante não encontrado." ou devolver o estado atual (INV-07, INV-08).
- WHEN o grupo tem exatamente 20 participantes visíveis THEN o site SHALL não mostrar "Carregar mais"; com 21, SHALL mostrar (INV-05 AC 3).
- WHEN o envio tem exatamente 20 endereços distintos THEN o sistema SHALL aceitar; com 21, SHALL recusar (INV-11 AC 4).
- WHEN o 100º convite por e-mail das 24 horas é enviado THEN o sistema SHALL aceitar; um envio que levaria a 101 SHALL receber 429 inteiro (INV-11 AC 6).
- IF a busca contém `%` ou `_` THEN a API SHALL tratá-los como texto, não como curinga (INV-05 AC 4).
- IF o nome do grupo contém marcação HTML THEN a página do convite e as meta tags SHALL mostrar o texto literal (INV-02 AC 1, AC 12).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| INV-01 | P1: Compartilhar o link | Tasks | Pending |
| INV-02 | P1: Página do convite | Tasks | Pending |
| INV-03 | P1: Entrar no grupo | Tasks | Pending |
| INV-04 | P1: Aprovar e recusar | Tasks | Pending |
| INV-05 | P1: Lista de participantes | Tasks | Pending |
| INV-06 | P1: Abas e Meus grupos | Tasks | Pending |
| INV-07 | P1: Remover participante | Tasks | Pending |
| INV-08 | P1: Sair do grupo | Tasks | Pending |
| INV-09 | P1: Transferir a organização | Tasks | Pending |
| INV-10 | P1: Gerar novo link | Tasks | Pending |
| INV-11 | P1: Convidar por e-mail | Tasks | Pending |
| INV-12 | P1: Avisos por e-mail | Tasks | Pending |
| INV-13 | P1: Eventos de convite | Tasks | Pending |
| INV-14 | P1: Telas acessíveis | Tasks | Pending |

**ID format:** `INV-NN`; cada check cita o ID e o número do critério (ex.: INV-03, AC 5).

**Coverage:** 14 total, 14 mapped to tasks (T1 a T37), 0 unmapped

---

## Sources

- `.specs/docs/scope.md` - 2.2 (convite por e-mail), 3 (papéis), 4.3 (convites e participantes), 4.7 (e-mails), 5 (RN01, RN03, RN06, RN07, RN09, RN10, RN14, RN15), 6 (`Membership`, `EmailInvite`, `Group.inviteCode`), 7.3 (`/convite/[code]` com Open Graph), 8 (códigos não adivinháveis, rate limit, acessibilidade), 8.1 (convites por e-mail não aceitos), 10 (funil do convite) e 11 (navegador interno do WhatsApp).
- `.specs/features/05-invites/context.md` - decisões do usuário de 2026-11-22, com as palavras dele.
- `.specs/STATE.md` - AD-001 (transferência na `05-invites`), AD-005 (eventos), AD-006 (mesma origem), AD-011 (sessão), AD-012 (rotas autenticadas por padrão; a consulta do convite é `@Public()`), AD-013 (CSRF), AD-014 (rate limit), AD-015 (regras de formulário no `packages/shared`), AD-016 (`GroupAccess`, ordem 404, 403, 409, 400, 429).
- `.specs/features/04-groups/spec.md` - GRP-02 AC 2 (passa a mostrar pendentes), GRP-03 (ganha as abas), GRP-04 (desligar a aprovação aprova os pendentes).
- `.specs/features/03-auth/spec.md` - destino de origem depois de entrar ou criar conta (`next`), aviso do navegador interno do WhatsApp nas telas de entrada.
- Design system "Cristal e Gelo" (artifact privado no claude.ai) - InviteBlock, ParticipantRow, GroupCard, StatusTag, ConfirmDialog, Tabs. Diverge do InviteBlock em um ponto, decidido pelo usuário: "Convidar por e-mail" só para quem organiza. Não há captura de tela: as telas seguem o design system e os critérios dizem o que se vê e se faz, não onde.

---

## Success Criteria

- [ ] Pelo celular, uma pessoa sem conta sai do link, cria a conta e entra no grupo em menos de 2 minutos.
- [ ] Nenhum teste encontra resposta diferente entre um código que nunca existiu e um código trocado.
- [ ] Nenhum teste encontra um participante que não organiza aprovando, removendo, transferindo, trocando o link ou convidando por e-mail.
- [ ] Nenhum teste encontra participação criada, removida ou apagada num grupo SORTEADO.
