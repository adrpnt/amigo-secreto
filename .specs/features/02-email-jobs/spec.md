# Email Jobs Specification

**Approved**: 2026-11-18 - user: "Tudo aprovado."
**Amended**: 2026-11-18 - no Design: JOB-02 AC 6 e JOB-06 AC 7 acrescentados (bloco de botão) e JOB-05 AC 3 e 4 ajustados (409 `concurrent_idempotent_requests` passageiro) - user: "Aprovado."

## Problem Statement

O Amigo Secreto avisa as pessoas por e-mail: confirmação de conta, convite, resultado do sorteio, lembretes (`scope.md` 4.7). Hoje a API não tem como agendar trabalho nem enviar e-mail. Sem uma fila que grave o job na mesma transação da operação de origem e o repita quando o provedor falhar, um e-mail de resultado se perde numa instabilidade do Resend ou sai duas vezes quando duas instâncias da API processam o mesmo job no pico de dezembro.

## Goals

- [ ] Uma feature de produto envia um e-mail com uma chamada que grava o job na transação dela: se a transação desfaz, nenhum e-mail sai.
- [ ] Um e-mail sai em até 10 segundos depois de enfileirado, com o layout comum, em HTML e texto puro.
- [ ] Uma falha passageira do Resend não perde o e-mail: ele é tentado até 5 vezes em cerca de 2h36; duas instâncias da API nunca enviam o mesmo job duas vezes.
- [ ] Um job que esgota as tentativas aparece no Sentry e no log de evento `job.failed`, sem expor destinatário nem conteúdo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| E-mails de produto (confirmação, recuperação de senha, convite, resultado, lembretes etc.) | Cada feature dona do evento escreve e enfileira o seu (`scope.md` 4.7, AD-001). |
| Jobs agendados de produto (lembrete de sortear, lembrete da confraternização, encerramento automático) | Features `draw` e `lifecycle`; aqui só a fila que os executa. |
| Limpeza de jobs (`DONE` por 30 dias, `FAILED` por 90, `scope.md` 8.1) | Feature `lifecycle` (AD-001) - user: "Fica na lifecycle (Recomendado)". |
| Webhooks do Resend (entrega, bounce, abertura) | A taxa de entrega e abertura (`scope.md` 10) sai do painel do Resend no MVP. |
| Tela ou rota para consultar e reprocessar jobs `FAILED` | Diagnóstico pelo banco, pelo log e pelo Sentry no MVP. |
| Agrupamento e limite de frequência de e-mails de mensagem secreta | Feature `secret-messages` (AD-001). |
| Anexos e link de descadastro | Só e-mails transacionais, sem anexos; o opt-in de marketing é da feature `auth`. |
| Fila dedicada (Redis, SQS) | `scope.md` 7.4: tabela no PostgreSQL; a interface de enfileiramento permite trocar depois. |
| Configuração de SPF, DKIM e DMARC | Depende do domínio de envio, que espera a hospedagem (`scope.md` 12.2). |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tentativas e espera | 5 tentativas; espera de 1, 5, 25 e 125 min entre elas (5^(n-1) min depois da tentativa n) | Cobre queda curta do Resend sem atrasar demais um e-mail de resultado | y - user: "5 tentativas, exponencial (Recomendado)" |
| Sem `RESEND_API_KEY` fora de produção | E-mail vai para o log e o job fica `DONE`; em produção a API não sobe sem a chave | Desenvolvimento e testes sem conta no Resend | y - user: "Escreve no log (Recomendado)" |
| Limpeza de jobs | Fica na feature `lifecycle` (AD-001) | Toda a retenção do 8.1 junta | y - user: "Fica na lifecycle (Recomendado)" |
| Falha final | Evento `job.failed` no log e erro no Sentry; tentativas intermediárias só como aviso no log | Alguém é avisado sem ruído das falhas que se recuperam | y - user: "Log de evento + Sentry (Recomendado)" |
| Erros que não mudam com nova tentativa | 4xx do Resend, exceto 429, marcam `FAILED` na hora; 429, 5xx, timeout e falha de rede seguem o retry | Não gasta 4 tentativas num endereço inválido | y - user: "FAILED direto (Recomendado)" |
| Job travado em `RUNNING` | Retomado quando `lockedAt` passa de 10 min; a retomada conta como tentativa | Instância que cai no meio não prende o job | y - user: "10 minutos (Recomendado)" |
| Frequência do processamento | `@Cron` a cada 10 s | Confirmação de conta chega em até ~10 s | y - user: "A cada 10 segundos (Recomendado)" |
| Layout de e-mail | Layout comum aqui (cabeçalho com o nome, cores do design system, rodapé, HTML e texto puro); a feature passa assunto e conteúdo | E-mails iguais desde o primeiro | y - user: "Layout base aqui (Recomendado)" |
| Remetente | `EMAIL_FROM`, obrigatória em produção; fora dela `Amigo Secreto <onboarding@resend.dev>`; sem reply-to | Domínio de envio ainda não existe | y - user: "Variável EMAIL_FROM (Recomendado)" |
| Rodapé | "Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem." | Vale também para quem ainda não tem conta | y - user: "Enviado + não responda (Recomendado)" |
| Tema do e-mail | Cores do tema claro; troca para o escuro por `prefers-color-scheme: dark` nos clientes que respeitam | Pedido do usuário; nos outros clientes fica o claro | y - user: "Claro + escuro" |
| E-mail de teste | Comando `pnpm --filter @amigo-secreto/api email:test <destinatário>` que enfileira um e-mail com o layout | Confere o Resend e o domínio sem feature de produto | y - user: "Comando de e-mail de teste (Recomendado)" |
| Chave de idempotência no Resend | Cabeçalho `Idempotency-Key` = `email/<id do job>` em toda tentativa | O Resend guarda a chave por 24 h e não reenvia; as 5 tentativas cabem em ~2h36 | y - aprovado com a spec, user: "Tudo aprovado." |
| Jobs por rodada | Até 50 jobs por rodada por instância, processados um de cada vez, do `runAt` mais antigo ao mais novo | Limite padrão do Resend é 10 requisições/s por time; um a um fica abaixo dele com folga | y - aprovado com a spec, user: "Tudo aprovado." |
| Rodada sobreposta | Se a rodada anterior ainda roda na mesma instância, o tick seguinte é pulado | Evita duas rodadas da mesma instância disputando jobs | y - aprovado com a spec, user: "Tudo aprovado." |
| Timeout da chamada ao Resend | 10 s; esgotado conta como falha passageira | Bem abaixo dos 10 min do job travado | y - aprovado com a spec, user: "Tudo aprovado." |
| `Retry-After` do 429 | Ignorado; vale a espera do backoff (a primeira é 1 min) | O backoff já espera mais que o `retry-after` de um limite por segundo | y - aprovado com a spec, user: "Tudo aprovado." |
| Tipo de job sem handler | `FAILED` na hora, com Sentry e `job.failed` | Erro de programação; repetir não resolve | y - aprovado com a spec, user: "Tudo aprovado." |
| Erro que não vem do Resend dentro de um handler | Falha passageira, segue o retry | Conservador: não perde o job por um erro que pode ser momentâneo | y - aprovado com a spec, user: "Tudo aprovado." |
| `lastError` | Até 500 caracteres: para o Resend, status HTTP e `name` do erro; timeout "Tempo esgotado"; rede "Falha de rede"; outros, nome e mensagem do erro | Diagnóstico sem gravar payload | y - aprovado com a spec, user: "Tudo aprovado." |
| Eventos de negócio | `email.sent` (`jobId`) a cada e-mail aceito pelo Resend ou escrito no log; `job.failed` (`jobId`, `type`, `attempts`) | Métricas de e-mails enviados e falhas (`scope.md` 8, AD-005) | y - aprovado com a spec, user: "Tudo aprovado." |
| Comando de e-mail de teste | Assunto "E-mail de teste do Amigo Secreto", texto "Se você recebeu esta mensagem, o envio de e-mails está funcionando."; o comando só enfileira, imprime o id do job e sai; quem envia é a API em execução | Usa o mesmo caminho dos e-mails de produto | y - aprovado com a spec, user: "Tudo aprovado." |
| Nomes dos tipos de job | `email.send` para o e-mail; cada feature registra os seus no formato `<área>.<ação>` | Mesmo formato dos eventos de negócio | y - aprovado com a spec, user: "Tudo aprovado." |
| Webhooks do Resend | Fora do MVP; entrega e abertura pelo painel do Resend | Métrica do `scope.md` 10 sem rota pública nova | y - aprovado com a spec, user: "Tudo aprovado." |

