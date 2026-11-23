# Invites Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/05-invites/design.md`
**Status**: Approved
**Approved**: 2026-11-23 - user: "Aprovado." (com a criação da milestone e das issues no Linear, sem começar a execução)
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run shared**: `pnpm turbo run test --force --filter=@amigo-secreto/shared -- --reporter=verbose`
**Run api**: `pnpm turbo run test --force --filter=@amigo-secreto/api -- --reporter=verbose`
**Run web**: `pnpm turbo run test --force --filter=@amigo-secreto/web -- --reporter=verbose`
**Run e2e**: `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web`

Linhas esperadas das provas: o nome de cada teste é o que a check escreve; a task que cria o teste usa exatamente esse texto em `describe`/`it` (o Vitest separa com `>`, o reporter `list` do Playwright com `›`). Contagens de teste partem da `main` em 2026-11-23 (`ff6ca3a`), pelas provas da `04-groups`: 19 no shared, 368 na API, 95 unitários no web e 79 no e2e; a primeira execução confere, e um desvio só de contagem inicial é registrado em `**Settled mid-build:**`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `.claude/rules/nest-api-coding-standards.md` e `.claude/rules/next-web-coding-standards.md` (nomes de `describe`/`it` em português; sem metas de cobertura), os testes da `04-groups` (`packages/shared/src/**/*.spec.ts`, `apps/api/src/**/*.spec.ts`, `apps/api/test/**/*.int-spec.ts`, `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/e2e/**/*.spec.ts`), lições L-005, L-012, L-018 e L-020; strong defaults aplicados à profundidade.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Shared: regra da lista de e-mails | unit (Vitest) | Todos os ramos; 1:1 com os critérios; bordas 20/21 (L-012) e uma condição por vez (L-005) | `packages/shared/src/**/*.spec.ts` | `pnpm --filter @amigo-secreto/shared test` |
| Shared: tipos de resposta | none | Build gate | - | Build gate |
| API: funções puras (código, robôs, e-mails, exceção do limite) | unit | Todos os ramos; 1:1 com os critérios | `apps/api/src/**/*.spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project unit` |
| API: migrations, rotas, limites, avisos, eventos | integration (Testcontainers) | Toda rota e critério da task: sucesso + bordas + falhas + 401/403/404/409/429; concorrência com conexões reais; estado lido depois de cada recusa (L-018) | `apps/api/test/**/*.int-spec.ts` | `pnpm turbo run test --filter=@amigo-secreto/api -- --project integration` |
| API: módulos, DTOs, entidades sem regra | none | Build gate | - | Build gate |
| Web: funções de `lib/` e componentes com lógica | unit (Vitest + Testing Library) | Todos os ramos; 1:1 com os critérios | `apps/web/src/**/*.test.{ts,tsx}` | `pnpm --filter @amigo-secreto/web test` |
| Web: páginas e fluxos | e2e (Playwright contra a API em produção, Postgres descartável, Resend e Google falsos) | Todo critério de tela alcançável sem banco: caminho feliz + erro + sem sessão; os estados que só existem com grupo SORTEADO ou ENCERRADO ficam nos testes de componente e de integração (como na `04-groups`); um elemento comum a várias telas é provado em cada tela (L-020) | `apps/web/e2e/**/*.spec.ts` | `pnpm test:e2e` |
| Web: componentes do shadcn (`components/ui/`) e o arquivo da fonte | none | Build gate | - | Build gate |

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

O gate Full roda também o typecheck do web porque as tasks T3 e T14 ampliam tipos do shared que os testes do web constroem.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Ao fim de cada fase roda o gate Build; cada fase vira um PR (AD-010). Na fase 6, o fechamento da feature roda antes do PR.

### Phase 1: Regras compartilhadas e banco

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 2: API do convite

```
T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 3: API dos participantes

```
T15 → T16 → T17 → T18 → T19
```

### Phase 4: Base do site e bloco de convite

```
T20 → T21 → T22 → T23 → T24
```

### Phase 5: Participantes e navegação no site

```
T25 → T26 → T27 → T28 → T29 → T30
```

### Phase 6: Telas

```
T31 → T32 → T33 → T34 → T35 → T36 → T37
```

---

## Task Breakdown

### Phase 1: Regras compartilhadas e banco

#### T1: Criar as regras da lista de e-mails e os tipos do convite no shared

**What**: `packages/shared/src/invites.ts` com `isEmailAddress`, `parseInviteEmails`, `validateInviteEmails`, `INVITE_MESSAGES`, `MembershipStatus` e os tipos `InviteViewer`, `InviteView`, `JoinResult`, `MemberItem`, `MembersPage` e `InviteEmailsResult`, exportados no `index.ts`.
**Where**: `packages/shared/src/invites.ts`
**Depends on**: None
**Reuses**: regra de `apps/web/src/lib/email.ts`; padrão de `validateGroupInput`
**Requirement**: INV-11

**Done when**:

- [x] Testes em `src/invites.spec.ts` (imports explícitos de `vitest`): `parseInviteEmails > separa por vírgula, ponto e vírgula, espaço e quebra de linha`, `> conta uma vez os repetidos sem diferenciar maiúsculas`, `> descarta separadores repetidos e pontas vazias`; `validateInviteEmails > recusa o campo vazio com Informe pelo menos um e-mail.`, `> lista os endereços inválidos em Confira estes e-mails:`, `> aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails por vez.`, `> conta 20 distintos quando há repetidos além deles`; `isEmailAddress > aceita endereço comum e recusa sem arroba, sem ponto no domínio, com espaço ou com mais de 254 caracteres`
- [x] Mensagens iguais às da spec (INV-11 AC 3 a 5)
- [x] Gate check passes: `pnpm --filter @amigo-secreto/shared lint && pnpm --filter @amigo-secreto/shared typecheck && pnpm --filter @amigo-secreto/shared test`
- [x] Test count: 27 tests pass no shared

**Tests**: unit
**Gate**: Shared

**Commit**: `feat(shared): add invite email rules and invite types`

---

#### T2: Gerar e reconhecer o código do convite

**What**: `invite-code.ts` com `INVITE_CODE_ALPHABET`, `generateInviteCode()` (10 caracteres com `crypto.randomInt`) e `normalizeInviteCode(raw)` (minúsculas; `null` fora do formato).
**Where**: `apps/api/src/invites/invite-code.ts`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: INV-01, INV-02

**Done when**:

- [x] Testes em `src/invites/invite-code.spec.ts`: `código do convite > gera 10 caracteres do alfabeto sem 0, 1, i, l e o`, `> gera códigos diferentes em 1000 chamadas`, `> normaliza maiúsculas para minúsculas`, `> recusa código com tamanho ou caractere fora do alfabeto`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [x] Test count: 372 tests pass na API

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(api): generate and normalize invite codes`

---

#### T3: Dar um código de convite a cada grupo

**What**: Coluna `Group.inviteCode` (`varchar(10)`, única, não nula); migration `AddGroupInviteCode` (coluna nula, preenchimento em TypeScript com `generateInviteCode`, `NOT NULL`, índice único); `GroupsService.create` gera o código e gera outro uma vez na violação da restrição única; `GroupDetail.inviteCode` no shared e na resposta; `insertGroup` dos testes grava um código; fixtures de `GroupDetail` dos testes do web ganham `inviteCode`.
**Where**: `apps/api/src/database/migrations/<timestamp>-AddGroupInviteCode.ts`
**Depends on**: T2
**Reuses**: `CreateGroupTable`, `test/migrations.ts`, `test/group-helpers.ts`
**Requirement**: INV-01

**Done when**:

- [x] Testes em `test/group-invite-code.int-spec.ts`: `código do convite do grupo > grupo criado pela API ganha um código de 10 caracteres do alfabeto`, `> a migration dá um código a cada grupo que já existia`, `> o banco recusa dois grupos com o mesmo código`, `> o banco recusa grupo sem código`, `> devolve o código na leitura do grupo a participante aprovado`, `> gera outro código quando o primeiro já existe`
- [x] As suítes da `04-groups` passam sem mudança de asserção (exceto o `inviteCode` acrescentado em três asserções, aprovado em `**Settled mid-build:**`)
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 378 tests pass na API e 95 no web

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): give each group an invite code`

---

#### T4: Criar a tabela de convites por e-mail

**What**: Entidade `EmailInvite` (`email_invite`: `id`, `groupId` com `ON DELETE CASCADE`, `email` `varchar(254)`, `createdAt`; índice `(groupId, createdAt)`), `InvitesModule` com `TypeOrmModule.forFeature([EmailInvite])` importado no `AppModule`, e migration `CreateEmailInviteTable` gerada por `migration:generate`.
**Where**: `apps/api/src/invites/email-invite.entity.ts`
**Depends on**: T3
**Reuses**: `membership.entity.ts`, `CreateMembershipTable`
**Requirement**: INV-11

**Done when**:

- [x] Testes em `test/email-invite-table.int-spec.ts`: `tabela email_invite > grava grupo, e-mail e data do envio`, `> apaga os envios junto com o grupo`
- [x] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [x] Test count: 380 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): add the email invite table`

---

#### T5: Habilitar o unaccent no banco

**What**: Migration `EnableUnaccent` com `CREATE EXTENSION IF NOT EXISTS unaccent` (e `DROP EXTENSION` no `down`).
**Where**: `apps/api/src/database/migrations/<timestamp>-EnableUnaccent.ts`
**Depends on**: T4
**Reuses**: `test/migrations.ts`
**Requirement**: INV-05

**Done when**:

- [ ] Testes em `test/unaccent.int-spec.ts`: `extensão unaccent > a migration habilita o unaccent e lower(unaccent('João Ávila')) vira joao avila`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 381 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): enable the unaccent extension`

---

#### T6: Reconhecer os robôs de preview

**What**: `preview-bots.ts` com `isPreviewBot(userAgent)` para WhatsApp, facebookexternalhit, Facebot, TelegramBot, Slackbot, Twitterbot, Discordbot e LinkedInBot.
**Where**: `apps/api/src/invites/preview-bots.ts`
**Depends on**: T5
**Reuses**: nenhum
**Requirement**: INV-02, INV-13

**Done when**:

- [ ] Testes em `src/invites/preview-bots.spec.ts`: `robôs de preview > reconhece WhatsApp, facebookexternalhit, Facebot, TelegramBot, Slackbot, Twitterbot, Discordbot e LinkedInBot`, `> não reconhece navegadores comuns nem User-Agent ausente`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [ ] Test count: 383 tests pass na API

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(api): recognize link preview bots`

---

#### T7: Montar os e-mails do convite e dos participantes

**What**: `invite-emails.ts` com os 8 e-mails do INV-12 (`emailInviteEmail`, `joinRequestEmail`, `memberJoinedEmail`, `approvedEmail`, `rejectedEmail`, `removedEmail`, `memberLeftEmail`, `ownershipEmail`): assunto, saudação ("Olá, {nome}."; "Olá." no convite por e-mail), texto e botão da spec.
**Where**: `apps/api/src/invites/invite-emails.ts`
**Depends on**: T6
**Reuses**: `email/email-blocks.ts`, `groups/group-emails.ts`
**Requirement**: INV-12

**Done when**:

- [ ] Testes em `src/invites/invite-emails.spec.ts`: `e-mails do convite > convite por e-mail tem o assunto, o texto e o botão Ver convite para /convite/{código}`, `> pedido de entrada tem o assunto, o texto e o botão Ver pedidos`, `> entrada sem aprovação tem o assunto, o texto e o botão Ver participantes`, `> entrada aprovada tem o assunto, o texto e o botão Ver grupo`, `> entrada recusada tem o assunto, o texto e o botão Ver meus grupos`, `> remoção tem o assunto, o texto e o botão Ver meus grupos`, `> saída tem o assunto, o texto e o botão Ver participantes`, `> nova organização tem o assunto, o texto e o botão Ver grupo`, `> mostram nomes de pessoa e de grupo com marcação HTML como texto`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [ ] Test count: 392 tests pass na API

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(api): add invite and membership emails`

---

#### T8: Criar a recusa do limite de convites por e-mail

**What**: `EmailInviteLimitException` (429, mensagem com "N horas", "1 hora" ou "N minutos" e `retryAfterSeconds`), reconhecida pelo `AllExceptionsFilter` para gravar o `Retry-After`.
**Where**: `apps/api/src/invites/email-invite-limit.exception.ts`
**Depends on**: T7
**Reuses**: `rate-limit/too-many-attempts.exception.ts`
**Requirement**: INV-11

**Done when**:

- [ ] Testes em `src/invites/email-invite-limit.exception.spec.ts`: `limite de convites por e-mail > diz em N horas acima de uma hora`, `> diz em 1 hora com exatamente uma hora`, `> diz em N minutos abaixo de uma hora`, `> grava o Retry-After em segundos`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm turbo run test --filter=@amigo-secreto/api -- --project unit`
- [ ] Test count: 396 tests pass na API

