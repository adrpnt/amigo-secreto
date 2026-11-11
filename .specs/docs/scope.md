# Escopo do Projeto: Amigo Secreto

> Documento de escopo inicial. Referência analisada: https://www.amigosecreto.com.br (levantamento feito em 2026-11-11).
> Stack definida: **NestJS** (backend) e **Next.js** (frontend).

---

## 1. Visão geral

Plataforma web gratuita para organizar a brincadeira de amigo secreto: o organizador cria um grupo, convida as pessoas por link (principalmente via WhatsApp), realiza o sorteio, e cada participante descobre apenas quem tirou. Durante o período do grupo, os participantes compartilham listas de desejos e trocam mensagens anônimas com seu amigo secreto.

### 1.1 Objetivos

- Permitir criar um grupo e realizar o sorteio em poucos minutos, sem fricção.
- Garantir sigilo: ninguém (nem o organizador) vê o resultado de outras pessoas.
- Facilitar a escolha do presente com listas de desejos por grupo.
- Manter a interação durante o ciclo do grupo (mural e mensagens secretas).
- Experiência mobile first, já que o convite chega majoritariamente pelo WhatsApp.

### 1.2 Público-alvo

- Grupos de trabalho (confraternizações de fim de ano em empresas são o principal caso de uso da referência).
- Famílias e grupos de amigos.
- Faixa predominante: 18 a 35 anos, uso pelo celular.

---

## 2. Análise da referência

### 2.1 O que a referência oferece

| Área | Como funciona na referência |
| --- | --- |
| Criação de grupo | Nome obrigatório; valor do presente, data/hora do sorteio e data/hora/local da confraternização podem ser definidos depois. |
| Convite | Link do grupo, compartilhado principalmente pelo WhatsApp. Organizador acompanha quem entrou. |
| Entrada no grupo | Exige conta (e-mail e senha ou Google). Grupo pode exigir aprovação do organizador. |
| Sorteio | Manual, disparado pelo organizador. Mínimo de 3 participantes aprovados e nenhum pedido pendente. A data do sorteio serve só como lembrete por e-mail. |
| Regras do sorteio | Padrão: todos podem tirar todos, ninguém tira a si mesmo. Restrições individuais ("quem tiro / quem não tiro") são pagas e ocultas. |
| Resultado | Cada participante vê só o próprio sorteado, no site e por e-mail. |
| Re-sorteio | Organizador cancela o sorteio (reabre o grupo) e sorteia de novo. Grupo sorteado não aceita novas entradas. |
| Lista de desejos | Por grupo. Itens próprios (texto, link, foto) ou adicionados a partir da vitrine. |
| Comunicação | Mural do grupo (com opção de postar como anônimo) e canal secreto com quem você tirou e com quem te tirou. |
| Notificações | E-mail (lembrete de sorteio, resultado, conta). Sem SMS ou push. |
| Monetização | Vitrine de presentes com links para lojas, publicidade, restrições de sorteio pagas. |
| Plataforma | Web responsiva, sem app nativo. PT, EN e ES. |

### 2.2 Pontos de atenção e oportunidades (aprovados)

Todos os pontos abaixo foram aprovados e fazem parte do escopo do produto.

| Ponto | Na referência | Decisão | Entrega |
| --- | --- | --- | --- |
| Restrições de sorteio | O organizador não pode definir exclusões; restrições são individuais e pagas. | O organizador define gratuitamente pares que não podem se tirar (ex.: casais). | MVP (4.4) |
| Convite por e-mail | Só link, compartilhado pelo WhatsApp. | Oferecer link + convite por e-mail. | MVP (4.3) |
| Exclusão de conta | Burocrática: sair de todos os grupos e pedir por e-mail ao suporte. | Exclusão por autoatendimento, atendendo à LGPD. | MVP (4.1) |
| Consentimento de marketing | Embutido nos termos de uso. | Opt-in de marketing separado, opcional e revogável. | MVP (4.1) |
| Revelação | Não existe; a revelação é feita na festa, sem apoio do app. | Recurso de revelação do amigo secreto no app (ver 4.9.1). | Pós-MVP |

