# Email Jobs Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/02-email-jobs/design.md`
**Status**: Approved
**Approved**: 2026-11-18 - user: "Aprovadas."
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run api**: `pnpm turbo run test --force --filter=@amigo-secreto/api -- --reporter=verbose`

Linhas esperadas das provas: o nome de cada teste é o que a check escreve; a task que cria o teste usa exatamente esse texto em `describe`/`it` (o Vitest separa com `>`). Contagens de teste partem de 37 testes na API (contagem de `it(` em `apps/api/src` e `apps/api/test` na `main` em 2026-11-18), conferida na primeira execução; um desvio só de contagem inicial é registrado em `**Settled mid-build:**`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `.claude/rules/nest-api-coding-standards.md` (nomes de `describe`/`it` em português; sem metas de cobertura) e os testes da foundation (`apps/api/src/**/*.spec.ts`, `apps/api/test/**/*.int-spec.ts`); strong defaults aplicados à profundidade.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| API: funções puras (backoff, `lastError`, layout de e-mail), registro de handlers, validação do ambiente, transporte do Resend | unit | Todos os ramos; 1:1 com os critérios; todo edge case listado | `apps/api/src/**/*.spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| API: tabela e migration, fila, rodadas, agendamento, envio, sigilo, comando `email:test` | integration (Testcontainers) | Todo critério da task: sucesso + bordas + falhas; concorrência com duas conexões reais | `apps/api/test/**/*.int-spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project integration` |
| API: módulos (`*.module.ts`), tipos | none | Build gate | - | Build gate |
| Web: configuração do Playwright | e2e (existente) | A suíte atual continua verde com a API em produção | `apps/web/e2e/**/*.spec.ts` | `pnpm test:e2e` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com testes unitários | `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| Full | Tasks com testes de integração da API | `pnpm test` |
| E2E | Tasks que mudam o ambiente da API no e2e | `pnpm test && pnpm test:e2e` |
| Build | Fim de cada fase | `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Ao fim de cada fase roda o gate Build; cada fase vira um PR (AD-010).

### Phase 1: Tabela e fila

```
T1 → T2 → T3 → T4
```

### Phase 2: Rodadas e agendamento

```
T5 → T6 → T7 → T8
```

### Phase 3: E-mail e comando de teste

```
T9 → T10 → T11 → T12 → T13 → T14 → T15
```

---

## Task Breakdown

### Phase 1: Tabela e fila

#### T1: Criar a entidade Job e a migration da tabela

**What**: Entidade `Job` com `JobStatus` (`'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'`) e índice por `status` e `runAt`; `databaseOptions` ganha `entities` por glob (`**/*.entity.js`); migration `CreateJobTable` gerada por `pnpm --filter @amigo-secreto/api migration:generate`.
**Where**: `apps/api/src/jobs/job.entity.ts`
**Depends on**: None
**Reuses**: `apps/api/src/database/database.options.ts`, scripts de migration e `test/global-setup.ts` da foundation
**Requirement**: JOB-01

**Done when**:

- [x] Migration em `apps/api/src/database/migrations/` cria a tabela `job`, o tipo `job_status_enum` e o índice; o `down` remove os três
- [x] Teste `databaseOptions > carrega as entidades pelo glob de *.entity.js` em `src/database/database.options.spec.ts`
- [x] Testes em `test/job-table.int-spec.ts`: `tabela job > é criada pela migration com as colunas id, type, payload, runAt, status, attempts, lastError, lockedAt e createdAt`, `> recusa um status fora de PENDING, RUNNING, DONE e FAILED`, `> tem um índice por status e runAt` e `> é removida ao reverter a migration`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 42 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add job table`

---

#### T2: Criar o JobQueue e o JobsModule

**What**: `JobQueue.enqueue(type, payload, { runAt?, manager? })` grava o job `PENDING`, `attempts` 0, `runAt` = `options.runAt ?? new Date()`, pelo `manager` informado ou pelo da `DataSource`; `JobsModule` com `TypeOrmModule.forFeature([Job])`, exportando o `JobQueue`.
**Where**: `apps/api/src/jobs/job-queue.service.ts`
**Depends on**: T1
**Reuses**: `DatabaseModule` da foundation
**Requirement**: JOB-02

**Done when**:

- [x] `apps/api/src/jobs/jobs.module.ts` criado
- [x] Testes em `test/job-queue.int-spec.ts`: `JobQueue > grava o job PENDING com attempts 0 e runAt do momento da chamada`, `> usa o runAt informado`, `> não deixa job quando a transação de origem é desfeita` e `> deixa o job quando a transação de origem é confirmada`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 46 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add transactional job queue`

---

#### T3: Criar a política de retry dos jobs

**What**: `MAX_ATTEMPTS` 5, `STUCK_AFTER_MS` 10 min, `BATCH_SIZE` 50, `nextRunAt(attempts, failedAt)` (`failedAt` + 5^(attempts-1) min), `toLastError(error)` (`<name>: <message>` cortado em 500 caracteres) e `PermanentJobError` em `job-errors.ts`.
**Where**: `apps/api/src/jobs/job-retry.ts`
**Depends on**: T2
**Reuses**: nada
**Requirement**: JOB-04

**Done when**:

- [x] `apps/api/src/jobs/job-errors.ts` com `PermanentJobError`
- [x] Testes em `src/jobs/job-retry.spec.ts`: `nextRunAt > soma 1, 5, 25 e 125 minutos ao instante da falha nas tentativas 1 a 4`, `toLastError > corta a mensagem em 500 caracteres` e `toLastError > usa String do valor quando o erro não é Error`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 49 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add job retry policy`

---

#### T4: Criar o JobHandlerRegistry

**What**: `interface JobHandler { handle(job): Promise<void> }`; `JobHandlerRegistry.register(type, handler)` (tipo repetido lança "Handler já registrado para o tipo <type>") e `get(type)` (`undefined` sem handler); provido e exportado pelo `JobsModule`.
**Where**: `apps/api/src/jobs/job-handler.registry.ts`
**Depends on**: T3
**Reuses**: `JobsModule` de T2
**Requirement**: JOB-04

**Done when**:

- [x] Testes em `src/jobs/job-handler.registry.spec.ts`: `JobHandlerRegistry > devolve o handler registrado para o tipo`, `> devolve undefined para tipo sem handler` e `> lança erro ao registrar o mesmo tipo duas vezes`
- [x] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 52 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add job handler registry`

---

### Phase 2: Rodadas e agendamento

#### T5: Pegar e executar os jobs vencidos

**What**: `JobRunner.runRound(now)` pega até 50 jobs `PENDING` com `runAt <= now`, do mais antigo ao mais novo, com `FOR UPDATE SKIP LOCKED` (`setLock('pessimistic_write')` + `setOnLocked('skip_locked')`), marca `RUNNING` com `lockedAt = now` e `attempts + 1`, executa um de cada vez pelo handler do registro e marca `DONE` com `WHERE id AND status = 'RUNNING' AND lockedAt = now`; o `global-setup` cria um banco template migrado e `test/isolated-database.ts` clona um banco por arquivo de teste.
**Where**: `apps/api/src/jobs/job-runner.service.ts`
**Depends on**: T4
**Reuses**: `JobQueue` (T2), `JobHandlerRegistry` (T4), `BATCH_SIZE` (T3), `test/global-setup.ts`
**Requirement**: JOB-03

**Done when**:

- [x] `JobRunner` provido e exportado pelo `JobsModule`
- [x] `test/global-setup.ts` cria o banco template depois das migrations e antes de qualquer conexão; `test/isolated-database.ts` com `createIsolatedDatabase(name)`
- [x] Testes em `test/job-runner.int-spec.ts`: `JobRunner > pega no máximo 50 jobs vencidos, do runAt mais antigo ao mais novo`, `> marca o job pego como RUNNING com lockedAt e soma 1 a attempts`, `> entrega cada job a uma só de duas rodadas simultâneas`, `> marca DONE o job cujo handler termina sem erro`, `> executa os jobs da rodada um de cada vez, na ordem em que foram pegos` e `> não pega jobs com runAt no futuro, DONE ou FAILED`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 58 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): run due jobs without double processing`

---

#### T6: Tratar falhas dos jobs

**What**: No `JobRunner`, erro passageiro com `attempts` < 5 volta a `PENDING` com `runAt = nextRunAt` e aviso no log (`jobId`, `type`, `attempts`, `runAt`); com `attempts` 5, `PermanentJobError` ou tipo sem handler ("Tipo de job desconhecido: <type>"), `FAILED`; todo `FAILED` emite `job.failed` (`jobId`, `type`, `attempts`) e `Sentry.captureException` com as tags `jobId` e `type`; `lastError` por `toLastError`; erro da própria rodada vai só ao `logger.error`.
**Where**: `apps/api/src/jobs/job-runner.service.ts` (modify)
**Depends on**: T5
**Reuses**: `nextRunAt`, `toLastError`, `PermanentJobError` (T3), `BusinessEventsService`, padrão de checagem do Sentry de `test/all-exceptions.int-spec.ts`, captura de log de `test/fixtures/logging-fixture.module.ts`
**Requirement**: JOB-04

**Done when**:

- [x] Testes em `test/job-runner.int-spec.ts`: `JobRunner > devolve a PENDING com as esperas de 1, 5, 25 e 125 minutos`, `> marca FAILED quando a quinta tentativa falha`, `> marca FAILED na hora um erro definitivo`, `> marca FAILED o job de tipo sem handler com Tipo de job desconhecido`, `> emite job.failed com jobId, type e attempts quando o job vira FAILED`, `> envia ao Sentry o job que vira FAILED com jobId e type` e `> escreve um aviso sem Sentry quando o job volta a PENDING`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 65 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): retry failed jobs with backoff`

---

#### T7: Retomar jobs travados

**What**: No `JobRunner`, a rodada pega também jobs `RUNNING` com `lockedAt` anterior a `now - 10 min` e `attempts` < 5; antes de pegar, marca `FAILED` com "Processamento interrompido" os travados com `attempts` 5, com `job.failed` e Sentry.
**Where**: `apps/api/src/jobs/job-runner.service.ts` (modify)
**Depends on**: T6
**Reuses**: `STUCK_AFTER_MS` (T3), tratamento de `FAILED` de T6
**Requirement**: JOB-04

**Done when**:

- [x] Testes em `test/job-runner.int-spec.ts`: `JobRunner > retoma o job RUNNING travado há mais de 10 minutos com menos de 5 tentativas` e `> marca FAILED com Processamento interrompido o job travado com 5 tentativas`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 67 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): recover jobs stuck in running`

---

#### T8: Agendar a rodada a cada 10 segundos

**What**: `@nestjs/schedule` 12.0.4 exato; `JobScheduler.tick()` com `@Cron('*/10 * * * * *', { name: 'jobs', waitForCompletion: true })` chamando `runner.runRound()`; `JobsSchedulerModule` com `ScheduleModule.forRoot({ cronJobs: process.env.NODE_ENV !== 'test' })`, importado pelo `AppModule`.
**Where**: `apps/api/src/jobs/job.scheduler.ts`
**Depends on**: T7
**Reuses**: `JobRunner` (T5 a T7)
**Requirement**: JOB-03

