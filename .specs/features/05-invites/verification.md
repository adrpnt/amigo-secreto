# Invites verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at f9df7f7
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `web` `InviteBlock > mostra Compartilhar no WhatsApp e o link inteiro num campo só leitura com Copiar link`; `e2e` `participantes › mostra o bloco de convite e a lista com o total` | yes |
| C2 | `web` `InviteBlock > Compartilhar no WhatsApp abre wa.me com o texto e o link`; `web` `whatsappShareUrl > codifica o nome e o link no texto` | yes |
| C3 | `web` `InviteBlock > Copiar link copia e anuncia Link copiado` | yes |
| C4 | `web` `InviteBlock > seleciona o link quando o navegador recusa a cópia` | yes |
| C5 | `web` `InviteBlock > mostra Convidar por e-mail e Gerar novo link só para quem organiza`; `e2e` `participantes › participante comum vê o link sem Gerar novo link nem Convidar por e-mail` | yes |
| C6 | `web` `InviteBlock > troca o bloco pelo aviso com o grupo SORTEADO` | yes |
| C7 | `web` `InviteBlock > troca o bloco pelo aviso com o grupo ENCERRADO` | yes |
| C8 | `api` `código do convite > gera 10 caracteres do alfabeto sem 0, 1, i, l e o`; `api` `código do convite > gera códigos diferentes em 1000 chamadas`; `api` `código do convite do grupo > grupo criado pela API ganha um código de 10 caracteres do alfabeto`; `api` `código do convite do grupo > o banco recusa dois grupos com o mesmo código` | no - os testes passam com `Math.random`; nada prova a fonte criptográfica que o critério fixa |
| C9 | `web` `InviteView > sem sessão mostra nome, Organizado por, o texto e os links Entrar e Criar conta com next`; `api` `abrir convite > sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de aprovação`; `e2e` `convite › sem sessão mostra o grupo, cria conta e volta ao convite` | yes |
| C10 | `api` `abrir convite > sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de aprovação`; `web` `InviteView > mostra só o nome do grupo e de quem organiza` | yes |
| C11 | `api` `abrir convite > pessoa logada sem participação vê viewer none e a exigência de aprovação`; `web` `JoinButton > mostra Entrar no grupo sem aprovação` | yes |
| C12 | `api` `abrir convite > pessoa logada sem participação vê viewer none e a exigência de aprovação`; `web` `JoinButton > mostra o texto da aprovação e Pedir para entrar com aprovação` | yes |
| C13 | `api` `abrir convite > participante aprovado recebe viewer member e o groupId`; `e2e` `convite › participante aprovado vai direto para o grupo` | yes |
| C14 | `api` `abrir convite > pessoa pendente recebe viewer pending`; `web` `InviteView > pendente mostra o aviso com o nome de quem organiza e nenhum botão`; `e2e` `convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos` | yes |
| C15 | `api` `abrir convite > pessoa recusada recebe viewer rejected`; `api` `remover participante > a pessoa removida abre o convite como recusada e não entra de novo`; `web` `InviteView > recusado mostra Sua entrada neste grupo não foi aprovada. sem botão` | yes |
| C16 | `api` `abrir convite > devolve o status SORTEADO e ENCERRADO do grupo`; `web` `InviteView > SORTEADO e ENCERRADO mostram o aviso do status sem botão` | yes |
| C17 | `api` `abrir convite > devolve o status SORTEADO e ENCERRADO do grupo`; `web` `InviteView > SORTEADO e ENCERRADO mostram o aviso do status sem botão` | yes |
| C18 | `api` `abrir convite > responde 404 Convite não encontrado. a código inexistente, trocado ou com formato errado, com o mesmo corpo`; `e2e` `convite › código inexistente mostra Convite não encontrado` | yes |
| C19 | `api` `abrir convite > aceita o código em maiúsculas`; `e2e` `convite › aceita o código em maiúsculas` | yes |
| C20 | `web` `inviteMetadata > código válido usa Convite: {grupo}, a descrição e a imagem /og/convite.png de 1200 x 630`; `e2e` `convite › as meta tags trazem o título, a descrição e a imagem do grupo`; `e2e` `convite › a imagem do preview é um PNG de 1200 x 630` | yes |
| C21 | `web` `inviteMetadata > código inválido usa Convite do Amigo Secreto sem dados de grupo` | yes |
| C22 | `api` `abrir convite > responde 429 ao 61º convite do minuto do mesmo IP e aceita o 60º`; `api` `abrir convite > separa o limite pelo IP do X-Forwarded-For`; `web` `apiServerFetch > repassa X-Forwarded-For e User-Agent quando pedido`; `web` `getInvite > repassa cookie, X-Forwarded-For e User-Agent e devolve o convite`; `web` `InviteView > mostra a mensagem do 429` | yes |
| C23 | `api` `abrir convite > responde 429 ao 601º convite do minuto de um robô de preview e aceita o 600º`; `api` `robôs de preview > reconhece WhatsApp, facebookexternalhit, Facebot, TelegramBot, Slackbot, Twitterbot, Discordbot e LinkedInBot`; `api` `robôs de preview > não reconhece navegadores comuns nem User-Agent ausente`; `web` `inviteMetadata > 429 do robô monta o preview sem dados de grupo` | yes |
| C24 | `api` `abrir convite > acima do limite responde 429 a código existente e inexistente`; `api` `entrar pelo convite > conta no limite por IP de abrir convite e responde 429 antes de procurar o código` | yes |
| C25 | `api` `entrar pelo convite > em grupo sem aprovação cria participação aprovada e devolve o groupId`; `web` `JoinButton > entrar leva a /grupos/{id}`; `e2e` `convite › entra no grupo sem aprovação e cai na página do grupo` | yes |
| C26 | `api` `entrar pelo convite > em grupo com aprovação cria participação pendente sem groupId`; `web` `JoinButton > pedir para entrar atualiza a página`; `e2e` `convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos` | yes |
| C27 | `api` `entrar pelo convite > aceita conta com e-mail não confirmado` | yes |
| C28 | `api` `entrar pelo convite > devolve o estado atual a quem já é aprovado, pendente ou recusado, sem gravar nem avisar` | yes |
| C29 | `api` `entrar pelo convite > responde 409 em grupo SORTEADO e ENCERRADO sem criar participação`; `web` `JoinButton > mostra a mensagem da API num 409 ou 429` | yes |
| C30 | `api` `entrar pelo convite > responde 409 em grupo SORTEADO e ENCERRADO sem criar participação` | yes |
| C31 | `api` `entrar pelo convite > responde 404 Convite não encontrado. a código inexistente ou trocado sem criar participação` | yes |
| C32 | `api` `entrar pelo convite > responde 429 à 31ª entrada da hora da mesma conta e aceita a 30ª`; `api` `entrar pelo convite > não conta no limite da conta a entrada em que a pessoa já participava` | yes |
| C33 | `web` `JoinButton > desabilita o botão e mostra Entrando… durante o pedido` | yes |
| C34 | `web` `JoinButton > mostra Não foi possível entrar no grupo. Tente de novo. e mantém o botão num erro inesperado` | yes |
| C35 | `e2e` `convite › sem sessão mostra o grupo, cria conta e volta ao convite`; `e2e` `convite › cria conta com Google pelo convite e volta ao convite` | yes |
| C36 | `api` `lista de participantes > quem organiza recebe pendentes, aprovados por nome e recusados por último`; `web` `ParticipantRow > pendente mostra Pendente e os botões Aprovar {nome} e Recusar {nome}` | yes |
| C37 | `api` `aprovar e recusar > aprovar passa o pendente para aprovado`; `web` `MemberActions > Aprovar chama a API e recarrega a lista`; `e2e` `participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois` | yes |
| C38 | `api` `aprovar e recusar > recusar passa o pendente para recusado`; `web` `MemberActions > Recusar chama a API sem confirmação e recarrega a lista`; `web` `ParticipantRow > recusado mostra Recusado e Aprovar {nome}`; `e2e` `participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois` | yes |
| C39 | `api` `aprovar e recusar > aprovar um recusado com o grupo ABERTO passa para aprovado`; `e2e` `participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois` | yes |
| C40 | `api` `desligar a aprovação > aprova na mesma transação os pendentes do grupo`; `api` `desligar a aprovação > não muda recusados nem participações de outros grupos` | yes |
| C41 | `api` `aprovar e recusar > responde 409 com o grupo SORTEADO ou ENCERRADO sem mudar a participação`; `web` `ParticipantRow > não mostra Aprovar nem Recusar com o grupo fora de ABERTO` | yes |
| C42 | `api` `aprovar e recusar > responde 403 a participante que não organiza sem mudar a participação` | yes |
| C43 | `api` `aprovar e recusar > responde 404 Participante não encontrado. a participação inexistente ou de outro grupo`; `api` `aprovar e recusar > responde 404 Participante não encontrado. ao recusar uma participação aprovada, inclusive a de quem organiza` | yes |
| C44 | `api` `aprovar e recusar > devolve o estado atual sem novo aviso quando a participação já está no estado pedido`; `api` `aprovar e recusar > devolve o estado atual sem aviso quando a participação não está mais no status from` | yes |
| C45 | `api` `lista de participantes > não mostra pendentes nem recusados a quem não organiza`; `api` `lista de participantes > participante aprovado recebe só os aprovados em ordem alfabética, com avatar e Organiza` | yes |
| C46 | `api` `lista de participantes > participante aprovado recebe só os aprovados em ordem alfabética, com avatar e Organiza`; `web` `ParticipantRow > mostra avatar, nome e a tag Organiza em quem organiza`; `web` `ParticipantsList > mostra a lista na ordem devolvida pela API sem reordenar`; `e2e` `participantes › mostra o bloco de convite e a lista com o total` | yes |
| C47 | `api` `lista de participantes > quem organiza recebe pendentes, aprovados por nome e recusados por último` | yes |
| C48 | `api` `lista de participantes > traz 20 por vez e o cursor leva aos seguintes sem pular nem repetir`; `api` `lista de participantes > aprovar alguém com a lista aberta não pula nem repete ninguém na página seguinte`; `web` `ParticipantsList > Carregar mais acrescenta a página seguinte ao fim e some sem cursor`; `e2e` `participantes › Carregar mais traz os participantes seguintes e a busca ignora acentos` | yes |
| C49 | `api` `lista de participantes > busca pelo nome sem diferenciar maiúsculas nem acentos, na mesma ordem e paginação`; `api` `lista de participantes > ordena nomes com acento junto dos sem acento`; `api` `extensão unaccent > a migration habilita o unaccent e lower(unaccent('João Ávila')) vira joao avila`; `web` `ParticipantsList > busca na API depois de 300 ms com o termo`; `web` `ParticipantsList > descarta a resposta de uma busca antiga`; `e2e` `participantes › Carregar mais traz os participantes seguintes e a busca ignora acentos` | yes |
| C50 | `api` `lista de participantes > devolve lista vazia quando a busca não encontra ninguém`; `web` `ParticipantsList > mostra Ninguém encontrado com esse nome.` | yes |
| C51 | `api` `lista de participantes > não devolve o e-mail de ninguém`; `web` `ParticipantRow > mostra iniciais sem foto e nunca o e-mail` | yes |
| C52 | `api` `lista de participantes > devolve o total de aprovados sem a busca`; `web` `ParticipantsList > mostra o total de participantes aprovados` | yes |
| C53 | `api` `lista de participantes > responde 404 Grupo não encontrado. a quem não participa, a pendente e a id inexistente`; `e2e` `participantes › pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.` | yes |
| C54 | `web` `GroupTabs > mostra Grupo e Participantes com a aba atual marcada`; `e2e` `grupos › as abas levam de Grupo a Participantes e de volta` | yes |
| C55 | `web` `GroupTabs > cada aba leva à sua rota`; `e2e` `grupos › as abas levam de Grupo a Participantes e de volta` | yes |
| C56 | `api` `meus grupos com pedidos > mostra em Ativos o grupo com pedido pendente, com organizerName e membershipStatus PENDING`; `web` `GroupCard > pendente mostra nome, Organizado por e Aguardando aprovação, sem link`; `e2e` `convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos` | yes |
| C57 | `api` `meus grupos com pedidos > não mostra grupos em que a pessoa foi recusada ou removida` | yes |
| C58 | `api` `meus grupos com pedidos > devolve a quem organiza a contagem de pendentes e null aos outros`; `web` `GroupCard > mostra 1 pendente e N pendentes a quem organiza`; `e2e` `participantes › Meus grupos mostra N pendentes a quem organiza` | yes |
| C59 | `api` `meus grupos com pedidos > pessoa pendente recebe 404 Grupo não encontrado. ao abrir o grupo`; `e2e` `participantes › pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.` | yes |
| C60 | `web` `ParticipantRow > menu de quem organiza mostra Transferir organização e Remover do grupo com o grupo ABERTO`; `web` `ParticipantRow > com o grupo SORTEADO o menu mostra só Transferir organização`; `web` `ParticipantRow > sem menu na linha de quem organiza e para quem não organiza` | yes |
| C61 | `web` `MemberActions > Remover do grupo confirma com os textos da spec e foco em Manter no grupo` | yes |
| C62 | `api` `remover participante > passa a participação para recusada e tira a pessoa dos aprovados`; `web` `MemberActions > confirmar a remoção chama a API e recarrega a lista`; `e2e` `participantes › organizador remove participante, que não entra de novo pelo link` | yes |
| C63 | `web` `MemberActions > Manter no grupo, Esc e toque fora fecham sem remover` | yes |
| C64 | `api` `remover participante > responde 409 com o grupo SORTEADO ou ENCERRADO sem remover` | yes |
| C65 | `api` `remover participante > responde 409 Quem organiza não pode ser removido.` | yes |
| C66 | `api` `remover participante > responde 403 a participante que não organiza sem remover` | yes |
| C67 | `web` `LeaveGroup > mostra Sair do grupo a quem participa e não organiza com o grupo ABERTO` | yes |
| C68 | `web` `LeaveGroup > confirma com os textos da spec e foco em Ficar no grupo` | yes |
| C69 | `api` `sair do grupo > apaga a participação e o grupo some de Meus grupos`; `web` `LeaveGroup > confirmar chama a API e leva a /grupos`; `e2e` `grupos › participante sai do grupo e o grupo some de Meus grupos` | yes |
| C70 | `api` `sair do grupo > quem saiu abre o convite como quem nunca participou e pode entrar de novo` | yes |
| C71 | `api` `sair do grupo > responde 409 com o grupo SORTEADO ou ENCERRADO e mantém a participação`; `web` `LeaveGroup > mostra a mensagem da API num 409` | yes |
| C72 | `api` `sair do grupo > responde 409 Transfira a organização antes de sair do grupo. a quem organiza` | yes |
| C73 | `web` `LeaveGroup > não mostra Sair do grupo a quem organiza nem com o grupo fora de ABERTO` | yes |
| C74 | `web` `ParticipantRow > menu de quem organiza mostra Transferir organização e Remover do grupo com o grupo ABERTO`; `web` `ParticipantRow > com o grupo SORTEADO o menu mostra só Transferir organização`; `api` `transferir organização > transfere com o grupo SORTEADO` | yes |
| C75 | `web` `MemberActions > Transferir organização confirma com os textos da spec e foco em Manter organização` | yes |
| C76 | `api` `transferir organização > faz da pessoa escolhida quem organiza e mantém a antiga como participante aprovada`; `api` `transferir organização > depois da transferência o antigo organizador recebe 403 ao editar`; `web` `MemberActions > confirmar a transferência chama a API e recarrega a página`; `e2e` `participantes › organizador transfere a organização e passa a ver o grupo como participante` | yes |
| C77 | `api` `transferir organização > responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO` | yes |
| C78 | `api` `transferir organização > responde 404 Participante não encontrado. a pendente, recusado, de outro grupo ou a quem já organiza` | yes |
| C79 | `api` `transferir organização > responde 403 a quem não organiza` | yes |
| C80 | `api` `transferir organização > a resposta da transferência não traz dado de sorteio` | yes |
| C81 | `web` `InviteBlock > Gerar novo link confirma com os textos da spec e foco em Manter link`; `web` `InviteBlock > Manter link fecha sem trocar` | yes |
| C82 | `api` `gerar novo link > troca o código do grupo e devolve o novo`; `web` `InviteBlock > confirmar mostra o link novo e anuncia Novo link gerado`; `e2e` `participantes › gerar novo link barra o link antigo` | yes |
| C83 | `api` `gerar novo link > o código antigo passa a responder 404 ao abrir e ao entrar`; `e2e` `participantes › gerar novo link barra o link antigo` | yes |
| C84 | `api` `gerar novo link > mantém todas as participações do grupo` | yes |
| C85 | `api` `gerar novo link > responde 409 com o grupo SORTEADO ou ENCERRADO e mantém o código`; `web` `InviteBlock > mostra a mensagem da API num 409 ou 429 ao gerar link` | yes |
| C86 | `api` `gerar novo link > responde 403 a participante que não organiza e mantém o código`; `api` `gerar novo link > responde 404 a quem não participa` | yes |
| C87 | `api` `gerar novo link > responde 429 à 11ª troca da hora do grupo e aceita a 10ª` | yes |
| C88 | `web` `EmailInviteForm > mostra o campo E-mails e Enviar convites`; `web` `InviteBlock > Convidar por e-mail mostra e esconde o formulário`; `shared` `parseInviteEmails > separa por vírgula, ponto e vírgula, espaço e quebra de linha`; `shared` `parseInviteEmails > descarta separadores repetidos e pontas vazias` | yes |
| C89 | `api` `convidar por e-mail > enfileira um convite por endereço distinto com o link do grupo e grava cada envio`; `api` `convidar por e-mail > devolve a quantidade de e-mails enviados`; `api` `convidar por e-mail > envia também para quem já participa`; `shared` `parseInviteEmails > conta uma vez os repetidos sem diferenciar maiúsculas`; `web` `EmailInviteForm > envia e mostra Convite enviado para 1 e-mail. e Convites enviados para N e-mails.`; `e2e` `participantes › convida por e-mail e o convite chega com o link do grupo` | yes |
| C90 | `shared` `validateInviteEmails > lista os endereços inválidos em Confira estes e-mails:`; `shared` `isEmailAddress > aceita endereço comum e recusa sem arroba, sem ponto no domínio, com espaço ou com mais de 254 caracteres`; `api` `convidar por e-mail > recusa com 400 e a lista dos inválidos sem enviar nenhum`; `api` `convidar por e-mail > recusa com 400 endereço que o isEmail da API recusa`; `web` `EmailInviteForm > lista os inválidos sem enviar` | yes |
| C91 | `shared` `validateInviteEmails > aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails por vez.`; `shared` `validateInviteEmails > conta 20 distintos quando há repetidos além deles`; `api` `convidar por e-mail > aceita 20 endereços distintos e recusa 21 sem enviar nenhum`; `web` `EmailInviteForm > recusa mais de 20 sem enviar` | yes |
| C92 | `shared` `validateInviteEmails > recusa o campo vazio com Informe pelo menos um e-mail.`; `web` `EmailInviteForm > mostra Informe pelo menos um e-mail. sem enviar`; `api` `convidar por e-mail > recusa com 400 o campo vazio` | yes |
| C93 | `api` `convidar por e-mail > aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, sem enviar nenhum`; `api` `convidar por e-mail > volta a aceitar quando o envio mais antigo sai da janela de 24 horas`; `api` `limite de convites por e-mail > diz em N horas acima de uma hora`; `api` `limite de convites por e-mail > diz em 1 hora com exatamente uma hora`; `api` `limite de convites por e-mail > diz em N minutos abaixo de uma hora`; `api` `limite de convites por e-mail > grava o Retry-After em segundos`; `web` `EmailInviteForm > mostra a mensagem do 429 e do 409 da API` | yes |
| C94 | `api` `convidar por e-mail > responde 409 com o grupo SORTEADO ou ENCERRADO sem enviar`; `web` `EmailInviteForm > mostra a mensagem do 429 e do 409 da API` | yes |
| C95 | `api` `convidar por e-mail > responde 403 a participante que não organiza sem enviar` | yes |
| C96 | `web` `EmailInviteForm > desabilita o botão e mostra Enviando… durante o envio` | yes |
| C97 | `api` `e-mails do convite > convite por e-mail tem o assunto, o texto e o botão Ver convite para /convite/{código}`; `api` `convidar por e-mail > enfileira um convite por endereço distinto com o link do grupo e grava cada envio`; `e2e` `participantes › convida por e-mail e o convite chega com o link do grupo` | yes |
| C98 | `api` `e-mails do convite > pedido de entrada tem o assunto, o texto e o botão Ver pedidos`; `api` `entrar pelo convite > enfileira na mesma transação o aviso de pedido a quem organiza` | yes |
| C99 | `api` `e-mails do convite > entrada sem aprovação tem o assunto, o texto e o botão Ver participantes`; `api` `entrar pelo convite > enfileira na mesma transação o aviso de entrada a quem organiza` | yes |
| C100 | `api` `e-mails do convite > entrada aprovada tem o assunto, o texto e o botão Ver grupo`; `api` `aprovar e recusar > enfileira o aviso de entrada aprovada e de entrada recusada`; `api` `desligar a aprovação > enfileira o aviso de entrada aprovada a cada pessoa aprovada` | yes |
| C101 | `api` `e-mails do convite > entrada recusada tem o assunto, o texto e o botão Ver meus grupos`; `api` `aprovar e recusar > enfileira o aviso de entrada aprovada e de entrada recusada` | yes |
| C102 | `api` `e-mails do convite > remoção tem o assunto, o texto e o botão Ver meus grupos`; `api` `remover participante > enfileira o aviso de remoção à pessoa` | yes |
| C103 | `api` `e-mails do convite > saída tem o assunto, o texto e o botão Ver participantes`; `api` `sair do grupo > enfileira o aviso de saída a quem organiza` | yes |
| C104 | `api` `e-mails do convite > nova organização tem o assunto, o texto e o botão Ver grupo`; `api` `transferir organização > enfileira o aviso de nova organização a quem recebe` | yes |
| C105 | `api` `e-mails do convite > mostram nomes de pessoa e de grupo com marcação HTML como texto` | yes |
| C106 | `api` `entrar pelo convite > não enfileira aviso quando a entrada é recusada`; `api` `aprovar e recusar > não emite evento nem aviso quando a ação é recusada`; `api` `remover participante > não emite evento nem aviso quando a remoção é recusada`; `api` `sair do grupo > não emite evento nem aviso quando a saída é recusada`; `api` `transferir organização > não emite evento nem aviso quando a transferência é recusada`; `api` `desligar a aprovação > não aprova nada quando a edição é recusada` | yes |
| C107 | `api` `abrir convite > emite invite.viewed com o groupId e sem código, nome ou id de pessoa`; `api` `abrir convite > não emite invite.viewed para robô de preview` | yes |
| C108 | `api` `entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais` | yes |
| C109 | `api` `entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais` | yes |
| C110 | `api` `aprovar e recusar > emite membership.approved com trigger manual e membership.rejected`; `api` `desligar a aprovação > emite membership.approved com trigger auto para cada participação` | yes |
| C111 | `api` `aprovar e recusar > emite membership.approved com trigger manual e membership.rejected` | yes |
| C112 | `api` `sair do grupo > emite membership.left sem dados pessoais` | yes |
| C113 | `api` `remover participante > emite membership.removed sem dados pessoais` | yes |
| C114 | `api` `gerar novo link > emite invite.regenerated sem o código` | yes |
| C115 | `api` `convidar por e-mail > emite invite.emails_sent com count e sem e-mails` | yes |
| C116 | `api` `transferir organização > emite group.ownership_transferred sem dados pessoais` | yes |
| C117 | `api` `abrir convite > emite invite.viewed com o groupId e sem código, nome ou id de pessoa`; `api` `entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais`; `api` `gerar novo link > emite invite.regenerated sem o código`; `api` `convidar por e-mail > emite invite.emails_sent com count e sem e-mails`; `api` `remover participante > emite membership.removed sem dados pessoais`; `api` `sair do grupo > emite membership.left sem dados pessoais`; `api` `transferir organização > emite group.ownership_transferred sem dados pessoais` | yes |
| C118 | `api` `abrir convite > não emite invite.viewed para código inválido nem acima do limite`; `api` `entrar pelo convite > não emite evento quando a entrada é recusada`; `api` `gerar novo link > não emite invite.regenerated quando a troca é recusada`; `api` `convidar por e-mail > não emite invite.emails_sent quando o envio é recusado`; `api` `aprovar e recusar > não emite evento nem aviso quando a ação é recusada`; `api` `remover participante > não emite evento nem aviso quando a remoção é recusada`; `api` `sair do grupo > não emite evento nem aviso quando a saída é recusada`; `api` `transferir organização > não emite evento nem aviso quando a transferência é recusada` | yes |
| C119 | `e2e` `acessibilidade › /convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`; `e2e` `acessibilidade › /grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`; `e2e` `acessibilidade › /grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`; `e2e` `acessibilidade › /grupos com card pendente sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px` | yes |
| C120 | `e2e` `acessibilidade › /convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`; `e2e` `acessibilidade › /grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`; `e2e` `acessibilidade › /grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`; `e2e` `acessibilidade › /grupos com card pendente sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px` | yes |
| C121 | `web` `InviteBlock > Gerar novo link confirma com os textos da spec e foco em Manter link`; `web` `MemberActions > Remover do grupo confirma com os textos da spec e foco em Manter no grupo`; `web` `MemberActions > Transferir organização confirma com os textos da spec e foco em Manter organização`; `web` `LeaveGroup > confirma com os textos da spec e foco em Ficar no grupo`; `web` `ConfirmDialog > põe o foco em Manter grupo e prende o Tab` | yes |
| C122 | `web` `InviteBlock > Copiar link copia e anuncia Link copiado`; `web` `InviteBlock > confirmar mostra o link novo e anuncia Novo link gerado` | yes |
| C123 | `api` `entrar pelo convite > duas entradas simultâneas da mesma pessoa criam uma participação e um aviso` | yes |
| C124 | `api` `entrar pelo convite > entrada simultânea à mudança para SORTEADO cria antes ou responde 409` | yes |
| C125 | `api` `gerar novo link > o código antigo passa a responder 404 ao abrir e ao entrar` | yes |
| C126 | `api` `transferir organização > duas transferências simultâneas aplicam uma e a outra recebe 403` | yes |
| C127 | `api` `aprovar e recusar > aprovar e recusar ao mesmo tempo aplica o primeiro e envia só o aviso dele` | yes |
| C128 | `api` `sair do grupo > sair enquanto quem organiza remove aplica o primeiro e o segundo responde 404 ou o estado atual` | yes |
| C129 | `api` `lista de participantes > com 20 visíveis não devolve cursor e com 21 devolve`; `web` `ParticipantsList > Carregar mais acrescenta a página seguinte ao fim e some sem cursor` | yes |
| C130 | `api` `convidar por e-mail > aceita 20 endereços distintos e recusa 21 sem enviar nenhum`; `shared` `validateInviteEmails > aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails por vez.` | yes |
| C131 | `api` `convidar por e-mail > aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, sem enviar nenhum` | yes |
| C132 | `api` `lista de participantes > trata % e _ da busca como texto` | yes |
| C133 | `web` `InviteView > mostra nome com marcação HTML como texto`; `web` `inviteMetadata > mantém marcação HTML do nome como texto nas meta tags` | yes |
| C134 | `api` `desligar a aprovação > com o grupo SORTEADO salva o campo e mantém os pendentes, sem aviso nem evento` | yes - check acrescentada na correção do primeiro achado; o teste lê do banco o campo, o status de cada pendente, os jobs de e-mail e os eventos, e ficou vermelho antes da correção |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Desligar a aprovação num grupo SORTEADO aprova os pendentes, enfileira o aviso e emite `membership.approved`. Isso é entrada em grupo sorteado (RN07, INV-04 AC 6) e nenhum teste pega. | Exemplo próprio em HEAD: grupo DRAWN com `requiresApproval` e um PENDING criados no banco; `PUT /groups/{id}` com `requiresApproval: false` respondeu 200 e a participação virou APPROVED. `groups.service.ts` `update` só barra CLOSED e aprova com `turnsOffApproval` sem olhar o status. `groups-update-approval.int-spec.ts` só cobre ABERTO e CLOSED. | Só aprovar os pendentes com o grupo ABERTO (ou responder 409 ao desligar fora de ABERTO, decisão do usuário) e somar um teste de integração com o grupo SORTEADO que lê o status depois. |`ab9a8dd` - com o grupo SORTEADO o campo é salvo e os pendentes ficam como estão (user: "Salva o campo, não aprova (Recomendado)"); critério novo INV-04 AC 11, provado pela C134 (`desligar a aprovação > com o grupo SORTEADO salva o campo e mantém os pendentes, sem aviso nem evento`, vermelho antes da correção) |
| C8 não prova que o código sai de fonte criptográfica. | `invite-code.spec.ts` `gera códigos diferentes em 1000 chamadas` e `gera 10 caracteres do alfabeto` passam com `Math.random`. | Teste unitário que espiona `randomInt` de `node:crypto` (vi.mock) e confere que `generateInviteCode` usa só ele, uma chamada por caractere. |`a174a58` - `código do convite > sorteia cada caractere com randomInt do node:crypto`, prova a mais da C8; falha com `Math.random` no lugar do `randomInt` |
