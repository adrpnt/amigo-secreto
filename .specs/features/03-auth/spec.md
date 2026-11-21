# Auth Specification

**Approved**: 2026-11-19 - user: "Tudo aprovadp."
**Amended**: 2026-11-19 - no Design: AUTH-03 AC 3 passa a gravar o uso no máximo 1 vez por hora - user: "Aprovado."

## Problem Statement

Nada no Amigo Secreto funciona sem conta: entrar num grupo exige cadastro (RN01), e o resultado do sorteio só pode ser visto pelo próprio participante (RN06). Hoje a API não sabe quem está chamando e o site não tem cadastro, login nem perfil. Quem chega pelo link do WhatsApp precisa criar a conta em segundos, pelo celular, e ninguém pode descobrir pelo formulário quem já usa o site.

## Goals

- [ ] Uma pessoa cria a conta com e-mail e senha, ou com Google, e entra no app em menos de 1 minuto pelo celular.
- [ ] Toda rota da API sabe quem é o usuário da requisição, e as features seguintes protegem rotas sem reescrever sessão, CSRF ou rate limit.
- [ ] Nenhuma resposta de cadastro, login ou recuperação revela se um e-mail tem conta.
- [ ] Logout, troca de senha e "sair de todos os dispositivos" encerram as sessões na hora.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Exclusão de conta (RN12, RN15) | Feature `11-account-deletion` (AD-001). |
| Texto final dos termos de uso, da política de privacidade e da política de cookies | Feature `12-public-pages`; a `auth` cria só páginas provisórias - user: "Páginas provisórias (Recomendado)". |
| Apagar contas que nunca confirmaram o e-mail | Feature `10-lifecycle`, junto das contas inativas - user: "Fica para a lifecycle (Recomendado)". |
| Bloquear ações de produto para contas não confirmadas | Cada feature decide o que bloquear; a `auth` só expõe se o e-mail está confirmado - user: "Usa, com aviso (Recomendado)". |
| Desvincular a conta Google | Fora do MVP - user: "Não no MVP (Recomendado)". |
| Upload de foto de perfil | Pós-MVP, com o Cloudinary (`scope.md` 7.4) - user: "Nome e avatar do Google (Recomendado)". |
| "Meus grupos" como destino padrão depois de entrar | Feature `04-groups`; até lá o destino padrão é `/perfil`. |
| Exportação dos dados do usuário | Pós-MVP (`scope.md` 4, resumo). |
| Autenticação em dois fatores, outros provedores (Apple, Facebook), lista de sessões por dispositivo | Não estão no `scope.md`. |
| Landing page e "Criar grupo" | Features `12-public-pages` e `04-groups`. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Mecanismo de sessão | Sessão no banco; cookie httpOnly com token aleatório, banco guarda o hash; sem JWT (AD-011) | Revogação imediata sem dependência nova | y - user: "Sessão no banco (Recomendado)" |
| Conta não confirmada | Entra e usa; faixa pede confirmação e permite reenviar | Menos atrito para quem chega pelo WhatsApp | y - user: "Usa, com aviso (Recomendado)" |
| Google com e-mail já cadastrado | Vincula quando o Google informa o e-mail como verificado; e-mail passa a confirmado | Mesma pessoa entra dos dois jeitos | y - user: "Vincula automático (Recomendado)" |
| Hash de senha | argon2id pelo `crypto.argon2` do Node 26 | Sem dependência nova; primeira escolha da OWASP | y - user: "argon2id nativo (Recomendado)" |
| Foto de perfil | Foto do Google quando houver; senão, iniciais | Upload é Pós-MVP | y - user: "Nome e avatar do Google (Recomendado)" |
| O que o perfil muda | Nome, senha, opt-in de marketing, e-mail; botão "sair de todos os dispositivos" | Pedido do usuário | y - user: "Trocar senha (Recomendado), Opt-in de marketing (Recomendado), Trocar e-mail, Sair de todos os dispositivos" |
| Duração da sessão | 30 dias sem uso, renovando a cada uso; sem "lembrar de mim" | Uso sazonal pelo celular | y - user: "30 dias, renovando (Recomendado)" |
| Validade dos links | Confirmação 7 dias, recuperação 1 hora; uso único; link novo do mesmo tipo invalida o anterior | Recuperação dá acesso à conta | y - user: "Confirmação 7 dias, senha 1 hora (Recomendado)" |
| Regra de senha | 8 a 128 caracteres, sem regra de composição | Orientação atual do NIST | y - user: "8 a 128 caracteres (Recomendado)" |
| Enumeração de contas | Nenhuma resposta revela se o e-mail tem conta | Privacidade de quem usa o site | y - user: "Não revela (Recomendado)" |
| Termos e idade | Uma caixa obrigatória (termos, privacidade e idade) e uma opcional desmarcada (marketing); grava data e versão dos termos | RN13 e LGPD com um toque | y - user: "Uma caixa com os dois (Recomendado)" |
| Páginas de termos | `/termos` e `/privacidade` provisórias | Nenhum link quebrado até a `12-public-pages` | y - user: "Páginas provisórias (Recomendado)" |
| Depois do cadastro | Tela "Enviamos um e-mail para X" para e-mail novo ou repetido; conta nova não entra logada; o link de confirmação abre a sessão | Mantém o "não revela" | y - user: "Tela 'confira seu e-mail' (Recomendado)" |
| Destino depois de entrar | Página de origem (só caminhos do próprio site); sem origem, `/perfil` | Convite da `05-invites` volta ao grupo | y - user: "Volta à página de origem (Recomendado)" |
| Rotas | `/entrar`, `/cadastro`, `/esqueci-a-senha`, `/redefinir-senha`, `/confirmar-email`, `/perfil` | Coerente com `/convite/[code]` | y - user: "Em português (Recomendado)" |
| Navegador interno | Orientação para abrir no navegador, com "Copiar link", no lugar do botão do Google | Google falha no navegador interno do WhatsApp (`scope.md` 11) | y - user: "Sim, orientar (Recomendado)" |
| Rate limit | Login: 10 por e-mail e 30 por IP em 15 min. Cadastro, recuperação e reenvio: 5 por e-mail e 20 por IP por hora. 429 acima; nenhuma conta bloqueada | Freia força bruta sem travar redes de empresa | y - user: "Moderado (Recomendado)" |
| Troca de e-mail | Pede a senha atual; link de 7 dias no novo; antigo vale até a confirmação e recebe aviso | Celular desbloqueado não troca o e-mail | y - user: "Senha + aviso ao antigo (Recomendado)" |
| Avisos de segurança | Senha alterada, e-mail alterado (ao antigo), Google vinculado | Dono da conta percebe mudança que não fez | y - user: "Senha alterada (Recomendado), E-mail alterado (Recomendado), Google vinculado" |
| Cabeçalho | Deslogado: "Entrar". Logado: avatar com menu "Perfil" e "Sair". Faixa de confirmação abaixo do cabeçalho | Pedido do usuário | y - user: "Entrar / menu do avatar (Recomendado)" |
| Recuperação de senha | Confirma o e-mail, encerra todas as sessões e abre uma nova; conta só Google cria senha pelo mesmo fluxo | O link prova a posse do e-mail | y - user: "Confirma, derruba e entra (Recomendado)" |
| Eventos de negócio | `user.registered` (`method`: `password` ou `google`) e `user.email_verified` | Funil da seção 10 (AD-005) | y - user: "user.registered (Recomendado), user.email_verified (Recomendado)" |
| Prioridades | P1: cadastro, confirmação, login/logout, Google, recuperação, perfil (nome, foto, opt-in), troca de senha, proteção da API, rotas protegidas e cabeçalho, termos provisórios, eventos. P2: troca de e-mail, sair de todos os dispositivos, navegador interno | O MVP fecha com o P1; o P2 entra nesta feature, depois do P1 | y - aprovado com a spec, user: "Tudo aprovadp." |
| E-mail sem distinção de maiúsculas | E-mail guardado sem espaços nas pontas e em minúsculas; único sem distinção de maiúsculas | `Ana@x.com` e `ana@x.com` são a mesma conta | y - aprovado com a spec, user: "Tudo aprovadp." |
| Nome | Obrigatório, 1 a 80 caracteres depois de tirar os espaços das pontas | Cabe no cabeçalho e nos cards de participante | y - aprovado com a spec, user: "Tudo aprovadp." |
| Google sem e-mail verificado | IF o Google informa o e-mail como não verificado e o e-mail já tem conta, o login é recusado com "Não foi possível entrar com Google. Entre com e-mail e senha." e nada é vinculado | Vincular sem prova de posse entregaria a conta | y - aprovado com a spec, user: "Tudo aprovadp." |
| Primeiro login com Google | Tela "Complete seu cadastro" com o nome do Google preenchido e editável, a caixa obrigatória de termos e a de marketing; a conta só é criada ao enviar | O aceite dos termos vale também para o Google | y - aprovado com a spec, user: "Tudo aprovadp." |
| Login com senha em conta só Google | Mesma resposta de senha errada: "E-mail ou senha incorretos." | Não revela o tipo de conta | y - aprovado com a spec, user: "Tudo aprovadp." |
| "Esqueci a senha" com e-mail sem conta | Nenhum e-mail sai; a tela mostra o mesmo texto do caso com conta: "Se houver uma conta com X, enviamos um link para redefinir a senha." | Não revela e não manda e-mail a quem não pediu conta | y - aprovado com a spec, user: "Tudo aprovadp." |
| Troca de e-mail para um e-mail de outra conta | A resposta é a mesma ("Enviamos um link para X"); o link, ao ser aberto, mostra "Este e-mail já está em uso por outra conta." e nada muda | Só quem controla aquele e-mail fica sabendo | y - aprovado com a spec, user: "Tudo aprovadp." |
| Troca de senha no perfil | Mantém a sessão atual e encerra as outras | Quem troca não é jogado para fora | y - aprovado com a spec, user: "Tudo aprovadp." |
| Sair de todos os dispositivos | Encerra todas as sessões, inclusive a atual, e leva a `/entrar` | Mesmo efeito em todo lugar | y - aprovado com a spec, user: "Tudo aprovadp." |
| Logado abrindo `/entrar` ou `/cadastro` | Vai direto para o destino (origem ou `/perfil`) | Nada a fazer nessas telas | y - aprovado com a spec, user: "Tudo aprovadp." |
| Sessão expirada no meio do uso | A próxima chamada recebe 401 e o site leva a `/entrar` com o caminho de volta | Mesmo caminho das rotas protegidas | y - aprovado com a spec, user: "Tudo aprovadp." |
| URL pública do site nos e-mails | Variável `WEB_URL` na API, obrigatória em produção; fora dela `http://localhost:3000` | Links dos e-mails apontam para o site, não para a API | y - aprovado com a spec, user: "Tudo aprovadp." |
| Google sem configuração | Fora de produção, sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, o botão do Google não aparece; em produção a API não sobe sem elas | Desenvolvimento e testes sem conta no Google Cloud | y - aprovado com a spec, user: "Tudo aprovadp." |
| Versão dos termos | Data da versão vigente (ex.: `2026-11-19`), gravada com a data do aceite | A `12-public-pages` troca a versão quando publicar o texto final | y - aprovado com a spec, user: "Tudo aprovadp." |
| Assuntos e botões dos e-mails | Confirmação: "Confirme seu e-mail no Amigo Secreto" / "Confirmar e-mail". Já tem conta: "Você já tem uma conta no Amigo Secreto" / "Entrar" e "Redefinir senha". Recuperação: "Redefina sua senha do Amigo Secreto" / "Redefinir senha". Senha alterada: "Sua senha do Amigo Secreto foi alterada". Novo e-mail: "Confirme seu novo e-mail no Amigo Secreto" / "Confirmar novo e-mail". E-mail antigo: "Pedido de troca de e-mail no Amigo Secreto". Google vinculado: "Conta Google vinculada ao Amigo Secreto" | Assunto diz o que é; um botão por ação | y - aprovado com a spec, user: "Tudo aprovadp." |
| Textos de tela | Erro de login: "E-mail ou senha incorretos." Faixa: "Confirme seu e-mail: enviamos um link para X." com "Reenviar e-mail". Link vencido ou usado: "Este link expirou ou já foi usado." com o caminho para pedir outro. Limite: "Muitas tentativas. Tente de novo em N minutos." ("em 1 minuto." quando N = 1) Navegador interno: "Para entrar com Google, abra esta página no navegador do celular." com "Copiar link" | Diretos e sem revelar contas | y - aprovado com a spec, user: "Tudo aprovadp." |

