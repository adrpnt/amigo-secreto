# Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/01-foundation/design.md`
**Status**: Approved
**Approved**: 2026-11-12 - user: "Aprovo as tasks"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run api**: `pnpm turbo run test --force --filter=@amigo-secreto/api -- --reporter=verbose`
**Run web**: `pnpm turbo run test --force --filter=@amigo-secreto/web -- --reporter=verbose`
**Run e2e**: `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web`
**Run workspaces**: `pnpm -r exec node -p "require('./package.json').name"`
**Run graph**: `pnpm exec turbo run build --graph`
**Run testall**: `pnpm test --force`
**Run lint**: `pnpm lint --force`
**Run typecheck**: `pnpm typecheck --force`

Linhas esperadas das provas: o nome de cada teste é o que a check escreve; a task que cria o teste usa exatamente esse texto em `describe`/`it` (Vitest separa com `>`, o reporter `list` do Playwright com `›`). Para saídas de ferramenta (`turbo --graph`, `pnpm -r exec`), a primeira execução confere o formato; ajuste só de formato, sem mudar a afirmação, é registrado em `**Settled mid-build:**`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `.claude/rules/nest-api-coding-standards.md` e `.claude/rules/next-web-coding-standards.md` (nomes de `describe`/`it` em português; sem metas de cobertura). Sem testes no repositório: tipos de teste e ferramentas escolhidos pelo usuário (context.md); strong defaults aplicados à profundidade.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| API: config, banco (opções), observabilidade, filtro, eventos, Sentry | unit | Todos os ramos; 1:1 com os critérios; todo edge case listado | `apps/api/src/**/*.spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| API: rotas HTTP, `configureApp`, middleware, migrations | integration (supertest + Testcontainers) | Toda rota da task: sucesso + bordas + erros | `apps/api/test/**/*.int-spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project integration` |
| API: módulos, `main.ts`, configuração de build | none | Build gate | - | Build gate |
| Shared: tipos | none | Build gate (build + typecheck) | - | Build gate |
| Web: componentes e `lib` | unit (Vitest + Testing Library + jsdom) | 1:1 com os critérios; cada estado | `apps/web/src/**/*.test.ts?(x)` | `pnpm turbo run test --filter=@amigo-secreto/web` |
| Web: páginas e fluxos no navegador | e2e (Playwright + axe) | Cada estado de tela + acessibilidade nos dois temas | `apps/web/e2e/**/*.spec.ts` | `pnpm test:e2e` |
| Raiz, Compose, CI | none | Build gate + provas por comando ou walk | - | Build gate |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com testes unitários | API: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`; web: `pnpm turbo run test --filter=@amigo-secreto/web` |
| Full | Tasks com testes de integração da API | `pnpm test` |
| E2E | Tasks com testes Playwright | `pnpm test && pnpm test:e2e` |
| Build | Tasks de configuração e fim de cada fase | `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Ao fim de cada fase roda o gate Build.

### Phase 1: Raiz e shared

```
T1 → T2
```

### Phase 2: API, esqueleto e banco

```
T3 → T4 → T5 → T6
```

### Phase 3: API, base HTTP e observabilidade

```
T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 4: API, health e Swagger

```
T13 → T14
```

### Phase 5: Web, esqueleto, e2e e tema

```
T15 → T16 → T17 → T18 → T19
```

### Phase 6: Web, página, rewrite, Sentry, acessibilidade e CI

```
T20 → T21 → T22 → T23 → T24
```

---

## Task Breakdown

### Phase 1: Raiz e shared

#### T1: Configurar a raiz do monorepo

**What**: Criar a raiz do monorepo pnpm + Turborepo com scripts, versões fixas e configuração comum.
**Where**: raiz do repositório (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.nvmrc`, Prettier, `.gitignore`)
**Depends on**: None
**Reuses**: design.md, componente "Raiz do monorepo"
**Requirement**: FND-01

**Done when**:

- [x] `package.json` com `packageManager: "pnpm@12.18.0"`, `engines.node: "26"` e scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e` (via `turbo run`) e `format`
- [x] `.nvmrc` com `26`
- [x] `pnpm-workspace.yaml` com `apps/*` e `packages/*`; `turbo.json` com as tarefas do design
- [x] `tsconfig.base.json`, `.prettierrc.json`, `.prettierignore`
- [x] `.gitignore` ganha `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `playwright-report`, `test-results` e `.env`
- [x] Gate check passes: `pnpm install && pnpm build`

**Tests**: none
**Gate**: build

**Commit**: `chore: set up pnpm workspace and turborepo`

---

#### T2: Criar o pacote shared com os tipos do health check

**What**: Pacote `@amigo-secreto/shared` ESM, compilado para `dist/`, exportando `HealthStatus`, `HealthIndicatorStatus` e `HealthResponse`.
**Where**: `packages/shared/`
**Depends on**: T1
**Reuses**: `tsconfig.base.json`
**Requirement**: FND-01, FND-04

**Done when**:

- [x] `package.json` com `"type": "module"`, `exports` para `dist`, scripts `build`, `dev`, `lint`, `typecheck` e `test` (`vitest run --passWithNoTests`)
- [x] `src/index.ts` exporta os três tipos com união de strings (`'ok' | 'error'`, `'up' | 'down'`)
- [x] `eslint.config.mjs` com `typescript-eslint` (com tipos) e `eslint-config-prettier`
- [x] Gate check passes: `pnpm install && pnpm build && pnpm typecheck && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(shared): add health check contract types`

---

### Phase 2: API, esqueleto e banco

#### T3: Criar o esqueleto da API com validação do ambiente

**What**: App NestJS 12 ESM com builder SWC, Vitest (projeto `unit`) e `validateEnvironment` com `class-validator`.
**Where**: `apps/api/` (esqueleto) e `apps/api/src/config/env.validation.ts`
**Depends on**: T1
**Reuses**: `tsconfig.base.json`; convenções de `.claude/rules/nest-api-coding-standards.md`
**Requirement**: FND-01, FND-03

**Done when**:

- [x] `package.json` (`"type": "module"`, scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`), `nest-cli.json` com `builder: "swc"`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs`
- [x] `vitest.config.ts` com `unplugin-swc` e o projeto `unit` (`src/**/*.spec.ts`)
- [x] `main.ts` e `app.module.ts` com `ConfigModule.forRoot({ validate: validateEnvironment })`, ouvindo em `PORT`
- [x] Testes `validateEnvironment > lança erro que nomeia DATABASE_URL quando ela falta`, `> lança erro que nomeia DATABASE_URL quando ela não é uma URL postgres`, `> aplica PORT 3001 e NODE_ENV development por padrão`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 3 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): scaffold nestjs app with environment validation`

