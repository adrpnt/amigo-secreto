import { randomInt } from 'node:crypto';

// Algoritmo do sorteio: função pura, sem banco e sem Nest. As pessoas são ids
// e os pares de restrição valem nos dois sentidos.

type Pair = [string, string];

type Random = (max: number) => number;

export type DrawOutcome =
  | { kind: 'ok'; pairs: Map<string, string>; singleCycle: boolean }
  | { kind: 'blocked'; blocked: string[] };

const UNMATCHED = -1;

// Até 10 pessoas, a busca completa da corrente cabe nesse orçamento.
const CYCLE_SEARCH_BUDGET = 2_000_000;

// Quem cada pessoa pode tirar (índices): outra pessoa, fora dos pares.
function allowedReceivers(people: string[], exclusions: Pair[]): number[][] {
  const index = new Map(people.map((person, position) => [person, position]));
  const excluded = people.map(() => new Set<number>());
  for (const [a, b] of exclusions) {
    const ia = index.get(a);
    const ib = index.get(b);
    if (ia === undefined || ib === undefined) continue;
    excluded[ia].add(ib);
    excluded[ib].add(ia);
  }
  return people.map((_, giver) => {
    const allowed: number[] = [];
    for (let receiver = 0; receiver < people.length; receiver++) {
      if (receiver !== giver && !excluded[giver].has(receiver)) {
        allowed.push(receiver);
      }
    }
    return allowed;
  });
}

// Emparelhamento máximo bipartido (Hopcroft-Karp) entre quem tira e quem é
// tirado. Devolve, para cada pessoa que tira, o índice de quem ela tira.
function maximumMatching(allowed: number[][]): number[] {
  const size = allowed.length;
  const receiverOf = new Array<number>(size).fill(UNMATCHED);
  const giverOf = new Array<number>(size).fill(UNMATCHED);
  const layer = new Array<number>(size).fill(0);

  // Camadas a partir de quem ainda não tira ninguém; true se há caminho
  // de aumento.
  const buildLayers = (): boolean => {
    const queue: number[] = [];
    for (let giver = 0; giver < size; giver++) {
      layer[giver] = receiverOf[giver] === UNMATCHED ? 0 : Infinity;
      if (layer[giver] === 0) queue.push(giver);
    }
    let found = false;
    for (let head = 0; head < queue.length; head++) {
      const giver = queue[head];
      for (const receiver of allowed[giver]) {
        const next = giverOf[receiver];
        if (next === UNMATCHED) {
          found = true;
        } else if (layer[next] === Infinity) {
          layer[next] = layer[giver] + 1;
          queue.push(next);
        }
      }
    }
    return found;
  };

  const augment = (giver: number): boolean => {
    for (const receiver of allowed[giver]) {
      const next = giverOf[receiver];
      if (
        next === UNMATCHED ||
        (layer[next] === layer[giver] + 1 && augment(next))
      ) {
        receiverOf[giver] = receiver;
        giverOf[receiver] = giver;
        return true;
      }
    }
    layer[giver] = Infinity;
    return false;
  };

  while (buildLayers()) {
    for (let giver = 0; giver < size; giver++) {
      if (receiverOf[giver] === UNMATCHED) augment(giver);
    }
  }
  return receiverOf;
}

// Teorema de Hall: a partir de quem ficou sem par, a busca alternada alcança
// um conjunto que, junto, tem menos pessoas permitidas do que o tamanho dele.
function hallViolator(allowed: number[][], receiverOf: number[]): number[] {
  const giverOf = new Array<number>(allowed.length).fill(UNMATCHED);
  receiverOf.forEach((receiver, giver) => {
    if (receiver !== UNMATCHED) giverOf[receiver] = giver;
  });

  const reached = new Set<number>();
  const queue: number[] = [];
  receiverOf.forEach((receiver, giver) => {
    if (receiver === UNMATCHED) {
      reached.add(giver);
      queue.push(giver);
    }
  });
  const seenReceivers = new Set<number>();
  for (let head = 0; head < queue.length; head++) {
    for (const receiver of allowed[queue[head]]) {
      if (seenReceivers.has(receiver)) continue;
      seenReceivers.add(receiver);
      // Num emparelhamento máximo, todo permitido alcançado já é tirado.
      const giver = giverOf[receiver];
      if (!reached.has(giver)) {
        reached.add(giver);
        queue.push(giver);
      }
    }
  }
  return [...reached].sort((a, b) => a - b);
}

// null quando há distribuição; senão, as pessoas de um conjunto que tem
// menos pessoas permitidas do que o tamanho dele, na ordem recebida.
export function findBlocked(
  people: string[],
  exclusions: Pair[],
): string[] | null {
  const allowed = allowedReceivers(people, exclusions);
  const receiverOf = maximumMatching(allowed);
  if (!receiverOf.includes(UNMATCHED)) return null;
  return hallViolator(allowed, receiverOf).map((giver) => people[giver]);
}

// Fisher-Yates sobre uma cópia.
function shuffle<T>(items: T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Busca em profundidade de uma corrente que passa por todos e volta a quem
// começou; null quando não acha dentro do orçamento.
function findCycle(allowed: number[][]): number[] | null {
  const size = allowed.length;
  const path = [0];
  const used = new Array<boolean>(size).fill(false);
  used[0] = true;
  let steps = 0;

  const extend = (): boolean => {
    steps++;
    if (steps > CYCLE_SEARCH_BUDGET) return false;
    const last = path[path.length - 1];
    if (path.length === size) return allowed[last].includes(0);
    for (const next of allowed[last]) {
      if (used[next]) continue;
      used[next] = true;
      path.push(next);
      if (extend()) return true;
      if (steps > CYCLE_SEARCH_BUDGET) return false;
      path.pop();
      used[next] = false;
    }
    return false;
  };

  return extend() ? path : null;
}

function formsSingleCycle(receiverOf: number[]): boolean {
  let length = 0;
  let current = 0;
  do {
    current = receiverOf[current];
    length++;
  } while (current !== 0 && length <= receiverOf.length);
  return length === receiverOf.length;
}

// Sem pares, uma corrente embaralhada. Com pares: confere a viabilidade,
// tenta uma corrente e, sem ela, usa o emparelhamento embaralhado.
export function drawAssignments(
  people: string[],
  exclusions: Pair[],
  random: Random = (max) => randomInt(max),
): DrawOutcome {
  const order = shuffle(people, random);

  if (exclusions.length === 0) {
    const pairs = new Map(
      order.map((giver, i) => [giver, order[(i + 1) % order.length]]),
    );
    return { kind: 'ok', pairs, singleCycle: true };
  }

  const allowed = allowedReceivers(order, exclusions).map((receivers) =>
    shuffle(receivers, random),
  );
  const receiverOf = maximumMatching(allowed);
  if (receiverOf.includes(UNMATCHED)) {
    const blocked = new Set(
      hallViolator(allowed, receiverOf).map((giver) => order[giver]),
    );
    return {
      kind: 'blocked',
      blocked: people.filter((person) => blocked.has(person)),
    };
  }

  const cycle = findCycle(allowed);
  if (cycle !== null) {
    const pairs = new Map(
      cycle.map((giver, i) => [
        order[giver],
        order[cycle[(i + 1) % cycle.length]],
      ]),
    );
    return { kind: 'ok', pairs, singleCycle: true };
  }

  const pairs = new Map(
    receiverOf.map((receiver, giver) => [order[giver], order[receiver]]),
  );
  return { kind: 'ok', pairs, singleCycle: formsSingleCycle(receiverOf) };
}
