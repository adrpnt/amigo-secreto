# Draw Specification

**Approved**: 2026-11-25 - user: "Aprovado."
**Amended**: 2026-11-25 - no Design: o e-mail do resultado leva o nome lido na hora do envio, não o da hora do sorteio, porque o job monta o e-mail na hora (AD-018), user: "Aprovada."

## Problem Statement

Com a `05-invites`, o grupo junta participantes, mas não sorteia: o status SORTEADO só existe em grupos criados direto no banco. O sorteio é o momento central da brincadeira. Quem organiza precisa sortear com um toque quando todos entraram, sem tirar a si mesmo nem juntar casais, e cada pessoa precisa descobrir só quem tirou, sem que ninguém (nem quem organiza) veja o resultado dos outros (RN06). Se alguém ficou de fora, quem organiza precisa desfazer o sorteio e sortear de novo.

## Goals

- [ ] Quem organiza faz o sorteio pelo celular em menos de 1 minuto a partir da aba Sorteio, sabendo antes o que falta para poder sortear.
- [ ] Cada participante descobre quem tirou no site e por e-mail logo depois do sorteio, e nenhum teste encontra uma rota, log, evento ou e-mail que mostre a outra pessoa o resultado de alguém.
- [ ] Restrições que impedem o sorteio são detectadas antes de tocar em "Sortear", com os pares a revisar.
- [ ] As features seguintes (lista de desejos, mensagens secretas, encerramento automático) encontram a rodada ativa e o par de cada pessoa sem refazer o modelo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Botão "Sortear de novo" num passo só | Decisão do usuário: re-sortear é cancelar e sortear - user: "Cancelar e sortear (Recomendado)". |
| Restrição de um sentido só (A não tira B, mas B pode tirar A) | Decisão do usuário: o par vale nos dois sentidos, como o ExclusionEditor do design system. |
| Recusar na hora um par que impossibilita o sorteio | Decisão do usuário: o par é salvo e o painel avisa - user: "Salva e o painel avisa (Recomendado)". |
| Evento de restrição criada ou apagada | Decisão do usuário: só `draw.performed`, `draw.cancelled` e `draw.reminder_sent`. |
| Restrições individuais pagas ("quem tiro / quem não tiro") | Pós-MVP (`scope.md` 4.9, monetização). |
| Revelação do amigo secreto (coletiva, individual, automática) | Pós-MVP (`scope.md` 4.9.1). |
| "Ver lista de desejos" no papelzinho | Feature `07-wishlist`. |
| Mensagens secretas da rodada e o que acontece com elas ao cancelar (RN08) | Feature `09-secret-messages`. |
| Encerramento automático, lembrete da confraternização e retenção do resultado | Feature `10-lifecycle`. |
| Exclusão de conta de quem está num grupo SORTEADO (RN12) | Feature `11-account-deletion`. |
| Notificação no app e push | Pós-MVP (`scope.md` 4.7). |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Lugar das telas | Nova aba "Sorteio" em `/grupos/{id}/sorteio`, depois de "Grupo" e "Participantes"; quem organiza vê ali o painel e as restrições, e cada participante vê o próprio resultado depois do sorteio | Uma aba concentra o sorteio | y - user: "Aba \"Sorteio\" (Recomendado)" |
| Distribuição | Sempre tenta uma corrente única (A→B→C→...→A, sem par fechado); se as restrições impedirem a corrente, usa qualquer distribuição sem auto-sorteio que respeite as restrições; só bloqueia quando nenhuma existe | Evita par fechado quando dá e só bloqueia o que é de fato impossível | y - user: "Corrente quando der (Recomendado)" |
| Re-sorteio | "Cancelar sorteio" volta o grupo para ABERTO; o mesmo "Sortear" faz a nova rodada | Entre os dois passos, dá para mexer em participantes e restrições (RN07) | y - user: "Cancelar e sortear (Recomendado)" |
| Par que impossibilita o sorteio | O par é salvo; o painel mostra a condição das restrições como pendente, "Sortear" fica desabilitado e um alerta lista os pares a revisar; vale também quando alguém sai ou é removido | Como o design system | y - user: "Salva e o painel avisa (Recomendado)" |
| Lembrete de sortear | Na data e hora do sorteio previsto, se o grupo ainda estiver ABERTO; mudar a data reagenda; tirar a data, sortear ou excluir o grupo faz o lembrete não sair | A hora salva já é a escolhida, sem problema de fuso | y - user: "Na hora prevista (Recomendado)" |
| Limite de sorteios | Até 5 sorteios por grupo a cada 24 horas; acima, 429 "Muitas tentativas. Tente de novo em N minutos."; cancelar sem limite próprio | Cada sorteio manda um e-mail por participante | y - user: "5 sorteios por dia (Recomendado)" |
| Pares de quem sai | Sair do grupo ou ser removido apaga os pares da pessoa; se voltar, entra sem restrições | Nada fica valendo para quem não está no grupo | y - user: "Somem (Recomendado)" |
| Restrições depois da transferência | São do grupo: quem organiza agora vê e edita; quem passou a organização deixa de ver | Quem organiza é quem sorteia (RN10) | y - user: "Quem organiza agora (Recomendado)" |
| Eventos | `draw.performed`, `draw.cancelled` e `draw.reminder_sent`; sem evento de restrição | Métrica "sorteios" do `scope.md` 8 e funil do 10 (AD-005) | y - user: "draw.performed (Recomendado), draw.cancelled (Recomendado), draw.reminder_sent (Recomendado)" |
| Resultado em grupo ENCERRADO | Continua na aba Sorteio, só leitura | A retenção é da `10-lifecycle` | y - user: "Continua vendo (Recomendado)" |
| Papelzinho | Toda visita abre dobrado; o nome só sai da API quando a pessoa toca para abrir | Protege quem abre a aba perto de outras pessoas | y - user: "Sempre dobrado (Recomendado)" |
| Participante antes do sorteio | Só o aviso "O sorteio ainda não foi feito. Você recebe um e-mail quando {organizador} sortear.", sem condições nem restrições | Restrições são só de quem organiza | y - user: "Só o aviso (Recomendado)" |
| Confirmação do sorteio | ConfirmDialog "Fazer o sorteio de {grupo}?" / "Cada pessoa recebe por e-mail quem tirou. Depois do sorteio, ninguém entra nem sai do grupo sem cancelar o sorteio." / "Sortear" e "Ainda não" | Sortear manda e-mail a todos e trava o grupo | y - user: "Com confirmação (Recomendado)" |
| E-mail do resultado | Assunto sem o nome; o nome só no corpo, depois de uma frase neutra | Segue o `scope.md` 4.4 sem pôr o nome na prévia de notificação | y - user: "Nome só no corpo (Recomendado)" |
| Restrições depois do sorteio | Quem organiza vê os pares só para leitura, com a nota "Para mudar as restrições, cancele o sorteio." (SORTEADO) | RN11 | y - user: "Vê só leitura (Recomendado)" |
| Prioridades | Todas as histórias P1 | O `scope.md` marca todas como MVP | y - user: "Aprovado." (proposto pelo agente) |
| Busca da corrente com restrições | Em grupos de até 10 participantes, se existe corrente única que respeita as restrições, a busca sempre a encontra; acima disso, a busca tem tempo limite (Design) e, sem achar, usa outra distribuição válida | Busca completa é barata até 10 pessoas; acima, garantir corrente pode não terminar a tempo (`scope.md` 8) | y - user: "Aprovado." (proposto pelo agente) |
| Tempo do sorteio | 1.000 participantes aprovados sem restrições: a API responde ao sorteio em menos de 2 segundos, sem contar o envio dos e-mails | `scope.md` 8: custo linear sem restrições, sem limite de participantes (RN14) | y - user: "Aprovado." (proposto pelo agente) |
| Pares a revisar | O alerta lista os pares que envolvem as pessoas sem distribuição possível: um conjunto de participantes que, juntos, têm menos pessoas permitidas para tirar do que o tamanho do conjunto. Sem esses pares, essas pessoas voltam a ter opção | Diz com certeza o que mexer (RN05) | y - user: "Aprovado." (proposto pelo agente) |
| Rodada cancelada | A rodada fica gravada como cancelada, com a data; os pares sorteados dela são apagados | Nada lê o resultado de uma rodada cancelada; menos dado guardado (LGPD) | y - user: "Aprovado." (proposto pelo agente) |
| E-mails de uma rodada cancelada | E-mails de resultado ainda na fila quando o sorteio é cancelado ou o grupo é excluído não saem | O nome de uma rodada inválida não chega a ninguém | y - user: "Aprovado." (proposto pelo agente) |
| Quem recebe cada e-mail | Resultado: todos os participantes da rodada, inclusive quem organiza; cancelamento: todos da rodada, menos quem cancelou; lembrete: quem organiza o grupo na hora do envio | Quem organiza também tira alguém (RN02) | y - user: "Aprovado." (proposto pelo agente) |
| Nome mostrado no resultado | O site mostra o nome atual da pessoa sorteada; o e-mail leva o nome lido na hora do envio (segundos depois do sorteio, ou na tentativa seguinte) | A pessoa pode trocar o nome no perfil | y - user: "Aprovado." (proposto pelo agente) |
| Lembrete de grupos já existentes | A migration agenda o lembrete dos grupos ABERTOS com sorteio previsto no futuro | Grupos criados antes desta feature também recebem o lembrete | y - user: "Aprovado." (proposto pelo agente) |
| Escolha das pessoas do par | Dois campos de seleção com todos os participantes aprovados, em ordem de nome | Sem limite de participantes (RN14), mas pares são poucos e entre conhecidos | y - user: "Aprovado." (proposto pelo agente) |
| Erros do sorteio | Grupo SORTEADO: 409 "Este grupo já fez o sorteio."; ENCERRADO: 409 "Grupo encerrado não pode ser alterado."; menos de 3 aprovados: 409 "O sorteio precisa de pelo menos 3 participantes aprovados."; pendentes: 409 "Aprove ou recuse os pedidos pendentes antes do sorteio."; restrições: 409 "As restrições não permitem um sorteio válido." com os pares no corpo; nessa ordem, depois do 404 e do 403 do AD-016 | Mensagens que dizem o que fazer; reaproveita a do grupo encerrado da `05-invites` | y - user: "Aprovado." (proposto pelo agente) |
| Erros do cancelamento | Grupo ABERTO: 409 "Este grupo ainda não fez o sorteio."; ENCERRADO: 409 "Grupo encerrado não pode ser alterado." | Como o sorteio | y - user: "Aprovado." (proposto pelo agente) |
| Erros das restrições | Campos (AD-015): "Escolha as duas pessoas do par.", "Escolha duas pessoas diferentes.", "Esse par já está na lista." (textos do design system); pessoa que não é participante aprovada: 404 "Participante não encontrado."; grupo SORTEADO: 409 "Para mudar as restrições, cancele o sorteio."; ENCERRADO: 409 "Grupo encerrado não pode ser alterado."; apagar um par que não existe responde 204 | Textos do ExclusionEditor; apagar duas vezes não é erro | y - user: "Aprovado." (proposto pelo agente) |
| Painel do sorteio | Título "Sorteio"; condições "{N} participantes aprovados" ou "Faltam {N} pessoas para o mínimo de 3" ("Falta 1 pessoa para o mínimo de 3"); "Nenhuma entrada pendente" ou "1 pessoa aguarda aprovação" / "{N} pessoas aguardam aprovação"; "As restrições permitem o sorteio" ou "As restrições não permitem um sorteio válido"; botão "Sortear" (`festive`); abaixo, "Ninguém vê quem os outros tiraram, nem você." | Textos do DrawPanel do design system | y - user: "Aprovado." (proposto pelo agente) |
| Painel depois do sorteio | "Sorteio feito em {dd/mm/aaaa}" (horário de Brasília), "Cada pessoa já pode ver quem tirou, aqui e por e-mail." e "Cancelar sorteio" (só SORTEADO) | DrawPanel do design system | y - user: "Aprovado." (proposto pelo agente) |
| Editor de restrições | Título "Quem não tira quem"; aviso "Só você, que organiza, vê estas restrições."; campos "Pessoa" e "Não tira e não é tirada por"; botão "Adicionar par"; cada par como "{A} e {B}" com o botão "Remover par {A} e {B}"; sem pares: "Nenhum par cadastrado. Todos podem tirar todos, menos a si mesmos."; alerta de impossível: "Revise estes pares: {A} e {B}; {C} e {D}." | ExclusionEditor do design system | y - user: "Aprovado." (proposto pelo agente) |
| Papelzinho | Título "Quem você tirou"; "{grupo}" e, com data da confraternização, " · {dd/mm/aaaa}"; dobrado: "Seu papelzinho", "Toque para abrir" (botão "Abrir papelzinho") e "Abra num lugar reservado: só você pode ver este nome."; aberto: "Você tirou", o nome e "Esconder"; anúncio a leitores de tela: "Você tirou {nome}. Só você vê este nome, nem quem organiza sabe."; erro: "Não foi possível abrir o papelzinho. Tente de novo." | ResultCard do design system | y - user: "Aprovado." (proposto pelo agente) |
| Cancelar sorteio | ConfirmDialog "Cancelar o sorteio de {grupo}?" / "Quem já viu o resultado pode ter guardado o nome. Todos recebem um e-mail avisando que o sorteio foi cancelado, e o grupo volta a aceitar entradas." / "Cancelar sorteio" (`destructive`) e "Manter sorteio" | `scope.md` 4.4: confirmação com aviso de que podem ter visto | y - user: "Aprovado." (proposto pelo agente) |
| Espera e erros na tela | Confirmar mostra "Sorteando…" / "Cancelando…" no botão, desabilitado; 409 e 429 mostram a mensagem da API num alerta vermelho no painel; outros erros "Não foi possível concluir. Tente de novo."; em erro a confirmação fecha; o sucesso recarrega a aba | Como a `05-invites` | y - user: "Aprovado." (proposto pelo agente) |
| Textos dos e-mails | Na história "E-mails do sorteio" (DRAW-07) | Assunto diz o que é; um botão por e-mail, como na `05-invites` | y - user: "Aprovado." (proposto pelo agente) |
| Payload dos eventos | `groupId` em todos; `draw.performed` com `participants`, `singleCycle` e `hasExclusions`; `draw.cancelled` com `minutesSinceDraw`. Nenhum nome, e-mail ou id de pessoa | Métrica sem dado pessoal (LGPD), como nas features anteriores | y - user: "Aprovado." (proposto pelo agente) |
| Revisões da `05-invites` | INV-07 (remover) e INV-08 (sair) passam a apagar os pares de restrição da pessoa; GRP-03 e INV-06 ganham a aba "Sorteio" | Consequência das decisões acima | y - user: "Aprovado." (proposto pelo agente) |
| Acessibilidade e larguras | `/grupos/{id}/sorteio` sem violações WCAG 2.1 A/AA (axe) nos temas claro e escuro, dobrado e aberto, e sem rolagem horizontal em 360 px e 1440 px; com movimento reduzido, o papel abre sem animação | Mesmas regras das features anteriores (`scope.md` 8) e o ResultCard | y - user: "Aprovado." (proposto pelo agente) |

