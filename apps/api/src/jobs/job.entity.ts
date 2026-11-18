import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Maiúsculas por decisão da spec (JOB-01), exceção à regra de snake_case.
export type JobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

@Entity('job')
@Index(['status', 'runAt'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  runAt: Date;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'RUNNING', 'DONE', 'FAILED'],
    default: 'PENDING',
  })
  status: JobStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
