import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Client } from '../clients/client.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clientId: number;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({ type: 'real' })
  rate: number;

  @Column({ type: 'real' })
  hours: number;

  @Column({ type: 'real' })
  amount: number;

  @Column({ type: 'real' })
  dueAmount: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Client, (client) => client.invoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;
}
