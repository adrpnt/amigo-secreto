import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import { Draw } from './draw.entity.js';

// Quem tira quem na rodada: cada pessoa tira uma e é tirada por uma. Apagar
// a rodada apaga os pares; apagar a pessoa fica bloqueado até a exclusão de
// conta decidir o destino da rodada.
@Entity('assignment')
@Unique(['drawId', 'giverUserId'])
@Unique(['drawId', 'receiverUserId'])
@Check(`"giverUserId" <> "receiverUserId"`)
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  drawId: string;

  @ManyToOne(() => Draw, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drawId' })
  draw?: Draw;

  @Column({ type: 'uuid' })
  giverUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'giverUserId' })
  giver?: User;

  @Column({ type: 'uuid' })
  receiverUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'receiverUserId' })
  receiver?: User;
}