**Open questions:** none - as decisões de produto foram respondidas pelo usuário; os padrões propostos pelo agente foram confirmados na aprovação da spec.

---

## User Stories

### P1: Aba Sorteio ⭐ MVP

**User Story**: Como participante, quero uma aba do grupo só para o sorteio, para achar o resultado e, se organizo, o que falta para sortear.

**Why P1**: É onde todo o resto desta feature aparece.

**Acceptance Criteria**:

1. WHEN um participante aprovado abre `/grupos/{id}` ou `/grupos/{id}/participantes` THEN o site SHALL mostrar a aba "Sorteio", depois de "Grupo" e "Participantes", com link para `/grupos/{id}/sorteio`.
2. WHEN um participante aprovado abre `/grupos/{id}/sorteio` THEN o site SHALL mostrar o cabeçalho do grupo e as abas com "Sorteio" como atual.
3. WHILE o grupo está ABERTO o site SHALL mostrar a quem não organiza só o aviso "O sorteio ainda não foi feito. Você recebe um e-mail quando {organizador} sortear."
4. WHILE o grupo está ABERTO o site SHALL mostrar a quem organiza o painel do sorteio e o editor de restrições.
5. WHILE o grupo está SORTEADO ou ENCERRADO o site SHALL mostrar a todo participante o papelzinho do próprio resultado.
6. IF a pessoa não tem participação aprovada no grupo ou o id não existe THEN o site SHALL mostrar "Grupo não encontrado." sem as abas, como as outras abas.
7. IF a pessoa não tem sessão THEN o site SHALL levar a `/entrar?next=/grupos/{id}/sorteio`.