---

## 3. Personas e papéis

| Papel | Descrição |
| --- | --- |
| Visitante | Não autenticado. Acessa landing page, páginas informativas e o link de convite. |
| Usuário | Possui conta. Pode criar grupos e participar de grupos. |
| Organizador | Usuário que criou o grupo (ou recebeu a organização por transferência). Gerencia dados do grupo, participantes e sorteio. Sempre participa do sorteio; não existe papel de apenas administrador. |
| Participante | Usuário aprovado em um grupo. |
| Administrador (futuro) | Equipe da plataforma. Moderação e suporte. |

> Um mesmo usuário pode ser organizador de um grupo e participante de outros.

---

## 4. Escopo funcional

As funcionalidades estão divididas em **MVP** (primeira entrega) e **Pós-MVP** (evoluções).

### Resumo: MVP x Pós-MVP

| Área | Funcionalidade | MVP | Pós-MVP |
| --- | --- | :---: | :---: |
| Conta | Cadastro e login com e-mail e senha | ✅ | |
| Conta | Login com Google | ✅ | |
| Conta | Confirmação de e-mail e recuperação de senha | ✅ | |
| Conta | Edição de perfil | ✅ | |
| Conta | Aceite de termos e opt-in de marketing separado | ✅ | |
| Conta | Exclusão de conta por autoatendimento | ✅ | |
| Conta | Exportação dos dados do usuário (LGPD) | | ✅ |
| Grupos | Criar grupo só com o nome (demais dados opcionais) | ✅ | |
| Grupos | Meus grupos, editar, arquivar e excluir grupo | ✅ | |
| Grupos | Transferir organização para outro participante | ✅ | |
| Grupos | Grupos recorrentes (duplicar grupo do ano anterior) | | ✅ |
| Convites | Link de convite com compartilhamento no WhatsApp | ✅ | |
| Convites | Regenerar link de convite | ✅ | |
| Convites | Convite por e-mail | ✅ | |
| Convites | Aprovação de entrada pelo organizador (opcional) | ✅ | |
| Convites | Remover participante e sair do grupo (grupo aberto) | ✅ | |
| Convites | Convite e lembretes via API oficial do WhatsApp | | ✅ |
| Sorteio | Sorteio manual pelo organizador (mínimo de 3) | ✅ | |
| Sorteio | Restrições "quem não tira quem" gratuitas | ✅ | |
| Sorteio | Resultado no site e por e-mail | ✅ | |
| Sorteio | Cancelar sorteio e sortear novamente | ✅ | |
| Sorteio | Lembrete ao organizador na data prevista | ✅ | |
| Sorteio | Revelação do amigo secreto no app | | ✅ |
| Lista de desejos | Lista por grupo, com link, imagem (URL) e faixa de preço | ✅ | |
| Lista de desejos | Upload de imagem dos itens (Cloudinary) | | ✅ |
| Lista de desejos | Copiar itens para outro grupo | | ✅ |
| Lista de desejos | Link público da lista | | ✅ |
| Lista de desejos | Vitrine de sugestões com "Quero ganhar" e "Ver na loja" | | ✅ |
| Comunicação | Mural do grupo com opção de publicar como anônimo | ✅ | |
| Comunicação | Mensagens secretas com quem tirei e com quem me tirou | ✅ | |
| Comunicação | Moderação do mural pelo organizador | ✅ | |
| Notificações | E-mails transacionais (seção 4.7) | ✅ | |
| Notificações | Central de notificações no app | | ✅ |
| Notificações | Push web | | ✅ |
| Plataforma | Web responsiva, mobile first | ✅ | |
| Plataforma | Páginas públicas (landing, como funciona, FAQ, termos) | ✅ | |
| Plataforma | PWA instalável | | ✅ |
| Plataforma | Internacionalização (EN e ES) | | ✅ |
| Plataforma | Painel administrativo (suporte, moderação, métricas) | | ✅ |
| Monetização | Links de afiliados e espaços publicitários | | ✅ |
| Monetização | Restrições individuais pagas | | ✅ |

