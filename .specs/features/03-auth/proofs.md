# 03-auth proofs

**HEAD**: 7e06d99
**Tree**: clean
**Shell**: /bin/sh
**Result**: 226 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run api / ✓ cadastro > cria a conta não confirmada com a data e a versão dos termos e responde 202 com o e-mai` | pass |
| C1 | `run e2e / ✓ cadastro › cria a conta e mostra "Enviamos um e-mail para X. Abra o link para confirmar sua conta.` | pass |
| C2 | `run api / ✓ cadastro > enfileira o e-mail de confirmação na mesma transação` | pass |
| C3 | `run api / ✓ cadastro > grava o opt-in de marketing com a data quando a caixa vem marcada` | pass |
| C3 | `run api / ✓ cadastro > grava a conta sem opt-in quando a caixa vem desmarcada` | pass |
| C4 | `run api / ✓ cadastro > recusa com 400 sem a caixa de termos` | pass |
| C5 | `run api / ✓ cadastro > recusa com 400 senha de 7 ou de 129 caracteres` | pass |
| C5 | `run e2e / ✓ cadastro › mostra o erro do campo para senha com menos de 8 caracteres` | pass |
| C6 | `run api / ✓ cadastro > recusa com 400 nome vazio depois do trim ou com 81 caracteres` | pass |
| C7 | `run api / ✓ cadastro > recusa com 400 e-mail inválido` | pass |
| C8 | `run api / ✓ cadastro > responde igual para e-mail já cadastrado com outra caixa de letras, sem mudar a conta, ` | pass |
| C8 | `run api / ✓ e-mails da conta > já tem conta tem o assunto "Você já tem uma conta no Amigo Secreto" e os botões` | pass |
| C8 | `run e2e / ✓ cadastro › mostra a mesma tela para um e-mail já cadastrado` | pass |
| C9 | `run api / ✓ cadastro > não abre sessão` | pass |
| C10 | `run api / ✓ cadastro > guarda a senha como hash argon2id` | pass |
| C10 | `run api / ✓ PasswordHasher > gera hash argon2id no formato PHC com m=19456, t=2 e p=1` | pass |
| C11 | `run api / ✓ confirmação de e-mail > confirma o e-mail, abre a sessão e devolve o destino do cadastro` | pass |
| C11 | `run api / ✓ confirmação de e-mail > devolve /perfil como destino quando o cadastro não tinha origem` | pass |
| C11 | `run e2e / ✓ confirmação de e-mail › o link do e-mail confirma, abre a sessão e leva ao perfil` | pass |
| C12 | `run api / ✓ confirmação de e-mail > emite user.email_verified` | pass |
| C12 | `run api / ✓ recuperação de senha > emite user.email_verified quando a conta não tinha o e-mail confirmado` | pass |
| C13 | `run api / ✓ confirmação de e-mail > responde 410 a link vencido` | pass |
| C13 | `run api / ✓ confirmação de e-mail > responde 410 a link usado` | pass |
| C13 | `run api / ✓ confirmação de e-mail > responde 410 a link substituído por um reenvio` | pass |
| C13 | `run e2e / ✓ confirmação de e-mail › o link aberto de novo mostra "Este link expirou ou já foi usado."` | pass |
| C13 | `run e2e / ✓ confirmação de e-mail › o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar` | pass |
| C14 | `run e2e / ✓ faixa de confirmação › aparece para quem entrou sem confirmar com "Confirme seu e-mail: enviamos u` | pass |
| C14 | `run e2e / ✓ faixa de confirmação › some depois da confirmação` | pass |
| C15 | `run api / ✓ confirmação de e-mail > reenvio invalida o link anterior e enfileira um novo` | pass |
| C15 | `run api / ✓ confirmação de e-mail > reenvio exige sessão` | pass |
| C15 | `run e2e / ✓ faixa de confirmação › "Reenviar e-mail" mostra "Enviamos um novo link para X."` | pass |
| C16 | `run api / ✓ AuthTokensService > guarda só o SHA-256 do token` | pass |
| C16 | `run api / ✓ AuthTokensService > consome o token uma vez só` | pass |
| C16 | `run api / ✓ AuthTokensService > consome o mesmo token uma vez só com duas transações simultâneas` | pass |
| C16 | `run api / ✓ AuthTokensService > recusa o token de outro tipo` | pass |
| C17 | `run api / ✓ login e logout > abre a sessão com a senha certa e devolve o usuário` | pass |
| C17 | `run api / ✓ SessionsService > abre a sessão com o cookie sid HttpOnly, SameSite=Lax, Path=/ e Max-Age de 30 di` | pass |
| C17 | `run api / ✓ SessionsService > marca o cookie Secure em production` | pass |
| C17 | `run e2e / ✓ login › entra com a senha certa e cai em /perfil` | pass |
| C18 | `run api / ✓ login e logout > responde 401 "E-mail ou senha incorretos." a e-mail sem conta` | pass |
| C18 | `run api / ✓ login e logout > responde 401 "E-mail ou senha incorretos." a senha errada` | pass |
| C18 | `run api / ✓ login e logout > responde 401 "E-mail ou senha incorretos." a conta só Google` | pass |
| C18 | `run api / ✓ PasswordHasher > verifica contra o hash fixo e devolve false quando não há hash guardado` | pass |
| C18 | `run e2e / ✓ login › mostra "E-mail ou senha incorretos." com a senha errada` | pass |
| C19 | `run api / ✓ SessionsService > ignora a sessão com expiresAt no passado` | pass |
| C19 | `run api / ✓ SessionsService > grava o uso e renova expiresAt para 30 dias quando o último uso tem mais de 1 ho` | pass |
| C19 | `run api / ✓ SessionsService > não grava o uso quando o último uso tem menos de 1 hora` | pass |
| C20 | `run api / ✓ login e logout > encerra a sessão e apaga o cookie no logout` | pass |
| C20 | `run e2e / ✓ cabeçalho › "Sair" encerra a sessão e leva a /entrar` | pass |
| C21 | `run api / ✓ guard de sessão > responde 401 com o cookie de uma sessão encerrada, vencida ou desconhecida` | pass |
| C22 | `run api / ✓ SessionsService > guarda só o SHA-256 do token` | pass |
| C23 | `run e2e / ✓ login › leva a pessoa logada que abre /entrar direto ao destino` | pass |
| C23 | `run e2e / ✓ cadastro › leva a pessoa logada que abre /cadastro direto ao destino` | pass |
| C24 | `run api / ✓ login com Google > abre a sessão da conta já vinculada e leva ao destino` | pass |
| C25 | `run api / ✓ login com Google > leva e-mail verificado sem conta a /completar-cadastro com o cookie g_signup` | pass |
| C25 | `run api / ✓ completar cadastro com Google > GET /auth/google/signup devolve o nome e o e-mail do Google` | pass |
| C25 | `run e2e / ✓ login com Google › e-mail novo passa por "Complete seu cadastro" com o nome do Google e entra` | pass |
| C26 | `run api / ✓ completar cadastro com Google > cria a conta confirmada, vinculada e com a foto do Google, abre a ` | pass |
| C26 | `run api / ✓ completar cadastro com Google > recusa com 400 sem a caixa de termos` | pass |
| C26 | `run api / ✓ completar cadastro com Google > grava o opt-in de marketing quando a caixa vem marcada` | pass |
| C26 | `run api / ✓ completar cadastro com Google > responde 401 sem o cookie g_signup, com ele vencido ou adulterado` | pass |
| C27 | `run api / ✓ login com Google > vincula a conta com senha de e-mail verificado, confirma o e-mail, abre a sessã` | pass |
| C27 | `run api / ✓ e-mails da conta > Google vinculado tem o assunto "Conta Google vinculada ao Amigo Secreto"` | pass |
| C27 | `run api / ✓ login com Google > recusa o e-mail de conta vinculada a outro Google com erro=google sem trocar o ` | pass |
| C28 | `run api / ✓ login com Google > recusa e-mail não verificado com erro=google_nao_verificado sem criar, vincular` | pass |
| C28 | `run e2e / ✓ login com Google › e-mail não verificado volta a /entrar com "Não foi possível entrar com Google. ` | pass |
| C29 | `run api / ✓ login com Google > volta a /entrar com erro=google quando o state difere do cookie` | pass |
| C29 | `run api / ✓ login com Google > volta a /entrar com erro=google quando a pessoa cancela no Google` | pass |
| C29 | `run api / ✓ login com Google > volta a /entrar com erro=google quando o Google recusa o code` | pass |
| C29 | `run api / ✓ GoogleOidcClient > recusa id_token com aud de outro cliente` | pass |
| C29 | `run api / ✓ GoogleOidcClient > recusa id_token com iss fora do Google` | pass |
| C29 | `run api / ✓ GoogleOidcClient > recusa id_token vencido` | pass |
| C29 | `run api / ✓ GoogleOidcClient > falha em 10 segundos quando o Google não responde` | pass |
| C29 | `run e2e / ✓ login com Google › cancelar no Google volta a /entrar com "Não foi possível entrar com Google. Ten` | pass |
| C29 | `run e2e / ✓ login com Google › abrir /completar-cadastro sem passar pelo Google volta a /entrar com "Não foi p` | pass |
| C30 | `run api / ✓ login com Google > atualiza a foto da conta vinculada a cada login` | pass |
| C31 | `run api / ✓ login com Google > GET /auth/session informa googleEnabled false sem GOOGLE_CLIENT_ID fora de prod` | pass |
| C31 | `run api / ✓ login com Google > start responde 404 sem Google configurado` | pass |
| C31 | `run web / ✓ GoogleButton > não aparece com googleEnabled false` | pass |
| C32 | `run api / ✓ validateEnvironment > lança erro que nomeia GOOGLE_CLIENT_ID quando ela falta em production` | pass |
| C32 | `run api / ✓ validateEnvironment > lança erro que nomeia GOOGLE_CLIENT_SECRET quando ela falta em production` | pass |
| C33 | `run api / ✓ recuperação de senha > responde 202 igual com e sem conta` | pass |
| C33 | `run e2e / ✓ recuperação de senha › mostra "Se houver uma conta com X, enviamos um link para redefinir a senha.` | pass |
| C34 | `run api / ✓ recuperação de senha > enfileira o e-mail com link de 1 hora e invalida o anterior` | pass |
| C34 | `run api / ✓ e-mails da conta > recuperação tem o assunto "Redefina sua senha do Amigo Secreto" e o botão "Rede` | pass |
| C34 | `run api / ✓ AuthTokensService > vence em 7 dias a confirmação, em 1 hora a recuperação e em 7 dias a troca de ` | pass |
| C35 | `run api / ✓ recuperação de senha > não enfileira e-mail para e-mail sem conta` | pass |
| C36 | `run api / ✓ recuperação de senha > troca a senha, confirma o e-mail, encerra todas as sessões e abre uma nova` | pass |
| C36 | `run api / ✓ recuperação de senha > enfileira o aviso de senha alterada` | pass |
| C36 | `run api / ✓ recuperação de senha > recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres` | pass |
| C36 | `run e2e / ✓ recuperação de senha › o link troca a senha e entra` | pass |
| C37 | `run api / ✓ recuperação de senha > responde 410 a link com mais de 1 hora` | pass |
| C37 | `run api / ✓ recuperação de senha > responde 410 a link usado` | pass |
| C37 | `run api / ✓ recuperação de senha > responde 410 a link substituído por um pedido mais novo` | pass |
| C37 | `run e2e / ✓ recuperação de senha › o link usado mostra "Este link expirou ou já foi usado." com o caminho para` | pass |
| C38 | `run api / ✓ recuperação de senha > cria a senha de uma conta só Google, que passa a entrar com e-mail e senha` | pass |
| C39 | `run api / ✓ perfil > GET /users/me devolve nome, e-mail, foto e opt-in` | pass |
| C39 | `run e2e / ✓ perfil › mostra nome, e-mail, iniciais e o opt-in` | pass |
| C40 | `run api / ✓ perfil > PATCH grava o nome sem os espaços das pontas` | pass |
| C40 | `run e2e / ✓ perfil › salvar o nome muda o menu do avatar` | pass |
| C41 | `run api / ✓ perfil > PATCH recusa com 400 nome vazio ou com 81 caracteres e mantém o anterior` | pass |
| C41 | `run e2e / ✓ perfil › recusa nome vazio mantendo o anterior` | pass |
| C42 | `run api / ✓ perfil > PATCH grava o opt-in com a data da mudança` | pass |
| C42 | `run e2e / ✓ perfil › desligar o marketing grava o estado` | pass |
| C43 | `run e2e / ✓ cabeçalho › com sessão mostra o avatar com as iniciais e o menu com "Perfil" e "Sair"` | pass |
| C43 | `run e2e / ✓ cabeçalho › mostra a foto do Google no avatar de conta Google` | pass |
| C44 | `run api / ✓ troca de senha > troca a senha, mantém a sessão atual e encerra as outras` | pass |
| C44 | `run api / ✓ troca de senha > enfileira o aviso de senha alterada` | pass |
| C44 | `run api / ✓ e-mails da conta > senha alterada tem o assunto "Sua senha do Amigo Secreto foi alterada"` | pass |
| C44 | `run e2e / ✓ perfil › troca a senha e continua logado` | pass |
| C45 | `run api / ✓ troca de senha > recusa com 400 "Senha atual incorreta." sem mudar nada` | pass |
| C45 | `run e2e / ✓ perfil › mostra "Senha atual incorreta." com a senha atual errada` | pass |
| C46 | `run api / ✓ troca de senha > cria a senha de conta só Google sem pedir a atual` | pass |
| C46 | `run e2e / ✓ perfil › conta Google cria a senha sem pedir a atual` | pass |
| C47 | `run api / ✓ troca de senha > recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres` | pass |
| C48 | `run api / ✓ guard de sessão > entrega o usuário da sessão à rota por @CurrentUser` | pass |
| C48 | `run api / ✓ guard de sessão > deixa passar a rota com @Public sem sessão` | pass |
| C48 | `run api / ✓ guard de sessão > mantém GET /health público` | pass |
| C49 | `run api / ✓ guard de sessão > responde 401 numa rota protegida sem cookie` | pass |
| C50 | `run api / ✓ proteção CSRF > responde 403 a POST sem X-CSRF-Token` | pass |
| C50 | `run api / ✓ proteção CSRF > responde 403 quando o cabeçalho difere do cookie` | pass |
| C50 | `run api / ✓ proteção CSRF > responde 403 a token emitido para outra sessão` | pass |
| C50 | `run api / ✓ proteção CSRF > aceita POST com o token da sessão atual` | pass |
| C50 | `run api / ✓ proteção CSRF > exige o token em PUT, PATCH e DELETE` | pass |
| C50 | `run api / ✓ proteção CSRF > não exige o token em GET` | pass |
| C50 | `run api / ✓ GET /auth/session > grava o cookie csrf legível pelo site` | pass |
| C50 | `run api / ✓ login e logout > troca o token CSRF ao abrir e ao encerrar a sessão` | pass |
| C50 | `run web / ✓ apiFetch > manda X-CSRF-Token com o valor do cookie csrf` | pass |
| C50 | `run web / ✓ apiFetch > busca /api/auth/session antes quando falta o cookie csrf` | pass |
| C50 | `run web / ✓ apiFetch > busca um token novo e repete uma vez quando recebe 403` | pass |
| C51 | `run api / ✓ login e logout > responde 429 na 11ª tentativa do mesmo e-mail em 15 minutos sem verificar a senha` | pass |
| C51 | `run api / ✓ login e logout > responde 429 na 31ª tentativa do mesmo IP em 15 minutos` | pass |
| C51 | `run api / ✓ login e logout > conta as tentativas pelo IP do X-Forwarded-For com TRUST_PROXY_HOPS 1` | pass |
| C51 | `run api / ✓ RateLimitService > lança 429 com "Muitas tentativas. Tente de novo em N minutos." quando uma regra` | pass |
| C51 | `run e2e / ✓ login › mostra "Muitas tentativas. Tente de novo em 15 minutos." na 11ª tentativa` | pass |
| C52 | `run api / ✓ cadastro > responde 429 no 6º cadastro do mesmo e-mail em 1 hora sem enfileirar e-mail` | pass |
| C52 | `run api / ✓ cadastro > responde 429 no 21º cadastro do mesmo IP em 1 hora` | pass |
| C52 | `run api / ✓ recuperação de senha > responde 429 no 6º pedido do mesmo e-mail em 1 hora sem enfileirar e-mail` | pass |
| C52 | `run api / ✓ confirmação de e-mail > responde 429 no 6º reenvio em 1 hora` | pass |
| C53 | `run api / ✓ RateLimitService > soma as tentativas de duas conexões ao mesmo tempo sem perder nenhuma` | pass |
| C53 | `run api / ✓ RateLimitService > permite até o limite e recusa a tentativa seguinte na mesma janela` | pass |
| C53 | `run api / ✓ RateLimitService > reinicia a contagem quando a janela vence` | pass |
| C53 | `run api / ✓ RateLimitService > devolve o tempo que falta para a janela vencer` | pass |
| C53 | `run api / ✓ RateLimitService > guarda o e-mail só como SHA-256 na chave` | pass |
| C53 | `run api / ✓ validateEnvironment > lança erro que nomeia TRUST_PROXY_HOPS quando ela falta em production` | pass |
| C54 | `run api / ✓ sigilo da conta > não escreve senha, token de sessão, token de link nem cookie no log` | pass |
| C54 | `run api / ✓ sigilo da conta > não manda senha, token nem cookie ao Sentry num erro 500` | pass |
| C54 | `run api / ✓ sigilo da conta > não devolve senha nem token nas respostas de erro 400` | pass |
| C54 | `run api / ✓ validateEnvironment > lança erro que nomeia AUTH_SECRET quando ela falta em production` | pass |
| C55 | `run api / ✓ sigilo da conta > não devolve hash de senha nem de token nas respostas da conta` | pass |
| C55 | `run api / ✓ GET /auth/session > devolve o usuário da sessão sem hash de senha nem de token` | pass |
| C55 | `run api / ✓ GET /auth/session > devolve user null sem sessão` | pass |
| C56 | `run web / ✓ requireUser > redireciona a /entrar com o caminho como next quando não há usuário` | pass |
| C56 | `run web / ✓ getCurrentUser > repassa o cookie da requisição a API_INTERNAL_URL/auth/session sem cache` | pass |
| C56 | `run web / ✓ getCurrentUser > devolve null sem sessão` | pass |
| C56 | `run e2e / ✓ perfil › sem sessão leva a /entrar e volta a /perfil depois do login` | pass |
| C56 | `run e2e / ✓ login › volta à página de origem depois do login` | pass |
| C57 | `run web / ✓ safeNext > aceita um caminho do próprio site com query` | pass |
| C57 | `run web / ✓ safeNext > troca por /perfil um caminho que começa com //` | pass |
| C57 | `run web / ✓ safeNext > troca por /perfil um caminho que começa com /\` | pass |
| C57 | `run web / ✓ safeNext > troca por /perfil um endereço com esquema` | pass |
| C57 | `run web / ✓ safeNext > troca por /perfil um valor ausente` | pass |
| C57 | `run api / ✓ login com Google > troca por /perfil um destino de outro site` | pass |
| C57 | `run api / ✓ cadastro > troca por /perfil um destino de outro site` | pass |
| C58 | `run e2e / ✓ cabeçalho › sem sessão mostra "Entrar", que leva a /entrar` | pass |
| C59 | `run e2e / ✓ cabeçalho › com sessão mostra o avatar com as iniciais e o menu com "Perfil" e "Sair"` | pass |
| C60 | `run web / ✓ apiFetch > leva a /entrar com o caminho atual quando recebe 401` | pass |
| C61 | `run e2e / ✓ termos › /termos mostra o título, a versão vigente e o texto provisório` | pass |
| C61 | `run e2e / ✓ termos › /privacidade mostra o título, a versão vigente e o texto provisório` | pass |
| C62 | `run e2e / ✓ cadastro › a caixa de termos tem links para /termos e /privacidade` | pass |
| C62 | `run e2e / ✓ login com Google › e-mail novo passa por "Complete seu cadastro" com o nome do Google e entra` | pass |
| C63 | `run api / ✓ cadastro > emite user.registered com method password e o id, sem e-mail nem nome` | pass |
| C64 | `run api / ✓ completar cadastro com Google > emite user.registered com method google e o id, sem e-mail nem nom` | pass |
| C65 | `run api / ✓ cadastro > emite user.registered com method password e o id, sem e-mail nem nome` | pass |
| C65 | `run api / ✓ completar cadastro com Google > emite user.registered com method google e o id, sem e-mail nem nom` | pass |
| C66 | `run api / ✓ troca de e-mail > enfileira o link para o e-mail novo e o aviso para o atual e responde com o e-ma` | pass |
| C66 | `run api / ✓ e-mails da conta > novo e-mail tem o assunto "Confirme seu novo e-mail no Amigo Secreto" e o botão` | pass |
| C66 | `run api / ✓ e-mails da conta > e-mail antigo tem o assunto "Pedido de troca de e-mail no Amigo Secreto"` | pass |
| C66 | `run e2e / ✓ perfil › pedir a troca de e-mail mostra "Enviamos um link para X."` | pass |
| C67 | `run api / ✓ troca de e-mail > mantém o e-mail atual para login até a confirmação` | pass |
| C68 | `run api / ✓ troca de e-mail > troca o e-mail pelo novo, já confirmado, ao confirmar o link` | pass |
| C68 | `run e2e / ✓ confirmação de e-mail › o link de troca de e-mail troca o e-mail mostrado no perfil` | pass |
| C69 | `run api / ✓ troca de e-mail > responde 409 "Este e-mail já está em uso por outra conta." quando o e-mail novo ` | pass |
| C69 | `run e2e / ✓ confirmação de e-mail › o link de troca para um e-mail em uso mostra "Este e-mail já está em uso p` | pass |
| C70 | `run api / ✓ troca de e-mail > recusa com 400 "Senha atual incorreta." sem enfileirar e-mail` | pass |
| C71 | `run api / ✓ troca de e-mail > recusa conta sem senha pedindo para criar uma senha antes` | pass |
| C71 | `run e2e / ✓ perfil › conta sem senha vê o pedido para criar uma senha antes de trocar o e-mail` | pass |
| C72 | `run api / ✓ troca de e-mail > responde 410 a link vencido` | pass |
| C72 | `run api / ✓ troca de e-mail > responde 410 a link usado` | pass |
| C72 | `run api / ✓ troca de e-mail > responde 410 a link substituído por um pedido mais novo` | pass |
| C73 | `run api / ✓ login e logout > encerra todas as sessões em sair de todos os dispositivos` | pass |
| C73 | `run e2e / ✓ perfil › "Sair de todos os dispositivos" encerra as duas sessões e leva a /entrar` | pass |
| C74 | `run web / ✓ isInAppBrowser > reconhece o navegador do WhatsApp` | pass |
| C74 | `run web / ✓ isInAppBrowser > reconhece o navegador do Instagram` | pass |
| C74 | `run web / ✓ isInAppBrowser > reconhece o navegador do Facebook pelo FBAN e pelo FBAV` | pass |
| C74 | `run web / ✓ isInAppBrowser > não reconhece o Chrome nem o Safari do celular` | pass |
| C74 | `run web / ✓ GoogleButton > mostra a orientação e "Copiar link" no lugar do botão no navegador interno` | pass |
| C74 | `run web / ✓ GoogleButton > leva a /api/auth/google/start com o destino` | pass |
| C75 | `run web / ✓ GoogleButton > copia o endereço da página e mostra "Link copiado."` | pass |
| C75 | `run web / ✓ GoogleButton > mostra o endereço selecionado num campo quando o navegador não deixa copiar` | pass |
| C76 | `run e2e / ✓ login › com o user agent do WhatsApp mostra a orientação no lugar do Google e o formulário continu` | pass |
| C77 | `run api / ✓ cadastro > cria uma conta só com dois cadastros simultâneos do mesmo e-mail` | pass |
| C77 | `run api / ✓ cadastro > guarda o e-mail sem espaços nas pontas e em minúsculas` | pass |
| C78 | `run api / ✓ confirmação de e-mail > responde 410 ao link de quem já confirmou por outro caminho` | pass |
| C79 | `run api / ✓ troca de senha > mantém válido o link de recuperação pendente` | pass |
| C80 | `run api / ✓ login e logout > mantém duas sessões independentes em dois logins` | pass |
| C80 | `run api / ✓ SessionsService > encerra todas as sessões do usuário menos a informada` | pass |
| C81 | `run web / ✓ safeNext > troca por /perfil os caminhos /entrar e /cadastro` | pass |
| C82 | `run api / ✓ validateEnvironment > aceita as variáveis da conta ausentes fora de production, com WEB_URL http:/` | pass |
| C83 | `run api / ✓ e-mails da conta > confirmação tem o assunto "Confirme seu e-mail no Amigo Secreto" e o botão "Con` | pass |
| C83 | `run api / ✓ PasswordHasher > verifica a senha certa` | pass |
| C83 | `run api / ✓ PasswordHasher > recusa a senha errada` | pass |
| C84 | `run api / ✓ GoogleOidcClient > monta a URL de autorização com client_id, redirect_uri, scope openid email prof` | pass |
| C84 | `run api / ✓ GoogleOidcClient > troca o code com code_verifier e client secret e devolve sub, e-mail, email_ver` | pass |
| C84 | `run api / ✓ login com Google > start redireciona ao Google e grava o cookie g_oauth com state, verifier e dest` | pass |
| C84 | `run api / ✓ completar cadastro com Google > vincula em vez de criar quando o e-mail ganhou conta no meio-tempo` | pass |
| C85 | `run api / ✓ tabela user > é criada pela migration com as colunas da conta` | pass |
| C85 | `run api / ✓ tabela user > recusa dois e-mails iguais` | pass |
| C85 | `run api / ✓ tabela user > recusa dois googleId iguais` | pass |
| C85 | `run api / ✓ tabela user > é removida ao reverter a migration` | pass |
| C85 | `run api / ✓ AuthTokensService > invalida o token não usado do mesmo tipo ao emitir outro` | pass |
| C85 | `run api / ✓ AuthTokensService > recusa o token vencido` | pass |
| C86 | `run e2e / ✓ provedores falsos › o e-mail enfileirado pela API chega à caixa falsa` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run api` - exit 0

```
@amigo-secreto/api:test:  ✓  integration-dist  test/email-test-command.int-spec.ts > email:test > compila a API antes de enfileirar num clone sem dist 1343ms
@amigo-secreto/api:test: (node:43901) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
@amigo-secreto/api:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > cria a tabela de controle de migrations num banco vazio 1163ms
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > roda num clone sem build, sem a pasta dist 1150ms
@amigo-secreto/api:test: 
@amigo-secreto/api:test:  Test Files  45 passed (45)
@amigo-secreto/api:test:       Tests  268 passed (268)
@amigo-secreto/api:test:    Start at  13:28:21
@amigo-secreto/api:test:    Duration  37.73s (tests 73%, import 25%, transform 1%)
@amigo-secreto/api:test: 

 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
  Time:    40.571s