**Open questions:** none - todas as decisões de produto foram respondidas pelo usuário (linhas `y`). Os padrões propostos pelo agente foram confirmados na aprovação da spec.

---

## User Stories

### P1: Cadastro com e-mail e senha ⭐ MVP

**User Story**: Como visitante, quero criar uma conta com nome, e-mail e senha, para entrar em grupos de amigo secreto.

**Why P1**: Participar de um grupo exige conta (RN01).

**Acceptance Criteria**:

1. WHEN um visitante envia o formulário de `/cadastro` com nome, e-mail, senha e a caixa de termos marcada THEN o sistema SHALL criar a conta com o e-mail não confirmado, gravar a data e a versão dos termos aceitos e mostrar "Enviamos um e-mail para {e-mail}. Abra o link para confirmar sua conta."
2. WHEN a conta é criada THEN o sistema SHALL enfileirar, na mesma transação, o e-mail de confirmação para o endereço cadastrado.
3. WHEN a caixa opcional de marketing está marcada no envio THEN o sistema SHALL gravar o opt-in de marketing com a data; desmarcada, SHALL gravar a conta sem opt-in.
4. IF a caixa de termos não está marcada THEN o sistema SHALL recusar o cadastro com 400 e não criar a conta.
5. IF a senha tem menos de 8 ou mais de 128 caracteres THEN o sistema SHALL recusar o cadastro com 400 e não criar a conta.
6. IF o nome, depois de tirar os espaços das pontas, tem 0 ou mais de 80 caracteres THEN o sistema SHALL recusar o cadastro com 400 e não criar a conta.
7. IF o e-mail não é um endereço válido THEN o sistema SHALL recusar o cadastro com 400 e não criar a conta.
8. IF o e-mail, sem distinção de maiúsculas, já pertence a uma conta THEN o sistema SHALL responder igual ao critério 1, não alterar a conta existente e enfileirar para esse e-mail o aviso "Você já tem uma conta no Amigo Secreto", com os botões "Entrar" e "Redefinir senha".
9. WHEN a conta é criada THEN o sistema SHALL responder sem abrir sessão, igual ao caso de e-mail repetido.
10. The sistema SHALL guardar a senha só como hash argon2id.

