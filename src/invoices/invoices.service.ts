import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
  ) {}

  findAll(clientId?: number): Promise<Invoice[]> {
    if (clientId) {
      return this.repo.find({ where: { clientId }, order: { year: 'DESC', month: 'DESC' } });
    }
    return this.repo.find({ order: { year: 'DESC', month: 'DESC' } });
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.repo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const amount = Math.round(dto.rate * dto.hours * 100) / 100;
    const invoice = this.repo.create({
      ...dto,
      amount,
      dueAmount: dto.dueAmount ?? amount,
    });
    return this.repo.save(invoice);
  }

  async update(id: number, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOne(id);
    Object.assign(invoice, dto);
    if (dto.rate !== undefined || dto.hours !== undefined) {
      invoice.amount = Math.round(invoice.rate * invoice.hours * 100) / 100;
      if (dto.dueAmount === undefined) {
        invoice.dueAmount = invoice.amount;
      }
    }
    return this.repo.save(invoice);
  }

  async remove(id: number): Promise<void> {
    const invoice = await this.findOne(id);
    await this.repo.remove(invoice);
  }
}
