import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { DataSource, type EntityManager } from 'typeorm';
import { Group } from './group.entity.js';
import { Membership } from './membership.entity.js';

export const GROUP_NOT_FOUND = 'Grupo não encontrado.';
export const ORGANIZER_ONLY = 'Só quem organiza pode alterar o grupo.';

type AccessOptions = { manager?: EntityManager; lock?: boolean };

type GroupAccessResult = { group: Group; membership: Membership };

// Confere o acesso a um grupo dentro da transação de quem chama. Quem está
// de fora recebe o mesmo 404 de um grupo que não existe, para não descobrir
// que ele existe. Com `lock`, a linha do grupo fica travada até a transação
// terminar, e um segundo pedido simultâneo espera para ler o estado novo.
@Injectable()
export class GroupAccess {
  constructor(private readonly dataSource: DataSource) {}

  async requireMember(
    userId: string,
    groupId: string,
    options: AccessOptions = {},
  ): Promise<GroupAccessResult> {
    // O Postgres recusaria com erro 500 o cast de um id que não é UUID.
    if (!isUUID(groupId)) throw new NotFoundException(GROUP_NOT_FOUND);
    const manager = options.manager ?? this.dataSource.manager;

    const query = manager
      .getRepository(Group)
      .createQueryBuilder('group')
      .where('group.id = :groupId', { groupId });
    if (options.lock) query.setLock('pessimistic_write');
    const group = await query.getOne();
    if (!group) throw new NotFoundException(GROUP_NOT_FOUND);

    const membership = await manager
      .getRepository(Membership)
      .findOneBy({ groupId, userId, status: 'APPROVED' });
    if (!membership) throw new NotFoundException(GROUP_NOT_FOUND);

    return { group, membership };
  }

  async requireOrganizer(
    userId: string,
    groupId: string,
    options: AccessOptions = {},
  ): Promise<GroupAccessResult> {
    const access = await this.requireMember(userId, groupId, options);
    if (access.group.ownerId !== userId) {
      throw new ForbiddenException(ORGANIZER_ONLY);
    }
    return access;
  }
}