**Independent Test**: Cadastrar um e-mail novo cria a conta não confirmada e um job de e-mail; cadastrar o mesmo e-mail com outra caixa de letras devolve a mesma resposta e enfileira o aviso "já tem conta" sem mudar a conta.

---

### P1: Confirmação de e-mail ⭐ MVP

**User Story**: Como pessoa recém-cadastrada, quero confirmar meu e-mail por um link, para provar que o endereço é meu e já entrar no app.

**Why P1**: Os e-mails de convite e de resultado dependem de um endereço que funciona.

**Acceptance Criteria**:

1. WHEN a pessoa abre o link de confirmação válido THEN o sistema SHALL marcar o e-mail como confirmado, abrir uma sessão e levar ao destino (origem do cadastro ou `/perfil`).
2. WHEN o e-mail é confirmado THEN o sistema SHALL emitir o evento `user.email_verified`.
3. IF o link tem mais de 7 dias, já foi usado ou foi substituído por um mais novo THEN o sistema SHALL mostrar "Este link expirou ou já foi usado." e, para quem está logado com o e-mail não confirmado, o botão "Reenviar e-mail".
4. WHILE a pessoa está logada com o e-mail não confirmado o sistema SHALL mostrar, abaixo do cabeçalho, a faixa "Confirme seu e-mail: enviamos um link para {e-mail}." com o botão "Reenviar e-mail".
5. WHEN a pessoa usa "Reenviar e-mail" THEN o sistema SHALL invalidar o link anterior, enfileirar um novo e-mail de confirmação e mostrar "Enviamos um novo link para {e-mail}."
6. The link de confirmação SHALL ser de uso único e guardado no banco só como hash.