**Done when**:

- [x] `apps/api/src/jobs/jobs-scheduler.module.ts` criado e importado em `app.module.ts`
- [x] Testes em `test/job-scheduler.int-spec.ts`: `JobScheduler > dispara a rodada a cada 10 segundos`, `> pula o tick enquanto a rodada anterior ainda roda` e `> não liga o cron com NODE_ENV test`
- [x] Gate check passes: `pnpm test`
- [x] Test count: 70 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): schedule job rounds every 10 seconds`

---

### Phase 3: E-mail e comando de teste

#### T9: Validar as variáveis de e-mail

**What**: `EnvironmentVariables` ganha `RESEND_API_KEY` e `EMAIL_FROM` (opcionais fora de produção, obrigatórias e não vazias em `production` por `@ValidateIf`) e `RESEND_BASE_URL` (URL, padrão `https://api.resend.com`); `apps/api/.env.example` ganha as três; o `apps/web/playwright.config.ts` passa `RESEND_API_KEY=re_e2e` e `EMAIL_FROM=Amigo Secreto <e2e@example.com>` à API.
**Where**: `apps/api/src/config/env.validation.ts`
**Depends on**: T8
**Reuses**: `validateEnvironment` e o teste do `.env.example` da foundation
**Requirement**: JOB-05

