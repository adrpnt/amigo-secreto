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
  | 4 | `groups` | GRP | Criar, meus grupos, editar, excluir, encerrar |
  | 5 | `invites` | INV | Link + WhatsApp + Open Graph, regenerar, convite por e-mail, aprovação, lista paginada, remover/sair, transferir organização |
  | 6 | `draw` | DRAW | Restrições, sorteio, resultado (site + e-mail), cancelar, re-sortear, lembrete |
  | 7 | `wishlist` | WISH | Lista de desejos por grupo |
  | 8 | `wall` | WALL | Mural, comentários, anônimo, moderação |
  | 9 | `secret-messages` | MSG | Canais secretos por rodada, e-mail agrupado |
  | 10 | `lifecycle` | LIFE | Encerramento automático, lembrete da confraternização, retenção (8.1), contas inativas |
  | 11 | `account-deletion` | ACC | Exclusão de conta (RN12, RN15) |
  | 12 | `public-pages` | PUB | Landing, como funciona, FAQ, termos, privacidade e cookies |

- **Date**: 2026-11-12
- **Revised**: 2026-11-21 - transferir a organização sai da `groups` e entra na `invites`, onde nasce a lista de participantes de onde se escolhe a pessoa; "arquivar" deixa de existir, porque o status ENCERRADO cobre. Perguntas ao usuário no Specify da `04-groups`: "Onde a transferência entra?", resposta "Mover para a 05-invites (Recomendado)", entre essa e "Manter na 04-groups"; "O que é 'arquivar'?", resposta "Não existe; ENCERRADO cobre (Recomendado)", entre essa, "Cada pessoa esconde da própria lista" e "Organizador arquiva para todos".
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

- **Decision**: O navegador fala com a API pela mesma origem do web: chama `/api/*` no site e o Next.js repassa para a API por um `src/proxy.ts` (`NextResponse.rewrite`, lendo `API_INTERNAL_URL` a cada requisição); o servidor do Next (Server Components, route handlers) chama a API direto por uma URL interna (`API_INTERNAL_URL`). As rotas da API não têm prefixo.
- **Reason**: Cookies de sessão ficam first-party, sem CORS nem preflight, e o CSRF fica mais simples. Pergunta ao usuário em 2026-11-12: "Como o navegador do Amigo Secreto vai falar com a API?", resposta "Mesma origem via rewrites (Recomendado)", entre "mesma origem via rewrites", "origens separadas com CORS" e "BFF no Next".
- **Trade-off**: As chamadas feitas pelo navegador passam pelo servidor do Next, um salto a mais; o Next precisa estar de pé para o navegador alcançar a API.
- **Scope**: `apps/web`, `apps/api` e toda feature com chamada do navegador à API (sessão, CSRF e cookies da feature `auth`).
- **Date**: 2026-11-12
- **Revised**: 2026-11-12 - o mecanismo era `rewrites()` no `next.config`. No Next 16.4.6 o destino dos `rewrites()` fica gravado no build (`routes-manifest.json`), o `next start` ignora o `API_INTERNAL_URL` de execução e o build falha sem a variável. O `proxy.ts` lê a URL em tempo de requisição, e um build serve qualquer ambiente; a mesma origem não muda. Pergunta ao usuário: "Como repassar /api/* para a API?", resposta "proxy.ts em tempo de requisição (Recomendado)", entre "proxy.ts em tempo de requisição", "rewrites() com a URL no build" e "rewrites() com padrão localhost".
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
- **Revised**: 2026-11-12 - In Review e Done são movidos por automações do Linear (PR aberto e PR mergeado); o status final não é alterado nem perguntado. Pedido do usuário depois do merge do PR #8: "O In Review e Done são controlados através de automações no linear, não precisa você alterar nada."
- **Status**: active

### AD-010

