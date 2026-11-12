# Foundation Design

**Spec**: `.specs/features/foundation/spec.md`
**Context**: `.specs/features/foundation/context.md`
**Status**: Approved
**Approved**: 2026-11-12 - user: "Tudo aprovado, sobre a decisão pendente pode fazer como recomendado."

---

## Architecture Overview

Monorepo pnpm 12 + Turborepo 2.11 com três pacotes. O web (Next.js 16) atende o navegador; o servidor do Next chama a API (NestJS 12) por uma URL interna, e as chamadas do navegador a `/api/*` chegam à API por `rewrites` (AD-006). A API fala com o PostgreSQL 18 por TypeORM 1.1. O `@amigo-secreto/shared` é compilado antes dos apps e só exporta tipos.

```mermaid
flowchart LR
    B[Navegador] -->|"GET /"| W["apps/web<br/>Next.js :3000"]
    B -.->|"/api/* (rewrite, AD-006)"| W
    W -->|"API_INTERNAL_URL/health"| A["apps/api<br/>NestJS :3001"]
    W -.->|"rewrite /api/:path* → /:path*"| A
    A -->|"SELECT 1 (timeout 3 s)"| D[("PostgreSQL 18<br/>Compose :5432")]
    A -.->|"exceção 5xx, se SENTRY_DSN"| S[Sentry]
    W -.->|"erro não tratado, se NEXT_PUBLIC_SENTRY_DSN"| S
    SH["packages/shared<br/>tipos"] --> A
    SH --> W
```

Página `/` e health check:

```mermaid
sequenceDiagram
    participant N as Navegador
    participant W as web (Server Component)
    participant A as API
    participant D as PostgreSQL
    N->>W: GET /
    W->>A: GET /health (cache no-store, timeout 5 s)
    A->>D: SELECT 1 (withTimeout 3000)
    alt banco responde
        D-->>A: ok
        A-->>W: 200 {status: "ok"}
        W-->>N: HTML com "API online"
    else banco não responde em 3 s
        A-->>W: 503 {status: "error"}
        W-->>N: HTML com "API indisponível"
    else API fora do ar ou timeout
        W-->>N: HTML com "API indisponível"
    end
```

Testes de integração e e2e sem passo manual (FND-09):

