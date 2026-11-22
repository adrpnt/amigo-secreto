# 04-groups proofs

**HEAD**: 288c973
**Tree**: clean
**Shell**: /bin/sh
**Result**: 168 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run api / ✓ criar grupo > cria o grupo ABERTO só com o nome, com a pessoa organizadora e participante aprovada` | pass |
| C1 | `run e2e / ✓ grupos › cria um grupo só com o nome a partir de Meus grupos e abre a página dele` | pass |
| C2 | `run api / ✓ criar grupo > grava todos os campos opcionais enviados` | pass |
| C2 | `run e2e / ✓ grupos › cria um grupo com todos os campos e mostra cada um na página` | pass |
| C3 | `run shared / ✓ normalizeGroupInput > grava o máximo igual ao mínimo quando só o mínimo vem` | pass |
| C3 | `run api / ✓ criar grupo > grava mínimo e máximo iguais quando só o valor inicial vem` | pass |
| C4 | `run api / ✓ criar grupo > grava a faixa quando os dois valores vêm` | pass |
| C5 | `run shared / ✓ validateGroupInput > recusa nome vazio depois do trim e com 81 pontos de código com a mensagem ` | pass |
| C5 | `run api / ✓ criar grupo > recusa com 400 e a mensagem do campo nome vazio ou com 81 caracteres` | pass |
| C5 | `run web / ✓ GroupForm > mostra a mensagem de cada regra violada antes de enviar` | pass |
| C6 | `run shared / ✓ validateGroupInput > aceita recado com 1000 pontos de código e recusa com 1001` | pass |
| C6 | `run api / ✓ criar grupo > recusa com 400 recado com 1001 caracteres` | pass |
| C7 | `run shared / ✓ validateGroupInput > aceita valores 1 e 100000 e recusa 0, 100001 e 50.5` | pass |
| C7 | `run api / ✓ criar grupo > recusa com 400 valor fora de 1 a 100000 ou não inteiro` | pass |
| C8 | `run shared / ✓ validateGroupInput > recusa o valor final sem o inicial` | pass |
| C8 | `run api / ✓ criar grupo > recusa com 400 o valor final sem o inicial` | pass |
| C9 | `run shared / ✓ validateGroupInput > recusa valor inicial maior que o final e aceita iguais` | pass |
| C9 | `run api / ✓ criar grupo > recusa com 400 valor inicial maior que o final` | pass |
| C10 | `run shared / ✓ validateGroupInput > recusa sorteio previsto ou confraternização no passado` | pass |
| C10 | `run api / ✓ criar grupo > recusa com 400 data no passado` | pass |
| C11 | `run shared / ✓ validateGroupInput > recusa sorteio previsto igual ou depois da confraternização` | pass |
| C11 | `run api / ✓ criar grupo > recusa com 400 sorteio previsto depois da confraternização` | pass |
| C11 | `run e2e / ✓ grupos › mostra o erro do campo ao enviar sorteio depois da confraternização` | pass |
| C12 | `run shared / ✓ validateGroupInput > aceita local com 200 pontos de código e recusa com 201` | pass |
| C12 | `run api / ✓ criar grupo > recusa com 400 local com 201 caracteres` | pass |
| C13 | `run api / ✓ criar grupo > recusa com 429 a 21ª criação da hora e aceita a 20ª` | pass |
| C13 | `run api / ✓ criar grupo > não conta no limite a criação recusada com 400` | pass |
| C13 | `run web / ✓ GroupForm > mostra a mensagem da API num 429` | pass |
| C14 | `run api / ✓ criar grupo > cria o grupo para conta com e-mail não confirmado` | pass |
| C15 | `run shared / ✓ brasiliaInputToIso > converte 2026-12-20T19:00 para 2026-12-20T22:00:00.000Z` | pass |
| C15 | `run shared / ✓ isoToBrasiliaInput > devolve o valor do campo no horário de Brasília` | pass |
| C15 | `run shared / ✓ formatBrasiliaDateTime > formata 2026-12-20T22:00:00.000Z como 20/12/2026 às 19:00` | pass |
| C15 | `run api / ✓ criar grupo > grava as datas com o fuso e devolve o mesmo instante` | pass |
| C15 | `run web / ✓ GroupForm > envia as datas digitadas como instantes no horário de Brasília` | pass |
| C16 | `run web / ✓ GroupForm > desabilita o botão e mostra Salvando... durante o envio, na criação e na edição` | pass |
| C17 | `run web / ✓ GroupForm > mantém os campos e mostra Não foi possível salvar. Tente de novo. num erro inesperado` | pass |
| C18 | `run api / ✓ meus grupos > separa ativos (ABERTO e SORTEADO) de encerrados, do mais novo para o mais antigo` | pass |
| C18 | `run web / ✓ MyGroupsView > lista Ativos e Encerrados na ordem recebida` | pass |
| C19 | `run api / ✓ meus grupos > não lista grupo de que a pessoa não participa nem participação pendente ou recusada` | pass |
| C20 | `run api / ✓ meus grupos > conta só os participantes aprovados` | pass |
| C20 | `run web / ✓ participantsLabel > escreve 1 participante e N participantes` | pass |
| C20 | `run web / ✓ StatusTag > escreve ABERTO, SORTEADO e ENCERRADO com ícone` | pass |
| C20 | `run web / ✓ GroupCard > mostra nome, status, participantes e a linha da data` | pass |
| C21 | `run web / ✓ cardDateLine > mostra Sorteio em dd/mm/aaaa para grupo ABERTO` | pass |
| C22 | `run web / ✓ cardDateLine > mostra Confraternização em dd/mm/aaaa para grupo SORTEADO ou ENCERRADO` | pass |
| C22 | `run shared / ✓ formatBrasiliaDate > formata a data no horário de Brasília, inclusive perto da meia-noite UTC` | pass |
| C23 | `run web / ✓ cardDateLine > mostra Sem data definida quando a data do status não existe` | pass |
| C24 | `run api / ✓ meus grupos > marca isOrganizer só no grupo que a pessoa organiza` | pass |
| C24 | `run web / ✓ GroupCard > mostra a tag Você organiza só para quem organiza` | pass |
| C24 | `run e2e / ✓ grupos › lista o grupo criado em Ativos com Você organiza` | pass |
| C25 | `run web / ✓ GroupCard > é um link para a página do grupo` | pass |
| C25 | `run e2e / ✓ grupos › o card leva à página do grupo` | pass |
| C26 | `run e2e / ✓ grupos › cria um grupo só com o nome a partir de Meus grupos e abre a página dele` | pass |
| C27 | `run api / ✓ meus grupos > devolve listas vazias para quem não participa de nenhum grupo` | pass |
| C27 | `run web / ✓ MyGroupsView > mostra o estado vazio com Criar grupo` | pass |
| C27 | `run e2e / ✓ grupos › mostra o estado vazio para quem não participa de nenhum grupo` | pass |
| C28 | `run web / ✓ MyGroupsView > omite Encerrados sem grupo encerrado` | pass |
| C29 | `run web / ✓ MyGroupsView > mostra Nenhum grupo ativo. só com encerrados` | pass |
| C30 | `run web / ✓ getMyGroups > lança erro quando a API não responde 200` | pass |
| C30 | `run web / ✓ MyGroupsView > mostra o erro com Tentar de novo, que recarrega` | pass |
| C31 | `run api / ✓ ver grupo > devolve os dados do grupo, o nome de quem organiza e isOrganizer ao participante aprov` | pass |
| C31 | `run web / ✓ GroupDetailView > mostra os campos preenchidos e Organizado por` | pass |
| C31 | `run e2e / ✓ grupos › cria um grupo com todos os campos e mostra cada um na página` | pass |
| C32 | `run web / ✓ GroupDetailView > omite os campos vazios` | pass |
| C33 | `run web / ✓ formatGiftValue > mostra R$ 50 quando mínimo e máximo são iguais` | pass |
| C33 | `run web / ✓ formatGiftValue > mostra R$ 50 a R$ 100 numa faixa` | pass |
| C33 | `run web / ✓ formatGiftValue > mostra R$ 1.500 com ponto de milhar` | pass |
| C34 | `run web / ✓ GroupDetailView > mostra Evento online junto do local` | pass |
| C35 | `run web / ✓ GroupDetailView > mostra Entrada com aprovação só para quem organiza` | pass |
| C36 | `run web / ✓ GroupActions > mostra Editar grupo e Excluir grupo ao organizador de grupo ABERTO` | pass |
| C37 | `run web / ✓ GroupActions > mostra Editar grupo, Encerrar grupo e Excluir grupo ao organizador de grupo SORTEAD` | pass |
| C38 | `run web / ✓ GroupActions > mostra só Excluir grupo ao organizador de grupo ENCERRADO` | pass |
| C39 | `run web / ✓ GroupDetailView > não mostra ações a quem não organiza` | pass |
| C39 | `run web / ✓ GroupDetailView > mostra Entrada com aprovação só para quem organiza` | pass |
| C40 | `run api / ✓ ver grupo > responde 404 igual para id inexistente, id que não é UUID e grupo de que a pessoa não ` | pass |
| C40 | `run api / ✓ acesso ao grupo > responde 404 para quem não participa e para participação pendente ou recusada` | pass |
| C40 | `run web / ✓ getGroup > devolve null quando a API responde 404` | pass |
| C40 | `run e2e / ✓ grupos › mostra Grupo não encontrado. para quem não participa e para id inexistente` | pass |
| C41 | `run api / ✓ ver grupo > devolve o recado com quebras de linha e marcação HTML como texto` | pass |
| C41 | `run web / ✓ GroupDetailView > mostra o recado com quebras de linha e marcação HTML como texto` | pass |
| C42 | `run shared / ✓ normalizeGroupInput > mantém as quebras de linha do recado` | pass |
| C42 | `run web / ✓ GroupDetailView > mostra o recado com quebras de linha e marcação HTML como texto` | pass |
| C43 | `run web / ✓ GroupForm > abre preenchido com os dados atuais do grupo` | pass |
| C43 | `run e2e / ✓ grupos › edita o valor para uma faixa e apaga o local` | pass |
| C44 | `run api / ✓ editar grupo > grava os campos enviados em grupo ABERTO` | pass |
| C44 | `run api / ✓ editar grupo > grava os campos enviados em grupo SORTEADO` | pass |
| C44 | `run e2e / ✓ grupos › edita o valor para uma faixa e apaga o local` | pass |
| C45 | `run api / ✓ editar grupo > apaga o campo opcional enviado como null` | pass |
| C45 | `run shared / ✓ normalizeGroupInput > tira os espaços das pontas e troca texto vazio por null` | pass |
| C46 | `run api / ✓ editar grupo > recusa com 400 a mesma regra da criação e não altera o grupo` | pass |
| C47 | `run shared / ✓ validateGroupInput > aceita data igual à gravada mesmo no passado` | pass |
| C47 | `run api / ✓ editar grupo > aceita uma data gravada que ficou no passado quando ela não muda` | pass |
| C48 | `run shared / ✓ validateGroupInput > recusa data alterada para o passado mesmo com data gravada` | pass |
| C48 | `run api / ✓ editar grupo > recusa com 400 uma data alterada para o passado` | pass |
| C49 | `run api / ✓ editar grupo > responde 403 ao participante que não organiza e não altera o grupo` | pass |
| C49 | `run api / ✓ acesso ao grupo > responde 403 para participante aprovado que não organiza` | pass |
| C50 | `run api / ✓ editar grupo > responde 409 em grupo ENCERRADO e não altera o grupo` | pass |
| C51 | `run web / ✓ editRedirect > leva à página do grupo quem não organiza e o grupo ENCERRADO` | pass |
| C52 | `run web / ✓ GroupForm > desabilita o botão e mostra Salvando... durante o envio, na criação e na edição` | pass |
| C53 | `run web / ✓ GroupForm > Voltar leva à página do grupo sem enviar nada` | pass |
| C54 | `run web / ✓ GroupActions > abre a confirmação de exclusão com o texto da spec` | pass |
| C54 | `run web / ✓ ConfirmDialog > abre com o título, o texto e os dois botões` | pass |
| C55 | `run web / ✓ ConfirmDialog > fecha sem confirmar com Manter grupo, Esc e toque fora` | pass |
| C55 | `run e2e / ✓ grupos › Manter grupo fecha a confirmação sem excluir` | pass |
| C56 | `run api / ✓ excluir grupo > apaga o grupo e as participações` | pass |
| C56 | `run web / ✓ GroupActions > exclui e leva a /grupos ao confirmar` | pass |
| C56 | `run e2e / ✓ grupos › exclui o grupo depois de confirmar e ele some de Meus grupos` | pass |
| C57 | `run api / ✓ excluir grupo > exclui grupo ABERTO, SORTEADO e ENCERRADO` | pass |
| C58 | `run api / ✓ excluir grupo > enfileira um aviso por participante aprovado com o assunto, o texto e o botão da s` | pass |
| C58 | `run api / ✓ e-mails de grupo > aviso de exclusão tem o assunto, o texto e o botão Ver meus grupos` | pass |
| C58 | `run api / ✓ excluir grupo > desfaz a exclusão e os avisos quando a gravação falha` | pass |
| C59 | `run api / ✓ excluir grupo > não enfileira aviso para quem organiza nem para participação pendente ou recusada` | pass |
| C60 | `run api / ✓ excluir grupo > responde 403 ao participante que não organiza e não apaga nada` | pass |
| C61 | `run api / ✓ excluir grupo > responde 404 a grupo que não existe mais e não enfileira e-mail` | pass |
| C62 | `run api / ✓ confirmação de e-mail > devolve /grupos como destino quando o cadastro não tinha origem` | pass |
| C62 | `run web / ✓ safeNext > troca por /grupos um valor ausente` | pass |
| C62 | `run e2e / ✓ navegação › entrar sem origem leva a /grupos` | pass |
| C63 | `run web / ✓ safeNext > troca por /grupos um caminho que começa com //` | pass |
| C63 | `run web / ✓ safeNext > troca por /grupos um caminho que começa com /\` | pass |
| C63 | `run web / ✓ safeNext > troca por /grupos um endereço com esquema` | pass |
| C63 | `run web / ✓ safeNext > troca por /grupos os caminhos /entrar e /cadastro` | pass |
| C63 | `run api / ✓ login com Google > troca por /grupos um destino de outro site` | pass |
| C63 | `run api / ✓ cadastro > troca por /grupos um destino de outro site` | pass |
| C64 | `run web / ✓ UserMenuDropdown > mostra Meus grupos, Perfil e Sair nesta ordem` | pass |
| C65 | `run e2e / ✓ navegação › menu do avatar mostra Meus grupos, Perfil e Sair e leva a /grupos` | pass |
| C66 | `run e2e / ✓ navegação › logado em / vai para /grupos` | pass |
| C67 | `run e2e / ✓ navegação › sem sessão / continua mostrando a página atual` | pass |
| C68 | `run e2e / ✓ grupos › leva a /entrar e volta a /grupos/novo depois do login` | pass |
| C68 | `run api / ✓ criar grupo > responde 401 sem sessão` | pass |
| C69 | `run api / ✓ criar grupo > emite group.created com o groupId e sem dados pessoais` | pass |
| C70 | `run api / ✓ editar grupo > emite group.updated com os nomes dos campos que mudaram e sem dados pessoais` | pass |
| C71 | `run api / ✓ encerrar grupo > emite group.closed com trigger manual e sem dados pessoais` | pass |
| C72 | `run api / ✓ excluir grupo > emite group.deleted com o groupId, o status e sem dados pessoais` | pass |
| C73 | `run api / ✓ criar grupo > emite group.created com o groupId e sem dados pessoais` | pass |
| C73 | `run api / ✓ editar grupo > emite group.updated com os nomes dos campos que mudaram e sem dados pessoais` | pass |
| C73 | `run api / ✓ encerrar grupo > emite group.closed com trigger manual e sem dados pessoais` | pass |
| C73 | `run api / ✓ excluir grupo > emite group.deleted com o groupId, o status e sem dados pessoais` | pass |
| C74 | `run api / ✓ criar grupo > não emite group.created quando a criação é recusada` | pass |
| C74 | `run api / ✓ editar grupo > não emite group.updated quando nada muda nem quando a edição é recusada` | pass |
| C75 | `run e2e / ✓ acessibilidade › telas de grupo sem violações WCAG 2.1 A/AA no tema claro` | pass |
| C75 | `run e2e / ✓ acessibilidade › telas de grupo sem violações WCAG 2.1 A/AA no tema escuro` | pass |
| C76 | `run e2e / ✓ layout › telas de grupo não rolam na horizontal em 360 px e 1440 px` | pass |
| C77 | `run web / ✓ ConfirmDialog > põe o foco em Manter grupo e prende o Tab` | pass |
| C78 | `run web / ✓ GroupActions > abre a confirmação de encerramento com o texto da spec` | pass |
| C79 | `run web / ✓ GroupActions > Manter grupo fecha a confirmação de encerramento sem chamar a API` | pass |
| C79 | `run web / ✓ ConfirmDialog > fecha sem confirmar com Manter grupo, Esc e toque fora` | pass |
| C80 | `run api / ✓ encerrar grupo > passa o grupo SORTEADO para ENCERRADO e grava a data do encerramento` | pass |
| C80 | `run web / ✓ GroupActions > encerra e atualiza a página ao confirmar` | pass |
| C81 | `run api / ✓ encerrar grupo > responde 409 em grupo ABERTO ou ENCERRADO e não muda o grupo` | pass |
| C81 | `run web / ✓ GroupActions > mostra a mensagem da API quando o encerramento recebe 409` | pass |
| C82 | `run api / ✓ encerrar grupo > responde 403 ao participante que não organiza e não muda o grupo` | pass |
| C83 | `run api / ✓ encerrar grupo > enfileira um aviso por participante aprovado com o assunto, o texto e o botão da ` | pass |
| C83 | `run api / ✓ e-mails de grupo > aviso de encerramento tem o assunto, o texto e o botão Ver grupo` | pass |
| C84 | `run api / ✓ encerrar grupo > não enfileira aviso para quem organiza nem para participação pendente ou recusada` | pass |
| C85 | `run api / ✓ excluir grupo > exclui uma vez e responde 404 ao segundo pedido simultâneo, com os avisos enfileir` | pass |
| C85 | `run api / ✓ acesso ao grupo > trava a linha do grupo até a transação terminar` | pass |
| C86 | `run api / ✓ encerrar grupo > encerra uma vez e responde 409 ao segundo pedido simultâneo, com os avisos enfile` | pass |
| C87 | `run api / ✓ editar grupo > responde 409 à edição que espera o encerramento terminar` | pass |
| C88 | `run api / ✓ editar grupo > responde 404 à edição de grupo excluído` | pass |
| C88 | `run api / ✓ excluir grupo > responde 404 a grupo que não existe mais e não enfileira e-mail` | pass |
| C89 | `run api / ✓ e-mails de grupo > mostram o nome do grupo com marcação HTML como texto` | pass |
| C90 | `run shared / ✓ validateGroupInput > aceita nome com 1 e com 80 pontos de código, inclusive emojis` | pass |
| C90 | `run api / ✓ criar grupo > recusa com 400 nome com 80 "❤️", que o banco conta como 160 caracteres` | pass |
| C91 | `run shared / ✓ validateGroupInput > aceita valores 1 e 100000 e recusa 0, 100001 e 50.5` | pass |
| C92 | `run api / ✓ criar grupo > recusa com 429 a 21ª criação da hora e aceita a 20ª` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run api` - exit 0

