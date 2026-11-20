# auth Context

**Gathered:** 2026-11-19
**Spec:** `.specs/features/03-auth/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Cadastro, login com e-mail e senha, login com Google, confirmação de e-mail, recuperação de senha, sessão em cookie, CSRF, aceite de termos e opt-in de marketing, edição de perfil e rate limit das rotas da conta (AD-001, linha 3). Exclusão de conta é da `11-account-deletion`; as páginas de termos, privacidade e cookies são da `12-public-pages`.

---

## Implementation Decisions

### Sessão

- Sessão guardada no banco: o cookie httpOnly leva um token aleatório e a tabela de sessões guarda só o hash dele. Logout e troca de senha derrubam a sessão na hora. Não usa JWT, ao contrário da sugestão do `scope.md` 7.2 (registrado como AD-011). Pergunta em 2026-11-19: "Como a sessão do usuário deve funcionar?", resposta "Sessão no banco (Recomendado)", entre "Sessão no banco" e "JWT access + refresh".

### Confirmação de e-mail

- Quem cadastrou com e-mail e senha e ainda não confirmou entra e usa o app normalmente; um aviso pede a confirmação e permite reenviar o link. Features futuras podem bloquear ações específicas para contas não confirmadas. Pergunta em 2026-11-19: "Quem cadastrou com e-mail e senha e ainda não confirmou o e-mail pode usar o app?", resposta "Usa, com aviso (Recomendado)", entre "Usa, com aviso" e "Bloqueia até confirmar".

### Login com Google

- Se o Google informa o e-mail como verificado e já existe conta com esse e-mail, a conta Google é vinculada à existente e o e-mail passa a confirmado; a pessoa entra dos dois jeitos. Pergunta em 2026-11-19: "Se alguém entra com Google usando um e-mail que já tem conta com senha, o que acontece?", resposta "Vincula automático (Recomendado)", entre "Vincula automático" e "Recusa com mensagem".

### Hash de senha

- argon2id pelo `crypto.argon2` nativo do Node 26, sem dependência nova (conferido em 2026-11-19: `crypto.argon2Sync('argon2id', ...)` roda no Node v26.13.1 sem aviso de experimental). Pergunta em 2026-11-19: "Qual algoritmo de hash de senha usar?", resposta "argon2id nativo (Recomendado)", entre "argon2id nativo" e "bcrypt".

### Perfil

- O perfil edita o nome. A foto é a do Google quando a conta tem Google; sem Google, o app mostra as iniciais. Upload de foto fica para o Pós-MVP, junto do Cloudinary. Pergunta em 2026-11-19: "O que o perfil permite editar no MVP?", resposta "Nome e avatar do Google (Recomendado)", entre "Nome e avatar do Google", "Nome e URL de foto" e "Só o nome".
- O perfil também permite: trocar a senha (pede a atual; conta só Google cria uma senha; derruba as outras sessões), ligar e desligar o opt-in de marketing, trocar o e-mail (o novo só vale depois de confirmado por link) e sair de todos os dispositivos. Pergunta em 2026-11-19: "Além do nome (e da foto), o que mais o perfil permite mudar no MVP?", resposta "Trocar senha (Recomendado), Opt-in de marketing (Recomendado), Trocar e-mail, Sair de todos os dispositivos" (seleção múltipla; troca de e-mail e sair de todos os dispositivos não estavam no `scope.md`).

### Duração da sessão e dos links

- A sessão expira depois de 30 dias sem uso; cada uso renova o prazo. Não há caixa "lembrar de mim". Pergunta em 2026-11-19: "Quanto tempo a pessoa fica logada?", resposta "30 dias, renovando (Recomendado)", entre "30 dias, renovando", "Caixa 'lembrar de mim'" e "7 dias, renovando".
- O link de confirmação de e-mail vale 7 dias; o de recuperação de senha, 1 hora. Os dois são de uso único, e um link novo do mesmo tipo invalida o anterior. Pergunta em 2026-11-19: "Por quanto tempo valem os links enviados por e-mail?", resposta "Confirmação 7 dias, senha 1 hora (Recomendado)", entre essa, "Confirmação 24h, senha 1 hora" e "Confirmação 24h, senha 30 min".

### Senha e enumeração de contas

- Senha com 8 a 128 caracteres, sem regra de composição, no cadastro, na troca e na recuperação. Pergunta em 2026-11-19: "Qual a regra de senha no cadastro, na troca e na recuperação?", resposta "8 a 128 caracteres (Recomendado)", entre essa, "8+ com letra e número" e "12 a 128 caracteres".
- Nenhuma resposta revela se um e-mail tem conta. Cadastro com e-mail já existente e "esqueci a senha" respondem sempre "Enviamos um e-mail para X"; no cadastro repetido, o dono do e-mail recebe um aviso de que já tem conta, com caminho para entrar ou recuperar a senha. Pergunta em 2026-11-19: "Cadastro com e-mail já existente e 'esqueci a senha' com e-mail desconhecido: a resposta revela se o e-mail tem conta?", resposta "Não revela (Recomendado)", entre "Não revela" e "Revela".

### Termos, idade e marketing

- Uma caixa obrigatória cobre termos, privacidade e idade: "Li e aceito os Termos de uso e a Política de privacidade, e tenho 18 anos ou autorização dos meus responsáveis". Uma segunda caixa, opcional e desmarcada, dá o opt-in de marketing. A conta grava a data e a versão dos termos aceitos. Vale também para o primeiro login com Google. Pergunta em 2026-11-19: "Como o aceite dos termos e a idade (RN13) aparecem no cadastro?", resposta "Uma caixa com os dois (Recomendado)", entre essa, "Duas caixas obrigatórias" e "Texto sem caixa".
- A `auth` cria `/termos` e `/privacidade` com um texto provisório curto; a `12-public-pages` substitui o conteúdo. Pergunta em 2026-11-19: "O que os links do cadastro abrem até lá?", resposta "Páginas provisórias (Recomendado)", entre essa, "Links para rotas futuras" e "Antecipar as páginas reais".

### Fluxo depois de cadastrar e de entrar

- Depois de enviar o cadastro, a tela sempre mostra "Enviamos um e-mail para X", para e-mail novo ou repetido; a conta nova não entra logada. O link de confirmação já abre a sessão; quem não quiser esperar entra com e-mail e senha, sem confirmar, e vê o aviso. Pergunta em 2026-11-19: "O que acontece depois de enviar o cadastro?", resposta "Tela 'confira seu e-mail' (Recomendado)", entre essa e "Conta nova entra logada".
- Depois de entrar (login, Google ou link de confirmação), a pessoa volta à página de origem: rotas protegidas mandam para o login com o caminho de volta, e só caminhos do próprio site são aceitos. Sem origem, vai para o perfil, até a `04-groups` trocar por "Meus grupos". Pergunta em 2026-11-19: "Depois de entrar, para onde a pessoa vai?", resposta "Volta à página de origem (Recomendado)", entre essa e "Sempre a home".
- Rotas em português: `/entrar`, `/cadastro`, `/esqueci-a-senha`, `/redefinir-senha`, `/confirmar-email`, `/perfil`. Pergunta em 2026-11-19: "Quais endereços as telas da conta usam?", resposta "Em português (Recomendado)", entre "Em português" e "Em inglês".

### Navegador interno

- No navegador interno de apps (WhatsApp, Instagram, Facebook), o botão do Google dá lugar à orientação "Abra no navegador para entrar com Google", com um botão de copiar o link; e-mail e senha seguem funcionando. Pergunta em 2026-11-19: "O Google pode falhar no navegador interno do WhatsApp. Entra na auth?", resposta "Sim, orientar (Recomendado)", entre essa, "Não, só mostrar o erro" e "Fica para a feature 5".

### Rate limit

- Login: 10 tentativas por e-mail e 30 por IP a cada 15 minutos. Cadastro, "esqueci a senha" e reenvio de confirmação: 5 por e-mail e 20 por IP por hora. Acima do limite, a rota responde 429 com "Muitas tentativas, tente de novo em N minutos"; nenhuma conta é bloqueada. Pergunta em 2026-11-19: "Quais limites de tentativas usar nas rotas da conta?", resposta "Moderado (Recomendado)", entre "Moderado", "Rigoroso" e "Folgado".

### Troca de e-mail e avisos de segurança

- A troca de e-mail pede a senha atual (conta só Google cria uma senha antes). O novo e-mail recebe o link de confirmação, válido por 7 dias; o antigo continua valendo até a confirmação e recebe um aviso da troca. Pergunta em 2026-11-19: "O que a troca de e-mail exige?", resposta "Senha + aviso ao antigo (Recomendado)", entre essa e "Só o link no novo".
- Avisos de segurança por e-mail, além de confirmação, recuperação e "você já tem conta": senha alterada (troca no perfil ou recuperação), e-mail alterado (para o e-mail antigo) e Google vinculado a uma conta com senha. Pergunta em 2026-11-19: "Quais avisos de segurança por e-mail entram?", resposta "Senha alterada (Recomendado), E-mail alterado (Recomendado), Google vinculado" (seleção múltipla).

### Cabeçalho

- Deslogado: botão "Entrar". Logado: avatar (foto do Google ou iniciais) que abre um menu com "Perfil" e "Sair". O aviso de e-mail não confirmado aparece como faixa abaixo do cabeçalho. Pergunta em 2026-11-19: "O que o cabeçalho mostra?", resposta "Entrar / menu do avatar (Recomendado)", entre essa e "Entrar / nome + Sair".

### Recuperação de senha

- Ao redefinir a senha pelo link, o e-mail passa a confirmado, todas as sessões abertas são encerradas e uma nova é aberta. Conta só Google usa o mesmo fluxo para criar senha. Pergunta em 2026-11-19: "O que acontece quando a pessoa redefine a senha pelo link de recuperação?", resposta "Confirma, derruba e entra (Recomendado)", entre essa e "Derruba e manda para o login".

### Eventos de negócio

- A `auth` emite `user.registered` (com o método: senha ou Google) e `user.email_verified`, no formato do AD-005. Não emite evento de login. Pergunta em 2026-11-19: "Quais eventos de negócio a auth emite?", resposta "user.registered (Recomendado), user.email_verified (Recomendado)" (seleção múltipla, entre essas, "user.logged_in" e "Nenhum").

### Arquitetura (Design)

- Login com Google por OIDC manual, sem biblioteca: authorization code com `state` e PKCE, troca do code por `fetch` no endpoint de token do Google e leitura do ID token recebido direto do Google, sem validar a assinatura (a documentação do Google dispensa a validação quando o token vem do endpoint de token por HTTPS autenticado com o client secret). Pergunta em 2026-11-19: "Como integrar o login com Google na API?", resposta "OIDC manual, sem lib (Recomendado)", entre essa, "openid-client (panva)" e "Passport".
- CSRF por token double-submit assinado: a API entrega um token ligado à sessão por HMAC num cookie legível pelo site, e toda requisição que altera estado repete o valor no cabeçalho `X-CSRF-Token`. Pergunta em 2026-11-19: "Qual a proteção contra CSRF?", resposta "Token double-submit assinado (Recomendado)", entre essa e "Fetch Metadata / Origin".
- Rate limit com contagens numa tabela do PostgreSQL, contador por chave e janela com upsert atômico, em código próprio. Pergunta em 2026-11-19: "Onde o rate limit guarda as contagens?", resposta "Tabela no PostgreSQL (Recomendado)", entre essa e "@nestjs/throttler + storage no Postgres".
- Rotas da API autenticadas por padrão: um guard global exige sessão, e as rotas públicas levam `@Public()`. Pergunta em 2026-11-19: "Rotas da API são autenticadas por padrão?", resposta "Sim, com @Public() (Recomendado)", entre essa e "Não, com @Authenticated()".

- As telas do site são client components que chamam `/api/*` pelo `proxy.ts` (AD-006); o `Set-Cookie` da sessão chega direto ao navegador. Server Components leem o usuário repassando o cookie à API pela URL interna. Pergunta em 2026-11-19: "Como as telas do site falam com a API nos formulários?", resposta "Client components + /api (Recomendado)", entre essa e "Server Actions".
- Componentes de tela pelo `shadcn add` no estilo `base-vega` já configurado, com a dependência `@base-ui/react` (e `class-variance-authority` no botão). Pergunta em 2026-11-19: "Os componentes de tela vêm de onde?", resposta "shadcn com @base-ui/react (Recomendado)", entre essa e "Escritos à mão".
- A `auth` não apaga sessões vencidas, links vencidos nem contagens antigas do rate limit; a limpeza fica na `10-lifecycle`, como a dos jobs. Pergunta em 2026-11-19: "Quem apaga sessões vencidas, links vencidos e janelas antigas do rate limit?", resposta "Fica na lifecycle", entre "Cron diário na auth" e "Fica na lifecycle". Consequência no design: o rate limit guarda uma linha por chave (e-mail ou IP) e reaproveita a linha quando a janela vence, para a tabela não crescer a cada tentativa.

### Agent's Discretion

Nenhuma até agora.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma até agora.

---

## Specific References

Nenhuma captura de tela. As telas seguem o design system (artifact "Cristal e Gelo": Field, Button, Alert, AppHeader).

---

## Deferred Ideas

- Apagar sessões vencidas, links vencidos e contagens antigas do rate limit: fica para a `10-lifecycle` - user: "Fica na lifecycle".
- Apagar contas que nunca confirmaram o e-mail: fica para a `10-lifecycle`, que já cuida de contas inativas. Pergunta em 2026-11-19: "Contas que nunca confirmaram o e-mail são apagadas em algum momento?", resposta "Fica para a lifecycle (Recomendado)".
- Desvincular a conta Google no perfil: fora do MVP; quem quiser deixar de usar o Google cria uma senha e entra com ela. Pergunta em 2026-11-19: "A pessoa pode desvincular a conta Google no perfil?", resposta "Não no MVP (Recomendado)".