```mermaid
flowchart TD
    T1["pnpm test"] --> V["Vitest, projeto integration da API"]
    V --> GS["globalSetup: PostgreSqlContainer postgres:18"]
    GS --> M["roda as migrations e entrega DATABASE_URL via provide/inject"]
    M --> IT["*.int-spec.ts com supertest"]
    IT --> TD["teardown: container.stop()"]
    T2["pnpm test:e2e"] --> BLD["turbo: build dos três pacotes"]
    BLD --> RUN["apps/web/scripts/e2e.ts (Node 26, sem transpilador)"]
    RUN --> C["PostgreSqlContainer postgres:18 + migration:run"]
    C --> PW["playwright test com DATABASE_URL no ambiente"]
    PW --> WS["webServer: API (node dist) + web (next start) + web apontando para API morta"]
    WS --> AX["specs + axe nos temas claro e escuro"]
    AX --> STOP["finally: container.stop()"]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| Design system "Cristal e Gelo" | Artifact privado no claude.ai (`project/README.md`, `project/tokens.json`, guia com o bloco de `globals.css`) | Copiar os tokens claro/escuro e o bloco de `globals.css` para `apps/web/src/app/globals.css`; cabeçalho segue `components/AppHeader/README.md` |
| Convenções da API | `.claude/rules/nest-api-coding-standards.md` | Identificadores em inglês, textos e nomes de teste em português, papel no fim do nome de classe, união de strings em vez de `enum`, `registerAs` com sufixo `Config`, token de injeção como `Symbol` |
| Convenções do web | `.claude/rules/next-web-coding-standards.md` | Mesmas regras de idioma e nomes no `apps/web` |
| Skills do projeto | `.claude/skills/nestjs-best-practices`, `next-best-practices` | Consultar na implementação de cada componente |

Não há código de aplicação no repositório (o Lumen foi removido em `4ce025e`); nada a reaproveitar além do acima.

### Integration Points

| System | Integration Method |
| --- | --- |
| PostgreSQL 18 | `docker-compose.yml` no desenvolvimento; Testcontainers nos testes; `DATABASE_URL` lida pela API |
| Sentry | `@sentry/nestjs` (via `node --import ./dist/instrument.js`) e `@sentry/nextjs` (`instrumentation.ts` + `instrumentation-client.ts`), ligados só com DSN |
| GitHub Actions | `.github/workflows/ci.yml` roda os mesmos scripts da raiz |

---

## Components

### Raiz do monorepo

- **Purpose**: Workspaces, tarefas do Turborepo, configuração comum de TypeScript e Prettier, Compose e CI.
- **Location**: `/`
- **Interfaces**:
  - `package.json`: `packageManager: "pnpm@12.18.0"`, `engines.node: ">=26.13.0 <27"`, scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e` (todos `turbo run <tarefa>`) e `format` (`prettier --write .`)
  - `.nvmrc`: `26.13.1`
  - `pnpm-workspace.yaml`: `apps/*`, `packages/*`
  - `turbo.json`: `build` (`dependsOn: ["^build"]`, outputs `dist/**`, `.next/**` sem `.next/cache/**`); `dev` (`persistent`, sem cache, `dependsOn: ["^build"]`); `lint`; `typecheck` e `test` (`dependsOn: ["^build"]`); `test:e2e` (`dependsOn: ["build"]`, sem cache)
  - `tsconfig.base.json`: `strict`, `target` ES2024, `module`/`moduleResolution` `nodenext`, `verbatimModuleSyntax`, `skipLibCheck`
  - `.prettierrc.json` e `.prettierignore` (ignora `dist`, `.next`, `coverage`, `pnpm-lock.yaml`, `playwright-report`)
  - `docker-compose.yml`: serviço `postgres` (`postgres:18`, porta 5432, volume nomeado, healthcheck `pg_isready`)
- **Dependencies**: `turbo`, `prettier`
- **Reuses**: nada

### `@amigo-secreto/shared`

- **Purpose**: Contratos de API usados pelos dois apps; nesta feature, só a resposta do health check.
- **Location**: `packages/shared/`
- **Interfaces**:
  - `type HealthStatus = 'ok' | 'error'`
  - `type HealthIndicatorStatus = 'up' | 'down'`
  - `type HealthResponse = { status: HealthStatus; details: Record<string, { status: HealthIndicatorStatus }> }`
  - `package.json`: `"type": "module"`, `exports` → `./dist/index.js` com `types` → `./dist/index.d.ts`; scripts `build` (`tsc -p tsconfig.build.json`), `dev` (`tsc --watch`), `lint`, `typecheck`
- **Dependencies**: `typescript`
- **Reuses**: `tsconfig.base.json`

### API: bootstrap e configuração

- **Purpose**: Subir a API com configuração validada, pipes, filtro de erro, request id, Swagger e Sentry, do mesmo jeito em produção e nos testes.
- **Location**: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/app.setup.ts`, `apps/api/src/instrument.ts`, `apps/api/src/config/`
- **Interfaces**:
  - `configureApp(app: INestApplication): void`: registra o middleware de request id, o `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`), o `AllExceptionsFilter` e, fora de produção, o Swagger em `/docs` e `/docs-json`. `main.ts` e os testes de integração chamam a mesma função.
  - `validateEnvironment(config: Record<string, unknown>): EnvironmentVariables`: valida com `class-validator` (`NODE_ENV` em `'development' | 'test' | 'production'`, `PORT` padrão 3001, `DATABASE_URL` obrigatória com formato de URL `postgres://`, `SENTRY_DSN` opcional) e lança erro com o nome de cada variável inválida (FND-03 AC1).
  - `appConfig`, `databaseConfig` com `registerAs`.
  - `instrument.ts`: chama `Sentry.init` só quando `SENTRY_DSN` existe, com `sendDefaultPii: false`, sem `tracesSampleRate`, sem integrações de replay/profiling, e `beforeSend` que remove `request.data` e `request.cookies`. Carregado por `node --import ./dist/instrument.js dist/main.js` (guia ESM do Sentry).
