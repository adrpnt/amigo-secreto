# Auth Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/03-auth/design.md`
**Status**: Approved
**Approved**: 2026-11-19 - user: "Aprovado, pode criar as issues no Linear."
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run api**: `pnpm turbo run test --force --filter=@amigo-secreto/api -- --reporter=verbose`
**Run web**: `pnpm turbo run test --force --filter=@amigo-secreto/web -- --reporter=verbose`
**Run e2e**: `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web`

Linhas esperadas das provas: o nome de cada teste é o que a check escreve; a task que cria o teste usa exatamente esse texto em `describe`/`it` (o Vitest separa com `>`, o reporter `list` do Playwright com `›`). Contagens de teste partem da `main` em 2026-11-19 (`ac05a4c`), contando `it(`/`test(`: 106 na API, 16 unitários no web e 16 no e2e; a primeira execução confere, e um desvio só de contagem inicial é registrado em `**Settled mid-build:**`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `.claude/rules/nest-api-coding-standards.md` e `.claude/rules/next-web-coding-standards.md` (nomes de `describe`/`it` em português; sem metas de cobertura), os testes da `01-foundation` e da `02-email-jobs` (`apps/api/src/**/*.spec.ts`, `apps/api/test/**/*.int-spec.ts`, `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/e2e/**/*.spec.ts`); strong defaults aplicados à profundidade.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| API: funções puras (hash de senha, e-mails da conta, validação do ambiente) | unit | Todos os ramos; 1:1 com os critérios; todo edge case listado | `apps/api/src/**/*.spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| API: tabelas e migrations, serviços com banco, guards, rotas, cliente do Google, sigilo | integration (Testcontainers, Google e Resend falsos) | Toda rota e critério da task: sucesso + bordas + falhas + limites; concorrência com conexões reais | `apps/api/test/**/*.int-spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project integration` |
| API: módulos (`*.module.ts`), DTOs, tipos | none | Build gate | - | Build gate |
| Web: funções de `lib/` e componentes com lógica (botão do Google) | unit (Vitest + Testing Library) | Todos os ramos; 1:1 com os critérios | `apps/web/src/**/*.test.{ts,tsx}` | `pnpm --filter @amigo-secreto/web test` |
| Web: páginas e fluxos | e2e (Playwright contra a API em produção, Postgres descartável, Resend e Google falsos) | Todo critério de tela: caminho feliz + erro + estado vazio/sem sessão | `apps/web/e2e/**/*.spec.ts` | `pnpm test:e2e` |
| Web: componentes do shadcn (`components/ui/`) | none | Build gate; cobertos pelas páginas no e2e | - | Build gate |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Cada gate roda o lint do pacote antes dos testes (eslint + prettier).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks da API só com testes unitários | `pnpm --filter @amigo-secreto/api lint && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| Full | Tasks da API com testes de integração | `pnpm --filter @amigo-secreto/api lint && pnpm test` |
| Web | Tasks do web só com testes unitários | `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web test` |
| E2E | Tasks do web com e2e | `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e` |
| Build | Fim de cada fase | `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Ao fim de cada fase roda o gate Build; cada fase vira um PR (AD-010). Na fase 6, o fechamento da feature roda antes do PR.

### Phase 1: Contas, sessão, CSRF e rate limit

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Cadastro, confirmação, login e recuperação

```
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 3: Google e perfil na API

```
T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 4: Base do site

```
T21 → T22 → T23 → T24 → T25 → T26
```

### Phase 5: Cadastro, login, termos e confirmação no site

```
T27 → T28 → T29 → T30 → T31 → T32
```

### Phase 6: Recuperação, Google, cabeçalho e perfil no site

```
T33 → T34 → T35 → T36 → T37 → T38 → T39
```

---

## Task Breakdown

### Phase 1: Contas, sessão, CSRF e rate limit

#### T1: Criar a entidade User e a migration da tabela

**What**: Entidade `User` com as colunas do design (`email` e `googleId` únicos), `UsersModule` com `TypeOrmModule.forFeature([User])` e migration `CreateUserTable` gerada por `migration:generate`.
**Where**: `apps/api/src/users/user.entity.ts`
**Depends on**: None
**Reuses**: padrão de `apps/api/src/jobs/job.entity.ts` e da migration `CreateJobTable`
**Requirement**: AUTH-01

**Done when**:

- [x] `apps/api/src/users/users.module.ts` criado e importado no `AppModule`
- [x] Testes em `test/user-table.int-spec.ts`: `tabela user > é criada pela migration com as colunas da conta`, `> recusa dois e-mails iguais`, `> recusa dois googleId iguais` e `> é removida ao reverter a migration`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 110 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add user table`

---

#### T2: Criar o PasswordHasher com argon2id nativo

**What**: `hash(password)` no formato PHC `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>` por `crypto.argon2`; `verify(password, stored)` com `timingSafeEqual` e, com `stored` nulo, verificação contra um hash fixo que devolve `false`.
**Where**: `apps/api/src/auth/password-hasher.ts`
**Depends on**: T1
**Reuses**: `node:crypto`
**Requirement**: AUTH-01, AUTH-03

**Done when**:

- [x] Testes em `src/auth/password-hasher.spec.ts`: `PasswordHasher > gera hash argon2id no formato PHC com m=19456, t=2 e p=1`, `> verifica a senha certa`, `> recusa a senha errada` e `> verifica contra o hash fixo e devolve false quando não há hash guardado`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 114 tests pass na API

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): hash passwords with argon2id`

---

#### T3: Validar as variáveis de ambiente da conta

**What**: `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `TRUST_PROXY_HOPS` obrigatórias em produção; `WEB_URL` com padrão `http://localhost:3000` fora de produção e obrigatória nela; `GOOGLE_AUTH_URL` e `GOOGLE_TOKEN_URL` com os endereços do Google como padrão; `AUTH_SECRET` com padrão fixo fora de produção; todas no `.env.example`; `app.setup.ts` aplica `trust proxy` com `TRUST_PROXY_HOPS` (padrão 0).
**Where**: `apps/api/src/config/env.validation.ts`
**Depends on**: T2
**Reuses**: padrão `ValidateIf(isProduction)` de `RESEND_API_KEY`
**Requirement**: AUTH-04, AUTH-08

**Done when**:

- [x] `apps/api/.env.example` e `apps/api/src/app.setup.ts` atualizados; `apps/web/playwright.config.ts` passa as variáveis novas à API do e2e (que roda em production), para os 16 e2e seguirem verdes no gate Build da fase
- [x] Testes em `src/config/env.validation.spec.ts`: `validateEnvironment > lança erro que nomeia GOOGLE_CLIENT_ID quando ela falta em production`, `> lança erro que nomeia GOOGLE_CLIENT_SECRET quando ela falta em production`, `> lança erro que nomeia AUTH_SECRET quando ela falta em production`, `> lança erro que nomeia TRUST_PROXY_HOPS quando ela falta em production` e `> aceita as variáveis da conta ausentes fora de production, com WEB_URL http://localhost:3000`; o teste existente do `.env.example` segue verde
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 119 tests pass na API

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): validate account environment variables`

---

#### T4: Criar o RateLimitService e a tabela rate_limit

**What**: Entidade `RateLimit` (`key` PK, `windowStart`, `count`) e migration; `consume(key, limit, windowMs)` por um `INSERT ... ON CONFLICT (key) DO UPDATE` que reinicia a janela vencida; `assertWithinLimits(rules)` que lança 429 com "Muitas tentativas. Tente de novo em N minutos." (N arredondado para cima) e `Retry-After`; `rateLimitKey(route, 'email', email)` com SHA-256 do e-mail normalizado.
**Where**: `apps/api/src/rate-limit/rate-limit.service.ts`
**Depends on**: T3
**Reuses**: padrão de entidade e migration do `job`; transações com duas conexões do `job-runner.int-spec`
**Requirement**: AUTH-08

**Done when**:

- [x] `rate-limit.entity.ts`, `rate-limit.module.ts` e a migration criados
- [x] Testes em `test/rate-limit.int-spec.ts`: `RateLimitService > permite até o limite e recusa a tentativa seguinte na mesma janela`, `> reinicia a contagem quando a janela vence`, `> soma as tentativas de duas conexões ao mesmo tempo sem perder nenhuma`, `> devolve o tempo que falta para a janela vencer`, `> lança 429 com "Muitas tentativas. Tente de novo em N minutos." quando uma regra estoura` e `> guarda o e-mail só como SHA-256 na chave`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 125 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add database-backed rate limiting`

---

#### T5: Criar o SessionsService e a tabela session

**What**: Entidade `Session` e migration; `create`, `resolve`, `touch`, `revoke` e `revokeAll(userId, { except })` como no design; cookie `sid` `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 30 dias e `Secure` em produção; leitura de cookies por função própria (`parseCookies`).
**Where**: `apps/api/src/auth/sessions.service.ts`
**Depends on**: T4
**Reuses**: `User` (T1)
**Requirement**: AUTH-03

**Done when**:

- [x] `session.entity.ts`, `cookies.ts` e a migration criados
- [x] Testes em `test/sessions.int-spec.ts`: `SessionsService > abre a sessão com o cookie sid HttpOnly, SameSite=Lax, Path=/ e Max-Age de 30 dias`, `> marca o cookie Secure em production`, `> guarda só o SHA-256 do token`, `> ignora a sessão com expiresAt no passado`, `> grava o uso e renova expiresAt para 30 dias quando o último uso tem mais de 1 hora`, `> não grava o uso quando o último uso tem menos de 1 hora` e `> encerra todas as sessões do usuário menos a informada`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 132 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add database sessions`

---

#### T6: Criar o SessionGuard global, os decorators e GET /auth/session

**What**: `SessionGuard` como `APP_GUARD` no `AuthModule`, `@Public()` e `@CurrentUser()`; `@Public()` no `HealthController`; `GET /auth/session` público devolvendo `{ user: SessionUser | null, googleEnabled }`; `SessionUser` exportado por `packages/shared`.
**Where**: `apps/api/src/auth/guards/session.guard.ts`
**Depends on**: T5
**Reuses**: `SessionsService` (T5), `test/fixtures/` (módulo com uma rota protegida de teste)
**Requirement**: AUTH-08, AUTH-03

**Done when**:

- [x] `auth.module.ts`, `auth.controller.ts`, os decorators, `packages/shared/src/index.ts` e `test/fixtures/auth-fixture.module.ts` atualizados ou criados
- [x] Testes em `test/session-guard.int-spec.ts`: `guard de sessão > responde 401 numa rota protegida sem cookie`, `> responde 401 com o cookie de uma sessão encerrada, vencida ou desconhecida`, `> entrega o usuário da sessão à rota por @CurrentUser`, `> deixa passar a rota com @Public sem sessão`, `> mantém GET /health público`, `GET /auth/session > devolve user null sem sessão` e `> devolve o usuário da sessão sem hash de senha nem de token`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 139 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): require a session on every route by default`

---

#### T7: Criar o CsrfGuard e o cookie csrf

**What**: Token `<aleatório>.<HMAC(AUTH_SECRET, aleatório + id da sessão ou "anon")>`; `CsrfGuard` global depois do `SessionGuard` exigindo `X-CSRF-Token` igual ao cookie `csrf` e com HMAC da sessão atual em `POST`, `PUT`, `PATCH` e `DELETE`; `GET /auth/session` grava o cookie `csrf` (`SameSite=Lax`, `Path=/`, legível pelo site); `SessionsService.create` e `revoke` trocam o token.
**Where**: `apps/api/src/auth/guards/csrf.guard.ts`
**Depends on**: T6
**Reuses**: `auth-fixture.module.ts` (T6)
**Requirement**: AUTH-08

**Done when**:

- [x] `apps/api/src/auth/csrf-token.ts` criado
- [x] Testes em `test/csrf.int-spec.ts`: `proteção CSRF > responde 403 a POST sem X-CSRF-Token`, `> responde 403 quando o cabeçalho difere do cookie`, `> responde 403 a token emitido para outra sessão`, `> aceita POST com o token da sessão atual`, `> exige o token em PUT, PATCH e DELETE`, `> não exige o token em GET` e `GET /auth/session > grava o cookie csrf legível pelo site`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 146 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add signed double-submit csrf protection`