**Tests**: unit
**Gate**: Quick

**Commit**: `feat(api): add the email invite limit error`

---

### Phase 2: API do convite

#### T9: Abrir o convite pela API

**What**: `InvitesController` com `GET /invites/:code` (`@Public()`) e `InvitesService.view`: limite por IP antes de procurar o código (`invites.view:ip`, 60 por minuto; robô de preview em `invites.view_bot:ip`, 600 por minuto), `normalizeInviteCode`, 404 "Convite não encontrado.", `InviteView` com o estado de quem abre, `invite.viewed` depois da leitura (não para robôs); `@CurrentUser()` com o comentário de que falta em rota `@Public()`; decorators do Swagger como no `GroupsController`.
**Where**: `apps/api/src/invites/invites.service.ts`
**Depends on**: T8
**Reuses**: `RateLimitService`, `BusinessEventsService`, `isPreviewBot`, `test/group-helpers.ts`
**Requirement**: INV-02, INV-13

**Done when**:

- [ ] Testes em `test/invites-view.int-spec.ts`: `abrir convite > sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de aprovação`, `> pessoa logada sem participação vê viewer none e a exigência de aprovação`, `> participante aprovado recebe viewer member e o groupId`, `> pessoa pendente recebe viewer pending`, `> pessoa recusada recebe viewer rejected`, `> devolve o status SORTEADO e ENCERRADO do grupo`, `> responde 404 Convite não encontrado. a código inexistente, trocado ou com formato errado, com o mesmo corpo`, `> aceita o código em maiúsculas`, `> responde 429 ao 61º convite do minuto do mesmo IP e aceita o 60º`, `> responde 429 ao 601º convite do minuto de um robô de preview e aceita o 600º`, `> acima do limite responde 429 a código existente e inexistente`, `> separa o limite pelo IP do X-Forwarded-For`, `> emite invite.viewed com o groupId e sem código, nome ou id de pessoa`, `> não emite invite.viewed para robô de preview`, `> não emite invite.viewed para código inválido nem acima do limite`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 411 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): open group invites`

---

#### T10: Entrar no grupo pelo convite

**What**: `POST /invites/:code/join` e `InvitesService.join` como no diagrama do design: limite por IP de abrir antes de procurar o código, grupo travado pelo código, 404/409, estado atual a quem já participa, limite de 30 entradas por hora consumido dentro da transação, participação `APPROVED` ou `PENDING`, aviso a quem organiza na transação, `membership.joined` ou `membership.requested` depois do commit.
**Where**: `apps/api/src/invites/invites.service.ts`
**Depends on**: T9
**Reuses**: `invite-emails.ts`, `EmailService.enqueueMany`, `RateLimitService`
**Requirement**: INV-02, INV-03, INV-12, INV-13

**Done when**:

- [ ] Testes em `test/invites-join.int-spec.ts`: `entrar pelo convite > em grupo sem aprovação cria participação aprovada e devolve o groupId`, `> em grupo com aprovação cria participação pendente sem groupId`, `> aceita conta com e-mail não confirmado`, `> devolve o estado atual a quem já é aprovado, pendente ou recusado, sem gravar nem avisar`, `> responde 409 em grupo SORTEADO e ENCERRADO sem criar participação`, `> responde 404 Convite não encontrado. a código inexistente ou trocado sem criar participação`, `> responde 429 à 31ª entrada da hora da mesma conta e aceita a 30ª`, `> não conta no limite da conta a entrada em que a pessoa já participava`, `> conta no limite por IP de abrir convite e responde 429 antes de procurar o código`, `> enfileira na mesma transação o aviso de pedido a quem organiza`, `> enfileira na mesma transação o aviso de entrada a quem organiza`, `> não enfileira aviso quando a entrada é recusada`, `> emite membership.requested e membership.joined sem dados pessoais`, `> não emite evento quando a entrada é recusada`, `> duas entradas simultâneas da mesma pessoa criam uma participação e um aviso`, `> entrada simultânea à mudança para SORTEADO cria antes ou responde 409`, `> responde 401 sem sessão`
- [ ] Cada recusa confere logo depois que nenhuma participação nem job foi gravado (L-018)
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 428 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): join groups through invites`

---

#### T11: Gerar um novo link pela API

**What**: `GroupMembersController` com `POST /groups/:id/invite/regenerate` e `InvitesService.regenerate`: `requireOrganizer` com trava, 409 fora de ABERTO, limite `invites.regenerate:group` de 10 por hora depois de 404/403/409 (`rateLimitKey` ganha o tipo `group`), código novo, `invite.regenerated` depois do commit.
**Where**: `apps/api/src/invites/group-members.controller.ts`
**Depends on**: T10
**Reuses**: `GroupAccess`, `generateInviteCode`, `RateLimitService`
**Requirement**: INV-10, INV-13

**Done when**:

- [ ] Testes em `test/invites-regenerate.int-spec.ts`: `gerar novo link > troca o código do grupo e devolve o novo`, `> o código antigo passa a responder 404 ao abrir e ao entrar`, `> mantém todas as participações do grupo`, `> responde 409 com o grupo SORTEADO ou ENCERRADO e mantém o código`, `> responde 403 a participante que não organiza e mantém o código`, `> responde 404 a quem não participa`, `> responde 429 à 11ª troca da hora do grupo e aceita a 10ª`, `> emite invite.regenerated sem o código`, `> não emite invite.regenerated quando a troca é recusada`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 437 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): regenerate the invite link`

---

#### T12: Convidar por e-mail pela API

**What**: `POST /groups/:id/invite/emails` com `{ emails: string }` e `InvitesService.sendEmails`: `requireOrganizer` com trava, 409 fora de ABERTO, `validateInviteEmails` mais o `isEmail` da API (400 com `fields.emails`), contagem dos `email_invite` das últimas 24 horas (`EmailInviteLimitException`), gravação dos envios e um e-mail por endereço na transação, `invite.emails_sent` com `count` depois do commit.
**Where**: `apps/api/src/invites/invites.service.ts`
**Depends on**: T11
**Reuses**: `GroupValidationException`, `EmailInviteLimitException`, `emailInviteEmail`
**Requirement**: INV-11, INV-12, INV-13

**Done when**:

- [ ] Testes em `test/invites-emails.int-spec.ts`: `convidar por e-mail > enfileira um convite por endereço distinto com o link do grupo e grava cada envio`, `> devolve a quantidade de e-mails enviados`, `> recusa com 400 e a lista dos inválidos sem enviar nenhum`, `> recusa com 400 endereço que o isEmail da API recusa`, `> aceita 20 endereços distintos e recusa 21 sem enviar nenhum`, `> recusa com 400 o campo vazio`, `> aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, sem enviar nenhum`, `> volta a aceitar quando o envio mais antigo sai da janela de 24 horas`, `> responde 409 com o grupo SORTEADO ou ENCERRADO sem enviar`, `> responde 403 a participante que não organiza sem enviar`, `> envia também para quem já participa`, `> emite invite.emails_sent com count e sem e-mails`, `> não emite invite.emails_sent quando o envio é recusado`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 450 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): invite people by email`

---

#### T13: Aprovar os pendentes ao desligar a aprovação

**What**: `GroupsService.update`: com `requiresApproval` de `true` para `false`, aprova os `PENDING` do grupo na mesma transação, enfileira `approvedEmail` para cada pessoa e emite `membership.approved` (`trigger: auto`) por participação depois do commit.
**Where**: `apps/api/src/groups/groups.service.ts`
**Depends on**: T12
**Reuses**: `approvedEmail`, `EmailService.enqueueMany`
**Requirement**: INV-04, INV-12, INV-13

**Done when**:

- [ ] Testes em `test/groups-update-approval.int-spec.ts`: `desligar a aprovação > aprova na mesma transação os pendentes do grupo`, `> não muda recusados nem participações de outros grupos`, `> enfileira o aviso de entrada aprovada a cada pessoa aprovada`, `> emite membership.approved com trigger auto para cada participação`, `> não aprova nada quando a edição é recusada`
- [ ] `test/groups-update.int-spec.ts` passa sem mudança
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 455 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): approve pending requests when approval is turned off`

---

#### T14: Mostrar os pedidos em Meus grupos pela API

**What**: `GroupsService.listMine` com participações `APPROVED` e `PENDING` (`REJECTED` fora), `membershipStatus`, `organizerName` e `pendingCount` (só para quem organiza, `null` para os outros) em `GroupSummary`; pendentes em `active`; fixtures de `GroupSummary` dos testes do web ganham os campos.
**Where**: `apps/api/src/groups/groups.service.ts`
**Depends on**: T13
**Reuses**: `MY_GROUPS_SQL`
**Requirement**: INV-06

**Done when**:

- [ ] Testes em `test/groups-list-pending.int-spec.ts`: `meus grupos com pedidos > mostra em Ativos o grupo com pedido pendente, com organizerName e membershipStatus PENDING`, `> não mostra grupos em que a pessoa foi recusada ou removida`, `> devolve a quem organiza a contagem de pendentes e null aos outros`, `> não conta pendentes na contagem de participantes`, `> pessoa pendente recebe 404 Grupo não encontrado. ao abrir o grupo`
- [ ] `test/groups-list.int-spec.ts` passa sem mudança de asserção
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 460 tests pass na API e 95 no web

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): list pending join requests in my groups`

---

### Phase 3: API dos participantes

#### T15: Listar os participantes pela API

**What**: `GET /groups/:id/members?search=&cursor=` e `MembersService.list`: `requireMember`; quem organiza recebe pendentes, aprovados e recusados, os outros só aprovados; ordem `(rank, lower(unaccent(nome)), membership.id)`; cursor base64url do trio, 21 lidos para saber se há próxima; busca com `%`, `_` e `\` escapados; `approvedCount` sem a busca; sem e-mail; cursor inválido 400.
**Where**: `apps/api/src/invites/members.service.ts`
**Depends on**: T14
**Reuses**: `GroupAccess`, `test/group-helpers.ts`
**Requirement**: INV-04, INV-05, INV-06

**Done when**:

- [ ] Testes em `test/members-list.int-spec.ts`: `lista de participantes > participante aprovado recebe só os aprovados em ordem alfabética, com avatar e Organiza`, `> quem organiza recebe pendentes, aprovados por nome e recusados por último`, `> traz 20 por vez e o cursor leva aos seguintes sem pular nem repetir`, `> com 20 visíveis não devolve cursor e com 21 devolve`, `> aprovar alguém com a lista aberta não pula nem repete ninguém na página seguinte`, `> busca pelo nome sem diferenciar maiúsculas nem acentos, na mesma ordem e paginação`, `> trata % e _ da busca como texto`, `> devolve lista vazia quando a busca não encontra ninguém`, `> não devolve o e-mail de ninguém`, `> devolve o total de aprovados sem a busca`, `> responde 404 Grupo não encontrado. a quem não participa, a pendente e a id inexistente`, `> não mostra pendentes nem recusados a quem não organiza`, `> responde 400 a cursor inválido`, `> ordena nomes com acento junto dos sem acento`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 474 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): list group members`

---

#### T16: Aprovar e recusar pedidos pela API

**What**: `POST /groups/:id/members/:membershipId/approve` e `/reject` com `MembersService.approve` e `reject`: `requireOrganizer` com trava, 409 fora de ABERTO, 404 "Participante não encontrado." (inclusive `membershipId` que não é UUID), estado atual sem aviso quando já está no estado pedido, aviso na transação, `membership.approved` (`trigger: manual`) ou `membership.rejected` depois do commit.
**Where**: `apps/api/src/invites/members.service.ts`
**Depends on**: T15
**Reuses**: `approvedEmail`, `rejectedEmail`
**Requirement**: INV-04, INV-12, INV-13

