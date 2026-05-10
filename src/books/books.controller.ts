import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import { Response } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Permission } from '../common/enums/permission.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { BooksService } from './books.service';
import { CreateBookDto, UpdateBookDto } from './dto/create-book.dto';
import { PurchaseBookOfferingDto } from './dto/purchase-book.dto';
import { OfferingsService } from 'offerings/offerings.service';

// Configuration du stockage Multer - refactor covers/pdfs
const uploadDir = process.env.UPLOAD_DIR || '/var/www/uploads/books';
const publicUrl = process.env.PUBLIC_UPLOAD_URL || 'https://diambra.net/uploads';

const coversDir = `${uploadDir}/covers`;
const pdfsDir = `${uploadDir}/pdfs`;

try {
  if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true, mode: 0o755 });
  if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true, mode: 0o755 });
} catch (e) {
  console.error(`❌ Erreur création dossiers:`, e);
}

const storage = diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'coverImage') cb(null, coversDir);
    else if (file.fieldname === 'pdfFile') cb(null, pdfsDir);
    else cb(new Error('Champ fichier non supporté'), '');
  },
  filename: (_req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === 'coverImage' ? 'cover' : 'book';
    cb(null, `${prefix}-${uniqueName}${ext}`);
  },
});

/** Parse les champs multipart qui arrivent en string */
function parseMultipartBody(dto: any): any {
  const data = { ...dto };
  if (typeof data.price === 'string') data.price = parseFloat(data.price);
  if (typeof data.pages === 'string') data.pages = parseInt(data.pages, 10);
  if (typeof data.pageCount === 'string') {
    data.pages = parseInt(data.pageCount, 10);
    delete data.pageCount;
  }
  if (typeof data.isActive === 'string') data.isActive = data.isActive === 'true';
  if (typeof data.isAvailable === 'string') data.isAvailable = data.isAvailable === 'true';
  if (typeof data.rating === 'string') data.rating = parseFloat(data.rating);
  return data;
}

@Controller('books')
export class BooksController {

  constructor(private readonly booksService: BooksService 
  ) { }
  // POST /books/:bookId/purchase - Acheter un livre avec une offrande
  @Post(':bookId/purchase')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async purchaseBook(
    @Param('bookId') bookId: string,
    @Body() body: PurchaseBookOfferingDto,
    @CurrentUser() user: any
  ) {
    console.log('[BooksController] purchaseBook called', { bookId, body, user });
    if (!user) {
      console.log('[BooksController] Aucun utilisateur authentifié');
      throw new BadRequestException('Utilisateur non authentifié');
    }
    if (!body.offeringId || !body.category || !body.quantity) {
      console.log('[BooksController] Missing required fields', body);
      throw new BadRequestException('offeringId, category et quantity sont requis');
    }

    try {
      await this.booksService.consumeOfferingForBookPurchase(
        bookId,
        user,
        body.offeringId,
        body.category,
        body.quantity
      );
      return {
        success: true,
        purchased: true,
        message: 'Achat validé par offrande',
      };
    } catch (error) {
      console.error('[BooksController] Error in purchaseBook:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Erreur lors de l’achat',
      );
    }
  }

  @Patch(':bookId/offrande')
  async updateBookOfferings(
    @Param('bookId') bookId: string,
    @Body('alternatives') alternatives: any[],
  ) {
    if (!Array.isArray(alternatives)) {
      return {
        success: false,
        message: 'Le champ alternatives doit être un tableau',
      };
    }
    const book = await this.booksService.updateBookOfferings(bookId, alternatives);
    return {
      success: true,
      message: "Alternatives d'offrandes mises à jour",
      book,
    };
  }

  // GET /books/:bookId/offrande - Récupère les alternatives d'offrandes d'un livre
  @Get(':bookId/offrande')
  async getBookOfferings(@Param('bookId') bookId: string) {
    const book = await this.booksService.findById(bookId);
    return {
      success: true,
      alternatives: book.offering?.alternatives || [],
    };
  }

