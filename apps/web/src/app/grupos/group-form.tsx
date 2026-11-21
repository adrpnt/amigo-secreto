'use client';

import {
  brasiliaInputToIso,
  type GroupDetail,
  type GroupFieldErrors,
  type GroupInput,
  isoToBrasiliaInput,
  normalizeGroupInput,
  validateGroupInput,
} from '@amigo-secreto/shared';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { FieldError } from '@/components/field-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-fetch';

const GENERIC_ERROR = 'Não foi possível salvar. Tente de novo.';
// Respostas cuja mensagem da API aparece como veio.
const API_MESSAGE_STATUSES = [403, 409, 429];

type FieldName = keyof GroupFieldErrors;

type FormValues = {
  name: string;
  description: string;
  giftMinValue: string;
  giftMaxValue: string;
  drawScheduledAt: string;
  eventAt: string;
  eventLocation: string;
  isOnlineEvent: boolean;
  requiresApproval: boolean;
};

type TextField = Exclude<
  keyof FormValues,
  'isOnlineEvent' | 'requiresApproval'
>;

function initialValues(group?: GroupDetail): FormValues {
  return {
    name: group?.name ?? '',
    description: group?.description ?? '',
    giftMinValue: group?.giftMinValue?.toString() ?? '',
    giftMaxValue: group?.giftMaxValue?.toString() ?? '',
    drawScheduledAt: group?.drawScheduledAt
      ? isoToBrasiliaInput(group.drawScheduledAt)
      : '',
    eventAt: group?.eventAt ? isoToBrasiliaInput(group.eventAt) : '',
    eventLocation: group?.eventLocation ?? '',
    isOnlineEvent: group?.isOnlineEvent ?? false,
    requiresApproval: group?.requiresApproval ?? false,
  };
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

// Datas digitadas no horário de Brasília viram instantes com fuso.
function toInput(values: FormValues): GroupInput {
  return normalizeGroupInput({
    name: values.name,
    description: values.description,
    giftMinValue: toNumber(values.giftMinValue),
    giftMaxValue: toNumber(values.giftMaxValue),
    drawScheduledAt: values.drawScheduledAt
      ? brasiliaInputToIso(values.drawScheduledAt)
      : null,
    eventAt: values.eventAt ? brasiliaInputToIso(values.eventAt) : null,
    eventLocation: values.eventLocation,
    isOnlineEvent: values.isOnlineEvent,
    requiresApproval: values.requiresApproval,
  });
}

// Com o "Até (R$)" vazio, o máximo é cópia do mínimo: a mensagem fica só no
// "Valor do presente (R$)".
function visibleErrors(
  errors: GroupFieldErrors,
  values: FormValues,
): GroupFieldErrors {
  if (values.giftMaxValue.trim() !== '') return errors;
  return withoutField(errors, 'giftMaxValue');
}

function withoutField(
  errors: GroupFieldErrors,
  field: FieldName,
): GroupFieldErrors {
  const rest = { ...errors };
  delete rest[field];
  return rest;
}

export function GroupForm({ group }: { group?: GroupDetail }) {
  const router = useRouter();
  const [values, setValues] = useState(() => initialValues(group));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<GroupFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const saved = group
    ? { drawScheduledAt: group.drawScheduledAt, eventAt: group.eventAt }
    : undefined;

  function validate(current: FormValues): GroupFieldErrors {
    return visibleErrors(
      validateGroupInput(toInput(current), { now: new Date(), saved }),
      current,
    );
  }

  // Antes do primeiro envio nenhum campo aparece com erro; depois, o erro some
  // ao corrigir.
  const errors: GroupFieldErrors = {
    ...apiErrors,
    ...(submitted ? validate(values) : {}),
  };

  function setText(field: TextField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setApiErrors((current) => withoutField(current, field));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setApiErrors({});
    setFormError(null);
    if (Object.keys(validate(values)).length > 0) return;

    setSubmitting(true);
    try {
      const response = await apiFetch(
        group ? `/groups/${group.id}` : '/groups',
        {
          method: group ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toInput(values)),
        },
      );
      if (response.ok) {
        const result = (await response.json()) as GroupDetail;
        router.push(`/grupos/${result.id}`);
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        message?: unknown;
        fields?: GroupFieldErrors;
      };
      if (response.status === 400 && body.fields) {
        setApiErrors(visibleErrors(body.fields, values));
      } else if (
        API_MESSAGE_STATUSES.includes(response.status) &&
        typeof body.message === 'string'
      ) {
        setFormError(body.message);
      } else {
        setFormError(GENERIC_ERROR);
      }
    } catch {
      setFormError(GENERIC_ERROR);
    }
    setSubmitting(false);
  }

  function fieldProps(field: FieldName) {
    const message = errors[field];
    return {
      id: `group-${field}`,
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `group-${field}-error` : undefined,
    };
  }

  function fieldError(field: FieldName) {
    return <FieldError id={`group-${field}-error`} message={errors[field]} />;
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-name">Nome do grupo</Label>
        <Input
          {...fieldProps('name')}
          value={values.name}
          onChange={(event) => setText('name', event.target.value)}
        />
        {fieldError('name')}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-description">Recado para os participantes</Label>
        <Textarea
          {...fieldProps('description')}
          value={values.description}
          onChange={(event) => setText('description', event.target.value)}
        />
        {fieldError('description')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-giftMinValue">Valor do presente (R$)</Label>
          <Input
            {...fieldProps('giftMinValue')}
            inputMode="numeric"
            value={values.giftMinValue}
            onChange={(event) => setText('giftMinValue', event.target.value)}
          />
          {fieldError('giftMinValue')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-giftMaxValue">Até (R$)</Label>
          <Input
            {...fieldProps('giftMaxValue')}
            inputMode="numeric"
            value={values.giftMaxValue}
            onChange={(event) => setText('giftMaxValue', event.target.value)}
          />
          {fieldError('giftMaxValue')}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-drawScheduledAt">Sorteio previsto</Label>
          <Input
            {...fieldProps('drawScheduledAt')}
            type="datetime-local"
            value={values.drawScheduledAt}
            onChange={(event) => setText('drawScheduledAt', event.target.value)}
          />
          {fieldError('drawScheduledAt')}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-eventAt">Confraternização</Label>
          <Input
            {...fieldProps('eventAt')}
            type="datetime-local"
            value={values.eventAt}
            onChange={(event) => setText('eventAt', event.target.value)}
          />
          {fieldError('eventAt')}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-eventLocation">Local</Label>
        <Input
          {...fieldProps('eventLocation')}
          value={values.eventLocation}
          onChange={(event) => setText('eventLocation', event.target.value)}
        />
        {fieldError('eventLocation')}
      </div>

      <Label className="font-normal">
        <Checkbox
          checked={values.isOnlineEvent}
          onCheckedChange={(checked) =>
            setValues((current) => ({ ...current, isOnlineEvent: checked }))
          }
        />
        Evento online
      </Label>

      <Label className="font-normal">
        <Checkbox
          checked={values.requiresApproval}
          onCheckedChange={(checked) =>
            setValues((current) => ({ ...current, requiresApproval: checked }))
          }
        />
        Exigir aprovação para entrar
      </Label>

      {formError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? 'Salvando…'
            : group
              ? 'Salvar alterações'
              : 'Criar grupo'}
        </Button>
        {group && (
          <Link
            href={`/grupos/${group.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Voltar
          </Link>
        )}
      </div>
    </form>
  );
}
