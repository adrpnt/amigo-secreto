# STATE

## Decisions

### AD-001

- **Decision**: O MVP descrito em `.specs/docs/scope.md` é construído em 12 features, nesta ordem, uma por vez (spec, design, tasks, implementação e verificação de uma feature antes de abrir a próxima).
- **Reason**: Features menores cabem em poucos lotes de tasks, são aprovadas e verificadas com menos esforço, e as lições da verificação de cada uma entram nas specs seguintes. Escolha do usuário em 2026-11-12, entre "12 features", "8 features maiores" e "uma spec para o MVP"; e entre "uma feature por vez", "todas as specs primeiro" e "specs e designs primeiro".
- **Trade-off**: Mais ciclos de aprovação; a visão detalhada das features do fim só existe quando elas chegam.
- **Scope**: Todo o projeto. Dono de cada parte do escopo:

  | # | Feature | Prefixo | Conteúdo |
  | --- | --- | --- | --- |
  | 1 | `foundation` | FND | Monorepo pnpm + Turborepo; `apps/api` (NestJS + TypeORM + PostgreSQL); `apps/web` (Next.js + Tailwind + shadcn/ui com os tokens do design system); `packages/shared`; testes, lint, CI, logs, monitoramento de erros (Sentry, decidido em 2026-11-12), Swagger, health check |
  | 2 | `email-jobs` | JOB | Tabela `Job` + `@Cron` + `FOR UPDATE SKIP LOCKED` + retry; envio de e-mail pelo Resend |
  | 3 | `auth` | AUTH | Cadastro, login, Google, confirmação de e-mail, recuperação de senha, sessão em cookie, CSRF, termos + opt-in, perfil, rate limit |
  | 4 | `groups` | GRP | Criar, meus grupos, editar, arquivar/excluir, transferir organização, encerrar |
  | 5 | `invites` | INV | Link + WhatsApp + Open Graph, regenerar, convite por e-mail, aprovação, lista paginada, remover/sair |
  | 6 | `draw` | DRAW | Restrições, sorteio, resultado (site + e-mail), cancelar, re-sortear, lembrete |
  | 7 | `wishlist` | WISH | Lista de desejos por grupo |
  | 8 | `wall` | WALL | Mural, comentários, anônimo, moderação |
  | 9 | `secret-messages` | MSG | Canais secretos por rodada, e-mail agrupado |
  | 10 | `lifecycle` | LIFE | Encerramento automático, lembrete da confraternização, retenção (8.1), contas inativas |
  | 11 | `account-deletion` | ACC | Exclusão de conta (RN12, RN15) |
  | 12 | `public-pages` | PUB | Landing, como funciona, FAQ, termos, privacidade e cookies |

- **Date**: 2026-11-12
- **Status**: active

### AD-002

- **Decision**: Todo o conteúdo de `.specs/` (specs, designs, tasks, provas, verificações, `STATE.md` e lições) é versionado no git.
- **Reason**: Escolha do usuário em 2026-11-12, entre "ignorar via .git/info/exclude", "ignorar via .gitignore" e "versionar tudo".
- **Trade-off**: O histórico do repositório passa a conter os artefatos de planejamento. Código, comentários, mensagens de commit, nomes de branch e descrições de PR continuam sem citar o processo nem seus artefatos (IDs de task e de requisito, nomes de fase, caminhos de `.specs/`).
- **Scope**: Todo o projeto; cada commit de task leva o `tasks.md` atualizado junto do código.
- **Date**: 2026-11-12
- **Status**: active

### AD-003

- **Decision**: Specs usam as palavras-chave EARS em inglês (WHEN, THEN, WHILE, WHERE, IF, SHALL) com o texto em português; títulos de seção em inglês; pastas de feature e IDs de requisito em inglês (`auth`, `AUTH-01`).
- **Reason**: O validador de specs exige `SHALL` e reconhece as palavras-chave em inglês; o resto segue o idioma do `scope.md`. Escolha do usuário em 2026-11-12, entre "EARS em inglês, texto em PT" e "tudo em inglês".
- **Trade-off**: Critérios com mistura de idiomas.
- **Scope**: Todas as specs.
- **Date**: 2026-11-12
- **Status**: active

### AD-004

