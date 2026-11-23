# Invites Design

**Spec**: `.specs/features/05-invites/spec.md`
**Status**: Approved
**Approved**: 2026-11-23 - user: "Aprovo o design." (inclui os 15 padrões propostos no design)
**Project decisions**: AD-016 revisado (limite por IP antes de procurar o código do convite) e AD-017 (`WEB_URL` no site; repasse de `X-Forwarded-For` e `User-Agent` nas chamadas do servidor do Next).

---

## Architecture Overview

A API ganha o módulo `invites`, com dois controllers: o do convite (`/invites/:code`, abrir e entrar) e o dos participantes do grupo (`/groups/:id/...`, lista, aprovar, recusar, remover, sair, transferir, gerar link e convidar por e-mail). Os dois serviços usam o `GroupAccess` da `04-groups` para 404, 403 e trava da linha, o `RateLimitService` (AD-014), o `EmailService.enqueueMany` na mesma transação e o `BusinessEventsService` depois do commit. O grupo ganha a coluna `inviteCode`, e uma tabela nova `email_invite` grava cada envio por e-mail.

O site ganha `/convite/[code]`, pública, montada no servidor (o preview do WhatsApp lê o HTML), e as abas do grupo: `/grupos/[id]` (Grupo) e `/grupos/[id]/participantes`, num layout comum com o cabeçalho do grupo e a navegação das abas. A imagem fixa do preview é uma rota estática gerada com `next/og`.

```mermaid
flowchart LR
    subgraph Navegador
      IV[Página do convite<br/>botão Entrar]
      PV[Aba Participantes<br/>bloco de convite, lista, ações]
    end
    subgraph Next["apps/web (Next)"]
      P[proxy.ts<br/>/api/* -> API]
      SC[Server Components<br/>/convite/code, /grupos/id, /participantes]
      OG[/og/convite.png<br/>next/og, estática]
    end
    subgraph Shared["packages/shared"]
      V[parseInviteEmails<br/>tipos das respostas]
    end
    subgraph API["apps/api (Nest)"]
      IC[InvitesController<br/>/invites/:code]
      MC[GroupMembersController<br/>/groups/:id/...]
      IS[InvitesService]
      MS[MembersService]
      GA[GroupAccess]
      RL[RateLimitService]
      ES[EmailService.enqueueMany]
      BE[BusinessEventsService]
      GS[GroupsService<br/>create, update, listMine]
    end
    DB[(PostgreSQL<br/>group.inviteCode, membership,<br/>email_invite, job, rate_limit)]

    IV & PV -->|fetch /api + X-CSRF-Token| P --> IC & MC
    SC -->|GET + Cookie + X-Forwarded-For + User-Agent| IC & MC
    PV -.usa.-> V
    IC --> IS
    MC --> IS & MS
    IS & MS --> GA
    IS & MS --> RL
    IS & MS -->|na mesma transação| ES
    IS & MS -->|depois do commit| BE
    IS -.usa.-> V
    GA & IS & MS & ES & RL & GS --> DB
```

Entrar pelo convite:

```mermaid
sequenceDiagram
    participant B as Navegador
    participant A as API (InvitesService)
    participant D as PostgreSQL
    B->>A: POST /invites/:code/join
    A->>D: consume invites.view:ip (60/min, ou 600/min para robô)
    alt IP acima do limite
        A-->>B: 429 "Muitas tentativas..." (antes de procurar o código)
    else
        A->>D: BEGIN; SELECT group WHERE inviteCode = lower(code) FOR UPDATE
        alt código com formato errado ou inexistente
            A-->>B: 404 "Convite não encontrado."
        else grupo SORTEADO ou ENCERRADO
            A-->>B: 409 com a mensagem do status
        else já tem participação
            A-->>B: 200 com o estado atual (nada muda, nenhum aviso)
        else nova participação
            A->>D: consume invites.join:user (30/h)
            alt conta acima do limite
                A-->>B: 429 (ROLLBACK)
            else
                A->>D: INSERT membership (APPROVED ou PENDING)
                A->>D: INSERT job email.send para quem organiza
                A->>D: COMMIT
                A->>A: membership.joined ou membership.requested
                A-->>B: 200 { status, groupId }
            end
        end
    end
```

