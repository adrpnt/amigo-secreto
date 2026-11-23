# Invites Context

**Gathered:** 2026-11-22
**Spec:** `.specs/features/05-invites/spec.md`
**Status:** Spec aprovada em 2026-11-23

---

## Feature Boundary

Link de convite com compartilhamento no WhatsApp e preview Open Graph, gerar novo link, convite por e-mail, entrada no grupo com aprovação opcional, lista de participantes paginada com busca, remover participante, sair do grupo e transferir a organização (AD-001, linha 5, revisado em 2026-11-21).

---

## Implementation Decisions

### Página do grupo

- `/grupos/{id}` ganha as abas "Grupo" e "Participantes"; o convite fica no topo da aba Participantes. As features seguintes acrescentam uma aba cada. Pergunta em 2026-11-22: "Na 04-groups, a página /grupos/{id} mostra só os dados e as ações, e cada aba nasce com a feature dela. Onde entram o convite e a lista de participantes?", resposta "Abas Grupo e Participantes (Recomendado)", entre essa, "Seções na mesma página" e "Página separada".

- Cada aba é uma rota: `/grupos/{id}` (Grupo) e `/grupos/{id}/participantes`; as próximas seguem o padrão. Pergunta em 2026-11-22: "Qual a URL de cada aba da página do grupo?", resposta "/grupos/{id} e /grupos/{id}/participantes (Recomendado)", entre essa e "/grupos/{id}?aba=participantes".

### Pedido pendente

- Quem está pendente vê o grupo em "Meus grupos", na seção Ativos, num card sem link com nome, organizador e a tag "Aguardando aprovação". Pergunta em 2026-11-22: "Quem pediu para entrar e está pendente vê o grupo em \"Meus grupos\"? (Hoje a lista só mostra grupos em que a pessoa é aprovada.)", resposta "Sim, card sem link (Recomendado)", entre essa e "Não aparece".
- Quem está pendente não cancela o pedido; ele fica até quem organiza decidir. Pergunta em 2026-11-22: "Quem está pendente pode cancelar o próprio pedido?", resposta "Não (Recomendado)", entre essa e "Sim, \"Cancelar pedido\"".

### Eventos de negócio

- `invite.viewed`; entradas `membership.requested`, `membership.joined`, `membership.approved`, `membership.rejected`; saídas `membership.left`, `membership.removed`; `invite.regenerated`, `invite.emails_sent` (com a quantidade) e `group.ownership_transferred`. Pergunta em 2026-11-22 (várias respostas): "Quais eventos de negócio (AD-005) a feature emite?", respostas "invite.viewed (Recomendado), Entradas (Recomendado), Saídas (Recomendado), Convite e organização (Recomendado)".

### Link de convite

- Todo participante aprovado vê e compartilha o link (WhatsApp e copiar); só quem organiza gera um link novo. Pergunta em 2026-11-22: "Quem vê e compartilha o link de convite (WhatsApp e copiar)?", resposta "Todo participante aprovado (Recomendado)", entre essa e "Só quem organiza".

### Lista de participantes

- Todo participante aprovado vê os participantes aprovados; pendentes e as ações sobre participantes são só de quem organiza. Pergunta em 2026-11-22: "Quem vê a lista de participantes?", resposta "Todos veem os aprovados (Recomendado)", entre essa e "Só quem organiza".
- Ordem: pendentes primeiro, depois aprovados por nome; recusados por último, só para quem organiza. Pergunta em 2026-11-22: "Em que ordem a lista de participantes aparece?", resposta "Pendentes, depois por nome (Recomendado)", entre essa e "Por ordem de entrada".
- Paginação por "Carregar mais", 20 por vez; a busca por nome filtra na API. Pergunta em 2026-11-22: "Como a lista passa de página? (O scope.md 4.3 pede paginação e busca, porque não há limite de participantes.)", resposta "\"Carregar mais\", 20 por vez (Recomendado)", entre essa, "Páginas numeradas, 20 por página" e "\"Carregar mais\", 50 por vez".

### Entrada pelo link

- Uma pessoa logada que abre `/convite/{código}` vê o grupo e o botão "Entrar no grupo"; abrir o link não faz a pessoa entrar. Pergunta em 2026-11-22: "Uma pessoa logada abre /convite/{código}. Como ela entra?", resposta "Botão \"Entrar no grupo\" (Recomendado)", entre essa e "Entra ao abrir o link".
- `/convite/{código}` mostra a quem tem o link, mesmo sem conta, só o nome do grupo e o nome de quem organiza; quem não está logado vê "Entrar" e "Criar conta", que voltam ao convite. Pergunta em 2026-11-22: "O que /convite/{código} mostra a quem tem o link, mesmo sem conta? (O scope.md 4.3 fala em nome do grupo e organizador.)", resposta "Nome e organizador (Recomendado)", entre essa, "Nome, organizador e participantes" e "Nome, organizador, valor e data".
- Participante aprovado que abre o link do próprio grupo vai direto para `/grupos/{id}`. Pergunta em 2026-11-22: "Um participante já aprovado abre o link de convite do próprio grupo. O que acontece?", resposta "Vai direto para o grupo (Recomendado)", entre essa e "Mostra aviso com link".
- O preview do link (Open Graph) usa uma imagem fixa da marca, a mesma para todos os convites, gerada com o `next/og` do Next; título e descrição levam o nome do grupo. Pergunta em 2026-11-22: "Que imagem o preview do link (Open Graph) mostra no WhatsApp?", resposta "Imagem fixa da marca (Recomendado)", entre essa, "Imagem com o nome do grupo" e "Sem imagem".
- Conta com e-mail não confirmado pode entrar num grupo, como pode criar (04-groups). Pergunta em 2026-11-22: "Conta com e-mail ainda não confirmado pode entrar num grupo? (Na 04-groups você decidiu que pode criar grupo.)", resposta "Pode entrar (Recomendado)", entre essa e "Só com e-mail confirmado".