**Open questions:** none - all resolved or logged above. Os padrões propostos pelo agente foram confirmados na aprovação da spec.

---

## User Stories

### P1: Tabela de jobs ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero uma tabela de jobs criada por migration, para guardar trabalho assíncrono no mesmo banco das features.

**Why P1**: Todo e-mail e lembrete do MVP passa por ela.

**Acceptance Criteria**:

1. WHEN o dev roda `pnpm --filter @amigo-secreto/api migration:run` THEN o sistema SHALL criar a tabela `job` com as colunas `id` (uuid), `type`, `payload` (jsonb), `runAt`, `status`, `attempts`, `lastError`, `lockedAt` e `createdAt`.
2. The coluna `status` SHALL aceitar só `PENDING`, `RUNNING`, `DONE` e `FAILED`.
3. The tabela `job` SHALL ter um índice por `status` e `runAt`.
4. WHEN o dev roda `pnpm --filter @amigo-secreto/api migration:revert` depois da migration da tabela THEN o sistema SHALL remover a tabela `job`.

**Independent Test**: Num PostgreSQL vazio, rodar as migrations cria a tabela com as colunas, a restrição de status e o índice; reverter remove a tabela.

---

### P1: Enfileirar na transação de origem ⭐ MVP

**User Story**: Como dev de uma feature de produto, quero enfileirar um job dentro da transação da minha operação, para que o job só exista se a operação for gravada.