**Independent Test**: Num grupo ABERTO, quem organiza vê o painel e o editor e um participante vê só o aviso; num grupo SORTEADO os dois veem o papelzinho dobrado.

---

### P1: Restrições ⭐ MVP

**User Story**: Como organizador, quero dizer quem não pode tirar quem (como casais), para que o sorteio não junte essas pessoas.

**Why P1**: Diferencial gratuito do produto (`scope.md` 2.2, 4.4).

**Acceptance Criteria**:

1. WHILE o grupo está ABERTO o editor SHALL mostrar o título "Quem não tira quem", o aviso "Só você, que organiza, vê estas restrições.", os campos "Pessoa" e "Não tira e não é tirada por" com os participantes aprovados em ordem de nome, e o botão "Adicionar par".
2. WHEN quem organiza escolhe duas pessoas diferentes e usa "Adicionar par" THEN o sistema SHALL gravar o par e o editor SHALL mostrá-lo como "{A} e {B}" na lista.
3. The par SHALL valer nos dois sentidos: A não tira B e B não tira A.
4. IF falta escolher uma das pessoas THEN o sistema SHALL recusar com 400 e mostrar "Escolha as duas pessoas do par." sem gravar.
5. IF as duas pessoas são a mesma THEN o sistema SHALL recusar com 400 e mostrar "Escolha duas pessoas diferentes." sem gravar.
6. IF o par já existe, em qualquer ordem THEN o sistema SHALL recusar com 400 e mostrar "Esse par já está na lista." sem gravar.
7. IF uma das pessoas não é participante aprovada do grupo THEN a API SHALL responder 404 "Participante não encontrado." sem gravar.
8. WHEN quem organiza usa "Remover par {A} e {B}" THEN o sistema SHALL apagar o par sem pedir confirmação e o editor SHALL tirá-lo da lista.
9. WHEN o pedido apaga um par que não existe mais THEN a API SHALL responder 204.
10. WHILE não há pares o editor SHALL mostrar "Nenhum par cadastrado. Todos podem tirar todos, menos a si mesmos."
11. IF o grupo está SORTEADO THEN a API SHALL responder 409 "Para mudar as restrições, cancele o sorteio." a criar ou apagar par, sem mudar nada (RN11).
12. IF o grupo está ENCERRADO THEN a API SHALL responder 409 "Grupo encerrado não pode ser alterado." a criar ou apagar par, sem mudar nada.
13. WHILE o grupo está SORTEADO o site SHALL mostrar a quem organiza a lista de pares sem "Adicionar par" nem remover, com a nota "Para mudar as restrições, cancele o sorteio."
14. WHILE o grupo está ENCERRADO o site SHALL mostrar a quem organiza a lista de pares sem "Adicionar par", sem remover e sem a nota.
15. IF quem pede não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." a ler, criar ou apagar pares.
16. The site SHALL não mostrar os pares a quem não organiza o grupo.
17. WHEN um participante sai do grupo ou é removido THEN o sistema SHALL apagar, na mesma transação, todos os pares em que ele está.
18. WHEN a organização é transferida THEN quem passa a organizar SHALL ver e editar os pares do grupo, e quem passou a organização SHALL deixar de vê-los.

