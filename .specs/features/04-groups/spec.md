# Groups Specification

**Approved**: 2026-11-21 - user: "Spec aprovada."

## Problem Statement

Com a conta pronta, a pessoa ainda não tem o que fazer no Amigo Secreto: não há como criar um grupo nem ver os grupos de que participa. Tudo o que vem depois (convite, sorteio, lista de desejos, mural, mensagens) acontece dentro de um grupo, e o organizador precisa montá-lo em segundos pelo celular, só com o nome, e completar o resto depois.

## Goals

- [ ] Uma pessoa logada cria um grupo só com o nome e chega à página dele em menos de 30 segundos pelo celular.
- [ ] "Meus grupos" mostra, numa tela, todos os grupos de que a pessoa participa, separando os ativos dos encerrados.
- [ ] Só quem organiza altera, encerra ou exclui o grupo, e ninguém de fora descobre que um grupo existe.
- [ ] As features seguintes (convites, sorteio, lista, mural, mensagens) se penduram no grupo e na participação sem refazer o modelo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Transferir a organização (RN15) | Vai para a `05-invites`, junto da lista de participantes (AD-001 revisado em 2026-11-21) - user: "Mover para a 05-invites (Recomendado)". |
| Arquivar grupo | Não existe; o status ENCERRADO cobre (AD-001 revisado em 2026-11-21) - user: "Não existe; ENCERRADO cobre (Recomendado)". |
| Link e código de convite, entrada, aprovação, pendentes no card, lista de participantes, remover e sair | Feature `05-invites`. |
| Sorteio, passagem para SORTEADO, cancelar sorteio, lembrete na data prevista do sorteio | Feature `06-draw`. |
| Abas da página do grupo (participantes, lista de desejos, mural, mensagens) | Cada aba nasce com a feature dela - user: "Só os dados e as ações (Recomendado)". |
| Encerramento automático, lembrete da confraternização, retenção (`scope.md` 8.1) | Feature `10-lifecycle`. |
| Grupos do usuário que exclui a conta (RN12, RN15) | Feature `11-account-deletion`. |
| Landing page para quem não está logado em `/` | Feature `12-public-pages`. |
| Reabrir um grupo encerrado | O diagrama do `scope.md` 4.2 não tem essa transição. |
| Duplicar grupo do ano anterior (grupos recorrentes) | Pós-MVP (`scope.md` 4.9). |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Transferir a organização | Sai desta feature e entra na `05-invites` | Sem participantes, não há para quem transferir | y - user: "Mover para a 05-invites (Recomendado)" |
| Arquivar | Não existe; o organizador encerra ou exclui; "Meus grupos" separa os encerrados | ENCERRADO já cobre | y - user: "Não existe; ENCERRADO cobre (Recomendado)" |
| Encerrar manualmente | Só de SORTEADO para ENCERRADO; até a `06-draw`, testado com grupo sorteado criado no banco | Segue o diagrama do `scope.md` 4.2 | y - user: "Só SORTEADO (Recomendado)" |
| Excluir | Em qualquer status, com ConfirmDialog; definitivo, sem lixeira | Pedido do usuário | y - user: "Qualquer status, com confirmação (Recomendado)" |
| Conta com e-mail não confirmado | Pode criar grupo | Menos atrito para quem acabou de se cadastrar | y - user: "Pode criar (Recomendado)" |
| Valor do presente | Reais inteiros, de 1 a 100.000; valor único grava mínimo = máximo; faixa com mínimo ≤ máximo | Presente se combina em valores redondos | y - user: "Reais inteiros (Recomendado)" |
| Datas | Data nova ou alterada no futuro; sorteio previsto antes da confraternização; data já salva que passou pode ficar | Evita lembrete no passado | y - user: "Futuras e sorteio antes da festa (Recomendado)" |
| Local | Texto livre até 200 caracteres e caixa "Evento online"; sem validar link | Serve para endereço e para link | y - user: "Caixa 'Online' + texto livre (Recomendado)" |
| Rotas | `/grupos`, `/grupos/novo`, `/grupos/{id}`, `/grupos/{id}/editar`; id UUID | Não revela quantos grupos existem | y - user: "/grupos, /grupos/novo, /grupos/[id] e /grupos/[id]/editar com UUID (Recomendado)" |
| Navegação | Destino padrão depois de entrar vira `/grupos` (revisa AUTH-09 AC 2); "Meus grupos" no menu do avatar; logado em `/` vai para `/grupos` | Combinado na `03-auth` | y - user: "Destino padrão vira /grupos (Recomendado), 'Meus grupos' no menu do avatar (Recomendado), Logado em / vai para /grupos (Recomendado)" |
| Ordem de "Meus grupos" | Seções "Ativos" e "Encerrados", mais novos primeiro, sem paginação | Uma pessoa tem poucos grupos | y - user: "Ativos e Encerrados, mais novos primeiro (Recomendado)" |
| Edição por status | ABERTO e SORTEADO editam; ENCERRADO só leitura | Depois do sorteio a festa ainda pode mudar | y - user: "ABERTO e SORTEADO editam; ENCERRADO só leitura (Recomendado)" |
| Página do grupo | Só dados e ações; sem abas | Cada aba nasce com a feature dela | y - user: "Só os dados e as ações (Recomendado)" |
| Eventos de negócio | `group.created`, `group.updated`, `group.closed`, `group.deleted` | Métricas do `scope.md` 8 (AD-005) | y - user: "group.created (Recomendado), group.closed (Recomendado), group.deleted (Recomendado), group.updated" |
| Limite de criação | 20 grupos por hora por conta (janela fixa, AD-014); 429 acima | Freia script sem atrapalhar uso real | y - user: "20 grupos por hora por conta (Recomendado)" |
| Aviso por e-mail | Excluir e encerrar mandam e-mail aos outros participantes aprovados | Pedido do usuário; fora da tabela 4.7 do `scope.md` | y - user: "Avisa ao excluir e ao encerrar" |
| Nome do grupo | Obrigatório, 1 a 80 caracteres (pontos de código) depois de tirar os espaços das pontas | Mesmo limite do nome da pessoa; cabe no card | y - aprovado com a spec, user: "Spec aprovada." |
| Recado | Opcional, até 1.000 caracteres (pontos de código) depois de tirar os espaços das pontas; quebras de linha mantidas | Cabe um recado de festa | y - aprovado com a spec, user: "Spec aprovada." |
| Fuso horário | Datas digitadas e mostradas no horário de Brasília (`America/Sao_Paulo`), gravadas com fuso | Público no Brasil (`scope.md` 1.2) | y - aprovado com a spec, user: "Spec aprovada." |
| Formato das datas | Data e hora obrigatórias juntas em cada campo de data; exibidas como `20/12/2026 às 19:00` | O `scope.md` 4.2 fala em "data e hora" | y - aprovado com a spec, user: "Spec aprovada." |
| Formato do valor | `R$ 50` (único) e `R$ 50 a R$ 100` (faixa); campos "Valor do presente (R$)" e "Até (R$)", este só para faixa | Um campo basta para o caso comum | y - aprovado com a spec, user: "Spec aprovada." |
| Quem vê a página do grupo | Só participantes aprovados; para os outros, 404 "Grupo não encontrado.", igual a um id que não existe | Ninguém de fora descobre que o grupo existe | y - aprovado com a spec, user: "Spec aprovada." |
| Não organizador tentando alterar | API responde 403 "Só quem organiza pode alterar o grupo."; `/grupos/{id}/editar` leva à página do grupo | Participante já sabe que o grupo existe | y - aprovado com a spec, user: "Spec aprovada." |
| "Exigir aprovação" na página | A linha "Entrada com aprovação" aparece só para quem organiza | É configuração do organizador | y - aprovado com a spec, user: "Spec aprovada." |
| Destinatários dos avisos | Participantes aprovados, menos quem organiza, no e-mail da conta (confirmado ou não) | Quem fez a ação já sabe | y - aprovado com a spec, user: "Spec aprovada." |
| Textos dos e-mails | Excluído: assunto "O grupo {nome} foi excluído", texto "{organizador} excluiu o grupo {nome} no Amigo Secreto. As informações do grupo foram apagadas.", botão "Ver meus grupos". Encerrado: assunto "O grupo {nome} foi encerrado", texto "{organizador} encerrou o grupo {nome} no Amigo Secreto. Ele continua em Meus grupos, na seção Encerrados.", botão "Ver grupo" | Assunto diz o que é; um botão por e-mail | y - aprovado com a spec, user: "Spec aprovada." |
| Textos das confirmações | Excluir: "Excluir o grupo {nome}?" / "O grupo e tudo o que há nele serão apagados para todos os participantes. Não dá para desfazer." / "Excluir grupo" e "Manter grupo". Encerrar (tom primário): "Encerrar o grupo {nome}?" / "O grupo vai para Encerrados e não poderá mais ser editado nem reaberto." / "Encerrar grupo" e "Manter grupo" | Botões repetem a ação (ConfirmDialog do design system) | y - aprovado com a spec, user: "Spec aprovada." |
| Data do encerramento | O grupo grava a data e hora em que foi encerrado | A retenção da `10-lifecycle` conta a partir dela (`scope.md` 8.1) | y - aprovado com a spec, user: "Spec aprovada." |
| Payload dos eventos | `groupId` em todos; `group.updated` com a lista dos campos alterados (nomes, sem valores); `group.closed` com `trigger: "manual"`; `group.deleted` com o status no momento da exclusão. Nenhum nome, recado, local ou dado pessoal | Métrica sem dado pessoal (LGPD) | y - aprovado com a spec, user: "Spec aprovada." |
| Envio de formulário | Botão desabilitado com "Salvando..." enquanto a resposta não chega; erro inesperado mostra "Não foi possível salvar. Tente de novo." | Evita grupo duplicado por toque duplo | y - aprovado com a spec, user: "Spec aprovada." |
| Prioridades | Todas as histórias P1, menos "Encerrar grupo" (P2), que só tem uso real depois da `06-draw` | O MVP desta feature fecha com o P1 | y - aprovado com a spec, user: "Spec aprovada." |
| Acessibilidade e larguras | As quatro telas sem violações WCAG 2.1 A/AA (axe) nos temas claro e escuro e sem rolagem horizontal em 360 px e 1440 px | Mesmas larguras e regras da `01-foundation` (`scope.md` 8) | y - aprovado com a spec, user: "Spec aprovada." |