Os detalhes de cada funcionalidade estão nas subseções a seguir. O que não será feito está em 4.10.

### 4.1 Autenticação e conta (MVP)

- Cadastro com nome, e-mail e senha.
- Login com e-mail e senha.
- Login com Google (OAuth).
- Confirmação de e-mail.
- Recuperação de senha por e-mail.
- Edição de perfil (nome, foto opcional).
- Exclusão da própria conta pelo próprio usuário (LGPD), com tratamento dos grupos em que participa. Se o usuário organiza grupos ativos com outros participantes, o fluxo lista esses grupos e exige a transferência da organização antes de concluir a exclusão (RN12 e RN15).
- Aceite de termos de uso e política de privacidade no cadastro; opt-in de marketing separado e opcional, que pode ser revogado a qualquer momento no perfil.

### 4.2 Grupos (MVP)

- Criar grupo informando apenas o **nome** (demais campos opcionais e editáveis depois):
  - Descrição/recado do organizador.
  - Valor sugerido do presente (valor único ou faixa mínima/máxima).
  - Data e hora previstas para o sorteio (usada como lembrete).
  - Data, hora e local da confraternização (ou indicação de evento online).
  - Exigir aprovação para entrada (sim/não).
- Listar "Meus grupos" (como organizador e como participante), com status.
- Editar dados do grupo (somente organizador).
- Arquivar/excluir grupo (somente organizador).
- Transferir organização para outro participante aprovado, a qualquer momento (RN15).

**Status do grupo:**

```text
ABERTO  ──(sortear)──▶  SORTEADO  ──(data da troca passou / encerrar)──▶  ENCERRADO
   ▲                        │
   └────(cancelar sorteio)──┘
```

O grupo é encerrado automaticamente conforme a política de retenção (8.1), ou manualmente pelo organizador.

### 4.3 Convites e participantes (MVP)

- Link de convite único por grupo, com botão de compartilhar no WhatsApp e copiar link.
- Regenerar o link de convite (invalida o anterior).
- Convite por e-mail (organizador informa e-mails; a pessoa recebe o link).
- Ao abrir o link: visualizar nome do grupo e organizador, depois entrar ou criar conta e ingressar.
- Se o grupo exigir aprovação, a entrada fica **pendente** até o organizador aprovar ou recusar.
- Organizador vê a lista de participantes (aprovados e pendentes), com paginação e busca, já que não há limite de participantes.
- Organizador pode remover participante enquanto o grupo está **ABERTO**.
- Participante pode sair do grupo enquanto o grupo está **ABERTO**.
- Grupo **SORTEADO** não aceita novas entradas nem saídas.

### 4.4 Sorteio (MVP)

- Disparado manualmente pelo organizador.
- Pré-condições:
  - Mínimo de **3 participantes aprovados**.
  - Nenhuma solicitação de entrada pendente.
  - As restrições configuradas permitem pelo menos uma distribuição válida.
- Regras padrão:
  - Ninguém tira a si mesmo.
  - Cada participante tira exatamente uma pessoa e é tirado por exatamente uma pessoa.
- **Restrições definidas pelo organizador** (diferencial, gratuito): pares que não podem se tirar (ex.: casais). Configuradas antes do sorteio e visíveis apenas ao organizador.
- Resultado:
  - Cada participante vê somente quem tirou, no site.
  - E-mail enviado a cada participante com o nome sorteado.
  - O organizador **não** tem acesso ao resultado dos outros participantes.
- Cancelar sorteio: desfaz a rodada e volta o grupo para **ABERTO**. Exige confirmação, com aviso de que participantes podem já ter visto o resultado. Participantes são notificados por e-mail.
- Re-sortear: nova distribuição para os participantes aprovados.
- Lembrete por e-mail ao organizador na data prevista do sorteio, se o grupo ainda estiver **ABERTO**.

### 4.5 Lista de desejos (MVP)