**Why P1**: É a garantia de consistência do `scope.md` 7.2.

**Acceptance Criteria**:

1. WHEN uma feature chama `JobQueue.enqueue(type, payload, options)` THEN o sistema SHALL gravar um job com esse `type` e esse `payload`, `status` `PENDING`, `attempts` 0 e `runAt` igual ao `options.runAt` ou ao instante da chamada quando ele falta.
2. WHEN a chamada recebe o `EntityManager` de uma transação aberta e a transação é desfeita THEN o sistema SHALL não deixar nenhum job gravado.
3. WHEN a chamada recebe o `EntityManager` de uma transação aberta e a transação é confirmada THEN o sistema SHALL deixar o job gravado.
4. WHEN uma feature chama `EmailService.enqueue(message, options)` com destinatário, assunto e conteúdo THEN o sistema SHALL gravar um job do tipo `email.send`, aceitando o mesmo `EntityManager` e o mesmo `runAt` do `JobQueue.enqueue`.
5. IF o destinatário do `EmailService.enqueue` não é um endereço de e-mail válido THEN o sistema SHALL lançar um erro e não gravar o job.
6. IF um bloco de botão do `EmailService.enqueue` tem uma URL que não é absoluta com `http:` ou `https:` THEN o sistema SHALL lançar um erro e não gravar o job.

**Independent Test**: Num teste de integração, enfileirar dentro de uma transação desfeita não deixa linha na tabela; dentro de uma confirmada deixa uma linha `PENDING` com `attempts` 0.

---

### P1: Processamento sem duplicar ⭐ MVP

**User Story**: Como operador do Amigo Secreto, quero que os jobs vencidos sejam executados em poucos segundos por qualquer instância da API, sem que duas instâncias executem o mesmo job.

**Why P1**: O pico sazonal exige escalar a API horizontalmente (`scope.md` 8).

**Acceptance Criteria**:

1. The API SHALL iniciar uma rodada de processamento a cada 10 segundos.
2. WHEN uma rodada começa THEN o sistema SHALL pegar até 50 jobs `PENDING` com `runAt` menor ou igual ao instante atual, do `runAt` mais antigo ao mais novo.
3. WHEN o sistema pega um job THEN ele SHALL marcar o job `RUNNING`, gravar `lockedAt` com o instante atual e somar 1 a `attempts`, numa transação que trava as linhas com `FOR UPDATE SKIP LOCKED`.
4. WHEN duas rodadas, de instâncias diferentes, pegam jobs ao mesmo tempo THEN o sistema SHALL entregar cada job a uma rodada só.
5. WHEN o handler do tipo do job termina sem erro THEN o sistema SHALL marcar o job `DONE`.
6. The sistema SHALL executar os jobs de uma rodada um de cada vez, na ordem em que foram pegos.
7. WHILE uma rodada ainda roda numa instância, the sistema SHALL pular o tick seguinte dessa instância.
8. The sistema SHALL não pegar jobs com `runAt` no futuro, nem jobs `DONE` ou `FAILED`.