**Done when**:

- [ ] Testes em `test/members-approve-reject.int-spec.ts`: `aprovar e recusar > aprovar passa o pendente para aprovado`, `> recusar passa o pendente para recusado`, `> aprovar um recusado com o grupo ABERTO passa para aprovado`, `> responde 409 com o grupo SORTEADO ou ENCERRADO sem mudar a participação`, `> responde 403 a participante que não organiza sem mudar a participação`, `> responde 404 Participante não encontrado. a participação inexistente ou de outro grupo`, `> devolve o estado atual sem novo aviso quando a participação já está no estado pedido`, `> enfileira o aviso de entrada aprovada e de entrada recusada`, `> emite membership.approved com trigger manual e membership.rejected`, `> não emite evento nem aviso quando a ação é recusada`, `> aprovar e recusar ao mesmo tempo aplica o primeiro e envia só o aviso dele`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 485 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): approve and reject join requests`

---

#### T17: Remover participante pela API

**What**: `DELETE /groups/:id/members/:membershipId` (204) com `MembersService.remove`: `requireOrganizer` com trava, 409 fora de ABERTO, 409 "Quem organiza não pode ser removido.", 404 a participação que não é aprovada, participação vira `REJECTED`, `removedEmail` na transação, `membership.removed` depois do commit.
**Where**: `apps/api/src/invites/members.service.ts`
**Depends on**: T16
**Reuses**: `removedEmail`
**Requirement**: INV-07, INV-02, INV-12, INV-13

**Done when**:

- [ ] Testes em `test/members-remove.int-spec.ts`: `remover participante > passa a participação para recusada e tira a pessoa dos aprovados`, `> a pessoa removida abre o convite como recusada e não entra de novo`, `> responde 409 com o grupo SORTEADO ou ENCERRADO sem remover`, `> responde 409 Quem organiza não pode ser removido.`, `> responde 403 a participante que não organiza sem remover`, `> responde 404 a participação que não está aprovada`, `> enfileira o aviso de remoção à pessoa`, `> emite membership.removed sem dados pessoais`, `> não emite evento nem aviso quando a remoção é recusada`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 494 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): remove group members`

---

#### T18: Sair do grupo pela API

**What**: `POST /groups/:id/leave` (204) com `MembersService.leave`: `requireMember` com trava, 409 "Transfira a organização antes de sair do grupo." a quem organiza, 409 fora de ABERTO, participação apagada, `memberLeftEmail` a quem organiza na transação, `membership.left` depois do commit.
**Where**: `apps/api/src/invites/members.service.ts`
**Depends on**: T17
**Reuses**: `memberLeftEmail`
**Requirement**: INV-08, INV-12, INV-13

**Done when**:

- [ ] Testes em `test/members-leave.int-spec.ts`: `sair do grupo > apaga a participação e o grupo some de Meus grupos`, `> quem saiu abre o convite como quem nunca participou e pode entrar de novo`, `> responde 409 com o grupo SORTEADO ou ENCERRADO e mantém a participação`, `> responde 409 Transfira a organização antes de sair do grupo. a quem organiza`, `> responde 404 a quem não participa`, `> enfileira o aviso de saída a quem organiza`, `> emite membership.left sem dados pessoais`, `> não emite evento nem aviso quando a saída é recusada`, `> sair enquanto quem organiza remove aplica o primeiro e o segundo responde 404 ou o estado atual`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 503 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): leave groups`

---

#### T19: Transferir a organização pela API

**What**: `POST /groups/:id/transfer` com `{ membershipId }` e `MembersService.transfer`: `requireOrganizer` com trava, 409 "Grupo encerrado não pode ser alterado.", 404 "Participante não encontrado." a quem não é aprovado ou já organiza, troca de `group.ownerId`, `ownershipEmail` a quem recebe na transação, `group.ownership_transferred` depois do commit; responde o `GroupDetail` visto por quem transferiu.
**Where**: `apps/api/src/invites/members.service.ts`
**Depends on**: T18
**Reuses**: `ownershipEmail`, `toGroupDetail`
**Requirement**: INV-09, INV-12, INV-13

**Done when**:

- [ ] Testes em `test/members-transfer.int-spec.ts`: `transferir organização > faz da pessoa escolhida quem organiza e mantém a antiga como participante aprovada`, `> transfere com o grupo SORTEADO`, `> responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO`, `> responde 404 Participante não encontrado. a pendente, recusado, de outro grupo ou a quem já organiza`, `> responde 403 a quem não organiza`, `> depois da transferência o antigo organizador recebe 403 ao editar`, `> a resposta da transferência não traz dado de sorteio`, `> enfileira o aviso de nova organização a quem recebe`, `> emite group.ownership_transferred sem dados pessoais`, `> não emite evento nem aviso quando a transferência é recusada`, `> duas transferências simultâneas aplicam uma e a outra recebe 403`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/api lint && pnpm --filter @amigo-secreto/api typecheck && pnpm --filter @amigo-secreto/web typecheck && pnpm test`
- [ ] Test count: 514 tests pass na API

**Tests**: integration
**Gate**: Full

**Commit**: `feat(api): transfer group ownership`

---

### Phase 4: Base do site e bloco de convite

#### T20: Dar ao site a própria URL

**What**: `lib/site-url.ts` com `siteUrl()` (lê `WEB_URL` na requisição; padrão `http://localhost:3000` fora de produção; lança em produção sem a variável) e `siteMetadata()` com o `metadataBase`, usada no `generateMetadata` do `app/layout.tsx`; `WEB_URL` no `.env.example`, no README e no ambiente do `scripts/e2e.ts`.
**Where**: `apps/web/src/lib/site-url.ts`
**Depends on**: T19
**Reuses**: leitura de `API_INTERNAL_URL` em `lib/api-server.ts`
**Requirement**: INV-01, INV-02

**Done when**:

- [ ] Testes em `src/lib/site-url.test.ts`: `siteUrl > lê WEB_URL da requisição`, `> usa http://localhost:3000 fora de produção sem WEB_URL`, `> lança em produção sem WEB_URL`; `siteMetadata > põe o WEB_URL no metadataBase`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 99 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): read the site url from WEB_URL`

---

#### T21: Repassar o cliente nas chamadas do servidor

**What**: `apiServerFetch(path, { forwardClient })`: com `forwardClient`, repassa o `X-Forwarded-For` e o `User-Agent` da requisição atual (AD-017).
**Where**: `apps/web/src/lib/api-server.ts`
**Depends on**: T20
**Reuses**: `headers()` do Next
**Requirement**: INV-02

**Done when**:

- [ ] Testes em `src/lib/api-server.test.ts`: `apiServerFetch > repassa X-Forwarded-For e User-Agent quando pedido`, `> não repassa os cabeçalhos do cliente por padrão`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 101 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): forward client headers in server api calls`

---

#### T22: Usar a regra de e-mail do shared no site

**What**: Os formulários de cadastro, entrada, recuperação de senha e segurança da conta passam a importar `isEmailAddress` do `@amigo-secreto/shared`; `lib/email.ts` sai.
**Where**: `apps/web/src/lib/email.ts`
**Depends on**: T21
**Reuses**: `isEmailAddress` (T1)
**Requirement**: INV-11

**Done when**:

- [ ] Os testes de unidade e os e2e de cadastro, entrada e recuperação passam sem mudança
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 101 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `refactor(web): use the shared email rule`

---

#### T23: Criar o bloco de convite

**What**: `components/invite-block.tsx` e `lib/whatsapp.ts` (`whatsappShareUrl`): "Compartilhar no WhatsApp", link num campo só leitura, "Copiar link" com aviso `role="status"` (seleciona o texto se o navegador recusar), "Convidar por e-mail" e "Gerar novo link" (ConfirmDialog, `apiFetch`, aviso "Novo link gerado") só para quem organiza, aviso no lugar do bloco com o grupo SORTEADO ou ENCERRADO.
**Where**: `apps/web/src/components/invite-block.tsx`
**Depends on**: T22
**Reuses**: `ConfirmDialog`, `Button`, `Input`, `apiFetch`, `Alert`
**Requirement**: INV-01, INV-10, INV-14

**Done when**:

- [ ] Testes em `src/components/invite-block.test.tsx`: `InviteBlock > mostra Compartilhar no WhatsApp e o link inteiro num campo só leitura com Copiar link`, `> Compartilhar no WhatsApp abre wa.me com o texto e o link`, `> Copiar link copia e anuncia Link copiado`, `> seleciona o link quando o navegador recusa a cópia`, `> mostra Convidar por e-mail e Gerar novo link só para quem organiza`, `> troca o bloco pelo aviso com o grupo SORTEADO`, `> troca o bloco pelo aviso com o grupo ENCERRADO`, `> Gerar novo link confirma com os textos da spec e foco em Manter link`, `> confirmar mostra o link novo e anuncia Novo link gerado`, `> Manter link fecha sem trocar`, `> mostra a mensagem da API num 409 ou 429 ao gerar link`
- [ ] Testes em `src/lib/whatsapp.test.ts`: `whatsappShareUrl > codifica o nome e o link no texto`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 113 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the invite block`

---

#### T24: Criar o formulário de convite por e-mail

**What**: `components/email-invite-form.tsx`: `textarea` "E-mails", `validateInviteEmails` antes de enviar, "Enviar convites" e "Enviando…", mensagem de sucesso com a quantidade, erro do campo num 400 e a mensagem da API no 409 e no 429.
**Where**: `apps/web/src/components/email-invite-form.tsx`
**Depends on**: T23
**Reuses**: `Textarea`, `Label`, `FieldError`, `apiFetch`, `validateInviteEmails`
**Requirement**: INV-11

**Done when**:

- [ ] Testes em `src/components/email-invite-form.test.tsx`: `EmailInviteForm > mostra o campo E-mails e Enviar convites`, `> mostra Informe pelo menos um e-mail. sem enviar`, `> lista os inválidos sem enviar`, `> recusa mais de 20 sem enviar`, `> envia e mostra Convite enviado para 1 e-mail. e Convites enviados para N e-mails.`, `> desabilita o botão e mostra Enviando… durante o envio`, `> mostra a mensagem do 429 e do 409 da API`, `> mostra o erro do campo num 400 da API`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 121 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the email invite form`

---

### Phase 5: Participantes e navegação no site

#### T25: Criar a linha do participante

**What**: `components/participant-row.tsx`: avatar (foto ou iniciais), nome em uma linha com reticências, tags "Organiza", "Pendente" e "Recusado"; para quem organiza, botões de ícone "Aprovar {nome}" e "Recusar {nome}" com o grupo ABERTO e menu com "Transferir organização" (ABERTO e SORTEADO) e "Remover do grupo" (ABERTO) na linha de outro aprovado; ações chegam por callbacks.
**Where**: `apps/web/src/components/participant-row.tsx`
**Depends on**: T24
**Reuses**: `UserAvatar`, `StatusTag`, `dropdown-menu`, `Button`
**Requirement**: INV-04, INV-05, INV-07, INV-09

**Done when**:

- [ ] Testes em `src/components/participant-row.test.tsx`: `ParticipantRow > mostra avatar, nome e a tag Organiza em quem organiza`, `> mostra iniciais sem foto e nunca o e-mail`, `> pendente mostra Pendente e os botões Aprovar {nome} e Recusar {nome}`, `> recusado mostra Recusado e Aprovar {nome}`, `> menu de quem organiza mostra Transferir organização e Remover do grupo com o grupo ABERTO`, `> com o grupo SORTEADO o menu mostra só Transferir organização`, `> sem menu na linha de quem organiza e para quem não organiza`, `> não mostra Aprovar nem Recusar com o grupo fora de ABERTO`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 129 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the participant row`

---

#### T26: Criar a lista de participantes

**What**: `components/participants-list.tsx`: recebe a primeira `MembersPage`, mostra "1 participante" / "N participantes", campo "Buscar participante" com espera de 300 ms e descarte da resposta antiga, "Carregar mais" acrescentando ao fim, "Ninguém encontrado com esse nome.", na ordem da API.
**Where**: `apps/web/src/components/participants-list.tsx`
**Depends on**: T25
**Reuses**: `ParticipantRow`, `participantsLabel`, `apiFetch`, `Input`
**Requirement**: INV-05

**Done when**:

- [ ] Testes em `src/components/participants-list.test.tsx`: `ParticipantsList > mostra o total de participantes aprovados`, `> Carregar mais acrescenta a página seguinte ao fim e some sem cursor`, `> busca na API depois de 300 ms com o termo`, `> mostra Ninguém encontrado com esse nome.`, `> descarta a resposta de uma busca antiga`, `> mostra a lista na ordem devolvida pela API sem reordenar`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 135 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the participants list`

