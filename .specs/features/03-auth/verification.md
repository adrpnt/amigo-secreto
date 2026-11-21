# Auth verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at f4e2c20 (o cabeçalho do arquivo diz `7e06d99`; `f4e2c20` só acrescenta `proofs.md` e uma linha de `tasks.md`, o código é o mesmo)
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `register.int-spec.ts` `cria a conta não confirmada com a data e a versão dos termos e responde 202 com o e-mail`; `signup.spec.ts` `cria a conta e mostra "Enviamos um e-mail para X. Abra o link para confirmar sua conta."` | yes |
| C2 | `register.int-spec.ts` `enfileira o e-mail de confirmação na mesma transação` | yes - compara o `createdAt` do job com o da conta (`now()` da transação) |
| C3 | `register.int-spec.ts` `grava o opt-in de marketing com a data quando a caixa vem marcada`; `grava a conta sem opt-in quando a caixa vem desmarcada` | yes |
| C4 | `register.int-spec.ts` `recusa com 400 sem a caixa de termos` | yes - caixa `false` e ausente, conta nenhuma |
| C5 | `register.int-spec.ts` `recusa com 400 senha de 7 ou de 129 caracteres`; `signup.spec.ts` `mostra o erro do campo para senha com menos de 8 caracteres` | yes |
| C6 | `register.int-spec.ts` `recusa com 400 nome vazio depois do trim ou com 81 caracteres` | yes - nos casos nomeados; ver o achado do nome com emoji |
| C7 | `register.int-spec.ts` `recusa com 400 e-mail inválido` | yes |
| C8 | `register.int-spec.ts` `responde igual para e-mail já cadastrado com outra caixa de letras, sem mudar a conta, e enfileira o aviso já tem conta`; `auth-emails.spec.ts` `já tem conta ...`; `signup.spec.ts` `mostra a mesma tela para um e-mail já cadastrado` | yes |
| C9 | `register.int-spec.ts` `não abre sessão` | yes |
| C10 | `register.int-spec.ts` `guarda a senha como hash argon2id`; `password-hasher.spec.ts` `gera hash argon2id no formato PHC com m=19456, t=2 e p=1` | yes |
| C11 | `email-verification.int-spec.ts` `confirma o e-mail, abre a sessão e devolve o destino do cadastro`; `devolve /perfil como destino quando o cadastro não tinha origem`; `email-confirmation.spec.ts` `o link do e-mail confirma, abre a sessão e leva ao perfil` | yes |
| C12 | `email-verification.int-spec.ts` `emite user.email_verified`; `password-reset.int-spec.ts` `emite user.email_verified quando a conta não tinha o e-mail confirmado` | yes |
| C13 | `email-verification.int-spec.ts` `responde 410 a link vencido` / `usado` / `substituído por um reenvio`; `email-confirmation.spec.ts` `o link aberto de novo mostra ...`; `o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar` | yes |
| C14 | `email-banner.spec.ts` `aparece para quem entrou sem confirmar com "Confirme seu e-mail: enviamos um link para X."`; `some depois da confirmação` | yes |
| C15 | `email-verification.int-spec.ts` `reenvio invalida o link anterior e enfileira um novo`; `reenvio exige sessão`; `email-banner.spec.ts` `"Reenviar e-mail" mostra "Enviamos um novo link para X."` | yes |
| C16 | `auth-tokens.int-spec.ts` `guarda só o SHA-256 do token`; `consome o token uma vez só`; `consome o mesmo token uma vez só com duas transações simultâneas`; `recusa o token de outro tipo` | yes |
| C17 | `login.int-spec.ts` `abre a sessão com a senha certa e devolve o usuário`; `sessions.int-spec.ts` `abre a sessão com o cookie sid HttpOnly, SameSite=Lax, Path=/ e Max-Age de 30 dias`; `marca o cookie Secure em production`; `login.spec.ts` `entra com a senha certa e cai em /perfil` | yes |
| C18 | `login.int-spec.ts` `responde 401 "E-mail ou senha incorretos." a e-mail sem conta` / `a senha errada` / `a conta só Google`; `password-hasher.spec.ts` `verifica contra o hash fixo ...`; `login.spec.ts` `mostra "E-mail ou senha incorretos." com a senha errada` | yes |
| C19 | `sessions.int-spec.ts` `ignora a sessão com expiresAt no passado`; `grava o uso e renova expiresAt para 30 dias quando o último uso tem mais de 1 hora`; `não grava o uso quando o último uso tem menos de 1 hora` | yes - 61 e 59 minutos dos dois lados da borda |
| C20 | `login.int-spec.ts` `encerra a sessão e apaga o cookie no logout`; `header.spec.ts` `"Sair" encerra a sessão e leva a /entrar` | yes |
| C21 | `session-guard.int-spec.ts` `responde 401 com o cookie de uma sessão encerrada, vencida ou desconhecida` | yes |
| C22 | `sessions.int-spec.ts` `guarda só o SHA-256 do token` | yes |
| C23 | `login.spec.ts` `leva a pessoa logada que abre /entrar direto ao destino`; `signup.spec.ts` `leva a pessoa logada que abre /cadastro direto ao destino` | yes |
| C24 | `google-login.int-spec.ts` `abre a sessão da conta já vinculada e leva ao destino` | yes |
| C25 | `google-login.int-spec.ts` `leva e-mail verificado sem conta a /completar-cadastro com o cookie g_signup`; `google-signup.int-spec.ts` `GET /auth/google/signup devolve o nome e o e-mail do Google`; `google.spec.ts` `e-mail novo passa por "Complete seu cadastro" ...` | yes |
| C26 | `google-signup.int-spec.ts` `cria a conta confirmada, vinculada e com a foto do Google, abre a sessão e devolve o destino`; `recusa com 400 sem a caixa de termos`; `grava o opt-in de marketing quando a caixa vem marcada`; `responde 401 sem o cookie g_signup, com ele vencido ou adulterado` | yes |
| C27 | `google-login.int-spec.ts` `vincula a conta com senha de e-mail verificado, confirma o e-mail, abre a sessão e enfileira o aviso de Google vinculado`; `auth-emails.spec.ts` `Google vinculado ...`; `recusa o e-mail de conta vinculada a outro Google ...` | yes |
| C28 | `google-login.int-spec.ts` `recusa e-mail não verificado com erro=google_nao_verificado sem criar, vincular nem abrir sessão`; `google.spec.ts` `e-mail não verificado volta a /entrar com ...` | yes |
| C29 | `google-login.int-spec.ts` `volta a /entrar com erro=google quando o state difere do cookie` / `quando a pessoa cancela no Google` / `quando o Google recusa o code`; `google-oidc.int-spec.ts` `recusa id_token com aud de outro cliente` / `com iss fora do Google` / `vencido` / `falha em 10 segundos ...`; `google.spec.ts` `cancelar no Google ...`; `abrir /completar-cadastro sem passar pelo Google ...` | yes |
| C30 | `google-login.int-spec.ts` `atualiza a foto da conta vinculada a cada login` | yes |
| C31 | `google-login.int-spec.ts` `GET /auth/session informa googleEnabled false sem GOOGLE_CLIENT_ID fora de production`; `start responde 404 sem Google configurado`; `google-button.test.tsx` `não aparece com googleEnabled false` | yes |
| C32 | `env.validation.spec.ts` `lança erro que nomeia GOOGLE_CLIENT_ID quando ela falta em production`; `... GOOGLE_CLIENT_SECRET ...` | yes - confere que só a variável que falta é citada |
| C33 | `password-reset.int-spec.ts` `responde 202 igual com e sem conta`; `password-reset.spec.ts` `mostra "Se houver uma conta com X, ..." com e sem conta` | yes |
| C34 | `password-reset.int-spec.ts` `enfileira o e-mail com link de 1 hora e invalida o anterior`; `auth-emails.spec.ts` `recuperação tem o assunto ...`; `auth-tokens.int-spec.ts` `vence em 7 dias a confirmação, em 1 hora a recuperação e em 7 dias a troca de e-mail` | yes |
| C35 | `password-reset.int-spec.ts` `não enfileira e-mail para e-mail sem conta` | yes |
| C36 | `password-reset.int-spec.ts` `troca a senha, confirma o e-mail, encerra todas as sessões e abre uma nova`; `enfileira o aviso de senha alterada`; `recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres`; `password-reset.spec.ts` `o link troca a senha e entra` | yes |
| C37 | `password-reset.int-spec.ts` `responde 410 a link com mais de 1 hora` / `a link usado` / `a link substituído por um pedido mais novo`; `password-reset.spec.ts` `o link usado mostra ... com o caminho para /esqueci-a-senha` | yes |
| C38 | `password-reset.int-spec.ts` `cria a senha de uma conta só Google, que passa a entrar com e-mail e senha` | yes |
| C39 | `profile.int-spec.ts` `GET /users/me devolve nome, e-mail, foto e opt-in`; `profile.spec.ts` `mostra nome, e-mail, iniciais e o opt-in` | yes |
| C40 | `profile.int-spec.ts` `PATCH grava o nome sem os espaços das pontas`; `profile.spec.ts` `salvar o nome muda o menu do avatar` | yes |
| C41 | `profile.int-spec.ts` `PATCH recusa com 400 nome vazio ou com 81 caracteres e mantém o anterior`; `profile.spec.ts` `recusa nome vazio mantendo o anterior` | no - a API confere só o 400; o nome guardado é lido depois do PATCH de 80 caracteres, que sobrescreve. O e2e barra no cliente e não chega à API |
| C42 | `profile.int-spec.ts` `PATCH grava o opt-in com a data da mudança`; `profile.spec.ts` `desligar o marketing grava o estado` | yes |
| C43 | `header.spec.ts` `com sessão mostra o avatar com as iniciais ...`; `mostra a foto do Google no avatar de conta Google` | yes |
| C44 | `password-change.int-spec.ts` `troca a senha, mantém a sessão atual e encerra as outras`; `enfileira o aviso de senha alterada`; `auth-emails.spec.ts` `senha alterada ...`; `profile.spec.ts` `troca a senha e continua logado` | yes |
| C45 | `password-change.int-spec.ts` `recusa com 400 "Senha atual incorreta." sem mudar nada`; `profile.spec.ts` `mostra "Senha atual incorreta." com a senha atual errada` | yes |
| C46 | `password-change.int-spec.ts` `cria a senha de conta só Google sem pedir a atual`; `profile.spec.ts` `conta Google cria a senha sem pedir a atual` | yes |
| C47 | `password-change.int-spec.ts` `recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres` | yes - 7 e 129 recusadas, 8 aceita |
| C48 | `session-guard.int-spec.ts` `entrega o usuário da sessão à rota por @CurrentUser`; `deixa passar a rota com @Public sem sessão`; `mantém GET /health público` | yes |
| C49 | `session-guard.int-spec.ts` `responde 401 numa rota protegida sem cookie` | yes |
| C50 | `csrf.int-spec.ts` `responde 403 a POST sem X-CSRF-Token` e os demais da `proteção CSRF`; `GET /auth/session` `grava o cookie csrf legível pelo site`; `login.int-spec.ts` `troca o token CSRF ...`; `api-fetch.test.ts` (três casos) | yes |
| C51 | `login.int-spec.ts` `responde 429 na 11ª tentativa do mesmo e-mail ...`; `na 31ª tentativa do mesmo IP ...`; `conta as tentativas pelo IP do X-Forwarded-For ...`; `rate-limit.int-spec.ts` `lança 429 ...`; `login.spec.ts` `mostra "Muitas tentativas. Tente de novo em 15 minutos." na 11ª tentativa` | yes - a 11ª vai com a senha certa e recebe 429 |
| C52 | `register.int-spec.ts` `responde 429 no 6º cadastro ...`; `no 21º cadastro do mesmo IP ...`; `password-reset.int-spec.ts` `responde 429 no 6º pedido do mesmo e-mail ...`; `email-verification.int-spec.ts` `responde 429 no 6º reenvio em 1 hora` | no - o limite de 20 por IP só é provado no cadastro; "esqueci a senha" e reenvio não têm teste por IP |
| C53 | `rate-limit.int-spec.ts` `soma as tentativas de duas conexões ao mesmo tempo sem perder nenhuma` e os demais do `RateLimitService`; `env.validation.spec.ts` `... TRUST_PROXY_HOPS ...` | yes |
| C54 | `auth-secrecy.int-spec.ts` `não escreve senha, token de sessão, token de link nem cookie no log`; `não manda senha, token nem cookie ao Sentry num erro 500`; `não devolve senha nem token nas respostas de erro 400`; `env.validation.spec.ts` `... AUTH_SECRET ...` | yes - nos erros de validação que testa; ver o achado do JSON malformado |
| C55 | `auth-secrecy.int-spec.ts` `não devolve hash de senha nem de token nas respostas da conta`; `session-guard.int-spec.ts` `GET /auth/session` (dois casos) | yes |
| C56 | `session.test.ts` `redireciona a /entrar com o caminho como next quando não há usuário`; `repassa o cookie ...`; `devolve null sem sessão`; `profile.spec.ts` `sem sessão leva a /entrar e volta a /perfil depois do login`; `login.spec.ts` `volta à página de origem depois do login` | yes |
| C57 | `safe-next.test.ts` (cinco casos); `google-login.int-spec.ts` `troca por /perfil um destino de outro site`; `register.int-spec.ts` `troca por /perfil um destino de outro site` | yes |
| C58 | `header.spec.ts` `sem sessão mostra "Entrar", que leva a /entrar` | yes |
| C59 | `header.spec.ts` `com sessão mostra o avatar com as iniciais e o menu com "Perfil" e "Sair"` | yes |
| C60 | `api-fetch.test.ts` `leva a /entrar com o caminho atual quando recebe 401` | yes |
| C61 | `legal.spec.ts` `/termos mostra ...`; `/privacidade mostra ...` | yes |
| C62 | `signup.spec.ts` `a caixa de termos tem links para /termos e /privacidade`; `google.spec.ts` `e-mail novo passa por "Complete seu cadastro" com o nome do Google e entra` | no - o teste de "Complete seu cadastro" marca a caixa, mas não confere os links `/termos` e `/privacidade` |
| C63 | `register.int-spec.ts` `emite user.registered com method password e o id, sem e-mail nem nome` | yes |
| C64 | `google-signup.int-spec.ts` `emite user.registered com method google e o id, sem e-mail nem nome` | yes |
| C65 | os dois testes de C63 e C64 | yes |
| C66 | `email-change.int-spec.ts` `enfileira o link para o e-mail novo e o aviso para o atual e responde com o e-mail novo`; `auth-emails.spec.ts` (novo e-mail, e-mail antigo); `profile.spec.ts` `pedir a troca de e-mail mostra "Enviamos um link para X."` | yes |
| C67 | `email-change.int-spec.ts` `mantém o e-mail atual para login até a confirmação` | yes |
| C68 | `email-change.int-spec.ts` `troca o e-mail pelo novo, já confirmado, ao confirmar o link`; `email-confirmation.spec.ts` `o link de troca de e-mail troca o e-mail mostrado no perfil` | yes |
| C69 | `email-change.int-spec.ts` `responde 409 "Este e-mail já está em uso por outra conta." quando o e-mail novo ganhou conta`; `email-confirmation.spec.ts` `o link de troca para um e-mail em uso mostra ...` | yes |
| C70 | `email-change.int-spec.ts` `recusa com 400 "Senha atual incorreta." sem enfileirar e-mail` | yes |
| C71 | `email-change.int-spec.ts` `recusa conta sem senha pedindo para criar uma senha antes`; `profile.spec.ts` `conta sem senha vê o pedido para criar uma senha antes de trocar o e-mail` | yes |
| C72 | `email-change.int-spec.ts` `responde 410 a link vencido` / `a link usado` / `a link substituído por um pedido mais novo` | yes |
| C73 | `login.int-spec.ts` `encerra todas as sessões em sair de todos os dispositivos`; `profile.spec.ts` `"Sair de todos os dispositivos" encerra as duas sessões e leva a /entrar` | yes |
| C74 | `in-app-browser.test.ts` (quatro casos); `google-button.test.tsx` `mostra a orientação e "Copiar link" no lugar do botão no navegador interno`; `leva a /api/auth/google/start com o destino` | yes |
| C75 | `google-button.test.tsx` `copia o endereço da página e mostra "Link copiado."`; `mostra o endereço selecionado num campo quando o navegador não deixa copiar` | yes |
| C76 | `login.spec.ts` `com o user agent do WhatsApp mostra a orientação no lugar do Google e o formulário continua funcionando` | yes |
| C77 | `register.int-spec.ts` `cria uma conta só com dois cadastros simultâneos do mesmo e-mail`; `guarda o e-mail sem espaços nas pontas e em minúsculas` | yes |
| C78 | `email-verification.int-spec.ts` `responde 410 ao link de quem já confirmou por outro caminho` | yes |
| C79 | `password-change.int-spec.ts` `mantém válido o link de recuperação pendente` | yes |
| C80 | `login.int-spec.ts` `mantém duas sessões independentes em dois logins`; `sessions.int-spec.ts` `encerra todas as sessões do usuário menos a informada` | yes |
| C81 | `safe-next.test.ts` `troca por /perfil os caminhos /entrar e /cadastro` | yes |
| C82 | `env.validation.spec.ts` `aceita as variáveis da conta ausentes fora de production, com WEB_URL http://localhost:3000` | yes |
| C83 | `auth-emails.spec.ts` `confirmação tem o assunto ...`; `password-hasher.spec.ts` `verifica a senha certa`; `recusa a senha errada` | yes |
| C84 | `google-oidc.int-spec.ts` `monta a URL de autorização ...`; `troca o code com code_verifier ...`; `google-login.int-spec.ts` `start redireciona ao Google e grava o cookie g_oauth ...`; `google-signup.int-spec.ts` `vincula em vez de criar quando o e-mail ganhou conta no meio-tempo` | yes |
| C85 | `user-table.int-spec.ts` (quatro casos); `auth-tokens.int-spec.ts` `invalida o token não usado do mesmo tipo ao emitir outro`; `recusa o token vencido` | yes |
| C86 | `fake-providers.spec.ts` `o e-mail enfileirado pela API chega à caixa falsa` | yes |
| C87 | `email-change.int-spec.ts` `invalida os links de recuperação e de confirmação pendentes ao confirmar a troca` | yes - check criada depois da verificação para fechar o achado do link de recuperação; o teste falhou com 200 antes da correção e confere 410 no reset |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Nome com 80 "❤️" (U+2764 + U+FE0F) derruba o cadastro e o perfil com 500 em vez de 400 ou 200. O `@Length(1, 80)` do class-validator desconta o U+FE0F e conta 80; o Postgres conta 160 e recusa o `varchar(80)` | Exemplo próprio em `f4e2c20`: `POST /auth/register` e `PATCH /users/me` com `'❤️'.repeat(80)` respondem 500. `apps/api/src/auth/dto/register.dto.ts:23`, `apps/api/src/users/dto/update-profile.dto.ts:13`, `apps/api/src/auth/dto/google-complete.dto.ts:17` contra `apps/api/src/users/user.entity.ts:14` | Validar o nome pela mesma contagem do Postgres (code points) nos três DTOs, ou alinhar a coluna; teste que manda 80 "❤️" ao cadastro, ao perfil e ao "Complete seu cadastro" e espera 400 ou sucesso, nunca 500 | `c5b5eb6`; C6 (`cadastro` e `completar cadastro com Google` `recusa com 400 nome com 80 "❤️"...`) e C41 (`perfil` `PATCH recusa com 400 nome com 80 "❤️"...`) |
| Corpo JSON malformado devolve um trecho da senha na resposta 400, contra AUTH-08 AC 7 ("nunca ... resposta de erro") | Exemplo próprio em `f4e2c20`: `POST /auth/login` com `{"email":"ana@exemplo.com","password":Segredo-XYZ-123}` responde `{"message":"Unexpected token 'S', ...\"password\":Segredo-XY\"... is not valid JSON","error":"Bad Request","statusCode":400}`. O Nest converte o `SyntaxError` do body parser em `BadRequestException(err.message)` e `apps/api/src/observability/all-exceptions.filter.ts:48` devolve a mensagem como veio | No filtro, trocar a mensagem do 400 de corpo inválido (`SyntaxError`) por uma fixa; em `auth-secrecy.int-spec.ts`, incluir um corpo malformado com a senha entre os `badRequests` | `9ec98a6`; C54 (`sigilo da conta` `responde 400 "Corpo da requisição inválido." a JSON malformado, sem trecho do corpo`) |
| O link de recuperação pendente, enviado ao e-mail antigo, continua valendo depois de a troca de e-mail ser confirmada: quem controla o endereço antigo redefine a senha e entra. Nenhum check cobre a regra; AUTH-12 AC 2 só mantém o e-mail antigo até a confirmação | Exemplo próprio em `f4e2c20`: pedir recuperação, trocar e confirmar o e-mail, usar o link antigo: `POST /auth/password/reset` responde 200. `apps/api/src/users/email-change.service.ts:126` só troca o e-mail, sem apagar os tokens pendentes | Na confirmação da troca, apagar na mesma transação os tokens `password_reset` e `email_verification` não usados da conta; teste de integração que espera 410 no link antigo | `287a271`; C87, critério novo AUTH-12 AC 8 (`troca de e-mail` `invalida os links de recuperação e de confirmação pendentes ao confirmar a troca`) |
| C41 não prova que o nome anterior fica depois do 400 | `apps/api/test/profile.int-spec.ts:141-152`: o nome guardado só é lido depois do PATCH de 80 caracteres; `apps/web/e2e/profile.spec.ts` `recusa nome vazio mantendo o anterior` é barrado pela validação do cliente e não chama a API | Ler o nome guardado logo depois dos quatro 400 e conferir que ainda é "Ana Souza" | `a9fc76e`; C41 (o nome guardado é lido depois de cada 400) |
| C52 prova o limite de 20 por IP só no cadastro; "esqueci a senha" e reenvio de confirmação podem ter outro limite por IP sem teste falhar | `apps/api/test/password-reset.int-spec.ts:351` e `apps/api/test/email-verification.int-spec.ts:320` só testam o limite por e-mail; cada `post` usa `newIp()` (`password-reset.int-spec.ts:90`, `email-verification.int-spec.ts:83`) | Um teste do 21º pedido do mesmo IP para `/auth/password/forgot` e para `/auth/email/verification-link`, com 429 e sem e-mail enfileirado | `24066cf`; C52 (`recuperação de senha` e `confirmação de e-mail` `responde 429 no 21º pedido do mesmo IP em 1 hora`) |
| C62 não prova os links de termos na tela "Complete seu cadastro" | `apps/web/e2e/google.spec.ts:29-62` só marca a caixa `/Li e aceito/`; nenhum teste confere `href` `/termos` e `/privacidade` nessa tela | Conferir os dois links (`href` e `target`) na tela "Complete seu cadastro", como em `signup.spec.ts` | `42be894`; C62 (`google.spec.ts` confere `href` e `target` dos dois links) |
