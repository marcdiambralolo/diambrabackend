import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article } from './schemas/article.schema';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Article.name) private articleModel: Model<Article>
  ) { }

  async findAllPaginated(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.articleModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.articleModel.countDocuments(),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<Article> {
    let article = null;
    // Essayer ObjectId puis string
    if (Types.ObjectId.isValid(id)) {
      article = await this.articleModel.findById(id);
    }
    if (!article) {
      article = await this.articleModel.findOne({ _id: id });
    }
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  async create(data: any): Promise<Article> {
    return this.articleModel.create(data);
  }

  async update(id: string, data: any): Promise<Article> {
    const updated = await this.articleModel.findByIdAndUpdate(id, data, { new: true });
    if (!updated) throw new NotFoundException('Article not found');
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.articleModel.findByIdAndDelete(id);
  }
}