- **Decision**: O schema do banco só muda por migrations do TypeORM, aplicadas por comando explícito: `synchronize` fica desligado em todos os ambientes, inclusive local, e a API não roda migrations ao iniciar.
- **Reason**: Evita que o banco local divirja do que as migrations geram e que duas instâncias da API disputem a mesma migration no pico sazonal. Diverge do `scope.md` 7.2 ("synchronize desabilitado fora do ambiente local"). Perguntas ao usuário em 2026-11-12: "Manter assim ou desligar sempre?", resposta "Desligado sempre (Recomendado)"; "Como as migrations do TypeORM são aplicadas?", resposta "Comando explícito (Recomendado)".
- **Trade-off**: Toda mudança de entidade, mesmo exploratória, exige gerar e rodar uma migration; o deploy precisa de um passo que rode o comando antes de subir a API.
- **Scope**: `apps/api` e todas as features que criam ou alteram entidades.
- **Date**: 2026-11-12
- **Status**: active

### AD-005

- **Decision**: As métricas básicas do escopo (seção 8: grupos criados, sorteios, e-mails enviados e falhas) vêm de logs de evento de negócio num formato único definido pela `foundation`; cada feature dona de um evento o emite (ex.: `group.created` em `groups`, `draw.performed` em `draw`). Não há ferramenta de analytics no MVP.
- **Reason**: Cobre as métricas sem dependência nova nem consentimento de cookies; as contagens saem do provedor de logs ou de consultas ao banco e à tabela de jobs. Pergunta ao usuário em 2026-11-12: "Como medir no MVP?", resposta "Logs de evento (Recomendado)", entre "logs de evento", "só consultas ao banco" e "ferramenta de analytics".
- **Trade-off**: Métricas de funil da seção 10 (ex.: abriu o link e entrou no grupo) dependem de cada feature emitir os eventos certos e de um provedor de logs que agregue; não há painel pronto.
- **Scope**: `apps/api`; toda feature que cria um evento de negócio.
- **Date**: 2026-11-12
- **Status**: active

### AD-006

- **Decision**: O navegador fala com a API pela mesma origem do web: chama `/api/*` no site e o Next.js repassa para a API por `rewrites` no `next.config`; o servidor do Next (Server Components, route handlers) chama a API direto por uma URL interna (`API_INTERNAL_URL`). As rotas da API não têm prefixo.
- **Reason**: Cookies de sessão ficam first-party, sem CORS nem preflight, e o CSRF fica mais simples. Pergunta ao usuário em 2026-11-12: "Como o navegador do Amigo Secreto vai falar com a API?", resposta "Mesma origem via rewrites (Recomendado)", entre "mesma origem via rewrites", "origens separadas com CORS" e "BFF no Next".
- **Trade-off**: As chamadas feitas pelo navegador passam pelo servidor do Next, um salto a mais; o Next precisa estar de pé para o navegador alcançar a API.
- **Scope**: `apps/web`, `apps/api` e toda feature com chamada do navegador à API (sessão, CSRF e cookies da feature `auth`).
- **Date**: 2026-11-12
- **Status**: active

### AD-007

- **Decision**: A API (`apps/api`) e o `packages/shared` são ESM (`"type": "module"`, `module`/`moduleResolution` `nodenext`).
- **Reason**: Os pacotes do NestJS 12 são só ESM e o template ESM do Nest usa Vitest, já escolhido para o projeto. Pergunta ao usuário em 2026-11-12: "Qual formato de módulo usar na API?", resposta "ESM (Recomendado)", entre "ESM" e "CommonJS".
- **Trade-off**: Imports relativos levam a extensão `.js`, e o CLI do TypeORM roda em modo ESM.
- **Scope**: `apps/api`, `packages/shared`.
- **Date**: 2026-11-12
- **Status**: active

## Handoff

- **Feature**: foundation (`.specs/features/foundation/`)
- **Phase / Task**: Tasks aprovadas em 2026-11-12; Execute não iniciado (usuário: "Não executar nada agora.")
- **Completed**: none
- **In-progress** (file:line): none
- **Next step**: Quando o usuário pedir, perguntar o modo de execução (um sub-agente por lote ou tudo na conversa), ler `implement.md`, rodar `validate_tasks.py foundation --execute` (o Build vermelho antes da T1 já foi autorizado e está no `tasks.md`) e começar pela T1.
- **Blockers**: none
- **Uncommitted files**: none (planejamento commitado na branch abaixo)
- **Branch**: chore/monorepo-foundation