**Done when**:

- [x] Teste existente `validateEnvironment > o .env.example declara todas as variáveis validadas` continua verde com as três variáveis
- [x] Testes em `src/config/env.validation.spec.ts`: `validateEnvironment > lança erro que nomeia RESEND_API_KEY quando ela falta em production`, `> lança erro que nomeia EMAIL_FROM quando ela falta em production` e `> aceita RESEND_API_KEY e EMAIL_FROM ausentes fora de production`
- [x] Gate check passes: `pnpm test && pnpm test:e2e`
- [x] Test count: 73 tests pass na API; e2e do web verde

**Tests**: unit
**Gate**: e2e

**Commit**: `feat(api): validate email settings`

---

#### T10: Criar o layout comum de e-mail

**What**: Tipos `EmailBlock`, `EmailMessage` e `RenderedEmail`; `renderEmail(message)` monta o HTML (`lang="pt-BR"`, `color-scheme`, tabela de 600 px, cabeçalho "Amigo Secreto", parágrafos, botão como `<a>`, rodapé, cores do tema claro inline e do escuro em `@media (prefers-color-scheme: dark)`) e o texto puro; `escapeHtml` para `& < > " '`.
**Where**: `apps/api/src/email/email-layout.ts`
**Depends on**: T9
**Reuses**: cores de `apps/web/src/app/globals.css` (lista no design)
**Requirement**: JOB-06

