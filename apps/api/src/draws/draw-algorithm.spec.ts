import { randomInt } from 'node:crypto';
import { drawAssignments, findBlocked } from './draw-algorithm.js';

// O randomInt real continua valendo; o teste da fonte controla a sequência.
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomInt: vi.fn(actual.randomInt) };
});

type Pair = [string, string];

function people(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `p${index}`);
}

function isExcluded(exclusions: Pair[], giver: string, receiver: string) {
  return exclusions.some(
    ([a, b]) =>
      (a === giver && b === receiver) || (a === receiver && b === giver),
  );
}

// Pessoas que alguém do conjunto pode tirar: outra pessoa, fora dos pares.
function allowedFor(group: string[], everyone: string[], exclusions: Pair[]) {
  const allowed = new Set<string>();
  for (const giver of group) {
    for (const receiver of everyone) {
      if (receiver !== giver && !isExcluded(exclusions, giver, receiver)) {
        allowed.add(receiver);
      }
    }
  }
  return allowed;
}

// Força bruta: alguma permutação dá a cada pessoa uma outra permitida.
function hasDistribution(everyone: string[], exclusions: Pair[]): boolean {
  const taken = new Set<string>();
  const assign = (index: number): boolean => {
    if (index === everyone.length) return true;
    const giver = everyone[index];
    for (const receiver of everyone) {
      if (
        receiver === giver ||
        taken.has(receiver) ||
        isExcluded(exclusions, giver, receiver)
      ) {
        continue;
      }
      taken.add(receiver);
      if (assign(index + 1)) return true;
      taken.delete(receiver);
    }
    return false;
  };
  return assign(0);
}

// Fonte determinística (mulberry32) para gerar casos variados sem depender
// da sorte.
function seeded(seed: number) {
  let state = seed;
  return (max: number) => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296) * max);
  };
}

function randomExclusions(
  everyone: string[],
  count: number,
  random: (max: number) => number,
): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < count; i++) {
    const a = everyone[random(everyone.length)];
    const b = everyone[random(everyone.length)];
    if (a !== b && !isExcluded(pairs, a, b)) pairs.push([a, b]);
  }
  return pairs;
}

describe('viabilidade do sorteio', () => {
  it('sem pares sempre há distribuição a partir de 3 pessoas', () => {
    for (const count of [3, 4, 5, 10, 50, 1000]) {
      expect(findBlocked(people(count), [])).toBeNull();
    }
  });

  it('3 pessoas e um par não têm distribuição e o par entra nos bloqueados', () => {
    const blocked = findBlocked(['ana', 'bruno', 'carla'], [['ana', 'bruno']]);
    expect(blocked).not.toBeNull();
    expect([...(blocked ?? [])].sort()).toEqual(['ana', 'bruno']);
  });

  it('4 pessoas e um par têm distribuição', () => {
    expect(
      findBlocked(['ana', 'bruno', 'carla', 'davi'], [['ana', 'bruno']]),
    ).toBeNull();
  });

  it('devolve como bloqueadas só pessoas de um conjunto com menos pessoas permitidas do que o tamanho dele', () => {
    // Ana e Bruno só podem tirar Carla; Davi, Eva e Fábio não estão presos.
    const everyone = ['ana', 'bruno', 'carla', 'davi', 'eva', 'fabio'];
    const exclusions: Pair[] = [
      ['ana', 'bruno'],
      ['ana', 'davi'],
      ['ana', 'eva'],
      ['ana', 'fabio'],
      ['bruno', 'davi'],
      ['bruno', 'eva'],
      ['bruno', 'fabio'],
    ];
    expect([...(findBlocked(everyone, exclusions) ?? [])].sort()).toEqual([
      'ana',
      'bruno',
    ]);

    // Casos variados: bloqueia exatamente quando não há distribuição, e o
    // conjunto devolvido sempre tem menos permitidas do que pessoas.
    const random = seeded(42);
    let blockedCases = 0;
    for (let round = 0; round < 400; round++) {
      const group = people(3 + random(4));
      const pairs = randomExclusions(group, random(8), random);
      const blocked = findBlocked(group, pairs);

      expect(blocked === null).toBe(hasDistribution(group, pairs));
      if (blocked !== null) {
        blockedCases++;
        expect(blocked.length).toBeGreaterThan(0);
        expect(new Set(blocked).size).toBe(blocked.length);
        expect(blocked.every((person) => group.includes(person))).toBe(true);
        expect(allowedFor(blocked, group, pairs).size).toBeLessThan(
          blocked.length,
        );
      }
    }
    expect(blockedCases).toBeGreaterThan(20);
  });

  it('pessoa com par com todos os outros fica bloqueada', () => {
    const everyone = ['ana', 'bruno', 'carla', 'davi', 'eva'];
    const exclusions: Pair[] = everyone
      .filter((person) => person !== 'ana')
      .map((person) => ['ana', person]);
    expect(findBlocked(everyone, exclusions)).toEqual(['ana']);
  });
});

type Draw = { people: string[]; exclusions: Pair[] };

// Segue a corrente a partir da primeira pessoa: única se passa por todas.
function isSingleCycle(people: string[], pairs: Map<string, string>) {
  const seen = new Set<string>();
  let current = people[0];
  while (!seen.has(current)) {
    seen.add(current);
    current = pairs.get(current) ?? current;
  }
  return current === people[0] && seen.size === people.length;
}