- **Dependencies**: `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/swagger`, `class-validator`, `class-transformer`, `@sentry/nestjs`
- **Reuses**: `configureApp` nos testes

### API: banco e migrations

- **Purpose**: Conexão TypeORM com `synchronize: false` e `migrationsRun: false` (AD-004), e a CLI de migrations.
- **Location**: `apps/api/src/database/`
- **Interfaces**:
  - `DatabaseModule`: `TypeOrmModule.forRootAsync` lendo `databaseConfig`; `autoLoadEntities: true`
  - `data-source.ts`: `DataSource` usado pela CLI, com `migrations: ['dist/database/migrations/*.js']`
  - Scripts: `migration:run` = `typeorm migration:run -d dist/database/data-source.js`; `migration:revert` idem; `migration:generate` = build + `typeorm migration:generate -d dist/database/data-source.js src/database/migrations/<nome>`. A CLI roda sobre o JavaScript compilado, sem ts-node (ver Tech Decisions).
- **Dependencies**: `typeorm`, `@nestjs/typeorm`, `pg`
- **Reuses**: `databaseConfig`

### API: health

- **Purpose**: `GET /health` com o estado do banco (FND-04).
- **Location**: `apps/api/src/health/`
- **Interfaces**:
  - `HealthController.check(): Promise<HealthResponse>`: `HealthCheckService.check([() => db.pingCheck('database').withTimeout(3000)])`; 200 com `status: 'ok'` ou 503 com `status: 'error'` (comportamento do Terminus); documentado no Swagger com as respostas 200 e 503
- **Dependencies**: `@nestjs/terminus`, `@amigo-secreto/shared`
- **Reuses**: `DatabaseModule`

### API: observabilidade

- **Purpose**: `requestId` em todo log da requisição, log JSON em produção, eventos de negócio e envio de 5xx ao Sentry (FND-07).
- **Location**: `apps/api/src/observability/`
- **Interfaces**:
  - `RequestContext`: `AsyncLocalStorage<{ requestId: string }>` com `getRequestId(): string | undefined`
  - `RequestIdMiddleware`: lê `x-request-id` ou gera `randomUUID()`, roda o resto da requisição dentro do `RequestContext` e devolve o valor no cabeçalho `x-request-id`
  - `AppLogger extends ConsoleLogger`: em produção `json: true`; acrescenta `requestId` do contexto a cada linha (campo no JSON, sufixo legível fora de produção)
  - `BusinessEventsService.record(event: BusinessEventName, attributes?: Record<string, string | number | boolean>): void`, com `type BusinessEventName = \`${string}.${string}\``: escreve um log com `event`, `timestamp`, `requestId` e os atributos no topo do registro
  - `AllExceptionsFilter`: `HttpException` segue a resposta padrão do Nest (`{ statusCode, message, error }`); qualquer outro erro vira 500 com `message: 'Erro interno'`, é logado com stack e, se o Sentry estiver ligado, enviado com `Sentry.captureException`. Nada com status abaixo de 500 vai ao Sentry (FND-07 AC5 e AC6).
- **Dependencies**: `node:async_hooks`, `node:crypto`, `@sentry/nestjs`
- **Reuses**: `ConsoleLogger` do Nest (sem `nestjs-pino`)

### Web: shell, tema e página provisória

