import { Column, Entity, PrimaryColumn } from 'typeorm';

// Uma linha por chave; a janela é fixa e reinicia quando vence.
@Entity('rate_limit')
export class RateLimit {
  @PrimaryColumn({ type: 'varchar', length: 300 })
  key: string;

  @Column({ type: 'timestamptz' })
  windowStart: Date;

  @Column({ type: 'int' })
  count: number;
}