**Independent Test**: Abrir o link recebido confirma o e-mail e cai logado no perfil; abrir de novo mostra "Este link expirou ou já foi usado."; reenviar invalida o link antigo.

---

### P1: Login e logout com e-mail e senha ⭐ MVP

**User Story**: Como pessoa com conta, quero entrar com e-mail e senha e sair quando quiser, para usar o app no meu celular com segurança.

**Why P1**: É o caminho de entrada de quem não usa Google.

**Acceptance Criteria**:

1. WHEN a pessoa envia e-mail e senha corretos em `/entrar` THEN o sistema SHALL abrir uma sessão num cookie httpOnly, `Secure` em produção e `SameSite=Lax`, e levar ao destino (origem ou `/perfil`).
2. IF o e-mail não tem conta, a senha está errada ou a conta não tem senha THEN o sistema SHALL responder 401 com "E-mail ou senha incorretos." sem abrir sessão.
3. The sistema SHALL encerrar uma sessão depois de 30 dias sem uso, contados a partir do último uso gravado; uma requisição autenticada SHALL gravar o uso quando o último uso gravado tem mais de 1 hora.
4. WHEN a pessoa usa "Sair" no menu do avatar THEN o sistema SHALL encerrar a sessão no banco, apagar o cookie e levar a `/entrar`.
5. IF uma requisição chega com um cookie de sessão encerrada, vencida ou desconhecida THEN a API SHALL tratá-la como não autenticada.
6. The sistema SHALL guardar a sessão no banco só pelo hash do token do cookie.
7. WHEN a pessoa logada abre `/entrar` ou `/cadastro` THEN o sistema SHALL levar direto ao destino (origem ou `/perfil`).

**Independent Test**: Entrar com a senha certa cria a sessão e cai no perfil; com a errada mostra "E-mail ou senha incorretos."; "Sair" apaga o cookie e uma chamada seguinte com o cookie antigo é tratada como anônima.

---