---

### Phase 2: Cadastro, confirmação, login e recuperação

#### T8: Criar o AuthTokensService e a tabela auth_token

**What**: Entidade `AuthToken` (`type`: `'email_verification' | 'password_reset' | 'email_change'`) e migration; `issue` apaga os não usados do mesmo tipo e usuário e grava o SHA-256; `consume` com `FOR UPDATE`, nulo se vencido, usado, inexistente ou de outro tipo; validade de 7 dias, 1 hora e 7 dias.
**Where**: `apps/api/src/auth/auth-tokens.service.ts`
**Depends on**: T7
**Reuses**: padrão de entidade e migration
**Requirement**: AUTH-02, AUTH-05, AUTH-12

**Done when**:

- [x] `auth-token.entity.ts` e a migration criados
- [x] Testes em `test/auth-tokens.int-spec.ts`: `AuthTokensService > guarda só o SHA-256 do token`, `> invalida o token não usado do mesmo tipo ao emitir outro`, `> consome o token uma vez só`, `> recusa o token vencido`, `> recusa o token de outro tipo`, `> vence em 7 dias a confirmação, em 1 hora a recuperação e em 7 dias a troca de e-mail` e `> consome o mesmo token uma vez só com duas transações simultâneas`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 153 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add single-use email link tokens`

---

#### T9: Montar os e-mails da conta

**What**: Uma função por e-mail devolvendo `EmailMessage` com os assuntos e botões da spec, links formados com `WEB_URL`: confirmação, já tem conta, recuperação, senha alterada, novo e-mail, e-mail antigo e Google vinculado.
**Where**: `apps/api/src/auth/auth-emails.ts`
**Depends on**: T8
**Reuses**: `EmailMessage` de `email.types.ts`
**Requirement**: AUTH-01, AUTH-04, AUTH-05, AUTH-07, AUTH-12

**Done when**:

- [x] Testes em `src/auth/auth-emails.spec.ts`: `e-mails da conta > confirmação tem o assunto "Confirme seu e-mail no Amigo Secreto" e o botão "Confirmar e-mail" com o link`, `> já tem conta tem o assunto "Você já tem uma conta no Amigo Secreto" e os botões "Entrar" e "Redefinir senha"`, `> recuperação tem o assunto "Redefina sua senha do Amigo Secreto" e o botão "Redefinir senha" com o link`, `> senha alterada tem o assunto "Sua senha do Amigo Secreto foi alterada"`, `> novo e-mail tem o assunto "Confirme seu novo e-mail no Amigo Secreto" e o botão "Confirmar novo e-mail" com o link`, `> e-mail antigo tem o assunto "Pedido de troca de e-mail no Amigo Secreto"` e `> Google vinculado tem o assunto "Conta Google vinculada ao Amigo Secreto"`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 160 tests pass na API

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add account email messages`

---

#### T10: Criar POST /auth/register

**What**: DTO com nome (trim, 1 a 80), e-mail (normalizado), senha (8 a 128), `acceptTerms` verdadeiro, `marketingOptIn` e `next`; limites de 5 por e-mail e 20 por IP por hora; transação que cria a conta e enfileira a confirmação, ou enfileira o aviso "já tem conta" (inclusive na violação do índice único); sempre `202 { email }`, sem sessão; evento `user.registered` com `method` `password` e `userId`.
**Where**: `apps/api/src/auth/auth.service.ts`
**Depends on**: T9
**Reuses**: `PasswordHasher`, `RateLimitService`, `AuthTokensService`, `EmailService`, `BusinessEventsService`
**Requirement**: AUTH-01, AUTH-08, AUTH-11

**Done when**:

- [x] Rota em `auth.controller.ts`, DTO em `dto/register.dto.ts`, `safeNext` da API em `src/auth/safe-next.ts` e `TERMS_VERSION` em `packages/shared`
- [x] Testes em `test/register.int-spec.ts`: `cadastro > cria a conta não confirmada com a data e a versão dos termos e responde 202 com o e-mail`, `> enfileira o e-mail de confirmação na mesma transação`, `> grava o opt-in de marketing com a data quando a caixa vem marcada`, `> grava a conta sem opt-in quando a caixa vem desmarcada`, `> recusa com 400 sem a caixa de termos`, `> recusa com 400 senha de 7 ou de 129 caracteres`, `> recusa com 400 nome vazio depois do trim ou com 81 caracteres`, `> recusa com 400 e-mail inválido`, `> responde igual para e-mail já cadastrado com outra caixa de letras, sem mudar a conta, e enfileira o aviso já tem conta`, `> não abre sessão`, `> guarda a senha como hash argon2id`, `> guarda o e-mail sem espaços nas pontas e em minúsculas`, `> emite user.registered com method password e o id, sem e-mail nem nome`, `> cria uma conta só com dois cadastros simultâneos do mesmo e-mail`, `> responde 429 no 6º cadastro do mesmo e-mail em 1 hora sem enfileirar e-mail`, `> responde 429 no 21º cadastro do mesmo IP em 1 hora` e `> troca por /perfil um destino de outro site`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 177 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add account registration`

---

#### T11: Criar a confirmação de e-mail e o reenvio

**What**: `POST /auth/email/verify { token }` confirma, emite `user.email_verified`, abre a sessão e devolve `{ next }` (do token ou `/perfil`), `410` para link vencido, usado ou substituído; `POST /auth/email/verification-link` autenticado, com limites de 5 por e-mail e 20 por IP por hora, invalida o link anterior e enfileira outro.
**Where**: `apps/api/src/auth/email-verification.service.ts`
**Depends on**: T10
**Reuses**: `AuthTokensService`, `SessionsService`, `auth-emails.ts`
**Requirement**: AUTH-02, AUTH-08

**Done when**:

- [x] Rotas em `auth.controller.ts`
- [x] Testes em `test/email-verification.int-spec.ts`: `confirmação de e-mail > confirma o e-mail, abre a sessão e devolve o destino do cadastro`, `> devolve /perfil como destino quando o cadastro não tinha origem`, `> emite user.email_verified`, `> responde 410 a link vencido`, `> responde 410 a link usado`, `> responde 410 a link substituído por um reenvio`, `> responde 410 ao link de quem já confirmou por outro caminho`, `> reenvio invalida o link anterior e enfileira um novo`, `> reenvio exige sessão`, `> responde 429 no 6º reenvio em 1 hora`, `> encerra a sessão que o navegador já tinha ao confirmar` e `> reenvio responde 409 "Seu e-mail já está confirmado." a quem já confirmou`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 189 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): confirm email by single-use link`

---

#### T12: Criar login, logout e sair de todos os dispositivos

**What**: `POST /auth/login` com limites de 10 por e-mail e 30 por IP em 15 minutos antes de verificar a senha, `401` "E-mail ou senha incorretos." sem conta, com senha errada ou em conta sem senha; `POST /auth/logout` e `POST /auth/logout-all` autenticados, `204`, apagando o cookie.
**Where**: `apps/api/src/auth/login.service.ts`
**Depends on**: T11
**Reuses**: `PasswordHasher`, `SessionsService`, `RateLimitService`
**Requirement**: AUTH-03, AUTH-08, AUTH-13

**Done when**:

- [x] Rotas em `auth.controller.ts`
- [x] Testes em `test/login.int-spec.ts`: `login e logout > abre a sessão com a senha certa e devolve o usuário`, `> responde 401 "E-mail ou senha incorretos." a e-mail sem conta`, `> responde 401 "E-mail ou senha incorretos." a senha errada`, `> responde 401 "E-mail ou senha incorretos." a conta só Google`, `> encerra a sessão e apaga o cookie no logout`, `> mantém duas sessões independentes em dois logins`, `> encerra todas as sessões em sair de todos os dispositivos`, `> responde 429 na 11ª tentativa do mesmo e-mail em 15 minutos sem verificar a senha`, `> responde 429 na 31ª tentativa do mesmo IP em 15 minutos`, `> conta as tentativas pelo IP do X-Forwarded-For com TRUST_PROXY_HOPS 1`, `> troca o token CSRF ao abrir e ao encerrar a sessão`, `> encerra a sessão que o navegador já tinha ao entrar` e `> recusa com 400 e-mail inválido ou senha vazia sem contar tentativa`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 202 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add login and logout`

---

#### T13: Criar a recuperação de senha

**What**: `POST /auth/password/forgot { email }` sempre `202`, limites de 5 por e-mail e 20 por IP por hora, enfileira o e-mail de recuperação só quando há conta; `POST /auth/password/reset { token, password }` troca a senha, confirma o e-mail, `revokeAll`, abre sessão, enfileira o aviso e devolve `{ next }`; `410` para link vencido, usado ou substituído.
**Where**: `apps/api/src/auth/password-reset.service.ts`
**Depends on**: T12
**Reuses**: `AuthTokensService`, `SessionsService`, `PasswordHasher`, `RateLimitService`, `auth-emails.ts`
**Requirement**: AUTH-05, AUTH-08

**Done when**:

- [x] Rotas em `auth.controller.ts`
- [x] Testes em `test/password-reset.int-spec.ts`: `recuperação de senha > responde 202 igual com e sem conta`, `> enfileira o e-mail com link de 1 hora e invalida o anterior`, `> não enfileira e-mail para e-mail sem conta`, `> troca a senha, confirma o e-mail, encerra todas as sessões e abre uma nova`, `> enfileira o aviso de senha alterada`, `> responde 410 a link com mais de 1 hora`, `> responde 410 a link usado`, `> responde 410 a link substituído por um pedido mais novo`, `> cria a senha de uma conta só Google, que passa a entrar com e-mail e senha`, `> responde 429 no 6º pedido do mesmo e-mail em 1 hora sem enfileirar e-mail`, `> recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres` e `> emite user.email_verified quando a conta não tinha o e-mail confirmado`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 214 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add password recovery`

---

#### T14: Cobrir o sigilo da conta em logs, Sentry e respostas

**What**: Teste que passa por cadastro, login, confirmação e recuperação com uma senha e tokens marcados e confere a saída do logger, o evento do Sentry de um 500 forçado e os corpos de resposta; corrige o que vazar.
**Where**: `apps/api/test/auth-secrecy.int-spec.ts`
**Depends on**: T13
**Reuses**: padrão de `test/email-secrecy.int-spec.ts` e `fixtures/sentry-initialized.mjs`
**Requirement**: AUTH-08

**Done when**:

- [x] Testes: `sigilo da conta > não escreve senha, token de sessão, token de link nem cookie no log`, `> não manda senha, token nem cookie ao Sentry num erro 500`, `> não devolve hash de senha nem de token nas respostas da conta` e `> não devolve senha nem token nas respostas de erro 400`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [x] Test count: 218 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `test(api): cover account secrecy in logs and responses`