**Independent Test**: Quem organiza adiciona "Ana e Bruno", tenta "Bruno e Ana" e vê "Esse par já está na lista."; Bruno sai do grupo e o par some; um participante recebe 403 ao ler os pares.

---

### P1: Condições do sorteio ⭐ MVP

**User Story**: Como organizador, quero ver o que falta para poder sortear, para resolver antes de tocar em "Sortear".

**Why P1**: RN03 e RN05.

**Acceptance Criteria**:

1. WHILE o grupo está ABERTO o painel SHALL mostrar o título "Sorteio", as três condições e o botão "Sortear", e abaixo dele "Ninguém vê quem os outros tiraram, nem você."
2. WHILE o grupo tem 3 ou mais participantes aprovados o painel SHALL mostrar a condição "{N} participantes aprovados" como cumprida.
3. WHILE o grupo tem menos de 3 participantes aprovados o painel SHALL mostrar "Faltam {N} pessoas para o mínimo de 3" ("Falta 1 pessoa para o mínimo de 3" quando falta uma) como pendente.
4. WHILE o grupo não tem pedido pendente o painel SHALL mostrar "Nenhuma entrada pendente" como cumprida.
5. WHILE o grupo tem pedidos pendentes o painel SHALL mostrar "1 pessoa aguarda aprovação" ou "{N} pessoas aguardam aprovação" como pendente.
6. WHILE existe distribuição sem auto-sorteio que respeita os pares o painel SHALL mostrar "As restrições permitem o sorteio" como cumprida.
7. WHILE nenhuma distribuição respeita os pares o painel SHALL mostrar "As restrições não permitem um sorteio válido" como pendente e um alerta de erro "Revise estes pares: {A} e {B}; {C} e {D}."
8. The alerta de restrições SHALL listar só os pares que envolvem as pessoas de um conjunto que, junto, tem menos pessoas permitidas para tirar do que o tamanho do conjunto.
9. WHILE alguma condição está pendente o botão "Sortear" SHALL ficar desabilitado.
10. The condição cumprida SHALL aparecer com ícone de confirmação em `success` e a pendente com ícone de alerta em `warning`.