- Lista **por grupo** e por participante.
- Item com: título (obrigatório), descrição, link (opcional), imagem (opcional, via URL no MVP), faixa de preço (opcional).
- Ordenar itens por preferência.
- Visibilidade: participantes do mesmo grupo. O destaque principal é para quem tirou a pessoa.
- Copiar itens de uma lista para outro grupo (Pós-MVP).

### 4.6 Comunicação (MVP)

- **Mural do grupo**: publicações e comentários visíveis a todos os participantes, com opção "publicar como anônimo".
- **Mensagens secretas** (disponíveis após o sorteio):
  - Conversa com **quem eu tirei**: eu apareço como "Seu amigo secreto"; a outra pessoa aparece com o nome.
  - Conversa com **quem me tirou**: a outra pessoa aparece como "Seu amigo secreto".
  - A interface deixa claro quem recebe e se o nome aparece.
- Organizador pode remover publicações do mural (moderação básica).
- Mensagens secretas são apagadas ou ficam inacessíveis ao cancelar o sorteio (ficam vinculadas à rodada).

### 4.7 Notificações (MVP: e-mail)

| Evento | Destinatário |
| --- | --- |
| Confirmação de e-mail / recuperação de senha | Usuário |
| Convite por e-mail | Convidado |
| Nova solicitação de entrada | Organizador |
| Entrada aprovada / recusada | Participante |
| Lembrete de sortear na data prevista | Organizador |
| Sorteio realizado (com o nome sorteado) | Cada participante |
| Sorteio cancelado | Participantes |
| Nova mensagem secreta (agrupada, com limite de frequência) | Destinatário |
| Lembrete da confraternização (ex.: 1 dia antes) | Participantes |

Notificações no app (sino/central de notificações) e push web ficam para o Pós-MVP.

### 4.8 Páginas públicas (MVP)

- Landing page com proposta de valor e CTA "Criar grupo".
- Como funciona.
- Ajuda / FAQ.
- Termos de uso, política de privacidade e política de cookies.

### 4.9 Pós-MVP (backlog priorizável)

- Vitrine de sugestões de presentes por faixa de preço e categoria, com "Quero ganhar" (adiciona à lista) e "Ver na loja".
- Monetização: links de afiliados na vitrine, espaços publicitários, restrições individuais pagas. Somente após a validação do produto.
- Revelação do amigo secreto no app (detalhada em 4.9.1).
- Notificações in-app e push web.
- Convite e lembretes via WhatsApp (API oficial).
- Internacionalização (EN e ES).
- PWA instalável.
- Grupos recorrentes (duplicar grupo do ano anterior).
- Painel administrativo (suporte, moderação, métricas).
- Exportar/compartilhar link público da lista de desejos.
- Upload de imagem dos itens da lista de desejos via Cloudinary (ver 7.4).

#### 4.9.1 Revelação do amigo secreto

Apoio do app ao momento da troca, que hoje acontece apenas na festa. **Todos os formatos abaixo serão oferecidos:**

1. **Revelação coletiva conduzida pelo organizador**: "modo revelação" que mostra a corrente de quem tirou quem, uma pessoa por vez, para projetar numa TV ou acompanhar pelo celular. Revela a rodada inteira.
2. **Revelação individual**: o participante revela a identidade para quem tirou, que recebe uma notificação. Útil em grupos à distância. Revela só aquele par.
3. **Revelação automática após o evento**: depois da data da confraternização, se a rodada ainda não tiver sido revelada, o resultado completo fica visível a todos do grupo.
4. **Fim do anonimato nas mensagens**: consequência das anteriores. Após a revelação, o canal secreto passa a exibir o nome verdadeiro (em todos os pares, na revelação coletiva ou automática; só no par revelado, na individual).

Impacto: a revelação é uma exceção controlada à RN06. A revelação da rodada inteira é registrada em `Draw.revealedAt` e a de um par em `Assignment.revealedAt`.

### 4.10 Fora de escopo