---

### Phase 3: Google e perfil na API

#### T15: Criar o cliente OIDC do Google

**What**: `GoogleOidcClient.authorizationUrl({ state, codeChallenge })` com `client_id`, `redirect_uri=WEB_URL/api/auth/google/callback`, `scope=openid email profile`, `code_challenge_method=S256`; `exchange(code, verifier)` por `fetch` em `GOOGLE_TOKEN_URL` com timeout de 10 s, decodificando o `id_token` e conferindo `aud`, `iss` e `exp`; servidor falso do Google para os testes.
**Where**: `apps/api/src/auth/google/google-oidc.client.ts`
**Depends on**: T14
**Reuses**: molde de `test/fake-resend.ts`
**Requirement**: AUTH-04

**Done when**:

- [ ] `apps/api/test/fake-google.ts` criado
- [ ] Testes em `test/google-oidc.int-spec.ts`: `GoogleOidcClient > monta a URL de autorização com client_id, redirect_uri, scope openid email profile, state e code_challenge S256`, `> troca o code com code_verifier e client secret e devolve sub, e-mail, email_verified, nome e foto`, `> recusa id_token com aud de outro cliente`, `> recusa id_token com iss fora do Google`, `> recusa id_token vencido` e `> falha em 10 segundos quando o Google não responde`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [ ] Test count: 224 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add google openid connect client`

---

#### T16: Criar o início e o retorno do login com Google

**What**: `GET /auth/google/start?next=` (cookie assinado `g_oauth` com `state`, verifier e destino por 10 min; `404` sem Google configurado) e `GET /auth/google/callback` com os ramos do design: sessão de conta vinculada, vínculo de e-mail verificado com aviso, `g_signup` para `/completar-cadastro`, `erro=google_nao_verificado` e `erro=google`; foto atualizada a cada login; `googleEnabled` no `GET /auth/session`.
**Where**: `apps/api/src/auth/google/google-auth.service.ts`
**Depends on**: T15
**Reuses**: `GoogleOidcClient`, `SessionsService`, `auth-emails.ts`, `fake-google.ts`, `safeNext` da API (`src/auth/safe-next.ts`, criado na T10)
**Requirement**: AUTH-04

**Done when**:

- [ ] `google-auth.controller.ts` e `signed-cookie.ts` criados
- [ ] Testes em `test/google-login.int-spec.ts`: `login com Google > start redireciona ao Google e grava o cookie g_oauth com state, verifier e destino`, `> start responde 404 sem Google configurado`, `> GET /auth/session informa googleEnabled false sem GOOGLE_CLIENT_ID fora de production`, `> abre a sessão da conta já vinculada e leva ao destino`, `> vincula a conta com senha de e-mail verificado, confirma o e-mail, abre a sessão e enfileira o aviso de Google vinculado`, `> leva e-mail verificado sem conta a /completar-cadastro com o cookie g_signup`, `> recusa e-mail não verificado com erro=google_nao_verificado sem criar, vincular nem abrir sessão`, `> volta a /entrar com erro=google quando o state difere do cookie`, `> volta a /entrar com erro=google quando a pessoa cancela no Google`, `> volta a /entrar com erro=google quando o Google recusa o code`, `> atualiza a foto da conta vinculada a cada login` e `> troca por /perfil um destino de outro site`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [ ] Test count: 236 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): sign in with google`

---

#### T17: Criar POST /auth/google/complete

**What**: Lê `g_signup` (assinatura e validade de 15 min), cria a conta confirmada, vinculada e com a foto do Google, com termos e opt-in, emite `user.registered` com `method` `google`, abre a sessão e devolve `{ next }`; se o e-mail ganhou conta nesse meio-tempo, vincula em vez de criar; `401` sem `g_signup` válido.
**Where**: `apps/api/src/auth/google/google-signup.service.ts`
**Depends on**: T16
**Reuses**: `GoogleAuthService`, `SessionsService`, `BusinessEventsService`
**Requirement**: AUTH-04, AUTH-11

**Done when**:

- [ ] Rota em `google-auth.controller.ts` e DTO `dto/google-complete.dto.ts`
- [ ] Testes em `test/google-signup.int-spec.ts`: `completar cadastro com Google > cria a conta confirmada, vinculada e com a foto do Google, abre a sessão e devolve o destino`, `> emite user.registered com method google e o id, sem e-mail nem nome`, `> recusa com 400 sem a caixa de termos`, `> grava o opt-in de marketing quando a caixa vem marcada`, `> vincula em vez de criar quando o e-mail ganhou conta no meio-tempo` e `> responde 401 sem o cookie g_signup, com ele vencido ou adulterado`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [ ] Test count: 242 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): complete google sign-up with terms`

---

#### T18: Criar GET e PATCH /users/me

**What**: `GET /users/me` devolve o `SessionUser`; `PATCH /users/me { name?, marketingOptIn? }` grava o nome (trim, 1 a 80) e o opt-in com `marketingOptInAt`.
**Where**: `apps/api/src/users/users.controller.ts`
**Depends on**: T17
**Reuses**: `UsersService`, `@CurrentUser()`
**Requirement**: AUTH-06

**Done when**:

- [ ] `users.service.ts` e `dto/update-profile.dto.ts` criados
- [ ] Testes em `test/profile.int-spec.ts`: `perfil > GET /users/me devolve nome, e-mail, foto e opt-in`, `> PATCH grava o nome sem os espaços das pontas`, `> PATCH recusa com 400 nome vazio ou com 81 caracteres e mantém o anterior` e `> PATCH grava o opt-in com a data da mudança`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [ ] Test count: 246 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add profile endpoints`

---

#### T19: Criar POST /users/me/password

**What**: Com senha: exige a atual (`400` "Senha atual incorreta."); conta só Google cria sem a atual; troca, mantém a sessão atual, `revokeAll` com `except`, enfileira o aviso; nova senha de 8 a 128.
**Where**: `apps/api/src/users/password-change.service.ts`
**Depends on**: T18
**Reuses**: `PasswordHasher`, `SessionsService`, `auth-emails.ts`
**Requirement**: AUTH-07, AUTH-05

**Done when**:

- [ ] Rota em `users.controller.ts` e DTO `dto/change-password.dto.ts`
- [ ] Testes em `test/password-change.int-spec.ts`: `troca de senha > troca a senha, mantém a sessão atual e encerra as outras`, `> enfileira o aviso de senha alterada`, `> recusa com 400 "Senha atual incorreta." sem mudar nada`, `> cria a senha de conta só Google sem pedir a atual`, `> recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres` e `> mantém válido o link de recuperação pendente`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [ ] Test count: 252 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): change password from profile`

---

#### T20: Criar a troca de e-mail

**What**: `POST /users/me/email { newEmail, password }` exige senha (conta sem senha: `400` "Crie uma senha antes de trocar o e-mail."), enfileira o link para o novo e o aviso para o atual, responde `202 { email }`; `POST /auth/email/change/confirm { token }` troca o e-mail, já confirmado; `409` "Este e-mail já está em uso por outra conta."; `410` para link vencido, usado ou substituído.
**Where**: `apps/api/src/users/email-change.service.ts`
**Depends on**: T19
**Reuses**: `AuthTokensService`, `PasswordHasher`, `auth-emails.ts`
**Requirement**: AUTH-12

**Done when**:

- [ ] Rotas em `users.controller.ts` e `auth.controller.ts`, DTO `dto/change-email.dto.ts`
- [ ] Testes em `test/email-change.int-spec.ts`: `troca de e-mail > enfileira o link para o e-mail novo e o aviso para o atual e responde com o e-mail novo`, `> mantém o e-mail atual para login até a confirmação`, `> troca o e-mail pelo novo, já confirmado, ao confirmar o link`, `> responde 409 "Este e-mail já está em uso por outra conta." quando o e-mail novo ganhou conta`, `> recusa com 400 "Senha atual incorreta." sem enfileirar e-mail`, `> recusa conta sem senha pedindo para criar uma senha antes`, `> responde 410 a link vencido`, `> responde 410 a link usado` e `> responde 410 a link substituído por um pedido mais novo`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm test`
- [ ] Test count: 261 tests pass na API

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): change account email with confirmation`

---

### Phase 4: Base do site

#### T21: Adicionar os componentes do shadcn

**What**: `pnpm dlx shadcn@latest add button input label checkbox alert dropdown-menu avatar` no estilo `base-vega` já configurado, com `@base-ui/react` (e `class-variance-authority` se o botão pedir); classes ajustadas aos tokens do design system.
**Where**: `apps/web/src/components/ui/`
**Depends on**: T20
**Reuses**: `components.json`, `globals.css`, design system "Cristal e Gelo"
**Requirement**: AUTH-09

**Done when**:

- [ ] Componentes em `components/ui/` e dependências no `apps/web/package.json` e no lockfile
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web build`
- [ ] Test count: 16 tests pass no web (sem mudança)

**Tests**: none
**Gate**: build

**Commit**: `chore(web): add shadcn form and menu components`

---

#### T22: Criar safeNext

**What**: `safeNext(value)` aceita só caminho que começa com `/`, não com `//` nem `/\`, sem esquema, e que não é `/entrar` nem `/cadastro`; senão `/perfil`.
**Where**: `apps/web/src/lib/safe-next.ts`
**Depends on**: T21
**Reuses**: nada
**Requirement**: AUTH-09

**Done when**:

- [ ] Testes em `src/lib/safe-next.test.ts`: `safeNext > aceita um caminho do próprio site com query`, `> troca por /perfil um caminho que começa com //`, `> troca por /perfil um caminho que começa com /\`, `> troca por /perfil um endereço com esquema`, `> troca por /perfil os caminhos /entrar e /cadastro` e `> troca por /perfil um valor ausente`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 22 tests pass no web

**Tests**: unit
**Gate**: web

**Commit**: `feat(web): validate redirect paths`

---

#### T23: Criar isInAppBrowser

**What**: `isInAppBrowser(userAgent)` reconhece WhatsApp, Instagram e Facebook (`FBAN`, `FBAV`).
**Where**: `apps/web/src/lib/in-app-browser.ts`
**Depends on**: T22
**Reuses**: nada
**Requirement**: AUTH-14

**Done when**:

- [ ] Testes em `src/lib/in-app-browser.test.ts`: `isInAppBrowser > reconhece o navegador do WhatsApp`, `> reconhece o navegador do Instagram`, `> reconhece o navegador do Facebook pelo FBAN e pelo FBAV` e `> não reconhece o Chrome nem o Safari do celular`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 26 tests pass no web

**Tests**: unit
**Gate**: web

**Commit**: `feat(web): detect in-app browsers`

---

#### T24: Criar apiFetch

**What**: Chamada do navegador a `/api/*`: lê o cookie `csrf` (busca `/api/auth/session` se faltar), manda `X-CSRF-Token`; num `401` leva a `/entrar?next=<caminho atual>`; num `403` busca um token novo e repete uma vez.
**Where**: `apps/web/src/lib/api-fetch.ts`
**Depends on**: T23
**Reuses**: `safeNext` (T22)
**Requirement**: AUTH-09, AUTH-08

**Done when**:

- [ ] Testes em `src/lib/api-fetch.test.ts`: `apiFetch > manda X-CSRF-Token com o valor do cookie csrf`, `> busca /api/auth/session antes quando falta o cookie csrf`, `> leva a /entrar com o caminho atual quando recebe 401` e `> busca um token novo e repete uma vez quando recebe 403`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 30 tests pass no web