**Open questions:** none - as decisões de produto foram respondidas pelo usuário; os padrões propostos pelo agente foram confirmados na aprovação da spec.

---

## User Stories

### P1: Criar grupo ⭐ MVP

**User Story**: Como pessoa logada, quero criar um grupo informando só o nome, para começar o amigo secreto na hora e completar o resto depois.

**Why P1**: Tudo no produto acontece dentro de um grupo.

**Acceptance Criteria**:

1. WHEN uma pessoa logada envia o formulário de `/grupos/novo` só com o nome THEN o sistema SHALL criar o grupo com status ABERTO, "Exigir aprovação para entrar" e "Evento online" desmarcados, a pessoa como organizadora e participante aprovada, e levar a `/grupos/{id}`.
2. WHEN o envio inclui recado, valor do presente, sorteio previsto, confraternização, local, "Evento online" e "Exigir aprovação para entrar" THEN o sistema SHALL gravar cada campo com o valor enviado.
3. WHEN só o "Valor do presente (R$)" é informado THEN o sistema SHALL gravar o mínimo e o máximo iguais a esse valor.
4. WHEN "Valor do presente (R$)" e "Até (R$)" são informados THEN o sistema SHALL gravar o primeiro como mínimo e o segundo como máximo.
5. IF o nome, depois de tirar os espaços das pontas, tem 0 ou mais de 80 pontos de código THEN o sistema SHALL recusar com 400, mostrar "Informe um nome de 1 a 80 caracteres." e não criar o grupo.
6. IF o recado, depois de tirar os espaços das pontas, tem mais de 1.000 pontos de código THEN o sistema SHALL recusar com 400, mostrar "Use no máximo 1.000 caracteres." e não criar o grupo.
7. IF um valor do presente não é inteiro ou está fora de 1 a 100.000 THEN o sistema SHALL recusar com 400, mostrar "Informe um valor inteiro de R$ 1 a R$ 100.000." e não criar o grupo.
8. IF o "Até (R$)" é informado sem o "Valor do presente (R$)" THEN o sistema SHALL recusar com 400, mostrar "Informe o valor inicial da faixa." e não criar o grupo.
9. IF o "Valor do presente (R$)" é maior que o "Até (R$)" THEN o sistema SHALL recusar com 400, mostrar "O valor inicial não pode passar do valor final." e não criar o grupo.
10. IF o sorteio previsto ou a confraternização está no passado THEN o sistema SHALL recusar com 400, mostrar "Escolha uma data no futuro." no campo da data e não criar o grupo.
11. IF o sorteio previsto não é anterior à confraternização THEN o sistema SHALL recusar com 400, mostrar "O sorteio previsto precisa ser antes da confraternização." e não criar o grupo.
12. IF o local, depois de tirar os espaços das pontas, tem mais de 200 pontos de código THEN o sistema SHALL recusar com 400, mostrar "Use no máximo 200 caracteres." e não criar o grupo.
13. IF a conta já criou 20 grupos na janela de 1 hora em curso THEN o sistema SHALL recusar com 429, mostrar "Muitas tentativas. Tente de novo em N minutos." ("em 1 minuto." quando N = 1) e não criar o grupo.
14. WHILE o e-mail da conta não está confirmado o sistema SHALL criar o grupo como para uma conta confirmada.
15. The sistema SHALL ler as datas digitadas e mostrar as datas gravadas no horário de Brasília (`America/Sao_Paulo`), no formato `20/12/2026 às 19:00`.
16. WHILE o envio do formulário espera a resposta o site SHALL desabilitar o botão "Criar grupo" e mostrar "Salvando…".
17. IF o envio falha por erro inesperado (5xx ou rede) THEN o site SHALL manter os campos preenchidos e mostrar "Não foi possível salvar. Tente de novo."