- Processamento de pagamentos e venda de produtos pela plataforma (compra sempre no site da loja).
- Logística de entrega de presentes.
- App mobile nativo.
- Chat em tempo real no MVP (mensagens podem ser assíncronas, com atualização ao abrir a tela).

---

## 5. Regras de negócio

| ID | Regra |
| --- | --- |
| RN01 | Só usuários autenticados podem entrar em grupos. |
| RN02 | O organizador é sempre participante aprovado do grupo e entra no sorteio. Não existe a opção de apenas administrar. |
| RN03 | O sorteio exige no mínimo 3 participantes aprovados e nenhuma solicitação pendente. |
| RN04 | Ninguém tira a si mesmo; a distribuição é uma permutação sem pontos fixos que respeita as restrições. |
| RN05 | Se as restrições impedirem qualquer distribuição válida, o sorteio é bloqueado e o organizador é informado sobre quais restrições revisar. |
| RN06 | Resultado individual visível apenas para o próprio participante. Nenhum endpoint expõe o resultado completo, nem para o organizador, até que a rodada ou o par seja revelado (Pós-MVP, ver 4.9.1). |
| RN07 | Grupo sorteado não aceita entrada, saída nem remoção de participantes; para isso é preciso cancelar o sorteio. |
| RN08 | Cancelar o sorteio invalida a rodada atual, incluindo as mensagens secretas dela. |
| RN09 | Um usuário não pode entrar duas vezes no mesmo grupo. |
| RN10 | Apenas o organizador edita o grupo, gerencia participantes, configura restrições e sorteia. |
| RN11 | Restrições só podem ser editadas com o grupo ABERTO. |
| RN12 | Ao excluir a conta, o usuário é removido dos grupos ABERTOS; em grupos SORTEADOS, o organizador é avisado de que precisa re-sortear. Se o usuário for organizador, vale a RN15. |
| RN13 | Menores de 18 anos precisam de autorização dos responsáveis (declaração nos termos). |
| RN14 | Não há limite máximo de participantes por grupo. |
| RN15 | O organizador pode transferir a organização a qualquer momento para um participante aprovado, e continua no grupo como participante. A transferência não dá ao novo organizador acesso ao resultado (RN06). Para excluir a conta ou sair do grupo, o organizador precisa transferir antes a organização dos grupos ABERTOS ou SORTEADOS que tenham outros participantes; grupos em que ele é o único participante são excluídos junto com a conta. |

### 5.1 Algoritmo de sorteio

- Gerar uma permutação aleatória com fonte criptograficamente segura (`crypto.randomInt`).
- Abordagem sugerida: embaralhar os participantes e formar um **ciclo único** (A→B→C→...→A), o que evita "pares fechados" e garante que ninguém tire a si mesmo. Com restrições, usar embaralhamento com retentativas e, se necessário, backtracking (grupos são pequenos, então o custo é baixo).
- Persistir o resultado de forma que a consulta seja sempre filtrada pelo usuário logado.
- Operação transacional: ou todo o resultado é gravado, ou nada.
- Cobrir com testes (propriedades: bijeção, sem auto-sorteio, restrições respeitadas, detecção de impossibilidade).

---

## 6. Modelo de dados preliminar

