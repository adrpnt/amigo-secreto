# 05-invites proofs

**HEAD**: a174a58
**Tree**: clean
**Shell**: /bin/sh
**Result**: 295 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run web / ✓ InviteBlock > mostra Compartilhar no WhatsApp e o link inteiro num campo só leitura com Copiar lin` | pass |
| C1 | `run e2e / ✓ participantes › mostra o bloco de convite e a lista com o total` | pass |
| C2 | `run web / ✓ InviteBlock > Compartilhar no WhatsApp abre wa.me com o texto e o link` | pass |
| C2 | `run web / ✓ whatsappShareUrl > codifica o nome e o link no texto` | pass |
| C3 | `run web / ✓ InviteBlock > Copiar link copia e anuncia Link copiado` | pass |
| C4 | `run web / ✓ InviteBlock > seleciona o link quando o navegador recusa a cópia` | pass |
| C5 | `run web / ✓ InviteBlock > mostra Convidar por e-mail e Gerar novo link só para quem organiza` | pass |
| C5 | `run e2e / ✓ participantes › participante comum vê o link sem Gerar novo link nem Convidar por e-mail` | pass |
| C6 | `run web / ✓ InviteBlock > troca o bloco pelo aviso com o grupo SORTEADO` | pass |
| C7 | `run web / ✓ InviteBlock > troca o bloco pelo aviso com o grupo ENCERRADO` | pass |
| C8 | `run api / ✓ código do convite > gera 10 caracteres do alfabeto sem 0, 1, i, l e o` | pass |
| C8 | `run api / ✓ código do convite > gera códigos diferentes em 1000 chamadas` | pass |
| C8 | `run api / ✓ código do convite > sorteia cada caractere com randomInt do node:crypto` | pass |
| C8 | `run api / ✓ código do convite do grupo > grupo criado pela API ganha um código de 10 caracteres do alfabeto` | pass |
| C8 | `run api / ✓ código do convite do grupo > o banco recusa dois grupos com o mesmo código` | pass |
| C9 | `run web / ✓ InviteView > sem sessão mostra nome, Organizado por, o texto e os links Entrar e Criar conta com n` | pass |
| C9 | `run api / ✓ abrir convite > sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de ` | pass |
| C9 | `run e2e / ✓ convite › sem sessão mostra o grupo, cria conta e volta ao convite` | pass |
| C10 | `run api / ✓ abrir convite > sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de ` | pass |
| C10 | `run web / ✓ InviteView > mostra só o nome do grupo e de quem organiza` | pass |
| C11 | `run api / ✓ abrir convite > pessoa logada sem participação vê viewer none e a exigência de aprovação` | pass |
| C11 | `run web / ✓ JoinButton > mostra Entrar no grupo sem aprovação` | pass |
| C12 | `run api / ✓ abrir convite > pessoa logada sem participação vê viewer none e a exigência de aprovação` | pass |
| C12 | `run web / ✓ JoinButton > mostra o texto da aprovação e Pedir para entrar com aprovação` | pass |
| C13 | `run api / ✓ abrir convite > participante aprovado recebe viewer member e o groupId` | pass |
| C13 | `run e2e / ✓ convite › participante aprovado vai direto para o grupo` | pass |
| C14 | `run api / ✓ abrir convite > pessoa pendente recebe viewer pending` | pass |
| C14 | `run web / ✓ InviteView > pendente mostra o aviso com o nome de quem organiza e nenhum botão` | pass |
| C14 | `run e2e / ✓ convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos` | pass |
| C15 | `run api / ✓ abrir convite > pessoa recusada recebe viewer rejected` | pass |
| C15 | `run api / ✓ remover participante > a pessoa removida abre o convite como recusada e não entra de novo` | pass |
| C15 | `run web / ✓ InviteView > recusado mostra Sua entrada neste grupo não foi aprovada. sem botão` | pass |
| C16 | `run api / ✓ abrir convite > devolve o status SORTEADO e ENCERRADO do grupo` | pass |
| C16 | `run web / ✓ InviteView > SORTEADO e ENCERRADO mostram o aviso do status sem botão` | pass |
| C17 | `run api / ✓ abrir convite > devolve o status SORTEADO e ENCERRADO do grupo` | pass |
| C17 | `run web / ✓ InviteView > SORTEADO e ENCERRADO mostram o aviso do status sem botão` | pass |
| C18 | `run api / ✓ abrir convite > responde 404 Convite não encontrado. a código inexistente, trocado ou com formato ` | pass |
| C18 | `run e2e / ✓ convite › código inexistente mostra Convite não encontrado` | pass |
| C19 | `run api / ✓ abrir convite > aceita o código em maiúsculas` | pass |
| C19 | `run e2e / ✓ convite › aceita o código em maiúsculas` | pass |
| C20 | `run web / ✓ inviteMetadata > código válido usa Convite: {grupo}, a descrição e a imagem /og/convite.png de 120` | pass |
| C20 | `run e2e / ✓ convite › as meta tags trazem o título, a descrição e a imagem do grupo` | pass |
| C20 | `run e2e / ✓ convite › a imagem do preview é um PNG de 1200 x 630` | pass |
| C21 | `run web / ✓ inviteMetadata > código inválido usa Convite do Amigo Secreto sem dados de grupo` | pass |
| C22 | `run api / ✓ abrir convite > responde 429 ao 61º convite do minuto do mesmo IP e aceita o 60º` | pass |
| C22 | `run api / ✓ abrir convite > separa o limite pelo IP do X-Forwarded-For` | pass |
| C22 | `run web / ✓ apiServerFetch > repassa X-Forwarded-For e User-Agent quando pedido` | pass |
| C22 | `run web / ✓ getInvite > repassa cookie, X-Forwarded-For e User-Agent e devolve o convite` | pass |
| C22 | `run web / ✓ InviteView > mostra a mensagem do 429` | pass |
| C23 | `run api / ✓ abrir convite > responde 429 ao 601º convite do minuto de um robô de preview e aceita o 600º` | pass |
| C23 | `run api / ✓ robôs de preview > reconhece WhatsApp, facebookexternalhit, Facebot, TelegramBot, Slackbot, Twitte` | pass |
| C23 | `run api / ✓ robôs de preview > não reconhece navegadores comuns nem User-Agent ausente` | pass |
| C23 | `run web / ✓ inviteMetadata > 429 do robô monta o preview sem dados de grupo` | pass |
| C24 | `run api / ✓ abrir convite > acima do limite responde 429 a código existente e inexistente` | pass |
| C24 | `run api / ✓ entrar pelo convite > conta no limite por IP de abrir convite e responde 429 antes de procurar o c` | pass |
| C25 | `run api / ✓ entrar pelo convite > em grupo sem aprovação cria participação aprovada e devolve o groupId` | pass |
| C25 | `run web / ✓ JoinButton > entrar leva a /grupos/{id}` | pass |
| C25 | `run e2e / ✓ convite › entra no grupo sem aprovação e cai na página do grupo` | pass |
| C26 | `run api / ✓ entrar pelo convite > em grupo com aprovação cria participação pendente sem groupId` | pass |
| C26 | `run web / ✓ JoinButton > pedir para entrar atualiza a página` | pass |
| C26 | `run e2e / ✓ convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos` | pass |
| C27 | `run api / ✓ entrar pelo convite > aceita conta com e-mail não confirmado` | pass |
| C28 | `run api / ✓ entrar pelo convite > devolve o estado atual a quem já é aprovado, pendente ou recusado, sem grava` | pass |
| C29 | `run api / ✓ entrar pelo convite > responde 409 em grupo SORTEADO e ENCERRADO sem criar participação` | pass |
| C29 | `run web / ✓ JoinButton > mostra a mensagem da API num 409 ou 429` | pass |
| C30 | `run api / ✓ entrar pelo convite > responde 409 em grupo SORTEADO e ENCERRADO sem criar participação` | pass |
| C31 | `run api / ✓ entrar pelo convite > responde 404 Convite não encontrado. a código inexistente ou trocado sem cri` | pass |
| C32 | `run api / ✓ entrar pelo convite > responde 429 à 31ª entrada da hora da mesma conta e aceita a 30ª` | pass |
| C32 | `run api / ✓ entrar pelo convite > não conta no limite da conta a entrada em que a pessoa já participava` | pass |
| C33 | `run web / ✓ JoinButton > desabilita o botão e mostra Entrando… durante o pedido` | pass |
| C34 | `run web / ✓ JoinButton > mostra Não foi possível entrar no grupo. Tente de novo. e mantém o botão num erro ine` | pass |
| C35 | `run e2e / ✓ convite › sem sessão mostra o grupo, cria conta e volta ao convite` | pass |
| C35 | `run e2e / ✓ convite › cria conta com Google pelo convite e volta ao convite` | pass |
| C36 | `run api / ✓ lista de participantes > quem organiza recebe pendentes, aprovados por nome e recusados por último` | pass |
| C36 | `run web / ✓ ParticipantRow > pendente mostra Pendente e os botões Aprovar {nome} e Recusar {nome}` | pass |
| C37 | `run api / ✓ aprovar e recusar > aprovar passa o pendente para aprovado` | pass |
| C37 | `run web / ✓ MemberActions > Aprovar chama a API e recarrega a lista` | pass |
| C37 | `run e2e / ✓ participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois` | pass |
| C38 | `run api / ✓ aprovar e recusar > recusar passa o pendente para recusado` | pass |
| C38 | `run web / ✓ MemberActions > Recusar chama a API sem confirmação e recarrega a lista` | pass |
| C38 | `run web / ✓ ParticipantRow > recusado mostra Recusado e Aprovar {nome}` | pass |
| C38 | `run e2e / ✓ participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois` | pass |
| C39 | `run api / ✓ aprovar e recusar > aprovar um recusado com o grupo ABERTO passa para aprovado` | pass |
| C39 | `run e2e / ✓ participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois` | pass |
| C40 | `run api / ✓ desligar a aprovação > aprova na mesma transação os pendentes do grupo` | pass |
| C40 | `run api / ✓ desligar a aprovação > não muda recusados nem participações de outros grupos` | pass |
| C41 | `run api / ✓ aprovar e recusar > responde 409 com o grupo SORTEADO ou ENCERRADO sem mudar a participação` | pass |
| C41 | `run web / ✓ ParticipantRow > não mostra Aprovar nem Recusar com o grupo fora de ABERTO` | pass |
| C42 | `run api / ✓ aprovar e recusar > responde 403 a participante que não organiza sem mudar a participação` | pass |
| C43 | `run api / ✓ aprovar e recusar > responde 404 Participante não encontrado. a participação inexistente ou de out` | pass |
| C43 | `run api / ✓ aprovar e recusar > responde 404 Participante não encontrado. ao recusar uma participação aprovada` | pass |
| C44 | `run api / ✓ aprovar e recusar > devolve o estado atual sem novo aviso quando a participação já está no estado ` | pass |
| C44 | `run api / ✓ aprovar e recusar > devolve o estado atual sem aviso quando a participação não está mais no status` | pass |
| C45 | `run api / ✓ lista de participantes > não mostra pendentes nem recusados a quem não organiza` | pass |
| C45 | `run api / ✓ lista de participantes > participante aprovado recebe só os aprovados em ordem alfabética, com ava` | pass |
| C46 | `run api / ✓ lista de participantes > participante aprovado recebe só os aprovados em ordem alfabética, com ava` | pass |
| C46 | `run web / ✓ ParticipantRow > mostra avatar, nome e a tag Organiza em quem organiza` | pass |
| C46 | `run web / ✓ ParticipantsList > mostra a lista na ordem devolvida pela API sem reordenar` | pass |
| C46 | `run e2e / ✓ participantes › mostra o bloco de convite e a lista com o total` | pass |
| C47 | `run api / ✓ lista de participantes > quem organiza recebe pendentes, aprovados por nome e recusados por último` | pass |
| C48 | `run api / ✓ lista de participantes > traz 20 por vez e o cursor leva aos seguintes sem pular nem repetir` | pass |
| C48 | `run api / ✓ lista de participantes > aprovar alguém com a lista aberta não pula nem repete ninguém na página s` | pass |
| C48 | `run web / ✓ ParticipantsList > Carregar mais acrescenta a página seguinte ao fim e some sem cursor` | pass |
| C48 | `run e2e / ✓ participantes › Carregar mais traz os participantes seguintes e a busca ignora acentos` | pass |
| C49 | `run api / ✓ lista de participantes > busca pelo nome sem diferenciar maiúsculas nem acentos, na mesma ordem e ` | pass |
| C49 | `run api / ✓ lista de participantes > ordena nomes com acento junto dos sem acento` | pass |
| C49 | `run api / ✓ extensão unaccent > a migration habilita o unaccent e lower(unaccent('João Ávila')) vira joao avil` | pass |
| C49 | `run web / ✓ ParticipantsList > busca na API depois de 300 ms com o termo` | pass |
| C49 | `run web / ✓ ParticipantsList > descarta a resposta de uma busca antiga` | pass |
| C49 | `run e2e / ✓ participantes › Carregar mais traz os participantes seguintes e a busca ignora acentos` | pass |
| C50 | `run api / ✓ lista de participantes > devolve lista vazia quando a busca não encontra ninguém` | pass |
| C50 | `run web / ✓ ParticipantsList > mostra Ninguém encontrado com esse nome.` | pass |
| C51 | `run api / ✓ lista de participantes > não devolve o e-mail de ninguém` | pass |
| C51 | `run web / ✓ ParticipantRow > mostra iniciais sem foto e nunca o e-mail` | pass |
| C52 | `run api / ✓ lista de participantes > devolve o total de aprovados sem a busca` | pass |
| C52 | `run web / ✓ ParticipantsList > mostra o total de participantes aprovados` | pass |
| C53 | `run api / ✓ lista de participantes > responde 404 Grupo não encontrado. a quem não participa, a pendente e a i` | pass |
| C53 | `run e2e / ✓ participantes › pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.` | pass |
| C54 | `run web / ✓ GroupTabs > mostra Grupo e Participantes com a aba atual marcada` | pass |
| C54 | `run e2e / ✓ grupos › as abas levam de Grupo a Participantes e de volta` | pass |
| C55 | `run web / ✓ GroupTabs > cada aba leva à sua rota` | pass |
| C55 | `run e2e / ✓ grupos › as abas levam de Grupo a Participantes e de volta` | pass |
| C56 | `run api / ✓ meus grupos com pedidos > mostra em Ativos o grupo com pedido pendente, com organizerName e member` | pass |
| C56 | `run web / ✓ GroupCard > pendente mostra nome, Organizado por e Aguardando aprovação, sem link` | pass |
| C56 | `run e2e / ✓ convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos` | pass |
| C57 | `run api / ✓ meus grupos com pedidos > não mostra grupos em que a pessoa foi recusada ou removida` | pass |
| C58 | `run api / ✓ meus grupos com pedidos > devolve a quem organiza a contagem de pendentes e null aos outros` | pass |
| C58 | `run web / ✓ GroupCard > mostra 1 pendente e N pendentes a quem organiza` | pass |
| C58 | `run e2e / ✓ participantes › Meus grupos mostra N pendentes a quem organiza` | pass |
| C59 | `run api / ✓ meus grupos com pedidos > pessoa pendente recebe 404 Grupo não encontrado. ao abrir o grupo` | pass |
| C59 | `run e2e / ✓ participantes › pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.` | pass |
| C60 | `run web / ✓ ParticipantRow > menu de quem organiza mostra Transferir organização e Remover do grupo com o grup` | pass |
| C60 | `run web / ✓ ParticipantRow > com o grupo SORTEADO o menu mostra só Transferir organização` | pass |
| C60 | `run web / ✓ ParticipantRow > sem menu na linha de quem organiza e para quem não organiza` | pass |
| C61 | `run web / ✓ MemberActions > Remover do grupo confirma com os textos da spec e foco em Manter no grupo` | pass |
| C62 | `run api / ✓ remover participante > passa a participação para recusada e tira a pessoa dos aprovados` | pass |
| C62 | `run web / ✓ MemberActions > confirmar a remoção chama a API e recarrega a lista` | pass |
| C62 | `run e2e / ✓ participantes › organizador remove participante, que não entra de novo pelo link` | pass |
| C63 | `run web / ✓ MemberActions > Manter no grupo, Esc e toque fora fecham sem remover` | pass |
| C64 | `run api / ✓ remover participante > responde 409 com o grupo SORTEADO ou ENCERRADO sem remover` | pass |
| C65 | `run api / ✓ remover participante > responde 409 Quem organiza não pode ser removido.` | pass |
| C66 | `run api / ✓ remover participante > responde 403 a participante que não organiza sem remover` | pass |
| C67 | `run web / ✓ LeaveGroup > mostra Sair do grupo a quem participa e não organiza com o grupo ABERTO` | pass |
| C68 | `run web / ✓ LeaveGroup > confirma com os textos da spec e foco em Ficar no grupo` | pass |
| C69 | `run api / ✓ sair do grupo > apaga a participação e o grupo some de Meus grupos` | pass |
| C69 | `run web / ✓ LeaveGroup > confirmar chama a API e leva a /grupos` | pass |
| C69 | `run e2e / ✓ grupos › participante sai do grupo e o grupo some de Meus grupos` | pass |
| C70 | `run api / ✓ sair do grupo > quem saiu abre o convite como quem nunca participou e pode entrar de novo` | pass |
| C71 | `run api / ✓ sair do grupo > responde 409 com o grupo SORTEADO ou ENCERRADO e mantém a participação` | pass |
| C71 | `run web / ✓ LeaveGroup > mostra a mensagem da API num 409` | pass |
| C72 | `run api / ✓ sair do grupo > responde 409 Transfira a organização antes de sair do grupo. a quem organiza` | pass |
| C73 | `run web / ✓ LeaveGroup > não mostra Sair do grupo a quem organiza nem com o grupo fora de ABERTO` | pass |
| C74 | `run web / ✓ ParticipantRow > menu de quem organiza mostra Transferir organização e Remover do grupo com o grup` | pass |
| C74 | `run web / ✓ ParticipantRow > com o grupo SORTEADO o menu mostra só Transferir organização` | pass |
| C74 | `run api / ✓ transferir organização > transfere com o grupo SORTEADO` | pass |
| C75 | `run web / ✓ MemberActions > Transferir organização confirma com os textos da spec e foco em Manter organização` | pass |
| C76 | `run api / ✓ transferir organização > faz da pessoa escolhida quem organiza e mantém a antiga como participante` | pass |
| C76 | `run api / ✓ transferir organização > depois da transferência o antigo organizador recebe 403 ao editar` | pass |
| C76 | `run web / ✓ MemberActions > confirmar a transferência chama a API e recarrega a página` | pass |
| C76 | `run e2e / ✓ participantes › organizador transfere a organização e passa a ver o grupo como participante` | pass |
| C77 | `run api / ✓ transferir organização > responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO` | pass |
| C78 | `run api / ✓ transferir organização > responde 404 Participante não encontrado. a pendente, recusado, de outro ` | pass |
| C79 | `run api / ✓ transferir organização > responde 403 a quem não organiza` | pass |
| C80 | `run api / ✓ transferir organização > a resposta da transferência não traz dado de sorteio` | pass |
| C81 | `run web / ✓ InviteBlock > Gerar novo link confirma com os textos da spec e foco em Manter link` | pass |
| C81 | `run web / ✓ InviteBlock > Manter link fecha sem trocar` | pass |
| C82 | `run api / ✓ gerar novo link > troca o código do grupo e devolve o novo` | pass |
| C82 | `run web / ✓ InviteBlock > confirmar mostra o link novo e anuncia Novo link gerado` | pass |
| C82 | `run e2e / ✓ participantes › gerar novo link barra o link antigo` | pass |
| C83 | `run api / ✓ gerar novo link > o código antigo passa a responder 404 ao abrir e ao entrar` | pass |
| C83 | `run e2e / ✓ participantes › gerar novo link barra o link antigo` | pass |
| C84 | `run api / ✓ gerar novo link > mantém todas as participações do grupo` | pass |
| C85 | `run api / ✓ gerar novo link > responde 409 com o grupo SORTEADO ou ENCERRADO e mantém o código` | pass |
| C85 | `run web / ✓ InviteBlock > mostra a mensagem da API num 409 ou 429 ao gerar link` | pass |
| C86 | `run api / ✓ gerar novo link > responde 403 a participante que não organiza e mantém o código` | pass |
| C86 | `run api / ✓ gerar novo link > responde 404 a quem não participa` | pass |
| C87 | `run api / ✓ gerar novo link > responde 429 à 11ª troca da hora do grupo e aceita a 10ª` | pass |
| C88 | `run web / ✓ EmailInviteForm > mostra o campo E-mails e Enviar convites` | pass |
| C88 | `run web / ✓ InviteBlock > Convidar por e-mail mostra e esconde o formulário` | pass |
| C88 | `run shared / ✓ parseInviteEmails > separa por vírgula, ponto e vírgula, espaço e quebra de linha` | pass |
| C88 | `run shared / ✓ parseInviteEmails > descarta separadores repetidos e pontas vazias` | pass |
| C89 | `run api / ✓ convidar por e-mail > enfileira um convite por endereço distinto com o link do grupo e grava cada ` | pass |
| C89 | `run api / ✓ convidar por e-mail > devolve a quantidade de e-mails enviados` | pass |
| C89 | `run api / ✓ convidar por e-mail > envia também para quem já participa` | pass |
| C89 | `run shared / ✓ parseInviteEmails > conta uma vez os repetidos sem diferenciar maiúsculas` | pass |
| C89 | `run web / ✓ EmailInviteForm > envia e mostra Convite enviado para 1 e-mail. e Convites enviados para N e-mails` | pass |
| C89 | `run e2e / ✓ participantes › convida por e-mail e o convite chega com o link do grupo` | pass |
| C90 | `run shared / ✓ validateInviteEmails > lista os endereços inválidos em Confira estes e-mails:` | pass |
| C90 | `run shared / ✓ isEmailAddress > aceita endereço comum e recusa sem arroba, sem ponto no domínio, com espaço ou` | pass |
| C90 | `run api / ✓ convidar por e-mail > recusa com 400 e a lista dos inválidos sem enviar nenhum` | pass |
| C90 | `run api / ✓ convidar por e-mail > recusa com 400 endereço que o isEmail da API recusa` | pass |
| C90 | `run web / ✓ EmailInviteForm > lista os inválidos sem enviar` | pass |
| C91 | `run shared / ✓ validateInviteEmails > aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails` | pass |
| C91 | `run shared / ✓ validateInviteEmails > conta 20 distintos quando há repetidos além deles` | pass |
| C91 | `run api / ✓ convidar por e-mail > aceita 20 endereços distintos e recusa 21 sem enviar nenhum` | pass |
| C91 | `run web / ✓ EmailInviteForm > recusa mais de 20 sem enviar` | pass |
| C92 | `run shared / ✓ validateInviteEmails > recusa o campo vazio com Informe pelo menos um e-mail.` | pass |
| C92 | `run web / ✓ EmailInviteForm > mostra Informe pelo menos um e-mail. sem enviar` | pass |
| C92 | `run api / ✓ convidar por e-mail > recusa com 400 o campo vazio` | pass |
| C93 | `run api / ✓ convidar por e-mail > aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, ` | pass |
| C93 | `run api / ✓ convidar por e-mail > volta a aceitar quando o envio mais antigo sai da janela de 24 horas` | pass |
| C93 | `run api / ✓ limite de convites por e-mail > diz em N horas acima de uma hora` | pass |
| C93 | `run api / ✓ limite de convites por e-mail > diz em 1 hora com exatamente uma hora` | pass |
| C93 | `run api / ✓ limite de convites por e-mail > diz em N minutos abaixo de uma hora` | pass |
| C93 | `run api / ✓ limite de convites por e-mail > grava o Retry-After em segundos` | pass |
| C93 | `run web / ✓ EmailInviteForm > mostra a mensagem do 429 e do 409 da API` | pass |
| C94 | `run api / ✓ convidar por e-mail > responde 409 com o grupo SORTEADO ou ENCERRADO sem enviar` | pass |
| C94 | `run web / ✓ EmailInviteForm > mostra a mensagem do 429 e do 409 da API` | pass |
| C95 | `run api / ✓ convidar por e-mail > responde 403 a participante que não organiza sem enviar` | pass |
| C96 | `run web / ✓ EmailInviteForm > desabilita o botão e mostra Enviando… durante o envio` | pass |
| C97 | `run api / ✓ e-mails do convite > convite por e-mail tem o assunto, o texto e o botão Ver convite para /convite` | pass |
| C97 | `run api / ✓ convidar por e-mail > enfileira um convite por endereço distinto com o link do grupo e grava cada ` | pass |
| C97 | `run e2e / ✓ participantes › convida por e-mail e o convite chega com o link do grupo` | pass |
| C98 | `run api / ✓ e-mails do convite > pedido de entrada tem o assunto, o texto e o botão Ver pedidos` | pass |
| C98 | `run api / ✓ entrar pelo convite > enfileira na mesma transação o aviso de pedido a quem organiza` | pass |
| C99 | `run api / ✓ e-mails do convite > entrada sem aprovação tem o assunto, o texto e o botão Ver participantes` | pass |
| C99 | `run api / ✓ entrar pelo convite > enfileira na mesma transação o aviso de entrada a quem organiza` | pass |
| C100 | `run api / ✓ e-mails do convite > entrada aprovada tem o assunto, o texto e o botão Ver grupo` | pass |
| C100 | `run api / ✓ aprovar e recusar > enfileira o aviso de entrada aprovada e de entrada recusada` | pass |
| C100 | `run api / ✓ desligar a aprovação > enfileira o aviso de entrada aprovada a cada pessoa aprovada` | pass |
| C101 | `run api / ✓ e-mails do convite > entrada recusada tem o assunto, o texto e o botão Ver meus grupos` | pass |
| C101 | `run api / ✓ aprovar e recusar > enfileira o aviso de entrada aprovada e de entrada recusada` | pass |
| C102 | `run api / ✓ e-mails do convite > remoção tem o assunto, o texto e o botão Ver meus grupos` | pass |
| C102 | `run api / ✓ remover participante > enfileira o aviso de remoção à pessoa` | pass |
| C103 | `run api / ✓ e-mails do convite > saída tem o assunto, o texto e o botão Ver participantes` | pass |
| C103 | `run api / ✓ sair do grupo > enfileira o aviso de saída a quem organiza` | pass |
| C104 | `run api / ✓ e-mails do convite > nova organização tem o assunto, o texto e o botão Ver grupo` | pass |
| C104 | `run api / ✓ transferir organização > enfileira o aviso de nova organização a quem recebe` | pass |
| C105 | `run api / ✓ e-mails do convite > mostram nomes de pessoa e de grupo com marcação HTML como texto` | pass |
| C106 | `run api / ✓ entrar pelo convite > não enfileira aviso quando a entrada é recusada` | pass |
| C106 | `run api / ✓ aprovar e recusar > não emite evento nem aviso quando a ação é recusada` | pass |
| C106 | `run api / ✓ remover participante > não emite evento nem aviso quando a remoção é recusada` | pass |
| C106 | `run api / ✓ sair do grupo > não emite evento nem aviso quando a saída é recusada` | pass |
| C106 | `run api / ✓ transferir organização > não emite evento nem aviso quando a transferência é recusada` | pass |
| C106 | `run api / ✓ desligar a aprovação > não aprova nada quando a edição é recusada` | pass |
| C107 | `run api / ✓ abrir convite > emite invite.viewed com o groupId e sem código, nome ou id de pessoa` | pass |
| C107 | `run api / ✓ abrir convite > não emite invite.viewed para robô de preview` | pass |
| C108 | `run api / ✓ entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais` | pass |
| C109 | `run api / ✓ entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais` | pass |
| C110 | `run api / ✓ aprovar e recusar > emite membership.approved com trigger manual e membership.rejected` | pass |
| C110 | `run api / ✓ desligar a aprovação > emite membership.approved com trigger auto para cada participação` | pass |
| C111 | `run api / ✓ aprovar e recusar > emite membership.approved com trigger manual e membership.rejected` | pass |
| C112 | `run api / ✓ sair do grupo > emite membership.left sem dados pessoais` | pass |
| C113 | `run api / ✓ remover participante > emite membership.removed sem dados pessoais` | pass |
| C114 | `run api / ✓ gerar novo link > emite invite.regenerated sem o código` | pass |
| C115 | `run api / ✓ convidar por e-mail > emite invite.emails_sent com count e sem e-mails` | pass |
| C116 | `run api / ✓ transferir organização > emite group.ownership_transferred sem dados pessoais` | pass |
| C117 | `run api / ✓ abrir convite > emite invite.viewed com o groupId e sem código, nome ou id de pessoa` | pass |
| C117 | `run api / ✓ entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais` | pass |
| C117 | `run api / ✓ gerar novo link > emite invite.regenerated sem o código` | pass |
| C117 | `run api / ✓ convidar por e-mail > emite invite.emails_sent com count e sem e-mails` | pass |
| C117 | `run api / ✓ remover participante > emite membership.removed sem dados pessoais` | pass |
| C117 | `run api / ✓ sair do grupo > emite membership.left sem dados pessoais` | pass |
| C117 | `run api / ✓ transferir organização > emite group.ownership_transferred sem dados pessoais` | pass |
| C118 | `run api / ✓ abrir convite > não emite invite.viewed para código inválido nem acima do limite` | pass |
| C118 | `run api / ✓ entrar pelo convite > não emite evento quando a entrada é recusada` | pass |
| C118 | `run api / ✓ gerar novo link > não emite invite.regenerated quando a troca é recusada` | pass |
| C118 | `run api / ✓ convidar por e-mail > não emite invite.emails_sent quando o envio é recusado` | pass |
| C118 | `run api / ✓ aprovar e recusar > não emite evento nem aviso quando a ação é recusada` | pass |
| C118 | `run api / ✓ remover participante > não emite evento nem aviso quando a remoção é recusada` | pass |
| C118 | `run api / ✓ sair do grupo > não emite evento nem aviso quando a saída é recusada` | pass |
| C118 | `run api / ✓ transferir organização > não emite evento nem aviso quando a transferência é recusada` | pass |
| C119 | `run e2e / ✓ acessibilidade › /convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e ` | pass |
| C119 | `run e2e / ✓ acessibilidade › /grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal ` | pass |
| C119 | `run e2e / ✓ acessibilidade › /grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em` | pass |
| C119 | `run e2e / ✓ acessibilidade › /grupos com card pendente sem violações nos dois temas e sem rolagem horizontal e` | pass |
| C120 | `run e2e / ✓ acessibilidade › /convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e ` | pass |
| C120 | `run e2e / ✓ acessibilidade › /grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal ` | pass |
| C120 | `run e2e / ✓ acessibilidade › /grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em` | pass |
| C120 | `run e2e / ✓ acessibilidade › /grupos com card pendente sem violações nos dois temas e sem rolagem horizontal e` | pass |
| C121 | `run web / ✓ InviteBlock > Gerar novo link confirma com os textos da spec e foco em Manter link` | pass |
| C121 | `run web / ✓ MemberActions > Remover do grupo confirma com os textos da spec e foco em Manter no grupo` | pass |
| C121 | `run web / ✓ MemberActions > Transferir organização confirma com os textos da spec e foco em Manter organização` | pass |
| C121 | `run web / ✓ LeaveGroup > confirma com os textos da spec e foco em Ficar no grupo` | pass |
| C121 | `run web / ✓ ConfirmDialog > põe o foco em Manter grupo e prende o Tab` | pass |
| C122 | `run web / ✓ InviteBlock > Copiar link copia e anuncia Link copiado` | pass |
| C122 | `run web / ✓ InviteBlock > confirmar mostra o link novo e anuncia Novo link gerado` | pass |
| C123 | `run api / ✓ entrar pelo convite > duas entradas simultâneas da mesma pessoa criam uma participação e um aviso` | pass |
| C124 | `run api / ✓ entrar pelo convite > entrada simultânea à mudança para SORTEADO cria antes ou responde 409` | pass |
| C125 | `run api / ✓ gerar novo link > o código antigo passa a responder 404 ao abrir e ao entrar` | pass |
| C126 | `run api / ✓ transferir organização > duas transferências simultâneas aplicam uma e a outra recebe 403` | pass |
| C127 | `run api / ✓ aprovar e recusar > aprovar e recusar ao mesmo tempo aplica o primeiro e envia só o aviso dele` | pass |
| C128 | `run api / ✓ sair do grupo > sair enquanto quem organiza remove aplica o primeiro e o segundo responde 404 ou o` | pass |
| C129 | `run api / ✓ lista de participantes > com 20 visíveis não devolve cursor e com 21 devolve` | pass |
| C129 | `run web / ✓ ParticipantsList > Carregar mais acrescenta a página seguinte ao fim e some sem cursor` | pass |
| C130 | `run api / ✓ convidar por e-mail > aceita 20 endereços distintos e recusa 21 sem enviar nenhum` | pass |
| C130 | `run shared / ✓ validateInviteEmails > aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails` | pass |
| C131 | `run api / ✓ convidar por e-mail > aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, ` | pass |
| C132 | `run api / ✓ lista de participantes > trata % e _ da busca como texto` | pass |
| C133 | `run web / ✓ InviteView > mostra nome com marcação HTML como texto` | pass |
| C133 | `run web / ✓ inviteMetadata > mantém marcação HTML do nome como texto nas meta tags` | pass |
| C134 | `run api / ✓ desligar a aprovação > com o grupo SORTEADO salva o campo e mantém os pendentes, sem aviso nem eve` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run web` - exit 0

