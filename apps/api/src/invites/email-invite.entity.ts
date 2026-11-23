import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from '../groups/group.entity.js';

// Cada convite enviado por e-mail, para o limite de 24 horas do grupo.
// Apagar o grupo apaga os envios.
@Entity('email_invite')
@Index(['groupId', 'createdAt'])
export class EmailInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group?: Group;

  // Em minúsculas.
  @Column({ type: 'varchar', length: 254 })
  email: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
