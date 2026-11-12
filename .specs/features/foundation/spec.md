# Foundation Specification

**Approved**: 2026-11-12 - user: "Tudo aprovado."
**Amended**: 2026-11-12 - FND-04 AC 5 (rewrite `/api/*`) acrescentado no Design - user: "sobre a decisão pendente pode fazer como recomendado."

## Problem Statement

O repositório não tem código: o backend antigo em Lumen foi removido e a stack nova (NestJS, Next.js, PostgreSQL) ainda não existe. Toda feature de produto do Amigo Secreto depende de um monorepo que instala, compila, testa e roda com um comando, com banco local, convenções de API, observabilidade e CI já resolvidos. Sem essa base, cada feature reinventaria a infraestrutura e o primeiro deploy herdaria decisões tomadas às pressas.

## Goals

- [ ] Quem clona o repositório sobe banco, API e web e vê "API online" em `http://localhost:3000` com quatro comandos: `pnpm install`, `cp` dos `.env.example`, `docker compose up -d` e `pnpm dev`.
- [ ] Lint, type check, testes unitários, de integração e e2e e build rodam com um comando cada na raiz, localmente e no CI, sem passo manual.
- [ ] As features seguintes encontram prontos: migrations, validação de entrada, formato de erro, logs com `requestId`, log de evento de negócio, Sentry, Swagger, tema claro/escuro e checagem automática de acessibilidade.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Deploy, hospedagem e Dockerfiles de produção | Hospedagem em aberto (`scope.md` 12.2); o deploy vem quando ela for decidida. |
| Tabela `Job`, fila, agendamento e envio de e-mail | Feature `email-jobs` (AD-001). |
| Autenticação, sessão, cookies, CORS com credenciais, CSRF e rate limiting | Feature `auth` (AD-001); rate limiting de cada rota fica com a feature dona da rota. |
| Entidades e migrations de domínio | Cada feature de produto cria as suas (AD-004). |
| Landing, como funciona, FAQ e páginas legais | Feature `public-pages`; `/` fica com uma página provisória até lá. |
| Componentes do design system além do cabeçalho e do botão de tema | Cada feature implementa os componentes que usa, a partir do design system. |
| Emissão de eventos de negócio específicos (`group.created`, `draw.performed` etc.) | A foundation só define o formato; cada feature emite os seus (AD-005). |
| Painel de métricas e ferramenta de analytics | Fora do MVP (AD-005). |
| Internacionalização e PWA | Pós-MVP (`scope.md` 4.9). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| PostgreSQL local | `docker-compose.yml` sobe só serviços de apoio; API e web rodam no host com `pnpm dev` | Hot reload rápido no macOS; Docker já instalado | y - user: "Compose só para serviços (Recomendado)" |
| Ferramentas de teste | Vitest na API e no web (Testing Library no web), supertest na integração da API, Playwright no e2e | Padrão do NestJS 12 e da doc do Next.js 16; um runner nos dois apps | y - user: "Vitest + Playwright (Recomendado)" |
| Banco dos testes de integração | Testcontainers sobe e derruba um PostgreSQL descartável por execução | Mesmo comportamento local e no CI, sem passo manual | y - user: "Testcontainers (Recomendado)" |
| Lint e formatação | ESLint (typescript-eslint; jsx-a11y no web) + Prettier | Regras com tipo e de acessibilidade | y - user: "ESLint + Prettier (Recomendado)" |
| CI | GitHub Actions em PR e push na `main`: lint, typecheck, test, build, test:e2e | Repositório já está no GitHub | y - user: "GitHub Actions completo (Recomendado)" |
| Monitoramento de erros | Sentry na API e no web, desligado sem DSN | Escopo seção 8; a foundation fica dona | y - user: "Sentry, desligado sem DSN (Recomendado)" |
| Tema | Tema do sistema na primeira visita; botão no cabeçalho alterna e a escolha fica salva no navegador | Dark mode entra no MVP | y - user: "Sistema + alternância (Recomendado)" |
| Página `/` provisória | Cabeçalho + status do health check da API | Prova a comunicação web → API desde o início | y - user: "Página provisória com status da API (Recomendado)" |
| `synchronize` e migrations | `synchronize` desligado sempre; migrations só por comando explícito (AD-004) | Banco local igual às migrations; sem disputa entre instâncias | y - user: "Desligado sempre (Recomendado)" e "Comando explícito (Recomendado)" |
| Swagger | Swagger UI em `/docs` só fora de produção | Não expõe o mapa da API publicamente | y - user: "Só fora de produção (Recomendado)" |
| Acessibilidade automática | `@axe-core/playwright` nos e2e, temas claro e escuro, WCAG 2.1 A/AA | Escopo seção 8 (WCAG 2.1 AA) | y - user: "axe nos e2e (Recomendado)" |
| Métricas básicas | Log de evento de negócio em formato único (AD-005) | Sem dependência nova nem consentimento de cookies | y - user: "Logs de evento (Recomendado)" |
| Nomes dos pacotes | `@amigo-secreto/api`, `@amigo-secreto/web`, `@amigo-secreto/shared` | Escopo npm do próprio projeto, sem publicar | y - aprovado com a spec, user: "Tudo aprovado." |
| Portas locais | Web 3000, API 3001, PostgreSQL 5432 | Padrões do Next.js e do PostgreSQL; API na porta seguinte | y - aprovado com a spec, user: "Tudo aprovado." |
| Prefixo das rotas da API | Sem prefixo global e sem versão na URL (`GET /health`, `/docs`) | API em origem própria; versão na URL só quando houver cliente externo. O Design pode rever junto com a forma de o web chamar a API | y - aprovado com a spec, user: "Tudo aprovado." |
| Timeout do ping ao banco no health check | 3 segundos | Responde antes dos timeouts comuns de load balancer (5 s ou mais) | y - aprovado com a spec, user: "Tudo aprovado." |
| Status da API em `/` | Consultado no servidor a cada requisição; a página chega pronta, sem estado de carregamento | Uma consulta só, sem JavaScript extra no cliente | y - aprovado com a spec, user: "Tudo aprovado." |
| Textos da interface | "API online", "API indisponível", "Ativar tema escuro", "Ativar tema claro"; erro 500 da API com `message` "Erro interno" | Curtos e em português | y - aprovado com a spec, user: "Tudo aprovado." |
| Larguras suportadas | 360 px a 1440 px sem rolagem horizontal | Mobile first (`scope.md` 1.1); 360 px cobre os Android menores em uso | y - aprovado com a spec, user: "Tudo aprovado." |
| Formato de erro da API | Formato padrão do NestJS: `{ statusCode, message, error }` | Sem camada extra; `message` vira lista de mensagens nos erros de validação | y - aprovado com a spec, user: "Tudo aprovado." |
| Logs fora de produção | Texto legível no terminal; JSON só em produção | Leitura no desenvolvimento; JSON para o provedor de logs | y - aprovado com a spec, user: "Tudo aprovado." |
| Sentry e dados pessoais | `sendDefaultPii` desligado, sem corpo de requisição, sem cookies, sem Session Replay e sem tracing de performance | LGPD e cota do plano gratuito | y - aprovado com a spec, user: "Tudo aprovado." |
| Versões de Node, pnpm, TypeScript, NestJS, Next.js, TypeORM e PostgreSQL | Escolhidas no Design com a documentação atual e aprovadas pelo usuário | Decisão técnica com lock-in; o Design traz as opções | y - aprovado com a spec, user: "Tudo aprovado." |

