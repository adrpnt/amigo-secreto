# Groups verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 288c973
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `groups-create.int-spec.ts` `cria o grupo ABERTO só com o nome, com a pessoa organizadora e participante aprovada`; `e2e/groups.spec.ts` `cria um grupo só com o nome a partir de Meus grupos e abre a página dele` | yes |
| C2 | `groups-create.int-spec.ts` `grava todos os campos opcionais enviados`; `e2e/groups.spec.ts` `cria um grupo com todos os campos e mostra cada um na página` | yes |
| C3 | `shared/groups.spec.ts` `grava o máximo igual ao mínimo quando só o mínimo vem`; `groups-create.int-spec.ts` `grava mínimo e máximo iguais quando só o valor inicial vem` | yes |
| C4 | `groups-create.int-spec.ts` `grava a faixa quando os dois valores vêm` | yes |
| C5 | `shared/groups.spec.ts` `recusa nome vazio depois do trim e com 81 pontos de código com a mensagem do nome`; `groups-create.int-spec.ts` `recusa com 400 e a mensagem do campo nome vazio ou com 81 caracteres`; `group-form.test.tsx` `mostra a mensagem de cada regra violada antes de enviar` | yes |
| C6 | `shared/groups.spec.ts` `aceita recado com 1000 pontos de código e recusa com 1001`; `groups-create.int-spec.ts` `recusa com 400 recado com 1001 caracteres` | yes |
| C7 | `shared/groups.spec.ts` `aceita valores 1 e 100000 e recusa 0, 100001 e 50.5`; `groups-create.int-spec.ts` `recusa com 400 valor fora de 1 a 100000 ou não inteiro` | yes |
| C8 | `shared/groups.spec.ts` `recusa o valor final sem o inicial`; `groups-create.int-spec.ts` `recusa com 400 o valor final sem o inicial` | yes |
| C9 | `shared/groups.spec.ts` `recusa valor inicial maior que o final e aceita iguais`; `groups-create.int-spec.ts` `recusa com 400 valor inicial maior que o final` | yes |
| C10 | `shared/groups.spec.ts` `recusa sorteio previsto ou confraternização no passado`; `groups-create.int-spec.ts` `recusa com 400 data no passado` | yes |
| C11 | `shared/groups.spec.ts` `recusa sorteio previsto igual ou depois da confraternização`; `groups-create.int-spec.ts` `recusa com 400 sorteio previsto depois da confraternização`; `e2e/groups.spec.ts` `mostra o erro do campo ao enviar sorteio depois da confraternização` | yes |
| C12 | `shared/groups.spec.ts` `aceita local com 200 pontos de código e recusa com 201`; `groups-create.int-spec.ts` `recusa com 400 local com 201 caracteres` | yes |
| C13 | `groups-create.int-spec.ts` `recusa com 429 a 21ª criação da hora e aceita a 20ª` e `não conta no limite a criação recusada com 400`; `group-form.test.tsx` `mostra a mensagem da API num 429` | yes |
| C14 | `groups-create.int-spec.ts` `cria o grupo para conta com e-mail não confirmado` | yes |
| C15 | `brasilia-time.spec.ts` `converte 2026-12-20T19:00 para 2026-12-20T22:00:00.000Z`, `devolve o valor do campo no horário de Brasília`, `formata 2026-12-20T22:00:00.000Z como 20/12/2026 às 19:00`; `groups-create.int-spec.ts` `grava as datas com o fuso e devolve o mesmo instante`; `group-form.test.tsx` `envia as datas digitadas como instantes no horário de Brasília` | yes |
| C16 | `group-form.test.tsx` `desabilita o botão e mostra Salvando... durante o envio, na criação e na edição` | yes |
| C17 | `group-form.test.tsx` `mantém os campos e mostra Não foi possível salvar. Tente de novo. num erro inesperado` | yes |
| C18 | `groups-list.int-spec.ts` `separa ativos (ABERTO e SORTEADO) de encerrados, do mais novo para o mais antigo`; `my-groups-view.test.tsx` `lista Ativos e Encerrados na ordem recebida` | yes |
| C19 | `groups-list.int-spec.ts` `não lista grupo de que a pessoa não participa nem participação pendente ou recusada` | yes |
| C20 | `groups-list.int-spec.ts` `conta só os participantes aprovados`; `group-format.test.ts` `escreve 1 participante e N participantes`; `status-tag.test.tsx` `escreve ABERTO, SORTEADO e ENCERRADO com ícone`; `group-card.test.tsx` `mostra nome, status, participantes e a linha da data` | yes |
| C21 | `group-format.test.ts` `mostra Sorteio em dd/mm/aaaa para grupo ABERTO` | yes |
| C22 | `group-format.test.ts` `mostra Confraternização em dd/mm/aaaa para grupo SORTEADO ou ENCERRADO`; `brasilia-time.spec.ts` `formata a data no horário de Brasília, inclusive perto da meia-noite UTC` | yes |
| C23 | `group-format.test.ts` `mostra Sem data definida quando a data do status não existe` | yes |
| C24 | `groups-list.int-spec.ts` `marca isOrganizer só no grupo que a pessoa organiza`; `group-card.test.tsx` `mostra a tag Você organiza só para quem organiza`; `e2e/groups.spec.ts` `lista o grupo criado em Ativos com Você organiza` | yes |
| C25 | `group-card.test.tsx` `é um link para a página do grupo`; `e2e/groups.spec.ts` `o card leva à página do grupo` | yes |
| C26 | `e2e/groups.spec.ts` `cria um grupo só com o nome a partir de Meus grupos e abre a página dele` | yes |
| C27 | `groups-list.int-spec.ts` `devolve listas vazias para quem não participa de nenhum grupo`; `my-groups-view.test.tsx` `mostra o estado vazio com Criar grupo`; `e2e/groups.spec.ts` `mostra o estado vazio para quem não participa de nenhum grupo` | yes |
| C28 | `my-groups-view.test.tsx` `omite Encerrados sem grupo encerrado` | yes |
| C29 | `my-groups-view.test.tsx` `mostra Nenhum grupo ativo. só com encerrados` | yes |
| C30 | `groups.test.ts` `lança erro quando a API não responde 200`; `my-groups-view.test.tsx` `mostra o erro com Tentar de novo, que recarrega` | yes |
| C31 | `groups-detail.int-spec.ts` `devolve os dados do grupo, o nome de quem organiza e isOrganizer ao participante aprovado`; `group-detail-view.test.tsx` `mostra os campos preenchidos e Organizado por`; `e2e/groups.spec.ts` `cria um grupo com todos os campos e mostra cada um na página` | yes |
| C32 | `group-detail-view.test.tsx` `omite os campos vazios` | yes |
| C33 | `group-format.test.ts` `mostra R$ 50 quando mínimo e máximo são iguais`, `mostra R$ 50 a R$ 100 numa faixa`, `mostra R$ 1.500 com ponto de milhar` | yes |
| C34 | `group-detail-view.test.tsx` `mostra Evento online junto do local` | yes |
| C35 | `group-detail-view.test.tsx` `mostra Entrada com aprovação só para quem organiza` | yes |
| C36 | `group-actions.test.tsx` `mostra Editar grupo e Excluir grupo ao organizador de grupo ABERTO` | yes |
| C37 | `group-actions.test.tsx` `mostra Editar grupo, Encerrar grupo e Excluir grupo ao organizador de grupo SORTEADO` | yes |
| C38 | `group-actions.test.tsx` `mostra só Excluir grupo ao organizador de grupo ENCERRADO` | yes |
| C39 | `group-detail-view.test.tsx` `não mostra ações a quem não organiza` e `mostra Entrada com aprovação só para quem organiza` | yes |
| C40 | `groups-detail.int-spec.ts` `responde 404 igual para id inexistente, id que não é UUID e grupo de que a pessoa não participa`; `group-access.int-spec.ts` `responde 404 para quem não participa e para participação pendente ou recusada`; `groups.test.ts` `devolve null quando a API responde 404`; `e2e/groups.spec.ts` `mostra Grupo não encontrado. para quem não participa e para id inexistente` | yes |
| C41 | `groups-detail.int-spec.ts` `devolve o recado com quebras de linha e marcação HTML como texto`; `group-detail-view.test.tsx` `mostra o recado com quebras de linha e marcação HTML como texto` | yes |
| C42 | `shared/groups.spec.ts` `mantém as quebras de linha do recado`; `group-detail-view.test.tsx` `mostra o recado com quebras de linha e marcação HTML como texto` | yes |
| C43 | `group-form.test.tsx` `abre preenchido com os dados atuais do grupo`; `e2e/groups.spec.ts` `edita o valor para uma faixa e apaga o local` | yes |
| C44 | `groups-update.int-spec.ts` `grava os campos enviados em grupo ABERTO` e `grava os campos enviados em grupo SORTEADO`; `e2e/groups.spec.ts` `edita o valor para uma faixa e apaga o local` | yes |
| C45 | `groups-update.int-spec.ts` `apaga o campo opcional enviado como null`; `shared/groups.spec.ts` `tira os espaços das pontas e troca texto vazio por null` | yes |
| C46 | `groups-update.int-spec.ts` `recusa com 400 a mesma regra da criação e não altera o grupo` | yes |
| C47 | `shared/groups.spec.ts` `aceita data igual à gravada mesmo no passado`; `groups-update.int-spec.ts` `aceita uma data gravada que ficou no passado quando ela não muda` | yes |
| C48 | `shared/groups.spec.ts` `recusa data alterada para o passado mesmo com data gravada`; `groups-update.int-spec.ts` `recusa com 400 uma data alterada para o passado` | yes |
| C49 | `groups-update.int-spec.ts` `responde 403 ao participante que não organiza e não altera o grupo`; `group-access.int-spec.ts` `responde 403 para participante aprovado que não organiza` | yes |
| C50 | `groups-update.int-spec.ts` `responde 409 em grupo ENCERRADO e não altera o grupo` | yes |
| C51 | `edit-redirect.test.ts` `leva à página do grupo quem não organiza e o grupo ENCERRADO` | yes |
| C52 | `group-form.test.tsx` `desabilita o botão e mostra Salvando... durante o envio, na criação e na edição` | yes |
| C53 | `group-form.test.tsx` `Voltar leva à página do grupo sem enviar nada` | yes |
| C54 | `group-actions.test.tsx` `abre a confirmação de exclusão com o texto da spec`; `confirm-dialog.test.tsx` `abre com o título, o texto e os dois botões` | yes |
| C55 | `confirm-dialog.test.tsx` `fecha sem confirmar com Manter grupo, Esc e toque fora`; `e2e/groups.spec.ts` `Manter grupo fecha a confirmação sem excluir` | yes |
| C56 | `groups-delete.int-spec.ts` `apaga o grupo e as participações`; `group-actions.test.tsx` `exclui e leva a /grupos ao confirmar`; `e2e/groups.spec.ts` `exclui o grupo depois de confirmar e ele some de Meus grupos` | yes |
| C57 | `groups-delete.int-spec.ts` `exclui grupo ABERTO, SORTEADO e ENCERRADO` | yes |
| C58 | `groups-delete.int-spec.ts` `enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec` e `desfaz a exclusão e os avisos quando a gravação falha`; `group-emails.spec.ts` `aviso de exclusão tem o assunto, o texto e o botão Ver meus grupos` | yes |
| C59 | `groups-delete.int-spec.ts` `não enfileira aviso para quem organiza nem para participação pendente ou recusada` | yes |
| C60 | `groups-delete.int-spec.ts` `responde 403 ao participante que não organiza e não apaga nada` | yes |
| C61 | `groups-delete.int-spec.ts` `responde 404 a grupo que não existe mais e não enfileira e-mail` | yes |
| C62 | `email-verification.int-spec.ts` `devolve /grupos como destino quando o cadastro não tinha origem`; `safe-next.test.ts` `troca por /grupos um valor ausente`; `e2e/groups.spec.ts` `entrar sem origem leva a /grupos` | yes |
| C63 | `safe-next.test.ts` `troca por /grupos um caminho que começa com //`, `... com /\`, `um endereço com esquema`, `os caminhos /entrar e /cadastro`; `google-login.int-spec.ts` e `register.int-spec.ts` `troca por /grupos um destino de outro site` | yes |
| C64 | `user-menu-dropdown.test.tsx` `mostra Meus grupos, Perfil e Sair nesta ordem` | yes |
| C65 | `e2e/groups.spec.ts` `menu do avatar mostra Meus grupos, Perfil e Sair e leva a /grupos` | yes |
| C66 | `e2e/groups.spec.ts` `logado em / vai para /grupos` | yes |
| C67 | `e2e/groups.spec.ts` `sem sessão / continua mostrando a página atual` | yes |
| C68 | `e2e/groups.spec.ts` `leva a /entrar e volta a /grupos/novo depois do login` e `sem sessão as quatro telas levam a /entrar com o caminho como origem`; `groups-create.int-spec.ts` `responde 401 sem sessão` | yes |
| C69 | `groups-create.int-spec.ts` `emite group.created com o groupId e sem dados pessoais` | yes |
| C70 | `groups-update.int-spec.ts` `emite group.updated com os nomes dos campos que mudaram e sem dados pessoais` | yes |
| C71 | `groups-close.int-spec.ts` `emite group.closed com trigger manual e sem dados pessoais` | yes |
| C72 | `groups-delete.int-spec.ts` `emite group.deleted com o groupId, o status e sem dados pessoais` | yes |
| C73 | os quatro testes `emite group.* ... sem dados pessoais` de `groups-create`, `groups-update`, `groups-close` e `groups-delete.int-spec.ts` | yes |
| C74 | `groups-create.int-spec.ts` `não emite group.created quando a criação é recusada`; `groups-update.int-spec.ts` `não emite group.updated quando nada muda nem quando a edição é recusada`; `groups-delete.int-spec.ts` `não emite group.deleted quando a exclusão é recusada com 403 ou 404`; `groups-close.int-spec.ts` `não emite group.closed quando o encerramento é recusado com 403 ou 409` | yes |
| C75 | `e2e/accessibility.spec.ts` `telas de grupo sem violações WCAG 2.1 A/AA no tema claro` e `... no tema escuro` | yes |
| C76 | `e2e/accessibility.spec.ts` `telas de grupo não rolam na horizontal em 360 px e 1440 px` | yes |
| C77 | `confirm-dialog.test.tsx` `põe o foco em Manter grupo e prende o Tab` | yes |
| C78 | `group-actions.test.tsx` `abre a confirmação de encerramento com o texto da spec` e `confirma o encerramento em tom primário e a exclusão em tom destrutivo` | yes |
| C79 | `group-actions.test.tsx` `Manter grupo fecha a confirmação de encerramento sem chamar a API`; `confirm-dialog.test.tsx` `fecha sem confirmar com Manter grupo, Esc e toque fora` | yes |
| C80 | `groups-close.int-spec.ts` `passa o grupo SORTEADO para ENCERRADO e grava a data do encerramento`; `group-actions.test.tsx` `encerra e atualiza a página ao confirmar` | yes |
| C81 | `groups-close.int-spec.ts` `responde 409 em grupo ABERTO ou ENCERRADO e não muda o grupo`; `group-actions.test.tsx` `mostra a mensagem da API quando o encerramento recebe 409` | yes |
| C82 | `groups-close.int-spec.ts` `responde 403 ao participante que não organiza e não muda o grupo` | yes |
| C83 | `groups-close.int-spec.ts` `enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec` e `desfaz o encerramento quando a gravação dos avisos falha`; `group-emails.spec.ts` `aviso de encerramento tem o assunto, o texto e o botão Ver grupo` | yes |
| C84 | `groups-close.int-spec.ts` `não enfileira aviso para quem organiza nem para participação pendente ou recusada` | yes |
| C85 | `groups-delete.int-spec.ts` `exclui uma vez e responde 404 ao segundo pedido simultâneo, com os avisos enfileirados uma vez`; `group-access.int-spec.ts` `trava a linha do grupo até a transação terminar` | yes |
| C86 | `groups-close.int-spec.ts` `encerra uma vez e responde 409 ao segundo pedido simultâneo, com os avisos enfileirados uma vez` | yes |
| C87 | `groups-update.int-spec.ts` `responde 409 à edição que espera o encerramento terminar` | yes |
| C88 | `groups-update.int-spec.ts` `responde 404 à edição de grupo excluído`; `groups-delete.int-spec.ts` `responde 404 a grupo que não existe mais e não enfileira e-mail` | yes |
| C89 | `group-emails.spec.ts` `mostram o nome do grupo com marcação HTML como texto` | yes |
| C90 | `shared/groups.spec.ts` `aceita nome com 1 e com 80 pontos de código, inclusive emojis`; `groups-create.int-spec.ts` `recusa com 400 nome com 80 "❤️", que o banco conta como 160 caracteres` | yes |
| C91 | `shared/groups.spec.ts` `aceita valores 1 e 100000 e recusa 0, 100001 e 50.5` | yes |
| C92 | `groups-create.int-spec.ts` `recusa com 429 a 21ª criação da hora e aceita a 20ª` | yes |
| C93 | `group-form.test.tsx` `abre o valor único sem o Até e salva só o valor trocado` | yes |
| C94 | `group-form.test.tsx` `lê o ponto como milhar e recusa decimal, vírgula e letras no valor` | yes |
| C95 | `group-form.test.tsx` `mostra a mensagem da API num 403 e num 409` | yes |
| C96 | `group-actions.test.tsx` `mostra a mensagem da API quando o encerramento recebe 409` | yes |
| C97 | `group-actions.test.tsx` `leva a /grupos quando o grupo já foi excluído` | yes |
| C98 | `group-actions.test.tsx` `mostra Não foi possível concluir. Tente de novo. num erro inesperado` | yes |
| C99 | `group-actions.test.tsx` `desabilita o botão e mostra Excluindo… e Encerrando… durante o pedido` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Na edição de um grupo com valor único, o "Até (R$)" abre preenchido com o mesmo valor; trocar só o "Valor do presente (R$)" (50 para 80) é barrado com "O valor inicial não pode passar do valor final." e nada é enviado | Exemplo próprio em `GroupForm` com `giftMinValue: 50, giftMaxValue: 50`: "Até" inicial `"50"`, erro no campo do valor, `apiFetch` chamado 0 vezes. `initialValues` em `group-form.tsx:52-53` copia `giftMaxValue` sempre; a spec diz que "Até (R$)" é "só para faixa" e GRP-01 AC 3 trata valor único como mínimo = máximo | abrir o "Até (R$)" vazio quando mínimo = máximo e cobrir com um teste de `GroupForm` que edita um grupo de valor único trocando só o valor | `7c07c6b` - C93 (`GroupForm > abre o valor único sem o Até e salva só o valor trocado`), GRP-10 AC 1 |
| "1.000" digitado no "Valor do presente (R$)" vira R$ 1 sem nenhuma mensagem | Exemplo próprio em `GroupForm`: corpo enviado `giftMinValue: 1, giftMaxValue: 1`, sem erro no campo. `toNumber` em `group-form.tsx:64-67` usa `Number("1.000")`; a própria página mostra valores com ponto de milhar (`R$ 1.500`, GRP-03 AC 3), então a pessoa grava um valor mil vezes menor | recusar (ou interpretar como milhar) entrada com separador e cobrir com um teste de `GroupForm` para "1.000" e "1.500" | `009bdbf` - C94 (`GroupForm > lê o ponto como milhar e recusa decimal, vírgula e letras no valor`), GRP-10 AC 2 |
| C74 prova "operação recusada não emite evento" só na criação e na edição | `groups-delete.int-spec.ts` e `groups-close.int-spec.ts` não capturam eventos nos casos 403, 404 e 409; GRP-07 AC 6 vale para as quatro operações | capturar eventos nos testes de 403/404 da exclusão e de 403/409 do encerramento e conferir que `group.deleted` e `group.closed` não aparecem | `fdb3460` - C74 (`excluir grupo > não emite group.deleted quando a exclusão é recusada com 403 ou 404`; `encerrar grupo > não emite group.closed quando o encerramento é recusado com 403 ou 409`) |
| C78 não confere o tom primário da confirmação de encerramento | `group-actions.test.tsx` `abre a confirmação de encerramento com o texto da spec` só lê título, descrição e textos dos botões; `tone="primary"` em `group-actions.tsx:125` pode virar destrutivo sem teste falhar | conferir no teste que o botão "Encerrar grupo" usa a variante primária (e o "Excluir grupo" a destrutiva) | `d0d6d79` - C78 (`GroupActions > confirma o encerramento em tom primário e a exclusão em tom destrutivo`) |
| C83 não prova que o aviso de encerramento entra na mesma transação | Nenhum teste do encerramento faz a gravação falhar depois do `enqueueMany`; a exclusão tem esse teste (`desfaz a exclusão e os avisos quando a gravação falha`) | acrescentar em `groups-close.int-spec.ts` um teste que força falha na transação e confere grupo SORTEADO e zero avisos | `1162df5` - C83 (`encerrar grupo > desfaz o encerramento quando a gravação dos avisos falha`) |
| C68 prova o redirecionamento sem sessão em 1 das 4 telas | `e2e/groups.spec.ts` `leva a /entrar e volta a /grupos/novo depois do login` só abre `/grupos/novo`; GRP-06 AC 7 nomeia também `/grupos`, `/grupos/{id}` e `/grupos/{id}/editar`, cada uma com seu próprio `requireUser(caminho)` | abrir as quatro rotas sem sessão e conferir `/entrar?next=<caminho da página>` em cada uma | `5a61e27` - C68 (`grupos › sem sessão as quatro telas levam a /entrar com o caminho como origem`) |
| Regras de tela da página do grupo sem critério nem check: "Não foi possível concluir. Tente de novo." em falha de excluir/encerrar, botões "Excluindo…" e "Encerrando…" desabilitados durante o pedido, exclusão com 404 levando a `/grupos`, e o formulário mostrando a mensagem da API num 403 e num 409 | `group-actions.tsx:13`, `:57-58`, `:119`, `:130`; `group-form.tsx:27`. Têm testes (`group-actions.test.tsx`, `group-form.test.tsx` `mostra a mensagem da API num 403 e num 409`), mas nenhuma check os nomeia e a spec não fixa esses textos | acrescentar à spec um requisito novo com esses textos e comportamentos, com uma check que cite os testes existentes | `48c0cd4` - GRP-11 AC 1 a 5, checks C95 a C99 sobre os testes existentes |