  // GET /books - Liste de tous les livres disponibles (public)
  @Public()
  @Get()
  async findAll() {
    const books = await this.booksService.findAll();
    return {
      success: true,
      books: books.map((book: any) => ({
        id: book._id.toString(),
        bookId: book.bookId,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        author: book.author || '',
        price: book.price,
        pages: book.pages,
        category: book.category,
        rating: book.rating,
        coverImage: book.coverImage,
        isActive: book.isActive ?? true,
        purchaseCount: book.purchaseCount,
        isAvailable: book.isAvailable,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        deletedAt: book.deletedAt,
        __v: book.__v,
        _id: book._id,
        pdfFileName: book.pdfFileName,
        offering: book.offering,
      })),
    };
  }

  // GET /books/:bookId - Détails d'un livre (public)
  @Public()
  @Get(':bookId')
  async findOne(@Param('bookId') bookId: string) {

    const book = await this.booksService.findById(bookId).catch(() => null);
    console.log('[BooksController] findOne', { bookId, book });
    console.log('[BooksController] offering', { offering: book?.offering });
    if (!book) {
      throw new NotFoundException(`Livre ${bookId} non trouvé`);
    }
    
    return {
      success: true,
      book: {
        id: (book as any)._id.toString(),
        _id: (book as any)._id,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        author: (book as any).author || '',
        pages: book.pages,
        category: book.category,
        rating: book.rating,
        coverImage: book.coverImage,
        isActive: (book as any).isActive ?? true,
        isAvailable: (book as any).isAvailable ?? true,
        purchaseCount: book.purchaseCount,
        downloadCount: book.downloadCount,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        deletedAt: book.deletedAt,
        __v: book.__v,
        pdfFileName: book.pdfFileName,
        offering: book.offering,

      },
    };
  }