**Tests**: unit
**Gate**: web

**Commit**: `feat(web): add api client with csrf header`

---

#### T25: Criar getCurrentUser e requireUser

**What**: No servidor, `getCurrentUser()` chama `API_INTERNAL_URL/auth/session` com o cabeçalho `Cookie` da requisição e `cache: 'no-store'`; `requireUser(path)` redireciona a `/entrar?next=<path>` sem usuário.
**Where**: `apps/web/src/lib/session.ts`
**Depends on**: T24
**Reuses**: padrão de `lib/api-status.ts`
**Requirement**: AUTH-09

**Done when**:

- [ ] Testes em `src/lib/session.test.ts`: `getCurrentUser > repassa o cookie da requisição a API_INTERNAL_URL/auth/session sem cache`, `> devolve null sem sessão` e `requireUser > redireciona a /entrar com o caminho como next quando não há usuário`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 33 tests pass no web

**Tests**: unit
**Gate**: web

**Commit**: `feat(web): read the session on the server`

---

#### T26: Preparar o e2e com Resend e Google falsos

**What**: Servidor de provedores falsos (Node, sem dependência) como `webServer` do Playwright: guarda os e-mails recebidos pela rota do Resend e expõe a última mensagem por destinatário; simula o Google com uma página de escolha de identidade (verificada nova, não verificada, cancelar); a API do e2e recebe `RESEND_BASE_URL`, `GOOGLE_*`, `AUTH_SECRET`, `WEB_URL` e `TRUST_PROXY_HOPS=1`; fixture que manda um `X-Forwarded-For` próprio por teste e helper `lastEmailTo(email)`.
**Where**: `apps/web/e2e/support/fake-providers.ts`
**Depends on**: T25
**Reuses**: `playwright.config.ts`, `scripts/e2e.ts`
**Requirement**: AUTH-01

**Done when**:

- [ ] `playwright.config.ts` e `e2e/support/fixtures.ts` atualizados ou criados; os 16 e2e existentes seguem verdes
- [ ] Teste em `e2e/fake-providers.spec.ts`: `provedores falsos › o e-mail enfileirado pela API chega à caixa falsa`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 17 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `test(web): run e2e with fake email and google providers`

---

### Phase 5: Cadastro, login, termos e confirmação no site

#### T27: Criar a página /cadastro

**What**: Formulário de nome, e-mail, senha, caixa obrigatória "Li e aceito os Termos de uso e a Política de privacidade, e tenho 18 anos ou autorização dos meus responsáveis" (links para `/termos` e `/privacidade`) e caixa opcional de marketing desmarcada; envio por `apiFetch` com o `next` da query; tela "Enviamos um e-mail para X. Abra o link para confirmar sua conta."; erros por campo; logado vai direto ao destino.
**Where**: `apps/web/src/app/cadastro/page.tsx`
**Depends on**: T26
**Reuses**: `apiFetch`, `safeNext`, `getCurrentUser`, componentes do shadcn
**Requirement**: AUTH-01, AUTH-10, AUTH-03

**Done when**:

- [ ] Testes em `e2e/signup.spec.ts`: `cadastro › cria a conta e mostra "Enviamos um e-mail para X. Abra o link para confirmar sua conta."`, `› mostra a mesma tela para um e-mail já cadastrado`, `› mostra o erro do campo para senha com menos de 8 caracteres`, `› a caixa de termos tem links para /termos e /privacidade` e `› leva a pessoa logada que abre /cadastro direto ao destino`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 22 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): add sign-up page`

---

#### T28: Criar o GoogleButton

**What**: Botão "Entrar com Google" que leva a `/api/auth/google/start?next=`; não aparece com `googleEnabled` falso; no navegador interno mostra "Para entrar com Google, abra esta página no navegador do celular." e "Copiar link", que copia o endereço e mostra "Link copiado.".
**Where**: `apps/web/src/components/google-button.tsx`
**Depends on**: T27
**Reuses**: `isInAppBrowser` (T23), `Button` do shadcn
**Requirement**: AUTH-04, AUTH-14

**Done when**:

- [ ] Testes em `src/components/google-button.test.tsx`: `GoogleButton > não aparece com googleEnabled false`, `> leva a /api/auth/google/start com o destino`, `> mostra a orientação e "Copiar link" no lugar do botão no navegador interno` e `> copia o endereço da página e mostra "Link copiado."`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 37 tests pass no web

**Tests**: unit
**Gate**: web

**Commit**: `feat(web): add google sign-in button`

---

#### T29: Criar a página /entrar

**What**: Formulário de e-mail e senha, `GoogleButton`, links "Esqueci a senha" e "Criar conta"; erros "E-mail ou senha incorretos.", "Muitas tentativas. Tente de novo em N minutos." e os de `?erro=google` e `?erro=google_nao_verificado`; destino por `safeNext`; logado vai direto ao destino.
**Where**: `apps/web/src/app/entrar/page.tsx`
**Depends on**: T28
**Reuses**: `apiFetch`, `safeNext`, `getCurrentUser`, `GoogleButton`
**Requirement**: AUTH-03, AUTH-09, AUTH-14, AUTH-08

**Done when**:

- [ ] Testes em `e2e/login.spec.ts`: `login › entra com a senha certa e cai em /perfil`, `› mostra "E-mail ou senha incorretos." com a senha errada`, `› volta à página de origem depois do login`, `› mostra "Muitas tentativas. Tente de novo em 15 minutos." na 11ª tentativa`, `› leva a pessoa logada que abre /entrar direto ao destino` e `› com o user agent do WhatsApp mostra a orientação no lugar do Google e o formulário continua funcionando`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 28 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): add sign-in page`

---

#### T30: Criar as páginas provisórias de termos e privacidade

**What**: `/termos` e `/privacidade` com o título do documento, a versão vigente (`2026-11-19`) e um texto provisório curto, por um componente comum.
**Where**: `apps/web/src/app/(legal)/`
**Depends on**: T29
**Reuses**: tipografia do design system
**Requirement**: AUTH-10

**Done when**:

- [ ] Testes em `e2e/legal.spec.ts`: `termos › /termos mostra o título, a versão vigente e o texto provisório` e `› /privacidade mostra o título, a versão vigente e o texto provisório`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 30 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): add provisional terms and privacy pages`

---

#### T31: Criar a página /confirmar-email

**What**: Lê `token` (e `tipo=troca`), faz o `POST` de confirmação ou de troca, leva ao destino; mostra "Este link expirou ou já foi usado." (com "Reenviar e-mail" para quem está logado sem confirmar) e "Este e-mail já está em uso por outra conta.".
**Where**: `apps/web/src/app/confirmar-email/page.tsx`
**Depends on**: T30
**Reuses**: `apiFetch`, `safeNext`
**Requirement**: AUTH-02, AUTH-12

**Done when**:

- [ ] Testes em `e2e/email-confirmation.spec.ts`: `confirmação de e-mail › o link do e-mail confirma, abre a sessão e leva ao perfil`, `› o link aberto de novo mostra "Este link expirou ou já foi usado."`, `› o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar`, `› o link de troca de e-mail troca o e-mail mostrado no perfil` e `› o link de troca para um e-mail em uso mostra "Este e-mail já está em uso por outra conta."`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 35 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): add email confirmation page`

---

#### T32: Criar a faixa de confirmação de e-mail

**What**: Faixa abaixo do cabeçalho, no layout, para usuário logado sem e-mail confirmado: "Confirme seu e-mail: enviamos um link para X." com "Reenviar e-mail", que mostra "Enviamos um novo link para X." ou a mensagem de limite.
**Where**: `apps/web/src/components/email-verification-banner.tsx`
**Depends on**: T31
**Reuses**: `getCurrentUser`, `apiFetch`, `Alert` do shadcn
**Requirement**: AUTH-02

**Done when**:

- [ ] `apps/web/src/app/layout.tsx` mostra a faixa
- [ ] Testes em `e2e/email-banner.spec.ts`: `faixa de confirmação › aparece para quem entrou sem confirmar com "Confirme seu e-mail: enviamos um link para X."`, `› "Reenviar e-mail" mostra "Enviamos um novo link para X."` e `› some depois da confirmação`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 38 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): show email confirmation banner`

---

### Phase 6: Recuperação, Google, cabeçalho e perfil no site

#### T33: Criar a página /esqueci-a-senha

**What**: Formulário de e-mail; mostra "Se houver uma conta com X, enviamos um link para redefinir a senha." com e sem conta, ou a mensagem de limite.
**Where**: `apps/web/src/app/esqueci-a-senha/page.tsx`
**Depends on**: T32
**Reuses**: `apiFetch`
**Requirement**: AUTH-05

**Done when**:

- [ ] Teste em `e2e/password-reset.spec.ts`: `recuperação de senha › mostra "Se houver uma conta com X, enviamos um link para redefinir a senha." com e sem conta`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 39 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): add forgot password page`

---

#### T34: Criar a página /redefinir-senha

**What**: Lê `token`, pede a senha nova (8 a 128), faz o `POST` e leva ao destino; link inválido mostra "Este link expirou ou já foi usado." com o caminho para `/esqueci-a-senha`.
**Where**: `apps/web/src/app/redefinir-senha/page.tsx`
**Depends on**: T33
**Reuses**: `apiFetch`, `safeNext`
**Requirement**: AUTH-05

**Done when**:

- [ ] Testes em `e2e/password-reset.spec.ts`: `recuperação de senha › o link troca a senha e entra` e `› o link usado mostra "Este link expirou ou já foi usado." com o caminho para /esqueci-a-senha`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 41 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): add reset password page`

---

#### T35: Criar a página /completar-cadastro

**What**: Tela "Complete seu cadastro" com o nome do Google preenchido e editável, a caixa obrigatória de termos e a de marketing; envio por `apiFetch` e destino; `?erro=` do `/entrar` coberto pelo fluxo.
**Where**: `apps/web/src/app/completar-cadastro/page.tsx`
**Depends on**: T34
**Reuses**: `apiFetch`, formulário de termos da T27
**Requirement**: AUTH-04

**Done when**:

- [ ] Testes em `e2e/google.spec.ts`: `login com Google › e-mail novo passa por "Complete seu cadastro" com o nome do Google e entra`, `› e-mail não verificado volta a /entrar com "Não foi possível entrar com Google. Entre com e-mail e senha."` e `› cancelar no Google volta a /entrar com "Não foi possível entrar com Google. Tente de novo."`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 44 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): complete google sign-up`

---

#### T36: Mostrar Entrar ou o menu do avatar no cabeçalho

**What**: `UserMenu` no `AppHeader`: sem sessão, botão "Entrar"; com sessão, avatar (foto do Google ou iniciais do nome) que abre um menu com "Perfil" e "Sair"; "Sair" chama o logout e leva a `/entrar`.
**Where**: `apps/web/src/components/user-menu.tsx`
**Depends on**: T35
**Reuses**: `AppHeader`, `DropdownMenu` e `Avatar` do shadcn, `apiFetch`
**Requirement**: AUTH-09, AUTH-03, AUTH-06

**Done when**:

- [ ] `app-header.tsx` e o teste existente `app-header.test.tsx` atualizados
- [ ] Testes em `e2e/header.spec.ts`: `cabeçalho › sem sessão mostra "Entrar", que leva a /entrar`, `› com sessão mostra o avatar com as iniciais e o menu com "Perfil" e "Sair"`, `› "Sair" encerra a sessão e leva a /entrar` e `› mostra a foto do Google no avatar de conta Google`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 48 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): show user menu in header`

---

#### T37: Criar a página /perfil com nome e opt-in

**What**: Página protegida (`requireUser('/perfil')`) com nome, e-mail, foto ou iniciais e o opt-in de marketing; salvar o nome e ligar/desligar o opt-in.
**Where**: `apps/web/src/app/perfil/page.tsx`
**Depends on**: T36
**Reuses**: `requireUser`, `apiFetch`, componentes do shadcn
**Requirement**: AUTH-06, AUTH-09

**Done when**:

- [ ] Testes em `e2e/profile.spec.ts`: `perfil › sem sessão leva a /entrar e volta a /perfil depois do login`, `› mostra nome, e-mail, iniciais e o opt-in`, `› salvar o nome muda o menu do avatar`, `› recusa nome vazio mantendo o anterior` e `› desligar o marketing grava o estado`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 53 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): add profile page`

---

#### T38: Adicionar a troca de senha ao perfil

**What**: Formulário com senha atual (escondida para conta sem senha) e senha nova; mostra "Senha alterada." ou "Senha atual incorreta.".
**Where**: `apps/web/src/app/perfil/password-form.tsx`
**Depends on**: T37
**Reuses**: `apiFetch`
**Requirement**: AUTH-07

**Done when**:

- [ ] Testes em `e2e/profile.spec.ts`: `perfil › troca a senha e continua logado`, `› mostra "Senha atual incorreta." com a senha atual errada` e `› conta Google cria a senha sem pedir a atual`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 56 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): change password from profile`

---

#### T39: Adicionar a troca de e-mail e sair de todos os dispositivos ao perfil

**What**: Formulário de e-mail novo e senha atual, com "Enviamos um link para X." ou o pedido para criar uma senha antes; botão "Sair de todos os dispositivos", que leva a `/entrar`.
**Where**: `apps/web/src/app/perfil/account-security.tsx`
**Depends on**: T38
**Reuses**: `apiFetch`
**Requirement**: AUTH-12, AUTH-13

**Done when**:

- [ ] Testes em `e2e/profile.spec.ts`: `perfil › pedir a troca de e-mail mostra "Enviamos um link para X."`, `› conta sem senha vê o pedido para criar uma senha antes de trocar o e-mail` e `› "Sair de todos os dispositivos" encerra as duas sessões e leva a /entrar`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 59 e2e tests pass

**Tests**: e2e
**Gate**: e2e

**Commit**: `feat(web): change email and sign out everywhere from profile`

---

## Checks

**C1** - Cadastro válido cria a conta não confirmada, grava data e versão dos termos e responde com o e-mail; a tela mostra "Enviamos um e-mail para X. Abra o link para confirmar sua conta." (AUTH-01, AC 1)
Proof: run api | ✓ cadastro > cria a conta não confirmada com a data e a versão dos termos e responde 202 com o e-mail
Proof: run e2e | ✓ cadastro › cria a conta e mostra "Enviamos um e-mail para X. Abra o link para confirmar sua conta."

**C2** - O e-mail de confirmação é enfileirado na mesma transação do cadastro (AUTH-01, AC 2)
Proof: run api | ✓ cadastro > enfileira o e-mail de confirmação na mesma transação

**C3** - Caixa de marketing marcada grava o opt-in com a data; desmarcada, sem opt-in (AUTH-01, AC 3)
Proof: run api | ✓ cadastro > grava o opt-in de marketing com a data quando a caixa vem marcada
Proof: run api | ✓ cadastro > grava a conta sem opt-in quando a caixa vem desmarcada

**C4** - Sem a caixa de termos, 400 e nenhuma conta (AUTH-01, AC 4)
Proof: run api | ✓ cadastro > recusa com 400 sem a caixa de termos

**C5** - Senha com 7 ou 129 caracteres, 400 e nenhuma conta (AUTH-01, AC 5)
Proof: run api | ✓ cadastro > recusa com 400 senha de 7 ou de 129 caracteres
Proof: run e2e | ✓ cadastro › mostra o erro do campo para senha com menos de 8 caracteres

**C6** - Nome vazio depois do trim ou com 81 caracteres, 400 e nenhuma conta (AUTH-01, AC 6)
Proof: run api | ✓ cadastro > recusa com 400 nome vazio depois do trim ou com 81 caracteres

**C7** - E-mail inválido, 400 e nenhuma conta (AUTH-01, AC 7)
Proof: run api | ✓ cadastro > recusa com 400 e-mail inválido

**C8** - E-mail já cadastrado, com outra caixa de letras, recebe a mesma resposta, a conta não muda e o dono recebe o aviso "já tem conta" com "Entrar" e "Redefinir senha" (AUTH-01, AC 8)
Proof: run api | ✓ cadastro > responde igual para e-mail já cadastrado com outra caixa de letras, sem mudar a conta, e enfileira o aviso já tem conta
Proof: run api | ✓ e-mails da conta > já tem conta tem o assunto "Você já tem uma conta no Amigo Secreto" e os botões "Entrar" e "Redefinir senha"
Proof: run e2e | ✓ cadastro › mostra a mesma tela para um e-mail já cadastrado

**C9** - O cadastro não abre sessão (AUTH-01, AC 9)
Proof: run api | ✓ cadastro > não abre sessão

**C10** - A senha fica guardada só como hash argon2id (AUTH-01, AC 10)
Proof: run api | ✓ cadastro > guarda a senha como hash argon2id
Proof: run api | ✓ PasswordHasher > gera hash argon2id no formato PHC com m=19456, t=2 e p=1

**C11** - O link de confirmação válido confirma o e-mail, abre a sessão e leva ao destino ou a `/perfil` (AUTH-02, AC 1)
Proof: run api | ✓ confirmação de e-mail > confirma o e-mail, abre a sessão e devolve o destino do cadastro
Proof: run api | ✓ confirmação de e-mail > devolve /perfil como destino quando o cadastro não tinha origem
Proof: run e2e | ✓ confirmação de e-mail › o link do e-mail confirma, abre a sessão e leva ao perfil

**C12** - Confirmar emite `user.email_verified` (AUTH-02, AC 2)
Proof: run api | ✓ confirmação de e-mail > emite user.email_verified
Proof: run api | ✓ recuperação de senha > emite user.email_verified quando a conta não tinha o e-mail confirmado

**C13** - Link de confirmação vencido, usado ou substituído mostra "Este link expirou ou já foi usado.", com "Reenviar e-mail" para quem está logado sem confirmar (AUTH-02, AC 3)
Proof: run api | ✓ confirmação de e-mail > responde 410 a link vencido
Proof: run api | ✓ confirmação de e-mail > responde 410 a link usado
Proof: run api | ✓ confirmação de e-mail > responde 410 a link substituído por um reenvio
Proof: run e2e | ✓ confirmação de e-mail › o link aberto de novo mostra "Este link expirou ou já foi usado."
Proof: run e2e | ✓ confirmação de e-mail › o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar

**C14** - Logado sem confirmar vê a faixa "Confirme seu e-mail: enviamos um link para X." com "Reenviar e-mail" (AUTH-02, AC 4)
Proof: run e2e | ✓ faixa de confirmação › aparece para quem entrou sem confirmar com "Confirme seu e-mail: enviamos um link para X."
Proof: run e2e | ✓ faixa de confirmação › some depois da confirmação

**C15** - "Reenviar e-mail" invalida o link anterior, enfileira outro e mostra "Enviamos um novo link para X." (AUTH-02, AC 5)
Proof: run api | ✓ confirmação de e-mail > reenvio invalida o link anterior e enfileira um novo
Proof: run api | ✓ confirmação de e-mail > reenvio exige sessão
Proof: run e2e | ✓ faixa de confirmação › "Reenviar e-mail" mostra "Enviamos um novo link para X."

**C16** - Os links por e-mail são de uso único e guardados só como hash (AUTH-02, AC 6; AUTH-05, AC 7)
Proof: run api | ✓ AuthTokensService > guarda só o SHA-256 do token
Proof: run api | ✓ AuthTokensService > consome o token uma vez só
Proof: run api | ✓ AuthTokensService > consome o mesmo token uma vez só com duas transações simultâneas
Proof: run api | ✓ AuthTokensService > recusa o token de outro tipo

**C17** - Login com a senha certa abre a sessão no cookie `sid` (`HttpOnly`, `SameSite=Lax`, `Secure` em produção) e leva ao destino ou a `/perfil` (AUTH-03, AC 1)
Proof: run api | ✓ login e logout > abre a sessão com a senha certa e devolve o usuário
Proof: run api | ✓ SessionsService > abre a sessão com o cookie sid HttpOnly, SameSite=Lax, Path=/ e Max-Age de 30 dias
Proof: run api | ✓ SessionsService > marca o cookie Secure em production
Proof: run e2e | ✓ login › entra com a senha certa e cai em /perfil

**C18** - E-mail sem conta, senha errada ou conta sem senha recebem 401 "E-mail ou senha incorretos." (AUTH-03, AC 2)
Proof: run api | ✓ login e logout > responde 401 "E-mail ou senha incorretos." a e-mail sem conta
Proof: run api | ✓ login e logout > responde 401 "E-mail ou senha incorretos." a senha errada
Proof: run api | ✓ login e logout > responde 401 "E-mail ou senha incorretos." a conta só Google
Proof: run api | ✓ PasswordHasher > verifica contra o hash fixo e devolve false quando não há hash guardado
Proof: run e2e | ✓ login › mostra "E-mail ou senha incorretos." com a senha errada

**C19** - A sessão acaba 30 dias depois do último uso gravado; o uso é gravado quando o anterior tem mais de 1 hora (AUTH-03, AC 3)
Proof: run api | ✓ SessionsService > ignora a sessão com expiresAt no passado
Proof: run api | ✓ SessionsService > grava o uso e renova expiresAt para 30 dias quando o último uso tem mais de 1 hora
Proof: run api | ✓ SessionsService > não grava o uso quando o último uso tem menos de 1 hora

**C20** - "Sair" encerra a sessão no banco, apaga o cookie e leva a `/entrar` (AUTH-03, AC 4)
Proof: run api | ✓ login e logout > encerra a sessão e apaga o cookie no logout
Proof: run e2e | ✓ cabeçalho › "Sair" encerra a sessão e leva a /entrar

**C21** - Cookie de sessão encerrada, vencida ou desconhecida é tratado como anônimo (AUTH-03, AC 5)
Proof: run api | ✓ guard de sessão > responde 401 com o cookie de uma sessão encerrada, vencida ou desconhecida

**C22** - A sessão fica no banco só pelo hash do token (AUTH-03, AC 6)
Proof: run api | ✓ SessionsService > guarda só o SHA-256 do token

**C23** - Logado que abre `/entrar` ou `/cadastro` vai direto ao destino (AUTH-03, AC 7)
Proof: run e2e | ✓ login › leva a pessoa logada que abre /entrar direto ao destino
Proof: run e2e | ✓ cadastro › leva a pessoa logada que abre /cadastro direto ao destino

**C24** - Conta já vinculada ao Google entra e vai ao destino (AUTH-04, AC 1)
Proof: run api | ✓ login com Google > abre a sessão da conta já vinculada e leva ao destino

**C25** - E-mail verificado sem conta vai à tela "Complete seu cadastro" com o nome do Google editável, termos e marketing (AUTH-04, AC 2)
Proof: run api | ✓ login com Google > leva e-mail verificado sem conta a /completar-cadastro com o cookie g_signup
Proof: run e2e | ✓ login com Google › e-mail novo passa por "Complete seu cadastro" com o nome do Google e entra

**C26** - Enviar "Complete seu cadastro" cria a conta confirmada, vinculada e com a foto, emite `user.registered` `google`, abre a sessão e leva ao destino (AUTH-04, AC 3)
Proof: run api | ✓ completar cadastro com Google > cria a conta confirmada, vinculada e com a foto do Google, abre a sessão e devolve o destino
Proof: run api | ✓ completar cadastro com Google > recusa com 400 sem a caixa de termos
Proof: run api | ✓ completar cadastro com Google > grava o opt-in de marketing quando a caixa vem marcada
Proof: run api | ✓ completar cadastro com Google > responde 401 sem o cookie g_signup, com ele vencido ou adulterado

**C27** - E-mail verificado com conta sem Google é vinculado, confirmado, entra e recebe o aviso "Conta Google vinculada ao Amigo Secreto" (AUTH-04, AC 4)
Proof: run api | ✓ login com Google > vincula a conta com senha de e-mail verificado, confirma o e-mail, abre a sessão e enfileira o aviso de Google vinculado
Proof: run api | ✓ e-mails da conta > Google vinculado tem o assunto "Conta Google vinculada ao Amigo Secreto"

**C28** - E-mail não verificado no Google mostra "Não foi possível entrar com Google. Entre com e-mail e senha." sem criar, vincular nem abrir sessão (AUTH-04, AC 5)
Proof: run api | ✓ login com Google > recusa e-mail não verificado com erro=google_nao_verificado sem criar, vincular nem abrir sessão
Proof: run e2e | ✓ login com Google › e-mail não verificado volta a /entrar com "Não foi possível entrar com Google. Entre com e-mail e senha."

**C29** - Cancelar ou retorno inválido do Google volta a `/entrar` com "Não foi possível entrar com Google. Tente de novo." (AUTH-04, AC 6)
Proof: run api | ✓ login com Google > volta a /entrar com erro=google quando o state difere do cookie
Proof: run api | ✓ login com Google > volta a /entrar com erro=google quando a pessoa cancela no Google
Proof: run api | ✓ login com Google > volta a /entrar com erro=google quando o Google recusa o code
Proof: run api | ✓ GoogleOidcClient > recusa id_token com aud de outro cliente
Proof: run api | ✓ GoogleOidcClient > recusa id_token com iss fora do Google
Proof: run api | ✓ GoogleOidcClient > recusa id_token vencido
Proof: run api | ✓ GoogleOidcClient > falha em 10 segundos quando o Google não responde
Proof: run e2e | ✓ login com Google › cancelar no Google volta a /entrar com "Não foi possível entrar com Google. Tente de novo."

**C30** - Cada login pelo Google atualiza a foto da conta (AUTH-04, AC 7)
Proof: run api | ✓ login com Google > atualiza a foto da conta vinculada a cada login

**C31** - Sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` fora de produção, o botão do Google some (AUTH-04, AC 8)
Proof: run api | ✓ login com Google > GET /auth/session informa googleEnabled false sem GOOGLE_CLIENT_ID fora de production
Proof: run api | ✓ login com Google > start responde 404 sem Google configurado
Proof: run web | ✓ GoogleButton > não aparece com googleEnabled false

