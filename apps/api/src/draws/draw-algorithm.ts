// Algoritmo do sorteio: função pura, sem banco e sem Nest. As pessoas são ids
// e os pares de restrição valem nos dois sentidos.

type Pair = [string, string];

const UNMATCHED = -1;

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
