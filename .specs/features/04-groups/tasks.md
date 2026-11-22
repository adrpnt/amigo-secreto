# Groups Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/04-groups/design.md`
**Status**: Approved
**Approved**: 2026-11-21 - user: "Aprovada as tasks. Crie a milestone e as issues no Linear. Mas não comece a executar agora."
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run shared**: `pnpm turbo run test --force --filter=@amigo-secreto/shared -- --reporter=verbose`
**Run api**: `pnpm turbo run test --force --filter=@amigo-secreto/api -- --reporter=verbose`
**Run web**: `pnpm turbo run test --force --filter=@amigo-secreto/web -- --reporter=verbose`
**Run e2e**: `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web`

Linhas esperadas das provas: o nome de cada teste é o que a check escreve; a task que cria o teste usa exatamente esse texto em `describe`/`it` (o Vitest separa com `>`, o reporter `list` do Playwright com `›`). Contagens de teste partem da `main` em 2026-11-21 (`29ff5a5`), contando `it(`/`test(`: 0 no shared, 282 na API, 39 unitários no web e 60 no e2e; a primeira execução confere, e um desvio só de contagem inicial é registrado em `**Settled mid-build:**`. Os status de grupo e de participação ficam em maiúsculas (design, `**Amended**`).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `.claude/rules/nest-api-coding-standards.md` e `.claude/rules/next-web-coding-standards.md` (nomes de `describe`/`it` em português; sem metas de cobertura), os testes da `03-auth` (`apps/api/src/**/*.spec.ts`, `apps/api/test/**/*.int-spec.ts`, `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/e2e/**/*.spec.ts`); strong defaults aplicados à profundidade.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Shared: regras dos campos e datas | unit (Vitest) | Todos os ramos; 1:1 com os critérios; bordas das faixas (L-012) e uma condição por vez (L-005) | `packages/shared/src/**/*.spec.ts` | `pnpm --filter @amigo-secreto/shared test` |
| Shared: tipos de resposta | none | Build gate | - | Build gate |
| API: funções puras (e-mails de grupo) | unit | Todos os ramos; 1:1 com os critérios | `apps/api/src/**/*.spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| API: tabelas e migrations, fila, `GroupAccess`, rotas, eventos | integration (Testcontainers) | Toda rota e critério da task: sucesso + bordas + falhas + 401/403/404/409/429; concorrência com conexões reais; estado lido depois de cada recusa (L-018) | `apps/api/test/**/*.int-spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project integration` |
| API: módulos, DTOs, entidades sem regra | none | Build gate | - | Build gate |
| Web: funções de `lib/` e componentes com lógica | unit (Vitest + Testing Library) | Todos os ramos; 1:1 com os critérios | `apps/web/src/**/*.test.{ts,tsx}` | `pnpm --filter @amigo-secreto/web test` |
| Web: páginas e fluxos | e2e (Playwright contra a API em produção, Postgres descartável, Resend falso) | Todo critério de tela alcançável sem banco: caminho feliz + erro + sem sessão; os estados que só existem com outro participante ou grupo SORTEADO ficam nos testes de componente (design) | `apps/web/e2e/**/*.spec.ts` | `pnpm test:e2e` |
| Web: componentes do shadcn (`components/ui/`) | none | Build gate; cobertos pelos componentes que os usam | - | Build gate |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Cada gate roda o lint e o typecheck do pacote antes dos testes.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Shared | Tasks do `packages/shared` | `pnpm --filter @amigo-secreto/shared lint && pnpm --filter @amigo-secreto/shared typecheck && pnpm --filter @amigo-secreto/shared test` |
| Quick | Tasks da API só com testes unitários | `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| Full | Tasks da API com testes de integração | `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test` |
| Web | Tasks do web só com testes unitários | `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test` |
| E2E | Tasks do web com e2e | `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e` |
| Build | Fim de cada fase | `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Ao fim de cada fase roda o gate Build; cada fase vira um PR (AD-010). Na fase 4, o fechamento da feature roda antes do PR.

### Phase 1: Regras compartilhadas e tabelas

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: API de grupos

```
T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 3: Componentes do site

```
T16 → T17 → T18 → T19 → T20 → T21 → T22 → T23
```

### Phase 4: Telas e navegação

```
T24 → T25 → T26 → T27 → T28 → T29 → T30 → T31 → T32
```

---

## Task Breakdown

### Phase 1: Regras compartilhadas e tabelas

#### T1: Criar as regras dos campos do grupo no shared

**What**: `packages/shared/src/groups.ts` com `GroupStatus`, `GroupInput`, `GroupFieldErrors`, `GroupSummary`, `MyGroupsResponse`, `GroupDetail`, `GROUP_MESSAGES`, `normalizeGroupInput` e `validateGroupInput(input, { now, saved })`, exportados no `index.ts`; textos medidos em pontos de código.
**Where**: `packages/shared/src/groups.ts`
**Depends on**: None
**Reuses**: medida de `apps/api/src/users/name-length.ts`
**Requirement**: GRP-01, GRP-04

**Done when**:

- [x] Testes em `src/groups.spec.ts` (imports explícitos de `vitest`): `validateGroupInput > aceita nome com 1 e com 80 pontos de código, inclusive emojis`, `> recusa nome vazio depois do trim e com 81 pontos de código com a mensagem do nome`, `> aceita recado com 1000 pontos de código e recusa com 1001`, `> aceita valores 1 e 100000 e recusa 0, 100001 e 50.5`, `> recusa o valor final sem o inicial`, `> recusa valor inicial maior que o final e aceita iguais`, `> recusa sorteio previsto ou confraternização no passado`, `> aceita data igual à gravada mesmo no passado`, `> recusa data alterada para o passado mesmo com data gravada`, `> recusa sorteio previsto igual ou depois da confraternização`, `> aceita local com 200 pontos de código e recusa com 201`, `> devolve uma mensagem por campo quando vários campos falham`; `normalizeGroupInput > tira os espaços das pontas e troca texto vazio por null`, `> grava o máximo igual ao mínimo quando só o mínimo vem`, `> mantém as quebras de linha do recado`
- [x] Mensagens iguais às da spec (GRP-01 AC 5 a 12)
- [x] Gate check passes: `pnpm --filter @amigo-secreto/shared lint && pnpm --filter @amigo-secreto/shared typecheck && pnpm --filter @amigo-secreto/shared test`
- [x] Test count: 15 tests pass no shared

**Tests**: unit
**Gate**: Shared

**Commit**: `feat(shared): add group field rules and messages`

---

#### T2: Criar as datas no horário de Brasília no shared

**What**: `packages/shared/src/brasilia-time.ts` com `brasiliaInputToIso`, `isoToBrasiliaInput`, `formatBrasiliaDateTime` e `formatBrasiliaDate`, com o deslocamento de `America/Sao_Paulo` calculado pelo `Intl` no instante da data; exportados no `index.ts`.
**Where**: `packages/shared/src/brasilia-time.ts`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: GRP-01

**Done when**:

- [x] Testes em `src/brasilia-time.spec.ts`: `brasiliaInputToIso > converte 2026-12-20T19:00 para 2026-12-20T22:00:00.000Z`, `isoToBrasiliaInput > devolve o valor do campo no horário de Brasília`, `formatBrasiliaDateTime > formata 2026-12-20T22:00:00.000Z como 20/12/2026 às 19:00`, `formatBrasiliaDate > formata a data no horário de Brasília, inclusive perto da meia-noite UTC`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/shared lint && pnpm --filter @amigo-secreto/shared typecheck && pnpm --filter @amigo-secreto/shared test`
- [x] Test count: 19 tests pass no shared

**Tests**: unit
**Gate**: Shared

**Commit**: `feat(shared): convert and format dates in brasilia time`

---

#### T3: Criar a entidade Group e a migration da tabela

**What**: Entidade `Group` com as colunas e as restrições do design (`CHECK` do status, dos valores e do `closedAt`; índice em `ownerId`), `GroupsModule` com `TypeOrmModule.forFeature`, importado no `AppModule`, e migration `CreateGroupTable` gerada por `migration:generate`.
**Where**: `apps/api/src/groups/group.entity.ts`
**Depends on**: T2
**Reuses**: `apps/api/src/users/user.entity.ts`, `apps/api/src/jobs/job.entity.ts`, migration `CreateUserTable`
**Requirement**: GRP-01

**Done when**:

- [x] Testes em `test/group-table.int-spec.ts`: `tabela group > é criada pela migration com as colunas do grupo`, `> recusa mínimo maior que máximo e só um dos valores`, `> recusa status fora de OPEN, DRAWN e CLOSED`, `> exige closedAt só no status CLOSED`, `> é removida ao reverter a migration`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 287 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): add the group table`

---

#### T4: Criar a entidade Membership e a migration da tabela

**What**: Entidade `Membership` (status `PENDING`, `APPROVED`, `REJECTED`; único `(groupId, userId)`; índice em `userId`; `groupId` em cascata, `userId` com `RESTRICT`) registrada no `GroupsModule`, e migration `CreateMembershipTable`.
**Where**: `apps/api/src/groups/membership.entity.ts`
**Depends on**: T3
**Reuses**: padrão da T3
**Requirement**: GRP-01, GRP-02

**Done when**:

- [x] Testes em `test/membership-table.int-spec.ts`: `tabela membership > recusa duas participações da mesma pessoa no mesmo grupo`, `> apaga as participações com o grupo`, `> recusa status fora de PENDING, APPROVED e REJECTED`, `> impede apagar um usuário com participação`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 291 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): add the membership table`

---

#### T5: Enfileirar muitos jobs numa instrução

**What**: `JobQueue.enqueueMany(type, payloads, { manager })` com `INSERT` de várias linhas em lotes de 1.000; lista vazia não toca o banco.
**Where**: `apps/api/src/jobs/job-queue.service.ts`
**Depends on**: T4
**Reuses**: `JobQueue.enqueue`
**Requirement**: GRP-05, GRP-09

**Done when**:

- [x] Testes em `test/job-queue.int-spec.ts`: `JobQueue > enqueueMany grava um job por item em lotes de 1000`, `> enqueueMany com lista vazia não grava nada`, `> enqueueMany desfaz com a transação de origem`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 294 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): enqueue many jobs in one statement`

---

#### T6: Enfileirar muitos e-mails numa transação

**What**: `EmailService.enqueueMany(messages, { manager })` com as checagens de destinatário e de URL do `enqueue` em todas as mensagens antes de gravar qualquer uma, sobre o `JobQueue.enqueueMany`.
**Where**: `apps/api/src/email/email.service.ts`
**Depends on**: T5
**Reuses**: `EmailService.enqueue`
**Requirement**: GRP-05, GRP-09

**Done when**:

- [x] Testes em `test/email-service.int-spec.ts`: `EmailService > enqueueMany grava um job email.send por mensagem`, `> enqueueMany recusa a lista inteira quando um destinatário é inválido`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 296 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): enqueue many emails in one transaction`

---

#### T7: Conferir o acesso ao grupo

**What**: `GroupAccess` com `requireMember` e `requireOrganizer` (`manager` e `lock` opcionais), exportado pelo `GroupsModule`: id que não é UUID, grupo inexistente ou sem participação `APPROVED` → 404 "Grupo não encontrado."; não organizador → 403 "Só quem organiza pode alterar o grupo."; `lock` faz `SELECT ... FOR UPDATE` na linha do grupo.
**Where**: `apps/api/src/groups/group-access.service.ts`
**Depends on**: T6
**Reuses**: `isUUID` do `class-validator`
**Requirement**: GRP-03, GRP-04, GRP-05, GRP-09

**Done when**:

- [x] Testes em `test/group-access.int-spec.ts`: `acesso ao grupo > responde 404 para id que não é UUID`, `> responde 404 para grupo inexistente`, `> responde 404 para quem não participa e para participação pendente ou recusada`, `> responde 403 para participante aprovado que não organiza`, `> devolve o grupo e a participação do organizador`, `> trava a linha do grupo até a transação terminar`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 302 tests pass na API
- [x] Gate Build da fase verde; push e PR da fase 1

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): check group membership and organizer access`

---

### Phase 2: API de grupos

#### T8: Montar os avisos de exclusão e de encerramento

**What**: `group-emails.ts` com `groupDeletedEmail` e `groupClosedEmail` (saudação, texto e botão da spec); `paragraph`, `button`, `greeting` e `siteUrl` saem de `auth/auth-emails.ts` para `email/email-blocks.ts`, sem mudar os e-mails da conta.
**Where**: `apps/api/src/groups/group-emails.ts`
**Depends on**: T7
**Reuses**: `apps/api/src/auth/auth-emails.ts`, `email/email-layout.ts`
**Requirement**: GRP-05, GRP-09

**Done when**:

- [x] Testes em `src/groups/group-emails.spec.ts`: `e-mails de grupo > aviso de exclusão tem o assunto, o texto e o botão Ver meus grupos`, `> aviso de encerramento tem o assunto, o texto e o botão Ver grupo`, `> mostram o nome do grupo com marcação HTML como texto`
- [x] `src/auth/auth-emails.spec.ts` passa sem mudança
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 305 tests pass na API

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(api): add group deleted and closed emails`

---

#### T9: Criar grupo pela API

**What**: `POST /groups` no `GroupsController` com `GroupInputDto` (só formato), `GroupsService.create` (normaliza, valida com `validateGroupInput`, `GroupValidationException` 400 com `fields`, limite de 20 por hora contado depois da validação, grupo `OPEN` + participação `APPROVED` numa transação) e `group.created` depois do commit.
**Where**: `apps/api/src/groups/groups.service.ts`
**Depends on**: T8
**Reuses**: `RateLimitService`, `BusinessEventsService`, `@CurrentUser()`, `apps/api/src/users/dto/update-profile.dto.ts`
**Requirement**: GRP-01, GRP-07

**Done when**:

- [x] Testes em `test/groups-create.int-spec.ts`: `criar grupo > cria o grupo ABERTO só com o nome, com a pessoa organizadora e participante aprovada`, `> grava todos os campos opcionais enviados`, `> grava mínimo e máximo iguais quando só o valor inicial vem`, `> grava a faixa quando os dois valores vêm`, `> recusa com 400 e a mensagem do campo nome vazio ou com 81 caracteres`, `> recusa com 400 nome com 80 "❤️", que o banco conta como 160 caracteres`, `> recusa com 400 recado com 1001 caracteres`, `> recusa com 400 valor fora de 1 a 100000 ou não inteiro`, `> recusa com 400 o valor final sem o inicial`, `> recusa com 400 valor inicial maior que o final`, `> recusa com 400 data no passado`, `> recusa com 400 sorteio previsto depois da confraternização`, `> recusa com 400 local com 201 caracteres`, `> recusa com 429 a 21ª criação da hora e aceita a 20ª`, `> não conta no limite a criação recusada com 400`, `> cria o grupo para conta com e-mail não confirmado`, `> grava as datas com o fuso e devolve o mesmo instante`, `> emite group.created com o groupId e sem dados pessoais`, `> não emite group.created quando a criação é recusada`, `> responde 401 sem sessão`
- [x] Cada recusa confere logo depois que nenhum grupo foi gravado (L-018)
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 325 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): create groups`

---

#### T10: Listar os grupos da pessoa pela API

**What**: `GET /groups` com `GroupsService.listMine`: uma consulta com as participações `APPROVED`, a contagem de participantes aprovados, `isOrganizer`, e as listas `active` (OPEN, DRAWN) e `closed` por `createdAt` decrescente.
**Where**: `apps/api/src/groups/groups.controller.ts`
**Depends on**: T9
**Reuses**: `GroupsService`
**Requirement**: GRP-02

**Done when**:

- [x] Testes em `test/groups-list.int-spec.ts`: `meus grupos > separa ativos (ABERTO e SORTEADO) de encerrados, do mais novo para o mais antigo`, `> não lista grupo de que a pessoa não participa nem participação pendente ou recusada`, `> conta só os participantes aprovados`, `> marca isOrganizer só no grupo que a pessoa organiza`, `> devolve listas vazias para quem não participa de nenhum grupo`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 330 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): list the groups of the signed-in person`

---

#### T11: Ver um grupo pela API

**What**: `GET /groups/:id` com `GroupsService.get`: `requireMember` e `GroupDetail` com `owner` e `isOrganizer`.
**Where**: `apps/api/src/groups/groups.controller.ts`
**Depends on**: T10
**Reuses**: `GroupAccess.requireMember`
**Requirement**: GRP-03

**Done when**:

- [x] Testes em `test/groups-detail.int-spec.ts`: `ver grupo > devolve os dados do grupo, o nome de quem organiza e isOrganizer ao participante aprovado`, `> responde 404 igual para id inexistente, id que não é UUID e grupo de que a pessoa não participa`, `> devolve o recado com quebras de linha e marcação HTML como texto`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 333 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): show a group to its members`

---

#### T12: Editar grupo pela API

**What**: `PUT /groups/:id` com `GroupsService.update`: transação com `requireOrganizer` e trava; CLOSED → 409 "Grupo encerrado não pode ser editado."; validação com `saved`; grava; `group.updated` depois do commit só quando algum campo mudou.
**Where**: `apps/api/src/groups/groups.service.ts`
**Depends on**: T11
**Reuses**: `GroupAccess`, `validateGroupInput`
**Requirement**: GRP-04, GRP-07

**Done when**:

- [x] Testes em `test/groups-update.int-spec.ts`: `editar grupo > grava os campos enviados em grupo ABERTO`, `> grava os campos enviados em grupo SORTEADO`, `> apaga o campo opcional enviado como null`, `> recusa com 400 a mesma regra da criação e não altera o grupo`, `> aceita uma data gravada que ficou no passado quando ela não muda`, `> recusa com 400 uma data alterada para o passado`, `> responde 403 ao participante que não organiza e não altera o grupo`, `> responde 409 em grupo ENCERRADO e não altera o grupo`, `> responde 409 à edição que espera o encerramento terminar`, `> responde 404 à edição de grupo excluído`, `> emite group.updated com os nomes dos campos que mudaram e sem dados pessoais`, `> não emite group.updated quando nada muda nem quando a edição é recusada`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 345 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): edit groups`

---

#### T13: Excluir grupo pela API

**What**: `DELETE /groups/:id` com `GroupsService.remove`: transação com `requireOrganizer` e trava; avisos aos participantes aprovados, menos quem organiza, por `enqueueMany`; `DELETE` com as participações em cascata; 204; `group.deleted` depois do commit.
**Where**: `apps/api/src/groups/groups.service.ts`
**Depends on**: T12
**Reuses**: `EmailService.enqueueMany`, `groupDeletedEmail`
**Requirement**: GRP-05, GRP-07

**Done when**:

- [x] Testes em `test/groups-delete.int-spec.ts`: `excluir grupo > apaga o grupo e as participações`, `> exclui grupo ABERTO, SORTEADO e ENCERRADO`, `> enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec`, `> não enfileira aviso para quem organiza nem para participação pendente ou recusada`, `> responde 403 ao participante que não organiza e não apaga nada`, `> responde 404 a grupo que não existe mais e não enfileira e-mail`, `> exclui uma vez e responde 404 ao segundo pedido simultâneo, com os avisos enfileirados uma vez`, `> desfaz a exclusão e os avisos quando a gravação falha`, `> emite group.deleted com o groupId, o status e sem dados pessoais`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 354 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): delete groups and notify their members`