```
@amigo-secreto/web:test:  ✓ src/instrumentation.test.ts > instrumentation > exporta onRequestError do Sentry 1ms
@amigo-secreto/web:test: 
@amigo-secreto/web:test:  Test Files  39 passed (39)
@amigo-secreto/web:test:       Tests  182 passed (182)
@amigo-secreto/web:test:    Start at  09:18:16
@amigo-secreto/web:test:    Duration  6.34s (tests 36%, environment 33%, import 16%, setup 13%, transform 2%, worker 1%)
@amigo-secreto/web:test: 
@amigo-secreto/web:test: Environment  jsdom was created 39 times · 12.68s total, 33% of tracked time
@amigo-secreto/web:test:              create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
@amigo-secreto/web:test:              learn more: https://vitest.dev/guide/improving-performance#test-environments
@amigo-secreto/web:test: 

 Tasks:    2 successful, 2 total
Cached:    0 cached, 2 total
  Time:    7.403s
```

`Run e2e` - exit 0

```
@amigo-secreto/web:test:e2e:   ✓   58 [chromium] › e2e/email-confirmation.spec.ts:76:3 › confirmação de e-mail › o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar (9.7s)
@amigo-secreto/web:test:e2e:   ✓   79 [chromium] › e2e/participants.spec.ts:285:3 › participantes › convida por e-mail e o convite chega com o link do grupo (6.2s)
@amigo-secreto/web:test:e2e:   ✓  101 [chromium] › e2e/participants.spec.ts:304:3 › participantes › Carregar mais traz os participantes seguintes e a busca ignora acentos (2.5s)
@amigo-secreto/web:test:e2e:   ✓  102 [chromium] › e2e/participants.spec.ts:343:3 › participantes › Meus grupos mostra N pendentes a quem organiza (336ms)
@amigo-secreto/web:test:e2e:   ✓  103 [chromium] › e2e/participants.spec.ts:360:3 › participantes › pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado. (351ms)
@amigo-secreto/web:test:e2e:   ✓   75 [chromium] › e2e/password-reset.spec.ts:64:5 › recuperação de senha › o link troca a senha e entra (12.3s)
@amigo-secreto/web:test:e2e:   ✓  100 [chromium] › e2e/email-confirmation.spec.ts:99:3 › confirmação de e-mail › o link de troca de e-mail troca o e-mail mostrado no perfil (10.2s)
@amigo-secreto/web:test:e2e:   ✓  105 [chromium] › e2e/email-confirmation.spec.ts:121:3 › confirmação de e-mail › o link de troca para um e-mail em uso mostra "Este e-mail já está em uso por outra conta." (9.7s)
@amigo-secreto/web:test:e2e:   ✓  104 [chromium] › e2e/password-reset.spec.ts:80:5 › recuperação de senha › o link usado mostra "Este link expirou ou já foi usado." com o caminho para /esqueci-a-senha (15.0s)
@amigo-secreto/web:test:e2e: 
@amigo-secreto/web:test:e2e:   105 passed (47.6s)

 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
  Time:    57.41s
```