**C32** - Em produção, a API não sobe sem `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET`, citando a variável (AUTH-04, AC 9)
Proof: run api | ✓ validateEnvironment > lança erro que nomeia GOOGLE_CLIENT_ID quando ela falta em production
Proof: run api | ✓ validateEnvironment > lança erro que nomeia GOOGLE_CLIENT_SECRET quando ela falta em production

**C33** - "Esqueci a senha" mostra "Se houver uma conta com X, enviamos um link para redefinir a senha." com ou sem conta (AUTH-05, AC 1)
Proof: run api | ✓ recuperação de senha > responde 202 igual com e sem conta
Proof: run e2e | ✓ recuperação de senha › mostra "Se houver uma conta com X, enviamos um link para redefinir a senha." com e sem conta

**C34** - Com conta, invalida o link anterior e enfileira "Redefina sua senha do Amigo Secreto" com link de 1 hora (AUTH-05, AC 2)
Proof: run api | ✓ recuperação de senha > enfileira o e-mail com link de 1 hora e invalida o anterior
Proof: run api | ✓ e-mails da conta > recuperação tem o assunto "Redefina sua senha do Amigo Secreto" e o botão "Redefinir senha" com o link
Proof: run api | ✓ AuthTokensService > vence em 7 dias a confirmação, em 1 hora a recuperação e em 7 dias a troca de e-mail

**C35** - Sem conta, nenhum e-mail é enfileirado (AUTH-05, AC 3)
Proof: run api | ✓ recuperação de senha > não enfileira e-mail para e-mail sem conta

**C36** - Redefinir com link válido troca a senha, confirma o e-mail, encerra todas as sessões, abre outra, leva ao destino e enfileira o aviso (AUTH-05, AC 4)
Proof: run api | ✓ recuperação de senha > troca a senha, confirma o e-mail, encerra todas as sessões e abre uma nova
Proof: run api | ✓ recuperação de senha > enfileira o aviso de senha alterada
Proof: run api | ✓ recuperação de senha > recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres
Proof: run e2e | ✓ recuperação de senha › o link troca a senha e entra

**C37** - Link de recuperação vencido, usado ou substituído mostra "Este link expirou ou já foi usado." com o caminho para `/esqueci-a-senha` (AUTH-05, AC 5)
Proof: run api | ✓ recuperação de senha > responde 410 a link com mais de 1 hora
Proof: run api | ✓ recuperação de senha > responde 410 a link usado
Proof: run api | ✓ recuperação de senha > responde 410 a link substituído por um pedido mais novo
Proof: run e2e | ✓ recuperação de senha › o link usado mostra "Este link expirou ou já foi usado." com o caminho para /esqueci-a-senha

**C38** - Conta só Google cria a senha pela recuperação e passa a entrar com e-mail e senha (AUTH-05, AC 6)
Proof: run api | ✓ recuperação de senha > cria a senha de uma conta só Google, que passa a entrar com e-mail e senha

**C39** - `/perfil` mostra nome, e-mail, foto ou iniciais e o opt-in (AUTH-06, AC 1)
Proof: run api | ✓ perfil > GET /users/me devolve nome, e-mail, foto e opt-in
Proof: run e2e | ✓ perfil › mostra nome, e-mail, iniciais e o opt-in

**C40** - Salvar um nome válido grava e mostra no perfil e no menu do avatar (AUTH-06, AC 2)
Proof: run api | ✓ perfil > PATCH grava o nome sem os espaços das pontas
Proof: run e2e | ✓ perfil › salvar o nome muda o menu do avatar

**C41** - Nome vazio ou com 81 caracteres, 400 e o anterior fica (AUTH-06, AC 3)
Proof: run api | ✓ perfil > PATCH recusa com 400 nome vazio ou com 81 caracteres e mantém o anterior
Proof: run e2e | ✓ perfil › recusa nome vazio mantendo o anterior

**C42** - Ligar ou desligar o marketing grava o estado com a data (AUTH-06, AC 4)
Proof: run api | ✓ perfil > PATCH grava o opt-in com a data da mudança
Proof: run e2e | ✓ perfil › desligar o marketing grava o estado

**C43** - Sem foto do Google, as iniciais aparecem no lugar (AUTH-06, AC 5)
Proof: run e2e | ✓ cabeçalho › com sessão mostra o avatar com as iniciais e o menu com "Perfil" e "Sair"
Proof: run e2e | ✓ cabeçalho › mostra a foto do Google no avatar de conta Google

**C44** - Trocar a senha com a atual certa mantém a sessão atual, encerra as outras e avisa (AUTH-07, AC 1)
Proof: run api | ✓ troca de senha > troca a senha, mantém a sessão atual e encerra as outras
Proof: run api | ✓ troca de senha > enfileira o aviso de senha alterada
Proof: run api | ✓ e-mails da conta > senha alterada tem o assunto "Sua senha do Amigo Secreto foi alterada"
Proof: run e2e | ✓ perfil › troca a senha e continua logado

**C45** - Senha atual errada, 400 "Senha atual incorreta." e nada muda (AUTH-07, AC 2)
Proof: run api | ✓ troca de senha > recusa com 400 "Senha atual incorreta." sem mudar nada
Proof: run e2e | ✓ perfil › mostra "Senha atual incorreta." com a senha atual errada

**C46** - Conta só Google cria a senha sem a atual, com os mesmos efeitos (AUTH-07, AC 3)
Proof: run api | ✓ troca de senha > cria a senha de conta só Google sem pedir a atual
Proof: run e2e | ✓ perfil › conta Google cria a senha sem pedir a atual

**C47** - Senha nova fora de 8 a 128 caracteres, 400 e nada muda (AUTH-07, AC 4)
Proof: run api | ✓ troca de senha > recusa com 400 senha nova com menos de 8 ou mais de 128 caracteres

**C48** - As features marcam rotas autenticadas e leem o usuário da sessão (AUTH-08, AC 1)
Proof: run api | ✓ guard de sessão > entrega o usuário da sessão à rota por @CurrentUser
Proof: run api | ✓ guard de sessão > deixa passar a rota com @Public sem sessão
Proof: run api | ✓ guard de sessão > mantém GET /health público

**C49** - Rota autenticada sem sessão válida responde 401 (AUTH-08, AC 2)
Proof: run api | ✓ guard de sessão > responde 401 numa rota protegida sem cookie

**C50** - `POST`, `PUT`, `PATCH` e `DELETE` sem a prova anti-CSRF válida respondem 403 sem executar (AUTH-08, AC 3)
Proof: run api | ✓ proteção CSRF > responde 403 a POST sem X-CSRF-Token
Proof: run api | ✓ proteção CSRF > responde 403 quando o cabeçalho difere do cookie
Proof: run api | ✓ proteção CSRF > responde 403 a token emitido para outra sessão
Proof: run api | ✓ proteção CSRF > aceita POST com o token da sessão atual
Proof: run api | ✓ proteção CSRF > exige o token em PUT, PATCH e DELETE
Proof: run api | ✓ proteção CSRF > não exige o token em GET
Proof: run api | ✓ GET /auth/session > grava o cookie csrf legível pelo site
Proof: run api | ✓ login e logout > troca o token CSRF ao abrir e ao encerrar a sessão
Proof: run web | ✓ apiFetch > manda X-CSRF-Token com o valor do cookie csrf
Proof: run web | ✓ apiFetch > busca /api/auth/session antes quando falta o cookie csrf
Proof: run web | ✓ apiFetch > busca um token novo e repete uma vez quando recebe 403

**C51** - Login acima de 10 por e-mail ou 30 por IP em 15 minutos responde 429 com "Muitas tentativas. Tente de novo em N minutos." sem verificar a senha (AUTH-08, AC 4)
Proof: run api | ✓ login e logout > responde 429 na 11ª tentativa do mesmo e-mail em 15 minutos sem verificar a senha
Proof: run api | ✓ login e logout > responde 429 na 31ª tentativa do mesmo IP em 15 minutos
Proof: run api | ✓ login e logout > conta as tentativas pelo IP do X-Forwarded-For com TRUST_PROXY_HOPS 1
Proof: run api | ✓ RateLimitService > lança 429 com "Muitas tentativas. Tente de novo em N minutos." quando uma regra estoura
Proof: run e2e | ✓ login › mostra "Muitas tentativas. Tente de novo em 15 minutos." na 11ª tentativa