---

#### T4: Configurar TypeORM e a CLI de migrations

**What**: `databaseOptions` com `synchronize: false` e `migrationsRun: false`, `DatabaseModule`, `data-source.ts` da CLI e scripts `migration:*` sobre `dist/`.
**Where**: `apps/api/src/database/database.options.ts`
**Depends on**: T3
**Reuses**: `ConfigModule` de T3
**Requirement**: FND-03

**Done when**:

- [x] `databaseOptions(config)` usado pelo `DatabaseModule` e pelo `data-source.ts`
- [x] Scripts `migration:generate`, `migration:run` e `migration:revert` no `package.json` da API, rodando sobre `dist/database/data-source.js`
- [x] Pasta `src/database/migrations/` existe
- [x] Testes `databaseOptions > desliga synchronize em development, test e production` e `> não roda migrations ao iniciar`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 5 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): configure typeorm with explicit migrations`

---

#### T5: Adicionar o Compose do PostgreSQL e o .env.example da API

**What**: `docker-compose.yml` só com `postgres:18` e `apps/api/.env.example` com toda variável validada.
**Where**: `docker-compose.yml` e `apps/api/.env.example`
**Depends on**: T4
**Reuses**: `EnvironmentVariables` de T3
**Requirement**: FND-02

**Done when**:

- [x] Serviço `postgres` (`postgres:18`, porta 5432, volume nomeado, healthcheck `pg_isready`) com usuário, senha e banco iguais aos do `.env.example`
- [x] `apps/api/.env.example` com `NODE_ENV`, `PORT`, `DATABASE_URL` e `SENTRY_DSN`
- [x] Teste `validateEnvironment > o .env.example declara todas as variáveis validadas`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 6 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `chore(api): add postgres compose service and env example`

---

#### T6: Montar os testes de integração com Testcontainers

**What**: Projeto Vitest `integration` com `globalSetup` que checa o Docker, sobe `postgres:18`, roda o script `migration:run` e entrega `DATABASE_URL`; teardown para o container.
**Where**: `apps/api/test/global-setup.ts`
**Depends on**: T5
**Reuses**: script `migration:run` de T4
**Requirement**: FND-03, FND-09

**Done when**:

- [x] Projeto `integration` (`test/**/*.int-spec.ts`) no `vitest.config.ts`; tarefa `test` da API depende do próprio `build` no `turbo.json`
- [x] `ensureDocker()` falha com "Os testes de integração precisam do Docker em execução." quando o Docker não responde
- [x] Testes `ensureDocker > falha com a mensagem sobre o Docker quando ele não está disponível` e `migration:run > cria a tabela de controle de migrations num banco vazio`
- [x] Nenhum container `postgres:18` do Testcontainers fica de pé depois do `pnpm test`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 8 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `test(api): run integration tests against a disposable postgres`

---

### Phase 3: API, base HTTP e observabilidade

#### T7: Criar o configureApp com validação global

**What**: `configureApp(app)` com `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`), usado por `main.ts` e pelos testes.
**Where**: `apps/api/src/app.setup.ts`
**Depends on**: T6
**Reuses**: infraestrutura de integração de T6
**Requirement**: FND-05

**Done when**:

- [x] `main.ts` chama `configureApp`
- [x] Controller de teste com DTO em `test/fixtures/`, registrado só nos testes
- [x] Testes `validação de entrada > responde 400 e não executa o handler quando o corpo tem campo não declarado`, `> responde 400 com uma mensagem por regra violada` e `> responde no formato statusCode, message e error`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 11 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add global validation setup`

---

#### T8: Criar o filtro global de exceções

**What**: `AllExceptionsFilter`: `HttpException` com a resposta padrão do Nest; qualquer outro erro vira 500 com "Erro interno", log com stack e `Sentry.captureException` só para status 500 ou mais.
**Where**: `apps/api/src/observability/all-exceptions.filter.ts`
**Depends on**: T7
**Reuses**: `configureApp` de T7
**Requirement**: FND-05, FND-07

**Done when**:

- [x] Filtro registrado em `configureApp`
- [x] Testes `AllExceptionsFilter > responde 500 com Erro interno sem stack nem mensagem original`, `> envia ao Sentry a exceção que resulta em 500` e `> não envia ao Sentry erros que resultam em 4xx`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 14 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add global exception filter with sentry reporting`

---

#### T9: Inicializar o Sentry da API

**What**: `instrument.ts` com `initSentry(env)`: só chama `Sentry.init` com `SENTRY_DSN`, com o `dataCollection` mínimo, sem tracing nem profiling, e `beforeSend` que remove corpo e cookies; `start` usa `node --import ./dist/instrument.js dist/main.js`.
**Where**: `apps/api/src/instrument.ts`
**Depends on**: T8
**Reuses**: `@sentry/nestjs`
**Requirement**: FND-07

**Done when**:

- [x] Script `start` com `--import ./dist/instrument.js`
- [x] Testes `initSentry > não inicializa o Sentry sem SENTRY_DSN`, `> inicializa o Sentry quando SENTRY_DSN existe` e `> desliga a coleta de dados pessoais, sem tracing e remove corpo e cookies do evento`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 17 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): initialize sentry only when a dsn is set`

---

#### T10: Criar o contexto da requisição e o AppLogger

**What**: `RequestContext` (`AsyncLocalStorage`) e `AppLogger extends ConsoleLogger`: JSON em produção, `requestId` do contexto em cada linha.
**Where**: `apps/api/src/observability/app-logger.ts`
**Depends on**: T9
**Reuses**: `ConsoleLogger` do Nest
**Requirement**: FND-07

**Done when**:

- [x] `main.ts` usa `AppLogger` (JSON quando `NODE_ENV=production`)
- [x] Testes `AppLogger > escreve uma linha JSON com level, timestamp e message em produção`, `> inclui o requestId do contexto na linha` e `> escreve texto legível fora de produção`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 20 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add request-scoped logger with json output`

---

#### T11: Propagar o x-request-id

**What**: `RequestIdMiddleware` registrado em `configureApp`: adota `x-request-id` ou gera UUID, roda a requisição no `RequestContext` e devolve o cabeçalho.
**Where**: `apps/api/src/observability/request-id.middleware.ts`
**Depends on**: T10
**Reuses**: `RequestContext` e `AppLogger` de T10
**Requirement**: FND-07

**Done when**:

- [x] Testes `request id > devolve o x-request-id recebido e o usa nos logs da requisição` e `> gera um UUID quando a requisição não traz x-request-id`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 22 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): propagate x-request-id through logs and responses`

---

#### T12: Criar o registro de eventos de negócio

**What**: `BusinessEventsService.record(event, attributes)` com `BusinessEventName` no formato `dominio.acao`.
**Where**: `apps/api/src/observability/business-events.service.ts`
**Depends on**: T11
**Reuses**: `AppLogger` de T10
**Requirement**: FND-07

**Done when**:

- [x] Serviço exportado por um módulo global de observabilidade
- [x] Testes `BusinessEventsService > registra event, timestamp e os atributos no log` e `> inclui o requestId quando há requisição`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 24 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add business event logging`

---

### Phase 4: API, health e Swagger

#### T13: Criar o health check

**What**: `GET /health` com `@nestjs/terminus`, ping ao banco com `withTimeout(3000)` e retorno tipado por `HealthResponse` do shared.
**Where**: `apps/api/src/health/health.controller.ts`
**Depends on**: T12, T2
**Reuses**: `DatabaseModule` de T4, `HealthResponse` de T2
**Requirement**: FND-04

**Done when**:

- [x] `HealthModule` importado no `AppModule`
- [x] Testes `GET /health > responde 200 com status ok quando o banco responde`, `> responde 503 com status error quando o banco não responde em 3 segundos` e `> responde sem cabeçalho de autenticação`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 27 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add database health check endpoint`

---

#### T14: Publicar o Swagger fora de produção

**What**: `configureApp` monta a Swagger UI em `/docs` e o JSON em `/docs-json` quando `NODE_ENV` não é `production`; `GET /health` documentado com 200 e 503.
**Where**: `apps/api/src/app.setup.ts` (modify)
**Depends on**: T13
**Reuses**: `configureApp` de T7
**Requirement**: FND-06

**Done when**:

- [ ] Testes `Swagger > serve /docs e /docs-json fora de produção`, `> responde 404 em /docs e /docs-json em produção` e `> documenta GET /health com as respostas 200 e 503`
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: 30 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): serve openapi docs outside production`

---

### Phase 5: Web, esqueleto, e2e e tema

#### T15: Criar o esqueleto do web

**What**: App Next.js 16 com Tailwind 4, shadcn/ui (`components.json`), ESLint (`eslint-config-next` + `typescript-eslint` + Prettier), Vitest em jsdom e layout raiz com `lang="pt-BR"`, Plus Jakarta Sans e os tokens do design system em `globals.css`.
**Where**: `apps/web/` (esqueleto) e `apps/web/src/app/layout.tsx`
**Depends on**: T2
**Reuses**: tokens e bloco de `globals.css` do design system "Cristal e Gelo"; `.claude/rules/next-web-coding-standards.md`
**Requirement**: FND-01, FND-02, FND-08

**Done when**:

- [ ] `package.json` com scripts `dev` (porta 3000), `build`, `start`, `lint`, `typecheck`, `test` (`vitest run --passWithNoTests`) e `test:e2e`
- [ ] `apps/web/.env.example` com `API_INTERNAL_URL` e `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `globals.css` com os tokens claro em `:root` e escuro em `.dark`
- [ ] `src/app/page.tsx` provisório renderiza
- [ ] Os testes do layout ficam em T16 (e2e), a primeira task em que o navegador roda
- [ ] Gate check passes: `pnpm install && pnpm build && pnpm typecheck && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(web): scaffold next.js app with design system tokens`

