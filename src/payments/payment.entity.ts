import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Client } from '../clients/client.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clientId: number;

  @Column({ type: 'real' })
  amount: number;

  @Column({ type: 'text' })
  paidAt: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Client, (client) => client.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;
}
