# Draw Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/06-draw/design.md`
**Status**: Approved
**Approved**: 2026-11-25 - user: "Tasks aprovadas."
**Linear**: milestone `06 · Draw`; fase 1 = PER-122, fase 2 = PER-123, fase 3 = PER-124, fase 4 = PER-125, fase 5 = PER-126 (criadas com autorização do usuário: "Pode criar a milestone e as issues no Linear.")
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run shared**: `pnpm turbo run test --force --filter=@amigo-secreto/shared -- --reporter=verbose`
**Run api**: `pnpm turbo run test --force --filter=@amigo-secreto/api -- --reporter=verbose`
**Run web**: `pnpm turbo run test --force --filter=@amigo-secreto/web -- --reporter=verbose`
**Run e2e**: `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web`

Linhas esperadas das provas: o nome de cada teste é o que a check escreve; a task que cria o teste usa exatamente esse texto em `describe`/`it` (o Vitest separa com `>`, o reporter `list` do Playwright com `›`). Contagens de teste partem da `main` em 2026-11-25 (`08f59ea`), pelas provas da `05-invites`: 27 no shared, 518 na API, 182 unitários no web e 105 no e2e; a primeira execução confere, e um desvio só de contagem inicial é registrado em `**Settled mid-build:**`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `.claude/rules/nest-api-coding-standards.md` e `.claude/rules/next-web-coding-standards.md` (nomes de `describe`/`it` em português; sem metas de cobertura), os testes da `05-invites` (`packages/shared/src/**/*.spec.ts`, `apps/api/src/**/*.spec.ts`, `apps/api/test/**/*.int-spec.ts`, `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/e2e/**/*.spec.ts`), lição confirmada L-020; strong defaults aplicados à profundidade.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Shared: regra do par | unit (Vitest) | Todos os ramos; 1:1 com os critérios; uma condição por teste | `packages/shared/src/**/*.spec.ts` | `pnpm --filter @amigo-secreto/shared test` |
| Shared: tipos e mensagens | none | Build gate | - | Build gate |
| API: algoritmo e `EmailSender` | unit | Todos os ramos; propriedades do sorteio em 500 execuções aleatórias; bordas 3 e 10 pessoas; fonte de sorte espionada | `apps/api/src/**/*.spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| API: migrations, rotas, handlers de job, limites, e-mails, eventos | integration (Testcontainers) | Toda rota e critério da task: sucesso + bordas + falhas + 403/404/409/429; concorrência com conexões reais; estado lido depois de cada recusa; jobs rodados pelo `JobRunner.runRound` com relógio controlado | `apps/api/test/**/*.int-spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project integration` |
| API: módulo, DTOs, entidades sem regra | none | Build gate | - | Build gate |
| Web: funções de `lib/` e componentes com lógica | unit (Vitest + Testing Library) | Todos os ramos; 1:1 com os critérios | `apps/web/src/**/*.test.{ts,tsx}` | `pnpm --filter @amigo-secreto/web test` |
| Web: páginas e fluxos | e2e (Playwright contra a API em produção, Postgres descartável, e-mail falso) | Todo critério de tela alcançável pela interface: caminho feliz + erro + sem sessão + pessoa de fora; o grupo SORTEADO agora nasce pelo próprio sorteio; um elemento comum a várias telas é provado em cada tela (L-020) | `apps/web/e2e/**/*.spec.ts` | `pnpm test:e2e` |
| Web: CSS da animação | none | Build gate e os testes do componente | - | Build gate |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Cada gate roda o lint e o typecheck do pacote antes dos testes (o lint inclui o `prettier --check`).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Shared | Tasks do `packages/shared` | `pnpm --filter @amigo-secreto/shared lint && pnpm --filter @amigo-secreto/shared typecheck && pnpm --filter @amigo-secreto/shared test` |
| Quick | Tasks da API só com testes unitários | `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| Full | Tasks da API com testes de integração | `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test` |
| Web | Tasks do web só com testes unitários | `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test` |
| E2E | Tasks do web com e2e | `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e` |
| Build | Fim de cada fase | `pnpm install --frozen-lockfile && pnpm build && pnpm turbo run lint typecheck --force && pnpm test && pnpm test:e2e` |

O gate Full roda também o typecheck do web porque a T1 acrescenta tipos ao shared que o web vai usar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Ao fim de cada fase roda o gate Build; cada fase vira um PR (AD-010). Na fase 5, o fechamento da feature roda antes do PR.

### Phase 1: Regras, algoritmo e banco

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: API das restrições e do sorteio

```
T6 → T7 → T8 → T9 → T10
```

### Phase 3: API do cancelamento, do resultado e do lembrete

```
T11 → T12 → T13 → T14 → T15
```

### Phase 4: Base do site, painel e restrições

```
T16 → T17 → T18 → T19 → T20
```

### Phase 5: Papelzinho e aba Sorteio

```
T21 → T22 → T23
```

---

## Task Breakdown

### Phase 1: Regras, algoritmo e banco

#### T1: Criar os tipos, as mensagens e a regra do par no shared

**What**: `packages/shared/src/draws.ts` com `validateExclusionInput`, `DRAW_MESSAGES` (textos dos 409, 404 e do campo) e os tipos `DrawPanel`, `ExclusionPair`, `ExclusionsResponse` e `DrawResult`, exportados no `index.ts`.
**Where**: `packages/shared/src/draws.ts`
**Depends on**: None
**Reuses**: padrão de `validateGroupInput` e `validateInviteEmails`
**Requirement**: DRAW-02

**Done when**:

- [x] Testes em `src/draws.spec.ts` (imports explícitos de `vitest`): `validateExclusionInput > recusa par sem uma das pessoas com Escolha as duas pessoas do par.`, `> recusa a mesma pessoa duas vezes com Escolha duas pessoas diferentes.`, `> recusa par repetido em qualquer ordem com Esse par já está na lista.`, `> aceita duas pessoas diferentes fora da lista`
- [x] Mensagens iguais às da spec (DRAW-02 AC 4 a 6, 11; DRAW-04 AC 14 a 18; DRAW-05 AC 8; DRAW-06 AC 10)
- [x] Gate check passes: `pnpm --filter @amigo-secreto/shared lint && pnpm --filter @amigo-secreto/shared typecheck && pnpm --filter @amigo-secreto/shared test`
- [x] Test count: 31 tests pass no shared

**Tests**: unit
**Gate**: Shared

**Commit**: `feat(shared): add draw types, messages and the exclusion pair rule`

---

#### T2: Conferir a viabilidade e achar os pares a revisar

**What**: `draw-algorithm.ts` com o emparelhamento máximo (Hopcroft-Karp) sobre "pode tirar" e `findBlocked(people, exclusions)`, que devolve `null` quando há distribuição ou o conjunto de pessoas que, juntas, têm menos pessoas permitidas do que o tamanho do conjunto.
**Where**: `apps/api/src/draws/draw-algorithm.ts`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: DRAW-03, DRAW-04

**Done when**:

- [x] Testes em `src/draws/draw-algorithm.spec.ts`: `viabilidade do sorteio > sem pares sempre há distribuição a partir de 3 pessoas`, `> 3 pessoas e um par não têm distribuição e o par entra nos bloqueados`, `> 4 pessoas e um par têm distribuição`, `> devolve como bloqueadas só pessoas de um conjunto com menos pessoas permitidas do que o tamanho dele`, `> pessoa com par com todos os outros fica bloqueada`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 523 tests pass na API

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(api): check whether a draw is possible and which pairs block it`

---

#### T3: Distribuir os participantes

**What**: `drawAssignments(people, exclusions, random = randomInt)` no mesmo arquivo: Fisher-Yates e corrente sem pares; com pares, viabilidade pela T2, busca de corrente com orçamento de 2.000.000 de passos e, sem corrente, emparelhamento com ordem embaralhada; devolve `singleCycle`.
**Where**: `apps/api/src/draws/draw-algorithm.ts` (modify)
**Depends on**: T2
**Reuses**: `randomInt` do `node:crypto`; teste com `vi.mock` como o do código do convite
**Requirement**: DRAW-04

**Done when**:

- [x] Testes em `src/draws/draw-algorithm.spec.ts`: `distribuição do sorteio > cada pessoa tira exatamente uma e é tirada por exatamente uma em 500 sorteios`, `> ninguém tira a si mesmo em 500 sorteios`, `> nunca junta as duas pessoas de um par, em nenhum sentido, em 500 sorteios`, `> sem pares sai sempre corrente única`, `> com pares e até 10 pessoas sai corrente única quando ela existe`, `> com pares que impedem a corrente sai outra distribuição válida`, `> devolve bloqueado quando nenhuma distribuição existe`, `> sorteia com randomInt do node:crypto`, `> distribui 1000 pessoas sem pares em menos de 100 ms`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 532 tests pass na API

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(api): draw a single cycle when possible`