**C52** - Cadastro, "esqueci a senha" e reenvio acima de 5 por e-mail ou 20 por IP em 1 hora respondem 429 sem enfileirar e-mail (AUTH-08, AC 5)
Proof: run api | ✓ cadastro > responde 429 no 6º cadastro do mesmo e-mail em 1 hora sem enfileirar e-mail
Proof: run api | ✓ cadastro > responde 429 no 21º cadastro do mesmo IP em 1 hora
Proof: run api | ✓ recuperação de senha > responde 429 no 6º pedido do mesmo e-mail em 1 hora sem enfileirar e-mail
Proof: run api | ✓ confirmação de e-mail > responde 429 no 6º reenvio em 1 hora

**C53** - Os limites valem somados entre instâncias (AUTH-08, AC 6)
Proof: run api | ✓ RateLimitService > soma as tentativas de duas conexões ao mesmo tempo sem perder nenhuma
Proof: run api | ✓ RateLimitService > permite até o limite e recusa a tentativa seguinte na mesma janela
Proof: run api | ✓ RateLimitService > reinicia a contagem quando a janela vence
Proof: run api | ✓ RateLimitService > devolve o tempo que falta para a janela vencer
Proof: run api | ✓ RateLimitService > guarda o e-mail só como SHA-256 na chave
Proof: run api | ✓ validateEnvironment > lança erro que nomeia TRUST_PROXY_HOPS quando ela falta em production

**C54** - Senha, token de sessão, token de link e cookie nunca vão a log, Sentry ou resposta de erro (AUTH-08, AC 7)
Proof: run api | ✓ sigilo da conta > não escreve senha, token de sessão, token de link nem cookie no log
Proof: run api | ✓ sigilo da conta > não manda senha, token nem cookie ao Sentry num erro 500
Proof: run api | ✓ sigilo da conta > não devolve senha nem token nas respostas de erro 400
Proof: run api | ✓ validateEnvironment > lança erro que nomeia AUTH_SECRET quando ela falta em production

**C55** - Nenhuma resposta inclui hash de senha ou de token (AUTH-08, AC 8)
Proof: run api | ✓ sigilo da conta > não devolve hash de senha nem de token nas respostas da conta
Proof: run api | ✓ GET /auth/session > devolve o usuário da sessão sem hash de senha nem de token
Proof: run api | ✓ GET /auth/session > devolve user null sem sessão

**C56** - Sem sessão, página protegida leva a `/entrar` com o caminho como origem e volta depois do login (AUTH-09, AC 1; AUTH-09, AC 6)
Proof: run web | ✓ requireUser > redireciona a /entrar com o caminho como next quando não há usuário
Proof: run web | ✓ getCurrentUser > repassa o cookie da requisição a API_INTERNAL_URL/auth/session sem cache
Proof: run web | ✓ getCurrentUser > devolve null sem sessão
Proof: run e2e | ✓ perfil › sem sessão leva a /entrar e volta a /perfil depois do login
Proof: run e2e | ✓ login › volta à página de origem depois do login

**C57** - Origem que não é caminho do próprio site é trocada por `/perfil` (AUTH-09, AC 2)
Proof: run web | ✓ safeNext > aceita um caminho do próprio site com query
Proof: run web | ✓ safeNext > troca por /perfil um caminho que começa com //
Proof: run web | ✓ safeNext > troca por /perfil um caminho que começa com /\
Proof: run web | ✓ safeNext > troca por /perfil um endereço com esquema
Proof: run web | ✓ safeNext > troca por /perfil um valor ausente
Proof: run api | ✓ login com Google > troca por /perfil um destino de outro site
Proof: run api | ✓ cadastro > troca por /perfil um destino de outro site

**C58** - Sem sessão, o cabeçalho mostra "Entrar", que leva a `/entrar` (AUTH-09, AC 3)
Proof: run e2e | ✓ cabeçalho › sem sessão mostra "Entrar", que leva a /entrar

**C59** - Com sessão, o cabeçalho mostra o avatar com menu "Perfil" e "Sair" (AUTH-09, AC 4)
Proof: run e2e | ✓ cabeçalho › com sessão mostra o avatar com as iniciais e o menu com "Perfil" e "Sair"

**C60** - Chamada do site com 401 leva a `/entrar` com o caminho atual (AUTH-09, AC 5)
Proof: run web | ✓ apiFetch > leva a /entrar com o caminho atual quando recebe 401

**C61** - `/termos` e `/privacidade` mostram título, versão vigente e texto provisório (AUTH-10, AC 1)
Proof: run e2e | ✓ termos › /termos mostra o título, a versão vigente e o texto provisório
Proof: run e2e | ✓ termos › /privacidade mostra o título, a versão vigente e o texto provisório

**C62** - A caixa de termos do cadastro e de "Complete seu cadastro" tem links para `/termos` e `/privacidade` (AUTH-10, AC 2)
Proof: run e2e | ✓ cadastro › a caixa de termos tem links para /termos e /privacidade
Proof: run e2e | ✓ login com Google › e-mail novo passa por "Complete seu cadastro" com o nome do Google e entra

**C63** - Cadastro por senha emite `user.registered` com `method` `password` e o id (AUTH-11, AC 1)
Proof: run api | ✓ cadastro > emite user.registered com method password e o id, sem e-mail nem nome

**C64** - Cadastro pelo Google emite `user.registered` com `method` `google` e o id (AUTH-11, AC 2)
Proof: run api | ✓ completar cadastro com Google > emite user.registered com method google e o id, sem e-mail nem nome

**C65** - Os eventos da `auth` não levam e-mail nem nome (AUTH-11, AC 3)
Proof: run api | ✓ cadastro > emite user.registered com method password e o id, sem e-mail nem nome
Proof: run api | ✓ completar cadastro com Google > emite user.registered com method google e o id, sem e-mail nem nome

**C66** - Pedir a troca com a senha certa enfileira o link de 7 dias no novo, o aviso no atual e mostra "Enviamos um link para X." (AUTH-12, AC 1)
Proof: run api | ✓ troca de e-mail > enfileira o link para o e-mail novo e o aviso para o atual e responde com o e-mail novo
Proof: run api | ✓ e-mails da conta > novo e-mail tem o assunto "Confirme seu novo e-mail no Amigo Secreto" e o botão "Confirmar novo e-mail" com o link
Proof: run api | ✓ e-mails da conta > e-mail antigo tem o assunto "Pedido de troca de e-mail no Amigo Secreto"
Proof: run e2e | ✓ perfil › pedir a troca de e-mail mostra "Enviamos um link para X."

**C67** - Até a confirmação, o e-mail atual vale para login e avisos (AUTH-12, AC 2)
Proof: run api | ✓ troca de e-mail > mantém o e-mail atual para login até a confirmação

**C68** - O link do e-mail novo troca o e-mail da conta, já confirmado (AUTH-12, AC 3)
Proof: run api | ✓ troca de e-mail > troca o e-mail pelo novo, já confirmado, ao confirmar o link
Proof: run e2e | ✓ confirmação de e-mail › o link de troca de e-mail troca o e-mail mostrado no perfil

**C69** - Se o e-mail novo ganhou conta, o link mostra "Este e-mail já está em uso por outra conta." e nada muda (AUTH-12, AC 4)
Proof: run api | ✓ troca de e-mail > responde 409 "Este e-mail já está em uso por outra conta." quando o e-mail novo ganhou conta
Proof: run e2e | ✓ confirmação de e-mail › o link de troca para um e-mail em uso mostra "Este e-mail já está em uso por outra conta."

**C70** - Senha atual errada na troca de e-mail, 400 "Senha atual incorreta." sem e-mail (AUTH-12, AC 5)
Proof: run api | ✓ troca de e-mail > recusa com 400 "Senha atual incorreta." sem enfileirar e-mail

**C71** - Conta sem senha é orientada a criar uma senha antes de trocar o e-mail (AUTH-12, AC 6)
Proof: run api | ✓ troca de e-mail > recusa conta sem senha pedindo para criar uma senha antes
Proof: run e2e | ✓ perfil › conta sem senha vê o pedido para criar uma senha antes de trocar o e-mail

**C72** - Link de troca vencido, usado ou substituído mostra "Este link expirou ou já foi usado." (AUTH-12, AC 7)
Proof: run api | ✓ troca de e-mail > responde 410 a link vencido
Proof: run api | ✓ troca de e-mail > responde 410 a link usado
Proof: run api | ✓ troca de e-mail > responde 410 a link substituído por um pedido mais novo

**C73** - "Sair de todos os dispositivos" encerra todas as sessões, inclusive a atual, e leva a `/entrar` (AUTH-13, AC 1)
Proof: run api | ✓ login e logout > encerra todas as sessões em sair de todos os dispositivos
Proof: run e2e | ✓ perfil › "Sair de todos os dispositivos" encerra as duas sessões e leva a /entrar

**C74** - No navegador interno do WhatsApp, Instagram ou Facebook, "Entrar com Google" dá lugar à orientação com "Copiar link" (AUTH-14, AC 1)
Proof: run web | ✓ isInAppBrowser > reconhece o navegador do WhatsApp
Proof: run web | ✓ isInAppBrowser > reconhece o navegador do Instagram
Proof: run web | ✓ isInAppBrowser > reconhece o navegador do Facebook pelo FBAN e pelo FBAV
Proof: run web | ✓ isInAppBrowser > não reconhece o Chrome nem o Safari do celular
Proof: run web | ✓ GoogleButton > mostra a orientação e "Copiar link" no lugar do botão no navegador interno
Proof: run web | ✓ GoogleButton > leva a /api/auth/google/start com o destino

**C75** - "Copiar link" copia o endereço e mostra "Link copiado." (AUTH-14, AC 2)
Proof: run web | ✓ GoogleButton > copia o endereço da página e mostra "Link copiado."

**C76** - No navegador interno, o formulário de e-mail e senha continua funcionando (AUTH-14, AC 3)
Proof: run e2e | ✓ login › com o user agent do WhatsApp mostra a orientação no lugar do Google e o formulário continua funcionando

**C77** - Dois cadastros simultâneos do mesmo e-mail criam uma conta só e respondem igual (Edge Cases)
Proof: run api | ✓ cadastro > cria uma conta só com dois cadastros simultâneos do mesmo e-mail
Proof: run api | ✓ cadastro > guarda o e-mail sem espaços nas pontas e em minúsculas

**C78** - Link de confirmação aberto depois de confirmar por outro caminho mostra "Este link expirou ou já foi usado." (Edge Cases)
Proof: run api | ✓ confirmação de e-mail > responde 410 ao link de quem já confirmou por outro caminho

**C79** - Trocar a senha mantém válido o link de recuperação pendente (Edge Cases)
Proof: run api | ✓ troca de senha > mantém válido o link de recuperação pendente

**C80** - Dois navegadores mantêm duas sessões independentes (Edge Cases)
Proof: run api | ✓ login e logout > mantém duas sessões independentes em dois logins
Proof: run api | ✓ SessionsService > encerra todas as sessões do usuário menos a informada

**C81** - Origem `/entrar` ou `/cadastro` vira `/perfil` (Edge Cases)
Proof: run web | ✓ safeNext > troca por /perfil os caminhos /entrar e /cadastro

