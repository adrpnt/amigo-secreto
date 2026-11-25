# Draw Context

**Gathered:** 2026-11-25
**Spec:** `.specs/features/06-draw/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A `06-draw` entrega as restrições de quem não tira quem, o sorteio manual feito por quem organiza, o resultado de cada participante (no site e por e-mail), o cancelamento do sorteio (que reabre o grupo e permite sortear de novo) e o lembrete por e-mail a quem organiza na data prevista do sorteio (`scope.md` 4.4, RN03 a RN08, RN10, RN11, 5.1).

---

## Implementation Decisions

### Lugar das telas

- Nova aba "Sorteio" em `/grupos/{id}/sorteio`. Quem organiza vê o painel do sorteio e as restrições; depois do sorteio, cada participante vê ali o próprio resultado. Pergunta em 2026-11-25: "Onde ficam as telas do sorteio?", resposta "Aba \"Sorteio\" (Recomendado)", entre essa, "Espalhado nas abas atuais" e "Aba Sorteio + página do resultado".

### Distribuição

- O sorteio sempre tenta uma corrente única (A→B→C→...→A, sem par fechado). Se as restrições impedirem a corrente, aceita qualquer distribuição em que ninguém tira a si mesmo e que respeite as restrições. Só bloqueia quando nenhuma distribuição existe, e então diz com certeza quais pares revisar. Pergunta em 2026-11-25: "Como o sorteio distribui as pessoas?", resposta "Corrente quando der (Recomendado)", entre essa, "Só corrente única" e "Qualquer distribuição".

### Re-sorteio

- "Cancelar sorteio" volta o grupo para ABERTO, e o mesmo botão "Sortear" faz a nova rodada. Os participantes recebem o e-mail de cancelamento e, no novo sorteio, o do resultado novo. Não há botão "Sortear de novo". Pergunta em 2026-11-25: "Como funciona o re-sorteio?", resposta "Cancelar e sortear (Recomendado)", entre essa e "Botão \"Sortear de novo\"".

### Par que impossibilita o sorteio

- O par é salvo. O painel mostra como pendente a condição de que as restrições permitem o sorteio, "Sortear" fica desabilitado e um alerta diz quais pares revisar. O mesmo aviso cobre quando alguém sai ou é removido e o sorteio deixa de ser possível. Pergunta em 2026-11-25: "O que acontece quando quem organiza cadastra um par que deixa o sorteio impossível?", resposta "Salva e o painel avisa (Recomendado)", entre essa e "Recusa o par na hora".

### Lembrete de sortear

- O e-mail a quem organiza sai na data e hora do sorteio previsto, se o grupo ainda estiver ABERTO. Mudar a data reagenda; tirar a data, sortear ou excluir o grupo cancela. Pergunta em 2026-11-25: "Quando sai o lembrete de sortear para quem organiza?", resposta "Na hora prevista (Recomendado)", entre essa, "Manhã do dia (9h)" e "Um dia antes".

### Limite de sorteios

- Até 5 sorteios por grupo a cada 24 horas; acima, 429 "Muitas tentativas. Tente de novo em N minutos.", o mesmo texto dos outros limites. Cancelar não tem limite próprio. Pergunta em 2026-11-25: "Quem organiza pode sortear e cancelar sem limite?", resposta "5 sorteios por dia (Recomendado)", entre essa, "Sem limite" e "3 sorteios por dia".

### Pares de quem sai

- Quem sai do grupo ou é removido perde os pares de restrição; se voltar, entra sem restrições. Pergunta em 2026-11-25: "O que acontece com os pares de restrição de uma pessoa que sai do grupo ou é removida?", resposta "Somem (Recomendado)", entre essa e "Ficam guardados".

### Restrições depois da transferência

- As restrições são do grupo: quem organiza agora vê e edita os pares; quem passou a organização deixa de ver. Pergunta em 2026-11-25: "Quem vê as restrições depois que a organização é transferida?", resposta "Quem organiza agora (Recomendado)", entre essa e "Pares apagados na transferência".

### Eventos

- `draw.performed` (groupId, número de participantes, se saiu corrente única, se havia restrições), `draw.cancelled` (groupId, tempo desde o sorteio) e `draw.reminder_sent` (groupId). Sem evento de restrição. Pergunta em 2026-11-25: "Quais eventos de negócio a feature emite?", resposta "draw.performed (Recomendado), draw.cancelled (Recomendado), draw.reminder_sent (Recomendado)", sem "exclusion.added / removed".

### Resultado em grupo ENCERRADO

- O resultado continua na aba Sorteio, só leitura, enquanto o grupo existir. Pergunta em 2026-11-25: "Depois que o grupo vai para ENCERRADO, a pessoa ainda vê quem tirou na aba Sorteio?", resposta "Continua vendo (Recomendado)", entre essa e "Some ao encerrar".

### Papelzinho

- Toda visita abre dobrado, com "Toque para abrir"; o nome só vem do servidor quando a pessoa toca. Pergunta em 2026-11-25: "O papelzinho do resultado volta dobrado a cada visita?", resposta "Sempre dobrado (Recomendado)", entre essa e "Lembra que abriu".

### Participante antes do sorteio

- Quem não organiza vê só o aviso "O sorteio ainda não foi feito. Você recebe um e-mail quando {organizador} sortear.", sem condições nem restrições. Pergunta em 2026-11-25: "Antes do sorteio, o que um participante que não organiza vê na aba Sorteio?", resposta "Só o aviso (Recomendado)", entre essa e "Aviso e condições".

### Confirmação do sorteio

- "Sortear" abre o ConfirmDialog "Fazer o sorteio de {grupo}?" / "Cada pessoa recebe por e-mail quem tirou. Depois do sorteio, ninguém entra nem sai do grupo sem cancelar o sorteio." / "Sortear" e "Ainda não". Pergunta em 2026-11-25: "\"Sortear\" pede confirmação antes?", resposta "Com confirmação (Recomendado)", entre essa e "Sem confirmação".

### E-mail do resultado

- Assunto "O sorteio de {grupo} foi feito", sem o nome; o corpo começa com uma frase neutra, o nome vem depois, e o botão "Ver no site" leva à aba Sorteio. Pergunta em 2026-11-25: "O e-mail do resultado leva o nome sorteado?", resposta "Nome só no corpo (Recomendado)", entre essa, "Sem o nome" e "Nome no assunto".

### Restrições depois do sorteio

- Com o grupo SORTEADO ou ENCERRADO, quem organiza vê a lista de pares só para leitura, sem "Adicionar par" nem remover, com a nota "Para mudar as restrições, cancele o sorteio." Pergunta em 2026-11-25: "Depois do sorteio, quem organiza ainda vê os pares de restrição na aba?", resposta "Vê só leitura (Recomendado)", entre essa e "Esconde".

### Agent's Discretion

Nenhuma até agora.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma até agora.

---

## Specific References

- Design system (artifact do usuário): DrawPanel ("Sortear" é o único botão `festive`; condições com ícone, cumprida em `success`, pendente em `warning` com o número que falta; frase de sigilo abaixo do botão; depois do sorteio, quando foi feito e "Cancelar sorteio" com ConfirmDialog), ExclusionEditor (aviso de sigilo no topo; restrição vale nos dois sentidos; mesma pessoa duas vezes ou par repetido mostra erro em `destructive`; remover par sem confirmação) e ResultCard (papelzinho dobrado sobre fundo noturno, "Toque para abrir", nome fora da página até abrir, "Esconder", movimento reduzido sem animação).

---

## Deferred Ideas

None - discussion stayed within feature scope.
