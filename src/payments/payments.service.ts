import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  findAll(clientId?: number): Promise<Payment[]> {
    const where = clientId ? { clientId } : {};
    return this.repo.find({ where, order: { paidAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.repo.create(dto);
    return this.repo.save(payment);
  }

  async update(id: number, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    Object.assign(payment, dto);
    return this.repo.save(payment);
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    await this.repo.remove(payment);
  }
}