- **Decision**: A execução é inline (sem sub-agentes de lote), uma fase de `tasks.md` por vez, e cada fase vira um PR contra a `main`. A branch da fase usa o `gitBranchName` da issue no Linear (ex.: `pntadr/per-57-fase-1-raiz-e-shared`) e sai da `main` atualizada; a fase seguinte só começa depois do merge da anterior. Com a última task da fase commitada e o gate de build verde, faço push e abro o PR sem perguntar, e paro esperando a revisão. Título do PR em inglês no padrão Conventional Commits; descrição em português, sem citar o processo nem seus artefatos e sem linhas de atribuição de IA.
- **Reason**: Pedido do usuário em 2026-11-12: "A execução será inline, fase por fase, e cada fase deve ter seu PR." Respostas: "Uma por vez, a partir da main (Recomendado)", "Nome do Linear", "Separar em duas branches (Recomendado)", "Push e PR direto" e "Título EN, descrição PT (Recomendado)".
- **Trade-off**: Uma fase espera o merge da anterior. O nome de branch do Linear contém o ticket e "fase-N"; o usuário escolheu esse nome em troca do vínculo automático com a issue. A verificação de fim de feature (provas, Verifier) roda depois do PR da última fase.
- **Scope**: Todas as features, a partir da `01-foundation`. Complementa o AD-009 (Linear) e substitui a pergunta "sub-agente por lote ou na conversa".
- **Date**: 2026-11-12
- **Revised**: 2026-11-12 - na última fase de uma feature, o fechamento (`check_proofs.py`, provas por walk, Verifier, correções, `validate_verification.py` com saída 0 e lições) acontece na branch da fase, antes do push; o PR só abre com a feature inteira finalizada. Pedido do usuário depois do PR #6 da `01-foundation`, aberto antes do fechamento: "O fechamento devia ter sido feito antes de abrir o PR, abrindo somente com tudo da feature finalizado."
- **Status**: active

### AD-011

- **Decision**: A sessão do usuário é guardada no banco. O cookie httpOnly leva um token aleatório; a tabela de sessões guarda só o hash dele. Não há JWT.
- **Reason**: Logout e troca de senha derrubam a sessão na hora, sem lista de revogação nem rotação de refresh, e sem dependência nova. Diverge do `scope.md` 7.2 ("JWT em cookie httpOnly (access + refresh)"). Pergunta ao usuário em 2026-11-19: "Como a sessão do usuário deve funcionar?", resposta "Sessão no banco (Recomendado)", entre "Sessão no banco" e "JWT access + refresh".
- **Trade-off**: Uma consulta ao banco por requisição autenticada.
- **Scope**: `apps/api`, `apps/web` e toda feature com rota autenticada.
- **Date**: 2026-11-19
- **Status**: active

### AD-012

- **Decision**: Toda rota da API exige sessão por padrão: um `SessionGuard` global (`APP_GUARD`) recusa com 401 a requisição sem sessão válida, e as rotas públicas levam `@Public()`. O usuário da sessão chega à rota por `@CurrentUser()`.
- **Reason**: Esquecer o decorator fecha a rota em vez de abri-la. Pergunta ao usuário em 2026-11-19, no Design da `03-auth`: "Rotas da API são autenticadas por padrão?", resposta "Sim, com @Public() (Recomendado)", entre essa e "Não, com @Authenticated()".
- **Trade-off**: Toda rota pública nova (health, convite aberto, páginas públicas que chamem a API) precisa do `@Public()`.
- **Scope**: `apps/api` e todas as features a partir da `03-auth`.
- **Date**: 2026-11-19
- **Status**: active

### AD-013

- **Decision**: A proteção contra CSRF é um token double-submit assinado: a API grava no cookie `csrf`, legível pelo site, um valor `<aleatório>.<HMAC(AUTH_SECRET, aleatório + sessão)>`, e um `CsrfGuard` global exige em `POST`, `PUT`, `PATCH` e `DELETE` o mesmo valor no cabeçalho `X-CSRF-Token`, com HMAC válido para a sessão atual; senão, 403. No site, toda chamada que altera estado passa pelo `apiFetch`, que manda o cabeçalho.
- **Reason**: Recomendado pela OWASP e independente dos cabeçalhos do navegador e do proxy. Pergunta ao usuário em 2026-11-19, no Design da `03-auth`: "Qual a proteção contra CSRF?", resposta "Token double-submit assinado (Recomendado)", entre essa e "Fetch Metadata / Origin".
- **Trade-off**: O site busca um token antes da primeira mutação, e o token muda quando a sessão abre ou fecha.
- **Scope**: `apps/api`, `apps/web` e toda feature com rota que altera estado.
- **Date**: 2026-11-19
- **Status**: active

