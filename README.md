# Amigo Secreto

Plataforma web gratuita para organizar amigo secreto. O organizador cria um grupo, convida as pessoas por link (pensado para o WhatsApp) ou e-mail e faz o sorteio. Cada participante vê apenas quem tirou, monta sua lista de desejos e conversa em segredo com seu amigo secreto. A experiência é mobile first.

## Stack

| Camada                            | Tecnologias                                                          |
| --------------------------------- | -------------------------------------------------------------------- |
| Monorepo                          | pnpm workspaces + Turborepo                                          |
| API (`apps/api`)                  | NestJS, TypeORM, PostgreSQL, Swagger, Resend (e-mail), Sentry        |
| Web (`apps/web`)                  | Next.js (App Router), React, Tailwind CSS, Base UI, Sentry           |
| Compartilhado (`packages/shared`) | Tipos e utilitários usados pela API e pela web                       |
| Testes                            | Vitest, Testing Library, Supertest, Testcontainers, Playwright + axe |

## Estrutura

```text
apps/
  api/        API NestJS (porta 3001)
  web/        Front-end Next.js (porta 3000)
packages/
  shared/     Código compartilhado entre API e web
docker-compose.yml   PostgreSQL e Mailpit para desenvolvimento local
```

## Pré-requisitos

- Node.js 26 (versão em `.nvmrc`; com nvm, rode `nvm use`)
- pnpm 12 (via Corepack: `corepack enable`)
- Docker (banco local e testes de integração/e2e)

## Rodando localmente

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Suba o PostgreSQL e o Mailpit:

   ```bash
   docker compose up -d
   ```

3. Crie os arquivos de ambiente a partir dos exemplos:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

   Os valores padrão já funcionam com o `docker-compose.yml`. Fora de produção, `AUTH_SECRET` (API) e `WEB_URL` (API e web) têm padrões de desenvolvimento; em produção são obrigatórias. Para testar o login com Google, preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

4. Rode as migrations do banco:

   ```bash
   pnpm --filter @amigo-secreto/api migration:run
   ```

5. Inicie a API e a web em modo de desenvolvimento:

   ```bash
   pnpm dev
   ```

| Serviço                          | Endereço                     |
| -------------------------------- | ---------------------------- |
| Web                              | <http://localhost:3000>      |
| API                              | <http://localhost:3001>      |
| Documentação da API (Swagger)    | <http://localhost:3001/docs> |
| Mailpit (caixa de entrada local) | <http://localhost:8025>      |

### E-mails em desenvolvimento

Sem `RESEND_API_KEY`, os e-mails são entregues no Mailpit em vez de sair pelo Resend. Para enviar um e-mail de teste:

```bash
pnpm --filter @amigo-secreto/api email:test voce@exemplo.com
```

## Scripts

Rodados na raiz, valem para todos os pacotes via Turborepo:

| Comando          | O que faz                                 |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Sobe API e web em modo watch              |
| `pnpm build`     | Gera o build de todos os pacotes          |
| `pnpm lint`      | ESLint + verificação do Prettier          |
| `pnpm typecheck` | Checagem de tipos com `tsc`               |
| `pnpm test`      | Testes unitários e de integração (Vitest) |
| `pnpm test:e2e`  | Testes e2e da web com Playwright          |
| `pnpm format`    | Formata o código com Prettier             |

Migrations da API:

| Comando                                                                              | O que faz                                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------- |
| `pnpm --filter @amigo-secreto/api migration:generate src/database/migrations/<Nome>` | Gera uma migration a partir das entidades |
| `pnpm --filter @amigo-secreto/api migration:run`                                     | Aplica as migrations pendentes            |
| `pnpm --filter @amigo-secreto/api migration:revert`                                  | Desfaz a última migration                 |

## Testes

- Os testes da API sobem um PostgreSQL descartável com Testcontainers, então o Docker precisa estar rodando.
- Os testes e2e também usam Docker. Na primeira vez, instale o navegador do Playwright:

  ```bash
  pnpm --filter @amigo-secreto/web exec playwright install chromium
  ```

## CI

O GitHub Actions roda em todo PR e push para a `main`: `lint`, `typecheck`, `test`, `build` e `test:e2e`. Quando os e2e falham, o relatório do Playwright fica disponível como artefato do job.