```

`Run e2e` - exit 0

```
@amigo-secreto/web:test:e2e:   ✓  55 [chromium] › e2e/theme.spec.ts:238:3 › tema › aplica os tokens do design system no tema claro (156ms)
@amigo-secreto/web:test:e2e:   ✓  53 [chromium] › e2e/profile.spec.ts:277:3 › perfil › "Sair de todos os dispositivos" encerra as duas sessões e leva a /entrar (389ms)
@amigo-secreto/web:test:e2e:   ✓  56 [chromium] › e2e/theme.spec.ts:245:3 › tema › aplica os tokens do design system no tema escuro (145ms)
@amigo-secreto/web:test:e2e:   ✓  29 [chromium] › e2e/password-reset.spec.ts:64:5 › recuperação de senha › o link troca a senha e entra (8.6s)
@amigo-secreto/web:test:e2e:   ✓  18 [chromium] › e2e/email-confirmation.spec.ts:56:3 › confirmação de e-mail › o link aberto de novo mostra "Este link expirou ou já foi usado." (10.0s)
@amigo-secreto/web:test:e2e:   ✓  58 [chromium] › e2e/email-confirmation.spec.ts:76:3 › confirmação de e-mail › o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar (10.0s)
@amigo-secreto/web:test:e2e:   ✓  57 [chromium] › e2e/password-reset.spec.ts:80:5 › recuperação de senha › o link usado mostra "Este link expirou ou já foi usado." com o caminho para /esqueci-a-senha (10.3s)
@amigo-secreto/web:test:e2e:   ✓  59 [chromium] › e2e/email-confirmation.spec.ts:99:3 › confirmação de e-mail › o link de troca de e-mail troca o e-mail mostrado no perfil (10.0s)
@amigo-secreto/web:test:e2e:   ✓  60 [chromium] › e2e/email-confirmation.spec.ts:121:3 › confirmação de e-mail › o link de troca para um e-mail em uso mostra "Este e-mail já está em uso por outra conta." (10.0s)
@amigo-secreto/web:test:e2e: 
@amigo-secreto/web:test:e2e:   60 passed (47.3s)

 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
  Time:    1m0.44s
```

`Run web` - exit 0

```
@amigo-secreto/web:test:  ✓ src/lib/api-status.test.ts > getApiStatus > devolve unavailable quando a API responde 200 sem status ok 6ms
@amigo-secreto/web:test:  ✓ src/lib/api-status.test.ts > getApiStatus > lança erro que nomeia API_INTERNAL_URL quando ela falta 1ms
@amigo-secreto/web:test: 
@amigo-secreto/web:test:  Test Files  12 passed (12)
@amigo-secreto/web:test:       Tests  39 passed (39)
@amigo-secreto/web:test:    Start at  13:30:01
@amigo-secreto/web:test:    Duration  5.62s (tests 45%, environment 31%, setup 15%, import 7%, transform 2%, worker 1%)
@amigo-secreto/web:test: 
@amigo-secreto/web:test:     Isolate  12 workers spawned · ~426ms startup each (spawn + environment, per file)
@amigo-secreto/web:test:              at least ~304ms faster with isolate: false — reuses workers across files instead of one per file
@amigo-secreto/web:test: 

 Tasks:    2 successful, 2 total
Cached:    0 cached, 2 total
  Time:    6.349s
```
