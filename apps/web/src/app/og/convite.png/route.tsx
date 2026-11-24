import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

// Cores do tema claro (globals.css); o next/og não lê variáveis CSS.
const BACKGROUND = '#f1f5f9';
const FOREGROUND = '#1e293b';
const MUTED_FOREGROUND = '#475569';
const FESTIVE = '#fbbf24';

const PLUS_JAKARTA_SANS_EXTRA_BOLD = await readFile(
  join(process.cwd(), 'assets/PlusJakartaSans-ExtraBold.ttf'),
);

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 96px',
        backgroundColor: BACKGROUND,
        fontFamily: 'Plus Jakarta Sans',
      }}
    >
      <div
        style={{
          width: 120,
          height: 12,
          borderRadius: 6,
          backgroundColor: FESTIVE,
        }}
      />
      <div
        style={{
          marginTop: 40,
          fontSize: 112,
          letterSpacing: '-0.02em',
          color: FOREGROUND,
        }}
      >
        Amigo Secreto
      </div>
      <div style={{ marginTop: 24, fontSize: 44, color: MUTED_FOREGROUND }}>
        Sorteio, lista de desejos e mensagens secretas
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Plus Jakarta Sans',
          data: PLUS_JAKARTA_SANS_EXTRA_BOLD,
          weight: 800,
          style: 'normal',
        },
      ],
    },
  );
}
