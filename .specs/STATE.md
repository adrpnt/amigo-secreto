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

### AD-008

- **Decision**: A pasta de cada feature em `.specs/features/` leva o número de ordem da feature no AD-001, com dois dígitos e hífen: `01-foundation`, `02-email-jobs`, `03-auth`, `04-groups`, `05-invites`, `06-draw`, `07-wishlist`, `08-wall`, `09-secret-messages`, `10-lifecycle`, `11-account-deletion`, `12-public-pages`. O nome da feature e o prefixo dos IDs de requisito não mudam (`foundation`, `FND-01`).
- **Reason**: A ordem das pastas acompanha o histórico de construção. Pedido do usuário em 2026-11-12: "Para as features adotar a convenção de adicionar um ordem no nome da pasta, para facilitar a companhar o histórico. Exemplo: 01-foundation".
- **Trade-off**: Uma feature que entrar depois no plano, mesmo que fique entre duas já numeradas, recebe o próximo número livre (ex.: `13-nome`); nenhuma pasta é renumerada. O número conta a ordem de entrada no plano, não a posição na sequência de construção. Pergunta ao usuário em 2026-11-12: "Se surgir uma feature nova entre duas já numeradas, como numerar?", resposta "Próximo número livre (Recomendado)", entre "próximo número livre" e "renumerar as seguintes". Os scripts da skill recebem o nome da pasta (`validate_spec.py 01-foundation`).
- **Scope**: Todas as features. Complementa o AD-003 (nomes em inglês) e o AD-001 (ordem).
- **Date**: 2026-11-12
- **Status**: active

### AD-009

- **Decision**: O andamento é espelhado no Linear (projeto Amigo Secreto, P-PER-4, time Personal), onde cada fase de `tasks.md` tem uma issue (ex.: `01-foundation` fase 1 = PER-57, fase 2 = PER-58, fase 3 = PER-59, fase 4 = PER-60, fase 5 = PER-61, fase 6 = PER-62). Ao começar a primeira task de uma fase, a issue dela vai para In Progress. A cada task commitada, o checkbox da task na descrição da issue é marcado. Ao terminar a fase, o usuário é perguntado sobre o status final. O ticket não entra nas mensagens de commit.
- **Reason**: Pedido do usuário em 2026-11-12, depois que as issues de PER-57 e PER-58 ficaram em Backlog durante o lote 1. Respostas: "In Progress ao iniciar a fase (Recomendado)", "Sim, a cada commit (Recomendado)" e "Não adicionar o ticket nas mensagens de commit."
- **Trade-off**: Cada task ganha uma escrita no Linear; um sub-agente de lote precisa receber essa regra junto das tasks.
- **Scope**: Todas as features. Sobrepõe-se ao CLAUDE.md global só no ponto do prefixo de ticket: neste projeto, os commits não levam ticket.
- **Date**: 2026-11-12
- **Status**: active

### AD-010

- **Decision**: A execução é inline (sem sub-agentes de lote), uma fase de `tasks.md` por vez, e cada fase vira um PR contra a `main`. A branch da fase usa o `gitBranchName` da issue no Linear (ex.: `pntadr/per-57-fase-1-raiz-e-shared`) e sai da `main` atualizada; a fase seguinte só começa depois do merge da anterior. Com a última task da fase commitada e o gate de build verde, faço push e abro o PR sem perguntar, e paro esperando a revisão. Título do PR em inglês no padrão Conventional Commits; descrição em português, sem citar o processo nem seus artefatos e sem linhas de atribuição de IA.
- **Reason**: Pedido do usuário em 2026-11-12: "A execução será inline, fase por fase, e cada fase deve ter seu PR." Respostas: "Uma por vez, a partir da main (Recomendado)", "Nome do Linear", "Separar em duas branches (Recomendado)", "Push e PR direto" e "Título EN, descrição PT (Recomendado)".
- **Trade-off**: Uma fase espera o merge da anterior. O nome de branch do Linear contém o ticket e "fase-N"; o usuário escolheu esse nome em troca do vínculo automático com a issue. A verificação de fim de feature (provas, Verifier) roda depois do PR da última fase.
- **Scope**: Todas as features, a partir da `01-foundation`. Complementa o AD-009 (Linear) e substitui a pergunta "sub-agente por lote ou na conversa".
- **Date**: 2026-11-12
- **Status**: active

## Handoff

- **Feature**: 01-foundation (`.specs/features/01-foundation/`)
- **Phase / Task**: Execute. Fases 1, 2 e 3 concluídas (T1 a T12). Fases 1 e 2 mergeadas na `main` (PRs #1 e #2). Fase 3 com push e PR aberto a partir de `pntadr/per-59-fase-3-api-base-http-e-observabilidade`; PER-59 em In Progress, com os seis checkboxes marcados.
- **Completed**: T1 a T12
- **In-progress** (file:line): none
- **Next step**: Depois do merge do PR da fase 3: perguntar o status final da PER-59, atualizar a `main`, criar `pntadr/per-60-fase-4-api-health-e-swagger` (conferir o `gitBranchName` da PER-60) a partir dela, mover PER-60 para In Progress (AD-009) e começar pela T13. Comandos rodam com o nvm carregado (`. ~/.nvm/nvm.sh`). A T22 (Sentry no web) usa o `dataCollection` mínimo, decidido na T9 (ver `**Settled mid-build:**` do tasks.md).
- **Blockers**: merge do PR da fase 3.
- **Uncommitted files**: none
- **Branch**: pntadr/per-59-fase-3-api-base-http-e-observabilidade
