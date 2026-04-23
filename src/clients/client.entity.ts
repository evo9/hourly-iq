import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Invoice } from '../invoices/invoice.entity';
import { Payment } from '../payments/payment.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'real', nullable: true })
  defaultRate: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Invoice, (invoice) => invoice.client, { cascade: true })
  invoices: Invoice[];

  @OneToMany(() => Payment, (payment) => payment.client, { cascade: true })
  payments: Payment[];
}