```
@amigo-secreto/api:test:  ✓  integration-dist  test/email-test-command.int-spec.ts > email:test > compila a API antes de enfileirar num clone sem dist 1306ms
@amigo-secreto/api:test: (node:72624) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
@amigo-secreto/api:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > cria a tabela de controle de migrations num banco vazio 1250ms
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > roda num clone sem build, sem a pasta dist 1178ms
@amigo-secreto/api:test: 
@amigo-secreto/api:test:  Test Files  56 passed (56)
@amigo-secreto/api:test:       Tests  365 passed (365)
@amigo-secreto/api:test:    Start at  09:58:11
@amigo-secreto/api:test:    Duration  37.49s (tests 75%, import 24%, transform 1%)
@amigo-secreto/api:test: 

 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
  Time:    40.143s
```

`Run e2e` - exit 0

```
@amigo-secreto/web:test:e2e:   ✓  72 [chromium] › e2e/profile.spec.ts:238:3 › perfil › pedir a troca de e-mail mostra "Enviamos um link para X." (382ms)
@amigo-secreto/web:test:e2e:   ✓  73 [chromium] › e2e/profile.spec.ts:263:3 › perfil › conta sem senha vê o pedido para criar uma senha antes de trocar o e-mail (492ms)
@amigo-secreto/web:test:e2e:   ✓  74 [chromium] › e2e/profile.spec.ts:279:3 › perfil › "Sair de todos os dispositivos" encerra as duas sessões e leva a /entrar (380ms)
@amigo-secreto/web:test:e2e:   ✓  23 [chromium] › e2e/email-confirmation.spec.ts:56:3 › confirmação de e-mail › o link aberto de novo mostra "Este link expirou ou já foi usado." (10.0s)
@amigo-secreto/web:test:e2e:   ✓  41 [chromium] › e2e/password-reset.spec.ts:64:5 › recuperação de senha › o link troca a senha e entra (7.3s)
@amigo-secreto/web:test:e2e:   ✓  76 [chromium] › e2e/password-reset.spec.ts:80:5 › recuperação de senha › o link usado mostra "Este link expirou ou já foi usado." com o caminho para /esqueci-a-senha (10.0s)
@amigo-secreto/web:test:e2e:   ✓  75 [chromium] › e2e/email-confirmation.spec.ts:76:3 › confirmação de e-mail › o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar (10.0s)
@amigo-secreto/web:test:e2e:   ✓  77 [chromium] › e2e/email-confirmation.spec.ts:99:3 › confirmação de e-mail › o link de troca de e-mail troca o e-mail mostrado no perfil (10.0s)
@amigo-secreto/web:test:e2e:   ✓  78 [chromium] › e2e/email-confirmation.spec.ts:121:3 › confirmação de e-mail › o link de troca para um e-mail em uso mostra "Este e-mail já está em uso por outra conta." (9.7s)
@amigo-secreto/web:test:e2e: 
@amigo-secreto/web:test:e2e:   78 passed (51.9s)

 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
  Time:    1m0.771s
```