Duas entradas simultâneas da mesma pessoa: a segunda espera a trava do grupo, encontra a participação criada e devolve o estado dela, sem segundo aviso; a restrição única `(groupId, userId)` segura o caso que escapar. Uma entrada e uma mudança de status para SORTEADO disputam a mesma trava: uma vê o resultado da outra.

Aprovar, recusar, remover, sair, transferir e gerar link seguem o mesmo molde: `GroupAccess.requireOrganizer` (ou `requireMember` para sair) com `lock: true`, conferência de status, mudança, avisos na transação e evento depois do commit.

**Onde as regras rodam.** Quem vê o quê, ordem, paginação, busca sem acento, contagem de aprovados, pendentes no card e os estados do convite: API (SQL e serviço, testes de integração). Separação e validação da lista de e-mails e as mensagens: `packages/shared` (testes de unidade), usada pelo formulário e pela API. Textos por estado, botões por papel e status, mensagem do WhatsApp, rótulo de participantes: componentes e funções puras do site (testes de componente e de unidade). Nada é filtrado, ordenado ou contado no navegador: "Carregar mais" só acrescenta ao fim o que a API devolveu.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `GroupAccess` | `apps/api/src/groups/group-access.service.ts` | `requireMember` / `requireOrganizer` com `lock` em toda rota de grupo; exportado pelo `GroupsModule` |
| `GROUP_NOT_FOUND`, `ORGANIZER_ONLY` | `apps/api/src/groups/group-access.service.ts` | Mesmas mensagens de 404 e 403 |
| `RateLimitService`, `rateLimitKey`, `TooManyAttemptsException` | `apps/api/src/rate-limit/` | Limites de abrir, entrar e gerar link; `rateLimitKey` ganha o tipo `group` |
| `EmailService.enqueueMany` | `apps/api/src/email/email.service.ts` | Avisos e convites na mesma transação |
| `email-blocks.ts` (`greeting`, `paragraph`, `button`, `siteUrl`) e `escapeHtml` do layout | `apps/api/src/email/` | Os 8 e-mails; o layout já escapa o texto (INV-12 AC 9) |
| `BusinessEventsService` | `apps/api/src/observability/business-events.service.ts` | Os 10 eventos, depois do commit |
| `@Public()`, `request.auth` opcional | `apps/api/src/auth/` | `GET /invites/:code` lê a sessão quando existe |
| `group-helpers.ts` (`insertUser`, `insertGroup`, `insertMembership`, `captureEvents`) | `apps/api/test/group-helpers.ts` | Testes de integração; `insertGroup` passa a gravar `inviteCode` |
| `GroupValidationException` (400 com `fields`) | `apps/api/src/groups/group-validation.exception.ts` | Lista de e-mails inválida (AD-015) |
| `apiServerFetch`, `apiFetch`, `getGroup`, `requireUser`, `getCurrentUser` | `apps/web/src/lib/` | Leituras no servidor e mutações com CSRF |
| `ConfirmDialog`, `StatusTag`, `GroupCard`, `UserAvatar`, `dropdown-menu`, `Alert` | `apps/web/src/components/` | Confirmações, tags, card de pendente, avatar da linha, menu de ações |
| `GroupDetailView`, `GroupActions` | `apps/web/src/app/grupos/[id]/` | A aba Grupo continua sendo esta tela; ganha "Sair do grupo" |
| `safeNext` e o `next` do cadastro e do Google | `apps/web/src/lib/safe-next.ts`, `apps/api/src/auth/safe-next.ts` | Volta a `/convite/{código}` depois de entrar ou criar conta (INV-03 AC 11) |
| `Plus_Jakarta_Sans` | `apps/web/src/app/layout.tsx` | Mesma família da imagem do preview (arquivo `.ttf` à parte) |

### Integration Points

