import type { Metadata } from 'next';
import { LegalDocument } from '../legal-document';

export const metadata: Metadata = {
  title: 'Política de privacidade · Amigo Secreto',
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Política de privacidade">
      <p className="text-body">
        Este texto é provisório. A versão completa da Política de privacidade
        será publicada aqui antes do lançamento do Amigo Secreto.
      </p>
    </LegalDocument>
  );
}