**C82** - As variáveis da conta faltando fora de produção têm padrão, com `WEB_URL` `http://localhost:3000` (assumptions da spec)
Proof: run api | ✓ validateEnvironment > aceita as variáveis da conta ausentes fora de production, com WEB_URL http://localhost:3000

**C83** - Os e-mails da conta formam o link com o assunto e o botão aprovados (assumptions da spec)
Proof: run api | ✓ e-mails da conta > confirmação tem o assunto "Confirme seu e-mail no Amigo Secreto" e o botão "Confirmar e-mail" com o link
Proof: run api | ✓ PasswordHasher > verifica a senha certa
Proof: run api | ✓ PasswordHasher > recusa a senha errada

**C84** - O retorno do Google e o cliente OIDC seguem o fluxo com PKCE e cookies assinados (design)
Proof: run api | ✓ GoogleOidcClient > monta a URL de autorização com client_id, redirect_uri, scope openid email profile, state e code_challenge S256
Proof: run api | ✓ GoogleOidcClient > troca o code com code_verifier e client secret e devolve sub, e-mail, email_verified, nome e foto
Proof: run api | ✓ login com Google > start redireciona ao Google e grava o cookie g_oauth com state, verifier e destino
Proof: run api | ✓ completar cadastro com Google > vincula em vez de criar quando o e-mail ganhou conta no meio-tempo

**C85** - As tabelas da conta existem com as restrições do design (design)
Proof: run api | ✓ tabela user > é criada pela migration com as colunas da conta
Proof: run api | ✓ tabela user > recusa dois e-mails iguais
Proof: run api | ✓ tabela user > recusa dois googleId iguais
Proof: run api | ✓ tabela user > é removida ao reverter a migration
Proof: run api | ✓ AuthTokensService > invalida o token não usado do mesmo tipo ao emitir outro
Proof: run api | ✓ AuthTokensService > recusa o token vencido

**C86** - O e2e roda contra os provedores falsos (infraestrutura de teste)
Proof: run e2e | ✓ provedores falsos › o e-mail enfileirado pela API chega à caixa falsa

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** (2026-11-20, T1) colunas da tabela `user` sem tamanho no design: `termsVersion` varchar(20), `passwordHash` e `avatarUrl` varchar sem limite - user: "Manter assim (Recomendado)"; `marketingOptIn` com default false no banco - user: "Default false (Recomendado)". Contagem inicial conferida: 106 testes na API antes da T1, 110 depois. (2026-11-20, T3) `AUTH_SECRET` fora de produção tem o padrão fixo `amigo-secreto-dev-auth-secret`; o `.env.example` traz `AUTH_SECRET=` vazio, e vazio conta como ausente, como em `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` - user: "Vazio = ausente (Recomendado)"; em produção `AUTH_SECRET` só precisa não ser vazia - user: "Só não vazia (Recomendado)"; a API do e2e recebe `AUTH_SECRET=e2e-auth-secret`, `GOOGLE_CLIENT_ID=e2e-google-client`, `GOOGLE_CLIENT_SECRET=e2e-google-secret`, `TRUST_PROXY_HOPS=0` e `WEB_URL=http://localhost:3000` - user: "Pode (Recomendado)". Os três testes de integração que sobem a API em production (`email-send`, `swagger`, `email-secrecy`) passaram a receber essas variáveis por `test/account-env.ts`, sem mudar asserção. (2026-11-20, T4) o 429 leva `Retry-After` por uma `TooManyAttemptsException` com `retryAfterSeconds`, que o `AllExceptionsFilter` grava como cabeçalho; o teste do 429 sobe uma rota de fixture e confere status, mensagem e cabeçalho - user: "Exceção + filtro (Recomendado)". Com N = 1 a mensagem é "Muitas tentativas. Tente de novo em 1 minuto."; spec e design atualizados - user: '"em 1 minuto" (Recomendado)'. (2026-11-20, T5) a resposta HTTP é tipada por um tipo local mínimo em `src/auth/cookies.ts` (`CookieResponse`), sem `@types/express` - user: "Tipo local mínimo (Recomendado)". `touch` recebe o token bruto do cookie (`touch(session, response, rawToken)`) para reenviar o `sid` - user: "Manter (Recomendado)"; o arquivo é `sessions.service.ts`, como a task e a classe; design corrigido - user: "sessions.service.ts (Recomendado)". (2026-11-20, T6) o 401 do guard responde `{ statusCode: 401, message: "Entre para continuar.", error: "Unauthorized" }` - user: '"Entre para continuar." (Recomendado)'. (2026-11-20, T7) `GET /auth/session` mantém o cookie `csrf` que já vale para a sessão atual e só emite outro quando ele falta ou não vale - user: "Mantém o atual (Recomendado)"; o cookie `csrf` tem `Max-Age` de 30 dias, como o `sid` - user: "30 dias, como o sid (Recomendado)"; o 403 responde `{ statusCode: 403, message: "Recarregue a página e tente de novo.", error: "Forbidden" }` - user: '"Recarregue a página e tente de novo." (Recomendado)'. O gate Build da T7 não subiu o e2e porque um container de outro projeto ocupava a porta 3000; o e2e passou a subir o site na porta própria 3200 (`playwright.config.ts`), em commit à parte antes da T7 - user: "Porta fixa própria (Recomendado)" e "Commit próprio antes da T7 (Recomendado)". O helper de `test/session-guard.int-spec.ts` passou a guardar só o cookie `sid`, porque abrir sessão agora grava também o `csrf`; nenhuma asserção mudou. (2026-11-20, T8) o arquivo é `auth-tokens.service.ts`, como a task e a classe; design corrigido - user: "auth-tokens.service.ts (Recomendado)"; a validade fica no serviço, por tipo (7 dias, 1 hora, 7 dias), e `issue` perde o `ttl`: `issue(userId, type, { newEmail?, next? }, manager)`; design corrigido - user: "No serviço, por tipo (Recomendado)". Colunas da `auth_token` sem tamanho no design: `type` enum do Postgres, `newEmail` varchar(254), `next` varchar sem limite, `tokenHash` char(64) único, índice em `userId` com FK `ON DELETE CASCADE` - user: "Aplicar assim (Recomendado)". (2026-11-20, T9) parágrafos e links dos e-mails da conta, todos abrindo com "Olá, {nome}." e links em `WEB_URL`: confirmação → `/confirmar-email?token=X`; já tem conta → "Entrar" `/entrar` e "Redefinir senha" `/esqueci-a-senha`; recuperação → `/redefinir-senha?token=X`; novo e-mail → `/confirmar-email?token=X&tipo=troca`; senha alterada, e-mail antigo (mostra o endereço novo) e Google vinculado sem botão; textos exatos em `src/auth/auth-emails.ts` e no teste - user: "Aprovar como está (Recomendado)". (2026-11-20, T10) a versão vigente dos termos é `TERMS_VERSION = '2026-11-19'` em `packages/shared`, lida pela API e pelo site - user: "packages/shared (Recomendado)"; o `safeNext` da API nasce na T10 em `src/auth/safe-next.ts`, com as mesmas regras do site (destino inválido ou ausente vira `/perfil`), e o cadastro grava no token o destino já validado; teste a mais `cadastro > troca por /perfil um destino de outro site` na C57, contagens da API das T10 a T20 somam 1, e a T16 reusa o arquivo - user: "Criar safeNext da API na T10 (Recomendado)"; a resposta `202 { email }` devolve o e-mail normalizado, e o aviso "já tem conta" cumprimenta com o nome da conta existente - user: "Normalizado + nome da conta (Recomendado)"; a corrida do cadastro usa `INSERT ... ON CONFLICT (email) DO NOTHING`, e sem linha devolvida segue o caminho "já tem conta" na mesma transação; as chaves do rate limit usam a rota `register` - user: "INSERT ... ON CONFLICT DO NOTHING (Recomendado)". (2026-11-20, T11) confirmar o e-mail encerra a sessão que o navegador já tinha (da mesma conta ou de outra) e abre a do dono do link - user: "Encerra a atual e abre a nova (Recomendado)"; reenvio para quem já confirmou responde 409 "Seu e-mail já está confirmado." sem emitir link - user: '409 "Seu e-mail já está confirmado." (Recomendado)'; o reenvio mantém o destino do link pendente (sem link pendente, `/perfil`), responde `202 { email }` e usa a rota `email-verification-link` nas chaves de rate limit - user: "Mantém o destino do link pendente + 202 { email } (Recomendado)". A T11 ganha os testes `> encerra a sessão que o navegador já tinha ao confirmar` e `> reenvio responde 409 "Seu e-mail já está confirmado." a quem já confirmou`; contagens da API das T11 a T20 somam 2. O teste `fronteira do Resend` recusa "resend" fora de `email/` e `config/`: a rota de reenvio passa a `POST /auth/email/verification-link`, o método a `sendVerificationLink` e a chave do rate limit a `email-verification-link`; design e T11 corrigidos - user: "Renomear a rota (Recomendado)". (2026-11-20, T12) o login encerra a sessão que o navegador já tinha, como a confirmação na T11 - user: "Encerra a anterior, como na T11 (Recomendado)"; o DTO do login exige e-mail válido (normalizado) e senha de 1 a 128 caracteres, e fora disso responde 400 antes do rate limit - user: "400 de validação (Recomendado)"; `logout-all` também troca o token CSRF, como o `logout` (AD-013); chaves do rate limit na rota `login`. A T12 ganha os testes `> encerra a sessão que o navegador já tinha ao entrar` e `> recusa com 400 e-mail inválido ou senha vazia sem contar tentativa`; contagens da API das T12 a T20 somam 2. (2026-11-20, T13) a recuperação segue as regras do cadastro e do login: `POST /auth/password/forgot { email, next? }` com e-mail normalizado e validado (400 se inválido), `next` pelo `safeNext` gravado no link, `202 { email }` com e sem conta e chave de rate limit `password-forgot`; `POST /auth/password/reset { token, password }` devolve `200 { next }` e também encerra a sessão de outra conta que o navegador tivesse; sem testes novos, o teste da troca de senha confere o destino e a sessão da outra conta - user: "Sim, as mesmas regras (Recomendado)". Toda confirmação de e-mail emite `user.email_verified` (AUTH-02 AC 2), inclusive a redefinição de senha e o vínculo do Google (T16), só na passagem de não confirmado para confirmado; a T13 ganha o teste `> emite user.email_verified quando a conta não tinha o e-mail confirmado` e as contagens da API das T13 a T20 somam 1 - user: "Sim, quando confirma agora (Recomendado)". (2026-11-20, T14) o gate Build da fase pegou no typecheck `const webUrl = this.config.get('WEB_URL', { infer: true })` como `string | undefined` nos serviços da T10, T11 e T13 (os gates por task não rodam typecheck); corrigido com `const webUrl: string` em commit próprio antes da T14 - user: "Commit próprio antes da T14 (Recomendado)"; daqui em diante cada task roda também `pnpm --filter @amigo-secreto/api typecheck`. No teste de sigilo, o Sentry manda além do evento um `client_report` do SDK (contagem de descartes); o teste conta os envelopes de evento e procura vazamento em todos.
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11 → T12 → T13 → T14
Phase 3:  T15 → T16 → T17 → T18 → T19 → T20
Phase 4:  T21 → T22 → T23 → T24 → T25 → T26
Phase 5:  T27 → T28 → T29 → T30 → T31 → T32
Phase 6:  T33 → T34 → T35 → T36 → T37 → T38 → T39
```

Execução inline, uma fase por vez, um PR por fase (AD-010); sem sub-agentes de lote.
