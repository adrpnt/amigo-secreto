# Foundation Context

**Gathered:** 2026-11-12
**Spec:** `.specs/features/01-foundation/spec.md`
**Status:** Spec aprovada em 2026-11-12; pronto para design

---

## Feature Boundary

Base técnica do monorepo do Amigo Secreto, sem funcionalidade de produto: monorepo pnpm + Turborepo; `apps/api` (NestJS + TypeORM + PostgreSQL); `apps/web` (Next.js + Tailwind + shadcn/ui com os tokens do design system); `packages/shared`; testes, lint, CI, logs, Swagger e health check (AD-001).

---

## Implementation Decisions

### Ambiente local

- PostgreSQL roda num `docker-compose.yml` que sobe só os serviços de apoio; API e web rodam no host com `pnpm dev`. Resposta do usuário: "Compose só para serviços (Recomendado)".

### Ferramentas de teste

- Vitest na API (unitários e integração com supertest) e no web (componentes com Testing Library); Playwright para e2e no navegador dos fluxos principais. Resposta do usuário: "Vitest + Playwright (Recomendado)".

### Banco nos testes de integração

- O comando de teste sobe um PostgreSQL descartável com Testcontainers e o derruba ao fim; nenhum passo manual antes de rodar os testes. Resposta do usuário: "Testcontainers (Recomendado)".

### Lint e formatação

- ESLint (com typescript-eslint e jsx-a11y no web) + Prettier. Resposta do usuário: "ESLint + Prettier (Recomendado)".

### CI

- GitHub Actions em PR e em push na `main`: lint, type check, testes unitários e de integração (Testcontainers), build e e2e com Playwright. Resposta do usuário: "GitHub Actions completo (Recomendado)".

### Monitoramento de erros

- Sentry na API e no web, integrado nesta feature; sem a variável de DSN fica desligado (local e testes). Resposta do usuário: "Sentry, desligado sem DSN (Recomendado)". A foundation passa a ser dona do monitoramento de erros da seção 8 do escopo.

### Tema

- Na primeira visita vale o tema do sistema operacional; um botão no cabeçalho alterna claro/escuro e a escolha fica salva no navegador. Resposta do usuário: "Sistema + alternância (Recomendado)".

### Página inicial provisória

- `/` mostra o cabeçalho com a alternância de tema e uma página provisória que consulta o health check da API e mostra se ela respondeu. A landing real fica com a feature `public-pages`. Resposta do usuário: "Página provisória com status da API (Recomendado)".

### Schema e migrations

- `synchronize` desligado em todos os ambientes, inclusive local; diverge do `scope.md` 7.2, registrado em AD-004. Resposta do usuário: "Desligado sempre (Recomendado)".
- Migrations aplicadas por comando explícito; a API não as roda ao iniciar (AD-004). Resposta do usuário: "Comando explícito (Recomendado)".

### Swagger

- Swagger UI em `/docs` só fora de produção; em produção a rota não existe. Resposta do usuário: "Só fora de produção (Recomendado)".

### Acessibilidade automática

- `@axe-core/playwright` nos e2e: as páginas são checadas nos temas claro e escuro e o teste falha com qualquer violação WCAG 2.1 A/AA detectável. Resposta do usuário: "axe nos e2e (Recomendado)".

### Métricas básicas

- A foundation define o formato de log de evento de negócio (ex.: `event=group.created`); cada feature dona do evento emite o seu, e as contagens saem do provedor de logs ou de consultas ao banco e à tabela de jobs (AD-005). Resposta do usuário: "Logs de evento (Recomendado)".

### Decisões do Design (2026-11-12)

- Navegador fala com a API pela mesma origem, via `rewrites` do Next (AD-006). Resposta do usuário: "Mesma origem via rewrites (Recomendado)".
- API e `packages/shared` em ESM (AD-007). Resposta do usuário: "ESM (Recomendado)".
- Node 26 LTS no `.nvmrc`, no `engines` e no CI. Resposta do usuário: "Node 26 LTS (Recomendado)".
- ESLint 9 (linha de manutenção), por compatibilidade com jsx-a11y, react e import. Resposta do usuário: "ESLint 9 (Recomendado)".

### Agent's Discretion

Nenhuma até agora.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma até agora.

---

## Specific References

- Design system "Cristal e Gelo" (artifact privado no claude.ai): tokens de cor claro e escuro, tipografia Plus Jakarta Sans, espaçamento, raios, sombras e o bloco de `globals.css` para shadcn/ui.

---

## Deferred Ideas

Nenhuma até agora.