| System | Integration Method |
| --- | --- |
| `GroupsService.create` | Gera o `inviteCode` ao criar |
| `GroupsService.update` | Ao desligar "Exigir aprovação", aprova os pendentes na mesma transação, enfileira um aviso por pessoa e emite `membership.approved` (`trigger: auto`) para cada uma |
| `GroupsService.listMine` | Passa a trazer participações pendentes (card sem link) e, para quem organiza, a contagem de pendentes |
| `GroupDetail` | Ganha `inviteCode` (só participante aprovado lê o grupo) |
| Banco | Coluna `group.inviteCode` (única), tabela `email_invite`, extensão `unaccent` |
| Site | Layout de abas em `app/grupos/[id]/(tabs)/`; `/grupos/[id]/editar` fica fora das abas |

---

## Components

### Shared: tipos e regras do convite (`packages/shared/src/invites.ts`)

- **Purpose**: Tipos das respostas novas e a regra da lista de e-mails com as mensagens (AD-015).
- **Interfaces**:
  - `parseInviteEmails(text: string): { emails: string[]; invalid: string[] }`: separa por vírgula, ponto e vírgula, espaço ou quebra de linha; descarta vazios; repetidos (sem diferenciar maiúsculas) contam uma vez, em minúsculas.
  - `validateInviteEmails(text: string): { emails: string[]; fields: { emails?: string } }`: vazio "Informe pelo menos um e-mail."; inválidos "Confira estes e-mails: {lista}"; mais de 20 distintos "Envie no máximo 20 e-mails por vez.".
  - `INVITE_MESSAGES`: os textos de erro acima.
  - Tipos: `InviteView`, `InviteViewer`, `JoinResult`, `MemberItem`, `MembersPage`, `InviteEmailsResult`; `GroupSummary` e `GroupDetail` ampliados (ver Data Models).
- **Reuses**: o padrão de `validateGroupInput`; a regra de e-mail do site (`apps/web/src/lib/email.ts`) passa para o shared e o site importa de lá.

### API: código do convite (`apps/api/src/invites/invite-code.ts`)

- **Purpose**: Gerar e reconhecer códigos.
- **Interfaces**:
  - `generateInviteCode(): string`: 10 caracteres de `23456789abcdefghjkmnpqrstuvwxyz` com `crypto.randomInt`.
  - `normalizeInviteCode(raw: string): string | null`: minúsculas; `null` se o formato não bate (vira 404 sem consulta ao banco).

### API: robôs de preview (`apps/api/src/invites/preview-bots.ts`)

- **Purpose**: Reconhecer pelo `User-Agent` os robôs que montam previews.
- **Interfaces**: `isPreviewBot(userAgent: string | undefined): boolean`: WhatsApp, facebookexternalhit, Facebot, TelegramBot, Slackbot, Twitterbot, Discordbot, LinkedInBot.
- **Uso**: escolhe a chave do limite por IP (60 ou 600 por minuto) e decide se `invite.viewed` sai.

### API: `InvitesModule`

- **Location**: `apps/api/src/invites/`
- **Imports**: `GroupsModule` (`GroupAccess`, repositórios), `EmailModule`, `RateLimitModule`, `TypeOrmModule.forFeature([EmailInvite])`.

#### `InvitesController` (`/invites`)

- `GET /invites/:code` com `@Public()` → `InviteView`. Limite por IP antes de tudo (AD-016 revisado); 404 "Convite não encontrado." para formato errado, código inexistente ou trocado.
- `POST /invites/:code/join` → `JoinResult`. Limite por IP antes de procurar o código; depois o fluxo do diagrama.

#### `GroupMembersController` (`/groups/:id`)