### P1: Login com Google ⭐ MVP

**User Story**: Como visitante ou pessoa com conta, quero entrar com minha conta Google, para não criar nem lembrar uma senha.

**Why P1**: Reduz a fricção do cadastro obrigatório (`scope.md` 11).

**Acceptance Criteria**:

1. WHEN a pessoa usa "Entrar com Google" e volta do Google com um e-mail que já tem conta vinculada a esse Google THEN o sistema SHALL abrir a sessão e levar ao destino.
2. WHEN a pessoa volta do Google com um e-mail verificado sem conta THEN o sistema SHALL mostrar a tela "Complete seu cadastro" com o nome do Google preenchido e editável, a caixa obrigatória de termos e a caixa opcional de marketing.
3. WHEN a pessoa envia "Complete seu cadastro" com a caixa de termos marcada THEN o sistema SHALL criar a conta com o e-mail confirmado, vinculada ao Google, com a foto do Google, emitir `user.registered` com `method` `google`, abrir a sessão e levar ao destino.
4. WHEN a pessoa volta do Google com um e-mail verificado que já tem conta sem Google THEN o sistema SHALL vincular o Google a essa conta, marcar o e-mail como confirmado, abrir a sessão, levar ao destino e enfileirar o aviso "Conta Google vinculada ao Amigo Secreto".
5. IF o Google informa o e-mail como não verificado THEN o sistema SHALL mostrar "Não foi possível entrar com Google. Entre com e-mail e senha." sem criar, vincular nem abrir sessão.
6. IF a pessoa cancela no Google ou o retorno do Google é inválido THEN o sistema SHALL voltar a `/entrar` com "Não foi possível entrar com Google. Tente de novo." sem abrir sessão.
7. WHEN uma conta vinculada ao Google entra pelo Google THEN o sistema SHALL atualizar a foto do perfil com a foto atual do Google.
8. WHERE `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` não estão definidas fora de produção the sistema SHALL esconder o botão "Entrar com Google".
9. IF a API sobe em produção sem `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` THEN a API SHALL recusar a subida com uma mensagem que cita a variável que falta.

**Independent Test**: Com o Google simulado, um e-mail novo passa pela tela "Complete seu cadastro" e entra; um e-mail já cadastrado com senha é vinculado e entra; um e-mail não verificado é recusado.

---

### P1: Recuperação de senha ⭐ MVP

**User Story**: Como pessoa que esqueceu a senha, quero recebê-la de volta por e-mail, para voltar a entrar sem pedir ajuda.

**Why P1**: Sem ela, quem esquece a senha perde os grupos.

**Acceptance Criteria**:

1. WHEN a pessoa envia um e-mail em `/esqueci-a-senha` THEN o sistema SHALL mostrar "Se houver uma conta com {e-mail}, enviamos um link para redefinir a senha.", com ou sem conta.
2. WHEN o e-mail enviado tem conta THEN o sistema SHALL invalidar o link de recuperação anterior e enfileirar o e-mail "Redefina sua senha do Amigo Secreto" com um link válido por 1 hora.
3. IF o e-mail enviado não tem conta THEN o sistema SHALL não enfileirar e-mail.
4. WHEN a pessoa envia uma senha nova válida em `/redefinir-senha` com um link válido THEN o sistema SHALL trocar a senha, marcar o e-mail como confirmado, encerrar todas as sessões da conta, abrir uma sessão nova, levar ao destino e enfileirar o aviso "Sua senha do Amigo Secreto foi alterada".
5. IF o link tem mais de 1 hora, já foi usado ou foi substituído por um mais novo THEN o sistema SHALL mostrar "Este link expirou ou já foi usado." com o caminho para `/esqueci-a-senha`.
6. WHEN uma conta só Google redefine a senha pelo link THEN o sistema SHALL criar a senha, e a conta SHALL passar a entrar também com e-mail e senha.
7. The link de recuperação SHALL ser de uso único e guardado no banco só como hash.

**Independent Test**: Pedir a recuperação de um e-mail com conta enfileira o e-mail; usar o link troca a senha, derruba uma sessão aberta antes e entra; usar o link de novo mostra "Este link expirou ou já foi usado."

---

### P1: Perfil ⭐ MVP

**User Story**: Como pessoa logada, quero ver e editar meu nome e meu consentimento de marketing, para controlar como apareço e o que recebo.

**Why P1**: O nome aparece para os outros participantes; o opt-in revogável é exigência da LGPD (`scope.md` 4.1).

**Acceptance Criteria**:

1. WHEN a pessoa logada abre `/perfil` THEN o sistema SHALL mostrar o nome, o e-mail, a foto (do Google ou as iniciais do nome) e o estado do opt-in de marketing.
2. WHEN a pessoa salva um nome válido THEN o sistema SHALL gravar o nome e mostrá-lo no perfil e no menu do avatar.
3. IF o nome salvo, sem os espaços das pontas, tem 0 ou mais de 80 caracteres THEN o sistema SHALL recusar com 400 e manter o nome anterior.
4. WHEN a pessoa liga ou desliga o opt-in de marketing THEN o sistema SHALL gravar o novo estado com a data da mudança.
5. WHILE a conta não tem foto do Google o sistema SHALL mostrar as iniciais do nome no lugar da foto.

**Independent Test**: No perfil, trocar o nome muda o menu do avatar; desligar o marketing grava o estado e a data.

---

### P1: Troca de senha ⭐ MVP

**User Story**: Como pessoa logada, quero trocar minha senha, ou criar uma se só uso Google, para manter a conta segura.

**Why P1**: Pedido do usuário no perfil.

**Acceptance Criteria**:

1. WHEN a pessoa com senha envia a senha atual correta e uma senha nova válida THEN o sistema SHALL trocar a senha, manter a sessão atual, encerrar as outras sessões da conta e enfileirar o aviso "Sua senha do Amigo Secreto foi alterada".
2. IF a senha atual está errada THEN o sistema SHALL recusar com 400 e "Senha atual incorreta." sem mudar nada.
3. WHEN a pessoa de uma conta só Google envia uma senha nova válida THEN o sistema SHALL criar a senha, sem pedir senha atual, com os mesmos efeitos do critério 1.
4. IF a senha nova tem menos de 8 ou mais de 128 caracteres THEN o sistema SHALL recusar com 400 sem mudar nada.

**Independent Test**: Com duas sessões abertas, trocar a senha numa delas mantém essa e derruba a outra; a senha atual errada não muda nada.

---

### P1: Proteção da API ⭐ MVP

**User Story**: Como operador do Amigo Secreto, quero rotas autenticadas, proteção contra CSRF e limites de tentativas, para que as features seguintes protejam suas rotas sem reescrever nada.

**Why P1**: Toda feature com dado de usuário depende disso (`scope.md` 8).

**Acceptance Criteria**:

1. The API SHALL oferecer às features uma forma de marcar uma rota como autenticada e de ler o usuário da sessão na rota.
2. IF uma rota autenticada recebe uma requisição sem sessão válida THEN a API SHALL responder 401.
3. IF uma requisição `POST`, `PUT`, `PATCH` ou `DELETE` chega sem a prova anti-CSRF válida THEN a API SHALL responder 403 sem executar a ação.
4. IF o login passa de 10 tentativas por e-mail ou 30 por IP em 15 minutos THEN a API SHALL responder 429 com "Muitas tentativas. Tente de novo em {N} minutos." ("em 1 minuto." quando N = 1) sem verificar a senha.
5. IF o cadastro, o "esqueci a senha" ou o reenvio de confirmação passa de 5 pedidos por e-mail ou 20 por IP em 1 hora THEN a API SHALL responder 429 com "Muitas tentativas. Tente de novo em {N} minutos." ("em 1 minuto." quando N = 1) sem enfileirar e-mail.
6. The limites de tentativas SHALL valer somados entre todas as instâncias da API.
7. The API SHALL nunca escrever senha, token de sessão, token de link nem cookie em log, Sentry ou resposta de erro.
8. The resposta de qualquer rota SHALL nunca incluir o hash da senha nem o hash de token.

**Independent Test**: Uma rota de teste autenticada responde 401 sem cookie; um `POST` sem a prova anti-CSRF responde 403; a 11ª tentativa de login com o mesmo e-mail responde 429.

---

### P1: Rotas protegidas e cabeçalho ⭐ MVP

**User Story**: Como pessoa usando o site, quero ser levada ao login quando preciso e voltar para onde estava, e ver no cabeçalho se estou logada.

**Why P1**: O convite da `05-invites` precisa voltar ao grupo depois do login.

**Acceptance Criteria**:

1. WHEN uma pessoa sem sessão abre uma página protegida THEN o site SHALL levar a `/entrar` com o caminho da página como origem.
2. IF a origem não é um caminho do próprio site (começa com `//`, tem esquema ou outro domínio) THEN o sistema SHALL ignorá-la e usar `/perfil`.
3. WHILE não há sessão o cabeçalho SHALL mostrar o botão "Entrar", que leva a `/entrar`.
4. WHILE há sessão o cabeçalho SHALL mostrar o avatar (foto do Google ou iniciais), que abre um menu com "Perfil" e "Sair".
5. WHEN uma chamada do site recebe 401 por sessão vencida THEN o site SHALL levar a `/entrar` com o caminho atual como origem.
6. The `/perfil` SHALL ser uma página protegida.