### AD-014

- **Decision**: Limites de tentativas usam o `RateLimitService` da `03-auth`, com as contagens numa tabela `rate_limit` do PostgreSQL (uma linha por chave, janela fixa, upsert atômico), somadas entre instâncias. Chaves com e-mail guardam o SHA-256 do e-mail. O IP do cliente vem do `trust proxy` do Express com `TRUST_PROXY_HOPS` saltos, obrigatória em produção.
- **Reason**: Sem Redis nem dependência nova, coerente com a tabela de jobs. Pergunta ao usuário em 2026-11-19, no Design da `03-auth`: "Onde o rate limit guarda as contagens?", resposta "Tabela no PostgreSQL (Recomendado)", entre essa e "@nestjs/throttler + storage no Postgres". O Next não acrescenta `X-Forwarded-For` ao repassar `/api/*` (código do `proxy-request.ts` do Next, via Context7, 2026-11-19); o valor de `TRUST_PROXY_HOPS` depende da hospedagem (`scope.md` 12.2).
- **Trade-off**: Uma escrita no banco por tentativa limitada; a tabela não é limpa até a `10-lifecycle`.
- **Scope**: `apps/api`; rate limit de convite e mensagens nas features `05-invites`, `08-wall` e `09-secret-messages`.
- **Date**: 2026-11-19
- **Status**: active

### AD-015

- **Decision**: As regras de negócio dos campos de um formulário e as mensagens em português delas ficam numa função pura do `packages/shared` (ex.: `validateGroupInput(input, { now, saved })`), que devolve `{ campo: mensagem }`. O site chama a função antes de enviar; a API chama no serviço e, se houver erro, responde 400 com `{ statusCode, message: 'Dados inválidos.', error, fields }`, e o site mostra cada mensagem no campo dela. O DTO com `class-validator` confere só o formato (tipos, campos extras).
- **Reason**: Regra e texto num lugar só, testados uma vez, iguais no site e na API. Pergunta ao usuário em 2026-11-21, no Design da `04-groups`: "As regras dos campos do grupo e as mensagens em português da spec: onde ficam?", resposta "Uma função no packages/shared (Recomendado)", entre essa, "Como na 03-auth" e "Só na API, com mensagens PT". Estendida às features seguintes: "As features 05 a 09 podem seguir o mesmo padrão."
- **Trade-off**: O `packages/shared` precisa ser compilado antes do site e da API; a `03-auth` continua no padrão antigo (mensagens do site e class-validator na API) até ser mexida.
- **Scope**: `04-groups` e as features `05-invites` a `09-secret-messages`, em todo formulário com regra de negócio.
- **Date**: 2026-11-21
- **Status**: active

### AD-016

- **Decision**: Toda rota da API que age dentro de um grupo confere o acesso pelo `GroupAccess` (`requireMember` / `requireOrganizer`) no serviço, dentro da transação da operação, com `SELECT ... FOR UPDATE` na linha do grupo quando a operação muda o grupo ou depende do status dele. Id que não é UUID, grupo inexistente ou pessoa sem participação aprovada recebem 404 "Grupo não encontrado."; participante que não organiza recebe 403 "Só quem organiza pode alterar o grupo."; a ordem das recusas é 404, 403, 409, 400, 429.
- **Reason**: A mesma leitura decide o acesso e trava a linha contra corrida, e quem está de fora nunca descobre que um grupo existe. Pergunta ao usuário em 2026-11-21, no Design da `04-groups`: "Como a API confere se a pessoa participa ou organiza o grupo?", resposta "No serviço, com trava da linha (Recomendado)", entre essa e "Guards com decorator". Estendida às features seguintes: "As features 05 a 09 podem seguir o mesmo padrão."
- **Trade-off**: Cada serviço chama o `GroupAccess` explicitamente; esquecer a chamada não é pego por um guard global, só pelos testes de acesso de cada rota.
- **Scope**: `04-groups` e as features `05-invites` a `09-secret-messages`.
- **Date**: 2026-11-21
- **Revised**: 2026-11-23 - exceção para rotas que recebem um código secreto em vez de um id de grupo (abrir e entrar pelo convite da `05-invites`): o limite por IP vem antes de procurar o código, e acima dele todo código recebe 429, existente ou não; com 404 antes, o 429 revelaria quais códigos existem. Pergunta ao usuário no Design da `05-invites`: "Como ordenar?", resposta "429 antes no convite (Recomendado)", entre essa e "Manter a ordem do AD-016". As rotas de grupo continuam na ordem 404, 403, 409, 400, 429.
- **Status**: active

