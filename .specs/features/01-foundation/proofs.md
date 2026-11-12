# 01-foundation proofs

**HEAD**: 8695c72
**Tree**: clean
**Shell**: /bin/sh
**Result**: 99 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run workspaces / @amigo-secreto/api` | pass |
| C1 | `run workspaces / @amigo-secreto/web` | pass |
| C1 | `run workspaces / @amigo-secreto/shared` | pass |
| C2 | `pnpm install --frozen-lockfile` | pass |
| C3 | `run graph / @amigo-secreto/api#build -> @amigo-secreto/shared#build` | pass |
| C3 | `run graph / @amigo-secreto/web#build -> @amigo-secreto/shared#build` | pass |
| C3 | `pnpm build` | pass |
| C4 | `walk - com o Compose de pé, pnpm dev; curl localhost:3001/health responde e localhost:3000 abre; editar um arq` | pass (Walked) |
| C5 | `run lint / @amigo-secreto/api:lint:` | pass |
| C5 | `run lint / @amigo-secreto/web:lint:` | pass |
| C5 | `run lint / @amigo-secreto/shared:lint:` | pass |
| C5 | `walk - uma variável não usada na API e um arquivo fora do padrão do Prettier no shared fazem pnpm lint sair co` | pass (Walked) |
| C6 | `run typecheck / @amigo-secreto/api:typecheck:` | pass |
| C6 | `run typecheck / @amigo-secreto/web:typecheck:` | pass |
| C6 | `run typecheck / @amigo-secreto/shared:typecheck:` | pass |
| C6 | `walk - um erro de tipo no web faz pnpm typecheck sair com código diferente de 0 e nenhum arquivo novo aparece ` | pass (Walked) |
| C7 | `run testall / @amigo-secreto/shared:test:` | pass |
| C7 | `run testall / @amigo-secreto/api:test:` | pass |
| C7 | `run testall / @amigo-secreto/web:test:` | pass |
| C8 | `walk - um arquivo com aspas e indentação fora do padrão volta ao padrão depois de pnpm format` | pass (Walked) |
| C9 | `test "$(cat .nvmrc)" = "$(node -p "require('./package.json').engines.node")"` | pass |
| C10 | `walk - docker compose up -d; com o .env copiado do exemplo, pnpm --filter @amigo-secreto/api migration:run con` | pass (Walked) |
| C11 | `test "$(docker compose config --services)" = "postgres"` | pass |
| C12 | `run api / ✓ validateEnvironment > o .env.example declara todas as variáveis validadas` | pass |
| C12 | `grep -q '^API_INTERNAL_URL=' apps/web/.env.example && grep -q '^NEXT_PUBLIC_SENTRY_DSN=' apps/web/.env.example` | pass |
| C13 | `walk - clone limpo, docker compose up -d, cp dos dois .env.example, migration:run, pnpm dev e localhost:3000 m` | pass (Walked) |
| C14 | `run api / ✓ validateEnvironment > lança erro que nomeia DATABASE_URL quando ela falta` | pass |
| C14 | `run api / ✓ validateEnvironment > lança erro que nomeia DATABASE_URL quando ela não é uma URL postgres` | pass |
| C14 | `walk - sem DATABASE_URL no .env, pnpm --filter @amigo-secreto/api start encerra com código diferente de 0 e a ` | pass (Walked) |
| C15 | `run api / ✓ databaseOptions > desliga synchronize em development, test e production` | pass |
| C16 | `run api / ✓ databaseOptions > não roda migrations ao iniciar` | pass |
| C17 | `node -e "const s=require('./apps/api/package.json').scripts; process.exit(['migration:generate','migration:run` | pass |
| C18 | `run api / ✓ migration:run > cria a tabela de controle de migrations num banco vazio` | pass |
| C18 | `run api / ✓ migration:run > roda num clone sem build, sem a pasta dist` | pass |
| C19 | `run api / ✓ GET /health > responde 200 com status ok quando o banco responde` | pass |
| C20 | `run api / ✓ GET /health > responde 503 com status error quando o banco não responde em 3 segundos` | pass |
| C21 | `run api / ✓ GET /health > responde sem cabeçalho de autenticação` | pass |
| C22 | `grep -rq "from '@amigo-secreto/shared'" apps/api/src/health && grep -rq "from '@amigo-secreto/shared'" apps/we` | pass |
| C23 | `run e2e / ✓ rewrite da API › GET /api/health no web devolve o status e o corpo da API` | pass |
| C24 | `run api / ✓ validação de entrada > responde 400 e não executa o handler quando o corpo tem campo não declarado` | pass |
| C25 | `run api / ✓ validação de entrada > responde 400 com uma mensagem por regra violada` | pass |
| C26 | `run api / ✓ AllExceptionsFilter > responde 500 com Erro interno sem stack nem mensagem original` | pass |
| C26 | `run api / ✓ AllExceptionsFilter > responde Erro interno quando o handler lança InternalServerErrorException co` | pass |
| C27 | `run api / ✓ validação de entrada > responde no formato statusCode, message e error` | pass |
| C28 | `run api / ✓ Swagger > serve /docs e /docs-json fora de produção` | pass |
| C29 | `run api / ✓ Swagger > responde 404 em /docs e /docs-json em produção` | pass |
| C30 | `run api / ✓ Swagger > documenta GET /health com as respostas 200 e 503` | pass |
| C31 | `run api / ✓ AppLogger > escreve uma linha JSON com level, timestamp e message em produção` | pass |
| C32 | `run api / ✓ request id > devolve o x-request-id recebido e o usa nos logs da requisição` | pass |
| C33 | `run api / ✓ request id > gera um UUID quando a requisição não traz x-request-id` | pass |
| C34 | `run api / ✓ BusinessEventsService > registra event, timestamp e os atributos no log` | pass |
| C34 | `run api / ✓ BusinessEventsService > rejeita em tempo de compilação atributos com os nomes que o log ocupa` | pass |
| C34 | `run typecheck / @amigo-secreto/api:typecheck: $ tsc --noEmit` | pass |
| C35 | `run api / ✓ AllExceptionsFilter > envia ao Sentry a exceção que resulta em 500` | pass |
| C35 | `run api / ✓ AllExceptionsFilter > envia ao Sentry a InternalServerErrorException lançada com mensagem` | pass |
| C35 | `run api / ✓ AllExceptionsFilter > repassa o corpo de um 503 e não o envia ao Sentry` | pass |
| C35 | `run api / ✓ instrument > inicializa o Sentry com o SENTRY_DSN posto só no .env` | pass |
| C36 | `run api / ✓ AllExceptionsFilter > não envia ao Sentry erros que resultam em 4xx` | pass |
| C37 | `run api / ✓ initSentry > não inicializa o Sentry sem SENTRY_DSN` | pass |
| C38 | `run web / ✓ sentryOptions > liga o Sentry no navegador e no servidor quando NEXT_PUBLIC_SENTRY_DSN existe` | pass |
| C38 | `run web / ✓ instrumentation > exporta onRequestError do Sentry` | pass |
| C39 | `run api / ✓ initSentry > desliga a coleta de dados pessoais, sem tracing e remove corpo e cookies do evento` | pass |
| C39 | `run web / ✓ sentryOptions > desliga a coleta de dados pessoais, sem replay e sem tracing` | pass |
| C40 | `run e2e / ✓ tema › aplica os tokens do design system no tema claro` | pass |
| C40 | `run e2e / ✓ tema › aplica os tokens do design system no tema escuro` | pass |
| C41 | `run e2e / ✓ página inicial › declara lang pt-BR` | pass |
| C42 | `run web / ✓ AppHeader > mostra o nome Amigo Secreto e o botão de tema` | pass |
| C42 | `run e2e / ✓ página inicial › mostra o cabeçalho com Amigo Secreto e o botão de tema` | pass |
| C43 | `run e2e / ✓ tema › segue o tema escuro do sistema quando não há tema salvo` | pass |
| C43 | `run e2e / ✓ tema › segue o tema claro do sistema quando não há tema salvo` | pass |
| C44 | `run web / ✓ ThemeToggle > troca para o tema escuro quando o claro está ativo` | pass |
| C44 | `run e2e / ✓ tema › o botão troca o tema e a escolha sobrevive ao recarregar` | pass |
| C45 | `run e2e / ✓ tema › pinta o primeiro quadro no tema salvo` | pass |
| C46 | `run e2e / ✓ tema › o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro` | pass |
| C47 | `run web / ✓ HomePage > mostra API online quando o status é online` | pass |
| C47 | `run e2e / ✓ página inicial › mostra API online quando a API responde` | pass |
| C48 | `run web / ✓ getApiStatus > devolve unavailable quando a API responde 503` | pass |
| C48 | `run web / ✓ getApiStatus > devolve unavailable quando a API não responde` | pass |
| C48 | `run web / ✓ getApiStatus > devolve unavailable quando a API responde 200 sem status ok` | pass |
| C48 | `run e2e / ✓ página inicial › mostra API indisponível e o tema funciona quando a API não responde` | pass |
| C49 | `run e2e / ✓ layout › não rola na horizontal em 360 px` | pass |
| C49 | `run e2e / ✓ layout › não rola na horizontal em 1440 px` | pass |
| C50 | `run e2e / ✓ acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema claro` | pass |
| C50 | `run e2e / ✓ acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema escuro` | pass |
| C51 | `pnpm turbo run test --force --filter=@amigo-secreto/api && test -z "$(docker ps -q --filter label=org.testcont` | pass |
| C52 | `run api / ✓ ensureDocker > falha com a mensagem sobre o Docker quando ele não está disponível` | pass |
| C53 | `pnpm test:e2e && test -z "$(docker ps -q --filter label=org.testcontainers=true --filter ancestor=postgres:18)` | pass |
| C54 | `run web / ✓ AppHeader > mostra o nome Amigo Secreto e o botão de tema` | pass |
| C55 | `walk - PR aberto contra a main mostra o workflow rodando os cinco comandos` | pass (Walked) |
| C56 | `walk - o push na main dispara o mesmo workflow` | pass (Walked) |
| C57 | `walk - um commit com erro de lint num PR deixa o check vermelho` | pass (Walked) |
| C58 | `grep -q 'node-version-file: .nvmrc' .github/workflows/ci.yml` | pass |
| C59 | `run web / ✓ getApiStatus > lança erro que nomeia API_INTERNAL_URL quando ela falta` | pass |
| C60 | `run web / ✓ proxy > lança erro que nomeia API_INTERNAL_URL quando ela falta` | pass |
| C61 | `run typecheck / @amigo-secreto/shared:build: $ tsc -p tsconfig.build.json` | pass |
| C61 | `run typecheck / @amigo-secreto/web:typecheck: ✓ Types generated successfully` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run workspaces` - exit 0

```
@amigo-secreto/shared
@amigo-secreto/api
@amigo-secreto/web
```

`Run graph` - exit 0

```
digraph {
	compound = "true"
	newrank = "true"
	subgraph "root" {
		"[root] @amigo-secreto/api#build" -> "[root] @amigo-secreto/shared#build"
		"[root] @amigo-secreto/shared#build" -> "[root] ___ROOT___"
		"[root] @amigo-secreto/web#build" -> "[root] @amigo-secreto/shared#build"
	}
}
```

`Run lint` - exit 0

```
@amigo-secreto/web:lint: cache bypass, force executing 0b50af05f9a6cafa
@amigo-secreto/web:lint: $ eslint . --max-warnings 0 && prettier --check . --ignore-path ../../.gitignore --ignore-path ../../.prettierignore
@amigo-secreto/api:lint: $ eslint . --max-warnings 0 && prettier --check . --ignore-path ../../.gitignore --ignore-path ../../.prettierignore
@amigo-secreto/shared:lint: Checking formatting...
@amigo-secreto/shared:lint: All matched files use Prettier code style!
@amigo-secreto/api:lint: Checking formatting...
@amigo-secreto/api:lint: All matched files use Prettier code style!
@amigo-secreto/web:lint: Checking formatting...
@amigo-secreto/web:lint: All matched files use Prettier code style!

 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
  Time:    4.285s 

