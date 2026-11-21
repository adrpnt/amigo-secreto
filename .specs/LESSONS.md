# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Testar a inicialização de SDKs de observabilidade pelo processo real (dev e start), com a configuração lida do .env, e não só chamando a função de init.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `observability` · harmful: 0
- features: 01-foundation
- evidence: apps/api/package.json:7; apps/api/src/instrument.ts (observability)
- last seen: 2026-11-12T17:13:28Z

### L-002 - Script que lê saída compilada roda num clone sem build: compilar antes no próprio script e testar sem a pasta dist.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scripts` · harmful: 0
- features: 01-foundation
- evidence: apps/api/package.json:14 (scripts)
- last seen: 2026-11-12T17:13:28Z

### L-003 - Comparar respostas repassadas sem os campos que mudam a cada requisição, como tempos de resposta.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: 01-foundation
- evidence: C23 apps/web/e2e/api-rewrite.spec.ts:13 (e2e)
- last seen: 2026-11-12T17:13:28Z

### L-004 - Provar uma mensagem por regra violada com um campo que viola duas regras ao mesmo tempo.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: 01-foundation
- evidence: C25 apps/api/test/validation.int-spec.ts:46 (validation)
- last seen: 2026-11-12T17:13:28Z

### L-005 - Cobrir cada condição de uma checagem com uma entrada que passa pelas anteriores e falha só nela.
- signal: `weak_test` · recurrence: 1 feature(s) · harmful: 0
- features: 01-foundation
- evidence: C48 apps/web/src/lib/api-status.test.ts:86
- last seen: 2026-11-12T17:13:28Z

### L-006 - Testar o corpo genérico do 500 também com a exceção HTTP do framework lançada com mensagem, não só com Error.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `errors` · harmful: 0
- features: 01-foundation
- evidence: apps/api/src/observability/all-exceptions.filter.ts:38 (errors)
- last seen: 2026-11-12T17:13:28Z

### L-007 - Proteger atributos de log estruturado contra os nomes que o logger já ocupa.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `observability` · harmful: 0
- features: 01-foundation
- evidence: apps/api/src/observability/business-events.service.ts:15 (observability)
- last seen: 2026-11-12T17:13:28Z

### L-008 - Conferir cada família de tokens do design system em elementos renderizados, não um valor de amostra.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `design-system` · harmful: 0
- features: 01-foundation
- evidence: C40 apps/web/e2e/theme.spec.ts:142 (design-system)
- last seen: 2026-11-12T17:13:28Z

### L-009 - Escrever critérios de comando pelo que o grafo de tarefas roda de fato, incluindo builds de dependências e arquivos gerados.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tooling` · harmful: 0
- features: 01-foundation
- evidence: C6 turbo.json:16 (tooling)
- last seen: 2026-11-12T17:13:28Z

### L-010 - Mandar ao monitoramento de erros só os 500; 5xx esperados, como o 503 do health, ficam no log.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `observability` · harmful: 0
- features: 01-foundation
- evidence: apps/api/src/observability/all-exceptions.filter.ts:30 (observability)
- last seen: 2026-11-12T17:13:28Z

### L-011 - Isolar cada item de um laço de processamento em lote num try/catch próprio e testar um item cuja gravação falha seguido de um sadio.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `jobs` · harmful: 0
- features: 02-email-jobs
- evidence: apps/api/src/jobs/job-runner.service.ts:33-46 (jobs)
- last seen: 2026-11-18T21:14:24Z

### L-012 - Provar uma regra sobre uma faixa de valores nas duas bordas da faixa, não só com valores do meio.
- signal: `weak_test` · recurrence: 1 feature(s) · harmful: 0
- features: 02-email-jobs
- evidence: C32 apps/api/src/email/resend.transport.spec.ts:168-186
- last seen: 2026-11-18T21:14:24Z

### L-013 - Dar critério e teste a toda guarda de concorrência do código, como a que descarta o resultado de um trabalho retomado por outra instância.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `concurrency` · harmful: 0
- features: 02-email-jobs
- evidence: apps/api/src/jobs/job-runner.service.ts:180-198 (concurrency)
- last seen: 2026-11-18T21:14:24Z

### L-014 - Registrar como critério toda exceção de ambiente que muda o comportamento da aplicação, mesmo a que só existe para os testes.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `config` · harmful: 0
- features: 02-email-jobs
- evidence: apps/api/src/jobs/jobs-scheduler.module.ts:9 (config)
- last seen: 2026-11-18T21:14:24Z

### L-015 - Medir limites de texto na validação do jeito que a coluna do banco conta, e testar com emojis de vários pontos de código.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: 03-auth
- evidence: apps/api/src/auth/dto/register.dto.ts:23 (validation)
- last seen: 2026-11-21T16:59:41Z

### L-016 - Testar que a resposta a um corpo malformado não repete trechos do corpo recebido.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `errors` · harmful: 0
- features: 03-auth
- evidence: apps/api/src/observability/all-exceptions.filter.ts:48 (errors)
- last seen: 2026-11-21T16:59:41Z

### L-017 - Ao trocar o e-mail de uma conta, invalidar os links pendentes mandados ao endereço antigo.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: 03-auth
- evidence: apps/api/src/users/email-change.service.ts:126 (auth)
- last seen: 2026-11-21T16:59:41Z

### L-018 - Ler o estado guardado logo depois de cada pedido recusado, antes de qualquer pedido aceito no mesmo teste.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: 03-auth
- evidence: C41 (validation)
- last seen: 2026-11-21T16:59:41Z

### L-019 - Provar um limite comum a várias rotas em cada uma delas, não só numa.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `rate-limit` · harmful: 0
- features: 03-auth
- evidence: C52 (rate-limit)
- last seen: 2026-11-21T16:59:41Z

### L-020 - Provar um elemento comum a várias telas em cada tela que o critério cita.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: 03-auth
- evidence: C62 (e2e)
- last seen: 2026-11-21T16:59:41Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