---

#### T4: Criar as tabelas do sorteio

**What**: Entidades `Exclusion`, `Draw` e `Assignment` com as restrições do design (par em ordem, uma rodada ativa por grupo, par sorteado único por quem tira e por quem é tirado, cascata a partir do grupo), `DrawsModule` com `TypeOrmModule.forFeature` importado no `AppModule`, migration `CreateDrawTables` gerada por `migration:generate`, e `insertExclusion`/`insertDraw` em `test/group-helpers.ts`.
**Where**: `apps/api/src/database/migrations/<timestamp>-CreateDrawTables.ts`
**Depends on**: T3
**Reuses**: `email-invite.entity.ts`, `CreateEmailInviteTable`, `test/migrations.ts`
**Requirement**: DRAW-02, DRAW-04, DRAW-06

**Done when**:

- [x] Testes em `test/draw-tables.int-spec.ts`: `tabelas do sorteio > são criadas pela migration com as colunas do design`, `> o banco recusa par de restrição repetido ou fora de ordem`, `> o banco recusa segunda rodada ativa no mesmo grupo`, `> o banco recusa pessoa que tira a si mesma ou que tira ou é tirada duas vezes na rodada`, `> excluir o grupo apaga pares de restrição, rodadas e pares sorteados`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 537 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): add the exclusion, draw and assignment tables`

---

#### T5: Extrair o envio de e-mail para o EmailSender

**What**: `EmailSender.send(message, key)` (render, transporte com a chave, `email.sent`) exportado pelo `EmailModule`; o `SendEmailHandler` passa a chamá-lo, sem mudar o comportamento.
**Where**: `apps/api/src/email/email-sender.ts`
**Depends on**: T4
**Reuses**: `send-email.handler.ts`, `renderEmail`, `EMAIL_TRANSPORT`
**Requirement**: DRAW-07

**Done when**:

- [x] Testes em `src/email/email-sender.spec.ts`: `EmailSender > envia o e-mail montado com a chave recebida e emite email.sent`, `> não emite email.sent quando o transporte falha`
- [x] As suítes de e-mail existentes (`email-send`, `email-secrecy`, `email-service`) passam sem mudança
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 539 tests pass na API

**Tests**: unit
**Gate**: Full

**Commit**: `refactor(api): move email delivery into a shared sender`

---

### Phase 2: API das restrições e do sorteio

#### T6: Ler, criar e apagar pares de restrição

**What**: `ExclusionsService` e as rotas `GET`, `POST /groups/:id/exclusions` e `DELETE /groups/:id/exclusions/:pairId` no `DrawsController`: participantes aprovados e pares em ordem de nome por `membershipId`; regra do shared; 404, 403 e 409 na ordem do AD-016; 204 ao apagar par inexistente.
**Where**: `apps/api/src/draws/exclusions.service.ts`
**Depends on**: T5
**Reuses**: `GroupAccess`, `GroupValidationException`, `MEMBER_NOT_FOUND`, `CLOSED_GROUP_TRANSFER`, `validateExclusionInput`
**Requirement**: DRAW-02

**Done when**:

- [x] Testes em `test/exclusions.int-spec.ts`: `pares de restrição > lista participantes aprovados e pares em ordem de nome, sem id de pessoa`, `> quem organiza adiciona um par e a lista mostra os dois nomes`, `> recusa par sem uma das pessoas com 400 Escolha as duas pessoas do par.`, `> recusa a mesma pessoa duas vezes com 400 Escolha duas pessoas diferentes.`, `> recusa par repetido em qualquer ordem com 400 Esse par já está na lista.`, `> responde 404 Participante não encontrado. a pessoa que não é participante aprovada`, `> remove um par`, `> remover par que não existe responde 204`, `> responde 409 Para mudar as restrições, cancele o sorteio. com o grupo SORTEADO e não muda nada`, `> responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO e não muda nada`, `> responde 403 a participante que não organiza ao ler, criar ou apagar pares`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 550 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): manage who cannot draw whom`

---

#### T7: Apagar os pares de quem sai ou é removido

**What**: `MembersService.remove` e `leave` apagam, na mesma transação, as linhas de `exclusion` do grupo com a pessoa em `userAId` ou `userBId`.
**Where**: `apps/api/src/invites/members.service.ts` (modify)
**Depends on**: T6
**Reuses**: entidade `Exclusion`
**Requirement**: DRAW-02

**Done when**:

- [x] Testes: `remover participante > apaga os pares de restrição da pessoa` (`test/members-remove.int-spec.ts`), `sair do grupo > apaga os pares de restrição da pessoa` (`test/members-leave.int-spec.ts`), `transferir organização > quem recebe passa a ver e editar os pares e quem passou deixa de ver` (`test/members-transfer.int-spec.ts`)
- [x] Os testes existentes das três suítes passam sem mudança
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 553 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): drop the exclusion pairs of members who leave`

---

#### T8: Ler o painel do sorteio

**What**: `DrawsService.panel` e `GET /groups/:id/draw` (só quem organiza): status, `drawnAt` da rodada ativa, aprovados, pendentes, `feasible` e `pairsToReview` (pares das pessoas bloqueadas, com os nomes).
**Where**: `apps/api/src/draws/draws.service.ts`
**Depends on**: T7
**Reuses**: `findBlocked`, `GroupAccess`
**Requirement**: DRAW-03, DRAW-09

**Done when**:

- [x] Testes em `test/draw-panel.int-spec.ts`: `painel do sorteio > conta aprovados e pendentes`, `> grupo sem pares é viável e não lista pares a revisar`, `> 3 aprovados e um par não são viáveis e listam o par a revisar`, `> lista só os pares das pessoas bloqueadas`, `> devolve status e drawnAt depois do sorteio`, `> responde 403 a participante que não organiza`, `> não contém nenhum par sorteado`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 560 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): show what the draw still needs`

---

#### T9: Sortear

**What**: `DrawsService.perform` e `POST /groups/:id/draw`: trava do grupo, recusas na ordem 404, 403, 409 (status, mínimo, pendentes, restrições), 429 pela contagem de rodadas das últimas 24 horas; rodada, pares, status DRAWN e um job `draw.result_email` por participante (`{ drawId, giverUserId }`) numa transação; `draw.performed` depois do commit; resposta `{ drawnAt }`.
**Where**: `apps/api/src/draws/draws.service.ts` (modify)
**Depends on**: T8
**Reuses**: `drawAssignments`, `JobQueue.enqueueMany`, `TooManyAttemptsException`, `BusinessEventsService`
**Requirement**: DRAW-02, DRAW-04, DRAW-07, DRAW-09, DRAW-10

**Done when**:

- [x] Testes em `test/draw-perform.int-spec.ts`: `sortear > cria a rodada ativa com um par por aprovado, inclusive quem organiza, e passa o grupo a SORTEADO`, `> respeita os pares de restrição nos dois sentidos`, `> grava rodada, pares e status juntos ou nada`, `> responde 409 Este grupo já fez o sorteio. com o grupo SORTEADO`, `> responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO`, `> aceita 3 aprovados e recusa 2 com 409 O sorteio precisa de pelo menos 3 participantes aprovados.`, `> responde 409 Aprove ou recuse os pedidos pendentes antes do sorteio. com pedido pendente`, `> responde 409 As restrições não permitem um sorteio válido. com os pares a revisar`, `> responde a primeira condição que falha na ordem status, mínimo, pendentes, restrições`, `> responde 403 a participante que não organiza e 404 a quem não participa`, `> aceita o 5º sorteio em 24 horas e responde 429 ao 6º`, `> sorteia 1000 aprovados sem pares em menos de 2 segundos`, `> com o grupo sorteado, entrar, sair e remover respondem 409`, `> dois sorteios simultâneos criam uma rodada só e o outro recebe 409`, `> pedido de entrada simultâneo ao sorteio entra antes ou recebe 409`, `> par criado durante o sorteio entra antes ou recebe 409`, `> enfileira um job de resultado por participante, só com ids`, `> emite draw.performed com groupId, participants, singleCycle e hasExclusions`, `> não emite evento nem enfileira e-mail quando o sorteio é recusado`, `> a resposta não contém nenhum par sorteado`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 580 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): draw a group`

---

#### T10: Enviar o e-mail do resultado

**What**: `DrawResultEmailHandler` registrado para `draw.result_email` no `onModuleInit` do `DrawsModule`: lê o par da rodada ativa, quem tira, quem é tirado e quem organiza; sem par, termina sem enviar; com par, monta o e-mail da spec (assunto sem nome, nome só no corpo, botão "Ver no site") e chama `EmailSender.send` com a chave `email/{job.id}`.
**Where**: `apps/api/src/draws/draw-result-email.handler.ts`
**Depends on**: T9
**Reuses**: `EmailSender`, `email-blocks.ts`, `JobHandlerRegistry`
**Requirement**: DRAW-07, DRAW-09

**Done when**:

- [x] Testes em `test/draw-result-email.int-spec.ts`: `e-mail do resultado > envia a cada participante o assunto sem o nome e o nome só no corpo`, `> a pré-visualização do e-mail não contém o nome sorteado`, `> não envia depois que o sorteio é cancelado`, `> não envia depois que o grupo é excluído`, `> mostra nomes com marcação HTML como texto`, `> falha do transporte não leva nome nem e-mail ao log nem ao Sentry`, `> repete com a mesma chave depois de falha passageira`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 587 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): email each participant who they drew`