---

#### T14: Encerrar grupo pela API

**What**: `POST /groups/:id/close` com `GroupsService.close`: transação com `requireOrganizer` e trava; status ≠ DRAWN → 409 "Só um grupo sorteado pode ser encerrado."; `CLOSED` com `closedAt`; avisos por `enqueueMany`; `group.closed` com `trigger: "manual"` depois do commit.
**Where**: `apps/api/src/groups/groups.service.ts`
**Depends on**: T13
**Reuses**: `EmailService.enqueueMany`, `groupClosedEmail`
**Requirement**: GRP-09, GRP-07

**Done when**:

- [x] Testes em `test/groups-close.int-spec.ts` (grupo posto em `DRAWN` direto no banco): `encerrar grupo > passa o grupo SORTEADO para ENCERRADO e grava a data do encerramento`, `> responde 409 em grupo ABERTO ou ENCERRADO e não muda o grupo`, `> responde 403 ao participante que não organiza e não muda o grupo`, `> enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec`, `> não enfileira aviso para quem organiza nem para participação pendente ou recusada`, `> encerra uma vez e responde 409 ao segundo pedido simultâneo, com os avisos enfileirados uma vez`, `> emite group.closed com trigger manual e sem dados pessoais`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 361 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): close drawn groups and notify their members`

---

#### T15: Documentar as rotas de grupo no Swagger

**What**: Tags, respostas (201, 200, 204, 400 com `fields`, 403, 404, 409, 429) e o corpo do `GroupInputDto` nas rotas de grupo, no padrão das rotas da conta.
**Where**: `apps/api/src/groups/groups.controller.ts`
**Depends on**: T14
**Reuses**: `test/swagger.int-spec.ts`
**Requirement**: GRP-01

**Done when**:

- [x] Teste em `test/swagger.int-spec.ts`: `Swagger > documenta as rotas de grupo`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [x] Test count: 362 tests pass na API
- [x] Gate Build da fase verde; push e PR da fase 2

**Tests**: integration
**Gate**: Full

**Commit**: `docs(api): describe the group routes in swagger`

---

### Phase 3: Componentes do site

#### T16: Extrair o fetch do servidor para a API

**What**: `lib/api-server.ts` com `apiServerFetch(path)` (URL interna, cookie da requisição, `no-store`, timeout de 5 s), usado pelo `getSession` e pelo `getGoogleSignup` sem mudar o comportamento deles.
**Where**: `apps/web/src/lib/api-server.ts`
**Depends on**: T15
**Reuses**: `apps/web/src/lib/session.ts`
**Requirement**: GRP-02, GRP-03

**Done when**:

- [x] Testes em `src/lib/api-server.test.ts`: `apiServerFetch > repassa o cookie da requisição à URL interna da API`, `> lança erro sem API_INTERNAL_URL`
- [x] `src/lib/session.test.ts` passa sem mudança
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 41 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `refactor(web): share the server-side api fetch`

---

#### T17: Ler os grupos no servidor

**What**: `lib/groups.ts` com `getMyGroups()` (lança erro fora do 200) e `getGroup(id)` (`null` no 404, lança erro nos outros).
**Where**: `apps/web/src/lib/groups.ts`
**Depends on**: T16
**Reuses**: `apiServerFetch`
**Requirement**: GRP-02, GRP-03

**Done when**:

- [x] Testes em `src/lib/groups.test.ts`: `getGroup > devolve null quando a API responde 404`, `> lança erro quando a API responde 500`, `getMyGroups > lança erro quando a API não responde 200`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 44 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): read groups from the api on the server`

---

#### T18: Formatar valor, participantes e data do card

**What**: `lib/group-format.ts` com `formatGiftValue(min, max)`, `participantsLabel(count)` e `cardDateLine(summary)`.
**Where**: `apps/web/src/lib/group-format.ts`
**Depends on**: T17
**Reuses**: `formatBrasiliaDate` do shared
**Requirement**: GRP-02, GRP-03

**Done when**:

- [x] Testes em `src/lib/group-format.test.ts`: `formatGiftValue > mostra R$ 50 quando mínimo e máximo são iguais`, `> mostra R$ 50 a R$ 100 numa faixa`, `> mostra R$ 1.500 com ponto de milhar`, `participantsLabel > escreve 1 participante e N participantes`, `cardDateLine > mostra Sorteio em dd/mm/aaaa para grupo ABERTO`, `> mostra Confraternização em dd/mm/aaaa para grupo SORTEADO ou ENCERRADO`, `> mostra Sem data definida quando a data do status não existe`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 51 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): format group values, counts and dates`

---

#### T19: Criar a confirmação de ação

**What**: `components/ui/dialog.tsx` gerado pelo CLI do shadcn (`base-vega`) e `components/confirm-dialog.tsx` (ConfirmDialog do design system: título, texto, botão de confirmar e "Manter ...", foco inicial no botão de desistir, Tab preso, Esc e toque fora desistem, `tone: "primary"`).
**Where**: `apps/web/src/components/confirm-dialog.tsx`
**Depends on**: T18
**Reuses**: `@base-ui/react/dialog`, `components/ui/button.tsx`
**Requirement**: GRP-05, GRP-08, GRP-09

**Done when**:

- [x] Testes em `src/components/confirm-dialog.test.tsx`: `ConfirmDialog > abre com o título, o texto e os dois botões`, `> põe o foco em Manter grupo e prende o Tab`, `> fecha sem confirmar com Manter grupo, Esc e toque fora`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 54 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the confirm dialog`

---

#### T20: Criar a tag de status do grupo

**What**: `components/status-tag.tsx` com ícone e palavra por status (ABERTO, SORTEADO, ENCERRADO) e a variante neutra, nas cores do design system.
**Where**: `apps/web/src/components/status-tag.tsx`
**Depends on**: T19
**Reuses**: StatusTag do design system
**Requirement**: GRP-02, GRP-03

**Done when**:

- [x] Teste em `src/components/status-tag.test.tsx`: `StatusTag > escreve ABERTO, SORTEADO e ENCERRADO com ícone`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 55 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the group status tag`

---

#### T21: Criar o card do grupo

**What**: `components/group-card.tsx`: card inteiro como link para `/grupos/{id}`, nome em `h3`, `StatusTag`, participantes, linha da data e a tag "Você organiza".
**Where**: `apps/web/src/components/group-card.tsx`
**Depends on**: T20
**Reuses**: `StatusTag`, `group-format.ts`, GroupCard do design system
**Requirement**: GRP-02

**Done when**:

- [x] Testes em `src/components/group-card.test.tsx`: `GroupCard > mostra nome, status, participantes e a linha da data`, `> mostra a tag Você organiza só para quem organiza`, `> é um link para a página do grupo`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 58 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the group card`

---

#### T22: Criar o formulário do grupo

**What**: `app/grupos/group-form.tsx` (client), em modo criação e edição, com `components/ui/textarea.tsx` do shadcn: os campos do design, validação com `validateGroupInput` ao enviar, datas por `brasiliaInputToIso`, `fields` do 400 nos campos, 429 e erro inesperado num `Alert`, "Salvando..." com o botão desabilitado, "Voltar" na edição.
**Where**: `apps/web/src/app/grupos/group-form.tsx`
**Depends on**: T21
**Reuses**: `apps/web/src/app/perfil/profile-name-form.tsx`, `FieldError`, `apiFetch`
**Requirement**: GRP-01, GRP-04

**Done when**:

- [x] Testes em `src/app/grupos/group-form.test.tsx`: `GroupForm > mostra a mensagem de cada regra violada antes de enviar`, `> mostra as mensagens dos campos de um 400 da API`, `> mostra a mensagem da API num 429`, `> mostra a mensagem da API num 403 e num 409`, `> desabilita o botão e mostra Salvando... durante o envio, na criação e na edição`, `> mantém os campos e mostra Não foi possível salvar. Tente de novo. num erro inesperado`, `> envia as datas digitadas como instantes no horário de Brasília`, `> Voltar leva à página do grupo sem enviar nada`, `> abre preenchido com os dados atuais do grupo`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 67 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the group form`

---

#### T23: Criar as ações do organizador

**What**: `app/grupos/[id]/group-actions.tsx` (client): botões por status, "Excluir grupo" e "Encerrar grupo" com o `ConfirmDialog` e os textos da spec, exclusão levando a `/grupos`, encerramento com `router.refresh()`, mensagem da API num 409.
**Where**: `apps/web/src/app/grupos/[id]/group-actions.tsx`
**Depends on**: T22
**Reuses**: `ConfirmDialog`, `apiFetch`
**Requirement**: GRP-03, GRP-05, GRP-09

**Done when**:

- [x] Testes em `src/app/grupos/[id]/group-actions.test.tsx`: `GroupActions > mostra Editar grupo e Excluir grupo ao organizador de grupo ABERTO`, `> mostra Editar grupo, Encerrar grupo e Excluir grupo ao organizador de grupo SORTEADO`, `> mostra só Excluir grupo ao organizador de grupo ENCERRADO`, `> abre a confirmação de exclusão com o texto da spec`, `> exclui e leva a /grupos ao confirmar`, `> abre a confirmação de encerramento com o texto da spec`, `> encerra e atualiza a página ao confirmar`, `> Manter grupo fecha a confirmação de encerramento sem chamar a API`, `> mostra a mensagem da API quando o encerramento recebe 409`, `> desabilita o botão e mostra Excluindo… e Encerrando… durante o pedido`, `> leva a /grupos quando o grupo já foi excluído`, `> mostra Não foi possível concluir. Tente de novo. num erro inesperado`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [x] Test count: 79 tests pass no web
- [x] Gate Build da fase verde; push e PR da fase 3

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the organizer group actions`