---

#### T27: Ligar as ações sobre participantes

**What**: `components/member-actions.tsx`: aprovar e recusar sem confirmação; "Remover do grupo" e "Transferir organização" com ConfirmDialog e os textos da spec; `apiFetch` em cada ação; a lista recarrega depois de aprovar, recusar e remover, e a página faz `router.refresh()` depois de transferir; a mensagem da API num `Alert` no 403, 404 e 409.
**Where**: `apps/web/src/components/member-actions.tsx`
**Depends on**: T26
**Reuses**: `ConfirmDialog`, `ParticipantsList`, `apiFetch`
**Requirement**: INV-04, INV-07, INV-09, INV-14

**Done when**:

- [ ] Testes em `src/components/member-actions.test.tsx`: `MemberActions > Aprovar chama a API e recarrega a lista`, `> Recusar chama a API sem confirmação e recarrega a lista`, `> Remover do grupo confirma com os textos da spec e foco em Manter no grupo`, `> Manter no grupo, Esc e toque fora fecham sem remover`, `> confirmar a remoção chama a API e recarrega a lista`, `> Transferir organização confirma com os textos da spec e foco em Manter organização`, `> confirmar a transferência chama a API e recarrega a página`, `> mostra a mensagem da API num 403, 404 ou 409`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 143 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): wire the participant actions`

---

#### T28: Mostrar pedidos no card do grupo

**What**: `GroupCard` com a variante sem link para pedido pendente (nome, "Organizado por {nome}", tag "Aguardando aprovação") e "1 pendente" / "N pendentes" para quem organiza.
**Where**: `apps/web/src/components/group-card.tsx`
**Depends on**: T27
**Reuses**: `StatusTag`, `participantsLabel`
**Requirement**: INV-06

**Done when**:

- [ ] Testes em `src/components/group-card.test.tsx`: `GroupCard > pendente mostra nome, Organizado por e Aguardando aprovação, sem link`, `> mostra 1 pendente e N pendentes a quem organiza`, `> não mostra pendentes quando não há pedidos`
- [ ] Os testes existentes do `GroupCard` e de `MyGroupsView` passam sem mudança de asserção
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 146 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): show join requests on group cards`

---

#### T29: Criar as abas do grupo

**What**: `components/group-tabs.tsx`: `nav` com os links "Grupo" (`/grupos/{id}`) e "Participantes" (`/grupos/{id}/participantes`), `aria-current="page"` na aba atual pelo `usePathname`.
**Where**: `apps/web/src/components/group-tabs.tsx`
**Depends on**: T28
**Reuses**: `Link`, tokens do design system (Tabs)
**Requirement**: INV-06

**Done when**:

- [ ] Testes em `src/components/group-tabs.test.tsx`: `GroupTabs > mostra Grupo e Participantes com a aba atual marcada`, `> cada aba leva à sua rota`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 148 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the group tabs`

---

#### T30: Criar o botão de sair do grupo

**What**: `app/grupos/[id]/leave-group.tsx`: "Sair do grupo" para quem não organiza com o grupo ABERTO, ConfirmDialog com os textos da spec, `apiFetch` e `router.push('/grupos')`; a mensagem da API num `Alert` no 409.
**Where**: `apps/web/src/app/grupos/[id]/leave-group.tsx`
**Depends on**: T29
**Reuses**: `ConfirmDialog`, `GroupActions`
**Requirement**: INV-08, INV-14

**Done when**:

- [ ] Testes em `src/app/grupos/[id]/leave-group.test.tsx`: `LeaveGroup > mostra Sair do grupo a quem participa e não organiza com o grupo ABERTO`, `> não mostra Sair do grupo a quem organiza nem com o grupo fora de ABERTO`, `> confirma com os textos da spec e foco em Ficar no grupo`, `> confirmar chama a API e leva a /grupos`, `> mostra a mensagem da API num 409`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 153 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): let participants leave a group`

---

### Phase 6: Telas

#### T31: Gerar a imagem fixa do preview

**What**: `app/og/convite.png/route.tsx` com `ImageResponse` estática (`dynamic = 'force-static'`), 1200 x 630, fundo do tema claro, "Amigo Secreto" com o acento `festive` e "Sorteio, lista de desejos e mensagens secretas", na Plus Jakarta Sans de `apps/web/assets/PlusJakartaSans-Bold.ttf` (com o `OFL.txt` ao lado).
**Where**: `apps/web/src/app/og/convite.png/route.tsx`
**Depends on**: T30
**Reuses**: tokens do `globals.css`
**Requirement**: INV-02

**Done when**:

- [ ] Testes em `e2e/invites.spec.ts`: `convite › a imagem do preview é um PNG de 1200 x 630`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 153 tests pass no web e 80 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the invite preview image`

---

#### T32: Ler o convite no servidor do site

**What**: `lib/invites.ts` com `getInvite(code)`: `apiServerFetch` com `forwardClient`, 404 vira `null`, 429 vira `{ tooMany: mensagem }`, outro status lança.
**Where**: `apps/web/src/lib/invites.ts`
**Depends on**: T31
**Reuses**: `apiServerFetch`, `lib/groups.ts`
**Requirement**: INV-02

**Done when**:

- [ ] Testes em `src/lib/invites.test.ts`: `getInvite > repassa cookie, X-Forwarded-For e User-Agent e devolve o convite`, `> devolve null no 404`, `> devolve a mensagem no 429`, `> lança em outro status`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 157 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): read invites on the server`

---

#### T33: Criar o botão de entrar no grupo

**What**: `app/convite/[code]/join-button.tsx`: "Entrar no grupo" ou o texto da aprovação com "Pedir para entrar"; `apiFetch` em `/invites/{código}/join`; aprovado leva a `/grupos/{id}`, pendente faz `router.refresh()`; "Entrando…" durante o pedido; mensagem da API no 409 e no 429; "Não foi possível entrar no grupo. Tente de novo." em 5xx e rede.
**Where**: `apps/web/src/app/convite/[code]/join-button.tsx`
**Depends on**: T32
**Reuses**: `Button`, `Alert`, `apiFetch`
**Requirement**: INV-02, INV-03

**Done when**:

- [ ] Testes em `src/app/convite/[code]/join-button.test.tsx`: `JoinButton > mostra Entrar no grupo sem aprovação`, `> mostra o texto da aprovação e Pedir para entrar com aprovação`, `> entrar leva a /grupos/{id}`, `> pedir para entrar atualiza a página`, `> desabilita o botão e mostra Entrando… durante o pedido`, `> mostra Não foi possível entrar no grupo. Tente de novo. e mantém o botão num erro inesperado`, `> mostra a mensagem da API num 409 ou 429`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm --filter @amigo-secreto/web test`
- [ ] Test count: 164 tests pass no web

**Tests**: unit
**Gate**: Web

**Commit**: `feat(web): add the join group button`

---

#### T34: Criar a página do convite

**What**: `app/convite/[code]/page.tsx` (pública; `getInvite`; participante aprovado vai a `/grupos/{id}` por `redirect`; `notFound()` no 404), `invite-view.tsx` com os textos de cada estado e os links "Entrar" e "Criar conta" com `next`, `not-found.tsx` ("Convite não encontrado" e o texto da spec) e `invite-metadata.ts` (`inviteMetadata`: título, descrição e `openGraph.images` com `/og/convite.png` 1200 x 630; genérico para código inválido e para o 429).
**Where**: `apps/web/src/app/convite/[code]/page.tsx`
**Depends on**: T33
**Reuses**: `getInvite`, `getCurrentUser`, `JoinButton`, `safeNext`, fluxo do Google com `next`
**Requirement**: INV-02, INV-03, INV-06

**Done when**:

- [ ] Testes em `src/app/convite/[code]/invite-view.test.tsx`: `InviteView > sem sessão mostra nome, Organizado por, o texto e os links Entrar e Criar conta com next`, `> mostra só o nome do grupo e de quem organiza`, `> pendente mostra o aviso com o nome de quem organiza e nenhum botão`, `> recusado mostra Sua entrada neste grupo não foi aprovada. sem botão`, `> SORTEADO e ENCERRADO mostram o aviso do status sem botão`, `> mostra a mensagem do 429`, `> mostra nome com marcação HTML como texto`
- [ ] Testes em `src/app/convite/[code]/invite-metadata.test.ts`: `inviteMetadata > código válido usa Convite: {grupo}, a descrição e a imagem /og/convite.png de 1200 x 630`, `> código inválido usa Convite do Amigo Secreto sem dados de grupo`, `> 429 do robô monta o preview sem dados de grupo`, `> mantém marcação HTML do nome como texto nas meta tags`
- [ ] Testes em `e2e/invites.spec.ts`: `convite › sem sessão mostra o grupo, cria conta e volta ao convite`, `› cria conta com Google pelo convite e volta ao convite`, `› entra no grupo sem aprovação e cai na página do grupo`, `› pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos`, `› participante aprovado vai direto para o grupo`, `› código inexistente mostra Convite não encontrado`, `› aceita o código em maiúsculas`, `› as meta tags trazem o título, a descrição e a imagem do grupo`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 175 tests pass no web e 88 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the invite page`

---

#### T35: Pôr a página do grupo nas abas

**What**: Route group `app/grupos/[id]/(tabs)/` com `layout.tsx` (`requireUser`, `getGroup` no `cache`, `notFound()`, `GroupHeader` e `GroupTabs`), a página do grupo movida para `(tabs)/page.tsx` com `LeaveGroup`; `group-header.tsx` recebe o cabeçalho que sai do `GroupDetailView` (o teste `mostra Entrada com aprovação só para quem organiza` muda de arquivo com o mesmo nome); `/editar` e o `not-found` ficam fora das abas.
**Where**: `apps/web/src/app/grupos/[id]/(tabs)/layout.tsx`
**Depends on**: T34
**Reuses**: `GroupDetailView`, `GroupTabs`, `LeaveGroup`, `getGroup`
**Requirement**: INV-06, INV-08

**Done when**:

- [ ] Testes em `src/app/grupos/[id]/(tabs)/group-header.test.tsx`: `GroupHeader > mostra nome, status e Organizado por`, `> mostra Entrada com aprovação só para quem organiza`
- [ ] Testes em `e2e/groups.spec.ts`: `grupos › as abas levam de Grupo a Participantes e de volta`, `› participante sai do grupo e o grupo some de Meus grupos`, `› a edição do grupo não mostra as abas`
- [ ] Os e2e existentes de `groups.spec.ts` passam sem mudança
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 176 tests pass no web e 91 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): put the group page under tabs`

---

#### T36: Criar a aba Participantes

**What**: `app/grupos/[id]/(tabs)/participantes/page.tsx`: primeira página da lista (`lib/members.ts`, `getMembers`), `InviteBlock` com o link `{WEB_URL}/convite/{código}`, `EmailInviteForm` para quem organiza, `ParticipantsList` com `MemberActions`; aba "Participantes · {nome do grupo} · Amigo Secreto".
**Where**: `apps/web/src/app/grupos/[id]/(tabs)/participantes/page.tsx`
**Depends on**: T35
**Reuses**: `InviteBlock`, `EmailInviteForm`, `ParticipantsList`, `MemberActions`, `siteUrl`
**Requirement**: INV-01, INV-04, INV-05, INV-06, INV-07, INV-09, INV-10, INV-11, INV-12

**Done when**:

- [ ] Testes em `e2e/participants.spec.ts`: `participantes › mostra o bloco de convite e a lista com o total`, `› participante comum vê o link sem Gerar novo link nem Convidar por e-mail`, `› organizador aprova um pedido e recusa outro, e aprova o recusado depois`, `› organizador remove participante, que não entra de novo pelo link`, `› organizador transfere a organização e passa a ver o grupo como participante`, `› gerar novo link barra o link antigo`, `› convida por e-mail e o convite chega com o link do grupo`, `› Carregar mais traz os participantes seguintes e a busca ignora acentos`, `› Meus grupos mostra N pendentes a quem organiza`, `› pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 176 tests pass no web e 101 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `feat(web): add the participants tab`