$ turbo run lint --force
```

`Run typecheck` - exit 0

```
@amigo-secreto/shared:typecheck: cache bypass, force executing f5b9d23d95f7c1f9
@amigo-secreto/shared:build: $ tsc -p tsconfig.build.json
@amigo-secreto/shared:typecheck: $ tsc --noEmit
@amigo-secreto/api:typecheck: cache bypass, force executing 473e66129ddc56dc
@amigo-secreto/web:typecheck: cache bypass, force executing 5556c77c53ec6552
@amigo-secreto/web:typecheck: $ next typegen && tsc --noEmit
@amigo-secreto/api:typecheck: $ tsc --noEmit
@amigo-secreto/web:typecheck: Generating route types...
@amigo-secreto/web:typecheck: ✓ Types generated successfully

 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
  Time:    1.954s 

$ turbo run typecheck --force
```

`Run testall` - exit 0

```
@amigo-secreto/api:test:  ✓  integration  test/health.int-spec.ts (3 tests) 3493ms
@amigo-secreto/api:test:    ✓ GET /health (3)
@amigo-secreto/api:test:      ✓ responde 503 com status error quando o banco não responde em 3 segundos 3012ms
@amigo-secreto/api:test: 
@amigo-secreto/api:test:  Test Files  13 passed (13)
@amigo-secreto/api:test:       Tests  37 passed (37)
@amigo-secreto/api:test:    Start at  14:09:40
@amigo-secreto/api:test:    Duration  7.09s (tests 62%, import 36%, transform 2%)
@amigo-secreto/api:test: 

 Tasks:    5 successful, 5 total