**Independent Test**: Criar um grupo só com o nome leva à página dele, com status ABERTO e a pessoa como organizadora; enviar um sorteio previsto depois da confraternização devolve 400 com a mensagem e não cria nada.

---

### P1: Meus grupos ⭐ MVP

**User Story**: Como pessoa logada, quero ver numa tela os grupos de que participo, para chegar rápido ao que está acontecendo.

**Why P1**: É a porta de entrada da área logada.

**Acceptance Criteria**:

1. WHEN uma pessoa logada abre `/grupos` THEN o site SHALL listar, na seção "Ativos", os grupos ABERTOS e SORTEADOS de que ela é participante aprovada e, na seção "Encerrados", os ENCERRADOS, cada seção do grupo criado mais recentemente para o mais antigo.
2. The `/grupos` SHALL não listar grupos de que a pessoa não é participante aprovada.
3. The card de cada grupo SHALL mostrar o nome, o StatusTag (ABERTO, SORTEADO ou ENCERRADO) e o número de participantes aprovados ("1 participante", "N participantes").
4. WHILE o grupo está ABERTO o card SHALL mostrar "Sorteio em {dd/mm/aaaa}" com a data do sorteio previsto.
5. WHILE o grupo está SORTEADO ou ENCERRADO o card SHALL mostrar "Confraternização em {dd/mm/aaaa}" com a data da confraternização.
6. IF a data que o card mostraria não está definida THEN o card SHALL mostrar "Sem data definida".
7. WHILE a pessoa organiza o grupo o card SHALL mostrar a tag neutra "Você organiza".
8. WHEN a pessoa toca um card THEN o site SHALL levar a `/grupos/{id}` daquele grupo.
9. WHEN a pessoa usa "Criar grupo" em `/grupos` THEN o site SHALL levar a `/grupos/novo`.
10. WHILE a pessoa não participa de nenhum grupo `/grupos` SHALL mostrar "Você ainda não participa de nenhum grupo." e o botão "Criar grupo".
11. WHILE a pessoa não tem grupo encerrado `/grupos` SHALL omitir a seção "Encerrados".
12. WHILE a pessoa tem grupo encerrado e nenhum ativo a seção "Ativos" SHALL mostrar "Nenhum grupo ativo."
13. IF a API falha ao carregar os grupos THEN `/grupos` SHALL mostrar "Não foi possível carregar seus grupos." com o botão "Tentar de novo", que recarrega a lista.