---

#### T37: Conferir acessibilidade e larguras das telas novas

**What**: `e2e/accessibility.spec.ts` com o axe (WCAG 2.1 A/AA) nos temas claro e escuro e a rolagem horizontal em 360 px e 1440 px, um teste por tela: `/convite/{código}`, `/grupos/{id}/participantes` (com pendente, para quem organiza), `/grupos/{id}` (com as abas) e `/grupos` (com card pendente); correções de contraste ou rótulo que o axe apontar.
**Where**: `apps/web/e2e/accessibility.spec.ts`
**Depends on**: T36
**Reuses**: testes de acessibilidade e de layout da `04-groups`
**Requirement**: INV-14

**Done when**:

- [ ] Testes em `e2e/accessibility.spec.ts`: `acessibilidade › /convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`, `› /grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`, `› /grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`, `› /grupos com card pendente sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px`
- [ ] Gate check passes: `pnpm --filter @amigo-secreto/web lint && pnpm --filter @amigo-secreto/web typecheck && pnpm build && pnpm test && pnpm test:e2e`
- [ ] Test count: 176 tests pass no web e 105 no e2e

**Tests**: e2e
**Gate**: E2E

**Commit**: `test(web): check accessibility of the invite screens`

---

## Checks

**C1** - Participante aprovado de grupo ABERTO vê "Compartilhar no WhatsApp" e o link `{site}/convite/{código}` inteiro num campo só leitura com "Copiar link" (INV-01, AC 1)
Proof: run web | ✓ InviteBlock > mostra Compartilhar no WhatsApp e o link inteiro num campo só leitura com Copiar link
Proof: run e2e | ✓ participantes › mostra o bloco de convite e a lista com o total

**C2** - "Compartilhar no WhatsApp" abre `https://wa.me/?text=` com "Vamos fazer amigo secreto! Entre no grupo {nome}: {link}" (INV-01, AC 2)
Proof: run web | ✓ InviteBlock > Compartilhar no WhatsApp abre wa.me com o texto e o link
Proof: run web | ✓ whatsappShareUrl > codifica o nome e o link no texto

**C3** - "Copiar link" copia o link e mostra "Link copiado" (INV-01, AC 3)
Proof: run web | ✓ InviteBlock > Copiar link copia e anuncia Link copiado

**C4** - Navegador que recusa a cópia deixa o texto do link selecionado (INV-01, AC 4)
Proof: run web | ✓ InviteBlock > seleciona o link quando o navegador recusa a cópia

**C5** - "Convidar por e-mail" e "Gerar novo link" só aparecem para quem organiza (INV-01, AC 5)
Proof: run web | ✓ InviteBlock > mostra Convidar por e-mail e Gerar novo link só para quem organiza
Proof: run e2e | ✓ participantes › participante comum vê o link sem Gerar novo link nem Convidar por e-mail

**C6** - Grupo SORTEADO troca o bloco por "Este grupo já fez o sorteio e não aceita novas entradas." (INV-01, AC 6)
Proof: run web | ✓ InviteBlock > troca o bloco pelo aviso com o grupo SORTEADO

**C7** - Grupo ENCERRADO troca o bloco por "Este grupo foi encerrado e não aceita novas entradas." (INV-01, AC 7)
Proof: run web | ✓ InviteBlock > troca o bloco pelo aviso com o grupo ENCERRADO

**C8** - Grupo criado ganha código de 10 caracteres de `23456789abcdefghjkmnpqrstuvwxyz`, aleatório e único (INV-01, AC 8)
Proof: run api | ✓ código do convite > gera 10 caracteres do alfabeto sem 0, 1, i, l e o
Proof: run api | ✓ código do convite > gera códigos diferentes em 1000 chamadas
Proof: run api | ✓ código do convite do grupo > grupo criado pela API ganha um código de 10 caracteres do alfabeto
Proof: run api | ✓ código do convite do grupo > o banco recusa dois grupos com o mesmo código

**C9** - Sem sessão, o convite de grupo ABERTO mostra nome, "Organizado por {nome}", o texto e os links "Entrar" e "Criar conta" com `next=/convite/{código}` (INV-02, AC 1)
Proof: run web | ✓ InviteView > sem sessão mostra nome, Organizado por, o texto e os links Entrar e Criar conta com next
Proof: run api | ✓ abrir convite > sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de aprovação
Proof: run e2e | ✓ convite › sem sessão mostra o grupo, cria conta e volta ao convite

**C10** - A quem não participa, o convite mostra do grupo só o nome e o nome de quem organiza (INV-02, AC 2)
Proof: run api | ✓ abrir convite > sem sessão devolve só nome do grupo, nome de quem organiza, status e exigência de aprovação
Proof: run web | ✓ InviteView > mostra só o nome do grupo e de quem organiza

**C11** - Logado sem participação, grupo ABERTO sem aprovação: botão "Entrar no grupo" (INV-02, AC 3)
Proof: run api | ✓ abrir convite > pessoa logada sem participação vê viewer none e a exigência de aprovação
Proof: run web | ✓ JoinButton > mostra Entrar no grupo sem aprovação

**C12** - Logado sem participação, grupo com aprovação: "Quem organiza precisa aprovar sua entrada." e "Pedir para entrar" (INV-02, AC 4)
Proof: run api | ✓ abrir convite > pessoa logada sem participação vê viewer none e a exigência de aprovação
Proof: run web | ✓ JoinButton > mostra o texto da aprovação e Pedir para entrar com aprovação

**C13** - Participante aprovado que abre o convite do próprio grupo vai a `/grupos/{id}` (INV-02, AC 5)
Proof: run api | ✓ abrir convite > participante aprovado recebe viewer member e o groupId
Proof: run e2e | ✓ convite › participante aprovado vai direto para o grupo

**C14** - Pedido pendente vê "Seu pedido está aguardando a aprovação de {organizador}." sem botão (INV-02, AC 6)
Proof: run api | ✓ abrir convite > pessoa pendente recebe viewer pending
Proof: run web | ✓ InviteView > pendente mostra o aviso com o nome de quem organiza e nenhum botão
Proof: run e2e | ✓ convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos

**C15** - Recusado ou removido vê "Sua entrada neste grupo não foi aprovada." sem botão (INV-02, AC 7)
Proof: run api | ✓ abrir convite > pessoa recusada recebe viewer rejected
Proof: run api | ✓ remover participante > a pessoa removida abre o convite como recusada e não entra de novo
Proof: run web | ✓ InviteView > recusado mostra Sua entrada neste grupo não foi aprovada. sem botão

**C16** - Grupo SORTEADO: "Este grupo já fez o sorteio e não aceita novas entradas." sem botão (INV-02, AC 8)
Proof: run api | ✓ abrir convite > devolve o status SORTEADO e ENCERRADO do grupo
Proof: run web | ✓ InviteView > SORTEADO e ENCERRADO mostram o aviso do status sem botão

**C17** - Grupo ENCERRADO: "Este grupo foi encerrado e não aceita novas entradas." sem botão (INV-02, AC 9)
Proof: run api | ✓ abrir convite > devolve o status SORTEADO e ENCERRADO do grupo
Proof: run web | ✓ InviteView > SORTEADO e ENCERRADO mostram o aviso do status sem botão

**C18** - Código inexistente ou trocado: 404 e "Convite não encontrado" com o texto da spec, igual nos dois casos (INV-02, AC 10)
Proof: run api | ✓ abrir convite > responde 404 Convite não encontrado. a código inexistente, trocado ou com formato errado, com o mesmo corpo
Proof: run e2e | ✓ convite › código inexistente mostra Convite não encontrado

**C19** - Código em maiúsculas vale o mesmo que em minúsculas (INV-02, AC 11)
Proof: run api | ✓ abrir convite > aceita o código em maiúsculas
Proof: run e2e | ✓ convite › aceita o código em maiúsculas

**C20** - Preview de código válido: título "Convite: {nome do grupo}", descrição "{organizador} convidou você para o amigo secreto." e imagem fixa de 1200 x 630 (INV-02, AC 12)
Proof: run web | ✓ inviteMetadata > código válido usa Convite: {grupo}, a descrição e a imagem /og/convite.png de 1200 x 630
Proof: run e2e | ✓ convite › as meta tags trazem o título, a descrição e a imagem do grupo
Proof: run e2e | ✓ convite › a imagem do preview é um PNG de 1200 x 630

**C21** - Preview de código inválido: título "Convite do Amigo Secreto", sem nome de grupo nem de pessoa (INV-02, AC 13)
Proof: run web | ✓ inviteMetadata > código inválido usa Convite do Amigo Secreto sem dados de grupo

**C22** - O 61º convite do minuto do mesmo IP (que não é robô) recebe 429 e a tela mostra "Muitas tentativas. Tente de novo em N minutos."; o IP vem do `X-Forwarded-For` repassado pelo site (INV-02, AC 14)
Proof: run api | ✓ abrir convite > responde 429 ao 61º convite do minuto do mesmo IP e aceita o 60º
Proof: run api | ✓ abrir convite > separa o limite pelo IP do X-Forwarded-For
Proof: run web | ✓ apiServerFetch > repassa X-Forwarded-For e User-Agent quando pedido
Proof: run web | ✓ getInvite > repassa cookie, X-Forwarded-For e User-Agent e devolve o convite
Proof: run web | ✓ InviteView > mostra a mensagem do 429

**C23** - Robô de preview tem 600 por minuto por IP; acima, 429 e preview sem dados de grupo (INV-02, AC 15)
Proof: run api | ✓ abrir convite > responde 429 ao 601º convite do minuto de um robô de preview e aceita o 600º
Proof: run api | ✓ robôs de preview > reconhece WhatsApp, facebookexternalhit, Facebot, TelegramBot, Slackbot, Twitterbot, Discordbot e LinkedInBot
Proof: run api | ✓ robôs de preview > não reconhece navegadores comuns nem User-Agent ausente
Proof: run web | ✓ inviteMetadata > 429 do robô monta o preview sem dados de grupo

**C24** - Acima do limite por IP, abrir e entrar respondem 429 a qualquer código, existente ou não (INV-02, AC 16)
Proof: run api | ✓ abrir convite > acima do limite responde 429 a código existente e inexistente
Proof: run api | ✓ entrar pelo convite > conta no limite por IP de abrir convite e responde 429 antes de procurar o código

**C25** - "Entrar no grupo" em grupo ABERTO sem aprovação cria participação aprovada e leva a `/grupos/{id}` (INV-03, AC 1)
Proof: run api | ✓ entrar pelo convite > em grupo sem aprovação cria participação aprovada e devolve o groupId
Proof: run web | ✓ JoinButton > entrar leva a /grupos/{id}
Proof: run e2e | ✓ convite › entra no grupo sem aprovação e cai na página do grupo

**C26** - "Pedir para entrar" cria participação pendente e mostra o aviso do pedido (INV-03, AC 2)
Proof: run api | ✓ entrar pelo convite > em grupo com aprovação cria participação pendente sem groupId
Proof: run web | ✓ JoinButton > pedir para entrar atualiza a página
Proof: run e2e | ✓ convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos

**C27** - Conta com e-mail não confirmado entra como uma confirmada (INV-03, AC 3)
Proof: run api | ✓ entrar pelo convite > aceita conta com e-mail não confirmado

**C28** - Quem já tem participação (aprovada, pendente ou recusada) recebe o estado dela, sem participação nova (INV-03, AC 4)
Proof: run api | ✓ entrar pelo convite > devolve o estado atual a quem já é aprovado, pendente ou recusado, sem gravar nem avisar

**C29** - Grupo SORTEADO: 409 "Este grupo já fez o sorteio e não aceita novas entradas." e nenhuma participação (INV-03, AC 5)
Proof: run api | ✓ entrar pelo convite > responde 409 em grupo SORTEADO e ENCERRADO sem criar participação
Proof: run web | ✓ JoinButton > mostra a mensagem da API num 409 ou 429

**C30** - Grupo ENCERRADO: 409 "Este grupo foi encerrado e não aceita novas entradas." e nenhuma participação (INV-03, AC 6)
Proof: run api | ✓ entrar pelo convite > responde 409 em grupo SORTEADO e ENCERRADO sem criar participação