**Independent Test**: Com 3 aprovados e o par "Ana e Bruno", o painel mostra as restrições como pendentes e "Revise estes pares: Ana Souza e Bruno Lima."; com um quarto aprovado, as três condições ficam cumpridas e "Sortear" habilita.

---

### P1: Sortear ⭐ MVP

**User Story**: Como organizador, quero sortear com um toque quando todos entraram, para que cada pessoa saiba quem tirou.

**Why P1**: É a função principal do produto (`scope.md` 4.4, 5.1).

**Acceptance Criteria**:

1. WHEN quem organiza usa "Sortear" THEN o site SHALL abrir a confirmação "Fazer o sorteio de {grupo}?", com o texto "Cada pessoa recebe por e-mail quem tirou. Depois do sorteio, ninguém entra nem sai do grupo sem cancelar o sorteio." e os botões "Sortear" e "Ainda não".
2. WHEN quem organiza usa "Ainda não", aperta Esc ou toca fora THEN o site SHALL fechar a confirmação sem sortear.
3. WHEN quem organiza confirma THEN o sistema SHALL criar uma rodada ativa com um par para cada participante aprovado, inclusive quem organiza, e passar o grupo para SORTEADO.
4. The distribuição SHALL dar a cada participante exatamente uma pessoa para tirar e fazê-lo ser tirado por exatamente uma pessoa.
5. The distribuição SHALL nunca fazer alguém tirar a si mesmo (RN04).
6. The distribuição SHALL nunca juntar, em nenhum sentido, as duas pessoas de um par de restrição.
7. WHEN o grupo não tem pares de restrição THEN a distribuição SHALL ser uma corrente única, sem par fechado.
8. WHEN o grupo tem pares de restrição, até 10 participantes e existe corrente única que os respeita THEN a distribuição SHALL ser uma corrente única.
9. IF os pares impedem toda corrente única mas permitem outra distribuição THEN o sistema SHALL sortear essa outra distribuição.
10. The sorteio SHALL sortear com o `randomInt` do `node:crypto`.
11. The sorteio SHALL gravar a rodada, todos os pares e a mudança de status numa transação só: ou tudo, ou nada.
12. WHEN o sorteio termina THEN o site SHALL recarregar a aba, que passa a mostrar o papelzinho dobrado de quem organiza e "Sorteio feito em {dd/mm/aaaa}".
13. WHILE a API sorteia o botão da confirmação SHALL mostrar "Sorteando…" e ficar desabilitado.
14. IF o grupo está SORTEADO THEN a API SHALL responder 409 "Este grupo já fez o sorteio." sem criar rodada.
15. IF o grupo está ENCERRADO THEN a API SHALL responder 409 "Grupo encerrado não pode ser alterado." sem criar rodada.
16. IF o grupo tem menos de 3 participantes aprovados THEN a API SHALL responder 409 "O sorteio precisa de pelo menos 3 participantes aprovados." sem criar rodada (RN03).
17. IF o grupo tem pedido pendente THEN a API SHALL responder 409 "Aprove ou recuse os pedidos pendentes antes do sorteio." sem criar rodada (RN03).
18. IF nenhuma distribuição respeita os pares THEN a API SHALL responder 409 "As restrições não permitem um sorteio válido." com os pares a revisar no corpo, sem criar rodada (RN05).
19. IF mais de uma condição falha THEN a API SHALL responder com a primeira na ordem: status do grupo, mínimo de aprovados, pendentes, restrições.
20. IF quem pede não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." sem criar rodada (RN10).
21. IF o grupo já teve 5 sorteios nas últimas 24 horas THEN a API SHALL responder 429 "Muitas tentativas. Tente de novo em N minutos." sem criar rodada.
22. IF a API responde 409 ou 429 THEN o site SHALL fechar a confirmação e mostrar a mensagem da API num alerta vermelho no painel.
23. IF a API responde outro erro ou a rede falha THEN o site SHALL fechar a confirmação e mostrar "Não foi possível concluir. Tente de novo."
24. WHEN o grupo tem 1.000 participantes aprovados e nenhum par THEN a API SHALL responder ao sorteio em menos de 2 segundos.
25. WHILE o grupo está SORTEADO a API SHALL recusar entrada, saída e remoção com o 409 da `05-invites` (RN07).

**Independent Test**: Num grupo com 4 aprovados e o par "Ana e Bruno", confirmar "Sortear" passa o grupo a SORTEADO com 4 pares, ninguém tira a si mesmo nem Ana e Bruno se tiram; repetir dá 409 "Este grupo já fez o sorteio."

---

### P1: Ver quem tirei ⭐ MVP

**User Story**: Como participante, quero abrir o papelzinho e ver quem tirei, sem que mais ninguém veja.

**Why P1**: `scope.md` 4.4 e RN06.

**Acceptance Criteria**:

1. WHILE o grupo está SORTEADO ou ENCERRADO a aba SHALL mostrar "Quem você tirou", o nome do grupo e, com data da confraternização, " · {dd/mm/aaaa}", e o papelzinho dobrado com "Seu papelzinho", "Toque para abrir" e "Abra num lugar reservado: só você pode ver este nome."
2. The página da aba, com o papelzinho dobrado, SHALL não conter o nome sorteado.
3. WHEN o participante usa "Abrir papelzinho" THEN o site SHALL buscar o próprio par na API e mostrar "Você tirou" e o nome atual da pessoa sorteada.
4. WHEN o papelzinho abre THEN o site SHALL anunciar a leitores de tela "Você tirou {nome}. Só você vê este nome, nem quem organiza sabe."
5. WHEN o participante usa "Esconder" THEN o site SHALL dobrar o papel de novo e tirar o nome da tela.
6. WHEN o participante volta à aba THEN o site SHALL mostrar o papelzinho dobrado de novo.
7. The API SHALL devolver a cada participante só a pessoa que ele tirou na rodada ativa.
8. IF o grupo não tem rodada ativa THEN a API SHALL responder 404 "Sorteio não encontrado." ao pedido do resultado.
9. IF a API responde 404 ao abrir (sorteio cancelado depois de a aba carregar) THEN o site SHALL recarregar a aba.
10. IF a API responde outro erro ou a rede falha THEN o site SHALL manter o papel dobrado e mostrar "Não foi possível abrir o papelzinho. Tente de novo."
11. WHERE o sistema pede movimento reduzido o papelzinho SHALL abrir e fechar sem animação e sem faíscas.

**Independent Test**: Num grupo SORTEADO, o HTML da aba não tem o nome; tocar em "Abrir papelzinho" mostra o nome que a rodada deu à pessoa; outra pessoa abre e vê outro nome.

---

### P1: Cancelar o sorteio ⭐ MVP

**User Story**: Como organizador, quero cancelar o sorteio, para incluir quem ficou de fora e sortear de novo.

**Why P1**: `scope.md` 4.4 e RN07, RN08.

**Acceptance Criteria**:

1. WHILE o grupo está SORTEADO o painel SHALL mostrar a quem organiza "Sorteio feito em {dd/mm/aaaa}", "Cada pessoa já pode ver quem tirou, aqui e por e-mail." e o botão "Cancelar sorteio".
2. WHILE o grupo está ENCERRADO o painel SHALL mostrar a quem organiza "Sorteio feito em {dd/mm/aaaa}" sem "Cancelar sorteio".
3. WHEN quem organiza usa "Cancelar sorteio" THEN o site SHALL abrir a confirmação "Cancelar o sorteio de {grupo}?", com o texto "Quem já viu o resultado pode ter guardado o nome. Todos recebem um e-mail avisando que o sorteio foi cancelado, e o grupo volta a aceitar entradas." e os botões "Cancelar sorteio" e "Manter sorteio".
4. WHEN quem organiza usa "Manter sorteio", aperta Esc ou toca fora THEN o site SHALL fechar a confirmação sem cancelar.
5. WHEN quem organiza confirma THEN o sistema SHALL marcar a rodada como cancelada, com a data, apagar os pares dela e passar o grupo para ABERTO, numa transação só.
6. WHEN o cancelamento termina THEN o site SHALL recarregar a aba, que volta a mostrar o painel com "Sortear" e o editor de restrições.
7. WHILE a API cancela o botão da confirmação SHALL mostrar "Cancelando…" e ficar desabilitado.
8. WHEN o grupo volta a ABERTO THEN o sistema SHALL aceitar de novo entrada, saída, remoção e mudança de restrições.
9. WHEN quem organiza sorteia de novo THEN o sistema SHALL criar uma rodada nova, sem relação com os pares da rodada cancelada.
10. IF o grupo está ABERTO THEN a API SHALL responder 409 "Este grupo ainda não fez o sorteio." sem mudar nada.
11. IF o grupo está ENCERRADO THEN a API SHALL responder 409 "Grupo encerrado não pode ser alterado." sem mudar nada.
12. IF quem pede não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." sem mudar nada.
13. IF a API responde 409 THEN o site SHALL fechar a confirmação e mostrar a mensagem da API num alerta vermelho no painel; outros erros, "Não foi possível concluir. Tente de novo."

**Independent Test**: Num grupo SORTEADO, cancelar volta o grupo a ABERTO, a rodada fica cancelada sem pares, e o pedido do resultado responde 404; sortear de novo cria outra rodada.

---

### P1: E-mails do sorteio ⭐ MVP

**User Story**: Como participante, quero receber por e-mail quem tirei e saber se o sorteio foi cancelado, sem precisar abrir o site.

**Why P1**: Tabela 4.7 do `scope.md`.

**Acceptance Criteria**:

1. WHEN o sorteio é feito THEN o sistema SHALL enfileirar, na mesma transação, um e-mail a cada participante da rodada, inclusive quem organiza.
2. The e-mail do resultado SHALL ter o assunto "O sorteio de {grupo} foi feito", sem o nome sorteado.
3. The e-mail do resultado SHALL ter o texto "{organizador} fez o sorteio do amigo secreto {grupo}.", depois "Você tirou: {nome}", depois "Só você recebeu este nome. Guarde segredo!" e o botão "Ver no site", que leva a `/grupos/{id}/sorteio`.
4. The texto de pré-visualização do e-mail do resultado SHALL não conter o nome sorteado.
5. IF o sorteio é cancelado ou o grupo é excluído antes de um e-mail de resultado sair THEN o sistema SHALL não enviar esse e-mail.
6. WHEN o sorteio é cancelado THEN o sistema SHALL enfileirar, na mesma transação, um e-mail a cada participante da rodada, menos quem cancelou, com o assunto "O sorteio de {grupo} foi cancelado", o texto "{organizador} cancelou o sorteio do amigo secreto {grupo}. O nome que você tirou não vale mais. Quando houver um novo sorteio, você recebe outro e-mail." e o botão "Ver grupo", que leva a `/grupos/{id}/sorteio`.
7. IF nomes de pessoa ou de grupo contêm marcação HTML THEN os e-mails SHALL mostrar o texto literal.
8. IF o sorteio ou o cancelamento é recusado THEN o sistema SHALL não enfileirar e-mail.
9. The job do e-mail do resultado SHALL não guardar o nome sorteado no payload.