**Done when**:

- [ ] `apps/api/src/email/email.types.ts` criado
- [ ] Testes em `src/email/email-layout.spec.ts`: `renderEmail > produz HTML e texto com o mesmo conteúdo`, `> monta o HTML com lang pt-BR, o nome no cabeçalho, o conteúdo e o rodapé`, `> começa o texto com Amigo Secreto e termina com o rodapé`, `> usa as cores do tema claro nos estilos do HTML`, `> troca para as cores do tema escuro em prefers-color-scheme dark`, `> mostra como texto os caracteres especiais de HTML do conteúdo` e `> mostra o botão como link no HTML e como rótulo: URL no texto`
- [ ] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [ ] Test count: 80 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add shared email layout`

---

#### T11: Enfileirar e-mails pelo EmailService

**What**: `EmailService.enqueue(message, { runAt?, manager? })` valida o destinatário (`isEmail`, erro "Destinatário de e-mail inválido.") e as URLs de botão (absolutas `http:`/`https:`, erro "URL de botão inválida.") e chama `JobQueue.enqueue('email.send', message, options)`; `EmailModule` importa o `JobsModule` e exporta o `EmailService`.
**Where**: `apps/api/src/email/email.service.ts`
**Depends on**: T10
**Reuses**: `JobQueue` (T2), tipos de T10
**Requirement**: JOB-02

**Done when**:

- [ ] `apps/api/src/email/email.module.ts` criado
- [ ] Testes em `test/email-service.int-spec.ts`: `EmailService > enfileira um job email.send dentro da transação informada`, `> repassa o runAt informado ao job`, `> lança erro e não grava job com destinatário inválido` e `> lança erro e não grava job com URL de botão que não é http ou https`
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: 84 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): enqueue emails through email service`

---

#### T12: Enviar pelo Resend

**What**: `EmailTransport` (interface) e `EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT')`; `ResendTransport.send(email, idempotencyKey)` faz `POST {RESEND_BASE_URL}/emails` com `Authorization: Bearer`, `Idempotency-Key`, `from` de `EMAIL_FROM` (padrão `Amigo Secreto <onboarding@resend.dev>`), `to`, `subject`, `html`, `text` e `AbortSignal.timeout(10_000)`; 4xx (exceto 429 e o 409 `concurrent_idempotent_requests`) lança `PermanentJobError("Resend <status> <name>")`; 429, esse 409 e 5xx lançam `Error("Resend <status> <name>")`; timeout "Tempo esgotado"; rede "Falha de rede".
**Where**: `apps/api/src/email/resend.transport.ts`
**Depends on**: T11
**Reuses**: `PermanentJobError` (T3), `ConfigService`
**Requirement**: JOB-05

**Done when**:

- [ ] `apps/api/src/email/email-transport.ts` com a interface e o token
- [ ] Testes em `src/email/resend.transport.spec.ts`, contra um servidor `node:http`: `ResendTransport > envia destinatário, assunto, HTML, texto, remetente, Authorization e Idempotency-Key`, `> trata 429 como falha passageira`, `> trata 409 concurrent_idempotent_requests como falha passageira`, `> trata 500 como falha passageira`, `> trata resposta depois de 10 segundos como falha passageira`, `> trata falha de conexão como falha passageira`, `> trata 422 como falha definitiva` e `> trata 409 invalid_idempotent_request como falha definitiva`
- [ ] Gate check passes: `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [ ] Test count: 92 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): send email through resend api`

---

#### T13: Executar os jobs de e-mail

**What**: `SendEmailHandler.handle(job)`: `renderEmail(payload)`, `transport.send(rendered, 'email/' + job.id)` e `email.sent` com `jobId`; `LogTransport` escreve destinatário, assunto e texto no log; o `EmailModule` escolhe o transporte por `RESEND_API_KEY` não vazia, registra `email.send` no `onModuleInit` e entra no `AppModule`; `test/fake-resend.ts` é o Resend falso dos testes.
**Where**: `apps/api/src/email/send-email.handler.ts`
**Depends on**: T12
**Reuses**: `renderEmail` (T10), `ResendTransport` (T12), `JobHandlerRegistry` (T4), `JobRunner` (T5 a T7), `test/isolated-database.ts` (T5)
**Requirement**: JOB-05

**Done when**:

- [ ] `apps/api/src/email/log.transport.ts` criado; `EmailModule` importado em `app.module.ts`
- [ ] Testes em `test/email-send.int-spec.ts`: `envio de e-mail > envia ao Resend destinatário, assunto, HTML, texto e remetente de EMAIL_FROM`, `> manda a mesma Idempotency-Key email/<id> em todas as tentativas`, `> emite email.sent com jobId quando o Resend aceita`, `> sem RESEND_API_KEY fora de produção escreve o e-mail no log, emite email.sent e marca DONE sem chamar o Resend` e `> usa o remetente Amigo Secreto <onboarding@resend.dev> sem EMAIL_FROM fora de produção`
- [ ] Teste em `src/email/resend-boundary.spec.ts`: `fronteira do Resend > só o módulo de e-mail e a configuração citam o Resend` (procura `resend` nos arquivos de `src/` fora de `src/email/` e `src/config/`)
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: 98 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): deliver queued emails`

---

#### T14: Provar o sigilo do e-mail nos registros

**What**: Testes que, em `production`, enviam, falham de forma passageira e falham de vez um e-mail com destinatário, assunto e conteúdo marcados, e conferem que as marcas não aparecem no log capturado, nas chamadas ao Sentry nem no `lastError`; o código é corrigido se alguma aparecer.
**Where**: `apps/api/test/email-secrecy.int-spec.ts`
**Depends on**: T13
**Reuses**: `test/fake-resend.ts` (T13), captura de log e de Sentry de T6
**Requirement**: JOB-07

**Done when**:

- [ ] Testes `sigilo do e-mail > não escreve destinatário, assunto nem conteúdo em logs, eventos ou Sentry em production` e `> não grava destinatário, assunto nem conteúdo no lastError`
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: 100 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `test(api): cover email secrecy in logs and errors`

---

#### T15: Criar o comando email:test

**What**: `src/cli/email-test.ts` valida o argumento (sem destinatário válido imprime "Informe um e-mail válido: pnpm --filter @amigo-secreto/api email:test <destinatário>" e sai com 1), sobe `NestFactory.createApplicationContext(EmailTestModule)` (config, banco, observabilidade e e-mail, sem agendador), enfileira pelo `EmailService` o assunto "E-mail de teste do Amigo Secreto" com o parágrafo "Se você recebeu esta mensagem, o envio de e-mails está funcionando.", imprime "Job <id> enfileirado. A API em execução envia o e-mail em até 10 segundos." e sai com 0; script `"email:test": "pnpm build && node dist/cli/email-test.js"`.
**Where**: `apps/api/src/cli/email-test.ts`
**Depends on**: T14
**Reuses**: `EmailModule` (T11 a T13), padrão do teste "roda num clone sem build" de `test/migrations.int-spec.ts`
**Requirement**: JOB-08

**Done when**:

- [ ] `apps/api/src/cli/email-test.module.ts` criado; script no `apps/api/package.json`
- [ ] Testes em `test/email-test-command.int-spec.ts`: `email:test > enfileira o e-mail de teste, imprime o id do job e sai com 0`, `> sem destinatário válido imprime a instrução, não grava job e sai com 1` e `> compila a API antes de enfileirar num clone sem dist`
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: 103 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add email test command`

---

## Checks

**C1** - A migration cria a tabela `job` com `id` (uuid), `type`, `payload` (jsonb), `runAt`, `status`, `attempts`, `lastError`, `lockedAt` e `createdAt` (JOB-01, AC 1)
Proof: run api | ✓ tabela job > é criada pela migration com as colunas id, type, payload, runAt, status, attempts, lastError, lockedAt e createdAt

**C2** - A coluna `status` recusa qualquer valor fora de `PENDING`, `RUNNING`, `DONE` e `FAILED` (JOB-01, AC 2)
Proof: run api | ✓ tabela job > recusa um status fora de PENDING, RUNNING, DONE e FAILED

**C3** - A tabela `job` tem um índice por `status` e `runAt` (JOB-01, AC 3)
Proof: run api | ✓ tabela job > tem um índice por status e runAt

**C4** - Reverter a migration remove a tabela `job` (JOB-01, AC 4)
Proof: run api | ✓ tabela job > é removida ao reverter a migration

**C5** - `JobQueue.enqueue` grava o job `PENDING`, `attempts` 0, com o `runAt` informado ou o instante da chamada (JOB-02, AC 1)
Proof: run api | ✓ JobQueue > grava o job PENDING com attempts 0 e runAt do momento da chamada
Proof: run api | ✓ JobQueue > usa o runAt informado

**C6** - Enfileirar numa transação que é desfeita não deixa job (JOB-02, AC 2)
Proof: run api | ✓ JobQueue > não deixa job quando a transação de origem é desfeita

**C7** - Enfileirar numa transação confirmada deixa o job gravado (JOB-02, AC 3)
Proof: run api | ✓ JobQueue > deixa o job quando a transação de origem é confirmada