`Run shared` - exit 0

```
@amigo-secreto/shared:test:  ✓ src/groups.spec.ts > normalizeGroupInput > mantém as quebras de linha do recado 0ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > brasiliaInputToIso > converte 2026-12-20T19:00 para 2026-12-20T22:00:00.000Z 1ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > isoToBrasiliaInput > devolve o valor do campo no horário de Brasília 0ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > formatBrasiliaDateTime > formata 2026-12-20T22:00:00.000Z como 20/12/2026 às 19:00 0ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > formatBrasiliaDate > formata a data no horário de Brasília, inclusive perto da meia-noite UTC 0ms
@amigo-secreto/shared:test: 
@amigo-secreto/shared:test:  Test Files  2 passed (2)
@amigo-secreto/shared:test:       Tests  19 passed (19)
@amigo-secreto/shared:test:    Start at  09:59:50
@amigo-secreto/shared:test:    Duration  115ms (import 56%, transform 19%, tests 13%, worker 11%)
@amigo-secreto/shared:test: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    489ms
```

`Run web` - exit 0

```
@amigo-secreto/web:test:  ✓ src/lib/api-status.test.ts > getApiStatus > lança erro que nomeia API_INTERNAL_URL quando ela falta 1ms
@amigo-secreto/web:test: 
@amigo-secreto/web:test:  Test Files  24 passed (24)
@amigo-secreto/web:test:       Tests  92 passed (92)
@amigo-secreto/web:test:    Start at  09:59:52
@amigo-secreto/web:test:    Duration  5.67s (environment 35%, tests 34%, setup 15%, import 14%, transform 2%, worker 1%)
@amigo-secreto/web:test: 
@amigo-secreto/web:test: Environment  jsdom was created 24 times · 7.99s total, 35% of tracked time
@amigo-secreto/web:test:              create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
@amigo-secreto/web:test:              learn more: https://vitest.dev/guide/improving-performance#test-environments
@amigo-secreto/web:test: 

 Tasks:    2 successful, 2 total
Cached:    0 cached, 2 total
  Time:    6.416s
```