---

### Phase 3: API do cancelamento, do resultado e do lembrete

#### T11: Cancelar o sorteio

**What**: `DrawsService.cancel` e `DELETE /groups/:id/draw`: trava do grupo; 404, 403, 409 (ABERTO, ENCERRADO); rodada CANCELLED com `cancelledAt`, pares sorteados apagados e grupo ABERTO numa transação; aviso por `email.send` a cada participante da rodada menos quem cancelou; `draw.cancelled` com `minutesSinceDraw` depois do commit.
**Where**: `apps/api/src/draws/draws.service.ts` (modify)
**Depends on**: T10
**Reuses**: `EmailService.enqueueMany`, `email-blocks.ts`, `BusinessEventsService`
**Requirement**: DRAW-06, DRAW-07, DRAW-10

**Done when**:

- [x] Testes em `test/draw-cancel.int-spec.ts`: `cancelar sorteio > marca a rodada como cancelada com a data, apaga os pares e volta o grupo a ABERTO`, `> grupo cancelado volta a aceitar entrada, saída, remoção e pares`, `> sortear de novo cria outra rodada`, `> responde 409 Este grupo ainda não fez o sorteio. com o grupo ABERTO`, `> responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO`, `> responde 403 a participante que não organiza`, `> enfileira o aviso a cada participante da rodada menos quem cancelou`, `> e-mails de resultado ainda na fila não saem depois do cancelamento`, `> emite draw.cancelled com groupId e minutesSinceDraw`, `> não emite evento nem aviso quando o cancelamento é recusado`, `> dois cancelamentos simultâneos cancelam uma vez e o outro recebe 409`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 598 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): cancel a draw and reopen the group`

---

#### T12: Ler o próprio resultado

**What**: `DrawsService.result` e `GET /groups/:id/draw/result` (participante aprovado): `{ receiverName }` com o nome atual, só do par de quem pede na rodada ativa; 404 "Sorteio não encontrado." sem rodada ativa; `Cache-Control: no-store`. Inclui a varredura de sigilo das rotas do sorteio.
**Where**: `apps/api/src/draws/draws.controller.ts` (modify)
**Depends on**: T11
**Reuses**: `GroupAccess.requireMember`
**Requirement**: DRAW-05, DRAW-09, DRAW-10

**Done when**:

- [x] Testes em `test/draw-result.int-spec.ts`: `resultado do sorteio > devolve a cada participante só a pessoa que ele tirou`, `> devolve o nome atual da pessoa sorteada`, `> responde 404 Sorteio não encontrado. sem rodada ativa`, `> responde 404 Grupo não encontrado. a quem não participa`, `> responde com Cache-Control no-store`, `> nenhuma rota do sorteio devolve a quem organiza o par de outra pessoa`, `> depois da transferência quem organiza continua vendo só o próprio par`, `> o log de um sorteio, do resultado e do cancelamento não tem nomes nem ids de pessoa`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 606 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): let each participant read who they drew`

---

#### T13: Agendar o lembrete de sortear

**What**: `scheduleDrawReminder(manager, groupId, at)` (apaga o `draw.reminder` PENDING do grupo e, com data, grava outro com `runAt = at` e `{ groupId, drawScheduledAt }`), chamado por `GroupsService.create` e `update` na transação.
**Where**: `apps/api/src/draws/draw-reminder.ts`
**Depends on**: T12
**Reuses**: entidade `Job`
**Requirement**: DRAW-08

**Done when**:

- [ ] Testes em `test/draw-reminder-schedule.int-spec.ts`: `agendar lembrete > criar grupo com sorteio previsto agenda o lembrete para a data e hora`, `> editar o sorteio previsto troca o lembrete pendente pelo da data nova`, `> tirar o sorteio previsto apaga o lembrete pendente`, `> grupo sem sorteio previsto não agenda lembrete`
- [ ] As suítes da `04-groups` passam; asserção que lê a tabela `job` inteira e muda é registrada em `**Settled mid-build:**`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 610 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): schedule the draw reminder`

---

#### T14: Enviar o lembrete de sortear

**What**: `DrawReminderHandler` registrado para `draw.reminder`: grupo inexistente, fora de ABERTO ou com outro sorteio previsto termina sem enviar; senão enfileira o `email.send` da spec a quem organiza agora e emite `draw.reminder_sent`.
**Where**: `apps/api/src/draws/draw-reminder.handler.ts`
**Depends on**: T13
**Reuses**: `EmailService.enqueue`, `email-blocks.ts`, `BusinessEventsService`
**Requirement**: DRAW-08, DRAW-10

**Done when**:

- [ ] Testes em `test/draw-reminder.int-spec.ts`: `lembrete de sortear > na hora prevista envia a quem organiza agora o e-mail do lembrete`, `> não envia com o grupo SORTEADO ou ENCERRADO`, `> não envia se o sorteio previsto mudou depois do agendamento`, `> não envia se o grupo foi excluído`, `> mudar a data duas vezes envia um lembrete só, na data nova`, `> emite draw.reminder_sent com groupId`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 616 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): email the organizer when it is time to draw`

---

#### T15: Agendar o lembrete dos grupos que já existem

**What**: Migration `ScheduleExistingDrawReminders` que grava um `draw.reminder` para cada grupo ABERTO com sorteio previsto no futuro.
**Where**: `apps/api/src/database/migrations/<timestamp>-ScheduleExistingDrawReminders.ts`
**Depends on**: T14
**Reuses**: `test/migrations.ts`
**Requirement**: DRAW-08

**Done when**:

- [ ] Testes em `test/draw-reminder-backfill.int-spec.ts`: `lembretes de grupos existentes > a migration agenda o lembrete dos grupos ABERTOS com sorteio previsto no futuro e só deles`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 617 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): schedule reminders for groups created before reminders existed`

---

### Phase 4: Base do site, painel e restrições

#### T16: Ler o painel e os pares no servidor do site

**What**: `lib/draws.ts` com `getDrawPanel(groupId)` e `getExclusions(groupId)`: `apiServerFetch`, 404 vira `null`, outro status lança.
**Where**: `apps/web/src/lib/draws.ts`
**Depends on**: T15
**Reuses**: `apiServerFetch`, `lib/groups.ts`
**Requirement**: DRAW-02, DRAW-03

**Done when**:

- [ ] Testes em `src/lib/draws.test.ts`: `getDrawPanel > devolve o painel`, `> devolve null no 404`, `> lança em outro status`; `getExclusions > devolve participantes e pares`, `> devolve null no 404`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 187 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): read the draw panel and pairs on the server`

---

#### T17: Escrever os textos e escolher a visão da aba

**What**: `lib/draw-format.ts` com `drawConditionLabels(panel)`, `drawnAtLabel(iso)`, `resultCardSubtitle(group)` e `drawTabView(role, status)` (organizador ABERTO, organizador sorteado, organizador encerrado, participante antes, participante depois).
**Where**: `apps/web/src/lib/draw-format.ts`
**Depends on**: T16
**Reuses**: `formatBrasiliaDate`
**Requirement**: DRAW-01, DRAW-02, DRAW-03, DRAW-05, DRAW-06

**Done when**:

- [ ] Testes em `src/lib/draw-format.test.ts`: `drawConditionLabels > escreve N participantes aprovados com 3 ou mais`, `> escreve Falta 1 pessoa e Faltam N pessoas para o mínimo de 3`, `> escreve Nenhuma entrada pendente, 1 pessoa aguarda aprovação e N pessoas aguardam aprovação`, `> escreve se as restrições permitem o sorteio`; `drawnAtLabel > escreve Sorteio feito em dd/mm/aaaa no horário de Brasília`; `resultCardSubtitle > junta o grupo e a data da confraternização quando existe`; `drawTabView > escolhe a visão pelo papel e pelo status`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 194 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the draw labels`

---

#### T18: Abrir a aba Sorteio

**What**: `GroupTabs` com a terceira aba "Sorteio" e `app/grupos/[id]/(tabs)/sorteio/page.tsx` com o aviso do participante antes do sorteio; as outras visões entram na T22.
**Where**: `apps/web/src/app/grupos/[id]/(tabs)/sorteio/page.tsx`
**Depends on**: T17
**Reuses**: layout `(tabs)`, `getCurrentGroup`, `drawTabView`
**Requirement**: DRAW-01

**Done when**:

- [ ] Testes: `GroupTabs > mostra Grupo, Participantes e Sorteio e marca a atual` (`src/components/group-tabs.test.tsx`); em `e2e/draw.spec.ts`: `sorteio › a aba Sorteio aparece em Grupo, Participantes e Sorteio`, `sorteio › participante vê a aba Sorteio e o aviso de que o sorteio não foi feito`, `sorteio › sem sessão leva a entrar com a aba como destino`, `sorteio › pessoa de fora vê Grupo não encontrado. sem as abas`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 195 tests pass no web e 109 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the draw tab`

---

#### T19: Criar o painel do sorteio

**What**: `components/draw-panel.tsx`: condições com ícone (`success`/`warning`), "Sortear" `festive` desabilitado com condição pendente, frase de sigilo, alerta dos pares a revisar; confirmação de sortear com "Sorteando…"; depois do sorteio, "Sorteio feito em", o texto e "Cancelar sorteio" (só SORTEADO) com a confirmação e "Cancelando…"; erros da API num alerta; `router.refresh()` no sucesso.
**Where**: `apps/web/src/components/draw-panel.tsx`
**Depends on**: T18
**Reuses**: `ConfirmDialog`, `Alert`, `Button`, `apiFetch`, `drawConditionLabels`, `drawnAtLabel`
**Requirement**: DRAW-03, DRAW-04, DRAW-06, DRAW-11

**Done when**:

- [ ] Testes em `src/components/draw-panel.test.tsx`: `DrawPanel > mostra o título, as três condições, Sortear e a frase de sigilo`, `> mostra condição cumprida com ícone em success e pendente com ícone em warning`, `> desabilita Sortear com alguma condição pendente`, `> mostra o alerta Revise estes pares com os pares a revisar`, `> Sortear abre a confirmação com o texto e os botões`, `> Ainda não, Esc e clique fora fecham sem sortear`, `> confirmar mostra Sorteando… e atualiza a página no sucesso`, `> mostra a mensagem da API no 409 e no 429 e fecha a confirmação`, `> mostra Não foi possível concluir. Tente de novo. em outro erro`, `> depois do sorteio mostra Sorteio feito em, o texto e Cancelar sorteio`, `> com o grupo ENCERRADO mostra Sorteio feito em sem Cancelar sorteio`, `> Cancelar sorteio abre a confirmação com o texto e os botões`, `> Manter sorteio, Esc e clique fora fecham sem cancelar`, `> confirmar o cancelamento mostra Cancelando… e atualiza a página`, `> mostra a mensagem da API no 409 do cancelamento e o genérico em outro erro`, `> a confirmação põe o foco em Ainda não e em Manter sorteio e prende o Tab`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 211 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the draw panel`

---

#### T20: Criar o editor de restrições

**What**: `components/exclusion-editor.tsx`: título, aviso, dois `<select>` com os aprovados, "Adicionar par", lista "{A} e {B}" com "Remover par {A} e {B}", texto sem pares; valida com `validateExclusionInput` antes de enviar; erros da API (400, 404, 409) num alerta ou no campo com `aria-describedby`; modo só leitura (SORTEADO com a nota, ENCERRADO sem); `router.refresh()` depois de cada mudança.
**Where**: `apps/web/src/components/exclusion-editor.tsx`
**Depends on**: T19
**Reuses**: `Label`, `FieldError`, `Alert`, `Button`, `apiFetch`, `validateExclusionInput`
**Requirement**: DRAW-02, DRAW-11

**Done when**:

- [ ] Testes em `src/components/exclusion-editor.test.tsx`: `ExclusionEditor > mostra o título, o aviso, os campos com os aprovados e Adicionar par`, `> adiciona o par e atualiza a página`, `> mostra Escolha as duas pessoas do par. sem enviar`, `> mostra Escolha duas pessoas diferentes. sem enviar`, `> mostra Esse par já está na lista. em qualquer ordem sem enviar`, `> mostra o erro da API no 400, 404 e 409`, `> remove o par sem confirmação e atualiza a página`, `> mostra Nenhum par cadastrado. sem pares`, `> só leitura no grupo SORTEADO mostra a nota e nenhum controle`, `> só leitura no grupo ENCERRADO não mostra a nota nem controles`, `> liga o erro ao campo por aria-describedby`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 222 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the exclusion pair editor`

---

### Phase 5: Papelzinho e aba Sorteio

#### T21: Criar o papelzinho do resultado

**What**: `components/result-card.tsx` e a animação em `globals.css` (só em `motion-safe:`): dobrado sem o nome, "Abrir papelzinho" busca `/api/groups/{id}/draw/result`, mostra "Você tirou" e o nome, anuncia em `role="status"`; "Esconder" dobra e apaga o nome; 404 faz `router.refresh()`; outra falha mostra o erro e mantém dobrado; estrelas em posições fixas.
**Where**: `apps/web/src/components/result-card.tsx`
**Depends on**: T20
**Reuses**: `Button` (`night`, `night-ghost`), tokens `reveal-*` e `festive`, `apiFetch`, `resultCardSubtitle`
**Requirement**: DRAW-05

**Done when**:

- [ ] Testes em `src/components/result-card.test.tsx`: `ResultCard > dobrado mostra Quem você tirou, o grupo com a data, Seu papelzinho, Toque para abrir e o aviso, sem o nome`, `> mostra só o nome do grupo sem data da confraternização`, `> Abrir papelzinho busca o resultado e mostra Você tirou e o nome`, `> anuncia Você tirou {nome}. Só você vê este nome, nem quem organiza sabe.`, `> Esconder dobra o papel e tira o nome da tela`, `> atualiza a página quando a API responde 404`, `> mantém dobrado e mostra o erro em outra falha`, `> mostra nome com marcação HTML como texto`, `> anima só com motion-safe`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 231 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the folded paper with the draw result`

---

#### T22: Montar as visões da aba Sorteio

**What**: A página da aba lê painel e pares para quem organiza e monta cada visão do `drawTabView`: painel + editor (ABERTO), papelzinho + painel feito + pares só leitura (SORTEADO, ENCERRADO), aviso ou papelzinho para o participante.
**Where**: `apps/web/src/app/grupos/[id]/(tabs)/sorteio/page.tsx` (modify)
**Depends on**: T21
**Reuses**: `getDrawPanel`, `getExclusions`, `DrawPanel`, `ExclusionEditor`, `ResultCard`, `lastEmailTo` do e2e
**Requirement**: DRAW-01, DRAW-02, DRAW-04, DRAW-05, DRAW-06, DRAW-07

**Done when**:

- [ ] Testes em `e2e/draw.spec.ts`: `sorteio › organizador adiciona um par, vê as restrições impedirem com 3 pessoas e sorteia com 4`, `sorteio › participante abre o papelzinho e vê o nome; ao voltar a aba está dobrada`, `sorteio › o e-mail do resultado chega com o nome só no corpo`, `sorteio › organizador cancela o sorteio e a aba volta ao painel; participante recebe o aviso`, `sorteio › organizador vê os pares só para leitura depois do sorteio`, `sorteio › o HTML da aba não contém o nome sorteado`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 231 tests pass no web e 115 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): show the draw tab for organizers and participants`

---

#### T23: Conferir a acessibilidade da aba Sorteio

**What**: Casos novos em `e2e/accessibility.spec.ts`: axe na visão de quem organiza e no papelzinho dobrado e aberto, nos dois temas; sem rolagem horizontal em 360 e 1440 px; papel sem animação com movimento reduzido.
**Where**: `apps/web/e2e/accessibility.spec.ts` (modify)
**Depends on**: T22
**Reuses**: helpers de axe e de tema da suíte
**Requirement**: DRAW-05, DRAW-11

**Done when**:

- [ ] Testes: `acessibilidade › aba Sorteio de quem organiza sem violações nos dois temas`, `acessibilidade › papelzinho dobrado e aberto sem violações nos dois temas`, `acessibilidade › aba Sorteio sem rolagem horizontal em 360 e 1440 px`, `acessibilidade › papelzinho abre sem animação com movimento reduzido`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 231 tests pass no web e 119 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `test(web): check accessibility of the draw tab`

---

## Checks

**C1** - Grupo e Participantes mostram a aba "Sorteio", depois das outras, com link para `/grupos/{id}/sorteio` (DRAW-01, AC 1)
Proof: run web | ✓ GroupTabs > mostra Grupo, Participantes e Sorteio e marca a atual
Proof: run e2e | ✓ sorteio › a aba Sorteio aparece em Grupo, Participantes e Sorteio

