export type GroupStatus = 'OPEN' | 'DRAWN' | 'CLOSED';

// Campos do formulário do grupo; as datas vão em ISO 8601 com fuso.
export type GroupInput = {
  name: string;
  description: string | null;
  giftMinValue: number | null;
  giftMaxValue: number | null;
  drawScheduledAt: string | null;
  eventAt: string | null;
  eventLocation: string | null;
  isOnlineEvent: boolean;
  requiresApproval: boolean;
};

export type GroupFieldErrors = Partial<
  Record<
    | 'name'
    | 'description'
    | 'giftMinValue'
    | 'giftMaxValue'
    | 'drawScheduledAt'
    | 'eventAt'
    | 'eventLocation',
    string
  >
>;

export type GroupSummary = {
  id: string;
  name: string;
  status: GroupStatus;
  participantCount: number;
  isOrganizer: boolean;
  drawScheduledAt: string | null;
  eventAt: string | null;
  createdAt: string;
};

export type MyGroupsResponse = {
  active: GroupSummary[];
  closed: GroupSummary[];
};

export type GroupDetail = {
  id: string;
  name: string;
  status: GroupStatus;
  description: string | null;
  giftMinValue: number | null;
  giftMaxValue: number | null;
  drawScheduledAt: string | null;
  eventAt: string | null;
  eventLocation: string | null;
  isOnlineEvent: boolean;
  requiresApproval: boolean;
  owner: { id: string; name: string };
  isOrganizer: boolean;
  closedAt: string | null;
  createdAt: string;
  inviteCode: string;
};

export const GROUP_MESSAGES = {
  name: 'Informe um nome de 1 a 80 caracteres.',
  descriptionTooLong: 'Use no máximo 1.000 caracteres.',
  giftValue: 'Informe um valor inteiro de R$ 1 a R$ 100.000.',
  giftRangeStart: 'Informe o valor inicial da faixa.',
  giftRangeOrder: 'O valor inicial não pode passar do valor final.',
  futureDate: 'Escolha uma data no futuro.',
  drawBeforeEvent: 'O sorteio previsto precisa ser antes da confraternização.',
  locationTooLong: 'Use no máximo 200 caracteres.',
} as const;

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 1000;
const LOCATION_MAX_LENGTH = 200;
const GIFT_MIN = 1;
const GIFT_MAX = 100000;

// Mede em pontos de código, como o varchar do Postgres.
function length(text: string): number {
  return [...text].length;
}

function trimToNull(text: string | null): string | null {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export function normalizeGroupInput(input: GroupInput): GroupInput {
  return {
    ...input,
    name: input.name.trim(),
    description: trimToNull(input.description),
    eventLocation: trimToNull(input.eventLocation),
    giftMaxValue:
      input.giftMinValue !== null && input.giftMaxValue === null
        ? input.giftMinValue
        : input.giftMaxValue,
  };
}

function isValidGift(value: number): boolean {
  return Number.isInteger(value) && value >= GIFT_MIN && value <= GIFT_MAX;
}

// Data nova ou alterada precisa estar no futuro; a igual à gravada (mesmo
// instante) pode ter ficado no passado.
function isAcceptedDate(
  value: string,
  saved: string | null | undefined,
  now: Date,
): boolean {
  const instant = Date.parse(value);
  if (saved != null && Date.parse(saved) === instant) return true;
  return instant > now.getTime();
}

// Recebe a entrada já normalizada e devolve uma mensagem por campo, vazio
// quando tudo vale. Quando um campo viola duas regras, vale a do próprio
// campo; as regras entre dois campos só rodam com os dois válidos sozinhos.
export function validateGroupInput(
  input: GroupInput,
  options: {
    now: Date;
    saved?: { drawScheduledAt: string | null; eventAt: string | null };
  },
): GroupFieldErrors {
  const errors: GroupFieldErrors = {};
  const { now, saved } = options;

  const nameLength = length(input.name);
  if (nameLength < 1 || nameLength > NAME_MAX_LENGTH) {
    errors.name = GROUP_MESSAGES.name;
  }

  if (
    input.description !== null &&
    length(input.description) > DESCRIPTION_MAX_LENGTH
  ) {
    errors.description = GROUP_MESSAGES.descriptionTooLong;
  }

  const { giftMinValue: min, giftMaxValue: max } = input;
  if (min !== null && !isValidGift(min)) {
    errors.giftMinValue = GROUP_MESSAGES.giftValue;
  }
  if (max !== null && !isValidGift(max)) {
    errors.giftMaxValue = GROUP_MESSAGES.giftValue;
  }
  if (min === null && max !== null) {
    errors.giftMinValue = GROUP_MESSAGES.giftRangeStart;
  } else if (
    min !== null &&
    max !== null &&
    !errors.giftMinValue &&
    !errors.giftMaxValue &&
    min > max
  ) {
    errors.giftMinValue = GROUP_MESSAGES.giftRangeOrder;
  }

  const { drawScheduledAt: draw, eventAt: event } = input;
  if (draw !== null && !isAcceptedDate(draw, saved?.drawScheduledAt, now)) {
    errors.drawScheduledAt = GROUP_MESSAGES.futureDate;
  }
  if (event !== null && !isAcceptedDate(event, saved?.eventAt, now)) {
    errors.eventAt = GROUP_MESSAGES.futureDate;
  }
  if (
    draw !== null &&
    event !== null &&
    !errors.drawScheduledAt &&
    !errors.eventAt &&
    Date.parse(draw) >= Date.parse(event)
  ) {
    errors.drawScheduledAt = GROUP_MESSAGES.drawBeforeEvent;
  }

  if (
    input.eventLocation !== null &&
    length(input.eventLocation) > LOCATION_MAX_LENGTH
  ) {
    errors.eventLocation = GROUP_MESSAGES.locationTooLong;
  }

  return errors;
}