- `GET /groups/:id/members?search=&cursor=` → `MembersPage`.
- `POST /groups/:id/members/:membershipId/approve` com `{ from }` → `MemberItem`.
- `POST /groups/:id/members/:membershipId/reject` com `{ from }` → `MemberItem`.
- `DELETE /groups/:id/members/:membershipId` → 204 (remover: participação vira `REJECTED`).
- `POST /groups/:id/leave` → 204 (apaga a participação).
- `POST /groups/:id/transfer` com `{ membershipId }` → `GroupDetail`.
- `POST /groups/:id/invite/regenerate` → `{ inviteCode }`.
- `POST /groups/:id/invite/emails` com `{ emails: string }` → `InviteEmailsResult` (`{ count }`).

#### `InvitesService`

- `view(code, viewer, client)`, `join(code, user, client)`, `regenerate(user, groupId)`, `sendEmails(user, groupId, text)`.
- `client` é `{ ip, userAgent }` lido da requisição (o IP pelo `trust proxy`).
- `sendEmails`: valida com `validateInviteEmails` (400 com `fields`); confere também cada endereço com o `isEmail` do `class-validator`, que o `EmailService` usa, e põe os recusados na mesma mensagem; dentro da transação com o grupo travado, conta os `email_invite` das últimas 24 horas e recusa com 429 se `contagem + novos > 100`; grava os envios e enfileira os e-mails.

#### `MembersService`

- `list(userId, groupId, { search, cursor })`, `approve`, `reject`, `remove`, `leave`, `transfer`.
- `approve` / `reject` aceitam a participação no estado pedido e devolvem o estado atual sem aviso (INV-04 AC 9).
- `from` (`PENDING` ou `REJECTED`) é o status que a tela mostrava; se a participação não está mais nele, a API devolve o estado atual sem aviso, e só o primeiro de aprovar e recusar simultâneos vale, nas duas ordens. Recusar um aprovado responde 404 "Participante não encontrado." (decisões de 2026-11-23, na execução).
- `transfer`: status ENCERRADO 409 "Grupo encerrado não pode ser alterado."; alvo que não é aprovado ou é quem organiza 404 "Participante não encontrado."; troca `group.ownerId`.

#### `invite-emails.ts`

- Os 8 e-mails do INV-12 (`emailInviteEmail`, `joinRequestEmail`, `memberJoinedEmail`, `approvedEmail`, `rejectedEmail`, `removedEmail`, `memberLeftEmail`, `ownershipEmail`), com "Olá, {nome}." antes do texto, como na `04-groups`. O convite por e-mail vai a quem não tem nome conhecido: abre com "Olá." no lugar da saudação com nome.

#### `EmailInviteLimitException`

- 429 com "Este grupo chegou ao limite de 100 convites por e-mail em 24 horas. Tente de novo em N horas." ("em 1 hora."; "em N minutos." abaixo de 1 hora) e `retryAfterSeconds`, que o `AllExceptionsFilter` já grava no `Retry-After`. N sai do envio que precisa sair da janela para caber o pedido.

### API: mudanças na `04-groups`

- `Group.inviteCode` (`varchar(10)`, único, não nulo); `GroupsService.create` gera o código e, na rara colisão (violação da restrição única), gera outro uma vez.
- `GroupsService.update`: `requiresApproval` de `true` para `false` aprova os `PENDING` do grupo na transação; avisos e eventos como em `approve`.
- `GroupsService.listMine`: ver Data Models.
- `rateLimitKey` aceita o tipo `group`.
- `group-helpers.ts` (testes): `insertGroup` grava um `inviteCode` gerado.

### Web: dados do servidor (`apps/web/src/lib/invites.ts`, `lib/members.ts`)

- `getInvite(code)`: chama `GET /invites/:code` com o cookie, o `X-Forwarded-For` e o `User-Agent` recebidos (AD-017); 404 vira `null`, 429 vira `{ tooMany: mensagem }`, outro status lança.
- `getMembers(groupId)`: primeira página para a aba.
- `apiServerFetch(path, { forwardClient?: boolean })`: repassa os dois cabeçalhos quando pedido.
- `siteUrl()`: lê `WEB_URL` (padrão `http://localhost:3000` fora de produção; ausente em produção lança).

### Web: telas