  // POST /books - Créer un livre (admin uniquement)
  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  //  @Permissions(Permission.CREATE_SERVICE)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      {
        name: 'coverImage',
        maxCount: 1,
      },
      {
        name: 'pdfFile',
        maxCount: 1,
      },
    ], {
      storage,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max par fichier
      fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'coverImage') {
          if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
            return cb(new Error('Seules les images JPG, PNG et WebP sont acceptées'), false);
          }
        } else if (file.fieldname === 'pdfFile') {
          if (!file.mimetype.match(/^application\/pdf$/)) {
            return cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
          }
        }
        cb(null, true);
      },
    })
  )
  async create(
    @Body() createBookDto: CreateBookDto,
    @UploadedFiles() files: { coverImage?: Express.Multer.File[]; pdfFile?: Express.Multer.File[] },
  ) {

    const bookData = parseMultipartBody(createBookDto);

    if (files.coverImage && files.coverImage[0]) {
      bookData.coverImage = `${publicUrl}/books/covers/${files.coverImage[0].filename}`;
    }
    if (files.pdfFile && files.pdfFile[0]) {
      bookData.pdfFileName = `${publicUrl}/books/pdfs/${files.pdfFile[0].filename}`;
    }

    const book = await this.booksService.create(bookData);
    return {
      success: true,
      message: 'Livre créé avec succès',
      book,
      coverUrl: bookData.coverImage,
      pdfUrl: bookData.pdfFileName,
    };
  }

  // PATCH /books/:bookId - Modifier un livre (admin uniquement) 
  @Patch(':bookId')
  @UseInterceptors(
    FileFieldsInterceptor([
      {
        name: 'coverImage',
        maxCount: 1,
      },
      {
        name: 'pdfFile',
        maxCount: 1,
      },
    ], {
      storage,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max par fichier
      fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'coverImage') {
          if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
            return cb(new Error('Seules les images JPG, PNG et WebP sont acceptées'), false);
          }
        } else if (file.fieldname === 'pdfFile') {
          if (!file.mimetype.match(/^application\/pdf$/)) {
            return cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
          }
        }
        cb(null, true);
      },
    })
  )
  async update(
    @Param('bookId') bookId: string,
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFiles() files?: { coverImage?: Express.Multer.File[]; pdfFile?: Express.Multer.File[] },
  ) {
    const bookData = parseMultipartBody(updateBookDto);

    // Parse offering if needed (fix Cast to Embedded error)
    if (bookData.offering) {
      if (typeof bookData.offering === 'string') {
        try {
          bookData.offering = JSON.parse(bookData.offering);
        } catch {
          // ignore parse error, keep as is
        }
      } else if (Array.isArray(bookData.offering)) {
        // Sometimes comes as [object, stringifiedObject]
        const first = bookData.offering[0];
        if (typeof first === 'string') {
          try {
            bookData.offering = JSON.parse(first);
          } catch {
            bookData.offering = first;
          }
        } else {
          bookData.offering = first;
        }
      }
    }

    if (files && files.coverImage && files.coverImage[0]) {
      const publicUrl = process.env.PUBLIC_UPLOAD_URL || '/uploads';
      bookData.coverImage = `${publicUrl}/books/covers/${files.coverImage[0].filename}`;

      try {
        const oldBook = await this.booksService.findById(bookId).catch(() => null);
        if (oldBook?.coverImage && oldBook.coverImage.includes('/books/')) {
          const oldFilename = oldBook.coverImage.split('/books/').pop();
          if (oldFilename) {
            const oldPath = `${uploadDir}/${oldFilename}`;
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
        }
      } catch {
        // Ignorer les erreurs de suppression de l'ancien fichier
      }
    }

    if (files && files.pdfFile && files.pdfFile[0]) {
      const publicUrl = process.env.PUBLIC_UPLOAD_URL || '/uploads';
      bookData.pdfFileName = `${publicUrl}/books/pdfs/${files.pdfFile[0].filename}`;

      try {
        const oldBook = await this.booksService.findById(bookId).catch(() => null);
        if (oldBook?.pdfFileName && oldBook.pdfFileName.includes('/books/')) {
          const oldFilename = oldBook.pdfFileName.split('/books/').pop();
          if (oldFilename) {
            const oldPath = `${uploadDir}/${oldFilename}`;
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
        }
      } catch {
        // Ignorer les erreurs de suppression de l'ancien fichier
      }
    }

    const book = await this.booksService.update(bookId, bookData);
    return {
      success: true,
      message: 'Livre mis à jour avec succès',
      book,
    };
  }

  // GET /books/:bookId/download?token=xxx - Télécharger un livre acheté (public avec token)
  @Public()
  @Get(':bookId/download')
  async downloadBook(
    @Param('bookId') bookId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Token de téléchargement requis',
      });
    }

    try {
      const { purchase, book, filePath } = await this.booksService.verifyDownloadToken(token);

      // Vérifier que le bookId correspond
      if (purchase.bookIdentifier !== bookId) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'Token invalide pour ce livre',
        });
      }

      // Envoyer le fichier PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${book.pdfFileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({
        success: false,
        message: error.message || 'Erreur lors du téléchargement',
      });
    }
  }

  // POST /books/:bookId/check-purchase - Vérifier si un utilisateur a acheté un livre
  @Public()
  @Post(':bookId/check-purchase')
  @HttpCode(HttpStatus.OK)
  async checkPurchase(@Param('bookId') bookId: string, @Body() body: { phone: string }) {
    const purchase = await this.booksService.checkPurchase(bookId, body.phone);

    if (!purchase) {
      return {
        success: false,
        purchased: false,
        message: 'Aucun achat trouvé pour ce livre',
      };
    }

    return {
      success: true,
      purchased: true,
      downloadToken: purchase.downloadToken,
      downloadUrl: `/api/v1/books/${bookId}/download?token=${purchase.downloadToken}`,
    };
  }

  @Public()
  @Get('user/purchases')
  async getUserPurchases(@Query('phone') phone: string) {
    if (!phone) {
      return {
        success: false,
        message: 'Numéro de téléphone requis',
      };
    }

    const purchases = await this.booksService.getUserPurchases(phone);

    return {
      success: true,
      purchases: purchases.map((p: any) => ({
        id: p._id.toString(),
        bookId: p.bookIdentifier,
        bookTitle: p.bookTitle,
        price: p.price,
        purchaseDate: p.createdAt,
        downloadCount: p.downloadCount,
        lastDownloadAt: p.lastDownloadAt,
        downloadUrl: `/api/v1/books/${p.bookIdentifier}/download?token=${p.downloadToken}`,
      })),
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.CREATE_SERVICE)
  @Post('seed')
  async seedBooks() {
    return {
      success: true,
      message: `3 livre(s) créé(s)`,
    };
  }

  @Get('ids')
  async getAllBookIds() {
    const ids = await this.booksService.listAllIds();
    return { ids };
  }
}