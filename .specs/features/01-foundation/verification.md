# Foundation verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 64a181c
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `pnpm ls` dos workspaces (`run workspaces`) | yes - lista os três nomes; `pnpm-workspace.yaml` cobre `apps/*` e `packages/*` |
| C2 | `pnpm install --frozen-lockfile` | yes - repetido num clone limpo de d27c1f9, código 0 |
| C3 | `turbo run build --graph` (`run graph`) e `pnpm build` | yes - as duas arestas para `@amigo-secreto/shared#build` estão no grafo |
| C4 | walk | yes - a evidência registra restart da API e HTML novo do web sem reiniciar |
| C5 | `turbo run lint --force` (`run lint`) e walk | yes - a evidência registra saída 1 com variável não usada e com arquivo fora do Prettier |
| C6 | `turbo run typecheck --force` (`run typecheck`) e walk | no - o `pnpm typecheck` emite `packages/shared/dist` pelo `^build` (a própria saída do `run typecheck` mostra `@amigo-secreto/shared:build`); o critério diz "sem emitir arquivos" |
| C7 | `turbo run test --force` (`run testall`) | yes |
| C8 | walk | yes - reescreve o arquivo; também realinha `.specs/` porque o `.prettierignore` não o exclui |
| C9 | `test "$(cat .nvmrc)" = ...engines.node` | yes |
| C10 | walk | yes - credenciais do Compose (`amigo`/`amigo`/`amigo_secreto`) batem com `apps/api/.env.example`; o `migration:run` do walk só passou depois de `pnpm build` (ver C18) |
| C11 | `docker compose config --services` | yes |
| C12 | `env.validation.spec.ts` `o .env.example declara todas as variáveis validadas` e `grep` do `.env.example` do web | yes - a API não lê variável fora do `EnvironmentVariables`; o web lê só `API_INTERNAL_URL` e `NEXT_PUBLIC_SENTRY_DSN` |
| C13 | walk | yes - repetido por este Verifier num clone limpo de d27c1f9, só com `pnpm install`, `cp`, `docker compose up -d` e `pnpm dev`, sem `pnpm build`: `GET :3001/health` 200, `:3000` mostra "API online", `:3000/api/health` devolve o corpo da API |
| C14 | `env.validation.spec.ts` `lança erro que nomeia DATABASE_URL quando ela falta` / `... quando ela não é uma URL postgres` e walk | yes - o walk registra saída 1 com a mensagem |
| C15 | `database.options.spec.ts` `desliga synchronize em development, test e production` | yes |
| C16 | `database.options.spec.ts` `não roda migrations ao iniciar` | yes |
| C17 | `node -e` sobre os scripts de `apps/api/package.json` | yes |
| C18 | `migrations.int-spec.ts` `cria a tabela de controle de migrations num banco vazio` | no - o teste roda `pnpm migration:run` só depois do `build` que o `turbo.json:22-23` exige antes do `test`; num clone sem `dist/` o mesmo comando sai com 1 |
| C19 | `health.int-spec.ts` `responde 200 com status ok quando o banco responde` | yes |
| C20 | `health.int-spec.ts` `responde 503 com status error quando o banco não responde em 3 segundos` | yes - limita o tempo entre 3000 e 4500 ms; com o banco recusando conexão, sonda própria deu 503 em 4 ms |
| C21 | `health.int-spec.ts` `responde sem cabeçalho de autenticação` | yes |
| C22 | `grep` dos imports de `@amigo-secreto/shared` | yes - a negação só procura `type HealthResponse =`, uma `interface` redeclarada passaria |
| C23 | `api-rewrite.spec.ts` `GET /api/health no web devolve o status e o corpo da API` | no - compara dois corpos de requisições diferentes com `toEqual`, e o corpo traz `responseTime`; o teste passa ou falha conforme o ping leve o mesmo milissegundo (sonda própria: 1 ms na API, 2 ms pelo web) |
| C24 | `validation.int-spec.ts` `responde 400 e não executa o handler quando o corpo tem campo não declarado` | yes |
| C25 | `validation.int-spec.ts` `responde 400 com uma mensagem por regra violada` | no - cada campo viola uma regra só; com `stopAtFirstError: true` no `ValidationPipe` o teste continuaria verde e um campo com duas regras violadas teria uma mensagem |
| C26 | `all-exceptions.int-spec.ts` `responde 500 com Erro interno sem stack nem mensagem original` | yes - para `Error`; `InternalServerErrorException` com mensagem vaza o texto (achado) |
| C27 | `validation.int-spec.ts` `responde no formato statusCode, message e error` | yes |
| C28 | `swagger.int-spec.ts` `serve /docs e /docs-json fora de produção` | yes |
| C29 | `swagger.int-spec.ts` `responde 404 em /docs e /docs-json em produção` | yes |
| C30 | `swagger.int-spec.ts` `documenta GET /health com as respostas 200 e 503` | yes |
| C31 | `app-logger.spec.ts` `escreve uma linha JSON com level, timestamp e message em produção` | yes |
| C32 | `request-id.int-spec.ts` `devolve o x-request-id recebido e o usa nos logs da requisição` | yes |
| C33 | `request-id.int-spec.ts` `gera um UUID quando a requisição não traz x-request-id` | yes |
| C34 | `business-events.service.spec.ts` `registra event, timestamp e os atributos no log` | yes - atributos com nome `level`, `message` ou `timestamp` somem do log (achado) |
| C35 | `all-exceptions.int-spec.ts` `envia ao Sentry a exceção que resulta em 500` | yes - na camada do filtro; o `Sentry.init` do teste é próprio, a inicialização real da API não liga no `pnpm dev` nem lê o `.env` (achado) |
| C36 | `all-exceptions.int-spec.ts` `não envia ao Sentry erros que resultam em 4xx` | yes - JSON malformado também volta 400 sem evento (sonda própria) |
| C37 | `instrument.spec.ts` `não inicializa o Sentry sem SENTRY_DSN` | yes |
| C38 | `sentry-options.test.ts` `liga o Sentry no navegador e no servidor quando NEXT_PUBLIC_SENTRY_DSN existe` e `instrumentation.test.ts` `exporta onRequestError do Sentry` | yes - o teste importa `sentry.server.config` direto, o `register()` não é exercitado |
| C39 | `instrument.spec.ts` `desliga a coleta de dados pessoais, sem tracing e remove corpo e cookies do evento` e `sentry-options.test.ts` `desliga a coleta de dados pessoais, sem replay e sem tracing` | yes |
| C40 | `theme.spec.ts` `aplica os tokens do design system no tema claro` / `... no tema escuro` | no - cores e sombras são conferidas token a token, mas raios e espaçamento só por um valor cada (`10px` e `44px` do botão); `--radius-sm`, `--radius-lg`, `--radius-xl` e a escala de espaçamento podem mudar sem teste falhar |
| C41 | `home.spec.ts` `declara lang pt-BR` | yes |
| C42 | `app-header.test.tsx` `mostra o nome Amigo Secreto e o botão de tema` e `home.spec.ts` `mostra o cabeçalho com Amigo Secreto e o botão de tema` | yes |
| C43 | `theme.spec.ts` `segue o tema escuro do sistema quando não há tema salvo` / `segue o tema claro ...` | yes - com `localStorage` bloqueado o tema segue o sistema sem erro na página (sonda própria) |
| C44 | `theme-toggle.test.tsx` `troca para o tema escuro quando o claro está ativo` e `theme.spec.ts` `o botão troca o tema e a escolha sobrevive ao recarregar` | yes |
| C45 | `theme.spec.ts` `pinta o primeiro quadro no tema salvo` | yes |
| C46 | `theme.spec.ts` `o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro` | yes |
| C47 | `page.test.tsx` `mostra API online quando o status é online` e `home.spec.ts` `mostra API online quando a API responde` | yes |
| C48 | `api-status.test.ts` `devolve unavailable quando a API responde 503` / `... não responde` / `... responde 200 sem status ok` e `home.spec.ts` `mostra API indisponível e o tema funciona quando a API não responde` | no - o caso "200 sem status ok" usa corpo HTML, que já cai no `catch` do `response.json()`; tirar a checagem `body.status === 'ok'` não faz nenhum teste falhar |
| C49 | `accessibility.spec.ts` `não rola na horizontal em 360 px` / `... em 1440 px` | yes - sonda própria em 375, 414, 640, 767, 768, 1024 e 1280 px também sem rolagem |
| C50 | `accessibility.spec.ts` `página inicial sem violações WCAG 2.1 A/AA no tema claro` / `... no tema escuro` | yes |
| C51 | `pnpm turbo run test --force --filter=@amigo-secreto/api && test -z "$(docker ps ...)"` | yes |
| C52 | `ensure-docker.int-spec.ts` `falha com a mensagem sobre o Docker quando ele não está disponível` | yes - `global-setup.ts:18` chama `ensureDocker` antes do container |
| C53 | `pnpm test:e2e && test -z "$(docker ps ...)"` | yes |
| C54 | `app-header.test.tsx` `mostra o nome Amigo Secreto e o botão de tema` | yes |
| C55 | walk | yes - run 43254790592 (`pull_request`) com os cinco comandos |
| C56 | walk | yes - run 43255153229 (`push`) |
| C57 | walk | yes - run 43257177484 vermelho com `pnpm lint` falhando |
| C58 | `grep -q 'node-version-file: .nvmrc'` | yes |
| C59 | `api-status.test.ts` `lança erro que nomeia API_INTERNAL_URL quando ela falta` | yes |
| C60 | `proxy.test.ts` `lança erro que nomeia API_INTERNAL_URL quando ela falta` | yes - `/api//host/x` não vira repasse para outro host: o Next responde 308 antes do proxy (sonda própria) |
| C61 | `pnpm typecheck --force` (`run typecheck`) | yes - critério criado na rodada de correções (achado do typecheck); a saída do `run typecheck` mostra o `^build` do shared e o `next typegen` do web, e o exit 0 cobre os `tsc --noEmit` |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Com `SENTRY_DSN` definido, a API não inicializa o Sentry no `pnpm dev`, e no `start` ignora o valor posto no `.env` (FND-07, AC 5); nenhum teste cobre a inicialização real | `apps/api/package.json:7` - `nest start --watch` roda `dist/main` sem `--import`, e `apps/api/src/main.ts` não importa `instrument`; `apps/api/src/instrument.ts:33` lê `process.env` antes de o `ConfigModule` carregar o `.env`, e `apps/api/.env.example:4` põe o `SENTRY_DSN` no `.env`. Sonda: com o DSN só no `.env`, `node --import dist/instrument.js` deixa `Sentry.isInitialized()` em `false`; com o DSN no ambiente, `true` | carregar o `.env` no `instrument.ts` (como `data-source.ts:5-10` faz) e fazer o `dev` rodar com `--import ./dist/instrument.js` (`--exec` do `nest start` ou import no topo do `main.ts`); teste que suba o processo com o DSN só no `.env` e confira `Sentry.isInitialized()` | `63456d3` - C35 (`instrument > inicializa o Sentry com o SENTRY_DSN posto só no .env`); `dev` com `--import` conferido no processo filho |
| `pnpm --filter @amigo-secreto/api migration:run` num clone sem build sai com 1 (FND-03, AC 5) e o teste da C18 não percebe | `apps/api/package.json:14` aponta para `dist/database/data-source.js`, que não existe no clone (`dist` está no `.gitignore`); `turbo.json:22-23` compila a API antes do `test`. Sonda num clone limpo de d27c1f9: "Cannot find module .../apps/api/dist/database/data-source.js", código 1 | fazer o `migration:run` (e o `migration:revert`) compilar antes, como o `migration:generate` já faz, ou rodar o data source a partir do código-fonte; teste que rode o script sem `dist/` | `ba6f82c` - C18 (`migration:run > roda num clone sem build, sem a pasta dist`) |
| O teste da C23 compara corpos que trazem `responseTime` de dois pings diferentes, então fica instável | `apps/web/e2e/api-rewrite.spec.ts:13` - `toEqual` entre os dois corpos; sonda: `responseTime` 1 na API e 2 pelo web na mesma rodada | comparar status e corpo sem `responseTime` (ou só `status` e `details.*.status`), mantendo a igualdade do status HTTP | `07eedbf` - C23, corpo comparado sem `responseTime` |
| A C25 não prova "uma mensagem por regra" quando um campo viola mais de uma regra | `apps/api/test/validation.int-spec.ts:46-61` - `name: 'An'` e `age: -1` violam uma regra cada; com `stopAtFirstError: true` o teste segue verde. Na `HEAD` o comportamento está certo: `{ name: 42 }` devolve as duas mensagens de `name` | acrescentar um campo com duas regras violadas (ex.: `name: 42`) e exigir as duas mensagens dele | `27fd384` - C25, `name: 42` exige as duas mensagens; falha com `stopAtFirstError: true` |
| A C48 não prova o caso "200 com JSON sem `status` igual a `ok`" | `apps/web/src/lib/api-status.test.ts:86-94` usa corpo HTML, que já falha no `response.json()`; a regra em `apps/web/src/lib/api-status.ts:21` fica sem teste | caso com 200 e `{"status":"error"}` (e `{}`) esperando `unavailable` | `573303e` - C48, casos 200 com `{"status":"error"}` e `{}`; falha sem a checagem de `status` |
| Um handler que lança `InternalServerErrorException` com mensagem devolve 500 com a mensagem original no corpo (FND-05, AC 3; `scope.md` 8) | `apps/api/src/observability/all-exceptions.filter.ts:38-40` repassa o corpo de toda `HttpException`. Sonda: `throw new InternalServerErrorException('senha do banco: hunter2')` respondeu `{"message":"senha do banco: hunter2","error":"Internal Server Error","statusCode":500}` | responder `INTERNAL_ERROR` em todo status 500, mantendo o repasse dos outros 5xx (ex.: o 503 do health); teste com essa exceção | `a3c7868` - C26 (`AllExceptionsFilter > responde Erro interno quando o handler lança InternalServerErrorException com mensagem`) |
| Atributos de evento de negócio chamados `level`, `message` ou `timestamp` somem do log sem aviso (FND-07, AC 4: "os atributos informados") | `apps/api/src/observability/business-events.service.ts:15` mistura os atributos no mesmo nível dos campos do log. Sonda: `record('group.created', { timestamp: 1, level: 'x', message: 'm' })` escreveu só `event`, sem nenhum dos três atributos | proibir os nomes reservados no tipo `BusinessEventAttributes` ou aninhar os atributos numa chave própria; teste com um atributo de nome reservado | `d901a68` - C34, o tipo rejeita `level`, `pid`, `timestamp`, `message`, `context`, `requestId` e `event` (`@ts-expect-error` checado pelo `run typecheck`) |
| O teste da C40 não segura raios nem espaçamento do design system | `apps/web/e2e/theme.spec.ts:142-145` confere só `border-radius: 10px` e `44px` do botão; `apps/web/src/app/globals.css:159-162` define quatro raios | conferir `--radius-sm/md/lg/xl` e a escala de espaçamento contra os valores do design system, como já é feito com as cores | `807bc26` - C40, `--spacing` 4px, padding e gap do cabeçalho, `rounded-sm` 8px e `rounded-md` 10px renderizados; `lg` e `xl` sem uso na página (decisão do usuário) |
| `pnpm typecheck` emite arquivos: compila `packages/shared/dist` antes de checar (FND-01, AC 6) | `turbo.json:16-18` (`typecheck` depende de `^build`); a saída do `run typecheck` em `proofs.md` mostra `@amigo-secreto/shared:build: $ tsc -p tsconfig.build.json` | resolver os tipos do shared a partir de `src` no typecheck (condição `types` ou `paths`) e tirar o `^build`, ou emendar o critério com novo ID dizendo que o build do shared é pré-requisito | `e80a21b` - C61 (FND-01, AC 10), critério novo que descreve o `^build` e o `next typegen` |
| O 503 do `GET /health` vai ao Sentry a cada chamada com o banco fora, embora o critério fale de exceção não tratada que vira 500 | `apps/api/src/observability/all-exceptions.filter.ts:30` (`status >= 500`). Sonda: com o banco recusando conexão, um `GET /health` gerou um evento `ServiceUnavailableException` | capturar só status 500 (ou ignorar a `ServiceUnavailableException` do Terminus); teste com o health em 503 e Sentry sem evento | `e79c428` - C35 (`AllExceptionsFilter > repassa o corpo de um 503 e não o envia ao Sentry`) |
