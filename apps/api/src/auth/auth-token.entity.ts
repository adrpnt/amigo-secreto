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

export const AUTH_TOKEN_TYPES = [
  'email_verification',
  'password_reset',
  'email_change',
] as const;

export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];

// Link de uso único enviado por e-mail.
@Entity('auth_token')
export class AuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'enum', enum: AUTH_TOKEN_TYPES })
  type: AuthTokenType;

  // SHA-256 em hexadecimal do token do link; o token em si não é guardado.
  @Column({ type: 'char', length: 64, unique: true })
  tokenHash: string;

  // Só na troca de e-mail.
  @Column({ type: 'varchar', length: 254, nullable: true })
  newEmail: string | null;

  // Destino depois da confirmação, já validado por quem emite.
  @Column({ type: 'varchar', nullable: true })
  next: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