`Run api` - exit 0

```
@amigo-secreto/api:test:  ✓  integration-dist  test/email-test-command.int-spec.ts > email:test > compila a API antes de enfileirar num clone sem dist 1277ms
@amigo-secreto/api:test: (node:35096) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
@amigo-secreto/api:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > cria a tabela de controle de migrations num banco vazio 1189ms
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > roda num clone sem build, sem a pasta dist 1113ms
@amigo-secreto/api:test: 
@amigo-secreto/api:test:  Test Files  74 passed (74)
@amigo-secreto/api:test:       Tests  518 passed (518)
@amigo-secreto/api:test:    Start at  09:19:22
@amigo-secreto/api:test:    Duration  40.93s (tests 74%, import 25%)
@amigo-secreto/api:test: 

 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
  Time:    43.561s
```

`Run shared` - exit 0

```
@amigo-secreto/shared:test:  ✓ src/groups.spec.ts > normalizeGroupInput > mantém as quebras de linha do recado 0ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > brasiliaInputToIso > converte 2026-12-20T19:00 para 2026-12-20T22:00:00.000Z 1ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > isoToBrasiliaInput > devolve o valor do campo no horário de Brasília 0ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > formatBrasiliaDateTime > formata 2026-12-20T22:00:00.000Z como 20/12/2026 às 19:00 0ms
@amigo-secreto/shared:test:  ✓ src/brasilia-time.spec.ts > formatBrasiliaDate > formata a data no horário de Brasília, inclusive perto da meia-noite UTC 0ms
@amigo-secreto/shared:test: 
@amigo-secreto/shared:test:  Test Files  3 passed (3)
@amigo-secreto/shared:test:       Tests  27 passed (27)
@amigo-secreto/shared:test:    Start at  09:20:05
@amigo-secreto/shared:test:    Duration  151ms (import 54%, transform 17%, tests 17%, worker 12%)
@amigo-secreto/shared:test: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    505ms
```
