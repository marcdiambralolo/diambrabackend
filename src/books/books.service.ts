import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';
import { BookPurchase, BookPurchaseDocument } from './schemas/book-purchase.schema';
import { Book, BookDocument } from './schemas/book.schema';
import { OfferingsService } from '../offerings/offerings.service';
import { WalletOfferingsService } from '../wallet/wallet-offerings.service';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(BookPurchase.name) private bookPurchaseModel: Model<BookPurchaseDocument>,
    private offeringsService: OfferingsService,
    private walletOfferingsService: WalletOfferingsService,
  ) { }

  // Récupérer tous les livres disponibles
  async findAll(): Promise<Book[]> {
    return this.bookModel.find({ isAvailable: true }).sort({ createdAt: -1 }).lean().exec();
  }

  // Récupérer un livre par son bookId
  async findByBookId(bookId: string): Promise<Book> {
    const book = await this.bookModel.findOne({ _id: bookId }).lean().exec();
    if (!book) {
      throw new NotFoundException(`Livre ${bookId} non trouvé`);
    }
    return book;
  }

  // Créer un nouveau livre (admin uniquement)
  async create(createBookDto: any): Promise<Book> {
    // S'assurer que l'objet offering est bien présent
    if (!createBookDto.offering) {
      throw new BadRequestException("L'objet 'offering' est requis pour l'achat d'un livre");
    }
    // Si offering est une string (JSON), parser
    if (typeof createBookDto.offering === 'string') {
      try {
        createBookDto.offering = JSON.parse(createBookDto.offering);
      } catch {
        throw new BadRequestException("Le champ 'offering' doit être un objet ou un JSON valide.");
      }
    }
    // Si offering contient alternatives (array), transformer pour le schéma
    if (createBookDto.offering && createBookDto.offering.alternatives && Array.isArray(createBookDto.offering.alternatives)) {
      createBookDto.offering = {
        alternatives: createBookDto.offering.alternatives
      };
    }
    // Vérifier que c'est bien un objet
    if (typeof createBookDto.offering !== 'object' || Array.isArray(createBookDto.offering)) {
      throw new BadRequestException("Le champ 'offering' doit être un objet unique (pas un tableau).");
    }
    const newBook = new this.bookModel(createBookDto);
    return newBook.save();
  }

  // Mettre à jour un livre
  async update(bookId: string, updateData: any): Promise<Book> {

    // Chercher uniquement par _id
    const book = await this.bookModel.findById(bookId).exec();

    if (!book) {
      throw new NotFoundException(`Livre ${bookId} non trouvé`);
    }

    Object.assign(book, updateData);
    return book.save();
  }

  // Récupérer un livre par son _id
  async findById(id: string): Promise<Book> {
    const book = await this.bookModel.findById(id).exec();
    if (!book) {
      throw new NotFoundException(`Livre non trouvé`);
    }
    return book;
  }

  // Enregistrer un achat de livre a la suite paiement validé
  async recordPurchase(purchaseDto: any, userId?: string): Promise<BookPurchase> {
    // Vérifier que le livre existe
    const book = await this.bookModel.findOne({ _id: purchaseDto._id }).exec();
    if (!book) {
      throw new NotFoundException(`Livre ${purchaseDto._id} non trouvé`);
    }

    // Vérifier l'objet offering
    if (!book.offering) {
      throw new BadRequestException("Ce livre n'est pas lié à une offrande valide.");
    }

    // Vérifier que l'utilisateur possède l'offrande
    if (!userId) {
      throw new BadRequestException("userId requis pour vérifier l'offrande.");
    }
    const userOfferings = await this.walletOfferingsService.getUserOfferings(userId);
    const userOffrande = userOfferings.find(o => o.offeringId === book.achat._id.toString());
    if (!userOffrande || userOffrande.quantity < 1) {
      throw new BadRequestException("L'utilisateur ne possède pas l'offrande requise pour acheter ce livre.");
    }

    // Consommer l'offrande (quantité -1)
    await this.walletOfferingsService.consumeOfferings(userId, 'book-' + book._id, [{ offeringId: book.achat._id.toString(), quantity: 1 }]);

    // Vérifier que l'achat n'existe pas déjà pour ce paiement
    const existingPurchase = await this.bookPurchaseModel
      .findOne({ paymentId: purchaseDto.paymentId })
      .exec();
    if (existingPurchase) {
      return existingPurchase; // Retourner l'achat existant (idempotence)
    }

    // Générer un token de téléchargement unique et sécurisé
    const downloadToken = this.generateDownloadToken();

    // Créer l'achat
    const purchase = new this.bookPurchaseModel({
      userId: userId || null,
      bookId: book._id,
      paymentId: purchaseDto.paymentId,
      bookIdentifier: purchaseDto.bookId,
      bookTitle: book.title,
      price: purchaseDto.price,
      customerName: purchaseDto.customerName,
      customerPhone: purchaseDto.customerPhone,
      customerEmail: purchaseDto.customerEmail,
      downloadToken,
      downloadCount: 0,
      expiresAt: null, // Pas d'expiration par défaut
    });

    const savedPurchase = await purchase.save();

    // Incrémenter le compteur d'achats du livre
    await this.bookModel.findByIdAndUpdate(book._id, { $inc: { purchaseCount: 1 } }).exec();

    return savedPurchase;
  }

  // Vérifier si un utilisateur a acheté un livre
  async checkPurchase(bookId: string, userIdOrPhone: string): Promise<BookPurchase | null> {
    // Rechercher par userId ou par téléphone
    const purchase = await this.bookPurchaseModel
      .findOne({
        bookIdentifier: bookId,
        $or: [{ userId: userIdOrPhone }, { customerPhone: userIdOrPhone }],
      })
      .populate('bookId')
      .lean()
      .exec();

    return purchase;
  }

  // Vérifier un token de téléchargement et retourner les infos
  async verifyDownloadToken(token: string): Promise<{
    purchase: BookPurchase;
    book: Book;
    filePath: string;
  }> {
    const purchase = await this.bookPurchaseModel
      .findOne({ downloadToken: token })
      .populate('bookId')
      .exec();

    if (!purchase) {
      throw new ForbiddenException('Token de téléchargement invalide');
    }

    // Vérifier l'expiration si définie
    if (purchase.expiresAt && new Date() > purchase.expiresAt) {
      throw new ForbiddenException('Le lien de téléchargement a expiré');
    }

    const book = await this.bookModel.findById(purchase.bookId).exec();
    if (!book) {
      throw new NotFoundException('Livre non trouvé');
    }

    // Construire le chemin du fichier PDF
    const filePath = path.join(process.cwd(), 'public', 'books', 'pdf', book.pdfFileName);

    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Fichier PDF non trouvé: ${book.pdfFileName}`);
    }

    // Incrémenter les compteurs de téléchargement
    await this.bookPurchaseModel
      .findByIdAndUpdate(purchase._id, {
        $inc: { downloadCount: 1 },
        lastDownloadAt: new Date(),
      })
      .exec();

    await this.bookModel.findByIdAndUpdate(book._id, { $inc: { downloadCount: 1 } }).exec();

    return { purchase, book, filePath };
  }

  // Récupérer les achats d'un utilisateur
  async getUserPurchases(userIdOrPhone: string): Promise<BookPurchase[]> {
    return this.bookPurchaseModel
      .find({
        $or: [{ userId: userIdOrPhone }, { customerPhone: userIdOrPhone }],
      })
      .populate('bookId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // Générer un token de téléchargement sécurisé
  private generateDownloadToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Ajouter un utilisateur à la liste des propriétaires d'un livre
   * Utilisé après vérification du paiement
   */
  async addUserPurchase(bookId: string, userId: string): Promise<BookPurchase> {
    // Vérifier que le livre existe
    const book = await this.bookModel.findOne({ _id: bookId }).exec();
    if (!book) {
      throw new NotFoundException(`Livre ${bookId} non trouvé`);
    }

    // Générer un token de téléchargement unique et sécurisé
    const downloadToken = this.generateDownloadToken();

    // Créer l'enregistrement d'achat
    const purchase = new this.bookPurchaseModel({
      userId,
      bookId: book._id,
      bookIdentifier: bookId,
      bookTitle: book.title,
      downloadToken,
      downloadCount: 0,
      lastDownloadAt: null,
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    });

    return purchase.save();
  }

  async listAllIds(): Promise<string[]> {
    const books = await this.bookModel.find({}, { _id: 1 }).exec();
    return books.map(b => b._id.toString());
  }

  // Met à jour les alternatives d'offrandes d'un livre
  async updateBookOfferings(bookId: string, alternatives: any[]): Promise<Book> {
    const book = await this.bookModel.findById(bookId).exec();
    if (!book) {
      throw new NotFoundException(`Livre ${bookId} non trouvé`);
    }
    if (!book.offering) {
      book.offering = { alternatives: [] };
    }
    book.offering.alternatives = alternatives;
    await book.save();
    return book;
  }

  // Consomme l'offrande pour l'achat d'un livre
  async consumeOfferingForBookPurchase(
    bookId: string,
    user: any,
    offeringId: string,
    category: string,
    quantity: number
  ): Promise<void> {
    const userId = user.id || user._id;
    console.log('[BooksService] consumeOfferingForBookPurchase', { bookId, userId, offeringId, category, quantity });
    if (!userId) {
      console.log('[BooksService] Utilisateur non authentifié');
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const book = await this.bookModel.findById(bookId).exec();
    if (!book) {
      console.log('[BooksService] Livre non trouvé', { bookId });
      throw new NotFoundException('Livre non trouvé');
    }
    // Vérifie que l'offrande demandée fait partie des alternatives du livre
    const alt = (book.offering?.alternatives ?? []).find(
      a => a.offeringId === offeringId && a.category === category && a.quantity === quantity
    );
    if (!alt) {
      console.log('[BooksService] Offrande non valide pour ce livre', { offeringId, category, quantity, alternatives: book.offering?.alternatives });
      throw new BadRequestException("L'offrande sélectionnée n'est pas valide pour ce livre.");
    }
    // Vérifie que l'utilisateur possède l'offrande
    const userOfferings = await this.walletOfferingsService.getUserOfferings(userId);
    const userOffrande = userOfferings.find(o => o.offeringId === offeringId);
    if (!userOffrande || userOffrande.quantity < quantity) {
      console.log('[BooksService] Utilisateur ne possède pas l\'offrande requise', { userOfferings, required: { offeringId, quantity } });
      throw new BadRequestException("L'utilisateur ne possède pas l'offrande requise.");
    }
    // Consomme l'offrande
    await this.walletOfferingsService.consumeOfferingsForBookPurchase(
      userId,
      book._id.toString(),
      [{ offeringId, quantity }],
    );
    // Incrémente le compteur d'achats du livre
    await this.bookModel.findByIdAndUpdate(book._id, { $inc: { purchaseCount: 1 } }).exec();
  }
}