**Independent Test**: Uma pessoa que organiza um grupo ABERTO e participa de um ENCERRADO vê o primeiro em "Ativos" com "Você organiza" e o segundo em "Encerrados"; um grupo de outra pessoa não aparece.

---

### P1: Página do grupo ⭐ MVP

**User Story**: Como participante, quero ver os dados do grupo, para saber o valor do presente, as datas e o local.

**Why P1**: É onde o participante consulta o combinado e onde o organizador age.

**Acceptance Criteria**:

1. WHEN um participante aprovado abre `/grupos/{id}` THEN o site SHALL mostrar o nome, o StatusTag, "Organizado por {nome de quem organiza}" e cada campo preenchido entre recado, valor do presente, sorteio previsto, confraternização e local.
2. IF um campo opcional não está preenchido THEN a página SHALL omiti-lo.
3. The página SHALL mostrar o valor do presente como `R$ 50` quando mínimo = máximo e como `R$ 50 a R$ 100` quando diferentes, com ponto de milhar (`R$ 1.500`).
4. WHILE o grupo tem "Evento online" marcado a página SHALL mostrar "Evento online" junto do local.
5. WHILE quem vê organiza o grupo e ele exige aprovação a página SHALL mostrar "Entrada com aprovação".
6. WHILE quem vê organiza um grupo ABERTO a página SHALL mostrar "Editar grupo" e "Excluir grupo".
7. WHILE quem vê organiza um grupo SORTEADO a página SHALL mostrar "Editar grupo", "Encerrar grupo" e "Excluir grupo".
8. WHILE quem vê organiza um grupo ENCERRADO a página SHALL mostrar só "Excluir grupo".
9. WHILE quem vê não organiza o grupo a página SHALL não mostrar "Editar grupo", "Encerrar grupo", "Excluir grupo" nem "Entrada com aprovação".
10. IF o id não existe, não é um UUID ou a pessoa não é participante aprovada do grupo THEN a API SHALL responder 404 e o site SHALL mostrar "Grupo não encontrado." com o link "Meus grupos".
11. IF o recado, o nome ou o local contém marcação HTML THEN a página SHALL mostrar o texto literal, sem interpretá-lo.
12. The página SHALL manter as quebras de linha do recado.

