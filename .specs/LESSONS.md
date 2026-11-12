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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
