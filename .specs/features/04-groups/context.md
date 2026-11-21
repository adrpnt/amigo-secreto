# groups Context

**Gathered:** 2026-11-21
**Spec:** `.specs/features/04-groups/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Criar grupo, "Meus grupos", página do grupo, editar, encerrar e excluir grupo (AD-001, linha 4). Transferir a organização foi para a `05-invites`, junto da lista de participantes.

---

## Implementation Decisions

### Transferir a organização

- A transferência sai da `04-groups` e entra na `05-invites`, onde nasce a lista de participantes de onde se escolhe a pessoa. Revisa o AD-001. Pergunta em 2026-11-21: "Transferir a organização exige outro participante aprovado, mas participantes só entram no grupo pela 05-invites. O AD-001 põe a transferência na 04-groups; tirar daqui reverte essa linha. Onde a transferência entra?", resposta "Mover para a 05-invites (Recomendado)", entre essa e "Manter na 04-groups".

### Arquivar

- Não existe arquivamento. O organizador encerra ou exclui o grupo, e "Meus grupos" separa os encerrados dos ativos. Pergunta em 2026-11-21: "O scope.md fala em 'arquivar/excluir grupo', mas o modelo de dados não tem campo de arquivamento e já existe o status ENCERRADO. O que é 'arquivar'?", resposta "Não existe; ENCERRADO cobre (Recomendado)", entre essa, "Cada pessoa esconde da própria lista" e "Organizador arquiva para todos".

### Encerrar

- O organizador encerra manualmente só um grupo SORTEADO, como no diagrama do `scope.md` 4.2. Um grupo ABERTO que não vai acontecer é excluído. Até a `06-draw`, o caminho é testado na API com um grupo sorteado criado no banco. Pergunta em 2026-11-21: "De quais status o organizador encerra o grupo manualmente?", resposta "Só SORTEADO (Recomendado)", entre essa, "ABERTO ou SORTEADO" e "Mover encerrar para a 06-draw".

### Excluir

- O organizador exclui o grupo em qualquer status, depois de confirmar num ConfirmDialog ("Excluir grupo" / "Manter grupo"). A exclusão é definitiva, sem lixeira. Pergunta em 2026-11-21: "Excluir grupo apaga o grupo e tudo dele. Em quais status o organizador pode excluir?", resposta "Qualquer status, com confirmação (Recomendado)", entre essa, "Só ABERTO ou ENCERRADO" e "Só sem outros participantes".

### Conta com e-mail não confirmado

- Pode criar grupo; a faixa da `03-auth` continua pedindo a confirmação. Pergunta em 2026-11-21: "Quem ainda não confirmou o e-mail pode criar grupo?", resposta "Pode criar (Recomendado)", entre essa e "Bloqueia até confirmar".

### Valor do presente

- Reais inteiros: valor único (R$ 50) ou faixa (R$ 50 a R$ 100), de 1 a 100.000; o mínimo não passa do máximo; valor único grava mínimo = máximo. Pergunta em 2026-11-21: "O valor sugerido do presente é um valor único ou uma faixa. Em que formato a pessoa informa?", resposta "Reais inteiros (Recomendado)", entre essa e "Reais com centavos".

### Datas

- Uma data nova ou alterada (sorteio previsto ou confraternização) tem que estar no futuro; com as duas preenchidas, o sorteio previsto vem antes da confraternização. Uma data já salva que passou pode ficar como está. Pergunta em 2026-11-21: "Datas do grupo: sorteio previsto e data/hora da confraternização. Que regras valem ao salvar?", resposta "Futuras e sorteio antes da festa (Recomendado)", entre essa, "Só futuras" e "Sem regra".

### Local da confraternização

- Um campo "Local" de texto livre, até 200 caracteres, sem validar como link (endereço, ou link/plataforma quando online), e uma caixa "Evento online". Pergunta em 2026-11-21: "A confraternização pode ser presencial ou online. Como o grupo guarda o local?", resposta "Caixa 'Online' + texto livre (Recomendado)", entre essa, "Online exige link" e "Só texto livre".

### Rotas

- `/grupos`, `/grupos/novo`, `/grupos/[id]` e `/grupos/[id]/editar`, com o id do grupo em UUID; edição numa tela própria. Pergunta em 2026-11-21: "Quais endereços as telas de grupo usam?", resposta "/grupos, /grupos/novo, /grupos/[id] e /grupos/[id]/editar com UUID (Recomendado)", entre essa, "Mesmas rotas, edição na página do grupo" e "Id curto legível".

### Navegação de quem está logado

- O destino padrão depois de entrar passa de `/perfil` para `/grupos`, como a `03-auth` deixou combinado; "Meus grupos" entra como primeiro item do menu do avatar, acima de "Perfil" e "Sair"; quem está logado e abre `/` vai para `/grupos`. Pergunta em 2026-11-21 (seleção múltipla): "Além dessa troca, o que muda na navegação de quem está logado?", resposta "Destino padrão vira /grupos (Recomendado), 'Meus grupos' no menu do avatar (Recomendado), Logado em / vai para /grupos (Recomendado)"; a opção "Link 'Meus grupos' visível no cabeçalho" não foi escolhida.

### "Meus grupos"

- Seção "Ativos" (ABERTO e SORTEADO) e, abaixo, seção "Encerrados"; cada uma por data de criação, mais novo primeiro; sem paginação. Pergunta em 2026-11-21: "Como 'Meus grupos' organiza a lista?", resposta "Ativos e Encerrados, mais novos primeiro (Recomendado)", entre essa, "Ativos e Encerrados, por próxima data" e "Lista única".

### Edição por status

- O organizador edita o grupo ABERTO ou SORTEADO; o ENCERRADO é só leitura. Pergunta em 2026-11-21: "O que o organizador pode editar depois que o grupo sai de ABERTO?", resposta "ABERTO e SORTEADO editam; ENCERRADO só leitura (Recomendado)", entre essa, "Só ABERTO edita" e "Qualquer status edita".

### Página do grupo

- `/grupos/[id]` mostra só os dados do grupo e, para o organizador, as ações (editar, encerrar, excluir). Cada aba (participantes, lista de desejos, mural, mensagens) nasce com a feature dela. Pergunta em 2026-11-21: "O que a página /grupos/[id] mostra na 04-groups?", resposta "Só os dados e as ações (Recomendado)", entre essa e "Dados + abas 'Em breve'".

### Eventos de negócio

- `group.created`, `group.closed`, `group.deleted` e `group.updated`. Pergunta em 2026-11-21 (seleção múltipla): "Quais eventos de negócio (logs do AD-005) a 04-groups emite?", resposta "group.created (Recomendado), group.closed (Recomendado), group.deleted (Recomendado), group.updated".

### Limite de criação

- 20 grupos criados por hora por conta, pelo `RateLimitService` (AD-014); acima, 429 com "Muitas tentativas. Tente de novo em N minutos.". Pergunta em 2026-11-21: "Criação de grupo tem limite por pessoa?", resposta "20 grupos por hora por conta (Recomendado)", entre essa e "Sem limite".

### Aviso por e-mail

- Excluir e encerrar o grupo mandam e-mail aos outros participantes. Esses e-mails não estão na tabela 4.7 do `scope.md`; até a `05-invites` não há outros participantes, então o envio é testado com participantes criados no banco. Pergunta em 2026-11-21: "Excluir ou encerrar o grupo avisa os outros participantes por e-mail?", resposta "Avisa ao excluir e ao encerrar", entre "Não avisa (Recomendado)", "Avisa ao excluir" e "Avisa ao excluir e ao encerrar".

### Agent's Discretion

Nenhuma área delegada. Os padrões do agente (limites de texto, fuso, formatos, textos de tela e de e-mail, quem vê o quê, prioridades, acessibilidade) estão na tabela de Assumptions da spec e foram confirmados na aprovação ("Spec aprovada.").

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área recusada.

---

## Specific References

- Design system (artifact): GroupCard (card inteiro é link; nome, StatusTag, participantes, pendentes só para quem organiza, data relevante por status, tag "Você organiza"), StatusTag (ABERTO, SORTEADO, ENCERRADO em maiúsculas), ConfirmDialog (botões repetem a ação, nunca "Sim"/"Não").

---

## Deferred Ideas

- Transferir a organização: `05-invites`.