**Independent Test**: Com 60 jobs vencidos e duas rodadas simultâneas em conexões diferentes, cada job é executado uma vez só; uma rodada sozinha pega no máximo 50.

---

### P1: Retry e falha final ⭐ MVP

**User Story**: Como operador do Amigo Secreto, quero que um job que falhou por um problema passageiro seja tentado de novo com espera crescente, e que um job perdido de vez me avise, para não perder e-mails em silêncio.

**Why P1**: E-mail de resultado do sorteio que não chega é o risco do `scope.md` 11.

**Acceptance Criteria**:

1. IF o handler falha por um erro passageiro e `attempts` é menor que 5 THEN o sistema SHALL marcar o job `PENDING`, gravar `lastError` e definir `runAt` como o instante da falha mais 5^(attempts-1) minutos (1, 5, 25 e 125 min).
2. IF o handler falha por um erro passageiro e `attempts` é 5 THEN o sistema SHALL marcar o job `FAILED` e gravar `lastError`.
3. IF o handler falha por um erro definitivo THEN o sistema SHALL marcar o job `FAILED` na hora, qualquer que seja `attempts`, e gravar `lastError`.
4. IF o `type` do job não tem handler registrado THEN o sistema SHALL marcar o job `FAILED` com `lastError` "Tipo de job desconhecido: <type>".
5. WHEN uma rodada começa e há job `RUNNING` com `lockedAt` há mais de 10 minutos e `attempts` menor que 5 THEN o sistema SHALL pegar esse job como pega um `PENDING` vencido.
6. WHEN uma rodada começa e há job `RUNNING` com `lockedAt` há mais de 10 minutos e `attempts` igual a 5 THEN o sistema SHALL marcar o job `FAILED` com `lastError` "Processamento interrompido".
7. WHEN um job vira `FAILED` THEN o sistema SHALL emitir o evento de negócio `job.failed` com `jobId`, `type` e `attempts`.
8. WHEN um job vira `FAILED` THEN o sistema SHALL enviar um erro ao Sentry com `jobId` e `type`.
9. WHEN um job volta a `PENDING` depois de uma falha THEN o sistema SHALL escrever um aviso no log com `jobId`, `type`, `attempts` e o novo `runAt`, sem enviar nada ao Sentry.
10. The `lastError` SHALL ter no máximo 500 caracteres.

**Independent Test**: Com um handler que sempre falha de forma passageira, o job passa por 5 tentativas com as esperas de 1, 5, 25 e 125 min (relógio controlado no teste) e termina `FAILED`, com um `job.failed` no log e uma chamada ao Sentry.

---

### P1: Envio pelo Resend ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero que os e-mails enfileirados saiam pelo Resend atrás de um serviço próprio, para trocar de provedor sem mexer nas features.

**Why P1**: E-mail é o único canal de notificação do MVP (`scope.md` 4.7).

**Acceptance Criteria**:

1. WHEN um job `email.send` é executado com `RESEND_API_KEY` definida THEN o sistema SHALL enviar ao Resend o destinatário, o assunto, a versão HTML e a versão texto do e-mail, com o remetente de `EMAIL_FROM`.
2. WHEN o sistema envia um e-mail ao Resend THEN ele SHALL mandar o cabeçalho `Idempotency-Key` com o valor `email/<id do job>`, igual em todas as tentativas do job.
3. IF o Resend responde 429, 409 com `name` `concurrent_idempotent_requests`, um status 5xx, não responde em 10 segundos ou a conexão falha THEN o sistema SHALL tratar a falha como passageira.
4. IF o Resend responde um status 4xx diferente de 429 e diferente do 409 `concurrent_idempotent_requests` THEN o sistema SHALL tratar a falha como definitiva.
5. WHEN o Resend aceita o e-mail THEN o sistema SHALL emitir o evento de negócio `email.sent` com `jobId`.
6. WHERE `NODE_ENV` não é `production` e `RESEND_API_KEY` não está definida, the sistema SHALL escrever no log o destinatário, o assunto e a versão texto do e-mail, sem chamar o Resend, emitir `email.sent` e marcar o job `DONE`.
7. IF `NODE_ENV` é `production` e falta `RESEND_API_KEY` ou `EMAIL_FROM` THEN a API SHALL não iniciar e SHALL mostrar um erro que nomeia a variável que falta.
8. WHERE `NODE_ENV` não é `production` e `EMAIL_FROM` não está definida, the sistema SHALL usar o remetente `Amigo Secreto <onboarding@resend.dev>`.
9. The módulos de produto SHALL enviar e-mail só pelo `EmailService`, sem importar o SDK nem a API do Resend.