---

### Phase 4: Telas e navegação

#### T24: Criar a página Meus grupos

**What**: `app/grupos/page.tsx` (`requireUser`, `getMyGroups` num `try`) e `app/grupos/my-groups-view.tsx` com as seções "Ativos" e "Encerrados", o estado vazio, "Nenhum grupo ativo.", o botão "Criar grupo" e o erro com "Tentar de novo" (`router.refresh()`).
**Where**: `apps/web/src/app/grupos/my-groups-view.tsx`
**Depends on**: T23
**Reuses**: `GroupCard`, `requireUser`, `getMyGroups`
**Requirement**: GRP-02, GRP-06

**Done when**:

- [x] Testes em `src/app/grupos/my-groups-view.test.tsx`: `MyGroupsView > lista Ativos e Encerrados na ordem recebida`, `> mostra o estado vazio com Criar grupo`, `> omite Encerrados sem grupo encerrado`, `> mostra Nenhum grupo ativo. só com encerrados`, `> mostra o erro com Tentar de novo, que recarrega`
- [x] Testes em `e2e/groups.spec.ts`: `grupos › lista o grupo criado em Ativos com Você organiza`, `› mostra o estado vazio para quem não participa de nenhum grupo`, `› o card leva à página do grupo`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [x] Test count: 79 tests pass no web e 63 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the my groups page`

---

#### T25: Criar a página do grupo

**What**: `app/grupos/[id]/page.tsx` (`requireUser`, `getGroup`, `notFound()`), `app/grupos/[id]/not-found.tsx` ("Grupo não encontrado." e o link "Meus grupos") e `app/grupos/[id]/group-detail-view.tsx` com os dados, "Organizado por", "Evento online", "Entrada com aprovação" só para quem organiza e `GroupActions` para quem organiza.
**Where**: `apps/web/src/app/grupos/[id]/group-detail-view.tsx`
**Depends on**: T24
**Reuses**: `StatusTag`, `GroupActions`, `formatGiftValue`, `formatBrasiliaDateTime`
**Requirement**: GRP-03, GRP-05

**Done when**:

- [x] Testes em `src/app/grupos/[id]/group-detail-view.test.tsx`: `GroupDetailView > mostra os campos preenchidos e Organizado por`, `> omite os campos vazios`, `> mostra Evento online junto do local`, `> mostra Entrada com aprovação só para quem organiza`, `> não mostra ações a quem não organiza`, `> mostra o recado com quebras de linha e marcação HTML como texto`
- [x] Testes em `e2e/groups.spec.ts`: `grupos › mostra Grupo não encontrado. para quem não participa e para id inexistente`, `› exclui o grupo depois de confirmar e ele some de Meus grupos`, `› Manter grupo fecha a confirmação sem excluir`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [x] Test count: 85 tests pass no web e 66 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the group page`

---

#### T26: Criar a página de novo grupo

**What**: `app/grupos/novo/page.tsx` com `requireUser('/grupos/novo')` e o `GroupForm` em modo criação, levando a `/grupos/{id}` ao criar.
**Where**: `apps/web/src/app/grupos/novo/page.tsx`
**Depends on**: T25
**Reuses**: `GroupForm`
**Requirement**: GRP-01, GRP-02, GRP-06

**Done when**:

- [ ] Testes em `e2e/groups.spec.ts`: `grupos › cria um grupo só com o nome a partir de Meus grupos e abre a página dele`, `› cria um grupo com todos os campos e mostra cada um na página`, `› mostra o erro do campo ao enviar sorteio depois da confraternização`, `› leva a /entrar e volta a /grupos/novo depois do login`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 85 tests pass no web e 70 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the new group page`

---

#### T27: Criar a página de edição do grupo

**What**: `app/grupos/[id]/editar/page.tsx` com `requireUser`, `getGroup`, `notFound()` e `editRedirect(group)` em `app/grupos/[id]/editar/edit-redirect.ts` (não organizador ou ENCERRADO → `/grupos/{id}`), e o `GroupForm` em modo edição.
**Where**: `apps/web/src/app/grupos/[id]/editar/edit-redirect.ts`
**Depends on**: T26
**Reuses**: `GroupForm`, `isoToBrasiliaInput`
**Requirement**: GRP-04

**Done when**:

- [ ] Teste em `src/app/grupos/[id]/editar/edit-redirect.test.ts`: `editRedirect > leva à página do grupo quem não organiza e o grupo ENCERRADO`
- [ ] Teste em `e2e/groups.spec.ts`: `grupos › edita o valor para uma faixa e apaga o local`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 86 tests pass no web e 71 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the edit group page`

---

#### T28: Trocar o destino padrão da API para Meus grupos

**What**: `DEFAULT_NEXT = '/grupos'` no `safeNext` da API; os testes de destino padrão da API passam a esperar `/grupos` e a dizer `/grupos` no nome.
**Where**: `apps/api/src/auth/safe-next.ts`
**Depends on**: T27
**Reuses**: nenhum
**Requirement**: GRP-06

**Done when**:

- [ ] Testes renomeados e ajustados: `test/email-verification.int-spec.ts` `confirmação de e-mail > devolve /grupos como destino quando o cadastro não tinha origem`, `test/google-login.int-spec.ts` `login com Google > troca por /grupos um destino de outro site`, `test/register.int-spec.ts` `cadastro > troca por /grupos um destino de outro site`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm test`
- [ ] Test count: 362 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): send people to their groups after signing in`

---

#### T29: Trocar o destino padrão do site para Meus grupos

**What**: `DEFAULT_NEXT = '/grupos'` no `safeNext` do site; os testes de unidade de destino padrão passam a `/grupos`; os e2e da conta que esperavam `/perfil` como destino padrão passam a esperar `/grupos`.
**Where**: `apps/web/src/lib/safe-next.ts`
**Depends on**: T28
**Reuses**: nenhum
**Requirement**: GRP-06

**Done when**:

- [ ] Testes de `src/lib/safe-next.test.ts` renomeados de `/perfil` para `/grupos`: `safeNext > troca por /grupos um caminho que começa com //`, `> troca por /grupos um caminho que começa com /\`, `> troca por /grupos um endereço com esquema`, `> troca por /grupos os caminhos /entrar e /cadastro`, `> troca por /grupos um valor ausente`
- [ ] Teste em `e2e/groups.spec.ts`: `navegação › entrar sem origem leva a /grupos`
- [ ] E2e da conta (`login`, `signup`, `google`, `email-confirmation`, `password-reset`, `profile`) atualizados só onde o destino padrão aparecia; os que abrem `/perfil` de propósito ficam
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 86 tests pass no web e 72 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): send people to their groups after signing in`

---

#### T30: Pôr Meus grupos no menu do avatar

**What**: "Meus grupos" como primeiro item do `UserMenuDropdown`, levando a `/grupos`, acima de "Perfil" e "Sair".
**Where**: `apps/web/src/components/user-menu-dropdown.tsx`
**Depends on**: T29
**Reuses**: `DropdownMenuItem` com `Link`
**Requirement**: GRP-06

**Done when**:

- [ ] Teste em `src/components/user-menu-dropdown.test.tsx`: `UserMenuDropdown > mostra Meus grupos, Perfil e Sair nesta ordem`
- [ ] Teste em `e2e/groups.spec.ts`: `navegação › menu do avatar mostra Meus grupos, Perfil e Sair e leva a /grupos`
- [ ] `e2e/header.spec.ts` atualizado se conferia os itens do menu
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 87 tests pass no web e 73 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): link my groups from the avatar menu`

---

#### T31: Levar quem está logado de / para Meus grupos

**What**: `app/page.tsx` lê a sessão e, com usuário, `redirect('/grupos')`; se a leitura da sessão falha, mostra a página atual (com o `unstable_rethrow` antes do `catch`, como a faixa de confirmação).
**Where**: `apps/web/src/app/page.tsx`
**Depends on**: T30
**Reuses**: `getCurrentUser`, `apps/web/src/components/email-verification-banner.tsx`
**Requirement**: GRP-06

**Done when**:

- [ ] Testes em `e2e/groups.spec.ts`: `navegação › logado em / vai para /grupos`, `› sem sessão / continua mostrando a página atual`
- [ ] Os e2e existentes da `/` com a API fora (`web-api-down`) passam sem mudança
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 87 tests pass no web e 75 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): open my groups from the home page when signed in`

---

#### T32: Conferir acessibilidade e larguras das telas de grupo

**What**: Axe (WCAG 2.1 A/AA) nos temas claro e escuro e ausência de rolagem horizontal em 360 px e 1440 px em `/grupos`, `/grupos/novo`, `/grupos/{id}` e `/grupos/{id}/editar`, com a confirmação aberta na página do grupo; corrige o que o axe apontar.
**Where**: `apps/web/e2e/accessibility.spec.ts`
**Depends on**: T31
**Reuses**: `openWithTheme`, `hasHorizontalScroll`, `WCAG_21_A_AA`
**Requirement**: GRP-08

**Done when**:

- [ ] Testes em `e2e/accessibility.spec.ts`: `acessibilidade › telas de grupo sem violações WCAG 2.1 A/AA no tema claro`, `› telas de grupo sem violações WCAG 2.1 A/AA no tema escuro`, `layout › telas de grupo não rolam na horizontal em 360 px e 1440 px`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 87 tests pass no web e 78 no e2e
- [ ] Gate Build da fase verde; fechamento da feature; push e PR da fase 4

**Tests**: e2e
**Gate**: E2E

**Commit**: `test(web): check accessibility and widths of the group pages`

---

## Checks

**C1** - Grupo enviado só com o nome nasce ABERTO, sem aprovação e sem online, com a pessoa organizadora e participante aprovada, e a tela leva a `/grupos/{id}` (GRP-01, AC 1)
Proof: run api | ✓ criar grupo > cria o grupo ABERTO só com o nome, com a pessoa organizadora e participante aprovada
Proof: run e2e | ✓ grupos › cria um grupo só com o nome a partir de Meus grupos e abre a página dele

**C2** - Recado, valor, datas, local, "Evento online" e "Exigir aprovação para entrar" enviados são gravados como vieram (GRP-01, AC 2)
Proof: run api | ✓ criar grupo > grava todos os campos opcionais enviados
Proof: run e2e | ✓ grupos › cria um grupo com todos os campos e mostra cada um na página

**C3** - Só o "Valor do presente (R$)" grava mínimo = máximo (GRP-01, AC 3)
Proof: run shared | ✓ normalizeGroupInput > grava o máximo igual ao mínimo quando só o mínimo vem
Proof: run api | ✓ criar grupo > grava mínimo e máximo iguais quando só o valor inicial vem

**C4** - Os dois valores gravam mínimo e máximo (GRP-01, AC 4)
Proof: run api | ✓ criar grupo > grava a faixa quando os dois valores vêm

**C5** - Nome vazio depois do trim ou com 81 pontos de código: 400, "Informe um nome de 1 a 80 caracteres." e nenhum grupo (GRP-01, AC 5)
Proof: run shared | ✓ validateGroupInput > recusa nome vazio depois do trim e com 81 pontos de código com a mensagem do nome
Proof: run api | ✓ criar grupo > recusa com 400 e a mensagem do campo nome vazio ou com 81 caracteres
Proof: run web | ✓ GroupForm > mostra a mensagem de cada regra violada antes de enviar

**C6** - Recado com 1.001 pontos de código: 400, "Use no máximo 1.000 caracteres." e nenhum grupo (GRP-01, AC 6)
Proof: run shared | ✓ validateGroupInput > aceita recado com 1000 pontos de código e recusa com 1001
Proof: run api | ✓ criar grupo > recusa com 400 recado com 1001 caracteres

**C7** - Valor 0, 100.001 ou não inteiro: 400, "Informe um valor inteiro de R$ 1 a R$ 100.000." e nenhum grupo (GRP-01, AC 7)
Proof: run shared | ✓ validateGroupInput > aceita valores 1 e 100000 e recusa 0, 100001 e 50.5
Proof: run api | ✓ criar grupo > recusa com 400 valor fora de 1 a 100000 ou não inteiro

**C8** - "Até (R$)" sem o valor inicial: 400, "Informe o valor inicial da faixa." e nenhum grupo (GRP-01, AC 8)
Proof: run shared | ✓ validateGroupInput > recusa o valor final sem o inicial
Proof: run api | ✓ criar grupo > recusa com 400 o valor final sem o inicial

**C9** - Valor inicial maior que o final: 400, "O valor inicial não pode passar do valor final." e nenhum grupo (GRP-01, AC 9)
Proof: run shared | ✓ validateGroupInput > recusa valor inicial maior que o final e aceita iguais
Proof: run api | ✓ criar grupo > recusa com 400 valor inicial maior que o final

**C10** - Sorteio previsto ou confraternização no passado: 400, "Escolha uma data no futuro." e nenhum grupo (GRP-01, AC 10)
Proof: run shared | ✓ validateGroupInput > recusa sorteio previsto ou confraternização no passado
Proof: run api | ✓ criar grupo > recusa com 400 data no passado

**C11** - Sorteio previsto igual ou depois da confraternização: 400, "O sorteio previsto precisa ser antes da confraternização." e nenhum grupo (GRP-01, AC 11)
Proof: run shared | ✓ validateGroupInput > recusa sorteio previsto igual ou depois da confraternização
Proof: run api | ✓ criar grupo > recusa com 400 sorteio previsto depois da confraternização
Proof: run e2e | ✓ grupos › mostra o erro do campo ao enviar sorteio depois da confraternização

**C12** - Local com 201 pontos de código: 400, "Use no máximo 200 caracteres." e nenhum grupo (GRP-01, AC 12)
Proof: run shared | ✓ validateGroupInput > aceita local com 200 pontos de código e recusa com 201
Proof: run api | ✓ criar grupo > recusa com 400 local com 201 caracteres

**C13** - A 21ª criação da hora recebe 429 com "Muitas tentativas. Tente de novo em N minutos." e não cria; criações recusadas com 400 não contam (GRP-01, AC 13)
Proof: run api | ✓ criar grupo > recusa com 429 a 21ª criação da hora e aceita a 20ª
Proof: run api | ✓ criar grupo > não conta no limite a criação recusada com 400
Proof: run web | ✓ GroupForm > mostra a mensagem da API num 429

**C14** - Conta com e-mail não confirmado cria grupo (GRP-01, AC 14)
Proof: run api | ✓ criar grupo > cria o grupo para conta com e-mail não confirmado

**C15** - Datas digitadas e mostradas no horário de Brasília, no formato `20/12/2026 às 19:00` (GRP-01, AC 15)
Proof: run shared | ✓ brasiliaInputToIso > converte 2026-12-20T19:00 para 2026-12-20T22:00:00.000Z
Proof: run shared | ✓ isoToBrasiliaInput > devolve o valor do campo no horário de Brasília
Proof: run shared | ✓ formatBrasiliaDateTime > formata 2026-12-20T22:00:00.000Z como 20/12/2026 às 19:00
Proof: run api | ✓ criar grupo > grava as datas com o fuso e devolve o mesmo instante
Proof: run web | ✓ GroupForm > envia as datas digitadas como instantes no horário de Brasília

**C16** - Durante o envio, "Criar grupo" fica desabilitado e mostra "Salvando..." (GRP-01, AC 16)
Proof: run web | ✓ GroupForm > desabilita o botão e mostra Salvando... durante o envio, na criação e na edição

**C17** - Erro 5xx ou de rede mantém os campos e mostra "Não foi possível salvar. Tente de novo." (GRP-01, AC 17)
Proof: run web | ✓ GroupForm > mantém os campos e mostra Não foi possível salvar. Tente de novo. num erro inesperado

**C18** - `/grupos` separa "Ativos" (ABERTO, SORTEADO) de "Encerrados", cada seção do mais novo para o mais antigo (GRP-02, AC 1)
Proof: run api | ✓ meus grupos > separa ativos (ABERTO e SORTEADO) de encerrados, do mais novo para o mais antigo
Proof: run web | ✓ MyGroupsView > lista Ativos e Encerrados na ordem recebida

**C19** - Grupo sem participação aprovada da pessoa não aparece (GRP-02, AC 2)
Proof: run api | ✓ meus grupos > não lista grupo de que a pessoa não participa nem participação pendente ou recusada

**C20** - O card mostra nome, StatusTag e "1 participante"/"N participantes", contando só aprovados (GRP-02, AC 3)
Proof: run api | ✓ meus grupos > conta só os participantes aprovados
Proof: run web | ✓ participantsLabel > escreve 1 participante e N participantes
Proof: run web | ✓ StatusTag > escreve ABERTO, SORTEADO e ENCERRADO com ícone
Proof: run web | ✓ GroupCard > mostra nome, status, participantes e a linha da data

**C21** - Grupo ABERTO mostra "Sorteio em {dd/mm/aaaa}" (GRP-02, AC 4)
Proof: run web | ✓ cardDateLine > mostra Sorteio em dd/mm/aaaa para grupo ABERTO

**C22** - Grupo SORTEADO ou ENCERRADO mostra "Confraternização em {dd/mm/aaaa}" (GRP-02, AC 5)
Proof: run web | ✓ cardDateLine > mostra Confraternização em dd/mm/aaaa para grupo SORTEADO ou ENCERRADO
Proof: run shared | ✓ formatBrasiliaDate > formata a data no horário de Brasília, inclusive perto da meia-noite UTC

**C23** - Sem a data do status, o card mostra "Sem data definida" (GRP-02, AC 6)
Proof: run web | ✓ cardDateLine > mostra Sem data definida quando a data do status não existe

**C24** - "Você organiza" aparece só no grupo que a pessoa organiza (GRP-02, AC 7)
Proof: run api | ✓ meus grupos > marca isOrganizer só no grupo que a pessoa organiza
Proof: run web | ✓ GroupCard > mostra a tag Você organiza só para quem organiza
Proof: run e2e | ✓ grupos › lista o grupo criado em Ativos com Você organiza

**C25** - Tocar o card leva a `/grupos/{id}` (GRP-02, AC 8)
Proof: run web | ✓ GroupCard > é um link para a página do grupo
Proof: run e2e | ✓ grupos › o card leva à página do grupo

**C26** - "Criar grupo" em `/grupos` leva a `/grupos/novo` (GRP-02, AC 9)
Proof: run e2e | ✓ grupos › cria um grupo só com o nome a partir de Meus grupos e abre a página dele