- **Purpose**: Layout raiz com tokens, fonte, tema e cabeçalho; página `/` com o status da API (FND-08).
- **Location**: `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/lib/`
- **Interfaces**:
  - `app/layout.tsx`: `<html lang="pt-BR" suppressHydrationWarning>`, Plus Jakarta Sans por `next/font/google`, `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`), `AppHeader`
  - `app/globals.css`: Tailwind 4 + tokens do design system nos seletores `:root` e `.dark`
  - `components/theme-provider.tsx`: wrapper client do `next-themes` (padrão do shadcn/ui)
  - `components/app-header.tsx`: nome "Amigo Secreto" e `ThemeToggle`
  - `components/theme-toggle.tsx`: botão que alterna `light`/`dark`; o nome acessível vem de dois textos `sr-only`, um visível só no claro ("Ativar tema escuro") e outro só no escuro ("Ativar tema claro"), escolhidos por CSS a partir da classe `dark`, sem depender de estado montado no cliente (sem divergência de hidratação)
  - `lib/api-status.ts`: `getApiStatus(): Promise<'online' | 'unavailable'>`, faz `fetch(\`${API_INTERNAL_URL}/health\`, { cache: 'no-store', signal: AbortSignal.timeout(5000) })` e devolve `online` só com 200
  - `app/page.tsx`: Server Component que chama `getApiStatus()` e mostra "API online" ou "API indisponível"
  - `next.config.ts`: `rewrites()` com `/api/:path*` → `${API_INTERNAL_URL}/:path*` (AD-006)
  - `instrumentation.ts` (`register` + `onRequestError = Sentry.captureRequestError`), `sentry.server.config.ts` e `instrumentation-client.ts`: `Sentry.init` só com `NEXT_PUBLIC_SENTRY_DSN`, mesmas restrições de PII da API, sem replay, sem tracing
- **Dependencies**: `next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `next-themes`, `@sentry/nextjs`, `@amigo-secreto/shared`; shadcn/ui inicializado (`components.json`) sem componentes adicionados além do necessário
- **Reuses**: tokens e guia do design system

### Testes

- **Purpose**: Unitários, integração e e2e rodando com um comando, sem preparação (FND-09).
- **Location**: ver tabela
- **Interfaces**:

  | Camada | Ferramenta | Local | Comando |
  | --- | --- | --- | --- |
  | API unitário | Vitest 5 + `unplugin-swc` (metadados de decorators) | `apps/api/src/**/*.spec.ts` | `vitest run --project unit` |
  | API integração | Vitest 5 + supertest + Testcontainers no `globalSetup` | `apps/api/test/**/*.int-spec.ts` | `vitest run --project integration` |
  | Web componente | Vitest 5 + Testing Library + jsdom | `apps/web/src/**/*.test.tsx` | `vitest run` |
  | Web e2e | Playwright 1.65 + `@axe-core/playwright` | `apps/web/e2e/**/*.spec.ts` | `node scripts/e2e.ts` |

  - O `globalSetup` da integração verifica o Docker antes de subir o container e, sem ele, falha com "Os testes de integração precisam do Docker em execução." (FND-09 AC2)
  - `apps/web/scripts/e2e.ts` sobe o PostgreSQL com Testcontainers, roda `migration:run`, chama `playwright test` com `DATABASE_URL` no ambiente e para o container num `finally`. O script não depende da ordem entre `globalSetup` e `webServer` do Playwright.
  - `playwright.config.ts`: `webServer` com a API (`node --import ./dist/instrument.js dist/main.js`, porta 3001), o web (`next start`, porta 3000) e um segundo web (`next start`, porta 3100) com `API_INTERNAL_URL` apontando para uma porta fechada, para o estado "API indisponível" (FND-08 AC9)
  - Teste do primeiro quadro (FND-08 AC6): `page.addInitScript` registra a classe do `<html>` no primeiro `requestAnimationFrame`; o teste grava o tema no `localStorage`, emula o esquema oposto e compara
  - Nomes de `describe`/`it` em português (regra do projeto)
- **Dependencies**: `vitest`, `unplugin-swc`, `@swc/core`, `supertest`, `testcontainers`, `@testcontainers/postgresql`, `@testing-library/react`, `@testing-library/dom`, `jsdom`, `@vitejs/plugin-react`, `@playwright/test`, `@axe-core/playwright`
- **Reuses**: `configureApp` da API

### Lint e formatação

- **Purpose**: ESLint 9 + Prettier por pacote (FND-01 AC5).
- **Location**: `apps/api/eslint.config.mjs`, `apps/web/eslint.config.mjs`, `packages/shared/eslint.config.mjs`
- **Interfaces**:
  - API e shared: `typescript-eslint` com regras que usam tipos (`recommendedTypeChecked`)
  - Web: `eslint-config-next` (traz `jsx-a11y`, `react`, `react-hooks`, `import`) + `typescript-eslint`
  - Script `lint` de cada pacote: `eslint . --max-warnings 0 && prettier --check .`
- **Dependencies**: `eslint@9`, `typescript-eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier`

### CI

- **Purpose**: Os cinco gates em PR e push na `main` (FND-10).
- **Location**: `.github/workflows/ci.yml`
- **Interfaces**: um job em `ubuntu-latest`: `actions/checkout`, `pnpm/action-setup` (versão do `packageManager`), `actions/setup-node` com `node-version-file: .nvmrc` e cache do pnpm, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm exec playwright install --with-deps chromium` (no `apps/web`), `pnpm test:e2e`. O Docker do runner atende o Testcontainers.
- **Dependencies**: GitHub Actions
- **Reuses**: scripts da raiz