**Independent Test**: O organizador vê os dados e os botões; outro participante aprovado vê os dados sem botões; uma pessoa de fora recebe "Grupo não encontrado." igual a um id inexistente.

---

### P1: Editar grupo ⭐ MVP

**User Story**: Como organizador, quero completar e corrigir os dados do grupo, para combinar valor, datas e local com o tempo.

**Why P1**: O grupo nasce só com o nome; o resto vem depois.

**Acceptance Criteria**:

1. WHEN o organizador usa "Editar grupo" THEN o site SHALL levar a `/grupos/{id}/editar` com o formulário preenchido com os dados atuais.
2. WHEN o organizador salva o formulário válido de um grupo ABERTO ou SORTEADO THEN o sistema SHALL gravar os campos enviados e levar a `/grupos/{id}`.
3. WHEN o organizador esvazia um campo opcional e salva THEN o sistema SHALL apagar o valor gravado desse campo.
4. IF algum campo viola uma das regras dos critérios 5 a 12 de "Criar grupo" (GRP-01) THEN o sistema SHALL recusar com 400, mostrar a mesma mensagem e não alterar o grupo.
5. WHEN o envio repete uma data já gravada que ficou no passado THEN o sistema SHALL aceitá-la sem a mensagem "Escolha uma data no futuro."
6. IF uma data enviada difere da gravada e está no passado THEN o sistema SHALL recusar com 400 e mostrar "Escolha uma data no futuro."
7. IF quem envia é participante aprovado mas não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e não alterar o grupo.
8. IF o grupo está ENCERRADO THEN a API SHALL responder 409 "Grupo encerrado não pode ser editado." e não alterar o grupo.
9. WHEN quem não organiza o grupo, ou o organizador de um grupo ENCERRADO, abre `/grupos/{id}/editar` THEN o site SHALL levar a `/grupos/{id}`.
10. WHILE o envio do formulário espera a resposta o site SHALL desabilitar o botão "Salvar alterações" e mostrar "Salvando…".
11. WHEN o organizador usa "Voltar" no formulário THEN o site SHALL levar a `/grupos/{id}` sem gravar nada.

**Independent Test**: O organizador troca o valor para uma faixa e apaga o local; a página do grupo mostra a faixa e não mostra local. Outro participante recebe 403 ao tentar o mesmo pela API.

---

### P1: Excluir grupo ⭐ MVP

**User Story**: Como organizador, quero excluir um grupo que não vai acontecer, para que ele saia da lista de todo mundo.

**Why P1**: Grupo criado por engano ou abandonado não pode ficar para sempre na lista.

