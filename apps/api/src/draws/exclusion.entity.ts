import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Group } from '../groups/group.entity.js';
import { User } from '../users/user.entity.js';

// Par de restrição: as duas pessoas não se tiram, em nenhum sentido. Uma
// linha por par, com o menor id em userAId, para os dois sentidos baterem no
// mesmo índice. Apagar o grupo apaga os pares.
@Entity('exclusion')
@Unique(['groupId', 'userAId', 'userBId'])
@Check(`"userAId" < "userBId"`)
export class Exclusion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group?: Group;

  @Column({ type: 'uuid' })
  userAId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userAId' })
  userA?: User;

  @Column({ type: 'uuid' })
  userBId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userBId' })
  userB?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