---

#### T16: Montar o e2e com Playwright e Testcontainers

**What**: `scripts/e2e.ts` sobe `postgres:18`, roda `migration:run`, chama `playwright test` e para o container num `finally`; `playwright.config.ts` com reporter `list` e `webServer` para a API (3001), o web (3000) e o web com API morta (3100).
**Where**: `apps/web/scripts/e2e.ts`
**Depends on**: T15, T14
**Reuses**: `ensureDocker` e script `migration:run` da API
**Requirement**: FND-08, FND-09

**Done when**:

- [ ] `test:e2e` do web depende de `build` e de `@amigo-secreto/api#build` no `turbo.json`
- [ ] `playwright.config.ts` e `@axe-core/playwright` instalados; navegador `chromium` instalado
- [ ] Testes `página inicial › declara lang pt-BR`
- [ ] Nenhum container `postgres:18` do Testcontainers fica de pé depois do `pnpm test:e2e`
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
- [ ] Test count: 1 e2e test passes

**Tests**: e2e
**Gate**: E2E

**Commit**: `test(web): run e2e tests against api and disposable postgres`

---

#### T17: Criar a alternância de tema

**What**: `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="system"`) e `ThemeToggle`, com os nomes acessíveis escolhidos por CSS a partir da classe `dark`.
**Where**: `apps/web/src/components/theme-toggle.tsx`
**Depends on**: T16
**Reuses**: wrapper de `ThemeProvider` do shadcn/ui
**Requirement**: FND-08

**Done when**:

- [ ] `ThemeProvider` no `layout.tsx`
- [ ] Teste de componente `ThemeToggle > troca para o tema escuro quando o claro está ativo` e `> troca para o tema claro quando o escuro está ativo`
- [ ] Testes e2e `tema › segue o tema escuro do sistema quando não há tema salvo`, `› segue o tema claro do sistema quando não há tema salvo`, `› o botão troca o tema e a escolha sobrevive ao recarregar`, `› pinta o primeiro quadro no tema salvo`, `› o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro`, `› aplica os tokens do design system no tema claro` e `› aplica os tokens do design system no tema escuro`
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
- [ ] Test count: 2 component tests e 8 e2e tests pass

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add light and dark theme toggle`

---

#### T18: Criar o cabeçalho do app

**What**: `AppHeader` com o nome "Amigo Secreto" e o `ThemeToggle`, no `layout.tsx`.
**Where**: `apps/web/src/components/app-header.tsx`
**Depends on**: T17
**Reuses**: `ThemeToggle` de T17; `components/AppHeader/README.md` do design system
**Requirement**: FND-08, FND-09

**Done when**:

- [ ] Teste de componente `AppHeader > mostra o nome Amigo Secreto e o botão de tema`
- [ ] Teste e2e `página inicial › mostra o cabeçalho com Amigo Secreto e o botão de tema`
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
- [ ] Test count: 3 component tests e 9 e2e tests pass

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add app header`

---

#### T19: Consultar o status da API no servidor

**What**: `getApiStatus()` faz `GET ${API_INTERNAL_URL}/health` com `cache: 'no-store'` e timeout de 5 s; devolve `online` só com 200.
**Where**: `apps/web/src/lib/api-status.ts`
**Depends on**: T18
**Reuses**: `HealthResponse` de T2
**Requirement**: FND-04, FND-08

**Done when**:

- [ ] Testes `getApiStatus > devolve online quando a API responde 200`, `> devolve unavailable quando a API responde 503`, `> devolve unavailable quando a API não responde` e `> devolve unavailable quando a API passa de 5 segundos`
- [ ] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/web`
- [ ] Test count: 7 component/unit tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(web): fetch api status on the server`

---

### Phase 6: Web, página, rewrite, Sentry, acessibilidade e CI

#### T20: Mostrar o status da API na página inicial

**What**: `page.tsx` (Server Component) chama `getApiStatus()` e mostra "API online" ou "API indisponível".
**Where**: `apps/web/src/app/page.tsx`
**Depends on**: T19
**Reuses**: `getApiStatus` de T19
**Requirement**: FND-08

**Done when**:

- [ ] Testes de componente `HomePage > mostra API online quando o status é online` e `> mostra API indisponível quando o status é unavailable`
- [ ] Testes e2e `página inicial › mostra API online quando a API responde` e `› mostra API indisponível e o tema funciona quando a API não responde`
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
- [ ] Test count: 9 component/unit tests e 11 e2e tests pass

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): show api status on the home page`

---

#### T21: Repassar /api/* para a API

**What**: `rewrites()` no `next.config.ts` com `/api/:path*` → `${API_INTERNAL_URL}/:path*`.
**Where**: `apps/web/next.config.ts`
**Depends on**: T20
**Reuses**: `API_INTERNAL_URL` de T15
**Requirement**: FND-04

**Done when**:

- [ ] Teste e2e `rewrite da API › GET /api/health no web devolve o status e o corpo da API`
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
- [ ] Test count: 12 e2e tests pass

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): proxy api requests through the web origin`

---

#### T22: Ligar o Sentry no web

**What**: `sentryOptions(env)` compartilhado por `instrumentation-client.ts` e `sentry.server.config.ts`; `instrumentation.ts` com `register` e `onRequestError`; tudo desligado sem `NEXT_PUBLIC_SENTRY_DSN`.
**Where**: `apps/web/src/lib/sentry-options.ts`
**Depends on**: T21
**Reuses**: `@sentry/nextjs`
**Requirement**: FND-07