**Open questions:** none - all resolved or logged above. Os padrões propostos pelo agente foram confirmados na aprovação da spec, inclusive os nomes `@amigo-secreto/*` depois da explicação sobre escopo de pacote.

---

## User Stories

### P1: Monorepo com comandos na raiz ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero instalar, compilar, checar e testar os três pacotes com um comando cada na raiz, para não precisar conhecer o detalhe de cada app.

**Why P1**: Toda feature seguinte é construída e verificada por esses comandos.

**Acceptance Criteria**:

1. The repositório SHALL declarar em `pnpm-workspace.yaml` os pacotes `apps/api`, `apps/web` e `packages/shared`, com os nomes `@amigo-secreto/api`, `@amigo-secreto/web` e `@amigo-secreto/shared`.
2. WHEN o dev roda `pnpm install` na raiz de um clone limpo THEN o pnpm SHALL instalar as dependências dos três pacotes e terminar com código 0.
3. WHEN o dev roda `pnpm build` na raiz THEN o Turborepo SHALL compilar `@amigo-secreto/shared` antes de `@amigo-secreto/api` e de `@amigo-secreto/web` e terminar com código 0.
4. WHEN o dev roda `pnpm dev` na raiz com o PostgreSQL do Compose de pé THEN o sistema SHALL servir a API em `http://localhost:3001` e o web em `http://localhost:3000`, recarregando cada app quando um arquivo dele muda.
5. WHEN o dev roda `pnpm lint` na raiz THEN o sistema SHALL rodar o ESLint e a checagem do Prettier nos três pacotes e terminar com código diferente de 0 se houver qualquer violação.
6. WHEN o dev roda `pnpm typecheck` na raiz THEN o sistema SHALL checar os tipos dos três pacotes sem emitir arquivos e terminar com código diferente de 0 se houver erro de tipo.
7. WHEN o dev roda `pnpm test` na raiz THEN o sistema SHALL rodar os testes Vitest, unitários e de integração, dos três pacotes.
8. WHEN o dev roda `pnpm format` na raiz THEN o Prettier SHALL reescrever os arquivos fora do padrão.
9. The repositório SHALL declarar a versão do Node em `.nvmrc` e no campo `engines` do `package.json` da raiz, com o mesmo valor.