// Força bruta: existe corrente única que respeita os pares.
function hasCycle(everyone: string[], exclusions: Pair[]): boolean {
  const canTake = (giver: string, receiver: string) =>
    giver !== receiver && !isExcluded(exclusions, giver, receiver);
  const path = [everyone[0]];
  const used = new Set(path);
  const extend = (): boolean => {
    const last = path[path.length - 1];
    if (path.length === everyone.length) return canTake(last, everyone[0]);
    for (const next of everyone) {
      if (used.has(next) || !canTake(last, next)) continue;
      path.push(next);
      used.add(next);
      if (extend()) return true;
      path.pop();
      used.delete(next);
    }
    return false;
  };
  return extend();
}

// 500 sorteios de 3 a 15 pessoas: metade sem pares, metade com pares, todos
// com distribuição possível.
function feasibleDraws(seed: number): Draw[] {
  const random = seeded(seed);
  const draws: Draw[] = [];
  while (draws.length < 500) {
    const group = people(3 + random(13));
    const pairs =
      draws.length % 2 === 0
        ? []
        : randomExclusions(group, 1 + random(group.length), random);
    if (findBlocked(group, pairs) === null) {
      draws.push({ people: group, exclusions: pairs });
    }
  }
  return draws;
}

function drawOk(draw: Draw) {
  const result = drawAssignments(draw.people, draw.exclusions);
  if (result.kind !== 'ok') {
    throw new Error('o sorteio deveria ter distribuição');
  }
  return result;
}

describe('distribuição do sorteio', () => {
  it('cada pessoa tira exatamente uma e é tirada por exatamente uma em 500 sorteios', () => {
    for (const draw of feasibleDraws(1)) {
      const { pairs } = drawOk(draw);
      expect([...pairs.keys()].sort()).toEqual([...draw.people].sort());
      expect([...pairs.values()].sort()).toEqual([...draw.people].sort());
    }
  });

  it('ninguém tira a si mesmo em 500 sorteios', () => {
    for (const draw of feasibleDraws(2)) {
      for (const [giver, receiver] of drawOk(draw).pairs) {
        expect(receiver).not.toBe(giver);
      }
    }
  });

  it('nunca junta as duas pessoas de um par, em nenhum sentido, em 500 sorteios', () => {
    let pairsChecked = 0;
    for (const draw of feasibleDraws(3)) {
      const { pairs } = drawOk(draw);
      for (const [a, b] of draw.exclusions) {
        expect(pairs.get(a)).not.toBe(b);
        expect(pairs.get(b)).not.toBe(a);
        pairsChecked++;
      }
    }
    expect(pairsChecked).toBeGreaterThan(500);
  });

  it('sem pares sai sempre corrente única', () => {
    for (const count of [3, 4, 5, 7, 10, 31, 200]) {
      for (let round = 0; round < 50; round++) {
        const group = people(count);
        const result = drawOk({ people: group, exclusions: [] });
        expect(result.singleCycle).toBe(true);
        expect(isSingleCycle(group, result.pairs)).toBe(true);
      }
    }
  });

  it('com pares e até 10 pessoas sai corrente única quando ela existe', () => {
    const random = seeded(4);
    let withCycle = 0;
    let withoutCycle = 0;
    for (let round = 0; round < 300; round++) {
      const group = people(3 + random(8));
      const pairs = randomExclusions(
        group,
        1 + random(group.length * 2),
        random,
      );
      const result = drawAssignments(group, pairs);
      if (result.kind !== 'ok') continue;

      const cycle = isSingleCycle(group, result.pairs);
      expect(result.singleCycle).toBe(cycle);
      expect(cycle).toBe(hasCycle(group, pairs));
      if (cycle) withCycle++;
      else withoutCycle++;
    }
    expect(withCycle).toBeGreaterThan(100);
    expect(withoutCycle).toBeGreaterThan(0);
  });

  it('com pares que impedem a corrente sai outra distribuição válida', () => {
    // Só Ana e Bruno se tiram, e só Carla e Davi se tiram.
    const group = ['ana', 'bruno', 'carla', 'davi'];
    const exclusions: Pair[] = [
      ['ana', 'carla'],
      ['ana', 'davi'],
      ['bruno', 'carla'],
      ['bruno', 'davi'],
    ];
    const result = drawOk({ people: group, exclusions });
    expect(result.singleCycle).toBe(false);
    expect(Object.fromEntries(result.pairs)).toEqual({
      ana: 'bruno',
      bruno: 'ana',
      carla: 'davi',
      davi: 'carla',
    });
  });

  it('devolve bloqueado quando nenhuma distribuição existe', () => {
    const result = drawAssignments(
      ['ana', 'bruno', 'carla'],
      [['ana', 'bruno']],
    );
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked') {
      expect([...result.blocked].sort()).toEqual(['ana', 'bruno']);
    }
  });

  it('sorteia com randomInt do node:crypto', () => {
    const draw = vi.mocked<(max: number) => number>(randomInt);
    draw.mockClear();
    for (const index of [0, 0, 0]) {
      draw.mockReturnValueOnce(index);
    }

    // Fisher-Yates com 0, 0, 0 deixa bruno, carla, davi, ana.
    const result = drawOk({
      people: ['ana', 'bruno', 'carla', 'davi'],
      exclusions: [],
    });
    expect(Object.fromEntries(result.pairs)).toEqual({
      bruno: 'carla',
      carla: 'davi',
      davi: 'ana',
      ana: 'bruno',
    });
    expect(draw.mock.calls).toEqual([[4], [3], [2]]);

    draw.mockClear();
    drawOk({ people: people(6), exclusions: [['p0', 'p1']] });
    expect(draw).toHaveBeenCalled();
  });

  it('distribui 1000 pessoas sem pares em menos de 100 ms', () => {
    const group = people(1000);
    const started = performance.now();
    const result = drawOk({ people: group, exclusions: [] });
    const elapsed = performance.now() - started;

    expect(result.pairs.size).toBe(1000);
    expect(elapsed).toBeLessThan(100);
  });
});