**Done when**:

- [ ] Testes `sentryOptions > liga o Sentry no navegador e no servidor quando NEXT_PUBLIC_SENTRY_DSN existe`, `> desliga o Sentry sem NEXT_PUBLIC_SENTRY_DSN`, `> desliga a coleta de dados pessoais, sem replay e sem tracing` e `instrumentation > exporta onRequestError do Sentry`
- [ ] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/web`
- [ ] Test count: 13 component/unit tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(web): initialize sentry only when a dsn is set`

---

#### T23: Checar largura e acessibilidade da página inicial

**What**: Testes e2e de largura (360 px e 1440 px sem rolagem horizontal) e axe (WCAG 2.1 A/AA) nos temas claro e escuro, com as correções que eles exigirem.
**Where**: `apps/web/e2e/accessibility.spec.ts`
**Depends on**: T22
**Reuses**: `@axe-core/playwright`
**Requirement**: FND-08

**Done when**:

- [ ] Testes `layout › não rola na horizontal em 360 px`, `› não rola na horizontal em 1440 px`, `acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema claro` e `› página inicial sem violações WCAG 2.1 A/AA no tema escuro`
- [ ] Gate check passes: `pnpm test && pnpm test:e2e`
- [ ] Test count: 16 e2e tests pass

**Tests**: e2e
**Gate**: E2E

**Commit**: `test(web): check home page width and accessibility`

---

#### T24: Criar o workflow de CI

**What**: `.github/workflows/ci.yml` em `pull_request` para a `main` e `push` na `main`: install, lint, typecheck, test, build, instalação do Chromium e test:e2e, com Node do `.nvmrc`.
**Where**: `.github/workflows/ci.yml`
**Depends on**: T23
**Reuses**: scripts da raiz
**Requirement**: FND-10

**Done when**:

- [ ] Workflow com `node-version-file: .nvmrc` e cache do pnpm
- [ ] Os cinco comandos rodam em sequência e qualquer falha falha o job
- [ ] Gate check passes: `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: none
**Gate**: build

**Commit**: `ci: run lint, typecheck, tests, build and e2e on github actions`

---

## Checks

**C1** - O `pnpm-workspace.yaml` declara os três pacotes, chamados `@amigo-secreto/api`, `@amigo-secreto/web` e `@amigo-secreto/shared` (FND-01, AC 1)
Proof: run workspaces | @amigo-secreto/api
Proof: run workspaces | @amigo-secreto/web
Proof: run workspaces | @amigo-secreto/shared

**C2** - `pnpm install` na raiz termina com código 0 (FND-01, AC 2)
Proof: `pnpm install --frozen-lockfile`

**C3** - `pnpm build` compila o shared antes da API e do web e termina com código 0 (FND-01, AC 3)
Proof: run graph | @amigo-secreto/api#build -> @amigo-secreto/shared#build
Proof: run graph | @amigo-secreto/web#build -> @amigo-secreto/shared#build
Proof: `pnpm build`

**C4** - `pnpm dev` serve a API em `localhost:3001` e o web em `localhost:3000` e recarrega cada app quando um arquivo dele muda (FND-01, AC 4)
Proof: walk - com o Compose de pé, `pnpm dev`; `curl localhost:3001/health` responde e `localhost:3000` abre; editar um arquivo de cada app recarrega o app

**C5** - `pnpm lint` roda ESLint e Prettier nos três pacotes e sai com código diferente de 0 quando há violação (FND-01, AC 5)
Proof: run lint | @amigo-secreto/api:lint:
Proof: run lint | @amigo-secreto/web:lint:
Proof: run lint | @amigo-secreto/shared:lint:
Proof: walk - uma variável não usada na API e um arquivo fora do padrão do Prettier no shared fazem `pnpm lint` sair com código diferente de 0

**C6** - `pnpm typecheck` checa os tipos dos três pacotes sem emitir arquivos e sai com código diferente de 0 com erro de tipo (FND-01, AC 6)
Proof: run typecheck | @amigo-secreto/api:typecheck:
Proof: run typecheck | @amigo-secreto/web:typecheck:
Proof: run typecheck | @amigo-secreto/shared:typecheck:
Proof: walk - um erro de tipo no web faz `pnpm typecheck` sair com código diferente de 0 e nenhum arquivo novo aparece em `dist/`

**C7** - `pnpm test` roda o Vitest dos três pacotes (FND-01, AC 7)
Proof: run testall | @amigo-secreto/shared:test:
Proof: run testall | @amigo-secreto/api:test:
Proof: run testall | @amigo-secreto/web:test:

**C8** - `pnpm format` reescreve os arquivos fora do padrão (FND-01, AC 8)
Proof: walk - um arquivo com aspas e indentação fora do padrão volta ao padrão depois de `pnpm format`

**C9** - `.nvmrc` e `engines.node` da raiz têm o mesmo valor (FND-01, AC 9)
Proof: `test "$(cat .nvmrc)" = "$(node -p "require('./package.json').engines.node")"`

**C10** - `docker compose up -d` sobe o PostgreSQL em `localhost:5432` com o banco, o usuário e a senha do `apps/api/.env.example` (FND-02, AC 1)
Proof: walk - `docker compose up -d`; com o `.env` copiado do exemplo, `pnpm --filter @amigo-secreto/api migration:run` conecta e termina com código 0

**C11** - O `docker-compose.yml` só tem o serviço `postgres` (FND-02, AC 2)
Proof: `test "$(docker compose config --services)" = "postgres"`

**C12** - Os `.env.example` da API e do web têm todas as variáveis que cada app lê (FND-02, AC 3)
Proof: run api | ✓ validateEnvironment > o .env.example declara todas as variáveis validadas
Proof: `grep -q '^API_INTERNAL_URL=' apps/web/.env.example && grep -q '^NEXT_PUBLIC_SENTRY_DSN=' apps/web/.env.example`

**C13** - Copiando os `.env.example` sem editar, API e web iniciam com `pnpm dev` contra o Compose (FND-02, AC 4)
Proof: walk - clone limpo, `docker compose up -d`, `cp` dos dois `.env.example`, `migration:run`, `pnpm dev` e `localhost:3000` mostra "API online"

**C14** - Sem uma variável obrigatória, ou com ela inválida, a API encerra no boot com código diferente de 0 e uma mensagem que nomeia a variável (FND-03, AC 1)
Proof: run api | ✓ validateEnvironment > lança erro que nomeia DATABASE_URL quando ela falta
Proof: run api | ✓ validateEnvironment > lança erro que nomeia DATABASE_URL quando ela não é uma URL postgres
Proof: walk - sem `DATABASE_URL` no `.env`, `pnpm --filter @amigo-secreto/api start` encerra com código diferente de 0 e a mensagem cita `DATABASE_URL`

**C15** - O `synchronize` do TypeORM fica desligado em development, test e production (FND-03, AC 2)
Proof: run api | ✓ databaseOptions > desliga synchronize em development, test e production

**C16** - A API inicia sem aplicar migrations (FND-03, AC 3)
Proof: run api | ✓ databaseOptions > não roda migrations ao iniciar

**C17** - A API expõe os scripts `migration:generate`, `migration:run` e `migration:revert` (FND-03, AC 4)
Proof: `node -e "const s=require('./apps/api/package.json').scripts; process.exit(['migration:generate','migration:run','migration:revert'].every(k=>s[k])?0:1)"`

**C18** - `migration:run` num banco vazio cria a tabela de controle de migrations e termina com código 0 (FND-03, AC 5)
Proof: run api | ✓ migration:run > cria a tabela de controle de migrations num banco vazio

**C19** - `GET /health` com o banco respondendo devolve 200 e `status: "ok"` (FND-04, AC 1)
Proof: run api | ✓ GET /health > responde 200 com status ok quando o banco responde

**C20** - Banco sem resposta em 3 s faz `GET /health` devolver 503 e `status: "error"` (FND-04, AC 2)
Proof: run api | ✓ GET /health > responde 503 com status error quando o banco não responde em 3 segundos

**C21** - `GET /health` responde sem autenticação (FND-04, AC 3)
Proof: run api | ✓ GET /health > responde sem cabeçalho de autenticação

**C22** - O tipo da resposta de `GET /health` vem do `@amigo-secreto/shared` na API e no web, sem redeclaração (FND-04, AC 4)
Proof: `grep -rq "from '@amigo-secreto/shared'" apps/api/src/health && grep -rq "from '@amigo-secreto/shared'" apps/web/src/lib && ! grep -rqE "type HealthResponse *=" apps/api/src apps/web/src`

**C23** - `GET /api/health` no web chega a `GET /health` da API e devolve o mesmo status e corpo (FND-04, AC 5)
Proof: run e2e | ✓ rewrite da API › GET /api/health no web devolve o status e o corpo da API

**C24** - Corpo com campo não declarado no DTO recebe 400 e o handler não roda (FND-05, AC 1)
Proof: run api | ✓ validação de entrada > responde 400 e não executa o handler quando o corpo tem campo não declarado

**C25** - Campo inválido recebe 400 com `message` listando uma mensagem por regra violada (FND-05, AC 2)
Proof: run api | ✓ validação de entrada > responde 400 com uma mensagem por regra violada

**C26** - Erro não tratado vira 500 com `message: "Erro interno"`, sem stack nem mensagem original (FND-05, AC 3)
Proof: run api | ✓ AllExceptionsFilter > responde 500 com Erro interno sem stack nem mensagem original

**C27** - Erros da API seguem `{ statusCode, message, error }` (FND-05, AC 4)
Proof: run api | ✓ validação de entrada > responde no formato statusCode, message e error

**C28** - Fora de produção, `/docs` e `/docs-json` respondem (FND-06, AC 1)
Proof: run api | ✓ Swagger > serve /docs e /docs-json fora de produção

**C29** - Em produção, `/docs` e `/docs-json` respondem 404 (FND-06, AC 2)
Proof: run api | ✓ Swagger > responde 404 em /docs e /docs-json em produção

**C30** - O OpenAPI descreve `GET /health` com 200 e 503 (FND-06, AC 3)
Proof: run api | ✓ Swagger > documenta GET /health com as respostas 200 e 503

**C31** - Em produção, cada log é uma linha JSON com `level`, `timestamp` e `message` (FND-07, AC 1)
Proof: run api | ✓ AppLogger > escreve uma linha JSON com level, timestamp e message em produção

**C32** - O `x-request-id` recebido aparece como `requestId` nos logs da requisição e volta no cabeçalho da resposta (FND-07, AC 2)
Proof: run api | ✓ request id > devolve o x-request-id recebido e o usa nos logs da requisição

**C33** - Sem `x-request-id`, a API gera um UUID, usa nos logs e devolve no cabeçalho (FND-07, AC 3)
Proof: run api | ✓ request id > gera um UUID quando a requisição não traz x-request-id

**C34** - Um evento de negócio gera log com `event` no formato `dominio.acao`, `timestamp` e os atributos (FND-07, AC 4)
Proof: run api | ✓ BusinessEventsService > registra event, timestamp e os atributos no log

**C35** - Com `SENTRY_DSN`, toda exceção que resulta em 500 vai ao Sentry (FND-07, AC 5)
Proof: run api | ✓ AllExceptionsFilter > envia ao Sentry a exceção que resulta em 500

**C36** - Com `SENTRY_DSN`, erros 4xx não vão ao Sentry (FND-07, AC 6)
Proof: run api | ✓ AllExceptionsFilter > não envia ao Sentry erros que resultam em 4xx

**C37** - Sem `SENTRY_DSN`, a API inicia sem inicializar o Sentry (FND-07, AC 7)
Proof: run api | ✓ initSentry > não inicializa o Sentry sem SENTRY_DSN

**C38** - Com `NEXT_PUBLIC_SENTRY_DSN`, o web envia ao Sentry os erros não tratados do navegador e do servidor (FND-07, AC 8)
Proof: run web | ✓ sentryOptions > liga o Sentry no navegador e no servidor quando NEXT_PUBLIC_SENTRY_DSN existe
Proof: run web | ✓ instrumentation > exporta onRequestError do Sentry

**C39** - O Sentry roda com a coleta de dados pessoais desligada (`dataCollection` mínimo), sem corpo de requisição nem cookies, sem Session Replay e sem tracing, na API e no web (FND-07, AC 9)
Proof: run api | ✓ initSentry > desliga a coleta de dados pessoais, sem tracing e remove corpo e cookies do evento
Proof: run web | ✓ sentryOptions > desliga a coleta de dados pessoais, sem replay e sem tracing

**C40** - O web aplica os tokens do design system (cor, Plus Jakarta Sans, espaçamento, raios e sombras) nos temas claro e escuro (FND-08, AC 1)
Proof: run e2e | ✓ tema › aplica os tokens do design system no tema claro
Proof: run e2e | ✓ tema › aplica os tokens do design system no tema escuro

**C41** - Toda página declara `lang="pt-BR"` (FND-08, AC 2)
Proof: run e2e | ✓ página inicial › declara lang pt-BR

**C42** - O cabeçalho mostra "Amigo Secreto" e o botão de tema (FND-08, AC 3)
Proof: run web | ✓ AppHeader > mostra o nome Amigo Secreto e o botão de tema
Proof: run e2e | ✓ página inicial › mostra o cabeçalho com Amigo Secreto e o botão de tema

**C43** - Sem tema salvo, o web segue o `prefers-color-scheme` do sistema (FND-08, AC 4)
Proof: run e2e | ✓ tema › segue o tema escuro do sistema quando não há tema salvo
Proof: run e2e | ✓ tema › segue o tema claro do sistema quando não há tema salvo

**C44** - O botão de tema troca para o outro tema e salva a escolha no navegador (FND-08, AC 5)
Proof: run web | ✓ ThemeToggle > troca para o tema escuro quando o claro está ativo
Proof: run e2e | ✓ tema › o botão troca o tema e a escolha sobrevive ao recarregar

**C45** - Com tema salvo, o primeiro quadro já sai no tema salvo (FND-08, AC 6)
Proof: run e2e | ✓ tema › pinta o primeiro quadro no tema salvo

**C46** - O botão de tema se chama "Ativar tema escuro" no claro e "Ativar tema claro" no escuro (FND-08, AC 7)
Proof: run e2e | ✓ tema › o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro

**C47** - Com a API respondendo 200, `/` mostra "API online" (FND-08, AC 8)
Proof: run web | ✓ HomePage > mostra API online quando o status é online
Proof: run e2e | ✓ página inicial › mostra API online quando a API responde

**C48** - Com a API fora do ar ou respondendo outro status, `/` mostra "API indisponível" com o cabeçalho e o tema funcionando (FND-08, AC 9)
Proof: run web | ✓ getApiStatus > devolve unavailable quando a API responde 503
Proof: run web | ✓ getApiStatus > devolve unavailable quando a API não responde
Proof: run e2e | ✓ página inicial › mostra API indisponível e o tema funciona quando a API não responde

**C49** - Entre 360 px e 1440 px, `/` não tem rolagem horizontal (FND-08, AC 10)
Proof: run e2e | ✓ layout › não rola na horizontal em 360 px
Proof: run e2e | ✓ layout › não rola na horizontal em 1440 px

**C50** - `/` tem zero violações WCAG 2.1 A/AA no axe, no tema claro e no escuro (FND-08, AC 11)
Proof: run e2e | ✓ acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema claro
Proof: run e2e | ✓ acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema escuro

**C51** - `pnpm test` sobe um PostgreSQL descartável com Testcontainers, aplica as migrations e remove o container ao fim (FND-09, AC 1)
Proof: `pnpm turbo run test --force --filter=@amigo-secreto/api && test -z "$(docker ps -q --filter label=org.testcontainers=true --filter ancestor=postgres:18)"`

**C52** - Sem Docker, os testes de integração falham com a mensagem sobre o Docker (FND-09, AC 2)
Proof: run api | ✓ ensureDocker > falha com a mensagem sobre o Docker quando ele não está disponível

**C53** - `pnpm test:e2e` sobe banco, API e web sem passo manual e encerra tudo ao fim (FND-09, AC 3)
Proof: `pnpm test:e2e && test -z "$(docker ps -q --filter label=org.testcontainers=true --filter ancestor=postgres:18)"`

**C54** - O web roda testes de componente com Vitest e Testing Library em jsdom (FND-09, AC 4)
Proof: run web | ✓ AppHeader > mostra o nome Amigo Secreto e o botão de tema

**C55** - Um PR contra a `main` dispara lint, typecheck, test, build e test:e2e no GitHub Actions (FND-10, AC 1)
Proof: walk - PR aberto contra a `main` mostra o workflow rodando os cinco comandos

**C56** - Um push na `main` dispara os mesmos cinco comandos (FND-10, AC 2)
Proof: walk - o push na `main` dispara o mesmo workflow

**C57** - Qualquer comando com código diferente de 0 falha o workflow (FND-10, AC 3)
Proof: walk - um commit com erro de lint num PR deixa o check vermelho

**C58** - O workflow usa o Node do `.nvmrc` (FND-10, AC 4)
Proof: `grep -q 'node-version-file: .nvmrc' .github/workflows/ci.yml`

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** 2026-11-12 - o gate Build fica vermelho antes da T1 porque o repositório está vazio; o usuário autorizou seguir mesmo assim - user: "Seguir mesmo assim (Recomendado)". A partir da T1 o Build precisa ficar verde em toda task. 2026-11-12 - modo de execução ainda não escolhido; o usuário pediu para não executar agora - user: "Não executar nada agora." 2026-11-12 - execução começa só pelo lote 1 (fases 1 e 2, T1 a T6), com parada para revisão antes do lote 2 - user: "Só o lote 1 agora". A máquina tem Node v24.17.0; o usuário instala o Node 26 antes da T1, sem mudar a spec - user: "Eu instalo o Node 26". O daemon do Docker estava parado; o usuário o inicia - user: "Eu abro o Docker agora". 2026-11-12 - o design dizia `.nvmrc` `26.13.1` e `engines.node` `">=26.13.0 <27"`, contra FND-01 AC 9 e a C9; vale `26` nos dois, como na T1, e o design foi corrigido - user: "26 nos dois (Recomendado)". 2026-11-12 - `.prettierrc.json` com `singleQuote: true` e `trailingComma: "all"`, resto no padrão do Prettier - user: "Padrão do Nest (Recomendado)". 2026-11-12 - a tarefa `lint` do Turborepo passa a depender de `^build`, porque o lint com tipos lê o `dist/` do shared e o CI roda lint antes do build; design corrigido - user: "lint depende de ^build (Recomendado)". 2026-11-12 - o pnpm 12 bloqueia scripts de instalação fora de `allowBuilds`; `@swc/core: false`, porque o binário nativo já vem por dependência opcional - user: "Negar (Recomendado)"; cada pacote novo que pedir script é perguntado ao usuário - user: "Perguntar a cada caso (Recomendado)". O bloco `minimumReleaseAgeExclude` que o pnpm acrescentou na T1 fica; exceções novas são avisadas no commit - user: "Manter (Recomendado)". 2026-11-12 - `cpu-features`, `protobufjs` e `ssh2` (dependências do Testcontainers) ficam com `false` em `allowBuilds` - user: "Negar os três (Recomendado)". 2026-11-12 - execução inline, uma fase por vez, um PR por fase (AD-010); substitui a escolha do lote 1 - user: "A execução será inline, fase por fase, e cada fase deve ter seu PR." 2026-11-12 - o Sentry 11.12 removeu `sendDefaultPii` e o novo `dataCollection` coleta tudo por padrão; a API e o web usam o `dataCollection` mínimo e mantêm o `beforeSend`; FND-07 AC9, C39, T9 e T22 atualizados - user: "dataCollection mínimo (Recomendado)". 2026-11-12 - o `instrument.ts` roda antes do `ConfigModule` ler o `.env`, então um `SENTRY_DSN` só no `apps/api/.env` não liga o Sentry no `start` local; o DSN vem do ambiente do processo, como em produção - user: "Deixar como está (Recomendado)". 2026-11-12 - versões da fase 4: `@nestjs/terminus` 12.1.0, `@nestjs/swagger` 12.1.1 e `@amigo-secreto/shared` como `workspace:*`, todas exatas - user: "Mais recentes (Recomendado)". O 503 do `GET /health` continua indo ao Sentry e ao log de erro pelo filtro global - user: "Manter como está (Recomendado)". O teste do banco sem resposta usa um proxy TCP em `test/` que congela o tráfego entre a API e o Postgres - user: "Proxy TCP congelável (Recomendado)". O `GET /health` devolve o corpo do Terminus (`status`, `info`, `error`, `details`) no 200 e no 503, tipado como `HealthResponse` - user: "Corpo do Terminus (Recomendado)".
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 ------→ T2
Phase 2:  T3 ------→ T4 ------→ T5 ------→ T6
Phase 3:  T7 ------→ T8 ------→ T9 ------→ T10 -----→ T11 -----→ T12
Phase 4:  T13 -----→ T14
Phase 5:  T15 -----→ T16 -----→ T17 -----→ T18 -----→ T19
Phase 6:  T20 -----→ T21 -----→ T22 -----→ T23 -----→ T24
```

Lotes de execução (~7 tasks, fases inteiras): lote 1 = fases 1 e 2 (6 tasks); lote 2 = fase 3 (6); lote 3 = fases 4 e 5 (7); lote 4 = fase 6 (5).