**C8** - `EmailService.enqueue` grava um job `email.send` aceitando o `EntityManager` e o `runAt` (JOB-02, AC 4)
Proof: run api | ✓ EmailService > enfileira um job email.send dentro da transação informada
Proof: run api | ✓ EmailService > repassa o runAt informado ao job

**C9** - Destinatário inválido faz o `EmailService.enqueue` lançar erro sem gravar job (JOB-02, AC 5)
Proof: run api | ✓ EmailService > lança erro e não grava job com destinatário inválido

**C10** - URL de botão que não é absoluta `http:`/`https:` faz o `EmailService.enqueue` lançar erro sem gravar job (JOB-02, AC 6)
Proof: run api | ✓ EmailService > lança erro e não grava job com URL de botão que não é http ou https

**C11** - A API inicia uma rodada a cada 10 segundos (JOB-03, AC 1)
Proof: run api | ✓ JobScheduler > dispara a rodada a cada 10 segundos

**C12** - Uma rodada pega no máximo 50 jobs `PENDING` vencidos, do `runAt` mais antigo ao mais novo (JOB-03, AC 2)
Proof: run api | ✓ JobRunner > pega no máximo 50 jobs vencidos, do runAt mais antigo ao mais novo

**C13** - O job pego vira `RUNNING`, com `lockedAt` no instante da rodada e `attempts` somado de 1 (JOB-03, AC 3)
Proof: run api | ✓ JobRunner > marca o job pego como RUNNING com lockedAt e soma 1 a attempts

**C14** - Duas rodadas simultâneas, em conexões diferentes, nunca pegam o mesmo job (JOB-03, AC 4)
Proof: run api | ✓ JobRunner > entrega cada job a uma só de duas rodadas simultâneas

**C15** - Handler sem erro deixa o job `DONE` (JOB-03, AC 5)
Proof: run api | ✓ JobRunner > marca DONE o job cujo handler termina sem erro

**C16** - Os jobs de uma rodada rodam um de cada vez, na ordem em que foram pegos (JOB-03, AC 6)
Proof: run api | ✓ JobRunner > executa os jobs da rodada um de cada vez, na ordem em que foram pegos

**C17** - Enquanto uma rodada roda, o tick seguinte da mesma instância é pulado (JOB-03, AC 7)
Proof: run api | ✓ JobScheduler > pula o tick enquanto a rodada anterior ainda roda

**C18** - A rodada não pega jobs com `runAt` no futuro, `DONE` ou `FAILED` (JOB-03, AC 8)
Proof: run api | ✓ JobRunner > não pega jobs com runAt no futuro, DONE ou FAILED

**C19** - Falha passageira com `attempts` < 5 devolve o job a `PENDING`, com `lastError` e `runAt` 1, 5, 25 e 125 min depois da falha (JOB-04, AC 1)
Proof: run api | ✓ nextRunAt > soma 1, 5, 25 e 125 minutos ao instante da falha nas tentativas 1 a 4
Proof: run api | ✓ JobRunner > devolve a PENDING com as esperas de 1, 5, 25 e 125 minutos

**C20** - A quinta falha passageira deixa o job `FAILED` com `lastError` (JOB-04, AC 2)
Proof: run api | ✓ JobRunner > marca FAILED quando a quinta tentativa falha

**C21** - Erro definitivo deixa o job `FAILED` na hora, com qualquer `attempts` (JOB-04, AC 3)
Proof: run api | ✓ JobRunner > marca FAILED na hora um erro definitivo

**C22** - Job de tipo sem handler vira `FAILED` com "Tipo de job desconhecido: <type>" (JOB-04, AC 4)
Proof: run api | ✓ JobRunner > marca FAILED o job de tipo sem handler com Tipo de job desconhecido

**C23** - Job `RUNNING` travado há mais de 10 min com `attempts` < 5 é pego de novo (JOB-04, AC 5)
Proof: run api | ✓ JobRunner > retoma o job RUNNING travado há mais de 10 minutos com menos de 5 tentativas

**C24** - Job `RUNNING` travado há mais de 10 min com `attempts` 5 vira `FAILED` com "Processamento interrompido" (JOB-04, AC 6)
Proof: run api | ✓ JobRunner > marca FAILED com Processamento interrompido o job travado com 5 tentativas

**C25** - Job que vira `FAILED` emite `job.failed` com `jobId`, `type` e `attempts` (JOB-04, AC 7)
Proof: run api | ✓ JobRunner > emite job.failed com jobId, type e attempts quando o job vira FAILED