**Independent Test**: Sortear um grupo de 3 enfileira 3 e-mails, cada um com o nome do próprio par só no corpo; cancelar logo em seguida faz os de resultado ainda na fila não saírem e enfileira 2 de cancelamento.

---

### P1: Lembrete de sortear ⭐ MVP

**User Story**: Como organizador, quero um e-mail na hora prevista do sorteio, para não esquecer de sortear.

**Why P1**: `scope.md` 4.4 e 4.7.

**Acceptance Criteria**:

1. WHEN um grupo é criado ou editado com sorteio previsto THEN o sistema SHALL agendar o lembrete para a data e hora do sorteio previsto.
2. WHEN chega a hora do lembrete e o grupo está ABERTO com o mesmo sorteio previsto THEN o sistema SHALL enviar a quem organiza o grupo nesse momento um e-mail com o assunto "Chegou a hora do sorteio de {grupo}", o texto "O sorteio do amigo secreto {grupo} estava previsto para agora. Confira quem já entrou e faça o sorteio." e o botão "Ir para o sorteio", que leva a `/grupos/{id}/sorteio`.
3. IF o grupo não está ABERTO na hora do lembrete THEN o sistema SHALL não enviar o e-mail.
4. IF o sorteio previsto foi mudado ou tirado depois do agendamento THEN o lembrete antigo SHALL não enviar e-mail.
5. IF o grupo foi excluído THEN o lembrete SHALL não enviar e-mail.
6. WHEN o sorteio previsto muda para outra data THEN o sistema SHALL enviar no máximo um lembrete, na data nova.
7. WHEN esta feature entra no ar THEN o sistema SHALL agendar o lembrete dos grupos ABERTOS com sorteio previsto no futuro.

**Independent Test**: Criar um grupo com sorteio previsto daqui a um minuto envia um lembrete; mudar a data antes disso faz só a data nova enviar; sortear antes da hora faz o lembrete não sair.

---

### P1: Sigilo do resultado ⭐ MVP

**User Story**: Como participante, quero ter certeza de que ninguém, nem quem organiza, descobre quem eu tirei.

**Why P1**: RN06 e `scope.md` 8 (sigilo do sorteio) e 11 (vazamento do resultado).

**Acceptance Criteria**:

1. The API SHALL não ter rota que devolva o par de outra pessoa, nem a quem organiza (RN06).
2. The respostas de sortear, cancelar, ler o painel e ler os pares de restrição SHALL não conter nenhum par sorteado.
3. WHEN a organização é transferida num grupo SORTEADO THEN quem passa a organizar SHALL continuar vendo só o próprio par (RN15).
4. The logs, os eventos, o Sentry e as mensagens de erro do sorteio, do resultado e dos e-mails SHALL não conter nome sorteado nem id de pessoa sorteada.
5. IF um participante pede o resultado de um grupo de que não participa THEN a API SHALL responder 404 "Grupo não encontrado."

**Independent Test**: Um teste percorre as rotas do sorteio como quem organiza e não encontra o par de outra pessoa em nenhuma resposta; o log de um sorteio não tem nomes.

---

### P1: Eventos do sorteio ⭐ MVP

**User Story**: Como dono do produto, quero contar sorteios, cancelamentos e lembretes, para medir quantos grupos chegam ao sorteio (`scope.md` 10).

**Why P1**: AD-005.

**Acceptance Criteria**:

1. WHEN um sorteio é feito THEN o sistema SHALL emitir `draw.performed` com `groupId`, `participants`, `singleCycle` e `hasExclusions`.
2. WHEN um sorteio é cancelado THEN o sistema SHALL emitir `draw.cancelled` com `groupId` e `minutesSinceDraw`.
3. WHEN um lembrete de sortear é enviado THEN o sistema SHALL emitir `draw.reminder_sent` com `groupId`.
4. The eventos do sorteio SHALL não conter nome, e-mail nem id de pessoa.
5. IF a operação é recusada (4xx) ou falha THEN o sistema SHALL não emitir o evento dela.

**Independent Test**: Sortear e cancelar produz `draw.performed` e `draw.cancelled` no log, só com os campos acima.

---

### P1: Tela acessível ⭐ MVP

**User Story**: Como pessoa usando o celular ou um leitor de tela, quero usar a aba Sorteio sem barreiras.

**Why P1**: WCAG 2.1 AA nas telas principais (`scope.md` 8).

**Acceptance Criteria**:

1. The `/grupos/{id}/sorteio` SHALL ter zero violações WCAG 2.1 A/AA no axe, nos temas claro e escuro, na visão de quem organiza com o grupo ABERTO e com o papelzinho dobrado e aberto.
2. The `/grupos/{id}/sorteio` SHALL não rolar na horizontal em 360 px e em 1440 px de largura.
3. WHEN a confirmação de sortear ou de cancelar abre THEN o site SHALL pôr o foco no botão que mantém o estado ("Ainda não", "Manter sorteio") e prender o Tab dentro dela.
4. The erros do editor de restrições SHALL ficar ligados aos campos por `aria-describedby`.

**Independent Test**: O axe roda na aba nos dois temas, nas visões acima, sem violações; nenhuma rola na horizontal em 360 px.

---

## Edge Cases