| Rota / componente | Papel |
| --- | --- |
| `app/convite/[code]/page.tsx` | Server Component público; `generateMetadata` monta título, descrição e `openGraph` (imagem `/og/convite.png`, 1200 x 630); participante aprovado vai para `/grupos/{id}` com `redirect`; os outros estados mostram o texto do INV-02 |
| `app/convite/[code]/join-button.tsx` | Client; "Entrar no grupo" ou "Pedir para entrar", "Entrando…", erro genérico; depois do pedido pendente, `router.refresh()` |
| `app/convite/[code]/not-found.tsx` | "Convite não encontrado" e o texto da spec |
| `app/og/convite.png/route.tsx` | `ImageResponse` estática (`dynamic = 'force-static'`) com a Plus Jakarta Sans de `apps/web/assets/` |
| `app/layout.tsx` | `metadataBase` a partir de `WEB_URL` (via `generateMetadata`, lido na requisição) |
| `app/grupos/[id]/(tabs)/layout.tsx` | Lê o grupo (`cache`), `notFound()` se nulo; cabeçalho e `GroupTabs` |
| `app/grupos/[id]/(tabs)/page.tsx` | Aba Grupo: `GroupDetailView` atual, sem o cabeçalho que sobe para o layout, com "Sair do grupo" |
| `app/grupos/[id]/(tabs)/participantes/page.tsx` | Aba Participantes: `InviteBlock` e `ParticipantsList` com a primeira página |
| `components/group-tabs.tsx` | `nav` com dois links e `aria-current="page"` na aba atual (são rotas, não `role="tablist"`) |
| `components/invite-block.tsx` | WhatsApp, campo só leitura, "Copiar link" (Clipboard API; se recusar, seleciona o texto), aviso `role="status"`; para quem organiza, "Convidar por e-mail" e "Gerar novo link"; SORTEADO e ENCERRADO trocam o bloco pelo aviso |
| `components/email-invite-form.tsx` | `textarea` "E-mails", `validateInviteEmails` antes de enviar, "Enviando…" |
| `components/participants-list.tsx` | Busca com espera de 300 ms entre teclas, "Carregar mais", "Ninguém encontrado com esse nome.", total de aprovados |
| `components/participant-row.tsx` | Avatar, nome com reticências, tags, botões de ícone "Aprovar {nome}" / "Recusar {nome}", menu com "Transferir organização" e "Remover do grupo" |
| `components/group-card.tsx` | Variante sem link para pendente ("Organizado por {nome}", "Aguardando aprovação"); "N pendentes" para quem organiza |
| `lib/whatsapp.ts` | `whatsappShareUrl(groupName, link)` |

---

## Data Models

### Group (`group`), coluna nova

```typescript
@Index({ unique: true })
@Column({ type: 'varchar', length: 10 })
inviteCode: string;
```

Migration `AddGroupInviteCode`: cria a coluna nula, preenche cada grupo existente com um código gerado em TypeScript (`crypto.randomInt`), torna `NOT NULL` e cria o índice único.

### EmailInvite (`email_invite`)

```typescript
@Entity('email_invite')
@Index(['groupId', 'createdAt'])
export class EmailInvite {
  id: string;            // uuid
  groupId: string;       // FK group, ON DELETE CASCADE
  email: string;         // varchar(254), em minúsculas
  createdAt: Date;       // timestamptz, default now()
}
```

Guarda o envio para o limite de 24 horas e para a retenção da `10-lifecycle` (`scope.md` 8.1). Nenhuma tela lê.

### Extensão `unaccent`

Migration `EnableUnaccent`: `CREATE EXTENSION IF NOT EXISTS unaccent`. Busca e ordem usam `lower(unaccent(u.name))`. A lista filtra antes por `membership.groupId`, coberto pela restrição única `(groupId, userId)`; não há índice de expressão (o `unaccent` não é `IMMUTABLE`).

### Respostas (`packages/shared`)