**C2** - `/grupos/{id}/sorteio` mostra o cabeçalho do grupo e as abas com "Sorteio" como atual (DRAW-01, AC 2)
Proof: run e2e | ✓ sorteio › participante vê a aba Sorteio e o aviso de que o sorteio não foi feito

**C3** - Com o grupo ABERTO, quem não organiza vê só "O sorteio ainda não foi feito. Você recebe um e-mail quando {organizador} sortear." (DRAW-01, AC 3)
Proof: run e2e | ✓ sorteio › participante vê a aba Sorteio e o aviso de que o sorteio não foi feito
Proof: run web | ✓ drawTabView > escolhe a visão pelo papel e pelo status

**C4** - Com o grupo ABERTO, quem organiza vê o painel e o editor de restrições (DRAW-01, AC 4)
Proof: run e2e | ✓ sorteio › organizador adiciona um par, vê as restrições impedirem com 3 pessoas e sorteia com 4

**C5** - Com o grupo SORTEADO ou ENCERRADO, todo participante vê o papelzinho do próprio resultado (DRAW-01, AC 5)
Proof: run web | ✓ drawTabView > escolhe a visão pelo papel e pelo status
Proof: run e2e | ✓ sorteio › participante abre o papelzinho e vê o nome; ao voltar a aba está dobrada

**C6** - Pessoa sem participação aprovada ou id inexistente vê "Grupo não encontrado." sem as abas (DRAW-01, AC 6)
Proof: run e2e | ✓ sorteio › pessoa de fora vê Grupo não encontrado. sem as abas

**C7** - Sem sessão, a aba leva a `/entrar?next=/grupos/{id}/sorteio` (DRAW-01, AC 7)
Proof: run e2e | ✓ sorteio › sem sessão leva a entrar com a aba como destino

**C8** - Com o grupo ABERTO, o editor mostra "Quem não tira quem", o aviso, os campos com os aprovados em ordem de nome e "Adicionar par" (DRAW-02, AC 1)
Proof: run web | ✓ ExclusionEditor > mostra o título, o aviso, os campos com os aprovados e Adicionar par
Proof: run api | ✓ pares de restrição > lista participantes aprovados e pares em ordem de nome, sem id de pessoa

**C9** - Adicionar duas pessoas diferentes grava o par e a lista mostra "{A} e {B}" (DRAW-02, AC 2)
Proof: run api | ✓ pares de restrição > quem organiza adiciona um par e a lista mostra os dois nomes
Proof: run web | ✓ ExclusionEditor > adiciona o par e atualiza a página

**C10** - O par vale nos dois sentidos (DRAW-02, AC 3)
Proof: run api | ✓ distribuição do sorteio > nunca junta as duas pessoas de um par, em nenhum sentido, em 500 sorteios
Proof: run api | ✓ sortear > respeita os pares de restrição nos dois sentidos

**C11** - Falta uma das pessoas: 400 "Escolha as duas pessoas do par." sem gravar (DRAW-02, AC 4)
Proof: run shared | ✓ validateExclusionInput > recusa par sem uma das pessoas com Escolha as duas pessoas do par.
Proof: run api | ✓ pares de restrição > recusa par sem uma das pessoas com 400 Escolha as duas pessoas do par.
Proof: run web | ✓ ExclusionEditor > mostra Escolha as duas pessoas do par. sem enviar

**C12** - Mesma pessoa duas vezes: 400 "Escolha duas pessoas diferentes." sem gravar (DRAW-02, AC 5)
Proof: run shared | ✓ validateExclusionInput > recusa a mesma pessoa duas vezes com Escolha duas pessoas diferentes.
Proof: run api | ✓ pares de restrição > recusa a mesma pessoa duas vezes com 400 Escolha duas pessoas diferentes.
Proof: run web | ✓ ExclusionEditor > mostra Escolha duas pessoas diferentes. sem enviar

**C13** - Par repetido, em qualquer ordem: 400 "Esse par já está na lista." sem gravar (DRAW-02, AC 6)
Proof: run shared | ✓ validateExclusionInput > recusa par repetido em qualquer ordem com Esse par já está na lista.
Proof: run api | ✓ pares de restrição > recusa par repetido em qualquer ordem com 400 Esse par já está na lista.
Proof: run web | ✓ ExclusionEditor > mostra Esse par já está na lista. em qualquer ordem sem enviar

**C14** - Pessoa que não é participante aprovada: 404 "Participante não encontrado." sem gravar (DRAW-02, AC 7)
Proof: run api | ✓ pares de restrição > responde 404 Participante não encontrado. a pessoa que não é participante aprovada

**C15** - "Remover par {A} e {B}" apaga sem confirmação e o par sai da lista (DRAW-02, AC 8)
Proof: run api | ✓ pares de restrição > remove um par
Proof: run web | ✓ ExclusionEditor > remove o par sem confirmação e atualiza a página

**C16** - Apagar um par que não existe responde 204 (DRAW-02, AC 9)
Proof: run api | ✓ pares de restrição > remover par que não existe responde 204

**C17** - Sem pares, o editor mostra "Nenhum par cadastrado. Todos podem tirar todos, menos a si mesmos." (DRAW-02, AC 10)
Proof: run web | ✓ ExclusionEditor > mostra Nenhum par cadastrado. sem pares

**C18** - Grupo SORTEADO: 409 "Para mudar as restrições, cancele o sorteio." a criar ou apagar par, sem mudar nada (DRAW-02, AC 11)
Proof: run api | ✓ pares de restrição > responde 409 Para mudar as restrições, cancele o sorteio. com o grupo SORTEADO e não muda nada

**C19** - Grupo ENCERRADO: 409 "Grupo encerrado não pode ser alterado." a criar ou apagar par, sem mudar nada (DRAW-02, AC 12)
Proof: run api | ✓ pares de restrição > responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO e não muda nada

**C20** - Com o grupo SORTEADO, quem organiza vê os pares sem controles, com a nota "Para mudar as restrições, cancele o sorteio." (DRAW-02, AC 13)
Proof: run web | ✓ ExclusionEditor > só leitura no grupo SORTEADO mostra a nota e nenhum controle
Proof: run e2e | ✓ sorteio › organizador vê os pares só para leitura depois do sorteio

**C21** - Com o grupo ENCERRADO, quem organiza vê os pares sem controles e sem a nota (DRAW-02, AC 14)
Proof: run web | ✓ ExclusionEditor > só leitura no grupo ENCERRADO não mostra a nota nem controles

**C22** - Quem não organiza recebe 403 "Só quem organiza pode alterar o grupo." ao ler, criar ou apagar pares (DRAW-02, AC 15)
Proof: run api | ✓ pares de restrição > responde 403 a participante que não organiza ao ler, criar ou apagar pares

**C23** - O site não mostra os pares a quem não organiza (DRAW-02, AC 16)
Proof: run web | ✓ drawTabView > escolhe a visão pelo papel e pelo status
Proof: run api | ✓ pares de restrição > responde 403 a participante que não organiza ao ler, criar ou apagar pares

**C24** - Sair ou ser removido apaga, na mesma transação, os pares da pessoa (DRAW-02, AC 17)
Proof: run api | ✓ remover participante > apaga os pares de restrição da pessoa
Proof: run api | ✓ sair do grupo > apaga os pares de restrição da pessoa

**C25** - Depois da transferência, quem recebe vê e edita os pares e quem passou deixa de ver (DRAW-02, AC 18)
Proof: run api | ✓ transferir organização > quem recebe passa a ver e editar os pares e quem passou deixa de ver

**C26** - Com o grupo ABERTO, o painel mostra "Sorteio", as três condições, "Sortear" e "Ninguém vê quem os outros tiraram, nem você." (DRAW-03, AC 1)
Proof: run web | ✓ DrawPanel > mostra o título, as três condições, Sortear e a frase de sigilo

**C27** - 3 ou mais aprovados: "{N} participantes aprovados" cumprida (DRAW-03, AC 2)
Proof: run web | ✓ drawConditionLabels > escreve N participantes aprovados com 3 ou mais
Proof: run api | ✓ painel do sorteio > conta aprovados e pendentes

**C28** - Menos de 3: "Faltam {N} pessoas para o mínimo de 3" ("Falta 1 pessoa...") pendente (DRAW-03, AC 3)
Proof: run web | ✓ drawConditionLabels > escreve Falta 1 pessoa e Faltam N pessoas para o mínimo de 3
Proof: run api | ✓ painel do sorteio > conta aprovados e pendentes

**C29** - Sem pendentes: "Nenhuma entrada pendente" cumprida (DRAW-03, AC 4)
Proof: run web | ✓ drawConditionLabels > escreve Nenhuma entrada pendente, 1 pessoa aguarda aprovação e N pessoas aguardam aprovação

