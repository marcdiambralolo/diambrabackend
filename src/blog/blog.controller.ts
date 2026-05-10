
import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || '/var/www/uploads';
const publicUrl = process.env.PUBLIC_UPLOAD_URL || 'https://diambra.net/uploads';
const blogDir = `${uploadDir}/blog`;

if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true, mode: 0o755 });

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) { }

  @Get()
  async findAll(
    @Param('page') page?: string,
    @Param('limit') limit?: string
  ) {
    // Récupération des query params (NestJS: via @Query)
    const p = Number((page ?? 1)) || 1;
    const l = Number((limit ?? 10)) || 10;
    return this.blogService.findAllPaginated(p, l);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('illustration', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, blogDir),
        filename: (_req, file, cb) => {
          const unique = crypto.randomBytes(16).toString('hex');
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `blog-${unique}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        // images seulement
        const ok = /^image\/(png|jpeg|jpg|webp|gif)$/.test(file.mimetype);
        cb(ok ? null : new Error('Format image non supporté'), ok);
      },
    })
  )
  async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const illustrationUrl = file ? `${publicUrl}/blog/${file.filename}` : undefined;
    return this.blogService.create({
      title: body.title,
      content: body.content,
      published: body.published === 'true' || body.published === true,
      illustrationUrl,
    });
  }


  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('illustration', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, blogDir),
        filename: (_req, file, cb) => {
          const unique = crypto.randomBytes(16).toString('hex');
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `blog-${unique}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /^image\/(png|jpeg|jpg|webp|gif)$/.test(file.mimetype);
        cb(ok ? null : new Error('Format image non supporté'), ok);
      },
    })
  )
  async update(@Param('id') id: string, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const illustrationUrl = file ? `${publicUrl}/blog/${file.filename}` : undefined;

    const payload: any = {
      title: body.title,
      content: body.content,
      published: body.published === 'true' || body.published === true,
    };
    if (illustrationUrl) payload.illustrationUrl = illustrationUrl;

    return this.blogService.update(id, payload);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    await this.blogService.delete(id);
    return { success: true };
  }
}