```text
User
  id, name, email (único), passwordHash?, googleId?, avatarUrl?,
  emailVerifiedAt?, marketingOptIn, createdAt, deletedAt?

Group
  id, name, description?, ownerId → User,
  giftMinValue?, giftMaxValue?, drawScheduledAt?,
  eventAt?, eventLocation?, isOnlineEvent,
  requiresApproval, inviteCode (único), status (OPEN | DRAWN | CLOSED),
  createdAt, updatedAt

Membership
  id, groupId → Group, userId → User,
  status (PENDING | APPROVED | REJECTED), joinedAt
  único (groupId, userId)

Exclusion                      # pares que não podem se tirar
  id, groupId, giverUserId, receiverUserId

Draw                           # rodada de sorteio
  id, groupId, status (ACTIVE | CANCELLED), createdAt, cancelledAt?,
  revealedAt?                  # Pós-MVP: revelação (4.9.1)

Assignment
  id, drawId → Draw, giverUserId, receiverUserId,
  revealedAt?                  # Pós-MVP: revelação individual (4.9.1)
  único (drawId, giverUserId), único (drawId, receiverUserId)

WishlistItem
  id, groupId, userId, title, description?, url?, imageUrl?,
  priceMin?, priceMax?, position, createdAt

WallPost
  id, groupId, authorId, isAnonymous, content, createdAt, deletedAt?

WallComment
  id, postId, authorId, isAnonymous, content, createdAt, deletedAt?

SecretMessage
  id, drawId, assignmentId, direction (GIVER_TO_RECEIVER | RECEIVER_TO_GIVER),
  content, readAt?, createdAt

EmailInvite
  id, groupId, email, sentAt, acceptedAt?

Job                            # fila e agendamento (7.2)
  id, type, payload (json), runAt,
  status (PENDING | RUNNING | DONE | FAILED),
  attempts, lastError?, lockedAt?, createdAt
```

> Em `WallPost`/`WallComment` anônimos o `authorId` é guardado para moderação, mas nunca exposto pela API.

---

## 7. Arquitetura e stack

### 7.1 Visão geral

```text
[Next.js (App Router)]  ──HTTP/JSON──▶  [NestJS API]  ──TypeORM──▶  [PostgreSQL]
        │                                    │                          ▲
        └── SSR/SEO das páginas públicas     │                          │ tabela de jobs
                                             └──▶ [@nestjs/schedule] ───┘
                                                         │
                                                         └──▶ [Resend (e-mail)]

Pós-MVP: [Navegador] ──upload assinado pela API──▶ [Cloudinary (imagens + CDN)]
```

### 7.2 Backend (NestJS)

- Módulos sugeridos: `auth`, `users`, `groups`, `memberships`, `invites`, `draws`, `wishlists`, `wall`, `messages`, `notifications`.
- Autenticação: JWT em cookie httpOnly (access + refresh) e estratégia Google OAuth.
- Validação de entrada com DTOs (`class-validator`).
- Autorização por guards (organizador, participante aprovado, dono do recurso).
- Persistência com TypeORM: entidades com decorators, repositórios injetados via `@nestjs/typeorm` e migrations versionadas (`synchronize` desabilitado fora do ambiente local).
- Jobs assíncronos (e-mails e lembretes) gravados numa tabela `Job` no PostgreSQL, na mesma transação da operação que os origina. Um `@Cron` do `@nestjs/schedule` processa os jobs vencidos usando `FOR UPDATE SKIP LOCKED`, o que permite rodar várias instâncias da API sem duplicar execuções. Retry com backoff implementado sobre `attempts` e `runAt`.
- E-mails transacionais enviados pelo Resend, encapsulados num serviço próprio para isolar o provedor.
- Enfileiramento exposto por uma interface interna (ex.: `JobQueue.enqueue(type, payload, runAt)`), para permitir trocar por uma fila dedicada no futuro sem afetar os módulos.
- Pós-MVP: endpoint que assina os parâmetros de upload do Cloudinary, validando autenticação e posse do item.
- Documentação da API com OpenAPI/Swagger.

### 7.3 Frontend (Next.js)

- App Router, mobile first.
- Estilização com Tailwind CSS e componentes do shadcn/ui.
- Páginas públicas renderizadas no servidor (SEO): landing, como funciona, FAQ, termos.
- Área logada: meus grupos, detalhe do grupo (abas: participantes, lista de desejos, mural, mensagens), meu sorteado, perfil.
- Página de convite (`/convite/[code]`) otimizada para abrir a partir do WhatsApp, com meta tags Open Graph para preview do link.

### 7.4 Decisões técnicas