**C30** - Com pendentes: "1 pessoa aguarda aprovação" / "{N} pessoas aguardam aprovação" pendente (DRAW-03, AC 5)
Proof: run web | ✓ drawConditionLabels > escreve Nenhuma entrada pendente, 1 pessoa aguarda aprovação e N pessoas aguardam aprovação
Proof: run api | ✓ painel do sorteio > conta aprovados e pendentes

**C31** - Com distribuição possível: "As restrições permitem o sorteio" cumprida (DRAW-03, AC 6)
Proof: run api | ✓ painel do sorteio > grupo sem pares é viável e não lista pares a revisar
Proof: run web | ✓ drawConditionLabels > escreve se as restrições permitem o sorteio

**C32** - Sem distribuição: "As restrições não permitem um sorteio válido" pendente e o alerta "Revise estes pares: ..." (DRAW-03, AC 7)
Proof: run api | ✓ painel do sorteio > 3 aprovados e um par não são viáveis e listam o par a revisar
Proof: run web | ✓ DrawPanel > mostra o alerta Revise estes pares com os pares a revisar
Proof: run e2e | ✓ sorteio › organizador adiciona um par, vê as restrições impedirem com 3 pessoas e sorteia com 4

**C33** - O alerta lista só os pares das pessoas de um conjunto com menos pessoas permitidas do que o tamanho dele (DRAW-03, AC 8)
Proof: run api | ✓ viabilidade do sorteio > devolve como bloqueadas só pessoas de um conjunto com menos pessoas permitidas do que o tamanho dele
Proof: run api | ✓ painel do sorteio > lista só os pares das pessoas bloqueadas

**C34** - Com alguma condição pendente, "Sortear" fica desabilitado (DRAW-03, AC 9)
Proof: run web | ✓ DrawPanel > desabilita Sortear com alguma condição pendente

**C35** - Condição cumprida com ícone em `success` e pendente com ícone em `warning` (DRAW-03, AC 10)
Proof: run web | ✓ DrawPanel > mostra condição cumprida com ícone em success e pendente com ícone em warning

**C36** - "Sortear" abre "Fazer o sorteio de {grupo}?" com o texto e os botões "Sortear" e "Ainda não" (DRAW-04, AC 1)
Proof: run web | ✓ DrawPanel > Sortear abre a confirmação com o texto e os botões

**C37** - "Ainda não", Esc ou toque fora fecham sem sortear (DRAW-04, AC 2)
Proof: run web | ✓ DrawPanel > Ainda não, Esc e clique fora fecham sem sortear

**C38** - Confirmar cria a rodada ativa com um par por aprovado, inclusive quem organiza, e passa o grupo a SORTEADO (DRAW-04, AC 3)
Proof: run api | ✓ sortear > cria a rodada ativa com um par por aprovado, inclusive quem organiza, e passa o grupo a SORTEADO

**C39** - Cada participante tira exatamente uma pessoa e é tirado por exatamente uma (DRAW-04, AC 4)
Proof: run api | ✓ distribuição do sorteio > cada pessoa tira exatamente uma e é tirada por exatamente uma em 500 sorteios

**C40** - Ninguém tira a si mesmo (DRAW-04, AC 5)
Proof: run api | ✓ distribuição do sorteio > ninguém tira a si mesmo em 500 sorteios

**C41** - A distribuição nunca junta as duas pessoas de um par, em nenhum sentido (DRAW-04, AC 6)
Proof: run api | ✓ distribuição do sorteio > nunca junta as duas pessoas de um par, em nenhum sentido, em 500 sorteios
Proof: run api | ✓ sortear > respeita os pares de restrição nos dois sentidos

**C42** - Sem pares, a distribuição é uma corrente única (DRAW-04, AC 7)
Proof: run api | ✓ distribuição do sorteio > sem pares sai sempre corrente única

**C43** - Com pares, até 10 participantes e corrente possível, sai corrente única (DRAW-04, AC 8)
Proof: run api | ✓ distribuição do sorteio > com pares e até 10 pessoas sai corrente única quando ela existe

**C44** - Pares que impedem toda corrente mas permitem outra distribuição: sai essa distribuição (DRAW-04, AC 9)
Proof: run api | ✓ distribuição do sorteio > com pares que impedem a corrente sai outra distribuição válida

**C45** - O sorteio usa o `randomInt` do `node:crypto` (DRAW-04, AC 10)
Proof: run api | ✓ distribuição do sorteio > sorteia com randomInt do node:crypto

**C46** - Rodada, pares e status numa transação só: tudo ou nada (DRAW-04, AC 11)
Proof: run api | ✓ sortear > grava rodada, pares e status juntos ou nada

**C47** - Terminado o sorteio, a aba recarrega com o papelzinho dobrado e "Sorteio feito em {dd/mm/aaaa}" (DRAW-04, AC 12)
Proof: run web | ✓ DrawPanel > confirmar mostra Sorteando… e atualiza a página no sucesso
Proof: run e2e | ✓ sorteio › organizador adiciona um par, vê as restrições impedirem com 3 pessoas e sorteia com 4

**C48** - Enquanto sorteia, o botão mostra "Sorteando…" desabilitado (DRAW-04, AC 13)
Proof: run web | ✓ DrawPanel > confirmar mostra Sorteando… e atualiza a página no sucesso

**C49** - Grupo SORTEADO: 409 "Este grupo já fez o sorteio." sem rodada nova (DRAW-04, AC 14)
Proof: run api | ✓ sortear > responde 409 Este grupo já fez o sorteio. com o grupo SORTEADO
Proof: run api | ✓ sortear > dois sorteios simultâneos criam uma rodada só e o outro recebe 409

**C50** - Grupo ENCERRADO: 409 "Grupo encerrado não pode ser alterado." sem rodada (DRAW-04, AC 15)
Proof: run api | ✓ sortear > responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO

**C51** - Menos de 3 aprovados: 409 "O sorteio precisa de pelo menos 3 participantes aprovados."; com 3, aceita (DRAW-04, AC 16)
Proof: run api | ✓ sortear > aceita 3 aprovados e recusa 2 com 409 O sorteio precisa de pelo menos 3 participantes aprovados.

**C52** - Pedido pendente: 409 "Aprove ou recuse os pedidos pendentes antes do sorteio." (DRAW-04, AC 17)
Proof: run api | ✓ sortear > responde 409 Aprove ou recuse os pedidos pendentes antes do sorteio. com pedido pendente

**C53** - Sem distribuição: 409 "As restrições não permitem um sorteio válido." com os pares a revisar no corpo (DRAW-04, AC 18)
Proof: run api | ✓ sortear > responde 409 As restrições não permitem um sorteio válido. com os pares a revisar
Proof: run api | ✓ distribuição do sorteio > devolve bloqueado quando nenhuma distribuição existe

**C54** - Mais de uma condição falhando: responde a primeira na ordem status, mínimo, pendentes, restrições (DRAW-04, AC 19)
Proof: run api | ✓ sortear > responde a primeira condição que falha na ordem status, mínimo, pendentes, restrições

**C55** - Quem não organiza: 403 "Só quem organiza pode alterar o grupo." sem rodada (DRAW-04, AC 20)
Proof: run api | ✓ sortear > responde 403 a participante que não organiza e 404 a quem não participa

**C56** - 5 sorteios nas últimas 24 horas: o 6º recebe 429 "Muitas tentativas. Tente de novo em N minutos." (DRAW-04, AC 21)
Proof: run api | ✓ sortear > aceita o 5º sorteio em 24 horas e responde 429 ao 6º

**C57** - 409 ou 429: a confirmação fecha e a mensagem da API aparece num alerta vermelho (DRAW-04, AC 22)
Proof: run web | ✓ DrawPanel > mostra a mensagem da API no 409 e no 429 e fecha a confirmação

**C58** - Outro erro ou rede: a confirmação fecha e aparece "Não foi possível concluir. Tente de novo." (DRAW-04, AC 23)
Proof: run web | ✓ DrawPanel > mostra Não foi possível concluir. Tente de novo. em outro erro

**C59** - 1.000 aprovados sem pares: a API responde ao sorteio em menos de 2 segundos (DRAW-04, AC 24)
Proof: run api | ✓ sortear > sorteia 1000 aprovados sem pares em menos de 2 segundos
Proof: run api | ✓ distribuição do sorteio > distribui 1000 pessoas sem pares em menos de 100 ms

**C60** - Com o grupo SORTEADO, entrar, sair e remover recebem o 409 da `05-invites` (DRAW-04, AC 25)
Proof: run api | ✓ sortear > com o grupo sorteado, entrar, sair e remover respondem 409
Proof: run api | ✓ sortear > pedido de entrada simultâneo ao sorteio entra antes ou recebe 409

