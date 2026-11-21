import type { Metadata } from 'next';
import { LegalDocument } from '../legal-document';

export const metadata: Metadata = {
  title: 'Termos de uso · Amigo Secreto',
};

export default function TermsPage() {
  return (
    <LegalDocument title="Termos de uso">
      <p className="text-body">
        Este texto é provisório. A versão completa dos Termos de uso será
        publicada aqui antes do lançamento do Amigo Secreto.
      </p>
    </LegalDocument>
  );
}