- IF dois pedidos de sorteio do mesmo grupo chegam ao mesmo tempo THEN o sistema SHALL criar uma rodada só e responder 409 "Este grupo já fez o sorteio." ao outro, com um conjunto só de e-mails (DRAW-04 AC 14).
- IF um pedido de entrada ou uma aprovação chega enquanto o grupo é sorteado THEN o sistema SHALL ou aplicá-lo antes do sorteio, e o sorteio o considera, ou responder o 409 da `05-invites` (DRAW-04 AC 25).
- IF um par é criado enquanto o grupo é sorteado THEN o sistema SHALL ou gravá-lo antes, e o sorteio o respeita, ou responder 409 (DRAW-02 AC 11).
- IF dois cancelamentos chegam ao mesmo tempo THEN o sistema SHALL cancelar uma vez, enviar um conjunto só de e-mails e responder 409 "Este grupo ainda não fez o sorteio." ao outro (DRAW-06 AC 10).
- IF o lembrete sai no mesmo instante do sorteio THEN o sistema SHALL ou enviá-lo antes de o grupo mudar, ou não enviá-lo (DRAW-08 AC 3).
- WHEN o grupo tem exatamente 3 participantes aprovados e nenhum par THEN o sorteio SHALL ser possível; com 2, SHALL ser recusado (DRAW-04 AC 16).
- WHEN o grupo tem 3 participantes aprovados e um par THEN o painel SHALL mostrar as restrições como pendentes, porque não há distribuição (DRAW-03 AC 7).
- WHEN o grupo tem 4 participantes e os pares deixam só A↔B e C↔D possíveis THEN o sorteio SHALL sair com esses dois pares fechados (DRAW-04 AC 9).
- WHEN o grupo teve 5 sorteios nas últimas 24 horas THEN o 6º SHALL receber 429; o 5º SHALL ser aceito (DRAW-04 AC 21).
- IF o nome do grupo ou da pessoa sorteada contém marcação HTML THEN a aba, o papelzinho e os e-mails SHALL mostrar o texto literal (DRAW-05 AC 3, DRAW-07 AC 7).
- IF a pessoa sorteada trocou o nome depois do sorteio THEN o papelzinho SHALL mostrar o nome novo (DRAW-05 AC 3).
- IF um par envolve quem organiza THEN o par SHALL valer como qualquer outro (DRAW-02 AC 3).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DRAW-01 | P1: Aba Sorteio | Tasks | Pending |
| DRAW-02 | P1: Restrições | Tasks | Pending |
| DRAW-03 | P1: Condições do sorteio | Tasks | Pending |
| DRAW-04 | P1: Sortear | Tasks | Pending |
| DRAW-05 | P1: Ver quem tirei | Tasks | Pending |
| DRAW-06 | P1: Cancelar o sorteio | Tasks | Pending |
| DRAW-07 | P1: E-mails do sorteio | Tasks | Pending |
| DRAW-08 | P1: Lembrete de sortear | Tasks | Pending |
| DRAW-09 | P1: Sigilo do resultado | Tasks | Pending |
| DRAW-10 | P1: Eventos do sorteio | Tasks | Pending |
| DRAW-11 | P1: Tela acessível | Tasks | Pending |

**ID format:** `DRAW-NN`; cada check cita o ID e o número do critério (ex.: DRAW-04, AC 6).

**Coverage:** 11 total, 11 mapped to tasks (T1 a T23), 0 unmapped

---

## Sources

- `.specs/docs/scope.md` - 2.2 (restrições gratuitas), 3 (organizador sempre participa), 4.2 (status e diagrama), 4.4 (sorteio), 4.7 (e-mails), 4.9.1 (revelação, Pós-MVP), 5 (RN02 a RN08, RN10, RN11, RN14, RN15), 5.1 (algoritmo), 6 (`Exclusion`, `Draw`, `Assignment`), 7.3 (área logada), 8 (sigilo, performance, acessibilidade, observabilidade), 10 (métricas do sorteio) e 11 (vazamento do resultado).
- `.specs/features/06-draw/context.md` - decisões do usuário de 2026-11-25, com as palavras dele.
- `.specs/STATE.md` - AD-001 (dono do sorteio), AD-005 (eventos), AD-011 (sessão), AD-012 (rotas autenticadas), AD-013 (CSRF), AD-014 (rate limit), AD-015 (regras de formulário no `packages/shared`), AD-016 (`GroupAccess`, ordem 404, 403, 409, 400, 429).
- `.specs/features/05-invites/spec.md` - INV-06 (abas), INV-07 e INV-08 (remover e sair passam a apagar pares), INV-09 (transferência), 409 do grupo SORTEADO (RN07).
- `.specs/features/04-groups/spec.md` - sorteio previsto (datas no futuro, antes da confraternização), encerrar só de SORTEADO, excluir em qualquer status.
- `.specs/features/02-email-jobs/spec.md` - fila na mesma transação, payload sem dado sigiloso.
- Design system "Cristal e Gelo" (artifact privado no claude.ai) - DrawPanel, ExclusionEditor, ResultCard, ConfirmDialog, Tabs; textos dos componentes copiados dos previews. Não há captura de tela: as telas seguem o design system e os critérios dizem o que se vê e se faz, não onde.

---

## Success Criteria

- [ ] Quem organiza sai da aba Sorteio com o grupo sorteado em menos de 1 minuto, pelo celular.
- [ ] Nenhum teste encontra uma distribuição com auto-sorteio, par de restrição junto, pessoa sem par ou pessoa tirada duas vezes.
- [ ] Nenhum teste encontra rota, resposta, log, evento ou e-mail que mostre a alguém o par de outra pessoa.
- [ ] Nenhum teste encontra e-mail de resultado de rodada cancelada entregue.
