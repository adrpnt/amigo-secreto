import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import { Group } from './group.entity.js';

// Maiúsculas, como o status do grupo (exceção à regra de snake_case).
export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Uma participação por pessoa em cada grupo. Apagar o grupo apaga as
// participações; apagar a pessoa fica bloqueado até a exclusão de conta
// decidir o destino delas.
@Entity('membership')
@Unique(['groupId', 'userId'])
@Check(`"status" IN ('PENDING', 'APPROVED', 'REJECTED')`)
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group?: Group;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 10 })
  status: MembershipStatus;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  joinedAt: Date;
}