**C61** - O papelzinho mostra "Quem você tirou", o grupo com " · {dd/mm/aaaa}" quando há confraternização, "Seu papelzinho", "Toque para abrir" e "Abra num lugar reservado: só você pode ver este nome." (DRAW-05, AC 1)
Proof: run web | ✓ ResultCard > dobrado mostra Quem você tirou, o grupo com a data, Seu papelzinho, Toque para abrir e o aviso, sem o nome
Proof: run web | ✓ ResultCard > mostra só o nome do grupo sem data da confraternização
Proof: run web | ✓ resultCardSubtitle > junta o grupo e a data da confraternização quando existe

**C62** - Com o papelzinho dobrado, a página não contém o nome sorteado (DRAW-05, AC 2)
Proof: run web | ✓ ResultCard > dobrado mostra Quem você tirou, o grupo com a data, Seu papelzinho, Toque para abrir e o aviso, sem o nome
Proof: run e2e | ✓ sorteio › o HTML da aba não contém o nome sorteado

**C63** - "Abrir papelzinho" busca o próprio par e mostra "Você tirou" e o nome atual (DRAW-05, AC 3)
Proof: run web | ✓ ResultCard > Abrir papelzinho busca o resultado e mostra Você tirou e o nome
Proof: run api | ✓ resultado do sorteio > devolve o nome atual da pessoa sorteada
Proof: run e2e | ✓ sorteio › participante abre o papelzinho e vê o nome; ao voltar a aba está dobrada

**C64** - Ao abrir, o site anuncia "Você tirou {nome}. Só você vê este nome, nem quem organiza sabe." (DRAW-05, AC 4)
Proof: run web | ✓ ResultCard > anuncia Você tirou {nome}. Só você vê este nome, nem quem organiza sabe.

**C65** - "Esconder" dobra o papel e tira o nome da tela (DRAW-05, AC 5)
Proof: run web | ✓ ResultCard > Esconder dobra o papel e tira o nome da tela

**C66** - Voltar à aba mostra o papelzinho dobrado (DRAW-05, AC 6)
Proof: run e2e | ✓ sorteio › participante abre o papelzinho e vê o nome; ao voltar a aba está dobrada

**C67** - A API devolve a cada participante só quem ele tirou na rodada ativa (DRAW-05, AC 7)
Proof: run api | ✓ resultado do sorteio > devolve a cada participante só a pessoa que ele tirou

**C68** - Sem rodada ativa: 404 "Sorteio não encontrado." ao pedir o resultado (DRAW-05, AC 8)
Proof: run api | ✓ resultado do sorteio > responde 404 Sorteio não encontrado. sem rodada ativa

**C69** - 404 ao abrir faz a aba recarregar (DRAW-05, AC 9)
Proof: run web | ✓ ResultCard > atualiza a página quando a API responde 404

**C70** - Outro erro ou rede: o papel fica dobrado e aparece "Não foi possível abrir o papelzinho. Tente de novo." (DRAW-05, AC 10)
Proof: run web | ✓ ResultCard > mantém dobrado e mostra o erro em outra falha

**C71** - Com movimento reduzido, o papelzinho abre e fecha sem animação e sem faíscas (DRAW-05, AC 11)
Proof: run web | ✓ ResultCard > anima só com motion-safe
Proof: run e2e | ✓ acessibilidade › papelzinho abre sem animação com movimento reduzido

**C72** - Com o grupo SORTEADO, o painel de quem organiza mostra "Sorteio feito em {dd/mm/aaaa}", o texto e "Cancelar sorteio" (DRAW-06, AC 1)
Proof: run web | ✓ DrawPanel > depois do sorteio mostra Sorteio feito em, o texto e Cancelar sorteio
Proof: run web | ✓ drawnAtLabel > escreve Sorteio feito em dd/mm/aaaa no horário de Brasília

**C73** - Com o grupo ENCERRADO, "Sorteio feito em {dd/mm/aaaa}" sem "Cancelar sorteio" (DRAW-06, AC 2)
Proof: run web | ✓ DrawPanel > com o grupo ENCERRADO mostra Sorteio feito em sem Cancelar sorteio

**C74** - "Cancelar sorteio" abre "Cancelar o sorteio de {grupo}?" com o texto e os botões (DRAW-06, AC 3)
Proof: run web | ✓ DrawPanel > Cancelar sorteio abre a confirmação com o texto e os botões

**C75** - "Manter sorteio", Esc ou toque fora fecham sem cancelar (DRAW-06, AC 4)
Proof: run web | ✓ DrawPanel > Manter sorteio, Esc e clique fora fecham sem cancelar

**C76** - Confirmar marca a rodada como cancelada com a data, apaga os pares e volta o grupo a ABERTO, numa transação (DRAW-06, AC 5)
Proof: run api | ✓ cancelar sorteio > marca a rodada como cancelada com a data, apaga os pares e volta o grupo a ABERTO

**C77** - Terminado o cancelamento, a aba volta ao painel com "Sortear" e ao editor (DRAW-06, AC 6)
Proof: run e2e | ✓ sorteio › organizador cancela o sorteio e a aba volta ao painel; participante recebe o aviso

**C78** - Enquanto cancela, o botão mostra "Cancelando…" desabilitado (DRAW-06, AC 7)
Proof: run web | ✓ DrawPanel > confirmar o cancelamento mostra Cancelando… e atualiza a página

**C79** - De volta a ABERTO, o grupo aceita entrada, saída, remoção e mudança de pares (DRAW-06, AC 8)
Proof: run api | ✓ cancelar sorteio > grupo cancelado volta a aceitar entrada, saída, remoção e pares

**C80** - Sortear de novo cria outra rodada, sem relação com a cancelada (DRAW-06, AC 9)
Proof: run api | ✓ cancelar sorteio > sortear de novo cria outra rodada

**C81** - Grupo ABERTO: 409 "Este grupo ainda não fez o sorteio." sem mudar nada (DRAW-06, AC 10)
Proof: run api | ✓ cancelar sorteio > responde 409 Este grupo ainda não fez o sorteio. com o grupo ABERTO
Proof: run api | ✓ cancelar sorteio > dois cancelamentos simultâneos cancelam uma vez e o outro recebe 409

**C82** - Grupo ENCERRADO: 409 "Grupo encerrado não pode ser alterado." sem mudar nada (DRAW-06, AC 11)
Proof: run api | ✓ cancelar sorteio > responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO

**C83** - Quem não organiza: 403 sem mudar nada (DRAW-06, AC 12)
Proof: run api | ✓ cancelar sorteio > responde 403 a participante que não organiza

**C84** - 409 no cancelamento: mensagem da API num alerta; outros erros, o texto genérico (DRAW-06, AC 13)
Proof: run web | ✓ DrawPanel > mostra a mensagem da API no 409 do cancelamento e o genérico em outro erro

**C85** - O sorteio enfileira, na mesma transação, um e-mail a cada participante, inclusive quem organiza (DRAW-07, AC 1)
Proof: run api | ✓ sortear > enfileira um job de resultado por participante, só com ids

**C86** - Assunto do e-mail do resultado "O sorteio de {grupo} foi feito", sem o nome (DRAW-07, AC 2)
Proof: run api | ✓ e-mail do resultado > envia a cada participante o assunto sem o nome e o nome só no corpo

**C87** - Corpo com "{organizador} fez o sorteio...", "Você tirou: {nome}", "Só você recebeu este nome. Guarde segredo!" e "Ver no site" para `/grupos/{id}/sorteio` (DRAW-07, AC 3)
Proof: run api | ✓ e-mail do resultado > envia a cada participante o assunto sem o nome e o nome só no corpo
Proof: run e2e | ✓ sorteio › o e-mail do resultado chega com o nome só no corpo

**C88** - O texto de pré-visualização não contém o nome sorteado (DRAW-07, AC 4)
Proof: run api | ✓ e-mail do resultado > a pré-visualização do e-mail não contém o nome sorteado

**C89** - Sorteio cancelado ou grupo excluído antes do envio: o e-mail de resultado não sai (DRAW-07, AC 5)
Proof: run api | ✓ e-mail do resultado > não envia depois que o sorteio é cancelado
Proof: run api | ✓ e-mail do resultado > não envia depois que o grupo é excluído
Proof: run api | ✓ cancelar sorteio > e-mails de resultado ainda na fila não saem depois do cancelamento

**C90** - Cancelar enfileira o aviso a cada participante da rodada menos quem cancelou, com o assunto, o texto e "Ver grupo" da spec (DRAW-07, AC 6)
Proof: run api | ✓ cancelar sorteio > enfileira o aviso a cada participante da rodada menos quem cancelou
Proof: run e2e | ✓ sorteio › organizador cancela o sorteio e a aba volta ao painel; participante recebe o aviso

