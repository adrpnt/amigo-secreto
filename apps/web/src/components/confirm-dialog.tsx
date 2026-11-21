'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  // "primary" para ações que não destroem nada, como encerrar o grupo.
  tone?: 'destructive' | 'primary';
  // Com texto, o botão de confirmar fica desabilitado e mostra esse texto
  // enquanto a ação espera a resposta.
  pendingLabel?: string;
};

// Confirmação antes de uma ação: o foco começa no botão de desistir; Esc e
// toque fora desistem. Os botões repetem a ação, nunca "Sim" e "Não".
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'destructive',
  pendingLabel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent showCloseButton={false} initialFocus={cancelRef}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            variant={tone === 'primary' ? 'default' : 'destructive'}
            disabled={pendingLabel !== undefined}
            onClick={onConfirm}
          >
            {pendingLabel ?? confirmLabel}
          </Button>
          <Button
            ref={cancelRef}
            className="w-full"
            variant="outline"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