**Independent Test**: Num clone limpo, `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm typecheck` e `pnpm test` terminam com código 0; introduzir um erro de tipo faz `pnpm typecheck` falhar.

---

### P1: Ambiente local com PostgreSQL ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero subir o banco local com um comando e ter as variáveis de ambiente prontas, para começar a trabalhar sem instalar nem configurar o PostgreSQL.

**Why P1**: A API não inicia sem banco.

**Acceptance Criteria**:

1. WHEN o dev roda `docker compose up -d` na raiz THEN o Compose SHALL subir um PostgreSQL acessível em `localhost:5432` com o banco, o usuário e a senha que o `apps/api/.env.example` usa.
2. The `docker-compose.yml` SHALL conter só serviços de apoio, sem serviço para a API nem para o web.
3. The repositório SHALL conter `apps/api/.env.example` e `apps/web/.env.example` com todas as variáveis que cada app lê.
4. WHEN o dev copia cada `.env.example` para `.env` sem editar THEN a API e o web SHALL iniciar com `pnpm dev` contra o PostgreSQL do Compose.

**Independent Test**: Num clone limpo, `docker compose up -d`, copiar os `.env.example`, `pnpm dev` e abrir `http://localhost:3000` mostra "API online".

---

### P1: Configuração, banco e migrations da API ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero que a API valide a própria configuração e que o schema só mude por migrations, para que erros de ambiente apareçam no boot e o banco de todo ambiente seja igual.

**Why P1**: As features de produto criam entidades a partir da primeira (AD-004).

**Acceptance Criteria**:

1. IF uma variável de ambiente obrigatória da API estiver ausente ou com formato inválido THEN a API SHALL encerrar no boot com código diferente de 0 e uma mensagem que nomeia a variável.
2. The API SHALL rodar com o `synchronize` do TypeORM desligado em todos os ambientes.
3. The API SHALL iniciar sem aplicar migrations.
4. The `@amigo-secreto/api` SHALL expor os scripts `migration:generate`, `migration:run` e `migration:revert`.
5. WHEN o dev roda `pnpm --filter @amigo-secreto/api migration:run` contra um banco vazio THEN o TypeORM SHALL criar a tabela de controle de migrations e terminar com código 0.

**Independent Test**: Remover `DATABASE_URL` do `.env` e rodar a API mostra o nome da variável e encerra; com o `.env` completo, `migration:run` num banco novo termina com código 0.

---