Cached:    0 cached, 5 total
  Time:    8.874s 

$ turbo run test --force
```

`Run api` - exit 0

```
@amigo-secreto/api:test:  ✓  unit  src/observability/business-events.service.spec.ts > BusinessEventsService > inclui o requestId quando há requisição 0ms
@amigo-secreto/api:test:  ✓  integration  test/migrations.int-spec.ts > migration:run > cria a tabela de controle de migrations num banco vazio 1503ms
@amigo-secreto/api:test:  ✓  integration  test/migrations.int-spec.ts > migration:run > roda num clone sem build, sem a pasta dist 930ms
@amigo-secreto/api:test:  ✓  integration  test/health.int-spec.ts > GET /health > responde 503 com status error quando o banco não responde em 3 segundos 3007ms
@amigo-secreto/api:test:  ✓  integration  test/health.int-spec.ts > GET /health > responde sem cabeçalho de autenticação 8ms
@amigo-secreto/api:test: 
@amigo-secreto/api:test:  Test Files  13 passed (13)
@amigo-secreto/api:test:       Tests  37 passed (37)
@amigo-secreto/api:test:    Start at  14:09:49
@amigo-secreto/api:test:    Duration  6.32s (tests 64%, import 34%, transform 1%)
@amigo-secreto/api:test: 

 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
  Time:    7.658s