**Independent Test**: Contra um servidor falso no lugar do Resend, um job `email.send` gera uma requisição com destinatário, assunto, HTML, texto, remetente e `Idempotency-Key`; respostas 500 e 422 levam o job a `PENDING` e a `FAILED`.

---

### P1: Layout comum de e-mail ⭐ MVP

**User Story**: Como pessoa que recebe um e-mail do Amigo Secreto, quero que todos tenham a mesma cara e se leiam bem no claro e no escuro, para reconhecer de onde vêm.

**Why P1**: O primeiro e-mail de produto (confirmação de conta, feature `auth`) já usa o layout.

**Acceptance Criteria**:

1. WHEN o sistema monta um e-mail THEN ele SHALL produzir uma versão HTML e uma versão texto puro com o mesmo conteúdo.
2. The versão HTML SHALL ter `lang="pt-BR"`, o nome "Amigo Secreto" no cabeçalho, o conteúdo da feature e o rodapé "Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem."
3. The versão texto SHALL começar com "Amigo Secreto" e terminar com o rodapé "Este e-mail foi enviado pelo Amigo Secreto. Não responda esta mensagem."
4. The versão HTML SHALL usar as cores do tema claro do design system como padrão.
5. WHERE o cliente de e-mail aplica `prefers-color-scheme: dark`, the versão HTML SHALL usar as cores do tema escuro do design system.
6. WHEN o conteúdo passado pela feature contém caracteres especiais de HTML (`<`, `>`, `&`, `"`, `'`) THEN a versão HTML SHALL mostrá-los como texto, sem interpretá-los como marcação.
7. WHEN o conteúdo tem um bloco de botão THEN a versão HTML SHALL mostrá-lo como um link com o rótulo e a URL do bloco, e a versão texto SHALL mostrá-lo como "<rótulo>: <URL>".

**Independent Test**: Montar um e-mail com o texto `<b>Ana & Bia</b>` gera um HTML que mostra o texto literal, com o cabeçalho, o rodapé e as cores dos dois temas, e uma versão texto com o mesmo conteúdo.

---

### P1: Sigilo nos registros ⭐ MVP

**User Story**: Como participante, quero que o nome que tirei no sorteio não apareça em log, Sentry nem campo de erro, para que só eu saiba.

**Why P1**: Sigilo do sorteio (`scope.md` 8): o e-mail de resultado carrega o nome sorteado.

**Acceptance Criteria**:

1. WHERE `NODE_ENV` é `production`, the sistema SHALL não escrever o `payload` de um job, nem o destinatário, o assunto ou o conteúdo de um e-mail, em logs, eventos de negócio ou erros enviados ao Sentry.
2. The `lastError` de um job SHALL não conter o destinatário, o assunto nem o conteúdo do e-mail.

**Independent Test**: Em `production`, um e-mail com destinatário, assunto e conteúdo marcados é enviado com sucesso, falha de forma passageira e falha de vez; nenhuma das marcas aparece no log capturado, nas chamadas ao Sentry nem no `lastError`.

---

### P1: Comando de e-mail de teste ⭐ MVP

**User Story**: Como dev do Amigo Secreto, quero mandar um e-mail de teste com um comando, para conferir a chave do Resend e o domínio de envio sem depender de uma feature de produto.

**Why P1**: Nenhuma feature de produto envia e-mail antes da `auth`; o domínio precisa ser conferido quando existir.

**Acceptance Criteria**:

1. WHEN o dev roda `pnpm --filter @amigo-secreto/api email:test <destinatário>` com um e-mail válido THEN o comando SHALL enfileirar um job `email.send` com o assunto "E-mail de teste do Amigo Secreto" e o conteúdo "Se você recebeu esta mensagem, o envio de e-mails está funcionando.", imprimir o id do job e terminar com código 0.
2. IF o dev roda o comando sem destinatário ou com um destinatário inválido THEN o comando SHALL imprimir "Informe um e-mail válido: pnpm --filter @amigo-secreto/api email:test <destinatário>", não gravar job e terminar com código 1.
3. WHEN o dev roda o comando num clone sem `dist/` THEN o comando SHALL compilar a API antes de enfileirar.

**Independent Test**: Num clone limpo com o banco de pé, o comando com um e-mail válido imprime um id e deixa um job `PENDING` com o assunto de teste; sem argumento, sai com código 1 e a mensagem.

---

## Edge Cases

- IF a instância da API cai depois de o Resend aceitar o e-mail e antes de o job virar `DONE` THEN o sistema SHALL retomar o job depois de 10 minutos e reenviar com a mesma `Idempotency-Key`, sem o Resend mandar o e-mail de novo (JOB-04 AC 5, JOB-05 AC 2).
- WHEN o `runAt` de um job enfileirado está no futuro THEN o sistema SHALL executá-lo na primeira rodada depois desse instante (JOB-03 AC 2 e AC 8).
- WHEN mais de 50 jobs vencem ao mesmo tempo THEN o sistema SHALL executar os 50 de `runAt` mais antigo na rodada e os seguintes nas próximas (JOB-03 AC 2).
- IF o Resend fica fora do ar por mais de 2h36 THEN o sistema SHALL marcar `FAILED` os jobs que esgotaram as tentativas, com `job.failed` e Sentry para cada um (JOB-04 AC 2, 7 e 8).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| JOB-01 | P1: Tabela de jobs | Design | Pending |
| JOB-02 | P1: Enfileirar na transação de origem | Design | Pending |
| JOB-03 | P1: Processamento sem duplicar | Design | Pending |
| JOB-04 | P1: Retry e falha final | Design | Pending |
| JOB-05 | P1: Envio pelo Resend | Design | Pending |
| JOB-06 | P1: Layout comum de e-mail | Design | Pending |
| JOB-07 | P1: Sigilo nos registros | Design | Pending |
| JOB-08 | P1: Comando de e-mail de teste | Design | Pending |

**ID format:** `JOB-NN`; cada check cita o ID e o número do critério (ex.: JOB-04, AC 2).

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️ (o mapeamento acontece na fase de tasks)

---

## Sources

- `.specs/docs/scope.md` - 4.7 (notificações por e-mail), 6 (modelo `Job`), 7.2 e 7.4 (tabela de jobs, `@Cron`, `FOR UPDATE SKIP LOCKED`, retry, Resend atrás de serviço próprio, `JobQueue.enqueue`), 8 (sigilo do sorteio, observabilidade, envio em partes) e 8.1 (retenção dos jobs, fora desta feature).
- `.specs/features/02-email-jobs/context.md` - decisões do usuário de 2026-11-18, com as palavras dele.
- `.specs/STATE.md` - AD-001 (divisão em features), AD-004 (migrations por comando), AD-005 (métricas por log de evento), AD-007 (ESM).
- Documentação do Resend (via Context7, 2026-11-18) - `Idempotency-Key` guardada por 24 h, máximo de 256 caracteres; limite padrão de 10 requisições/s por time, com 429 acima dele.
- Design system "Cristal e Gelo" (artifact privado no claude.ai) e `apps/web/src/app/globals.css` - cores dos temas claro e escuro do layout de e-mail. Não há captura de tela do e-mail.

---

## Success Criteria

- [ ] A feature `auth` envia o e-mail de confirmação de conta com uma chamada ao `EmailService.enqueue`, sem criar tabela, cron, retry nem layout.
- [ ] O comando de e-mail de teste, com uma chave real do Resend, entrega um e-mail na caixa de entrada em até 10 segundos com a API rodando.
- [ ] Nenhum teste de sigilo encontra destinatário, assunto ou conteúdo de e-mail em log, Sentry ou `lastError`.
