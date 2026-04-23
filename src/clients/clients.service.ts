import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
  ) {}

  findAll(): Promise<Client[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.repo.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async create(dto: CreateClientDto): Promise<Client> {
    try {
      const client = this.repo.create(dto);
      return await this.repo.save(client);
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        throw new ConflictException(`Client "${dto.name}" already exists`);
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    try {
      return await this.repo.save(client);
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        throw new ConflictException(`Client "${dto.name}" already exists`);
      }
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    const client = await this.findOne(id);
    await this.repo.remove(client);
  }
}
