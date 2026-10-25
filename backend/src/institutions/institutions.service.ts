import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from './institution.entity';
import { CreateInstitutionDto } from './dto/create-institution.dto';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
  ) {}

  findAll() {
    return this.institutionRepository.find({ order: { createdAt: 'DESC' } });
  }

  findActive() {
    return this.institutionRepository.find({
      where: { isActive: true },
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateInstitutionDto) {
    const institution = this.institutionRepository.create({
      name: dto.name.trim(),
      isActive: false,
    });

    return this.institutionRepository.save(institution);
  }

  async update(id: string, dto: CreateInstitutionDto) {
    const institution = await this.institutionRepository.findOne({ where: { id } });
    if (!institution) throw new NotFoundException('Institution not found');
    institution.name = dto.name.trim();
    return this.institutionRepository.save(institution);
  }

  async deactivate(id: string) {
    const institution = await this.institutionRepository.findOne({ where: { id } });
    if (!institution) throw new NotFoundException('Institution not found');
    institution.isActive = false;
    return this.institutionRepository.save(institution);
  }

  async activate(id: string) {
    const institution = await this.institutionRepository.findOne({
      where: { id },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    institution.isActive = true;

    return this.institutionRepository.save(institution);
  }
}