```typescript
// Snake_case: conjunto fechado novo, fora dos status em maiúsculas.
type InviteViewer = 'anonymous' | 'none' | 'pending' | 'rejected' | 'member';

type InviteView = {
  groupName: string;
  organizerName: string;
  groupStatus: GroupStatus;
  requiresApproval: boolean;
  viewer: InviteViewer;
  groupId: string | null; // só quando viewer = 'member'
};

type JoinResult = { status: MembershipStatus; groupId: string | null }; // groupId só se APPROVED

type MemberItem = {
  membershipId: string;
  name: string;
  avatarUrl: string | null;
  status: MembershipStatus;
  isOrganizer: boolean;
};

type MembersPage = {
  items: MemberItem[];
  nextCursor: string | null;
  approvedCount: number; // total de aprovados do grupo, sem a busca
};

type InviteEmailsResult = { count: number };

// GroupSummary ganha:
//   membershipStatus: 'APPROVED' | 'PENDING';
//   organizerName: string;
//   pendingCount: number | null; // só para quem organiza
// GroupDetail ganha:
//   inviteCode: string;
```

`MembershipStatus` passa da entidade para o shared. "Meus grupos": participações `APPROVED` e `PENDING`; `REJECTED` não aparece; pendentes ficam em `active`, na mesma ordem (do grupo mais novo para o mais antigo).

### Cursor da lista