**C31** - Código inexistente ou trocado: 404 "Convite não encontrado." e nenhuma participação (INV-03, AC 7)
Proof: run api | ✓ entrar pelo convite > responde 404 Convite não encontrado. a código inexistente ou trocado sem criar participação

**C32** - A 31ª entrada da hora da mesma conta recebe 429 e nenhuma participação; a 30ª passa (INV-03, AC 8)
Proof: run api | ✓ entrar pelo convite > responde 429 à 31ª entrada da hora da mesma conta e aceita a 30ª
Proof: run api | ✓ entrar pelo convite > não conta no limite da conta a entrada em que a pessoa já participava

**C33** - Durante a entrada o botão fica desabilitado com "Entrando…" (INV-03, AC 9)
Proof: run web | ✓ JoinButton > desabilita o botão e mostra Entrando… durante o pedido

**C34** - Erro inesperado mostra "Não foi possível entrar no grupo. Tente de novo." e mantém o botão (INV-03, AC 10)
Proof: run web | ✓ JoinButton > mostra Não foi possível entrar no grupo. Tente de novo. e mantém o botão num erro inesperado

**C35** - Quem cria conta pelo convite, com e-mail e senha ou com Google, volta a `/convite/{código}` (INV-03, AC 11)
Proof: run e2e | ✓ convite › sem sessão mostra o grupo, cria conta e volta ao convite
Proof: run e2e | ✓ convite › cria conta com Google pelo convite e volta ao convite

**C36** - Quem organiza vê cada pendente com "Pendente", "Aprovar {nome}" e "Recusar {nome}" (INV-04, AC 1)
Proof: run api | ✓ lista de participantes > quem organiza recebe pendentes, aprovados por nome e recusados por último
Proof: run web | ✓ ParticipantRow > pendente mostra Pendente e os botões Aprovar {nome} e Recusar {nome}

**C37** - "Aprovar" passa a participação para aprovada e a pessoa aparece entre os aprovados (INV-04, AC 2)
Proof: run api | ✓ aprovar e recusar > aprovar passa o pendente para aprovado
Proof: run web | ✓ MemberActions > Aprovar chama a API e recarrega a lista
Proof: run e2e | ✓ participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois

**C38** - "Recusar", sem confirmação, passa para recusada e mostra a pessoa com "Recusado" e "Aprovar {nome}" (INV-04, AC 3)
Proof: run api | ✓ aprovar e recusar > recusar passa o pendente para recusado
Proof: run web | ✓ MemberActions > Recusar chama a API sem confirmação e recarrega a lista
Proof: run web | ✓ ParticipantRow > recusado mostra Recusado e Aprovar {nome}
Proof: run e2e | ✓ participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois

**C39** - Aprovar um recusado com o grupo ABERTO passa para aprovada (INV-04, AC 4)
Proof: run api | ✓ aprovar e recusar > aprovar um recusado com o grupo ABERTO passa para aprovado
Proof: run e2e | ✓ participantes › organizador aprova um pedido e recusa outro, e aprova o recusado depois

**C40** - Desmarcar "Exigir aprovação para entrar" aprova na mesma transação todos os pendentes do grupo (INV-04, AC 5)
Proof: run api | ✓ desligar a aprovação > aprova na mesma transação os pendentes do grupo
Proof: run api | ✓ desligar a aprovação > não muda recusados nem participações de outros grupos

**C41** - Grupo fora de ABERTO: 409 "Com o sorteio feito, ninguém entra nem sai do grupo." a aprovar ou recusar, sem mudança (INV-04, AC 6)
Proof: run api | ✓ aprovar e recusar > responde 409 com o grupo SORTEADO ou ENCERRADO sem mudar a participação
Proof: run web | ✓ ParticipantRow > não mostra Aprovar nem Recusar com o grupo fora de ABERTO

**C42** - Participante que não organiza: 403 "Só quem organiza pode alterar o grupo." sem mudança (INV-04, AC 7)
Proof: run api | ✓ aprovar e recusar > responde 403 a participante que não organiza sem mudar a participação

**C43** - Participação inexistente ou de outro grupo: 404 "Participante não encontrado." (INV-04, AC 8)
Proof: run api | ✓ aprovar e recusar > responde 404 Participante não encontrado. a participação inexistente ou de outro grupo

**C44** - Participação já no estado pedido devolve o estado atual sem outro aviso (INV-04, AC 9)
Proof: run api | ✓ aprovar e recusar > devolve o estado atual sem novo aviso quando a participação já está no estado pedido

**C45** - Pendentes e recusados não aparecem a quem não organiza, nem pela tela nem pela API (INV-04, AC 10)
Proof: run api | ✓ lista de participantes > não mostra pendentes nem recusados a quem não organiza
Proof: run api | ✓ lista de participantes > participante aprovado recebe só os aprovados em ordem alfabética, com avatar e Organiza

**C46** - Participante aprovado vê os aprovados em ordem alfabética, com avatar, nome com reticências e "Organiza" (INV-05, AC 1)
Proof: run api | ✓ lista de participantes > participante aprovado recebe só os aprovados em ordem alfabética, com avatar e Organiza
Proof: run web | ✓ ParticipantRow > mostra avatar, nome e a tag Organiza em quem organiza
Proof: run web | ✓ ParticipantsList > mostra a lista na ordem devolvida pela API sem reordenar
Proof: run e2e | ✓ participantes › mostra o bloco de convite e a lista com o total

**C47** - Quem organiza vê pendentes, depois aprovados por nome e por último recusados (INV-05, AC 2)
Proof: run api | ✓ lista de participantes > quem organiza recebe pendentes, aprovados por nome e recusados por último

**C48** - A lista traz 20 por vez e "Carregar mais" acrescenta as 20 seguintes ao fim (INV-05, AC 3)
Proof: run api | ✓ lista de participantes > traz 20 por vez e o cursor leva aos seguintes sem pular nem repetir
Proof: run api | ✓ lista de participantes > aprovar alguém com a lista aberta não pula nem repete ninguém na página seguinte
Proof: run web | ✓ ParticipantsList > Carregar mais acrescenta a página seguinte ao fim e some sem cursor
Proof: run e2e | ✓ participantes › Carregar mais traz os participantes seguintes e a busca ignora acentos

**C49** - "Buscar participante" devolve pela API só quem tem o termo no nome, sem diferenciar maiúsculas nem acentos, na mesma ordem e paginação (INV-05, AC 4)
Proof: run api | ✓ lista de participantes > busca pelo nome sem diferenciar maiúsculas nem acentos, na mesma ordem e paginação
Proof: run api | ✓ lista de participantes > ordena nomes com acento junto dos sem acento
Proof: run api | ✓ extensão unaccent > a migration habilita o unaccent e lower(unaccent('João Ávila')) vira joao avila
Proof: run web | ✓ ParticipantsList > busca na API depois de 300 ms com o termo
Proof: run web | ✓ ParticipantsList > descarta a resposta de uma busca antiga
Proof: run e2e | ✓ participantes › Carregar mais traz os participantes seguintes e a busca ignora acentos

**C50** - Busca sem resultado mostra "Ninguém encontrado com esse nome." (INV-05, AC 5)
Proof: run api | ✓ lista de participantes > devolve lista vazia quando a busca não encontra ninguém
Proof: run web | ✓ ParticipantsList > mostra Ninguém encontrado com esse nome.

**C51** - Nem a lista nem a API dela mostram o e-mail de ninguém (INV-05, AC 6)
Proof: run api | ✓ lista de participantes > não devolve o e-mail de ninguém
Proof: run web | ✓ ParticipantRow > mostra iniciais sem foto e nunca o e-mail

**C52** - A aba mostra "1 participante" / "N participantes" aprovados (INV-05, AC 7)
Proof: run api | ✓ lista de participantes > devolve o total de aprovados sem a busca
Proof: run web | ✓ ParticipantsList > mostra o total de participantes aprovados

**C53** - Quem não é participante aprovado recebe 404 "Grupo não encontrado." na lista, igual a grupo inexistente (INV-05, AC 8)
Proof: run api | ✓ lista de participantes > responde 404 Grupo não encontrado. a quem não participa, a pendente e a id inexistente
Proof: run e2e | ✓ participantes › pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.

**C54** - `/grupos/{id}` e `/grupos/{id}/participantes` mostram as abas "Grupo" e "Participantes" com a atual marcada (INV-06, AC 1)
Proof: run web | ✓ GroupTabs > mostra Grupo e Participantes com a aba atual marcada
Proof: run e2e | ✓ grupos › as abas levam de Grupo a Participantes e de volta

**C55** - Cada aba leva à sua rota (INV-06, AC 2)
Proof: run web | ✓ GroupTabs > cada aba leva à sua rota
Proof: run e2e | ✓ grupos › as abas levam de Grupo a Participantes e de volta

**C56** - Pedido pendente aparece em "Ativos" num card sem link com nome, "Organizado por {nome}" e "Aguardando aprovação" (INV-06, AC 3)
Proof: run api | ✓ meus grupos com pedidos > mostra em Ativos o grupo com pedido pendente, com organizerName e membershipStatus PENDING
Proof: run web | ✓ GroupCard > pendente mostra nome, Organizado por e Aguardando aprovação, sem link
Proof: run e2e | ✓ convite › pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos

**C57** - `/grupos` não mostra grupos em que a pessoa foi recusada ou removida (INV-06, AC 4)
Proof: run api | ✓ meus grupos com pedidos > não mostra grupos em que a pessoa foi recusada ou removida

**C58** - Quem organiza vê "1 pendente" / "N pendentes" no card (INV-06, AC 5)
Proof: run api | ✓ meus grupos com pedidos > devolve a quem organiza a contagem de pendentes e null aos outros
Proof: run web | ✓ GroupCard > mostra 1 pendente e N pendentes a quem organiza
Proof: run e2e | ✓ participantes › Meus grupos mostra N pendentes a quem organiza

**C59** - Pessoa com pedido pendente recebe 404 "Grupo não encontrado." em `/grupos/{id}` (INV-06, AC 6)
Proof: run api | ✓ meus grupos com pedidos > pessoa pendente recebe 404 Grupo não encontrado. ao abrir o grupo
Proof: run e2e | ✓ participantes › pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.

**C60** - Com o grupo ABERTO, quem organiza vê "Remover do grupo" no menu de cada outro aprovado (INV-07, AC 1)
Proof: run web | ✓ ParticipantRow > menu de quem organiza mostra Transferir organização e Remover do grupo com o grupo ABERTO
Proof: run web | ✓ ParticipantRow > com o grupo SORTEADO o menu mostra só Transferir organização
Proof: run web | ✓ ParticipantRow > sem menu na linha de quem organiza e para quem não organiza

**C61** - "Remover do grupo" abre "Remover {nome} do grupo?" com o texto e os botões da spec (INV-07, AC 2)
Proof: run web | ✓ MemberActions > Remover do grupo confirma com os textos da spec e foco em Manter no grupo

**C62** - Confirmar passa a participação para recusada e tira a pessoa dos aprovados (INV-07, AC 3)
Proof: run api | ✓ remover participante > passa a participação para recusada e tira a pessoa dos aprovados
Proof: run web | ✓ MemberActions > confirmar a remoção chama a API e recarrega a lista
Proof: run e2e | ✓ participantes › organizador remove participante, que não entra de novo pelo link

**C63** - "Manter no grupo", Esc ou toque fora fecham sem mudar nada (INV-07, AC 4)
Proof: run web | ✓ MemberActions > Manter no grupo, Esc e toque fora fecham sem remover

**C64** - Grupo fora de ABERTO: 409 "Com o sorteio feito, ninguém entra nem sai do grupo." e não remove (INV-07, AC 5)
Proof: run api | ✓ remover participante > responde 409 com o grupo SORTEADO ou ENCERRADO sem remover

**C65** - Remover quem organiza: 409 "Quem organiza não pode ser removido." (INV-07, AC 6)
Proof: run api | ✓ remover participante > responde 409 Quem organiza não pode ser removido.

**C66** - Participante que não organiza: 403 "Só quem organiza pode alterar o grupo." e não remove (INV-07, AC 7)
Proof: run api | ✓ remover participante > responde 403 a participante que não organiza sem remover

**C67** - Com o grupo ABERTO, quem participa e não organiza vê "Sair do grupo" na aba Grupo (INV-08, AC 1)
Proof: run web | ✓ LeaveGroup > mostra Sair do grupo a quem participa e não organiza com o grupo ABERTO