**Acceptance Criteria**:

1. WHEN o organizador usa "Excluir grupo" THEN o site SHALL abrir a confirmação com o título "Excluir o grupo {nome}?", o texto "O grupo e tudo o que há nele serão apagados para todos os participantes. Não dá para desfazer." e os botões "Excluir grupo" e "Manter grupo".
2. WHEN o organizador usa "Manter grupo", aperta Esc ou toca fora da confirmação THEN o site SHALL fechar a confirmação sem excluir nada.
3. WHEN o organizador confirma com "Excluir grupo" THEN o sistema SHALL apagar o grupo e todas as participações dele e levar a `/grupos`, onde o grupo não aparece mais.
4. WHILE o grupo está ABERTO, SORTEADO ou ENCERRADO o sistema SHALL permitir a exclusão pelo organizador.
5. WHEN o grupo é excluído THEN o sistema SHALL enfileirar, na mesma transação, um e-mail para cada participante aprovado que não organiza o grupo, com o assunto "O grupo {nome} foi excluído", o texto "{organizador} excluiu o grupo {nome} no Amigo Secreto. As informações do grupo foram apagadas." e o botão "Ver meus grupos", que leva a `/grupos`.
6. The sistema SHALL não enviar o aviso de exclusão a quem organiza o grupo.
7. IF quem pede a exclusão é participante aprovado mas não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e não excluir nada.
8. IF o grupo não existe mais THEN a API SHALL responder 404 e não enfileirar e-mail.

**Independent Test**: Num grupo com o organizador e dois participantes criados no banco, a exclusão apaga o grupo, enfileira dois e-mails e nenhum para o organizador; "Manter grupo" não apaga nada.

---

### P1: Navegação da área logada ⭐ MVP

**User Story**: Como pessoa logada, quero cair nos meus grupos ao entrar e chegar a eles de qualquer tela.

**Why P1**: "Meus grupos" passa a ser o centro da área logada, como a `03-auth` deixou combinado.

**Acceptance Criteria**:

1. WHEN uma pessoa entra (login, Google ou link de confirmação) sem página de origem THEN o site SHALL levá-la a `/grupos`.
2. IF a origem não é um caminho do próprio site (começa com `//` ou `/\`, tem esquema ou outro domínio) ou aponta para `/entrar` ou `/cadastro` THEN o sistema SHALL ignorá-la e usar `/grupos`.
3. WHILE há sessão o menu do avatar SHALL mostrar, nesta ordem, "Meus grupos", "Perfil" e "Sair".
4. WHEN a pessoa usa "Meus grupos" no menu do avatar THEN o site SHALL levar a `/grupos`.
5. WHEN uma pessoa logada abre `/` THEN o site SHALL levá-la a `/grupos`.
6. WHILE não há sessão `/` SHALL continuar mostrando a página atual.
7. WHEN uma pessoa sem sessão abre `/grupos`, `/grupos/novo`, `/grupos/{id}` ou `/grupos/{id}/editar` THEN o site SHALL levar a `/entrar` com o caminho da página como origem.

**Independent Test**: Entrar sem origem leva a `/grupos`; uma origem `//evil.com` também; o menu do avatar mostra "Meus grupos" primeiro; `/grupos/novo` sem sessão leva a `/entrar` e volta a `/grupos/novo` depois do login.

---

### P1: Eventos de grupo ⭐ MVP

**User Story**: Como dono do produto, quero contar grupos criados, alterados, encerrados e excluídos, para medir o funil da seção 10 do escopo.

**Why P1**: "Grupos criados" é métrica básica do `scope.md` 8 (AD-005).

**Acceptance Criteria**:

1. WHEN um grupo é criado THEN o sistema SHALL emitir `group.created` com o `groupId`.
2. WHEN um grupo é alterado THEN o sistema SHALL emitir `group.updated` com o `groupId` e a lista dos nomes dos campos cujo valor mudou.
3. WHEN um grupo é encerrado pelo organizador THEN o sistema SHALL emitir `group.closed` com o `groupId` e `trigger: "manual"`.
4. WHEN um grupo é excluído THEN o sistema SHALL emitir `group.deleted` com o `groupId` e o status do grupo no momento da exclusão.
5. The eventos de grupo SHALL não conter nome, recado ou local do grupo, nem nome ou e-mail de pessoa.
6. IF a operação é recusada (4xx) ou falha THEN o sistema SHALL não emitir o evento dela.

**Independent Test**: Criar, editar e excluir um grupo produz, nessa ordem, `group.created`, `group.updated` e `group.deleted` no log, sem o nome do grupo.

---

### P1: Telas acessíveis ⭐ MVP

**User Story**: Como pessoa usando o celular ou um leitor de tela, quero usar as telas de grupo sem barreiras.

**Why P1**: WCAG 2.1 AA nas telas principais (`scope.md` 8); o convite chega pelo celular.

**Acceptance Criteria**:

1. The `/grupos`, `/grupos/novo`, `/grupos/{id}` e `/grupos/{id}/editar` SHALL ter zero violações WCAG 2.1 A/AA no axe, no tema claro e no tema escuro.
2. The `/grupos`, `/grupos/novo`, `/grupos/{id}` e `/grupos/{id}/editar` SHALL não rolar na horizontal em 360 px e em 1440 px de largura.
3. WHEN a confirmação de excluir ou de encerrar abre THEN o site SHALL pôr o foco no botão "Manter grupo" e prender o Tab dentro dela.

**Independent Test**: O axe roda nas quatro telas nos dois temas sem violações; nenhuma tem rolagem horizontal em 360 px.

---

### P2: Encerrar grupo

**User Story**: Como organizador, quero encerrar o grupo depois da troca, para que ele saia dos ativos e vire histórico.

**Why P2**: Só tem uso real depois que a `06-draw` levar grupos a SORTEADO; o encerramento automático é da `10-lifecycle`.

**Acceptance Criteria**:

1. WHEN o organizador usa "Encerrar grupo" num grupo SORTEADO THEN o site SHALL abrir a confirmação, em tom primário, com o título "Encerrar o grupo {nome}?", o texto "O grupo vai para Encerrados e não poderá mais ser editado nem reaberto." e os botões "Encerrar grupo" e "Manter grupo".
2. WHEN o organizador usa "Manter grupo", aperta Esc ou toca fora da confirmação THEN o site SHALL fechar a confirmação sem mudar o grupo.
3. WHEN o organizador confirma com "Encerrar grupo" THEN o sistema SHALL passar o grupo para ENCERRADO, gravar a data e hora do encerramento e mostrar a página do grupo com o StatusTag ENCERRADO.
4. IF o grupo está ABERTO ou ENCERRADO THEN a API SHALL responder 409 "Só um grupo sorteado pode ser encerrado." e não mudar o grupo.
5. IF quem pede o encerramento é participante aprovado mas não organiza o grupo THEN a API SHALL responder 403 "Só quem organiza pode alterar o grupo." e não mudar o grupo.
6. WHEN o grupo é encerrado THEN o sistema SHALL enfileirar, na mesma transação, um e-mail para cada participante aprovado que não organiza o grupo, com o assunto "O grupo {nome} foi encerrado", o texto "{organizador} encerrou o grupo {nome} no Amigo Secreto. Ele continua em Meus grupos, na seção Encerrados." e o botão "Ver grupo", que leva a `/grupos/{id}`.
7. The sistema SHALL não enviar o aviso de encerramento a quem organiza o grupo.

**Independent Test**: Um grupo posto em SORTEADO direto no banco, com dois outros participantes, é encerrado pelo organizador: vai para "Encerrados", grava a data e enfileira dois e-mails; o mesmo pedido num grupo ABERTO devolve 409.

---

### P1: Valores no formulário

**User Story**: Como organizador, quero editar o valor do presente como ele foi combinado, para trocar um valor único sem mexer numa faixa que não existe.

**Why P1**: Achado da verificação de 2026-11-22: o formulário abria o "Até (R$)" preenchido num valor único e barrava a troca só do valor.

**Acceptance Criteria**:

1. WHEN o organizador abre a edição de um grupo com mínimo igual ao máximo THEN o site SHALL mostrar o valor em "Valor do presente (R$)", deixar "Até (R$)" vazio e salvar a troca só do "Valor do presente (R$)" sem mensagem de faixa.

**Independent Test**: Um grupo com R$ 50 abre a edição com "Até (R$)" vazio; trocar o valor para 80 salva R$ 80.

---

## Edge Cases

- IF dois pedidos de exclusão do mesmo grupo chegam ao mesmo tempo THEN o sistema SHALL excluir o grupo uma vez, responder 404 ao segundo e enfileirar os avisos uma vez só (GRP-05 AC 5, AC 8).
- IF dois pedidos de encerramento do mesmo grupo chegam ao mesmo tempo THEN o sistema SHALL encerrar uma vez, responder 409 ao segundo e enfileirar os avisos uma vez só (GRP-09 AC 4, AC 6).
- IF uma edição chega depois de o grupo ser encerrado por outro pedido THEN o sistema SHALL responder 409 "Grupo encerrado não pode ser editado." (GRP-04 AC 8).
- IF uma edição ou exclusão chega para um grupo já excluído THEN o sistema SHALL responder 404 (GRP-03 AC 10).
- IF o nome do grupo contém marcação HTML THEN os e-mails de aviso SHALL mostrar o texto literal (GRP-05 AC 5, GRP-09 AC 6).
- WHEN o nome tem exatamente 80 pontos de código, inclusive emojis de vários pontos de código, THEN o sistema SHALL aceitá-lo; com 81, SHALL recusá-lo (GRP-01 AC 5).
- WHEN o valor é exatamente 1 ou 100.000 THEN o sistema SHALL aceitá-lo; 0 e 100.001 SHALL ser recusados (GRP-01 AC 7).
- WHEN a 20ª criação da hora acontece THEN o sistema SHALL aceitá-la; a 21ª SHALL receber 429 (GRP-01 AC 13).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| GRP-01 | P1: Criar grupo | Design | Pending |
| GRP-02 | P1: Meus grupos | Design | Pending |
| GRP-03 | P1: Página do grupo | Design | Pending |
| GRP-04 | P1: Editar grupo | Design | Pending |
| GRP-05 | P1: Excluir grupo | Design | Pending |
| GRP-06 | P1: Navegação da área logada | Design | Pending |
| GRP-07 | P1: Eventos de grupo | Design | Pending |
| GRP-08 | P1: Telas acessíveis | Design | Pending |
| GRP-09 | P2: Encerrar grupo | Design | Pending |
| GRP-10 | P1: Valores no formulário | Execute | Verified |

**ID format:** `GRP-NN`; cada check cita o ID e o número do critério (ex.: GRP-01, AC 5).

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️ (o mapeamento acontece na fase de tasks)

---

## Sources

- `.specs/docs/scope.md` - 3 (papéis), 4.2 (grupos e diagrama de status), 4.7 (e-mails; os avisos de exclusão e encerramento são acréscimo do usuário), 5 (RN02, RN09, RN10, RN14, RN15), 6 (modelos `Group` e `Membership`), 7.3 (área logada), 8 (acessibilidade, observabilidade, sanitização) e 8.1 (marco do encerramento).
- `.specs/features/04-groups/context.md` - decisões do usuário de 2026-11-21, com as palavras dele.
- `.specs/STATE.md` - AD-001 (revisado em 2026-11-21: transferência para a `05-invites`, sem arquivar), AD-005 (eventos), AD-006 (mesma origem), AD-011 (sessão), AD-012 (rotas autenticadas por padrão), AD-013 (CSRF), AD-014 (rate limit).
- `.specs/features/03-auth/spec.md` - AUTH-09 AC 2 e o caso de borda da origem: o destino `/perfil` passa a `/grupos` (GRP-06 AC 1 e AC 2), como a `03-auth` deixou combinado.
- `.specs/features/02-email-jobs/` - `EmailService.enqueue` na transação de origem.
- Design system "Cristal e Gelo" (artifact privado no claude.ai) - GroupCard, StatusTag, ConfirmDialog, Field e Button. Não há captura de tela das telas de grupo: as telas seguem o design system e os critérios dizem o que se vê e se faz, não onde.

---

## Success Criteria

- [ ] Pelo celular, uma pessoa logada cria um grupo só com o nome e vê a página dele em menos de 30 segundos.
- [ ] Nenhum teste encontra resposta diferente entre um grupo inexistente e um grupo de que a pessoa não participa.
- [ ] Nenhum teste encontra um participante que não organiza conseguindo editar, encerrar ou excluir um grupo.
- [ ] A `05-invites` acrescenta participantes, pendentes e transferência sem mudar o formato do grupo nem da participação.