**C27** - Sem grupos, "Você ainda não participa de nenhum grupo." e "Criar grupo" (GRP-02, AC 10)
Proof: run api | ✓ meus grupos > devolve listas vazias para quem não participa de nenhum grupo
Proof: run web | ✓ MyGroupsView > mostra o estado vazio com Criar grupo
Proof: run e2e | ✓ grupos › mostra o estado vazio para quem não participa de nenhum grupo

**C28** - Sem grupo encerrado, a seção "Encerrados" não aparece (GRP-02, AC 11)
Proof: run web | ✓ MyGroupsView > omite Encerrados sem grupo encerrado

**C29** - Só com encerrados, "Ativos" mostra "Nenhum grupo ativo." (GRP-02, AC 12)
Proof: run web | ✓ MyGroupsView > mostra Nenhum grupo ativo. só com encerrados

**C30** - Falha da API mostra "Não foi possível carregar seus grupos." e "Tentar de novo", que recarrega (GRP-02, AC 13)
Proof: run web | ✓ getMyGroups > lança erro quando a API não responde 200
Proof: run web | ✓ MyGroupsView > mostra o erro com Tentar de novo, que recarrega

**C31** - Participante aprovado vê nome, StatusTag, "Organizado por {nome}" e os campos preenchidos (GRP-03, AC 1)
Proof: run api | ✓ ver grupo > devolve os dados do grupo, o nome de quem organiza e isOrganizer ao participante aprovado
Proof: run web | ✓ GroupDetailView > mostra os campos preenchidos e Organizado por
Proof: run e2e | ✓ grupos › cria um grupo com todos os campos e mostra cada um na página

**C32** - Campo opcional vazio não aparece (GRP-03, AC 2)
Proof: run web | ✓ GroupDetailView > omite os campos vazios

**C33** - Valor aparece como `R$ 50` ou `R$ 50 a R$ 100`, com ponto de milhar (GRP-03, AC 3)
Proof: run web | ✓ formatGiftValue > mostra R$ 50 quando mínimo e máximo são iguais
Proof: run web | ✓ formatGiftValue > mostra R$ 50 a R$ 100 numa faixa
Proof: run web | ✓ formatGiftValue > mostra R$ 1.500 com ponto de milhar

**C34** - "Evento online" aparece junto do local quando marcado (GRP-03, AC 4)
Proof: run web | ✓ GroupDetailView > mostra Evento online junto do local

**C35** - "Entrada com aprovação" aparece para quem organiza um grupo que exige aprovação (GRP-03, AC 5)
Proof: run web | ✓ GroupDetailView > mostra Entrada com aprovação só para quem organiza

**C36** - Organizador de grupo ABERTO vê "Editar grupo" e "Excluir grupo" (GRP-03, AC 6)
Proof: run web | ✓ GroupActions > mostra Editar grupo e Excluir grupo ao organizador de grupo ABERTO

**C37** - Organizador de grupo SORTEADO vê "Editar grupo", "Encerrar grupo" e "Excluir grupo" (GRP-03, AC 7)
Proof: run web | ✓ GroupActions > mostra Editar grupo, Encerrar grupo e Excluir grupo ao organizador de grupo SORTEADO

**C38** - Organizador de grupo ENCERRADO vê só "Excluir grupo" (GRP-03, AC 8)
Proof: run web | ✓ GroupActions > mostra só Excluir grupo ao organizador de grupo ENCERRADO

**C39** - Quem não organiza não vê ações nem "Entrada com aprovação" (GRP-03, AC 9)
Proof: run web | ✓ GroupDetailView > não mostra ações a quem não organiza
Proof: run web | ✓ GroupDetailView > mostra Entrada com aprovação só para quem organiza

**C40** - Id inexistente, não UUID ou grupo de que a pessoa não participa: 404 e "Grupo não encontrado." com "Meus grupos" (GRP-03, AC 10)
Proof: run api | ✓ ver grupo > responde 404 igual para id inexistente, id que não é UUID e grupo de que a pessoa não participa
Proof: run api | ✓ acesso ao grupo > responde 404 para quem não participa e para participação pendente ou recusada
Proof: run web | ✓ getGroup > devolve null quando a API responde 404
Proof: run e2e | ✓ grupos › mostra Grupo não encontrado. para quem não participa e para id inexistente

**C41** - Marcação HTML no nome, recado ou local aparece como texto (GRP-03, AC 11)
Proof: run api | ✓ ver grupo > devolve o recado com quebras de linha e marcação HTML como texto
Proof: run web | ✓ GroupDetailView > mostra o recado com quebras de linha e marcação HTML como texto

**C42** - O recado mantém as quebras de linha (GRP-03, AC 12)
Proof: run shared | ✓ normalizeGroupInput > mantém as quebras de linha do recado
Proof: run web | ✓ GroupDetailView > mostra o recado com quebras de linha e marcação HTML como texto

**C43** - "Editar grupo" leva a `/grupos/{id}/editar` com o formulário preenchido (GRP-04, AC 1)
Proof: run web | ✓ GroupForm > abre preenchido com os dados atuais do grupo
Proof: run e2e | ✓ grupos › edita o valor para uma faixa e apaga o local

**C44** - Salvar formulário válido de grupo ABERTO ou SORTEADO grava e leva a `/grupos/{id}` (GRP-04, AC 2)
Proof: run api | ✓ editar grupo > grava os campos enviados em grupo ABERTO
Proof: run api | ✓ editar grupo > grava os campos enviados em grupo SORTEADO
Proof: run e2e | ✓ grupos › edita o valor para uma faixa e apaga o local

**C45** - Campo opcional esvaziado é apagado (GRP-04, AC 3)
Proof: run api | ✓ editar grupo > apaga o campo opcional enviado como null
Proof: run shared | ✓ normalizeGroupInput > tira os espaços das pontas e troca texto vazio por null

**C46** - Regras da criação valem na edição: 400 com a mesma mensagem e nada muda (GRP-04, AC 4)
Proof: run api | ✓ editar grupo > recusa com 400 a mesma regra da criação e não altera o grupo

**C47** - Data já gravada que ficou no passado, enviada sem mudar, é aceita (GRP-04, AC 5)
Proof: run shared | ✓ validateGroupInput > aceita data igual à gravada mesmo no passado
Proof: run api | ✓ editar grupo > aceita uma data gravada que ficou no passado quando ela não muda

**C48** - Data alterada para o passado recebe 400 "Escolha uma data no futuro." (GRP-04, AC 6)
Proof: run shared | ✓ validateGroupInput > recusa data alterada para o passado mesmo com data gravada
Proof: run api | ✓ editar grupo > recusa com 400 uma data alterada para o passado

**C49** - Participante que não organiza recebe 403 "Só quem organiza pode alterar o grupo." e nada muda (GRP-04, AC 7)
Proof: run api | ✓ editar grupo > responde 403 ao participante que não organiza e não altera o grupo
Proof: run api | ✓ acesso ao grupo > responde 403 para participante aprovado que não organiza

**C50** - Grupo ENCERRADO recebe 409 "Grupo encerrado não pode ser editado." e nada muda (GRP-04, AC 8)
Proof: run api | ✓ editar grupo > responde 409 em grupo ENCERRADO e não altera o grupo

**C51** - `/grupos/{id}/editar` leva quem não organiza, e o organizador de grupo ENCERRADO, a `/grupos/{id}` (GRP-04, AC 9)
Proof: run web | ✓ editRedirect > leva à página do grupo quem não organiza e o grupo ENCERRADO

**C52** - Durante o envio da edição, "Salvar alterações" fica desabilitado e mostra "Salvando..." (GRP-04, AC 10)
Proof: run web | ✓ GroupForm > desabilita o botão e mostra Salvando... durante o envio, na criação e na edição

**C53** - "Voltar" leva a `/grupos/{id}` sem gravar (GRP-04, AC 11)
Proof: run web | ✓ GroupForm > Voltar leva à página do grupo sem enviar nada

**C54** - "Excluir grupo" abre a confirmação "Excluir o grupo {nome}?" com o texto e os botões "Excluir grupo" e "Manter grupo" (GRP-05, AC 1)
Proof: run web | ✓ GroupActions > abre a confirmação de exclusão com o texto da spec
Proof: run web | ✓ ConfirmDialog > abre com o título, o texto e os dois botões

**C55** - "Manter grupo", Esc ou toque fora fecham a confirmação sem excluir (GRP-05, AC 2)
Proof: run web | ✓ ConfirmDialog > fecha sem confirmar com Manter grupo, Esc e toque fora
Proof: run e2e | ✓ grupos › Manter grupo fecha a confirmação sem excluir

**C56** - Confirmar apaga o grupo e as participações e leva a `/grupos`, sem o grupo (GRP-05, AC 3)
Proof: run api | ✓ excluir grupo > apaga o grupo e as participações
Proof: run web | ✓ GroupActions > exclui e leva a /grupos ao confirmar
Proof: run e2e | ✓ grupos › exclui o grupo depois de confirmar e ele some de Meus grupos

**C57** - O organizador exclui grupo ABERTO, SORTEADO ou ENCERRADO (GRP-05, AC 4)
Proof: run api | ✓ excluir grupo > exclui grupo ABERTO, SORTEADO e ENCERRADO

**C58** - A exclusão enfileira, na transação, um aviso por participante aprovado com o assunto, o texto e o botão "Ver meus grupos" (GRP-05, AC 5)
Proof: run api | ✓ excluir grupo > enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec
Proof: run api | ✓ e-mails de grupo > aviso de exclusão tem o assunto, o texto e o botão Ver meus grupos
Proof: run api | ✓ excluir grupo > desfaz a exclusão e os avisos quando a gravação falha