| Tema | Decisão | Observações |
| --- | --- | --- |
| Banco de dados | PostgreSQL | Também armazena a tabela de jobs. |
| ORM | TypeORM | Mantém o estilo de classes e decorators do NestJS em todo o código. Usar a versão 1.x e migrations versionadas. |
| Estrutura do repositório | Monorepo com pnpm workspaces + Turborepo | pnpm cuida da instalação e da ligação dos pacotes; Turborepo orquestra build, lint e testes com cache. Estrutura em 7.5. |
| Fila e agendamento | `@nestjs/schedule` + tabela de jobs no PostgreSQL | Sem Redis. Consistência transacional entre dados e jobs. Retry e limpeza de jobs implementados no projeto. |
| Provedor de e-mail | Resend | Configurar SPF, DKIM e DMARC no domínio de envio. |
| Upload de imagens | Cloudinary | MVP aceita imagem só por URL. Upload pelo Cloudinary no Pós-MVP, com upload assinado pela API, poucos tamanhos fixos e entrega sempre transformada (remove EXIF). Salvar só o `public_id` no banco. |
| UI kit | Tailwind CSS + shadcn/ui | |
| Hospedagem | **Em aberto** | Opções: Vercel (front) + Railway, Render, Fly.io ou AWS (API e banco). |

### 7.5 Estrutura do repositório

