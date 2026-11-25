import type { GroupStatus } from './groups.js';

// Pessoas do par entram e saem pela participação, como na lista de
// participantes; nenhuma resposta leva id de pessoa.
export type ExclusionPerson = {
  membershipId: string;
  name: string;
};

// O par vale nos dois sentidos: A não tira B e B não tira A.
export type ExclusionPair = {
  id: string;
  a: ExclusionPerson;
  b: ExclusionPerson;
};

// Participantes aprovados e pares, em ordem de nome; só quem organiza lê.
export type ExclusionsResponse = {
  participants: ExclusionPerson[];
  pairs: ExclusionPair[];
};

// Painel de quem organiza; nunca leva par sorteado.
export type DrawPanel = {
  status: GroupStatus;
  // Rodada ativa; null quando o grupo não sorteou.
  drawnAt: string | null;
  approved: number;
  pending: number;
  feasible: boolean;
  // Vazio quando há distribuição.
  pairsToReview: ExclusionPair[];
};

// Só a pessoa que quem pede tirou, com o nome atual.
export type DrawResult = {
  receiverName: string;
};

export const DRAW_MESSAGES = {
  pairIncomplete: 'Escolha as duas pessoas do par.',
  pairSamePerson: 'Escolha duas pessoas diferentes.',
  pairRepeated: 'Esse par já está na lista.',
  exclusionsLocked: 'Para mudar as restrições, cancele o sorteio.',
  alreadyDrawn: 'Este grupo já fez o sorteio.',
  closedGroup: 'Grupo encerrado não pode ser alterado.',
  notEnoughParticipants:
    'O sorteio precisa de pelo menos 3 participantes aprovados.',
  pendingRequests: 'Aprove ou recuse os pedidos pendentes antes do sorteio.',
  infeasible: 'As restrições não permitem um sorteio válido.',
  drawNotFound: 'Sorteio não encontrado.',
  notDrawn: 'Este grupo ainda não fez o sorteio.',
} as const;

// O erro fica no campo "Pessoa"; o par repetido vale em qualquer ordem.
export function validateExclusionInput(
  input: { a: string | null; b: string | null },
  pairs: ExclusionPair[],
): { a?: string } {
  const { a, b } = input;
  if (!a || !b) {
    return { a: DRAW_MESSAGES.pairIncomplete };
  }
  if (a === b) {
    return { a: DRAW_MESSAGES.pairSamePerson };
  }
  const repeated = pairs.some(
    (pair) =>
      (pair.a.membershipId === a && pair.b.membershipId === b) ||
      (pair.a.membershipId === b && pair.b.membershipId === a),
  );
  if (repeated) {
    return { a: DRAW_MESSAGES.pairRepeated };
  }
  return {};
}