**C59** - Quem organiza não recebe o aviso de exclusão (GRP-05, AC 6)
Proof: run api | ✓ excluir grupo > não enfileira aviso para quem organiza nem para participação pendente ou recusada

**C60** - Participante que não organiza recebe 403 e nada é excluído (GRP-05, AC 7)
Proof: run api | ✓ excluir grupo > responde 403 ao participante que não organiza e não apaga nada

**C61** - Grupo que não existe mais recebe 404 e nenhum e-mail (GRP-05, AC 8)
Proof: run api | ✓ excluir grupo > responde 404 a grupo que não existe mais e não enfileira e-mail

**C62** - Entrar sem origem leva a `/grupos` (GRP-06, AC 1)
Proof: run api | ✓ confirmação de e-mail > devolve /grupos como destino quando o cadastro não tinha origem
Proof: run web | ✓ safeNext > troca por /grupos um valor ausente
Proof: run e2e | ✓ navegação › entrar sem origem leva a /grupos

**C63** - Origem de fora do site, `/entrar` ou `/cadastro` vira `/grupos` (GRP-06, AC 2)
Proof: run web | ✓ safeNext > troca por /grupos um caminho que começa com //
Proof: run web | ✓ safeNext > troca por /grupos um caminho que começa com /\
Proof: run web | ✓ safeNext > troca por /grupos um endereço com esquema
Proof: run web | ✓ safeNext > troca por /grupos os caminhos /entrar e /cadastro
Proof: run api | ✓ login com Google > troca por /grupos um destino de outro site
Proof: run api | ✓ cadastro > troca por /grupos um destino de outro site

**C64** - O menu do avatar mostra "Meus grupos", "Perfil" e "Sair", nessa ordem (GRP-06, AC 3)
Proof: run web | ✓ UserMenuDropdown > mostra Meus grupos, Perfil e Sair nesta ordem

**C65** - "Meus grupos" no menu leva a `/grupos` (GRP-06, AC 4)
Proof: run e2e | ✓ navegação › menu do avatar mostra Meus grupos, Perfil e Sair e leva a /grupos

**C66** - Logado em `/` vai para `/grupos` (GRP-06, AC 5)
Proof: run e2e | ✓ navegação › logado em / vai para /grupos

**C67** - Sem sessão, `/` continua mostrando a página atual (GRP-06, AC 6)
Proof: run e2e | ✓ navegação › sem sessão / continua mostrando a página atual

**C68** - Sem sessão, as telas de grupo levam a `/entrar` com a origem e voltam depois do login (GRP-06, AC 7)
Proof: run e2e | ✓ grupos › leva a /entrar e volta a /grupos/novo depois do login
Proof: run api | ✓ criar grupo > responde 401 sem sessão

**C69** - Criar emite `group.created` com o `groupId` (GRP-07, AC 1)
Proof: run api | ✓ criar grupo > emite group.created com o groupId e sem dados pessoais

**C70** - Editar emite `group.updated` com o `groupId` e os nomes dos campos que mudaram (GRP-07, AC 2)
Proof: run api | ✓ editar grupo > emite group.updated com os nomes dos campos que mudaram e sem dados pessoais

**C71** - Encerrar emite `group.closed` com `trigger: "manual"` (GRP-07, AC 3)
Proof: run api | ✓ encerrar grupo > emite group.closed com trigger manual e sem dados pessoais

**C72** - Excluir emite `group.deleted` com o `groupId` e o status (GRP-07, AC 4)
Proof: run api | ✓ excluir grupo > emite group.deleted com o groupId, o status e sem dados pessoais

**C73** - Nenhum evento de grupo leva nome, recado, local, nome ou e-mail de pessoa (GRP-07, AC 5)
Proof: run api | ✓ criar grupo > emite group.created com o groupId e sem dados pessoais
Proof: run api | ✓ editar grupo > emite group.updated com os nomes dos campos que mudaram e sem dados pessoais
Proof: run api | ✓ encerrar grupo > emite group.closed com trigger manual e sem dados pessoais
Proof: run api | ✓ excluir grupo > emite group.deleted com o groupId, o status e sem dados pessoais

**C74** - Operação recusada não emite evento (GRP-07, AC 6)
Proof: run api | ✓ criar grupo > não emite group.created quando a criação é recusada
Proof: run api | ✓ editar grupo > não emite group.updated quando nada muda nem quando a edição é recusada

**C75** - As quatro telas de grupo têm zero violações WCAG 2.1 A/AA nos dois temas (GRP-08, AC 1)
Proof: run e2e | ✓ acessibilidade › telas de grupo sem violações WCAG 2.1 A/AA no tema claro
Proof: run e2e | ✓ acessibilidade › telas de grupo sem violações WCAG 2.1 A/AA no tema escuro

**C76** - As quatro telas de grupo não rolam na horizontal em 360 px e 1440 px (GRP-08, AC 2)
Proof: run e2e | ✓ layout › telas de grupo não rolam na horizontal em 360 px e 1440 px

**C77** - A confirmação abre com o foco em "Manter grupo" e o Tab preso nela (GRP-08, AC 3)
Proof: run web | ✓ ConfirmDialog > põe o foco em Manter grupo e prende o Tab

**C78** - "Encerrar grupo" num grupo SORTEADO abre a confirmação "Encerrar o grupo {nome}?" em tom primário, com o texto e os botões "Encerrar grupo" e "Manter grupo" (GRP-09, AC 1)
Proof: run web | ✓ GroupActions > abre a confirmação de encerramento com o texto da spec

**C79** - "Manter grupo", Esc ou toque fora fecham a confirmação de encerramento sem mudar o grupo (GRP-09, AC 2)
Proof: run web | ✓ GroupActions > Manter grupo fecha a confirmação de encerramento sem chamar a API
Proof: run web | ✓ ConfirmDialog > fecha sem confirmar com Manter grupo, Esc e toque fora

**C80** - Confirmar passa o grupo a ENCERRADO, grava a data e hora e a página mostra ENCERRADO (GRP-09, AC 3)
Proof: run api | ✓ encerrar grupo > passa o grupo SORTEADO para ENCERRADO e grava a data do encerramento
Proof: run web | ✓ GroupActions > encerra e atualiza a página ao confirmar

**C81** - Grupo ABERTO ou ENCERRADO recebe 409 "Só um grupo sorteado pode ser encerrado." e nada muda (GRP-09, AC 4)
Proof: run api | ✓ encerrar grupo > responde 409 em grupo ABERTO ou ENCERRADO e não muda o grupo
Proof: run web | ✓ GroupActions > mostra a mensagem da API quando o encerramento recebe 409

**C82** - Participante que não organiza recebe 403 e o grupo não muda (GRP-09, AC 5)
Proof: run api | ✓ encerrar grupo > responde 403 ao participante que não organiza e não muda o grupo

**C83** - O encerramento enfileira, na transação, um aviso por participante aprovado com o assunto, o texto e o botão "Ver grupo" (GRP-09, AC 6)
Proof: run api | ✓ encerrar grupo > enfileira um aviso por participante aprovado com o assunto, o texto e o botão da spec
Proof: run api | ✓ e-mails de grupo > aviso de encerramento tem o assunto, o texto e o botão Ver grupo

**C84** - Quem organiza não recebe o aviso de encerramento (GRP-09, AC 7)
Proof: run api | ✓ encerrar grupo > não enfileira aviso para quem organiza nem para participação pendente ou recusada

**C85** - Duas exclusões simultâneas: uma exclui, a outra recebe 404, avisos enfileirados uma vez (Edge Cases, GRP-05 AC 5 e AC 8)
Proof: run api | ✓ excluir grupo > exclui uma vez e responde 404 ao segundo pedido simultâneo, com os avisos enfileirados uma vez
Proof: run api | ✓ acesso ao grupo > trava a linha do grupo até a transação terminar

**C86** - Dois encerramentos simultâneos: um encerra, o outro recebe 409, avisos enfileirados uma vez (Edge Cases, GRP-09 AC 4 e AC 6)
Proof: run api | ✓ encerrar grupo > encerra uma vez e responde 409 ao segundo pedido simultâneo, com os avisos enfileirados uma vez

**C87** - Edição que chega depois do encerramento recebe 409 (Edge Cases, GRP-04 AC 8)
Proof: run api | ✓ editar grupo > responde 409 à edição que espera o encerramento terminar

**C88** - Edição ou exclusão de grupo já excluído recebe 404 (Edge Cases, GRP-03 AC 10)
Proof: run api | ✓ editar grupo > responde 404 à edição de grupo excluído
Proof: run api | ✓ excluir grupo > responde 404 a grupo que não existe mais e não enfileira e-mail

**C89** - Nome do grupo com marcação HTML aparece como texto nos avisos por e-mail (Edge Cases, GRP-05 AC 5, GRP-09 AC 6)
Proof: run api | ✓ e-mails de grupo > mostram o nome do grupo com marcação HTML como texto

**C90** - Nome com 80 pontos de código, inclusive emojis, é aceito; com 81, ou 80 "❤️" (160 pontos), é recusado (Edge Cases, GRP-01 AC 5)
Proof: run shared | ✓ validateGroupInput > aceita nome com 1 e com 80 pontos de código, inclusive emojis
Proof: run api | ✓ criar grupo > recusa com 400 nome com 80 "❤️", que o banco conta como 160 caracteres

**C91** - Valores 1 e 100.000 são aceitos; 0 e 100.001, recusados (Edge Cases, GRP-01 AC 7)
Proof: run shared | ✓ validateGroupInput > aceita valores 1 e 100000 e recusa 0, 100001 e 50.5

