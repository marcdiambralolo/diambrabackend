import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameConfiguration, GameConfigurationDocument } from './schemas/game-configuration.schema';
import { CreateGameConfigurationDto } from './dto/create-game-configuration.dto';
import { UpdateGameConfigurationDto } from './dto/update-game-configuration.dto';

@Injectable()
export class GameConfigurationService {
  constructor(
    @InjectModel(GameConfiguration.name)
    private readonly gameConfigModel: Model<GameConfigurationDocument>,
  ) {}

  async create(createDto: CreateGameConfigurationDto): Promise<GameConfiguration> {
    return this.gameConfigModel.create(createDto);
  }

  async findAll(): Promise<GameConfiguration[]> {
    return this.gameConfigModel.find().exec();
  }

  async findOne(id: string): Promise<GameConfiguration> {
    const config = await this.gameConfigModel.findById(id).exec();
    if (!config) throw new NotFoundException('Game configuration not found');
    return config;
  }

  async update(id: string, updateDto: UpdateGameConfigurationDto): Promise<GameConfiguration> {
    const config = await this.gameConfigModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!config) throw new NotFoundException('Game configuration not found');
    return config;
  }

  async remove(id: string): Promise<GameConfiguration> {
    const config = await this.gameConfigModel.findByIdAndDelete(id).exec();
    if (!config) throw new NotFoundException('Game configuration not found');
    return config;
  }
}