Ordem: `rank` (0 pendente, 1 aprovado, 2 recusado; quem não organiza só recebe aprovados), `lower(unaccent(u.name))`, `membership.id`. O cursor é o trio do último item em JSON codificado em base64url; a página seguinte usa `(rank, nome, id) > (cursor)`. A API busca 21 para saber se há próxima página. Cursor que não decodifica: 400 "Dados inválidos.". A busca escapa `%`, `_` e `\` antes do `LIKE ... ESCAPE '\'`.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| IP acima do limite ao abrir ou entrar | `TooManyAttemptsException` antes de procurar o código | Página do convite com "Muitas tentativas. Tente de novo em N minutos."; preview sem dados |
| Código com formato errado, inexistente ou trocado | 404 "Convite não encontrado." | "Convite não encontrado" e o texto da spec, iguais nos três casos |
| Entrar com o grupo SORTEADO ou ENCERRADO | 409 com a mensagem do status | Texto do estado, sem botão |
| Já participa (qualquer status) | 200 com o estado atual, sem gravar | Página do convite no estado da pessoa |
| Conta acima de 30 entradas na hora | 429, transação desfeita | Mensagem no lugar do botão |
| Erro inesperado ao entrar (5xx, rede) | `apiFetch` devolve a falha | "Não foi possível entrar no grupo. Tente de novo." e o botão continua |
| Ação de organizador por quem não organiza | 403 "Só quem organiza pode alterar o grupo." | Não acontece pela tela (sem botões) |
| Participação inexistente ou de outro grupo; `membershipId` que não é UUID | 404 "Participante não encontrado." | A lista recarrega |
| Aprovar, recusar, remover, sair, gerar link ou convidar com o grupo não ABERTO | 409 "Com o sorteio feito, ninguém entra nem sai do grupo." | Mensagem num `Alert` |
| Remover quem organiza / organizador sair | 409 com a mensagem da spec | Sem botão na tela; mensagem se vier pela API |
| Lista de e-mails inválida | 400 com `fields.emails` (AD-015) | Mensagem embaixo do campo (o site já barra antes) |
| Mais de 100 convites por e-mail em 24 horas | `EmailInviteLimitException` 429 + `Retry-After` | Mensagem com horas ou minutos |
| Falha no meio de qualquer mutação | Transação desfeita: participação, e-mails e evento ficam como antes | Mensagem genérica; nada pela metade |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| --- | --- | --- | --- |
| `insertGroup` dos testes não grava `inviteCode`; com a coluna `NOT NULL`, toda suíte de grupos quebra | `apps/api/test/group-helpers.ts:107` | Testes da `04-groups` vermelhos | A task da migration atualiza o helper no mesmo commit |
| O cabeçalho do grupo sai de `GroupDetailView` para o layout das abas | `apps/web/src/app/grupos/[id]/group-detail-view.tsx:47`, `group-detail-view.test.tsx` | Testes de componente da `04-groups` que procuram o `h1` | A task do layout move as asserções do cabeçalho para o teste do layout; os e2e de `groups.spec.ts` continuam valendo |
| `/grupos/[id]/editar` ficaria dentro do layout das abas | `apps/web/src/app/grupos/[id]/editar/` | Abas na tela de edição | Route group `(tabs)`: só Grupo e Participantes ficam no layout |
| `GroupSummary` ganha campos; o card vira link ou não conforme o status | `apps/web/src/components/group-card.tsx:8`, `my-groups-view.test.tsx` | Testes do card e de "Meus grupos" | Atualizados na task do card |
| Desligar a aprovação passa a aprovar pendentes dentro do `update` | `apps/api/src/groups/groups.service.ts:224` | Muda a resposta da `04-groups` para um caso que antes não tinha efeito | Teste de integração novo; os existentes de `update` não têm pendentes |
| O `CurrentUser` documenta "só existe em rota que exige sessão" | `apps/api/src/auth/decorators/current-user.decorator.ts:5` | Em `GET /invites/:code` o usuário pode faltar | Usa `CurrentUser` com tipo `SessionUser \| undefined` e o comentário passa a dizer que em rota `@Public()` ele pode faltar |
| Depois de 30 entradas na hora, o 429 da conta só sai para código válido | `InvitesService.join` | Uma conta poderia distinguir código válido de inválido | O limite por IP (60/min) vem antes e vale para os dois; adivinhar entre 31^10 códigos continua inviável |
| User-Agent falsificado como robô ganha 600/min | `preview-bots.ts` | Mais tentativas por IP | Aceito na decisão do usuário; 600/min ainda deixa a adivinhação inviável |
| `X-Forwarded-For` repassado pelo Next pode vir forjado pelo cliente | `apps/web/src/lib/api-server.ts` | Burlar o limite por IP | A API só confia nos `TRUST_PROXY_HOPS` saltos (AD-014, AD-017), como já acontece no `proxy.ts` |
| Imagem do preview depende do `.ttf` no repositório | `apps/web/assets/` | Build falha sem o arquivo | Arquivo versionado; a rota é gerada no build e o teste de unidade da rota lê o arquivo |
| `metadataBase` em produção sem `WEB_URL` | `apps/web/src/app/layout.tsx` | Preview com URL errada | `siteUrl()` lança em produção sem a variável; o `.env.example` e o README ganham a variável |
| Grupo grande e "Carregar mais" com `unaccent` sem índice | `MembersService.list` | Lento em grupos enormes | Filtra por `groupId` primeiro; RN14 não limita, mas grupos de milhares são raros; anotado para medir |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Módulo da API | Módulo novo `invites` (convite, entrada, e-mails e a lista com as ações sobre participantes), que importa o `GroupAccess` do `GroupsModule` | O `groups.service` não cresce; a `04-groups` muda pouco - user: "Módulo invites (Recomendado)", entre essa, "Tudo no GroupsModule" e "Dois módulos" |
| Limite de 100 e-mails em 24 horas | Conta os `email_invite` das últimas 24 horas dentro da transação que trava o grupo | Exato e sem corrida; o tempo de espera sai do envio mais antigo - user: "Contar na tabela de convites (Recomendado)", entre essa e "Tabela rate_limit" |
| Paginação | Cursor opaco com (grupo de status, nome sem acento, id) | Aprovar ou recusar com a lista aberta não pula nem repete ninguém - user: "Cursor (Recomendado)", entre essa e "Offset" |
| Busca e ordem sem acento | Extensão `unaccent`, `lower(unaccent(nome))` | Vem com o PostgreSQL - user: "Extensão unaccent (Recomendado)", entre essa, "translate() no SQL" e "Coluna normalizada" |
| URL do site | `WEB_URL` no `apps/web` (AD-017) | `metadataBase` e o link do bloco - user: "WEB_URL no site (Recomendado)", entre essa, "Cabeçalhos da requisição" e "API devolve a URL" |
| IP no convite montado no servidor | O servidor do Next repassa `X-Forwarded-For` e `User-Agent` (AD-017) | O limite por IP vale por pessoa - user: "Repassar X-Forwarded-For (Recomendado)", entre essa e "Carregar no navegador" |
| Robôs e `invite.viewed` | Robôs de preview não emitem `invite.viewed` | Funil do `scope.md` 10 mais fiel - user: "Ignorar robôs de preview (Recomendado)", entre essa e "Contar tudo" |
| Fonte da imagem do preview | Plus Jakarta Sans `.ttf` (OFL) em `apps/web/assets/` | Igual à marca - user: "Plus Jakarta Sans no repo (Recomendado)", entre essa e "Fonte padrão do next/og" |
| Limite dos robôs | Chave própria, 600 por minuto por IP | Preview não falha no pico - user: "Limite próprio de 600/min (Recomendado)" (spec emendada, INV-02 AC 14 e 15) |
| Ordem do 429 no convite | Limite por IP antes de procurar o código, ao abrir e ao entrar | Não revela quais códigos existem - user: "429 antes no convite (Recomendado)" (AD-016 revisado, INV-02 AC 16) |
| Rotas da API | As do componente `InvitesModule`; participante identificado por `membershipId`, nunca por id de pessoa | Nenhum id de pessoa sai na lista - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Código gerado em TypeScript | `crypto.randomInt` no serviço e na migration de preenchimento; colisão gera outro código uma vez | Sem `pgcrypto`; 31^10 códigos - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Formato errado do código | 404 sem consulta ao banco | Igual a código inexistente - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Entrar conta no limite por IP de abrir | `POST /invites/:code/join` consome a mesma chave por IP de `GET` | Sem isso, uma conta testaria códigos sem limite - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Limite de 30 entradas por conta | Conta só entradas que criam participação, consumido dentro da transação depois das conferências | A spec conta grupos em que a pessoa entrou - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Limite de gerar link | Chave `invites.regenerate:group:{id}`, consumida depois de 404, 403 e 409 | Ordem do AD-016 nas rotas de grupo - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Remover | Participação vira `REJECTED` (decisão de produto); `DELETE` porque some dos aprovados | Volta pelo "Aprovar" dos recusados - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Sair | Apaga a participação | Quem sai é tratado como quem nunca participou (INV-08 AC 4) - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| E-mail de convite sem nome | Abre com "Olá." | Quem recebe pode não ter conta - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| E-mail recusado pelo `isEmail` da API | Entra na lista "Confira estes e-mails" | O `EmailService` recusaria o endereço com erro 500 - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Abas | Route group `app/grupos/[id]/(tabs)/` com layout; `nav` com links e `aria-current="page"`, sem `role="tablist"` | As abas são rotas; `/editar` fica fora - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Imagem do preview | Rota estática `/og/convite.png` com `ImageResponse`, citada no `openGraph.images` do `generateMetadata` | O teste de unidade confere a URL nas meta tags, sem depender de herança de arquivo de metadados - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Conteúdo da imagem | Fundo do tema claro, "Amigo Secreto" em destaque com o acento dourado (`festive`) e a linha "Sorteio, lista de desejos e mensagens secretas" | Marca do design system - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Busca no site | Espera 300 ms depois da última tecla e cancela a busca anterior | Uma ida à API por palavra digitada - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Transferir no site | Depois do sucesso, `router.refresh()` | A página volta sem as ações de quem organiza (INV-09 AC 3) - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Eventos de aprovação automática | Um `membership.approved` (`trigger: auto`) por participação aprovada | Cada participação conta uma vez no funil - padrão do agente, aprovado com o design, user: "Aprovo o design." |
| Regra de e-mail do site | `isValidEmail` passa de `apps/web/src/lib/email.ts` para o shared; o site importa de lá | Uma regra só para o formulário e a API - padrão do agente, aprovado com o design, user: "Aprovo o design." |