**C92** - A 20ª criação da hora é aceita e a 21ª recebe 429 (Edge Cases, GRP-01 AC 13)
Proof: run api | ✓ criar grupo > recusa com 429 a 21ª criação da hora e aceita a 20ª

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** 2026-11-21, na T1, onde fica cada mensagem que envolve dois campos: "Informe o valor inicial da faixa." no `giftMinValue` - user: "Valor do presente (Recomendado)", entre essa e "Até (R$)"; "O valor inicial não pode passar do valor final." no `giftMinValue` - user: "Valor do presente (Recomendado)", entre essa e "Até (R$)"; "O sorteio previsto precisa ser antes da confraternização." no `drawScheduledAt` - user: "Sorteio previsto (Recomendado)", entre essa e "Confraternização"; quando um campo viola duas regras, vale a do próprio campo, e as regras entre dois campos só rodam quando os dois valores são válidos sozinhos - user: "A regra do próprio campo (Recomendado)", entre essa e "A regra entre os campos". Contagem inicial: a API da `main` (`29ff5a5`) tem 285 testes, não 282 (a T3 fechou com 290); as metas de contagem da API nas tasks seguintes ficam 3 acima do escrito. 2026-11-21, na T9, formato do corpo de `POST`/`PUT /groups`: valor não inteiro (50.5) passa pelo DTO (`@IsNumber`) e volta 400 com a mensagem do campo, em vez do "inteiros" do design - user: "DTO aceita número (Recomendado)", entre essa e "DTO exige inteiro"; campo opcional ausente vale `null` e booleano ausente vale `false`, no `POST` e no `PUT` - user: "Ausente vale null/false (Recomendado)", entre essa e "Todos os campos obrigatórios"; data sem fuso (Z ou ±hh:mm) é 400 genérico do `ValidationPipe` - user: "Exige fuso (Recomendado)", entre essa e "Aceita sem fuso". 2026-11-21, na T15, as rotas da conta não têm decorators do Swagger e o build com SWC não roda o plugin, então não há "padrão das rotas da conta" a seguir: as rotas de grupo levam decorators manuais (`@ApiTags`, respostas com descrição em português, `@ApiProperty` no `GroupInputDto`) - user: "Decorators manuais (Recomendado)", entre essa, "Plugin do Swagger no SWC" e "Pular o T15". 2026-11-21, na T18, valor do presente a partir de mil reais leva ponto de milhar (`R$ 1.500`, `R$ 1.000 a R$ 2.500`), como na mensagem "R$ 100.000"; GRP-03 AC 3 e a C33 ganham o caso, com o teste `formatGiftValue > mostra R$ 1.500 com ponto de milhar` - user: "Com ponto (Recomendado)", entre essa, "Sem separador" e "Com ponto, sem teste novo". As metas de contagem do web da T18 em diante ficam 1 acima do escrito. 2026-11-21, na T19, o CLI do shadcn não gera o `dialog` (o item `base-vega/dialog` do registro declara a dependência npm `cn` e o CLI roda `pnpm add cn`): o `components/ui/dialog.tsx` é copiado do registro com as trocas que o CLI faz (`cn` de `@/lib/utils`, `Button` de `@/components/ui/button`, ícone do `lucide-react`), sem pacote novo e sem tocar no `button.tsx`; o mesmo vale para o `textarea` na T22 - user: "Copiar do registro (Recomendado)", entre essa, "Escrever sobre o Base UI direto" e "Parar e esperar". 2026-11-21, na T22, decisões do `GroupForm`: com o "Até (R$)" vazio, a mensagem do máximo que o shared copia do mínimo não aparece, nem na validação do site nem num 400 da API; com o "Até" preenchido, cada campo mostra a sua - user: "Só no Valor do presente (Recomendado)", entre essa e "Nos dois campos"; o botão mostra "Salvando…" com o caractere de reticências, como o perfil e o cadastro, e a GRP-01 AC 16 e a GRP-04 AC 10 passam a escrever "Salvando…" (os nomes dos testes ficam) - user: "Salvando… (Recomendado)", entre essa e "Salvando... (três pontos)"; 403 e 409 mostram a mensagem da API no `Alert`, e 404, 400 sem `fields`, 5xx e rede mostram "Não foi possível salvar. Tente de novo." - user: "Mensagem da API no 403 e 409 (Recomendado)", entre essa e "Tudo genérico"; padrões: valor e "Até" lado a lado e as duas datas lado a lado a partir de 640 px, empilhados no celular; valores com `inputMode` numérico; erros por campo só depois do primeiro envio, sumindo ao corrigir; botão principal "Criar grupo" ou "Salvar alterações" e, na edição, "Voltar" como link outline para `/grupos/{id}`; ao salvar, `router.push('/grupos/{id}')`; o form recebe o `GroupDetail` na edição e converte as datas com `isoToBrasiliaInput` - user: "Confirmo todos (Recomendado)", entre essa e "Quero ajustar". A T22 ganha o teste `GroupForm > mostra a mensagem da API num 403 e num 409`, da decisão acima; as metas de contagem do web da T22 em diante ficam 2 acima do escrito. 2026-11-21, na T23, decisões do `GroupActions`: a confirmação fecha e um `Alert` abaixo dos botões mostra a mensagem da API no 403 e no 409; 404 na exclusão (grupo já excluído) leva a `/grupos`; 404 no encerramento, 5xx e rede mostram "Não foi possível concluir. Tente de novo." - user: "Igual ao formulário (Recomendado)", entre essa e "Tudo genérico exceto o 409"; durante o pedido o botão de confirmar fica desabilitado e mostra "Excluindo…" ou "Encerrando…", pelo `ConfirmDialog` (prop `pendingLabel`) - user: "Desabilita e mostra …ndo (Recomendado)", entre essa e "Só desabilita"; "Editar grupo" é link outline para `/grupos/{id}/editar`, "Encerrar grupo" outline e "Excluir grupo" destructive, nessa ordem, quebrando linha no celular - user: "Editar outline, Encerrar outline, Excluir destrutivo (Recomendado)", entre essa e "Editar primário". A T23 ganha os testes `GroupActions > desabilita o botão e mostra Excluindo… e Encerrando… durante o pedido`, `> leva a /grupos quando o grupo já foi excluído` e `> mostra Não foi possível concluir. Tente de novo. num erro inesperado`; a meta de contagem da T23 passa a 79. 2026-11-22, na T24, decisões de Meus grupos: "Criar grupo" no topo, ao lado do título a partir de 640 px e com largura toda abaixo dele no celular; no estado vazio o do topo some e fica só o do vazio - user: "Topo; no vazio só o do vazio (Recomendado)", entre essa, "Topo sempre" e "Fim da lista"; cards em 1 coluna e 2 a partir de 640 px, conteúdo em max-w-3xl - user: "1 coluna, 2 a partir de 640 px (Recomendado)", entre essa, "Sempre 1 coluna" e "Até 3 colunas"; na falha da API, Alert destructive com ícone e "Não foi possível carregar seus grupos.", o botão outline "Tentar de novo" abaixo e o "Criar grupo" do topo visível - user: "Alert com Tentar de novo (Recomendado)", entre essa e "Alert, sem Criar grupo"; padrões: h1 "Meus grupos" e aba "Meus grupos · Amigo Secreto", seções com h2 "Ativos" e "Encerrados", "Nenhum grupo ativo." e o texto do vazio em texto comum na cor muted, `MyGroupsView` recebe o `MyGroupsResponse` ou `null` (erro) e "Tentar de novo" chama `router.refresh()` - user: "Confirmo todos (Recomendado)", entre essa e "Quero ajustar". 2026-11-22, na T25, decisões da página do grupo: h1 com o nome e o StatusTag ao lado, "Organizado por {nome}" em muted, o recado num parágrafo com as quebras de linha e uma lista de rótulo e valor com ícone (Valor do presente, Sorteio previsto, Confraternização, Local), conteúdo em max-w-2xl - user: "Cabeçalho + recado + lista (Recomendado)", entre essa e "Tudo num card"; "Evento online" como tag neutra no item Local, e com o evento online e sem local o item Local aparece só com a tag; "Entrada com aprovação" como tag neutra ao lado do StatusTag, só para quem organiza - user: "Tags neutras (Recomendado)", entre essa e "Texto comum"; o `GroupActions` fica abaixo dos dados - user: "Abaixo dos dados (Recomendado)", entre essa e "Abaixo do cabeçalho"; padrões: aba "{nome do grupo} · Amigo Secreto" com `generateMetadata` e o `getGroup` no `cache` do React; a not-found com h1 "Grupo não encontrado.", aba "Grupo não encontrado · Amigo Secreto" e o link "Meus grupos" como botão outline para `/grupos`; datas como "20/12/2026 às 19:00"; a view recebe o `GroupDetail` e só mostra o `GroupActions` quando `isOrganizer` - user: "Confirmo todos (Recomendado)", entre essa, "Aba fixa Grupo" e "Quero ajustar".
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15
Phase 3:  T16 → T17 → T18 → T19 → T20 → T21 → T22 → T23
Phase 4:  T24 → T25 → T26 → T27 → T28 → T29 → T30 → T31 → T32
```

Execução inline, uma fase por vez, cada fase num PR contra a `main` (AD-010); sem sub-agentes de lote. Ao fim da fase 4: `check_proofs.py`, walk das histórias, Verifier e screens sub-agent (só se houver captura), correções, `validate_verification.py` e lições, antes do push.