```

`Run e2e` - exit 0

```
@amigo-secreto/web:test:e2e:   ✓   9 [chromium] › e2e/home.spec.ts:26:3 › página inicial › mostra API online quando a API responde (168ms)
@amigo-secreto/web:test:e2e:   ✓   8 [chromium] › e2e/theme.spec.ts:188:3 › tema › o botão troca o tema e a escolha sobrevive ao recarregar (296ms)
@amigo-secreto/web:test:e2e:   ✓  11 [chromium] › e2e/home.spec.ts:33:3 › página inicial › mostra API indisponível e o tema funciona quando a API não responde (231ms)
@amigo-secreto/web:test:e2e:   ✓  12 [chromium] › e2e/theme.spec.ts:205:3 › tema › pinta o primeiro quadro no tema salvo (129ms)
@amigo-secreto/web:test:e2e:   ✓  10 [chromium] › e2e/accessibility.spec.ts:44:3 › acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema claro (474ms)
@amigo-secreto/web:test:e2e:   ✓  13 [chromium] › e2e/theme.spec.ts:220:3 › tema › o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro (165ms)
@amigo-secreto/web:test:e2e:   ✓  15 [chromium] › e2e/theme.spec.ts:238:3 › tema › aplica os tokens do design system no tema claro (155ms)
@amigo-secreto/web:test:e2e:   ✓  14 [chromium] › e2e/accessibility.spec.ts:56:3 › acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema escuro (384ms)
@amigo-secreto/web:test:e2e:   ✓  16 [chromium] › e2e/theme.spec.ts:245:3 › tema › aplica os tokens do design system no tema escuro (144ms)
@amigo-secreto/web:test:e2e: 
@amigo-secreto/web:test:e2e:   16 passed (4.0s)

 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
  Time:    10.448s
```

`Run web` - exit 0

```
@amigo-secreto/web:test:  ✓ src/components/theme-toggle.test.tsx > ThemeToggle > troca para o tema escuro quando o claro está ativo 49ms
@amigo-secreto/web:test:  ✓ src/components/theme-toggle.test.tsx > ThemeToggle > troca para o tema claro quando o escuro está ativo 10ms
@amigo-secreto/web:test:  ✓ src/lib/api-status.test.ts > getApiStatus > devolve unavailable quando a API passa de 5 segundos 5007ms
@amigo-secreto/web:test:  ✓ src/lib/api-status.test.ts > getApiStatus > devolve unavailable quando a API responde 200 sem status ok 9ms
@amigo-secreto/web:test:  ✓ src/lib/api-status.test.ts > getApiStatus > lança erro que nomeia API_INTERNAL_URL quando ela falta 2ms
@amigo-secreto/web:test: 
@amigo-secreto/web:test:  Test Files  7 passed (7)
@amigo-secreto/web:test:       Tests  16 passed (16)
@amigo-secreto/web:test:    Start at  14:10:07
@amigo-secreto/web:test:    Duration  5.39s (tests 65%, environment 16%, setup 12%, import 5%, transform 1%)
@amigo-secreto/web:test: 

 Tasks:    2 successful, 2 total
Cached:    0 cached, 2 total
  Time:    6.155s
