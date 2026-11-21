import type { GroupStatus } from '@amigo-secreto/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

// Status em maiúsculas, como o do job (exceção à regra de snake_case).
@Entity('group')
@Check(`"status" IN ('OPEN', 'DRAWN', 'CLOSED')`)
@Check(`("giftMinValue" IS NULL) = ("giftMaxValue" IS NULL)`)
@Check(`"giftMinValue" <= "giftMaxValue"`)
@Check(`("status" = 'CLOSED') = ("closedAt" IS NOT NULL)`)
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  // Reais inteiros; valor único grava mínimo e máximo iguais.
  @Column({ type: 'integer', nullable: true })
  giftMinValue: number | null;

  @Column({ type: 'integer', nullable: true })
  giftMaxValue: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  drawScheduledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  eventAt: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  eventLocation: string | null;

  @Column({ type: 'boolean', default: false })
  isOnlineEvent: boolean;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status: GroupStatus;

  // Gravado ao encerrar; a retenção conta a partir dele.
  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