**C91** - Nomes com marcação HTML aparecem literais nos e-mails (DRAW-07, AC 7)
Proof: run api | ✓ e-mail do resultado > mostra nomes com marcação HTML como texto

**C92** - Sorteio ou cancelamento recusado não enfileira e-mail (DRAW-07, AC 8)
Proof: run api | ✓ sortear > não emite evento nem enfileira e-mail quando o sorteio é recusado
Proof: run api | ✓ cancelar sorteio > não emite evento nem aviso quando o cancelamento é recusado

**C93** - O job do e-mail do resultado não guarda o nome sorteado no payload (DRAW-07, AC 9)
Proof: run api | ✓ sortear > enfileira um job de resultado por participante, só com ids

**C94** - Criar ou editar grupo com sorteio previsto agenda o lembrete para a data e hora (DRAW-08, AC 1)
Proof: run api | ✓ agendar lembrete > criar grupo com sorteio previsto agenda o lembrete para a data e hora
Proof: run api | ✓ agendar lembrete > editar o sorteio previsto troca o lembrete pendente pelo da data nova

**C95** - Na hora, com o grupo ABERTO e a mesma data, quem organiza agora recebe o e-mail do lembrete com o texto da spec (DRAW-08, AC 2)
Proof: run api | ✓ lembrete de sortear > na hora prevista envia a quem organiza agora o e-mail do lembrete

**C96** - Grupo fora de ABERTO na hora: o lembrete não sai (DRAW-08, AC 3)
Proof: run api | ✓ lembrete de sortear > não envia com o grupo SORTEADO ou ENCERRADO

**C97** - Sorteio previsto mudado ou tirado: o lembrete antigo não sai (DRAW-08, AC 4)
Proof: run api | ✓ lembrete de sortear > não envia se o sorteio previsto mudou depois do agendamento
Proof: run api | ✓ agendar lembrete > tirar o sorteio previsto apaga o lembrete pendente

**C98** - Grupo excluído: o lembrete não sai (DRAW-08, AC 5)
Proof: run api | ✓ lembrete de sortear > não envia se o grupo foi excluído

**C99** - Mudar a data envia no máximo um lembrete, na data nova (DRAW-08, AC 6)
Proof: run api | ✓ lembrete de sortear > mudar a data duas vezes envia um lembrete só, na data nova

**C100** - A feature agenda o lembrete dos grupos ABERTOS com sorteio previsto no futuro (DRAW-08, AC 7)
Proof: run api | ✓ lembretes de grupos existentes > a migration agenda o lembrete dos grupos ABERTOS com sorteio previsto no futuro e só deles

**C101** - Nenhuma rota devolve o par de outra pessoa, nem a quem organiza (DRAW-09, AC 1)
Proof: run api | ✓ resultado do sorteio > nenhuma rota do sorteio devolve a quem organiza o par de outra pessoa

**C102** - Sortear, cancelar, painel e pares não devolvem nenhum par sorteado (DRAW-09, AC 2)
Proof: run api | ✓ resultado do sorteio > nenhuma rota do sorteio devolve a quem organiza o par de outra pessoa
Proof: run api | ✓ sortear > a resposta não contém nenhum par sorteado
Proof: run api | ✓ painel do sorteio > não contém nenhum par sorteado

**C103** - Depois da transferência num grupo SORTEADO, quem organiza vê só o próprio par (DRAW-09, AC 3)
Proof: run api | ✓ resultado do sorteio > depois da transferência quem organiza continua vendo só o próprio par

**C104** - Logs, eventos, Sentry e erros não contêm nome sorteado nem id de pessoa sorteada (DRAW-09, AC 4)
Proof: run api | ✓ resultado do sorteio > o log de um sorteio, do resultado e do cancelamento não tem nomes nem ids de pessoa
Proof: run api | ✓ e-mail do resultado > falha do transporte não leva nome nem e-mail ao log nem ao Sentry

**C105** - Pedir o resultado de grupo de que não participa: 404 "Grupo não encontrado." (DRAW-09, AC 5)
Proof: run api | ✓ resultado do sorteio > responde 404 Grupo não encontrado. a quem não participa

**C106** - Sorteio feito emite `draw.performed` com `groupId`, `participants`, `singleCycle` e `hasExclusions` (DRAW-10, AC 1)
Proof: run api | ✓ sortear > emite draw.performed com groupId, participants, singleCycle e hasExclusions

**C107** - Cancelamento emite `draw.cancelled` com `groupId` e `minutesSinceDraw` (DRAW-10, AC 2)
Proof: run api | ✓ cancelar sorteio > emite draw.cancelled com groupId e minutesSinceDraw

**C108** - Lembrete enviado emite `draw.reminder_sent` com `groupId` (DRAW-10, AC 3)
Proof: run api | ✓ lembrete de sortear > emite draw.reminder_sent com groupId

**C109** - Os eventos do sorteio não contêm nome, e-mail nem id de pessoa (DRAW-10, AC 4)
Proof: run api | ✓ resultado do sorteio > o log de um sorteio, do resultado e do cancelamento não tem nomes nem ids de pessoa

**C110** - Operação recusada ou que falha não emite evento (DRAW-10, AC 5)
Proof: run api | ✓ sortear > não emite evento nem enfileira e-mail quando o sorteio é recusado
Proof: run api | ✓ cancelar sorteio > não emite evento nem aviso quando o cancelamento é recusado

**C111** - `/grupos/{id}/sorteio` sem violações WCAG 2.1 A/AA no axe, nos dois temas, na visão de quem organiza e no papelzinho dobrado e aberto (DRAW-11, AC 1)
Proof: run e2e | ✓ acessibilidade › aba Sorteio de quem organiza sem violações nos dois temas
Proof: run e2e | ✓ acessibilidade › papelzinho dobrado e aberto sem violações nos dois temas

**C112** - `/grupos/{id}/sorteio` não rola na horizontal em 360 e 1440 px (DRAW-11, AC 2)
Proof: run e2e | ✓ acessibilidade › aba Sorteio sem rolagem horizontal em 360 e 1440 px

**C113** - A confirmação de sortear ou cancelar põe o foco em "Ainda não" / "Manter sorteio" e prende o Tab (DRAW-11, AC 3)
Proof: run web | ✓ DrawPanel > a confirmação põe o foco em Ainda não e em Manter sorteio e prende o Tab

**C114** - Os erros do editor ficam ligados aos campos por `aria-describedby` (DRAW-11, AC 4)
Proof: run web | ✓ ExclusionEditor > liga o erro ao campo por aria-describedby

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** T1, formato do par: cada lado do `ExclusionPair` é `{ membershipId, name }`, o mesmo tipo dos participantes do editor; `pairsToReview` do painel usa o mesmo `ExclusionPair`, user: "a e b com id e nome (Recomendado)". T5, assinatura do sender: `EmailSender.send(message, jobId)` monta a chave `email/{jobId}` e emite `email.sent` com o `jobId`, em vez do `send(message, key)` do design, porque o evento precisa do id do job; os handlers passam `job.id`, user: "send(message, jobId) (Recomendado)". T6, ordem dos pares: em cada par, `a` é o nome que vem primeiro (sem acento nem maiúsculas, como a lista de participantes) e a lista ordena por nome de `a`, depois de `b`, user: "Nome dentro e fora (Recomendado)"; o 201 do POST segue a mesma regra, user: "Mesma regra do GET (Recomendado)". T6, recusas: criar par responde 404 do grupo, 403, 409 de status, 400 dos campos e depois 404 "Participante não encontrado."; apagar responde 404, 403, 409 e 204 para par inexistente, id que não é UUID ou par de outro grupo, user: "Confirmo (Recomendado)". T10, pré-visualização: o layout de e-mail não tinha texto de pré-visualização e o cliente mostraria "Você tirou: {nome}" na prévia; o `EmailMessage` ganha o campo opcional `preview`, que o layout põe num bloco oculto no topo do HTML seguido de espaços invisíveis, e só o e-mail do resultado o usa, user: "Prévia oculta (Recomendado)"; o texto é "Abra num lugar reservado para ver quem você tirou.", user: "Abra num lugar reservado (Recomendado)". T11, `minutesSinceDraw`: minutos completos entre o sorteio e o cancelamento, arredondados para baixo (59 s dá 0), user: "Minutos completos (Recomendado)".
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15
Phase 4:  T16 → T17 → T18 → T19 → T20
Phase 5:  T21 → T22 → T23
```

Execução inline, uma fase por vez, cada fase num PR contra a `main` (AD-010); sem sub-agentes de lote. Ao fim da fase 5: `check_proofs.py`, walk das histórias, Verifier e screens sub-agent (só se houver captura), correções, `validate_verification.py` e lições, antes do push.
