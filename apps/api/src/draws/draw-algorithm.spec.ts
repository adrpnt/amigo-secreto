import { findBlocked } from './draw-algorithm.js';

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
