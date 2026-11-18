# 02-email-jobs proofs

**HEAD**: 008f3be
**Tree**: clean
**Shell**: /bin/sh
**Result**: 65 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run api / ✓ tabela job > é criada pela migration com as colunas id, type, payload, runAt, status, attempts, la` | pass |
| C2 | `run api / ✓ tabela job > recusa um status fora de PENDING, RUNNING, DONE e FAILED` | pass |
| C3 | `run api / ✓ tabela job > tem um índice por status e runAt` | pass |
| C4 | `run api / ✓ tabela job > é removida ao reverter a migration` | pass |
| C5 | `run api / ✓ JobQueue > grava o job PENDING com attempts 0 e runAt do momento da chamada` | pass |
| C5 | `run api / ✓ JobQueue > usa o runAt informado` | pass |
| C6 | `run api / ✓ JobQueue > não deixa job quando a transação de origem é desfeita` | pass |
| C7 | `run api / ✓ JobQueue > deixa o job quando a transação de origem é confirmada` | pass |
| C8 | `run api / ✓ EmailService > enfileira um job email.send dentro da transação informada` | pass |
| C8 | `run api / ✓ EmailService > repassa o runAt informado ao job` | pass |
| C9 | `run api / ✓ EmailService > lança erro e não grava job com destinatário inválido` | pass |
| C10 | `run api / ✓ EmailService > lança erro e não grava job com URL de botão que não é http ou https` | pass |
| C11 | `run api / ✓ JobScheduler > dispara a rodada a cada 10 segundos` | pass |
| C12 | `run api / ✓ JobRunner > pega no máximo 50 jobs vencidos, do runAt mais antigo ao mais novo` | pass |
| C13 | `run api / ✓ JobRunner > marca o job pego como RUNNING com lockedAt e soma 1 a attempts` | pass |
| C14 | `run api / ✓ JobRunner > entrega cada job a uma só de duas rodadas simultâneas` | pass |
| C15 | `run api / ✓ JobRunner > marca DONE o job cujo handler termina sem erro` | pass |
| C16 | `run api / ✓ JobRunner > executa os jobs da rodada um de cada vez, na ordem em que foram pegos` | pass |
| C17 | `run api / ✓ JobScheduler > pula o tick enquanto a rodada anterior ainda roda` | pass |
| C18 | `run api / ✓ JobRunner > não pega jobs com runAt no futuro, DONE ou FAILED` | pass |
| C19 | `run api / ✓ nextRunAt > soma 1, 5, 25 e 125 minutos ao instante da falha nas tentativas 1 a 4` | pass |
| C19 | `run api / ✓ JobRunner > devolve a PENDING com as esperas de 1, 5, 25 e 125 minutos` | pass |
| C20 | `run api / ✓ JobRunner > marca FAILED quando a quinta tentativa falha` | pass |
| C21 | `run api / ✓ JobRunner > marca FAILED na hora um erro definitivo` | pass |
| C22 | `run api / ✓ JobRunner > marca FAILED o job de tipo sem handler com Tipo de job desconhecido` | pass |
| C23 | `run api / ✓ JobRunner > retoma o job RUNNING travado há mais de 10 minutos com menos de 5 tentativas` | pass |
| C24 | `run api / ✓ JobRunner > marca FAILED com Processamento interrompido o job travado com 5 tentativas` | pass |
| C25 | `run api / ✓ JobRunner > emite job.failed com jobId, type e attempts quando o job vira FAILED` | pass |
| C26 | `run api / ✓ JobRunner > envia ao Sentry o job que vira FAILED com jobId e type` | pass |
| C27 | `run api / ✓ JobRunner > escreve um aviso sem Sentry quando o job volta a PENDING` | pass |
| C28 | `run api / ✓ toLastError > corta a mensagem em 500 caracteres` | pass |
| C28 | `run api / ✓ toLastError > usa String do valor quando o erro não é Error` | pass |
| C29 | `run api / ✓ ResendTransport > envia destinatário, assunto, HTML, texto, remetente, Authorization e Idempotency` | pass |
| C29 | `run api / ✓ envio de e-mail > envia ao Resend destinatário, assunto, HTML, texto e remetente de EMAIL_FROM` | pass |
| C30 | `run api / ✓ envio de e-mail > manda a mesma Idempotency-Key email/<id> em todas as tentativas` | pass |
| C31 | `run api / ✓ ResendTransport > trata 429 como falha passageira` | pass |
| C31 | `run api / ✓ ResendTransport > trata 409 concurrent_idempotent_requests como falha passageira` | pass |
| C31 | `run api / ✓ ResendTransport > trata 500 como falha passageira` | pass |
| C31 | `run api / ✓ ResendTransport > trata resposta depois de 10 segundos como falha passageira` | pass |
| C31 | `run api / ✓ ResendTransport > trata falha de conexão como falha passageira` | pass |
| C32 | `run api / ✓ ResendTransport > trata 422 como falha definitiva` | pass |
| C32 | `run api / ✓ ResendTransport > trata 409 invalid_idempotent_request como falha definitiva` | pass |
| C33 | `run api / ✓ envio de e-mail > emite email.sent com jobId quando o Resend aceita` | pass |
| C34 | `run api / ✓ envio de e-mail > sem RESEND_API_KEY fora de produção escreve o e-mail no log, emite email.sent e ` | pass |
| C35 | `run api / ✓ validateEnvironment > lança erro que nomeia RESEND_API_KEY quando ela falta em production` | pass |
| C35 | `run api / ✓ validateEnvironment > lança erro que nomeia EMAIL_FROM quando ela falta em production` | pass |
| C35 | `run api / ✓ validateEnvironment > aceita RESEND_API_KEY e EMAIL_FROM ausentes fora de production` | pass |
| C36 | `run api / ✓ envio de e-mail > usa o remetente Amigo Secreto <onboarding@resend.dev> sem EMAIL_FROM fora de pro` | pass |
| C37 | `run api / ✓ fronteira do Resend > só o módulo de e-mail e a configuração citam o Resend` | pass |
| C38 | `run api / ✓ renderEmail > produz HTML e texto com o mesmo conteúdo` | pass |
| C39 | `run api / ✓ renderEmail > monta o HTML com lang pt-BR, o nome no cabeçalho, o conteúdo e o rodapé` | pass |
| C40 | `run api / ✓ renderEmail > começa o texto com Amigo Secreto e termina com o rodapé` | pass |
| C41 | `run api / ✓ renderEmail > usa as cores do tema claro nos estilos do HTML` | pass |
| C42 | `run api / ✓ renderEmail > troca para as cores do tema escuro em prefers-color-scheme dark` | pass |
| C43 | `run api / ✓ renderEmail > mostra como texto os caracteres especiais de HTML do conteúdo` | pass |
| C44 | `run api / ✓ renderEmail > mostra o botão como link no HTML e como rótulo: URL no texto` | pass |
| C45 | `run api / ✓ sigilo do e-mail > não escreve destinatário, assunto nem conteúdo em logs, eventos ou Sentry em pr` | pass |
| C46 | `run api / ✓ sigilo do e-mail > não grava destinatário, assunto nem conteúdo no lastError` | pass |
| C47 | `run api / ✓ email:test > enfileira o e-mail de teste, imprime o id do job e sai com 0` | pass |
| C48 | `run api / ✓ email:test > sem destinatário válido imprime a instrução, não grava job e sai com 1` | pass |
| C49 | `run api / ✓ email:test > compila a API antes de enfileirar num clone sem dist` | pass |
| C50 | `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run api` - exit 0

```
@amigo-secreto/api:test:  ✓  integration-dist  test/email-test-command.int-spec.ts > email:test > compila a API antes de enfileirar num clone sem dist 2117ms
@amigo-secreto/api:test: (node:50804) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
@amigo-secreto/api:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > cria a tabela de controle de migrations num banco vazio 1592ms
@amigo-secreto/api:test:  ✓  integration-dist  test/migrations.int-spec.ts > migration:run > roda num clone sem build, sem a pasta dist 1670ms
@amigo-secreto/api:test: 
@amigo-secreto/api:test:  Test Files  26 passed (26)
@amigo-secreto/api:test:       Tests  103 passed (103)
@amigo-secreto/api:test:    Start at  17:57:48
@amigo-secreto/api:test:    Duration  34.90s (tests 71%, import 28%, transform 1%)
@amigo-secreto/api:test: 

 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
  Time:    37.979s
