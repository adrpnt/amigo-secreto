import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

@Entity('session')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  // SHA-256 em hexadecimal do token do cookie; o token em si não é guardado.
  @Column({ type: 'char', length: 64, unique: true })
  tokenHash: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  lastUsedAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