**C68** - "Sair do grupo" abre "Sair do grupo {nome}?" com o texto e os botões da spec (INV-08, AC 2)
Proof: run web | ✓ LeaveGroup > confirma com os textos da spec e foco em Ficar no grupo

**C69** - Confirmar apaga a participação e leva a `/grupos`, sem o grupo (INV-08, AC 3)
Proof: run api | ✓ sair do grupo > apaga a participação e o grupo some de Meus grupos
Proof: run web | ✓ LeaveGroup > confirmar chama a API e leva a /grupos
Proof: run e2e | ✓ grupos › participante sai do grupo e o grupo some de Meus grupos

**C70** - Quem saiu abre o link como quem nunca participou (INV-08, AC 4)
Proof: run api | ✓ sair do grupo > quem saiu abre o convite como quem nunca participou e pode entrar de novo

**C71** - Grupo fora de ABERTO: 409 "Com o sorteio feito, ninguém entra nem sai do grupo." e a participação fica (INV-08, AC 5)
Proof: run api | ✓ sair do grupo > responde 409 com o grupo SORTEADO ou ENCERRADO e mantém a participação
Proof: run web | ✓ LeaveGroup > mostra a mensagem da API num 409

**C72** - Quem organiza recebe 409 "Transfira a organização antes de sair do grupo." e a participação fica (INV-08, AC 6)
Proof: run api | ✓ sair do grupo > responde 409 Transfira a organização antes de sair do grupo. a quem organiza

**C73** - Quem organiza não vê "Sair do grupo" (INV-08, AC 7)
Proof: run web | ✓ LeaveGroup > não mostra Sair do grupo a quem organiza nem com o grupo fora de ABERTO

**C74** - Com o grupo ABERTO ou SORTEADO, quem organiza vê "Transferir organização" no menu de cada outro aprovado (INV-09, AC 1)
Proof: run web | ✓ ParticipantRow > menu de quem organiza mostra Transferir organização e Remover do grupo com o grupo ABERTO
Proof: run web | ✓ ParticipantRow > com o grupo SORTEADO o menu mostra só Transferir organização
Proof: run api | ✓ transferir organização > transfere com o grupo SORTEADO

**C75** - "Transferir organização" abre "Passar a organização para {nome}?" com o texto e os botões da spec (INV-09, AC 2)
Proof: run web | ✓ MemberActions > Transferir organização confirma com os textos da spec e foco em Manter organização

**C76** - Confirmar faz da pessoa escolhida quem organiza, mantém o antigo como aprovado e recarrega sem as ações de quem organiza (INV-09, AC 3)
Proof: run api | ✓ transferir organização > faz da pessoa escolhida quem organiza e mantém a antiga como participante aprovada
Proof: run api | ✓ transferir organização > depois da transferência o antigo organizador recebe 403 ao editar
Proof: run web | ✓ MemberActions > confirmar a transferência chama a API e recarrega a página
Proof: run e2e | ✓ participantes › organizador transfere a organização e passa a ver o grupo como participante

**C77** - Grupo ENCERRADO: 409 "Grupo encerrado não pode ser alterado." e não transfere (INV-09, AC 4)
Proof: run api | ✓ transferir organização > responde 409 Grupo encerrado não pode ser alterado. com o grupo ENCERRADO

**C78** - Alvo que não é aprovado do grupo ou que já organiza: 404 "Participante não encontrado." (INV-09, AC 5)
Proof: run api | ✓ transferir organização > responde 404 Participante não encontrado. a pendente, recusado, de outro grupo ou a quem já organiza

**C79** - Quem não organiza: 403 "Só quem organiza pode alterar o grupo." e não transfere (INV-09, AC 6)
Proof: run api | ✓ transferir organização > responde 403 a quem não organiza

**C80** - A transferência não dá acesso a resultado de sorteio (INV-09, AC 7)
Proof: run api | ✓ transferir organização > a resposta da transferência não traz dado de sorteio

**C81** - "Gerar novo link" abre "Gerar um novo link?" com o texto e os botões da spec (INV-10, AC 1)
Proof: run web | ✓ InviteBlock > Gerar novo link confirma com os textos da spec e foco em Manter link
Proof: run web | ✓ InviteBlock > Manter link fecha sem trocar

**C82** - Confirmar troca o código, mostra o link novo e "Novo link gerado" (INV-10, AC 2)
Proof: run api | ✓ gerar novo link > troca o código do grupo e devolve o novo
Proof: run web | ✓ InviteBlock > confirmar mostra o link novo e anuncia Novo link gerado
Proof: run e2e | ✓ participantes › gerar novo link barra o link antigo

**C83** - O link antigo mostra "Convite não encontrado" depois da troca (INV-10, AC 3)
Proof: run api | ✓ gerar novo link > o código antigo passa a responder 404 ao abrir e ao entrar
Proof: run e2e | ✓ participantes › gerar novo link barra o link antigo

**C84** - A troca mantém todas as participações (INV-10, AC 4)
Proof: run api | ✓ gerar novo link > mantém todas as participações do grupo

**C85** - Grupo fora de ABERTO: 409 e o código fica (INV-10, AC 5)
Proof: run api | ✓ gerar novo link > responde 409 com o grupo SORTEADO ou ENCERRADO e mantém o código
Proof: run web | ✓ InviteBlock > mostra a mensagem da API num 409 ou 429 ao gerar link

**C86** - Quem não organiza: 403 e o código fica (INV-10, AC 6)
Proof: run api | ✓ gerar novo link > responde 403 a participante que não organiza e mantém o código
Proof: run api | ✓ gerar novo link > responde 404 a quem não participa

**C87** - A 11ª troca da hora do grupo recebe 429 e o código fica; a 10ª passa (INV-10, AC 7)
Proof: run api | ✓ gerar novo link > responde 429 à 11ª troca da hora do grupo e aceita a 10ª

**C88** - "Convidar por e-mail" mostra "E-mails", que separa por vírgula, ponto e vírgula, espaço ou quebra de linha, e "Enviar convites" (INV-11, AC 1)
Proof: run web | ✓ EmailInviteForm > mostra o campo E-mails e Enviar convites
Proof: run shared | ✓ parseInviteEmails > separa por vírgula, ponto e vírgula, espaço e quebra de linha
Proof: run shared | ✓ parseInviteEmails > descarta separadores repetidos e pontas vazias

**C89** - De 1 a 20 endereços válidos: um e-mail por endereço distinto na mesma transação, cada envio gravado, e "Convite enviado para 1 e-mail." / "Convites enviados para N e-mails." (INV-11, AC 2)
Proof: run api | ✓ convidar por e-mail > enfileira um convite por endereço distinto com o link do grupo e grava cada envio
Proof: run api | ✓ convidar por e-mail > devolve a quantidade de e-mails enviados
Proof: run api | ✓ convidar por e-mail > envia também para quem já participa
Proof: run shared | ✓ parseInviteEmails > conta uma vez os repetidos sem diferenciar maiúsculas
Proof: run web | ✓ EmailInviteForm > envia e mostra Convite enviado para 1 e-mail. e Convites enviados para N e-mails.
Proof: run e2e | ✓ participantes › convida por e-mail e o convite chega com o link do grupo

**C90** - Endereço inválido: 400, "Confira estes e-mails: {lista}" e nenhum envio (INV-11, AC 3)
Proof: run shared | ✓ validateInviteEmails > lista os endereços inválidos em Confira estes e-mails:
Proof: run shared | ✓ isEmailAddress > aceita endereço comum e recusa sem arroba, sem ponto no domínio, com espaço ou com mais de 254 caracteres
Proof: run api | ✓ convidar por e-mail > recusa com 400 e a lista dos inválidos sem enviar nenhum
Proof: run api | ✓ convidar por e-mail > recusa com 400 endereço que o isEmail da API recusa
Proof: run web | ✓ EmailInviteForm > lista os inválidos sem enviar

**C91** - Mais de 20 distintos: 400, "Envie no máximo 20 e-mails por vez." e nenhum envio (INV-11, AC 4)
Proof: run shared | ✓ validateInviteEmails > aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails por vez.
Proof: run shared | ✓ validateInviteEmails > conta 20 distintos quando há repetidos além deles
Proof: run api | ✓ convidar por e-mail > aceita 20 endereços distintos e recusa 21 sem enviar nenhum
Proof: run web | ✓ EmailInviteForm > recusa mais de 20 sem enviar

**C92** - Campo vazio mostra "Informe pelo menos um e-mail." sem enviar (INV-11, AC 5)
Proof: run shared | ✓ validateInviteEmails > recusa o campo vazio com Informe pelo menos um e-mail.
Proof: run web | ✓ EmailInviteForm > mostra Informe pelo menos um e-mail. sem enviar
Proof: run api | ✓ convidar por e-mail > recusa com 400 o campo vazio

**C93** - Envio que passaria de 100 em 24 horas: 429 com a mensagem do limite em horas ou minutos e nenhum envio (INV-11, AC 6)
Proof: run api | ✓ convidar por e-mail > aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, sem enviar nenhum
Proof: run api | ✓ convidar por e-mail > volta a aceitar quando o envio mais antigo sai da janela de 24 horas
Proof: run api | ✓ limite de convites por e-mail > diz em N horas acima de uma hora
Proof: run api | ✓ limite de convites por e-mail > diz em 1 hora com exatamente uma hora
Proof: run api | ✓ limite de convites por e-mail > diz em N minutos abaixo de uma hora
Proof: run api | ✓ limite de convites por e-mail > grava o Retry-After em segundos
Proof: run web | ✓ EmailInviteForm > mostra a mensagem do 429 e do 409 da API

**C94** - Grupo fora de ABERTO: 409 "Com o sorteio feito, ninguém entra nem sai do grupo." e nenhum envio (INV-11, AC 7)
Proof: run api | ✓ convidar por e-mail > responde 409 com o grupo SORTEADO ou ENCERRADO sem enviar
Proof: run web | ✓ EmailInviteForm > mostra a mensagem do 429 e do 409 da API

**C95** - Quem não organiza: 403 e nenhum envio (INV-11, AC 8)
Proof: run api | ✓ convidar por e-mail > responde 403 a participante que não organiza sem enviar

**C96** - Durante o envio o botão fica desabilitado com "Enviando…" (INV-11, AC 9)
Proof: run web | ✓ EmailInviteForm > desabilita o botão e mostra Enviando… durante o envio

**C97** - Convite por e-mail com o assunto, o texto e "Ver convite" para `/convite/{código}` (INV-12, AC 1)
Proof: run api | ✓ e-mails do convite > convite por e-mail tem o assunto, o texto e o botão Ver convite para /convite/{código}
Proof: run api | ✓ convidar por e-mail > enfileira um convite por endereço distinto com o link do grupo e grava cada envio
Proof: run e2e | ✓ participantes › convida por e-mail e o convite chega com o link do grupo

**C98** - Pedido de entrada enfileira na transação o aviso a quem organiza com "Ver pedidos" (INV-12, AC 2)
Proof: run api | ✓ e-mails do convite > pedido de entrada tem o assunto, o texto e o botão Ver pedidos
Proof: run api | ✓ entrar pelo convite > enfileira na mesma transação o aviso de pedido a quem organiza

**C99** - Entrada sem aprovação enfileira na transação o aviso a quem organiza com "Ver participantes" (INV-12, AC 3)
Proof: run api | ✓ e-mails do convite > entrada sem aprovação tem o assunto, o texto e o botão Ver participantes
Proof: run api | ✓ entrar pelo convite > enfileira na mesma transação o aviso de entrada a quem organiza

**C100** - Aprovação, à mão ou ao desligar a aprovação, enfileira o aviso à pessoa com "Ver grupo" (INV-12, AC 4)
Proof: run api | ✓ e-mails do convite > entrada aprovada tem o assunto, o texto e o botão Ver grupo
Proof: run api | ✓ aprovar e recusar > enfileira o aviso de entrada aprovada e de entrada recusada
Proof: run api | ✓ desligar a aprovação > enfileira o aviso de entrada aprovada a cada pessoa aprovada