```

`pnpm install --frozen-lockfile` - exit 0

```
Scope: all 4 workspace projects
✓ Lockfile passes supply-chain policies (verified 1h ago)
Lockfile is up to date, resolution step is skipped
Done in 56ms using pnpm v12.18.0
```

`pnpm build` - exit 0

```
@amigo-secreto/web:build: ƒ Proxy (Middleware)
@amigo-secreto/web:build: 
@amigo-secreto/web:build: ○  (Static)   prerendered as static content
@amigo-secreto/web:build: ƒ  (Dynamic)  server-rendered on demand
@amigo-secreto/web:build: 
@amigo-secreto/api:build: cache hit, replaying logs 3318940c695bf208
@amigo-secreto/api:build: $ nest build
@amigo-secreto/api:build: >  SWC  Running...
@amigo-secreto/api:build: Successfully compiled: 17 files with swc (40.1ms)

 Tasks:    3 successful, 3 total
Cached:    3 cached, 3 total
  Time:    24ms >>> FULL TURBO

$ turbo run build
```

`test "$(cat .nvmrc)" = "$(node -p "require('./package.json').engines.node")"` - exit 0

```
(no output)
```

`test "$(docker compose config --services)" = "postgres"` - exit 0

```
(no output)
```

`grep -q '^API_INTERNAL_URL=' apps/web/.env.example && grep -q '^NEXT_PUBLIC_SENTRY_DSN=' apps/web/.env.example` - exit 0

```
(no output)
```

`node -e "const s=require('./apps/api/package.json').scripts; process.exit(['migration:generate','migration:run` - exit 0

```
(no output)
```

`grep -rq "from '@amigo-secreto/shared'" apps/api/src/health && grep -rq "from '@amigo-secreto/shared'" apps/we` - exit 0

```
(no output)
```

`pnpm turbo run test --force --filter=@amigo-secreto/api && test -z "$(docker ps -q --filter label=org.testcont` - exit 0

```
@amigo-secreto/api:test:      ✓ cria a tabela de controle de migrations num banco vazio 1636ms
@amigo-secreto/api:test:      ✓ roda num clone sem build, sem a pasta dist 930ms
@amigo-secreto/api:test:  ✓  integration  test/health.int-spec.ts (3 tests) 3634ms
@amigo-secreto/api:test:    ✓ GET /health (3)
@amigo-secreto/api:test:      ✓ responde 503 com status error quando o banco não responde em 3 segundos 3012ms
@amigo-secreto/api:test: 
@amigo-secreto/api:test:  Test Files  13 passed (13)
@amigo-secreto/api:test:       Tests  37 passed (37)
@amigo-secreto/api:test:    Start at  14:10:14
@amigo-secreto/api:test:    Duration  6.94s (tests 64%, import 35%, transform 1%)
@amigo-secreto/api:test: 

 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
  Time:    8.426s
```

`pnpm test:e2e && test -z "$(docker ps -q --filter label=org.testcontainers=true --filter ancestor=postgres:18)` - exit 0

```
@amigo-secreto/web:test:e2e:   ✓  11 [chromium] › e2e/home.spec.ts:33:3 › página inicial › mostra API indisponível e o tema funciona quando a API não responde (235ms)
@amigo-secreto/web:test:e2e:   ✓  12 [chromium] › e2e/theme.spec.ts:205:3 › tema › pinta o primeiro quadro no tema salvo (122ms)
@amigo-secreto/web:test:e2e:   ✓   8 [chromium] › e2e/accessibility.spec.ts:44:3 › acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema claro (479ms)
@amigo-secreto/web:test:e2e:   ✓  13 [chromium] › e2e/theme.spec.ts:220:3 › tema › o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro (164ms)
@amigo-secreto/web:test:e2e:   ✓  15 [chromium] › e2e/theme.spec.ts:238:3 › tema › aplica os tokens do design system no tema claro (147ms)
@amigo-secreto/web:test:e2e:   ✓  14 [chromium] › e2e/accessibility.spec.ts:56:3 › acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema escuro (386ms)
@amigo-secreto/web:test:e2e:   ✓  16 [chromium] › e2e/theme.spec.ts:245:3 › tema › aplica os tokens do design system no tema escuro (145ms)
@amigo-secreto/web:test:e2e: 
@amigo-secreto/web:test:e2e:   16 passed (4.2s)

 Tasks:    4 successful, 4 total
Cached:    3 cached, 4 total
  Time:    6.993s 

$ turbo run test:e2e
```

`grep -q 'node-version-file: .nvmrc' .github/workflows/ci.yml` - exit 0

```
(no output)
```