### Convite por e-mail

- Só quem organiza convida por e-mail; os outros participantes compartilham o link. Diverge do InviteBlock do design system, que deixa "Convidar por e-mail" para todos. Pergunta em 2026-11-22: "Quem pode convidar por e-mail? (O InviteBlock do design system deixa \"Convidar por e-mail\" para todos e só \"Gerar novo link\" para quem organiza.)", resposta "Só quem organiza (Recomendado)", entre essa e "Todo participante aprovado".
- A tela não mostra os convites por e-mail já enviados; o banco guarda o envio para os limites e a retenção. Pergunta em 2026-11-22: "Quem organiza vê os convites por e-mail já enviados?", resposta "Não mostra (Recomendado)", entre essa, "Mostra os que não entraram" e "Mostra e permite reenviar".
- Até 20 e-mails por envio e 100 por dia por grupo. Pergunta em 2026-11-22: "Quantos e-mails de convite por vez e por período?", resposta "20 por envio, 100 por dia por grupo (Recomendado)", entre essa, "50 por envio, 200 por dia por grupo" e "10 por envio, 50 por dia por grupo".
- O e-mail leva o mesmo link do grupo; gerar um link novo invalida também os convites por e-mail já enviados. Pergunta em 2026-11-22: "O e-mail de convite leva qual link?", resposta "O mesmo link do grupo (Recomendado)", entre essa e "Um link por e-mail".

### Aprovação

- Recusa bloqueia: a pessoa recusada vê que a entrada foi recusada e não pede de novo; quem organiza vê os recusados e pode aprová-los depois. Pergunta em 2026-11-22: "O organizador recusou a entrada de alguém. E depois?", resposta "Bloqueia; organizador pode aprovar depois (Recomendado)", entre essa, "Bloqueia de vez" e "Pode pedir de novo".
- Cada pedido de entrada manda um e-mail a quem organiza, sem agrupar. Pergunta em 2026-11-22: "Com \"Exigir aprovação\", cada pedido de entrada avisa quem organiza. Como?", resposta "Um e-mail por pedido (Recomendado)", entre essa e "Agrupado, no máximo 1 por hora".
- Desmarcar "Exigir aprovação para entrar" aprova os pedidos pendentes do grupo. Pergunta em 2026-11-22: "O organizador desmarca \"Exigir aprovação para entrar\" com pedidos pendentes. O que acontece com eles?", resposta "Viram aprovados (Recomendado)", entre essa e "Continuam pendentes".

### Remover, sair e transferir

- Quem é removido de um grupo ABERTO vira recusado: não volta pelo link, e quem organiza pode aprová-lo depois. Pergunta em 2026-11-22: "Quem organiza removeu alguém do grupo ABERTO. Essa pessoa pode voltar pelo link?", resposta "Não; vira recusada (Recomendado)", entre essa e "Pode voltar pelo link".
- Quem organiza transfere a organização com o grupo ABERTO ou SORTEADO; ENCERRADO não transfere. Pergunta em 2026-11-22: "Em quais status do grupo quem organiza pode transferir a organização? (RN15 diz \"a qualquer momento\".)", resposta "ABERTO e SORTEADO (Recomendado)", entre essa e "Qualquer status".

### Avisos por e-mail

- Além dos e-mails da tabela 4.7 do `scope.md` (nova solicitação a quem organiza; entrada aprovada ou recusada a quem pediu), entram quatro avisos: à pessoa removida; a quem recebe a organização; a quem organiza, quando alguém sai; a quem organiza, quando alguém entra sem precisar de aprovação. Pergunta em 2026-11-22 (várias respostas): "Além dos e-mails do scope.md 4.7 (nova solicitação ao organizador; entrada aprovada ou recusada ao participante), quais avisos por e-mail entram?", respostas "Removido do grupo (Recomendado), Nova organização (Recomendado), Alguém saiu do grupo, Alguém entrou no grupo".

### Agent's Discretion

Nenhuma área delegada. Os padrões que o agente propôs (código do convite, limites de tentativa, textos de telas e e-mails, payload dos eventos, revisões da `04-groups`) estão na spec marcados "(proposto pelo agente)" e foram confirmados na aprovação da spec em 2026-11-23 ("Aprovo a spec como está.").

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área recusada.

---

## Specific References

- Design system (artifact): InviteBlock ("Compartilhar no WhatsApp" como botão principal, link num campo só leitura com copiar, "Link copiado", "Gerar novo link" com ConfirmDialog só para quem organiza, aviso no lugar do bloco com o grupo SORTEADO, sem o verde nem o logotipo do WhatsApp); ParticipantRow (iniciais sem foto, "Pendente" com aprovar e recusar em botões de ícone com o nome no rótulo, menu com "Transferir organização" e "Remover do grupo" só com o grupo ABERTO, nome com reticências, nunca o e-mail); GroupCard (pendentes só para quem organiza).

---

## Deferred Ideas

- Lista de convites por e-mail enviados, com "Reenviar": recusada nesta feature.
- Link de convite próprio para cada e-mail: recusado nesta feature.
- Imagem de preview com o nome do grupo: recusada nesta feature.
