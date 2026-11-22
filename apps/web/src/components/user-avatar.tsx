'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Até duas iniciais: a da primeira e a da última palavra do nome.
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

// Pessoa identificada: foto do Google ou iniciais sobre `secondary`.
export function UserAvatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size?: 'default' | 'lg';
}) {
  return (
    <Avatar size={size}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
