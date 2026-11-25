import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from '../groups/group.entity.js';

// Status em maiúsculas, como o do grupo (exceção à regra de snake_case).
export type DrawStatus = 'ACTIVE' | 'CANCELLED';

// Rodada do sorteio. No máximo uma ativa por grupo; a cancelada fica gravada,
// com a data, sem os pares sorteados. Apagar o grupo apaga as rodadas.
@Entity('draw')
@Index(['groupId'], { unique: true, where: `"status" = 'ACTIVE'` })
@Index(['groupId', 'createdAt'])
@Check(`"status" IN ('ACTIVE', 'CANCELLED')`)
@Check(`("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL)`)
export class Draw {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group?: Group;

  @Column({ type: 'varchar', length: 10 })
  status: DrawStatus;

  // Para o evento draw.performed.
  @Column({ type: 'boolean' })
  singleCycle: boolean;

  // "Sorteio feito em" e o limite de sorteios em 24 horas.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;
}