**C101** - Recusa enfileira o aviso à pessoa com "Ver meus grupos" (INV-12, AC 5)
Proof: run api | ✓ e-mails do convite > entrada recusada tem o assunto, o texto e o botão Ver meus grupos
Proof: run api | ✓ aprovar e recusar > enfileira o aviso de entrada aprovada e de entrada recusada

**C102** - Remoção enfileira o aviso à pessoa com "Ver meus grupos" (INV-12, AC 6)
Proof: run api | ✓ e-mails do convite > remoção tem o assunto, o texto e o botão Ver meus grupos
Proof: run api | ✓ remover participante > enfileira o aviso de remoção à pessoa

**C103** - Saída enfileira o aviso a quem organiza com "Ver participantes" (INV-12, AC 7)
Proof: run api | ✓ e-mails do convite > saída tem o assunto, o texto e o botão Ver participantes
Proof: run api | ✓ sair do grupo > enfileira o aviso de saída a quem organiza

**C104** - Transferência enfileira o aviso a quem recebe com "Ver grupo" (INV-12, AC 8)
Proof: run api | ✓ e-mails do convite > nova organização tem o assunto, o texto e o botão Ver grupo
Proof: run api | ✓ transferir organização > enfileira o aviso de nova organização a quem recebe

**C105** - Nomes com marcação HTML aparecem literais nos e-mails (INV-12, AC 9)
Proof: run api | ✓ e-mails do convite > mostram nomes de pessoa e de grupo com marcação HTML como texto

**C106** - Operação recusada ou desfeita não envia aviso (INV-12, AC 10)
Proof: run api | ✓ entrar pelo convite > não enfileira aviso quando a entrada é recusada
Proof: run api | ✓ aprovar e recusar > não emite evento nem aviso quando a ação é recusada
Proof: run api | ✓ remover participante > não emite evento nem aviso quando a remoção é recusada
Proof: run api | ✓ sair do grupo > não emite evento nem aviso quando a saída é recusada
Proof: run api | ✓ transferir organização > não emite evento nem aviso quando a transferência é recusada
Proof: run api | ✓ desligar a aprovação > não aprova nada quando a edição é recusada

**C107** - Convite válido aberto emite `invite.viewed` com o `groupId`; robôs de preview não emitem (INV-13, AC 1)
Proof: run api | ✓ abrir convite > emite invite.viewed com o groupId e sem código, nome ou id de pessoa
Proof: run api | ✓ abrir convite > não emite invite.viewed para robô de preview

**C108** - Participação pendente criada emite `membership.requested` (INV-13, AC 2)
Proof: run api | ✓ entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais

**C109** - Participação aprovada criada pelo link emite `membership.joined` (INV-13, AC 3)
Proof: run api | ✓ entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais

**C110** - Aprovação emite `membership.approved` com `trigger` `manual` ou `auto` (INV-13, AC 4)
Proof: run api | ✓ aprovar e recusar > emite membership.approved com trigger manual e membership.rejected
Proof: run api | ✓ desligar a aprovação > emite membership.approved com trigger auto para cada participação

**C111** - Recusa emite `membership.rejected` (INV-13, AC 5)
Proof: run api | ✓ aprovar e recusar > emite membership.approved com trigger manual e membership.rejected

**C112** - Saída emite `membership.left` (INV-13, AC 6)
Proof: run api | ✓ sair do grupo > emite membership.left sem dados pessoais

**C113** - Remoção emite `membership.removed` (INV-13, AC 7)
Proof: run api | ✓ remover participante > emite membership.removed sem dados pessoais

**C114** - Troca do link emite `invite.regenerated` (INV-13, AC 8)
Proof: run api | ✓ gerar novo link > emite invite.regenerated sem o código

**C115** - Envio de convites por e-mail emite `invite.emails_sent` com `count` (INV-13, AC 9)
Proof: run api | ✓ convidar por e-mail > emite invite.emails_sent com count e sem e-mails

**C116** - Transferência emite `group.ownership_transferred` (INV-13, AC 10)
Proof: run api | ✓ transferir organização > emite group.ownership_transferred sem dados pessoais

**C117** - Os eventos levam o `groupId` e nenhum nome, e-mail, código de convite ou id de pessoa (INV-13, AC 11)
Proof: run api | ✓ abrir convite > emite invite.viewed com o groupId e sem código, nome ou id de pessoa
Proof: run api | ✓ entrar pelo convite > emite membership.requested e membership.joined sem dados pessoais
Proof: run api | ✓ gerar novo link > emite invite.regenerated sem o código
Proof: run api | ✓ convidar por e-mail > emite invite.emails_sent com count e sem e-mails
Proof: run api | ✓ remover participante > emite membership.removed sem dados pessoais
Proof: run api | ✓ sair do grupo > emite membership.left sem dados pessoais
Proof: run api | ✓ transferir organização > emite group.ownership_transferred sem dados pessoais

**C118** - Operação recusada (4xx) ou que falha não emite o evento dela (INV-13, AC 12)
Proof: run api | ✓ abrir convite > não emite invite.viewed para código inválido nem acima do limite
Proof: run api | ✓ entrar pelo convite > não emite evento quando a entrada é recusada
Proof: run api | ✓ gerar novo link > não emite invite.regenerated quando a troca é recusada
Proof: run api | ✓ convidar por e-mail > não emite invite.emails_sent quando o envio é recusado
Proof: run api | ✓ aprovar e recusar > não emite evento nem aviso quando a ação é recusada
Proof: run api | ✓ remover participante > não emite evento nem aviso quando a remoção é recusada
Proof: run api | ✓ sair do grupo > não emite evento nem aviso quando a saída é recusada
Proof: run api | ✓ transferir organização > não emite evento nem aviso quando a transferência é recusada

**C119** - `/convite/{código}`, `/grupos/{id}/participantes`, `/grupos/{id}` e `/grupos` sem violações WCAG 2.1 A/AA no axe, nos temas claro e escuro (INV-14, AC 1)
Proof: run e2e | ✓ acessibilidade › /convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px
Proof: run e2e | ✓ acessibilidade › /grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px
Proof: run e2e | ✓ acessibilidade › /grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px
Proof: run e2e | ✓ acessibilidade › /grupos com card pendente sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px

**C120** - As quatro telas não rolam na horizontal em 360 px e 1440 px (INV-14, AC 2)
Proof: run e2e | ✓ acessibilidade › /convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px
Proof: run e2e | ✓ acessibilidade › /grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px
Proof: run e2e | ✓ acessibilidade › /grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px
Proof: run e2e | ✓ acessibilidade › /grupos com card pendente sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px

**C121** - Cada confirmação desta feature põe o foco no botão que mantém o estado e prende o Tab (INV-14, AC 3)
Proof: run web | ✓ InviteBlock > Gerar novo link confirma com os textos da spec e foco em Manter link
Proof: run web | ✓ MemberActions > Remover do grupo confirma com os textos da spec e foco em Manter no grupo
Proof: run web | ✓ MemberActions > Transferir organização confirma com os textos da spec e foco em Manter organização
Proof: run web | ✓ LeaveGroup > confirma com os textos da spec e foco em Ficar no grupo
Proof: run web | ✓ ConfirmDialog > põe o foco em Manter grupo e prende o Tab

**C122** - "Link copiado" e "Novo link gerado" são anunciados a leitores de tela (INV-14, AC 4)
Proof: run web | ✓ InviteBlock > Copiar link copia e anuncia Link copiado
Proof: run web | ✓ InviteBlock > confirmar mostra o link novo e anuncia Novo link gerado

**C123** - Dois toques simultâneos em "Entrar no grupo" criam uma participação e um aviso (Edge Cases, INV-03 AC 4, INV-12 AC 3)
Proof: run api | ✓ entrar pelo convite > duas entradas simultâneas da mesma pessoa criam uma participação e um aviso

**C124** - Entrada simultânea à mudança para SORTEADO cria antes ou responde 409, nunca participação em grupo SORTEADO (Edge Cases, INV-03 AC 5)
Proof: run api | ✓ entrar pelo convite > entrada simultânea à mudança para SORTEADO cria antes ou responde 409

**C125** - Entrada com o código antigo logo depois da troca responde 404 (Edge Cases, INV-03 AC 7)
Proof: run api | ✓ gerar novo link > o código antigo passa a responder 404 ao abrir e ao entrar

**C126** - Duas transferências simultâneas aplicam uma e a outra recebe 403 (Edge Cases, INV-09 AC 6)
Proof: run api | ✓ transferir organização > duas transferências simultâneas aplicam uma e a outra recebe 403

**C127** - Aprovar e recusar o mesmo pedido ao mesmo tempo aplica o primeiro e envia só o aviso dele (Edge Cases, INV-04 AC 9)
Proof: run api | ✓ aprovar e recusar > aprovar e recusar ao mesmo tempo aplica o primeiro e envia só o aviso dele

**C128** - Sair enquanto quem organiza remove aplica o primeiro; o segundo responde 404 ou o estado atual (Edge Cases, INV-07, INV-08)
Proof: run api | ✓ sair do grupo > sair enquanto quem organiza remove aplica o primeiro e o segundo responde 404 ou o estado atual

**C129** - Com 20 visíveis não aparece "Carregar mais"; com 21 aparece (Edge Cases, INV-05 AC 3)
Proof: run api | ✓ lista de participantes > com 20 visíveis não devolve cursor e com 21 devolve
Proof: run web | ✓ ParticipantsList > Carregar mais acrescenta a página seguinte ao fim e some sem cursor

**C130** - Exatamente 20 endereços distintos passam; 21 são recusados (Edge Cases, INV-11 AC 4)
Proof: run api | ✓ convidar por e-mail > aceita 20 endereços distintos e recusa 21 sem enviar nenhum
Proof: run shared | ✓ validateInviteEmails > aceita 20 endereços distintos e recusa 21 com Envie no máximo 20 e-mails por vez.

**C131** - O 100º convite das 24 horas passa; o envio que levaria a 101 recebe 429 inteiro (Edge Cases, INV-11 AC 6)
Proof: run api | ✓ convidar por e-mail > aceita o envio que chega a 100 em 24 horas e recusa com 429 o que passaria, sem enviar nenhum

**C132** - `%` e `_` na busca são texto, não curinga (Edge Cases, INV-05 AC 4)
Proof: run api | ✓ lista de participantes > trata % e _ da busca como texto

**C133** - Nome do grupo com marcação HTML aparece literal na página do convite e nas meta tags (Edge Cases, INV-02 AC 1, AC 12)
Proof: run web | ✓ InviteView > mostra nome com marcação HTML como texto
Proof: run web | ✓ inviteMetadata > mantém marcação HTML do nome como texto nas meta tags

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** T1 (2026-11-23), lista de e-mails do convite: os inválidos aparecem em "Confira estes e-mails: {lista}" separados por ", ", na ordem e na grafia digitadas, cada repetido uma vez só (user: "Vírgula, como digitado (Recomendado)"); com inválidos e mais de 20 ao mesmo tempo, vale a mensagem dos inválidos (user: "Inválidos primeiro (Recomendado)"); o limite de 20 conta só os válidos distintos (user: "Só os válidos (Recomendado)"). T3 (2026-11-23): os testes `criar grupo > cria o grupo ABERTO só com o nome...` e `ver grupo > devolve os dados do grupo...` da `04-groups` comparam o corpo inteiro com `toEqual`; recebem `inviteCode` no corpo esperado, com o valor lido do banco, em vez de ficarem sem mudança (user: "Acrescentar o código (Recomendado)"). O teste `tabela group > é criada pela migration com as colunas do grupo` recebe a coluna `inviteCode` na lista esperada, e os INSERTs de preparação de `group-table`, `membership-table` e `group-access` passam a gravar um código, sem mexer em asserção (user: "Acrescentar a coluna (Recomendado)").
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
Phase 2:  T9 → T10 → T11 → T12 → T13 → T14
Phase 3:  T15 → T16 → T17 → T18 → T19
Phase 4:  T20 → T21 → T22 → T23 → T24
Phase 5:  T25 → T26 → T27 → T28 → T29 → T30
Phase 6:  T31 → T32 → T33 → T34 → T35 → T36 → T37
```

Execução inline, uma fase por vez, cada fase num PR contra a `main` (AD-010); sem sub-agentes de lote. Ao fim da fase 6: `check_proofs.py`, walk das histórias, Verifier e screens sub-agent (só se houver captura), correções, `validate_verification.py` e lições, antes do push.