---

## Data Models

Nenhuma entidade de domínio nesta feature. O banco recebe só a tabela de controle de migrations do TypeORM.

Variáveis de ambiente:

| App | Variável | Obrigatória | Exemplo no `.env.example` |
| --- | --- | --- | --- |
| api | `NODE_ENV` | não (padrão `development`) | `development` |
| api | `PORT` | não (padrão 3001) | `3001` |
| api | `DATABASE_URL` | sim | `postgres://amigo:amigo@localhost:5432/amigo_secreto` |
| api | `SENTRY_DSN` | não | vazio |
| web | `API_INTERNAL_URL` | sim | `http://localhost:3001` |
| web | `NEXT_PUBLIC_SENTRY_DSN` | não | vazio |

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Variável de ambiente ausente ou inválida na API | `validateEnvironment` lança no boot com o nome de cada variável | Processo encerra com código ≠ 0 e a mensagem |
| Banco não responde em 3 s | Terminus marca `database` como `down` | `GET /health` → 503 `status: "error"`; `/` mostra "API indisponível" |
| API fora do ar ou demora mais de 5 s | `getApiStatus` captura o erro e o timeout | `/` mostra "API indisponível"; cabeçalho e tema funcionam |
| Corpo com campo não declarado | `ValidationPipe` com `forbidNonWhitelisted` | 400, handler não roda |
| Campo inválido | `ValidationPipe` | 400 com `message` listando cada regra violada |
| Erro não tratado num handler | `AllExceptionsFilter` | 500 com `message: "Erro interno"`; stack só no log; enviado ao Sentry se houver DSN |
| Sentry fora do ar | SDK envia em segundo plano | Nenhum |
| `localStorage` bloqueado | `next-themes` cai no tema do sistema | Tema do sistema a cada visita |
| Docker indisponível nos testes | `globalSetup` checa antes de subir | Teste falha com a mensagem sobre o Docker |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| --- | --- | --- | --- |
| O CI do TypeORM 1.x testa só Node 20 e 24; o projeto usa Node 26 | `apps/api` (dependência `typeorm`) | Incompatibilidade só vista em execução | Testes de integração rodam no Node 26 local e no CI; se algo quebrar, voltar ao Node 24 é trocar `.nvmrc` e `engines` |
| TypeScript 7 já saiu, mas o `typescript-eslint` aceita só `<6.1.0` | `package.json` dos pacotes | Lint quebra se alguém subir para o 7 | Fixar `typescript@~6.0.3`; subir junto com o `typescript-eslint` |
| `eslint-plugin-jsx-a11y` declara suporte só até o ESLint 9 | `apps/web/eslint.config.mjs` | Ficar preso a uma linha de manutenção | ESLint 9.39; reavaliar quando os plugins declararem o 10 |
| Vitest usa esbuild, que não emite metadados de decorators; sem eles a injeção do Nest e os tipos de coluna do TypeORM falham nos testes | `apps/api/vitest.config.ts` | Testes falham ou passam por motivo errado | `unplugin-swc` no Vitest e SWC como builder do Nest, com a mesma configuração de decorators |
| A CLI do TypeORM em ESM depende de `ts-node`, pouco estável com ESM no Node 26 | scripts `migration:*` | Migrations não rodam | CLI roda sobre `dist/` compilado; `migration:generate` compila antes |
| Ordem entre `globalSetup` e `webServer` do Playwright não está documentada de forma explícita | `apps/web/playwright.config.ts` | Servidores sobem sem `DATABASE_URL` | `scripts/e2e.ts` cria o banco antes de chamar o Playwright |
| `next-themes` 0.4.6 é a última versão e não declara React 19.3 além de `^19` | `apps/web/src/components/theme-provider.tsx` | Aviso de script no console ou tema piscando | O teste do primeiro quadro (FND-08 AC6) pega regressão; se falhar, trocar por um script inline próprio de poucas linhas |
| PostgreSQL 19 sai em 19/11/2026 | `docker-compose.yml`, Testcontainers | Nenhum agora | Usar 18; subir de versão depois que a hospedagem for escolhida |
| `next/font/google` baixa a fonte no build | `apps/web/src/app/layout.tsx` | Build sem rede falha | CI tem rede; o build local também. Trocar por fonte local se virar problema |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Versões | Node 26.13 LTS, pnpm 12.18, TypeScript 6.0.3, NestJS 12.4, Next.js 16.4.6, React 19.3, TypeORM 1.1.2, `pg` 8.23, PostgreSQL 18, Tailwind 4.3, shadcn CLI 4.23, Turborepo 2.11, Vitest 5.1, Playwright 1.65, Sentry 11.12, ESLint 9.39, Prettier 3.10 | Últimas estáveis em 2026-11-12, conferidas no registro do npm e no índice do Node; TypeScript e ESLint limitados pela compatibilidade dos plugins |
| Node e ESLint | Node 26, ESLint 9 | Escolhas do usuário (context.md) |
| Validação do ambiente | `class-validator` numa função `validate()` do `@nestjs/config` | Já é dependência dos DTOs; evita adicionar Zod |
| Request id e logs | `AsyncLocalStorage` + `ConsoleLogger` estendido | Nativos do Node e do Nest; `nestjs-pino` e `nestjs-cls` seriam dependências sem ganho aqui. O NestJS Observe faria isso, mas é serviço hospedado pago |
| Health check | `@nestjs/terminus` | Oficial; resolve timeout e o 503 sem código próprio |
| Builder da API | SWC (`nest-cli.json` `builder: "swc"`); `tsc --noEmit` no `typecheck` | Mesmo transpilador do Vitest; build rápido; tipos checados à parte |
| CLI do TypeORM | Sobre `dist/` compilado | Evita `ts-node` em ESM |
| Pacote shared | Compilado com `tsc` para `dist/`, só tipos | Consumível pela API ESM e pelo Next sem transpilar fonte de outro pacote; cumpre FND-01 AC3 |
| Sentry no web | `instrumentation.ts`, `sentry.server.config.ts` e `instrumentation-client.ts`, sem `withSentryConfig` | Sem upload de source map até haver hospedagem; menos configuração |
| Tema | `next-themes` | Padrão documentado pelo shadcn/ui; o script de bloqueio evita o tema errado no primeiro quadro |
| e2e do estado "API indisponível" | Segundo `next start` na porta 3100 com `API_INTERNAL_URL` para uma porta fechada | Testa o estado real sem derrubar a API das outras specs |
| Nome dos testes de integração | `*.int-spec.ts` em `apps/api/test/` | Diferencia de unitários (`*.spec.ts`) e do e2e do Playwright |

> Decisões de projeto desta fase: AD-006 (mesma origem via rewrites) e AD-007 (ESM) em `.specs/STATE.md`.