```

`pnpm turbo run test:e2e --force --filter=@amigo-secreto/web` - exit 0

```
@amigo-secreto/web:test:e2e:   ✓  10 [chromium] › e2e/home.spec.ts:26:3 › página inicial › mostra API online quando a API responde (197ms)
@amigo-secreto/web:test:e2e:   ✓   8 [chromium] › e2e/theme.spec.ts:188:3 › tema › o botão troca o tema e a escolha sobrevive ao recarregar (353ms)
@amigo-secreto/web:test:e2e:   ✓  11 [chromium] › e2e/home.spec.ts:33:3 › página inicial › mostra API indisponível e o tema funciona quando a API não responde (246ms)
@amigo-secreto/web:test:e2e:   ✓  12 [chromium] › e2e/theme.spec.ts:205:3 › tema › pinta o primeiro quadro no tema salvo (145ms)
@amigo-secreto/web:test:e2e:   ✓   9 [chromium] › e2e/accessibility.spec.ts:44:3 › acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema claro (532ms)
@amigo-secreto/web:test:e2e:   ✓  13 [chromium] › e2e/theme.spec.ts:220:3 › tema › o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro (268ms)
@amigo-secreto/web:test:e2e:   ✓  15 [chromium] › e2e/theme.spec.ts:238:3 › tema › aplica os tokens do design system no tema claro (178ms)
@amigo-secreto/web:test:e2e:   ✓  14 [chromium] › e2e/accessibility.spec.ts:56:3 › acessibilidade › página inicial sem violações WCAG 2.1 A/AA no tema escuro (533ms)
@amigo-secreto/web:test:e2e:   ✓  16 [chromium] › e2e/theme.spec.ts:245:3 › tema › aplica os tokens do design system no tema escuro (155ms)
@amigo-secreto/web:test:e2e: 
@amigo-secreto/web:test:e2e:   16 passed (6.2s)

 Tasks:    4 successful, 4 total
Cached:    0 cached, 4 total
  Time:    16.792s
```
