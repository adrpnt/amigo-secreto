# Email Jobs Context

**Gathered:** 2026-11-18
**Spec:** `.specs/features/02-email-jobs/spec.md`
**Status:** Design aprovado

---

## Feature Boundary

A `email-jobs` entrega a fila de jobs no PostgreSQL (tabela `Job`, enfileiramento na mesma transação da operação de origem, processamento por `@Cron` com `FOR UPDATE SKIP LOCKED`, retry com backoff) e o envio de e-mail pelo Resend atrás de um serviço próprio. Os e-mails de produto (confirmação, convite, resultado do sorteio etc.) são enfileirados pelas features donas de cada evento.

---

## Implementation Decisions

### Retry

- 5 tentativas no total, com espera exponencial de 1, 5, 25 e 125 minutos entre elas; depois da quinta falha o job fica `FAILED`. Resposta do usuário: "5 tentativas, exponencial (Recomendado)".

### Sem chave do Resend

- Fora de produção, sem `RESEND_API_KEY`, o e-mail (destinatário, assunto e texto) é escrito no log e o job fica `DONE`. Em produção a API não sobe sem a chave. Resposta do usuário: "Escreve no log (Recomendado)".

### Limpeza de jobs

- A retenção dos jobs (`DONE` por 30 dias, `FAILED` por 90, `scope.md` 8.1) fica na feature `lifecycle`, como no AD-001. Resposta do usuário: "Fica na lifecycle (Recomendado)".

### Falha final

- Quando um job vira `FAILED`, sai o evento de negócio `job.failed` no log (AD-005) e um erro vai ao Sentry; as tentativas intermediárias só vão ao log como aviso. Resposta do usuário: "Log de evento + Sentry (Recomendado)".

### Erros que não mudam com nova tentativa

- Erros 4xx do Resend, exceto 429, marcam o job `FAILED` na hora, sem esgotar as tentativas. 429, 5xx e falha de rede seguem o retry. Resposta do usuário: "FAILED direto (Recomendado)".

### Job travado em RUNNING

- Um job `RUNNING` com `lockedAt` há mais de 10 minutos volta a ser processado, e a retomada conta como tentativa. Resposta do usuário: "10 minutos (Recomendado)".

### Frequência do processamento

- O `@Cron` procura jobs vencidos a cada 10 segundos. Resposta do usuário: "A cada 10 segundos (Recomendado)".

### Layout de e-mail

- A `email-jobs` entrega um layout comum (cabeçalho com o nome, cores do design system, rodapé, versão HTML e texto puro); cada feature passa assunto e conteúdo. Resposta do usuário: "Layout base aqui (Recomendado)".

### Remetente

- O remetente vem da variável `EMAIL_FROM`, obrigatória em produção; fora dela o padrão é o remetente de teste do Resend (`onboarding@resend.dev`). Sem reply-to. Resposta do usuário: "Variável EMAIL_FROM (Recomendado)".

### Rodapé

- Todo e-mail termina com "Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem." Resposta do usuário: "Enviado + não responda (Recomendado)".

### Tema do e-mail

- O layout usa as cores do tema claro e troca para as do escuro por `prefers-color-scheme: dark`, nos clientes que respeitam a media query. Resposta do usuário: "Claro + escuro" (a recomendação era só o claro).

### E-mail de teste

- Um comando `pnpm --filter @amigo-secreto/api email:test <destinatário>` enfileira um e-mail com o layout, para conferir o Resend e o domínio de envio. Resposta do usuário: "Comando de e-mail de teste (Recomendado)".

### Arquitetura (Design, 2026-11-18)

- A API chama o Resend por `fetch` nativo (`POST /emails`, `Authorization`, `Idempotency-Key`, timeout por `AbortSignal`), sem o SDK `resend`. Resposta do usuário: "fetch nativo (Recomendado)".
- O layout é montado por funções TypeScript (HTML com tabelas e estilos inline, texto puro, escape próprio), sem React Email nem MJML. Resposta do usuário: "Funções TypeScript (Recomendado)".
- O conteúdo de um e-mail é uma lista de blocos: parágrafo (texto) e botão (rótulo + URL); no texto puro o botão vira "rótulo: URL". Resposta do usuário: "Parágrafos e botão (Recomendado)".
- O payload do job guarda destinatário, assunto e blocos; o HTML e o texto são montados quando o job roda. Resposta do usuário: "No envio (Recomendado)".
- O cron fica desligado com `NODE_ENV=test` (`ScheduleModule.forRoot({ cronJobs: ... })`); os testes chamam a rodada direto, com relógio controlado. Resposta do usuário: "Desligado com NODE_ENV=test (Recomendado)".
- Cada módulo dono registra o handler do seu tipo de job com `JobHandlerRegistry.register(type, handler)` no `onModuleInit`; tipo repetido lança erro no boot. Resposta do usuário: "Registro explícito (Recomendado)".
- A coluna `status` é um enum do PostgreSQL (`job_status_enum`). Resposta do usuário: "Enum do PostgreSQL (Recomendado)".
- O `email:test` sobe um contexto Nest sem o agendador e usa o `EmailService.enqueue`; compila antes, como as migrations. Resposta do usuário: "Contexto Nest sem cron (Recomendado)".

### Tasks (2026-11-18)

- O status do job fica em maiúsculas (`'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'`), como na spec, em exceção à regra de snake_case da API. Resposta do usuário: "Maiúsculas da spec (Recomendado)".
- O transporte de e-mail é injetado por `EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT')` com `interface EmailTransport`, como pede a regra da API. Resposta do usuário: "Symbol da regra (Recomendado)".
- Uma issue por fase no Linear (P-PER-4), criada depois da aprovação das tasks. Resposta do usuário: "Criar ao aprovar as tasks (Recomendado)".

### Agent's Discretion

Nenhuma até agora.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma até agora.

---

## Specific References

Nenhuma; segue o `scope.md` 7.2 e 7.4.

---

## Deferred Ideas

Nenhuma até agora.