**C26** - Job que vira `FAILED` manda um erro ao Sentry com `jobId` e `type` (JOB-04, AC 8)
Proof: run api | ✓ JobRunner > envia ao Sentry o job que vira FAILED com jobId e type

**C27** - Job que volta a `PENDING` gera um aviso no log com `jobId`, `type`, `attempts` e `runAt`, sem Sentry (JOB-04, AC 9)
Proof: run api | ✓ JobRunner > escreve um aviso sem Sentry quando o job volta a PENDING

**C28** - `lastError` tem no máximo 500 caracteres (JOB-04, AC 10)
Proof: run api | ✓ toLastError > corta a mensagem em 500 caracteres
Proof: run api | ✓ toLastError > usa String do valor quando o erro não é Error

**C29** - Com `RESEND_API_KEY`, o job `email.send` manda ao Resend destinatário, assunto, HTML, texto e o remetente de `EMAIL_FROM` (JOB-05, AC 1)
Proof: run api | ✓ ResendTransport > envia destinatário, assunto, HTML, texto, remetente, Authorization e Idempotency-Key
Proof: run api | ✓ envio de e-mail > envia ao Resend destinatário, assunto, HTML, texto e remetente de EMAIL_FROM

**C30** - Toda tentativa de um job manda `Idempotency-Key` `email/<id do job>`, a mesma em todas (JOB-05, AC 2)
Proof: run api | ✓ envio de e-mail > manda a mesma Idempotency-Key email/<id> em todas as tentativas

**C31** - 429, 409 `concurrent_idempotent_requests`, 5xx, timeout de 10 s e falha de conexão são falhas passageiras (JOB-05, AC 3)
Proof: run api | ✓ ResendTransport > trata 429 como falha passageira
Proof: run api | ✓ ResendTransport > trata 409 concurrent_idempotent_requests como falha passageira
Proof: run api | ✓ ResendTransport > trata 500 como falha passageira
Proof: run api | ✓ ResendTransport > trata resposta depois de 10 segundos como falha passageira
Proof: run api | ✓ ResendTransport > trata falha de conexão como falha passageira

**C32** - Os outros 4xx do Resend são falhas definitivas (JOB-05, AC 4)
Proof: run api | ✓ ResendTransport > trata 422 como falha definitiva
Proof: run api | ✓ ResendTransport > trata 409 invalid_idempotent_request como falha definitiva

**C33** - E-mail aceito pelo Resend emite `email.sent` com `jobId` (JOB-05, AC 5)
Proof: run api | ✓ envio de e-mail > emite email.sent com jobId quando o Resend aceita

**C34** - Fora de produção, sem `RESEND_API_KEY`, o e-mail vai para o log, emite `email.sent` e o job fica `DONE`, sem chamar o Resend (JOB-05, AC 6)
Proof: run api | ✓ envio de e-mail > sem RESEND_API_KEY fora de produção escreve o e-mail no log, emite email.sent e marca DONE sem chamar o Resend

**C35** - Em `production`, a API não inicia sem `RESEND_API_KEY` ou `EMAIL_FROM`, com erro que nomeia a variável (JOB-05, AC 7)
Proof: run api | ✓ validateEnvironment > lança erro que nomeia RESEND_API_KEY quando ela falta em production
Proof: run api | ✓ validateEnvironment > lança erro que nomeia EMAIL_FROM quando ela falta em production
Proof: run api | ✓ validateEnvironment > aceita RESEND_API_KEY e EMAIL_FROM ausentes fora de production

**C36** - Fora de produção, sem `EMAIL_FROM`, o remetente é `Amigo Secreto <onboarding@resend.dev>` (JOB-05, AC 8)
Proof: run api | ✓ envio de e-mail > usa o remetente Amigo Secreto <onboarding@resend.dev> sem EMAIL_FROM fora de produção

**C37** - Só o módulo de e-mail e a configuração citam o Resend (JOB-05, AC 9)
Proof: run api | ✓ fronteira do Resend > só o módulo de e-mail e a configuração citam o Resend

**C38** - O e-mail montado tem versão HTML e versão texto com o mesmo conteúdo (JOB-06, AC 1)
Proof: run api | ✓ renderEmail > produz HTML e texto com o mesmo conteúdo

**C39** - O HTML tem `lang="pt-BR"`, "Amigo Secreto" no cabeçalho, o conteúdo e o rodapé "Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem." (JOB-06, AC 2)
Proof: run api | ✓ renderEmail > monta o HTML com lang pt-BR, o nome no cabeçalho, o conteúdo e o rodapé

**C40** - O texto começa com "Amigo Secreto" e termina com o rodapé (JOB-06, AC 3)
Proof: run api | ✓ renderEmail > começa o texto com Amigo Secreto e termina com o rodapé