```text
amigo-secreto/
├── apps/
│   ├── api/            # NestJS
│   └── web/            # Next.js
├── packages/
│   └── shared/         # tipos, enums e contratos usados pela API e pelo front
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 8. Requisitos não funcionais

- **Privacidade e LGPD**: consentimento explícito, opt-in de marketing separado, exclusão de conta por autoatendimento, exportação dos dados do usuário (Pós-MVP), política de privacidade clara.
- **Sigilo do sorteio**: nenhuma rota, log ou resposta de API expõe o resultado completo; testes automatizados garantindo isso.
- **Segurança**: senhas com hash forte (argon2 ou bcrypt), rate limiting em login, cadastro, convite e mensagens, códigos de convite não sequenciais e difíceis de adivinhar, proteção CSRF para cookies, sanitização de conteúdo do mural e das mensagens.
- **Performance**: páginas principais carregando rápido em 4G. Como não há limite de participantes (RN14), o sorteio sem restrições deve ter custo linear (ciclo único) e o sorteio com restrições deve ter tempo máximo de execução, com mensagem clara ao organizador se não encontrar distribuição a tempo. Listas de participantes, mural e envio de e-mails em lote devem ser paginados ou processados em partes.
- **Disponibilidade sazonal**: pico de uso entre novembro e dezembro; infraestrutura deve escalar horizontalmente nesse período.
- **Acessibilidade**: conformidade com WCAG 2.1 nível AA nas telas principais.
- **Observabilidade**: logs estruturados, monitoramento de erros e métricas básicas (grupos criados, sorteios, e-mails enviados e falhas).
- **Testes**: unitários para regras de negócio (especialmente o sorteio), integração/e2e para os fluxos principais da API e do frontend.

### 8.1 Política de retenção de dados

| Dado | Retenção | Motivo |
| --- | --- | --- |
| Encerramento do grupo | Grupo passa a ENCERRADO automaticamente 7 dias após a data da confraternização, ou 60 dias após o sorteio se não houver data definida. O organizador também pode encerrar manualmente. | Marco objetivo para as regras abaixo. |
| Mensagens secretas, mural e comentários | Excluídos 90 dias após o encerramento do grupo. | Conteúdo mais sensível e sem utilidade depois da troca. |
| Grupo, participantes, resultado do sorteio e listas de desejos | Mantidos por 13 meses após o encerramento e depois excluídos. | Permite consultar o histórico e reaproveitar o grupo na temporada seguinte (grupos recorrentes). |
| Convites por e-mail não aceitos | Excluídos quando o grupo é encerrado. | E-mail de terceiro que não criou conta (minimização). |
| Jobs | Concluídos: 30 dias. Com falha: 90 dias. | Diagnóstico e auditoria de envios. |
| Contas inativas | Aviso por e-mail após 24 meses sem login; exclusão 30 dias depois do aviso se não houver acesso. | Minimização de dados (LGPD). |
| Conta excluída pelo usuário | Dados pessoais removidos na hora, observadas a RN12 e a RN15. Backups expiram no ciclo normal de retenção do provedor. | Direito de eliminação (LGPD). |

---

## 9. Fluxos principais (MVP)

### 9.1 Organizador

1. Cria conta ou faz login.
2. Cria o grupo informando o nome (demais dados opcionais).
3. Compartilha o link pelo WhatsApp ou convida por e-mail.
4. Aprova solicitações (se o grupo exigir aprovação).
5. Configura restrições (opcional).
6. Realiza o sorteio quando todos entraram.
7. Acompanha o mural e participa como qualquer participante.

### 9.2 Participante

1. Recebe o link e abre no navegador.
2. Vê o nome do grupo e entra com conta existente ou cria uma.
3. Aguarda aprovação (se exigida).
4. Monta a lista de desejos do grupo.
5. Após o sorteio, vê quem tirou (site e e-mail) e consulta a lista de desejos dessa pessoa.
6. Troca mensagens secretas com quem tirou e com quem o tirou.
7. Leva o presente no dia da confraternização.

---

## 10. Métricas de sucesso

- Taxa de grupos criados que chegam ao sorteio.
- Tempo médio entre criar o grupo e sortear.
- Taxa de conversão do link de convite (abriu link → entrou no grupo).
- Percentual de participantes com ao menos um item na lista de desejos.
- Taxa de entrega e abertura do e-mail de resultado do sorteio.

---

## 11. Riscos

| Risco | Mitigação |
| --- | --- |
| Vazamento do resultado do sorteio | Testes de autorização, consultas sempre filtradas pelo usuário, revisão de segurança. |
| E-mails caindo em spam (resultado não chega) | Provedor confiável, SPF/DKIM/DMARC, resultado sempre disponível no site. |
| Abuso do mural/mensagens anônimas | Moderação pelo organizador, denúncia, rate limiting, retenção do autor real para moderação. |
| Pico sazonal derrubando o serviço | Testes de carga antes de novembro, filas para e-mails, escalabilidade horizontal. |
| Fricção do cadastro obrigatório | Login com Google, cadastro mínimo, página de convite clara. |
| Link aberto no navegador interno do WhatsApp (OAuth Google pode falhar) | Detectar in-app browser e orientar a abrir no navegador padrão. |

---

## 12. Decisões e perguntas em aberto

### 12.1 Decisões tomadas

| Data | Decisão |
| --- | --- |
| 2026-11-11 | Restrições de sorteio ("quem não tira quem") são gratuitas para o organizador desde o MVP. |
| 2026-11-11 | Convite por link e por e-mail no MVP. |
| 2026-11-11 | Exclusão de conta por autoatendimento e opt-in de marketing separado no MVP (LGPD). |
| 2026-11-11 | Recurso de revelação aprovado para o Pós-MVP. |
| 2026-11-11 | Stack técnica: PostgreSQL, TypeORM, monorepo com pnpm workspaces + Turborepo, `@nestjs/schedule` com tabela de jobs, Resend, Cloudinary e Tailwind CSS + shadcn/ui (detalhes em 7.4). |
| 2026-11-11 | Não haverá entrada sem cadastro: participar de um grupo exige conta (RN01). |
| 2026-11-11 | O organizador sempre participa do sorteio; não existe papel de apenas administrador (RN02). |
| 2026-11-11 | Sem limite máximo de participantes por grupo (RN14). |
| 2026-11-11 | Transferência de organização entra no MVP e é exigida antes de o organizador excluir a conta ou sair do grupo (RN15). |
| 2026-11-11 | Monetização somente após a validação do produto. |
| 2026-11-11 | Sem data-alvo para o lançamento do MVP. |
| 2026-11-11 | Revelação oferecida em todos os formatos: coletiva, individual, automática e fim do anonimato (4.9.1). |
| 2026-11-11 | Política de retenção de dados aprovada (8.1). |

### 12.2 Perguntas em aberto

1. Onde a aplicação será hospedada (front, API e banco)?
