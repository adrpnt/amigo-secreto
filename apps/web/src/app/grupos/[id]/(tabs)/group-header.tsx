import type { GroupDetail } from '@amigo-secreto/shared';
import { StatusTag } from '@/components/status-tag';

// Cabeçalho comum às abas do grupo. "Entrada com aprovação" é só de quem
// organiza.
export function GroupHeader({ group }: { group: GroupDetail }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 text-h1 break-words">{group.name}</h1>
        <StatusTag status={group.status} />
        {group.isOrganizer && group.requiresApproval && (
          <StatusTag>Entrada com aprovação</StatusTag>
        )}
      </div>
      <p className="text-body text-muted-foreground">
        Organizado por {group.owner.name}
      </p>
    </div>
  );
}
