import Link from 'next/link';
import { FieldError } from '@/components/field-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// Caixa obrigatória de termos e caixa opcional de marketing dos formulários
// que criam conta.
export function TermsConsent({
  errorId,
  acceptTerms,
  onAcceptTermsChange,
  termsError,
  marketingOptIn,
  onMarketingOptInChange,
}: {
  errorId: string;
  acceptTerms: boolean;
  onAcceptTermsChange: (checked: boolean) => void;
  termsError?: string;
  marketingOptIn: boolean;
  onMarketingOptInChange: (checked: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label className="items-start font-normal text-body-sm">
          <Checkbox
            className="mt-0.5"
            checked={acceptTerms}
            onCheckedChange={onAcceptTermsChange}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? errorId : undefined}
          />
          <span>
            Li e aceito os{' '}
            <Link href="/termos" target="_blank" className="underline">
              Termos de uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" target="_blank" className="underline">
              Política de privacidade
            </Link>
            , e tenho 18 anos ou autorização dos meus responsáveis
          </span>
        </Label>
        <FieldError id={errorId} message={termsError} />
      </div>

      <Label className="items-start font-normal text-body-sm">
        <Checkbox
          className="mt-0.5"
          checked={marketingOptIn}
          onCheckedChange={onMarketingOptInChange}
        />
        <span>Quero receber novidades do Amigo Secreto por e-mail.</span>
      </Label>
    </>
  );
}