**C41** - O HTML usa as cores do tema claro como padrão (JOB-06, AC 4)
Proof: run api | ✓ renderEmail > usa as cores do tema claro nos estilos do HTML

**C42** - Com `prefers-color-scheme: dark`, o HTML usa as cores do tema escuro (JOB-06, AC 5)
Proof: run api | ✓ renderEmail > troca para as cores do tema escuro em prefers-color-scheme dark

**C43** - `<`, `>`, `&`, `"` e `'` do conteúdo aparecem como texto no HTML (JOB-06, AC 6)
Proof: run api | ✓ renderEmail > mostra como texto os caracteres especiais de HTML do conteúdo

**C44** - O botão vira link com rótulo e URL no HTML e "<rótulo>: <URL>" no texto (JOB-06, AC 7)
Proof: run api | ✓ renderEmail > mostra o botão como link no HTML e como rótulo: URL no texto

**C45** - Em `production`, nem o payload nem destinatário, assunto ou conteúdo aparecem em logs, eventos ou Sentry (JOB-07, AC 1)
Proof: run api | ✓ sigilo do e-mail > não escreve destinatário, assunto nem conteúdo em logs, eventos ou Sentry em production

**C46** - O `lastError` não contém destinatário, assunto nem conteúdo (JOB-07, AC 2)
Proof: run api | ✓ sigilo do e-mail > não grava destinatário, assunto nem conteúdo no lastError

**C47** - `email:test` com e-mail válido enfileira o e-mail de teste com o assunto e o conteúdo da spec, imprime o id do job e sai com 0 (JOB-08, AC 1)
Proof: run api | ✓ email:test > enfileira o e-mail de teste, imprime o id do job e sai com 0

**C48** - `email:test` sem destinatário válido imprime a instrução, não grava job e sai com 1 (JOB-08, AC 2)
Proof: run api | ✓ email:test > sem destinatário válido imprime a instrução, não grava job e sai com 1

**C49** - `email:test` compila a API antes de enfileirar num clone sem `dist/` (JOB-08, AC 3)
Proof: run api | ✓ email:test > compila a API antes de enfileirar num clone sem dist

**C50** - O e2e do web continua verde com a API em `production` depois das variáveis obrigatórias de e-mail (JOB-05, AC 7)
Proof: `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web`

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** (2026-11-18, T1) o teste de revert roda num banco próprio por um DataSource com a classe da migration importada de `src`, com `up` e `undoLastMigration`, sem `pnpm migration:revert`, para não compilar em paralelo com o `migrations.int-spec` (deleteOutDir) - user: "DataSource no teste (Recomendado)". O `migration:generate` usa um container `postgres:18` temporário, removido em seguida - user: "Container temporário (Recomendado)". O teste do glob afirma com `path.matchesGlob` que o padrão casa `<src>/jobs/job.entity.js` e não casa `job-queue.service.js` - user: "Casa arquivos de entidade (Recomendado)". O `databaseOptions` ganha `uuidExtension: 'pgcrypto'`, e o `id` da tabela `job` usa `DEFAULT gen_random_uuid()`, nativo do PostgreSQL, sem a extensão `uuid-ossp` - user: "uuidExtension pgcrypto (Recomendado)". (2026-11-18, T3) O `toLastError` grava `<name>: <message>` do erro, como diz a suposição `lastError` da spec, e não só a mensagem, como diziam o design e a T3; o design foi ajustado - user: "Nome e mensagem (Recomendado)". (2026-11-18, T6) O instante da falha que entra no `nextRunAt` é o `now` da rodada somado ao tempo real decorrido desde o início dela, fiel ao JOB-04 AC 1 com rodada longa e testável com relógio controlado - user: "now + tempo decorrido (Recomendado)". Tipo sem handler grava o `lastError` exato "Tipo de job desconhecido: <type>", sem passar pelo `toLastError`; o mesmo vale para "Processamento interrompido" na T7 - user: "Texto exato do AC (Recomendado)". (2026-11-18, T9) O `test/swagger.int-spec.ts` sobe o `AppModule` com `NODE_ENV=production` e passou a abortar sem as variáveis de e-mail; o `beforeAll` dele ganha `RESEND_API_KEY=re_test` e `EMAIL_FROM=Amigo Secreto <test@example.com>`, só preparação do ambiente, sem mudar asserção - user: "Stub no beforeAll (Recomendado)".
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7 ------→ T8
Phase 3:  T9 ------→ T10 -----→ T11 -----→ T12 -----→ T13 -----→ T14 -----→ T15
```

Execução inline, uma fase por vez, um PR por fase (AD-010); sem sub-agentes de lote.
