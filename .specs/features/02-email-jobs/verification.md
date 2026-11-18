# Email Jobs verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 008f3be
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `test/job-table.int-spec.ts` `tabela job > é criada pela migration com as colunas id, type, payload, runAt, status, attempts, lastError, lockedAt e createdAt` | yes - `toEqual` no mapa coluna/tipo (uuid, jsonb, timestamptz) e default `gen_random_uuid()` |
| C2 | `test/job-table.int-spec.ts` `tabela job > recusa um status fora de PENDING, RUNNING, DONE e FAILED` | yes - aceita os 4 e recusa `CANCELED`, `pending` e vazio |
| C3 | `test/job-table.int-spec.ts` `tabela job > tem um índice por status e runAt` | yes - `indexdef` termina em `(status, "runAt")` |
| C4 | `test/job-table.int-spec.ts` `tabela job > é removida ao reverter a migration` | yes - tabela e enum somem depois do revert em banco vazio |
| C5 | `test/job-queue.int-spec.ts` `JobQueue > grava o job PENDING com attempts 0 e runAt do momento da chamada`; `JobQueue > usa o runAt informado` | yes - runAt entre antes/depois da chamada e ISO exato quando informado |
| C6 | `test/job-queue.int-spec.ts` `JobQueue > não deixa job quando a transação de origem é desfeita` | yes |
| C7 | `test/job-queue.int-spec.ts` `JobQueue > deixa o job quando a transação de origem é confirmada` | yes |
| C8 | `test/email-service.int-spec.ts` `EmailService > enfileira um job email.send dentro da transação informada`; `EmailService > repassa o runAt informado ao job` | yes - invisível antes do commit, ausente no rollback, runAt exato |
| C9 | `test/email-service.int-spec.ts` `EmailService > lança erro e não grava job com destinatário inválido` | yes - 5 formatos inválidos, mensagem exata e zero jobs |
| C10 | `test/email-service.int-spec.ts` `EmailService > lança erro e não grava job com URL de botão que não é http ou https` | yes - relativa, sem esquema, `javascript:`, `ftp:`, `mailto:` |
| C11 | `test/job-scheduler.int-spec.ts` `JobScheduler > dispara a rodada a cada 10 segundos` | yes - rodadas em 10, 20 e 30 s com relógio falso |
| C12 | `test/job-runner.int-spec.ts` `JobRunner > pega no máximo 50 jobs vencidos, do runAt mais antigo ao mais novo` | yes - 60 jobs fora de ordem, executa exatamente os 50 mais antigos na ordem e deixa os 10 seguintes |
| C13 | `test/job-runner.int-spec.ts` `JobRunner > marca o job pego como RUNNING com lockedAt e soma 1 a attempts` | yes - lido de dentro do handler: RUNNING, attempts 2 para 3, lockedAt igual ao instante da rodada |
| C14 | `test/job-runner.int-spec.ts` `JobRunner > entrega cada job a uma só de duas rodadas simultâneas` | yes - dois contextos (pools distintos) liberados juntos por um LOCK; 60 execuções e conjunto igual aos 60 ids |
| C15 | `test/job-runner.int-spec.ts` `JobRunner > marca DONE o job cujo handler termina sem erro` | yes |
| C16 | `test/job-runner.int-spec.ts` `JobRunner > executa os jobs da rodada um de cada vez, na ordem em que foram pegos` | yes - sequência início/fim intercalada falharia em paralelo ou fora de ordem |
| C17 | `test/job-scheduler.int-spec.ts` `JobScheduler > pula o tick enquanto a rodada anterior ainda roda` | yes - rodada de 10 a 35 s, ticks de 20 e 30 s pulados, próximo em 40 s |
| C18 | `test/job-runner.int-spec.ts` `JobRunner > não pega jobs com runAt no futuro, DONE ou FAILED` | yes - borda `runAt = now` pega e `now + 1 ms` não |
| C19 | `src/jobs/job-retry.spec.ts` `nextRunAt > soma 1, 5, 25 e 125 minutos ao instante da falha nas tentativas 1 a 4`; `test/job-runner.int-spec.ts` `JobRunner > devolve a PENDING com as esperas de 1, 5, 25 e 125 minutos` | yes - esperas exatas, status PENDING e lastError a cada tentativa |
| C20 | `test/job-runner.int-spec.ts` `JobRunner > marca FAILED quando a quinta tentativa falha` | yes - borda attempts 4 para 5 |
| C21 | `test/job-runner.int-spec.ts` `JobRunner > marca FAILED na hora um erro definitivo` | yes - só com attempts 1, o caso que um erro de classificação quebraria |
| C22 | `test/job-runner.int-spec.ts` `JobRunner > marca FAILED o job de tipo sem handler com Tipo de job desconhecido` | yes - lastError exato |
| C23 | `test/job-runner.int-spec.ts` `JobRunner > retoma o job RUNNING travado há mais de 10 minutos com menos de 5 tentativas` | yes - 10 min + 1 ms retoma, exatamente 10 min não |
| C24 | `test/job-runner.int-spec.ts` `JobRunner > marca FAILED com Processamento interrompido o job travado com 5 tentativas` | yes - handler não roda, lastError exato, job.failed e Sentry |
| C25 | `test/job-runner.int-spec.ts` `JobRunner > emite job.failed com jobId, type e attempts quando o job vira FAILED` | yes - um só evento com attempts 5 |
| C26 | `test/job-runner.int-spec.ts` `JobRunner > envia ao Sentry o job que vira FAILED com jobId e type` | yes - tags `toEqual` `{ jobId, type }` |
| C27 | `test/job-runner.int-spec.ts` `JobRunner > escreve um aviso sem Sentry quando o job volta a PENDING` | yes - warn com jobId, type, attempts e runAt igual ao gravado; zero eventos no Sentry |
| C28 | `src/jobs/job-retry.spec.ts` `toLastError > corta a mensagem em 500 caracteres`; `toLastError > usa String do valor quando o erro não é Error` | yes - comprimento 500 exato |
| C29 | `src/email/resend.transport.spec.ts` `ResendTransport > envia destinatário, assunto, HTML, texto, remetente, Authorization e Idempotency-Key`; `test/email-send.int-spec.ts` `envio de e-mail > envia ao Resend destinatário, assunto, HTML, texto e remetente de EMAIL_FROM` | yes - corpo `toEqual` completo |
| C30 | `test/email-send.int-spec.ts` `envio de e-mail > manda a mesma Idempotency-Key email/<id> em todas as tentativas` | yes - 3 tentativas com `email/<id>` |
| C31 | `src/email/resend.transport.spec.ts` `ResendTransport > trata 429 como falha passageira`; `trata 409 concurrent_idempotent_requests como falha passageira`; `trata 500 como falha passageira`; `trata resposta depois de 10 segundos como falha passageira`; `trata falha de conexão como falha passageira` | yes - timeout entre 10 000 e 10 500 ms |
| C32 | `src/email/resend.transport.spec.ts` `ResendTransport > trata 422 como falha definitiva`; `trata 409 invalid_idempotent_request como falha definitiva` | no - "os outros 4xx" provado em dois valores do meio da faixa; as bordas 400 e 499 não são testadas |
| C33 | `test/email-send.int-spec.ts` `envio de e-mail > emite email.sent com jobId quando o Resend aceita` | yes - nenhum evento na tentativa recusada, um na aceita |
| C34 | `test/email-send.int-spec.ts` `envio de e-mail > sem RESEND_API_KEY fora de produção escreve o e-mail no log, emite email.sent e marca DONE sem chamar o Resend` | yes |
| C35 | `src/config/env.validation.spec.ts` `validateEnvironment > lança erro que nomeia RESEND_API_KEY quando ela falta em production`; `lança erro que nomeia EMAIL_FROM quando ela falta em production`; `aceita RESEND_API_KEY e EMAIL_FROM ausentes fora de production` | yes - ausente e vazia, e o erro não nomeia a outra |
| C36 | `test/email-send.int-spec.ts` `envio de e-mail > usa o remetente Amigo Secreto <onboarding@resend.dev> sem EMAIL_FROM fora de produção` | yes |
| C37 | `src/email/resend-boundary.spec.ts` `fronteira do Resend > só o módulo de e-mail e a configuração citam o Resend` | yes |
| C38 | `src/email/email-layout.spec.ts` `renderEmail > produz HTML e texto com o mesmo conteúdo` | yes - linhas visíveis do HTML iguais às do texto |
| C39 | `src/email/email-layout.spec.ts` `renderEmail > monta o HTML com lang pt-BR, o nome no cabeçalho, o conteúdo e o rodapé` | yes - ordem cabeçalho, conteúdo, rodapé |
| C40 | `src/email/email-layout.spec.ts` `renderEmail > começa o texto com Amigo Secreto e termina com o rodapé` | yes - texto inteiro `toBe` |
| C41 | `src/email/email-layout.spec.ts` `renderEmail > usa as cores do tema claro nos estilos do HTML` | yes - hex conferidos contra `apps/web/src/app/globals.css` `:root` |
| C42 | `src/email/email-layout.spec.ts` `renderEmail > troca para as cores do tema escuro em prefers-color-scheme dark` | yes - hex conferidos contra `.dark` do `globals.css`, por classe do elemento |
| C43 | `src/email/email-layout.spec.ts` `renderEmail > mostra como texto os caracteres especiais de HTML do conteúdo` | yes - os 5 caracteres, no parágrafo, no rótulo e no href |
| C44 | `src/email/email-layout.spec.ts` `renderEmail > mostra o botão como link no HTML e como rótulo: URL no texto` | yes |
| C45 | `test/email-secrecy.int-spec.ts` `sigilo do e-mail > não escreve destinatário, assunto nem conteúdo em logs, eventos ou Sentry em production` | yes - marcas nas 5 partes, envio aceito, passageiro e definitivo, stdout e stderr |
| C46 | `test/email-secrecy.int-spec.ts` `sigilo do e-mail > não grava destinatário, assunto nem conteúdo no lastError` | yes - Resend falso repete destinatário e assunto na mensagem de erro |
| C47 | `test/email-test-command.int-spec.ts` `email:test > enfileira o e-mail de teste, imprime o id do job e sai com 0` | yes - payload exato, id impresso, código 0 |
| C48 | `test/email-test-command.int-spec.ts` `email:test > sem destinatário válido imprime a instrução, não grava job e sai com 1` | yes - sem argumento, `ana` e `ana@` |
| C49 | `test/email-test-command.int-spec.ts` `email:test > compila a API antes de enfileirar num clone sem dist` | yes - apaga `dist/` e o comando enfileira |
| C50 | `pnpm turbo run test:e2e --force --filter=@amigo-secreto/web` (suíte `apps/web/e2e` com a API em `production` pelo `playwright.config.ts`) | yes - sem as variáveis a API não sobe e o e2e cai |
| C51 | `test/job-runner.int-spec.ts` `JobRunner > grava o lastError sem o caractere U+0000` | yes - acrescentado depois da verificação: afirma o `lastError` exato sem U+0000, PENDING com espera e o job sadio da rodada DONE; falhava antes da correção |
| C52 | `test/job-runner.int-spec.ts` `JobRunner > segue com os outros jobs da rodada quando gravar o resultado de um falha` | yes - acrescentado depois da verificação: o banco recusa o DONE do primeiro job, o sadio fica DONE, o primeiro RUNNING e o log tem o erro com `jobId` e `type`, sem o payload; falhava antes da correção |
| C53 | `test/job-runner.int-spec.ts` `JobRunner > descarta o resultado de um job que outra rodada retomou` | yes - acrescentado depois da verificação: falha quando a condição de `lockedAt` sai do `finish` |
| C54 | `test/job-scheduler.int-spec.ts` `JobScheduler > não liga o cron com NODE_ENV test` | yes - teste existente que o Verifier citou no achado 4 |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Uma exceção ao gravar o resultado de um job derruba a rodada inteira: o job fica RUNNING em vez de voltar a PENDING com espera (JOB-04, AC 1), e os outros jobs já pegos na rodada ficam RUNNING sem rodar. Reproduzido em HEAD com um handler que lança `new Error('falhou\u0000')`: o PostgreSQL recusa o U+0000 no `lastError`, o job envenenado e um job sadio de runAt mais novo ficaram RUNNING com attempts 1; como o envenenado é sempre pego primeiro, depois de 6 rodadas espaçadas de 11 min os dois terminaram FAILED "Processamento interrompido" com attempts 5, e o handler do sadio nunca rodou | `apps/api/src/jobs/job-runner.service.ts:33-46` (um só try em volta do laço), `:182-198` (`finish` lança); `apps/api/src/jobs/job-retry.ts:13-17` (`toLastError` não remove U+0000) | remover U+0000 em `toLastError`; isolar cada job do laço num try/catch próprio para que a falha de um não abandone os demais; novo critério com check e teste de integração: job com erro contendo U+0000 volta a PENDING com espera e um job sadio da mesma rodada vira DONE || `da6d97c` - `toLastError` remove U+0000 e cada job da rodada tem try/catch próprio; provado por C51 e C52 (JOB-09, AC 1 e 2) |
| C32 prova "os outros 4xx" em dois valores (422 e 409 `invalid_idempotent_request`); um corte errado como `status >= 422` ou `status > 400` passaria | `apps/api/src/email/resend.transport.spec.ts:168-186`. Sondado em HEAD: 400, 401, 403, 404, 408, 409 sem `name` e 499 saem definitivos; 503, 504 e 599 passageiros (o código está certo, o teste não segura as bordas) | acrescentar 400, 499 e 409 sem `name` como definitivos ao teste de C32 || `2954f82` - o teste de C32 ganhou 400, 401, 404, 499 e 409 sem `name`; provado por C32 |
| A guarda de `finish` que descarta o resultado de um job retomado por outra instância (`"lockedAt" = :lockedAt`) não tem teste: remover a condição deixa a suíte verde, e a instância antiga sobrescreveria o status e emitiria job.failed/aviso em dobro | `apps/api/src/jobs/job-runner.service.ts:180-198`; nenhum teste em `apps/api/test` muda `lockedAt` com um handler em andamento. Sondado em HEAD: com o handler segurado e `lockedAt`/attempts trocados por fora, o job ficou RUNNING com attempts 2 e o novo lockedAt (comportamento certo) | teste de integração: segurar o handler, trocar `lockedAt` como faria outra instância, liberar e afirmar status, `lockedAt` e ausência de aviso e de job.failed || `c64761c` - teste da guarda com sucesso, falha passageira e falha definitiva depois da retomada (falha sem a condição de `lockedAt`); provado por C53 (JOB-09, AC 3) |
| O cron fica desligado com `NODE_ENV=test`, regra que a spec não tem: JOB-03 AC 1 diz que a API inicia uma rodada a cada 10 s e `test` é um valor aceito pela validação do ambiente. A leitura é de `process.env` na importação do módulo, antes de o ConfigModule carregar o `.env` | `apps/api/src/jobs/jobs-scheduler.module.ts:9`; `apps/api/src/config/env.validation.ts:16-22`; coberto só por `apps/api/test/job-scheduler.int-spec.ts:88`, que não é check | decidir com o usuário: registrar a exceção como novo critério com check, ou desligar por um sinal só de teste (ex.: `VITEST`) em vez de `NODE_ENV` || `da6d97c` - o usuário manteve a regra do design; virou JOB-09 AC 4 com o check C54 no teste existente `JobScheduler > não liga o cron com NODE_ENV test` |

Sondagens próprias sem achado (rodadas em HEAD como testes descartáveis, já apagados): rodada sem jobs não lança; 51 jobs vencidos saem 50 na primeira rodada e 1 na segunda; um RUNNING travado divide o limite de 50 com os PENDING e vem primeiro pelo runAt; `lastError` com emoji cortado em 500 unidades grava; destinatário com nome de exibição, sem TLD, com espaço ou parte local de 65 caracteres é recusado e `ANA@EXAMPLE.COM` aceito; URL `https://`, `http://` e `//exemplo.com` recusadas; e-mail sem blocos rende cabeçalho e rodapé; 1000 blocos rendem com escape.
