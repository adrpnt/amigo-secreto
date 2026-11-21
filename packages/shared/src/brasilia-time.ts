const TIME_ZONE = 'America/Sao_Paulo';

const wallClockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

type WallClock = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

// Data e hora de Brasília no instante dado.
function wallClock(instant: number): WallClock {
  const parts = Object.fromEntries(
    wallClockFormat
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

// Quanto o relógio de Brasília está à frente do UTC no instante dado, em ms.
function offsetAt(instant: number): number {
  const clock = wallClock(instant);
  const asUtc = Date.UTC(
    Number(clock.year),
    Number(clock.month) - 1,
    Number(clock.day),
    Number(clock.hour),
    Number(clock.minute),
  );
  return asUtc - Math.floor(instant / 60000) * 60000;
}

// Valor de um campo datetime-local (`2026-12-20T19:00`), lido no horário de
// Brasília, para ISO 8601 em UTC.
export function brasiliaInputToIso(value: string): string {
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  // O deslocamento depende do instante; a segunda leitura acerta a data
  // quando a primeira cai do outro lado de uma troca de horário.
  const guess = asUtc - offsetAt(asUtc);
  return new Date(asUtc - offsetAt(guess)).toISOString();
}

export function isoToBrasiliaInput(iso: string): string {
  const clock = wallClock(Date.parse(iso));
  return `${clock.year}-${clock.month}-${clock.day}T${clock.hour}:${clock.minute}`;
}

export function formatBrasiliaDate(iso: string): string {
  const clock = wallClock(Date.parse(iso));
  return `${clock.day}/${clock.month}/${clock.year}`;
}

export function formatBrasiliaDateTime(iso: string): string {
  const clock = wallClock(Date.parse(iso));
  return `${formatBrasiliaDate(iso)} às ${clock.hour}:${clock.minute}`;
}
