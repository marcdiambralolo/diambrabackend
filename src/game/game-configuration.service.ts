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
    private gameConfigModel: Model<GameConfigurationDocument>,
  ) { }

  async create(createDto: CreateGameConfigurationDto): Promise<GameConfigurationDocument> {
    return this.gameConfigModel.create(createDto);
  }

  async findAll(): Promise<GameConfigurationDocument[]> {
    return this.gameConfigModel.find().exec();
  }

  async findOne(id: string): Promise<GameConfigurationDocument> {
    const config = await this.gameConfigModel.findById(id).exec();
    if (!config) throw new NotFoundException('Game configuration not found');
    return config;
  }

  async update(id: string, updateDto: UpdateGameConfigurationDto): Promise<GameConfigurationDocument> {
    const config = await this.gameConfigModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!config) throw new NotFoundException('Game configuration not found');
    return config;
  }

  async remove(id: string): Promise<GameConfigurationDocument> {
    const config = await this.gameConfigModel.findByIdAndDelete(id).exec();
    if (!config) throw new NotFoundException('Game configuration not found');
    return config;
  }
}