**Independent Test**: Abrir `/perfil` sem sessão leva a `/entrar?...` e, depois do login, de volta a `/perfil`; uma origem `//evil.com` cai em `/perfil`.

---

### P1: Termos provisórios ⭐ MVP

**User Story**: Como visitante no cadastro, quero abrir os termos e a política de privacidade, para saber o que estou aceitando.

**Why P1**: O cadastro grava o aceite; o link não pode estar quebrado.

**Acceptance Criteria**:

1. WHEN um visitante abre `/termos` ou `/privacidade` THEN o site SHALL mostrar a página com o título do documento, a versão vigente e um texto provisório.
2. The caixa de termos do cadastro e de "Complete seu cadastro" SHALL ter links para `/termos` e `/privacidade`.

**Independent Test**: Os links da caixa de termos abrem as duas páginas com status 200.

---

### P1: Eventos de cadastro ⭐ MVP

**User Story**: Como dono do produto, quero contar cadastros e confirmações, para medir o funil do convite (`scope.md` 10).

**Why P1**: Métricas básicas por log de evento (AD-005).

**Acceptance Criteria**:

1. WHEN uma conta é criada por e-mail e senha THEN o sistema SHALL emitir `user.registered` com `method` `password` e o id do usuário.
2. WHEN uma conta é criada pelo Google THEN o sistema SHALL emitir `user.registered` com `method` `google` e o id do usuário.
3. The eventos da `auth` SHALL nunca levar e-mail nem nome.

**Independent Test**: Um cadastro por senha escreve uma linha de log `user.registered` com `method` `password` e sem o e-mail.

---

### P2: Troca de e-mail

**User Story**: Como pessoa logada, quero trocar o e-mail da conta, para continuar recebendo os avisos quando mudo de endereço.

**Why P2**: Pedido do usuário; o MVP funciona sem ela.

**Acceptance Criteria**:

1. WHEN a pessoa envia um e-mail novo válido e a senha atual correta THEN o sistema SHALL enfileirar para o e-mail novo o link "Confirme seu novo e-mail no Amigo Secreto", válido por 7 dias, enfileirar para o e-mail atual o aviso "Pedido de troca de e-mail no Amigo Secreto" e mostrar "Enviamos um link para {e-mail novo}."
2. WHILE o e-mail novo não foi confirmado o sistema SHALL manter o e-mail atual para login e avisos.
3. WHEN a pessoa abre o link válido do e-mail novo THEN o sistema SHALL trocar o e-mail da conta pelo novo, já confirmado.
4. IF o e-mail novo já pertence a outra conta quando o link é aberto THEN o sistema SHALL mostrar "Este e-mail já está em uso por outra conta." e não mudar nada.
5. IF a senha atual está errada THEN o sistema SHALL recusar com 400 e "Senha atual incorreta." sem enfileirar e-mail.
6. IF a conta não tem senha THEN o sistema SHALL pedir que a pessoa crie uma senha antes de trocar o e-mail.
7. IF o link tem mais de 7 dias, já foi usado ou foi substituído por um pedido mais novo THEN o sistema SHALL mostrar "Este link expirou ou já foi usado."
8. WHEN a troca de e-mail é confirmada THEN o sistema SHALL invalidar os links de recuperação de senha e de confirmação de e-mail ainda não usados da conta, enviados ao e-mail antigo. (Acrescentado em 2026-11-21, achado da verificação.)

**Independent Test**: Pedir a troca com a senha certa enfileira dois e-mails; o login continua com o e-mail antigo até o link; abrir o link troca o e-mail.

---

### P2: Sair de todos os dispositivos

**User Story**: Como pessoa logada, quero encerrar todas as minhas sessões, para garantir que um celular perdido não continue logado.

**Why P2**: Pedido do usuário; o MVP funciona sem ela.

**Acceptance Criteria**:

1. WHEN a pessoa usa "Sair de todos os dispositivos" no perfil THEN o sistema SHALL encerrar todas as sessões da conta, inclusive a atual, apagar o cookie e levar a `/entrar`.

**Independent Test**: Com duas sessões abertas, usar o botão numa delas faz as duas serem tratadas como anônimas.

---

### P2: Navegador interno

**User Story**: Como pessoa que abriu o link pelo WhatsApp, quero saber por que o Google não funciona ali, para conseguir entrar mesmo assim.

**Why P2**: O Google falha no navegador interno; e-mail e senha continuam funcionando.

**Acceptance Criteria**:

1. WHILE a página de login, de cadastro ou "Complete seu cadastro" está aberta no navegador interno do WhatsApp, do Instagram ou do Facebook o site SHALL mostrar "Para entrar com Google, abra esta página no navegador do celular." com o botão "Copiar link" no lugar de "Entrar com Google".
2. WHEN a pessoa usa "Copiar link" THEN o site SHALL copiar o endereço da página atual e mostrar "Link copiado."
3. WHILE o navegador interno está em uso o formulário de e-mail e senha SHALL continuar disponível.

**Independent Test**: Com o user agent do WhatsApp, `/entrar` mostra a orientação no lugar do botão do Google e o formulário segue funcionando.

---

## Edge Cases

- IF duas requisições de cadastro com o mesmo e-mail chegam ao mesmo tempo THEN o sistema SHALL criar uma conta só e responder às duas como no AUTH-01 AC 1 (AUTH-01 AC 8).
- IF o link de confirmação é aberto depois de a pessoa já ter confirmado por outro caminho (Google ou recuperação) THEN o sistema SHALL mostrar "Este link expirou ou já foi usado." (AUTH-02 AC 3).
- IF a pessoa troca de senha enquanto um link de recuperação está pendente THEN o sistema SHALL manter o link válido até vencer ou ser usado (AUTH-05 AC 2).
- WHEN a mesma pessoa entra em dois navegadores THEN o sistema SHALL manter duas sessões independentes (AUTH-03 AC 1).
- IF a origem aponta para `/entrar` ou `/cadastro` THEN o sistema SHALL usar `/perfil` como destino (AUTH-09 AC 2).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AUTH-01 | P1: Cadastro com e-mail e senha | Design | Pending |
| AUTH-02 | P1: Confirmação de e-mail | Design | Pending |
| AUTH-03 | P1: Login e logout com e-mail e senha | Design | Pending |
| AUTH-04 | P1: Login com Google | Design | Pending |
| AUTH-05 | P1: Recuperação de senha | Design | Pending |
| AUTH-06 | P1: Perfil | Design | Pending |
| AUTH-07 | P1: Troca de senha | Design | Pending |
| AUTH-08 | P1: Proteção da API | Design | Pending |
| AUTH-09 | P1: Rotas protegidas e cabeçalho | Design | Pending |
| AUTH-10 | P1: Termos provisórios | Design | Pending |
| AUTH-11 | P1: Eventos de cadastro | Design | Pending |
| AUTH-12 | P2: Troca de e-mail | Design | Pending |
| AUTH-13 | P2: Sair de todos os dispositivos | Design | Pending |
| AUTH-14 | P2: Navegador interno | Design | Pending |

**ID format:** `AUTH-NN`; cada check cita o ID e o número do critério (ex.: AUTH-03, AC 2).

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️ (o mapeamento acontece na fase de tasks)

---

## Sources

- `.specs/docs/scope.md` - 4.1 (autenticação e conta), 4.7 (e-mails de confirmação e recuperação), 5 (RN01, RN13), 6 (modelo `User`), 7.2 (módulo `auth`, cookie httpOnly, guards; o JWT foi trocado por sessão no banco, AD-011), 7.3 (área logada, perfil), 8 (LGPD, hash de senha, rate limit, CSRF, observabilidade) e 11 (fricção do cadastro, navegador interno do WhatsApp).
- `.specs/features/03-auth/context.md` - decisões do usuário de 2026-11-19, com as palavras dele.
- `.specs/STATE.md` - AD-001 (divisão em features), AD-004 (migrations por comando), AD-005 (métricas por log de evento), AD-006 (mesma origem por `proxy.ts`), AD-011 (sessão no banco).
- `.specs/features/02-email-jobs/` - `EmailService.enqueue` com `EntityManager` da transação de origem e blocos de parágrafo e botão.
- Node v26.13.1 (conferido em 2026-11-19) - `crypto.argon2Sync('argon2id', ...)` disponível sem aviso de experimental.
- Design system "Cristal e Gelo" (artifact privado no claude.ai) - Field, Button, Alert e AppHeader. Não há captura de tela das telas da conta: as telas seguem o design system e os critérios dizem o que se vê e se faz, não onde.

---

## Success Criteria

- [ ] Pelo celular, uma pessoa sai do link de convite, cria a conta com Google e volta à página de origem em menos de 1 minuto.
- [ ] A feature `04-groups` protege suas rotas e lê o usuário da sessão sem escrever código de sessão, CSRF ou rate limit.
- [ ] Nenhum teste de cadastro, login ou recuperação encontra diferença de resposta entre e-mail com e sem conta.
- [ ] Nenhum teste encontra senha, token ou cookie em log, Sentry ou resposta.