### AD-017

- **Decision**: O site conhece a própria URL pela variável `WEB_URL` do `apps/web`, lida em tempo de requisição, obrigatória em produção e com padrão `http://localhost:3000` fora dela; ela alimenta o `metadataBase` e os links absolutos mostrados na tela. Quando o servidor do Next chama a API em nome de quem abriu a página e a rota limita por IP ou depende do cliente, a chamada repassa o `X-Forwarded-For` e o `User-Agent` recebidos, como o `proxy.ts` já repassa em `/api/*`; a API lê o IP com o `TRUST_PROXY_HOPS` de sempre (AD-014).
- **Reason**: O Next 16 recusa caminho relativo em metadados sem `metadataBase` (documentação do `generateMetadata` 16.4.5, via Context7, 2026-11-23), e o preview Open Graph precisa de URL absoluta. Sem o repasse, todo acesso montado no servidor chegaria à API com o IP do Next, e o limite por IP valeria para todo mundo junto. Perguntas ao usuário no Design da `05-invites`: "Como o site sabe a URL dele?", resposta "WEB_URL no site (Recomendado)", entre essa, "Cabeçalhos da requisição" e "API devolve a URL"; "Como resolver [o IP do convite]?", resposta "Repassar X-Forwarded-For (Recomendado)", entre essa e "Carregar no navegador".
- **Trade-off**: Uma variável a mais para configurar no deploy do site, com o mesmo valor do `WEB_URL` da API. O IP repassado vale o mesmo que o do `proxy.ts`: depende de a hospedagem gravar o `X-Forwarded-For` e de o `TRUST_PROXY_HOPS` contar os saltos certos.
- **Scope**: `apps/web` e `apps/api`, a partir da `05-invites`; vale para as páginas públicas da `12-public-pages`.
- **Date**: 2026-11-23
- **Status**: active

## Handoff

- **Feature**: 05-invites (`.specs/features/05-invites/`), em execução
- **Phase / Task**: fase 4 (T20 a T24) concluída na branch da PER-114; gate Build verde em `795de19` (shared 27, API 516, web 122, e2e 79)
- **Completed**: T1 a T24; decisões do meio da execução no `**Settled mid-build:**` do `tasks.md` (na fase 4: `WEB_URL` do e2e no `playwright.config.ts`, frase do README; "Convidar por e-mail" abre o formulário no próprio bloco, WhatsApp como link, aviso no rodapé por 3 s, erros de gerar link como no GroupActions; sucesso do convite por e-mail em alerta verde, ajuda do design system, erros como no GroupForm). A T23 ganhou o teste `InviteBlock > Convidar por e-mail mostra e esconde o formulário` (prova da C88); contagens do web da T23 em diante subiram 1
- **In-progress** (file:line): none
- **Next step**: depois do merge do PR da fase 4, criar a branch da PER-115 a partir da `main` atualizada, mover a issue para In Progress e começar a T25
- **Linear**: milestone `05 · Invites`; PER-111 a PER-113 mergeadas; PER-114 com T20 a T24 marcadas e PR aberto; PER-115 e PER-116 em Backlog
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: pntadr/per-114-fase-4-base-do-site-e-bloco-de-convite