### P1: Health check e contrato compartilhado ⭐ MVP

**User Story**: Como operador do Amigo Secreto, quero um endpoint que diga se a API e o banco respondem, para que a hospedagem e o web saibam se a API está de pé.

**Why P1**: É a primeira rota da API, prova a ligação com o banco e alimenta a página provisória do web.

**Acceptance Criteria**:

1. WHEN um cliente faz `GET /health` e o PostgreSQL responde THEN a API SHALL responder 200 com o campo `status` igual a `"ok"`.
2. IF o PostgreSQL não responder em até 3 segundos durante um `GET /health` THEN a API SHALL responder 503 com o campo `status` igual a `"error"`.
3. The `GET /health` SHALL responder sem autenticação.
4. The `@amigo-secreto/shared` SHALL exportar o tipo da resposta de `GET /health`, e a API e o web SHALL importar esse tipo em vez de redeclará-lo.
5. WHEN o navegador faz `GET /api/health` no web THEN o web SHALL repassar a requisição para `GET /health` da API e devolver o mesmo status HTTP e o mesmo corpo (AD-006).

**Independent Test**: Com o banco de pé, `curl -i localhost:3001/health` devolve 200 e `"status":"ok"`; com o container do PostgreSQL parado, devolve 503 e `"status":"error"`.

---

### P1: Validação de entrada e formato de erro ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero validação de DTO e tratamento de erro configurados uma vez para a API toda, para que cada endpoint novo herde o mesmo comportamento.

**Why P1**: O escopo exige validação com DTOs (`scope.md` 7.2) e nenhum vazamento de detalhe interno (seção 8).

**Acceptance Criteria**:

1. IF o corpo de uma requisição tiver um campo que o DTO do endpoint não declara THEN a API SHALL responder 400 sem executar o handler.
2. IF um campo do corpo falhar numa regra de validação do DTO THEN a API SHALL responder 400 com `message` listando uma mensagem por regra violada.
3. IF um handler lançar um erro não tratado THEN a API SHALL responder 500 com `message` igual a `"Erro interno"`, sem stack trace nem mensagem original no corpo.
4. The API SHALL responder erros no formato `{ statusCode, message, error }`.

**Independent Test**: Um teste de integração registra um endpoint de teste com DTO e mostra os três casos: campo extra → 400, campo inválido → 400 com a lista, exceção → 500 com "Erro interno".

---

### P1: Documentação OpenAPI ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero a documentação da API gerada pelo código, para consultar e testar os endpoints sem ler os controllers.

**Why P1**: Pedido pelo escopo (`scope.md` 7.2).

**Acceptance Criteria**:

1. WHILE `NODE_ENV` for diferente de `production` a API SHALL servir a Swagger UI em `/docs` e o documento OpenAPI em JSON em `/docs-json`.
2. WHILE `NODE_ENV` for `production` a API SHALL responder 404 em `/docs` e em `/docs-json`.
3. The documento OpenAPI SHALL descrever a operação `GET /health` com as respostas 200 e 503.

**Independent Test**: Com `pnpm dev`, `http://localhost:3001/docs` mostra `GET /health`; com `NODE_ENV=production`, a mesma URL devolve 404.

---

### P1: Logs, eventos de negócio e monitoramento de erros ⭐ MVP

**User Story**: Como operador do Amigo Secreto, quero logs estruturados com o id da requisição, eventos de negócio contáveis e erros enviados ao Sentry, para diagnosticar falhas e medir o uso no pico de fim de ano.

**Why P1**: Observabilidade e métricas básicas são requisitos do escopo (seção 8, AD-005).

**Acceptance Criteria**:

1. WHILE `NODE_ENV` for `production` a API SHALL escrever cada entrada de log como uma linha JSON com os campos `level`, `timestamp` e `message`.
2. WHEN uma requisição chega com o cabeçalho `x-request-id` THEN a API SHALL usar esse valor no campo `requestId` de todo log escrito durante a requisição e devolvê-lo no cabeçalho `x-request-id` da resposta.
3. WHEN uma requisição chega sem o cabeçalho `x-request-id` THEN a API SHALL gerar um UUID, usá-lo como `requestId` nos logs da requisição e devolvê-lo no cabeçalho `x-request-id` da resposta.
4. WHEN o código da API registra um evento de negócio THEN a API SHALL escrever um log com o campo `event` no formato `dominio.acao` (ex.: `group.created`), o `timestamp` e os atributos informados.
5. WHERE `SENTRY_DSN` estiver definido, a API SHALL enviar ao Sentry cada exceção não tratada que resulte em resposta 500.
6. WHERE `SENTRY_DSN` estiver definido, a API SHALL não enviar ao Sentry os erros que resultem em resposta 4xx.
7. WHERE `SENTRY_DSN` não estiver definido, a API SHALL iniciar sem inicializar o Sentry.
8. WHERE `NEXT_PUBLIC_SENTRY_DSN` estiver definido, o web SHALL enviar ao Sentry os erros não tratados do navegador e do servidor.
9. The integração com o Sentry, na API e no web, SHALL rodar com `sendDefaultPii` desligado, sem enviar corpo de requisição nem cookies, sem Session Replay e sem tracing de performance.

**Independent Test**: Um teste de integração faz uma requisição com `x-request-id: abc` e encontra `abc` no cabeçalho da resposta e nos logs capturados; um teste com um transporte falso do Sentry mostra uma exceção 500 enviada e um 400 não enviado.

---

### P1: Shell do web com tema e página provisória ⭐ MVP

**User Story**: Como visitante do Amigo Secreto, quero ver o app no visual do design system, no tema claro ou escuro que eu preferir, para que a experiência seja confortável desde a primeira tela.

**Why P1**: Toda tela das features seguintes usa o mesmo cabeçalho, tokens e tema.

**Acceptance Criteria**:

1. The web SHALL aplicar os tokens de cor, a tipografia Plus Jakarta Sans, o espaçamento, os raios e as sombras do design system "Cristal e Gelo", nos temas claro e escuro.
2. The documento HTML de toda página SHALL declarar `lang="pt-BR"`.
3. The cabeçalho SHALL mostrar o nome "Amigo Secreto" e o botão de tema em toda página.
4. WHEN um visitante sem tema salvo abre uma página THEN o web SHALL usar o tema que o sistema operacional informa em `prefers-color-scheme`.
5. WHEN o visitante aciona o botão de tema THEN o web SHALL trocar para o outro tema e salvar a escolha no navegador.
6. WHEN um visitante com tema salvo abre uma página THEN o web SHALL pintar o primeiro quadro já no tema salvo, sem exibir o outro tema antes.
7. WHILE o tema claro estiver ativo o botão de tema SHALL ter o nome acessível "Ativar tema escuro", e WHILE o escuro estiver ativo, "Ativar tema claro".
8. WHEN um visitante abre `/` e a API responde 200 em `GET /health` THEN o web SHALL mostrar "API online".
9. IF a API não responder ou responder com status diferente de 200 em `GET /health` THEN o web SHALL mostrar "API indisponível" em `/`, com o cabeçalho e o botão de tema funcionando.
10. WHILE a largura da janela estiver entre 360 px e 1440 px a página `/` SHALL ser exibida sem rolagem horizontal.
11. The página `/` SHALL ter zero violações WCAG 2.1 A/AA detectadas pelo axe, no tema claro e no escuro.

**Independent Test**: Abrir `http://localhost:3000` com o sistema em modo escuro mostra o tema escuro e "API online"; acionar o botão troca para o claro, e recarregar mantém o claro sem piscar; parar a API e recarregar mostra "API indisponível".

---

### P1: Testes sem passo manual ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero que os testes de integração e e2e subam o que precisam sozinhos, para que qualquer pessoa e o CI rodem a suíte com um comando.

**Why P1**: As provas de cada feature dependem de comandos que rodam sem preparação.

**Acceptance Criteria**:

1. WHEN o dev roda `pnpm test` com o Docker disponível THEN os testes de integração da API SHALL subir um PostgreSQL descartável com Testcontainers, aplicar as migrations e remover o container ao fim.
2. IF o Docker não estiver disponível quando os testes de integração da API iniciarem THEN o Vitest SHALL falhar com uma mensagem que diz que os testes de integração precisam do Docker.
3. WHEN o dev roda `pnpm test:e2e` com o Docker disponível THEN o Playwright SHALL subir o banco, a API e o web, rodar os testes no navegador e encerrar tudo ao fim, sem passo manual.
4. The `@amigo-secreto/web` SHALL rodar testes de componente com Vitest e Testing Library em jsdom.

**Independent Test**: Com o Compose parado e nenhum app rodando, `pnpm test` e `pnpm test:e2e` terminam com código 0 e não deixam containers de pé.

---

### P1: Integração contínua ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero que todo PR e todo push na `main` passem pelos mesmos gates da máquina local, para que nada quebrado chegue à `main` sem aviso.

**Why P1**: Escolha do usuário para a foundation.

**Acceptance Criteria**:

1. WHEN um PR contra a `main` é aberto ou atualizado THEN o GitHub Actions SHALL rodar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm test:e2e`.
2. WHEN um commit chega à `main` por push THEN o GitHub Actions SHALL rodar os mesmos cinco comandos.
3. IF qualquer um dos cinco comandos terminar com código diferente de 0 THEN o workflow SHALL terminar com status de falha.
4. The workflow SHALL usar a versão do Node declarada em `.nvmrc`.

**Independent Test**: Um PR com um erro de lint mostra o check vermelho; o mesmo PR corrigido mostra o check verde.

---

## Edge Cases

- IF o PostgreSQL cair com a API rodando THEN `GET /health` SHALL responder 503, conforme o critério 2 do health check.
- IF o Sentry estiver fora do ar THEN a API e o web SHALL continuar respondendo normalmente, já que o envio é assíncrono.
- IF o navegador bloquear o armazenamento local THEN o web SHALL seguir o tema do sistema a cada visita, sem erro na tela.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FND-01 | P1: Monorepo com comandos na raiz | Design | Pending |
| FND-02 | P1: Ambiente local com PostgreSQL | Design | Pending |
| FND-03 | P1: Configuração, banco e migrations da API | Design | Pending |
| FND-04 | P1: Health check e contrato compartilhado | Design | Pending |
| FND-05 | P1: Validação de entrada e formato de erro | Design | Pending |
| FND-06 | P1: Documentação OpenAPI | Design | Pending |
| FND-07 | P1: Logs, eventos de negócio e monitoramento de erros | Design | Pending |
| FND-08 | P1: Shell do web com tema e página provisória | Design | Pending |
| FND-09 | P1: Testes sem passo manual | Design | Pending |
| FND-10 | P1: Integração contínua | Design | Pending |

**ID format:** `FND-NN`; cada check cita o ID e o número do critério (ex.: FND-04, AC 2).

**Coverage:** 10 total, 0 mapped to tasks, 10 unmapped ⚠️ (o mapeamento acontece na fase de tasks)

---

## Sources

- `.specs/docs/scope.md` - 7.1 a 7.5 (stack, módulos e estrutura do repositório) e 8 (requisitos não funcionais: segurança, acessibilidade, observabilidade, testes).
- `.specs/features/foundation/context.md` - decisões do usuário de 2026-11-12, com as palavras dele.
- `.specs/STATE.md` - AD-001 (divisão em features), AD-004 (migrations), AD-005 (métricas por log de evento).
- Design system "Cristal e Gelo" (artifact privado no claude.ai) - tokens de cor claro e escuro, Plus Jakarta Sans, espaçamento, raios, sombras e o bloco de `globals.css` para shadcn/ui. É a referência visual; não há captura de tela para a página provisória.

---

## Success Criteria

- [ ] Um clone limpo chega a "API online" em `http://localhost:3000` com quatro comandos e nenhuma edição de arquivo.
- [ ] O primeiro PR depois da foundation passa no CI sem ajuste no workflow.
- [ ] A feature seguinte (`email-jobs`) não cria nenhuma configuração de teste, lint, log ou banco: só usa a que existe.
