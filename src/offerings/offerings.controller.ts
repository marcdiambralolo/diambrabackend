import { Controller, Get, Post, Put, Body, UseGuards, Param, NotFoundException, BadRequestException, UploadedFile, UseInterceptors, Delete, Query, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';

import { OfferingsService } from './offerings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

// ==================== CONSTANTES ====================
// ✅ Dossier spécifique pour les offrandes
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/uploads/offerings';
// ✅ URL publique correspondante
const PUBLIC_URL = process.env.PUBLIC_UPLOAD_URL || 'https://diambra.net/uploads/offerings';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ==================== UTILITAIRES ====================
const ensureUploadDirectory = () => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o755 });
    }
  } catch (e) {
    console.error(`❌ Erreur création dossier offerings:`, e);
  }
};

// ✅ Fonction pour nettoyer le nom du fichier
const sanitizeFileName = (originalname: string): string => {
  // Remplacer les espaces et caractères spéciaux par des tirets
  let cleanName = originalname
    .toLowerCase()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ôö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Limiter la longueur du nom
  if (cleanName.length > 50) {
    cleanName = cleanName.substring(0, 50);
  }
  
  return cleanName;
};

const generateFileName = (originalname: string): string => {
  const ext = path.extname(originalname).toLowerCase();
  const baseName = path.basename(originalname, ext);
  const cleanBase = sanitizeFileName(baseName);
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return `offrande-${cleanBase}-${unique}${ext}`;
};

const deleteOldImage = async (imageUrl: string | undefined): Promise<void> => {
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[Offerings][Upload] Ancienne image supprimée: ${filename}`);
    } catch (err) {
      console.error(`[Offerings][Upload] Erreur suppression ancienne image: ${err}`);
    }
  }
};

// ==================== CONFIGURATION MULTER ====================
const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirectory();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  },
});

const multerFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new BadRequestException('Format non supporté. Utilisez JPG, PNG, WebP ou GIF'), false);
  }
  cb(null, true);
};

// ==================== DTO ====================
interface CreateOfferingDto {
  name: string;
  price: number;
  priceUSD: number;
  category: 'animal' | 'vegetal' | 'beverage';
  description: string;
  illustrationUrl?: string;
}

interface UpdateOfferingDto extends Partial<CreateOfferingDto> {
  removeIllustration?: boolean;
}

// ==================== CONTROLLER ====================
@Controller('offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Post('upload-illustration')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: multerStorage,
    fileFilter: multerFileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }))
  async uploadIllustration(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    const url = `${PUBLIC_URL}/${file.filename}`;
    console.log(`[Offerings][Upload] Nouvelle illustration uploadée: ${url}`);
    return {
      success: true,
      url,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  // Supprimer une illustration
  @Delete('illustration')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deleteIllustration(@Query('filename') filename: string) {
    if (!filename) {
      throw new BadRequestException('Nom du fichier requis');
    }
    
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Fichier non trouvé');
    }
    
    try {
      fs.unlinkSync(filePath);
      console.log(`[Upload] Illustration supprimée: ${filename}`);
      return { success: true, message: 'Image supprimée avec succès' };
    } catch (err) {
      console.error(`[Upload] Erreur lors de la suppression: ${err}`);
      throw new BadRequestException('Erreur lors de la suppression de l\'image');
    }
  }

  @Get()
  async findAll() {
    const offerings = await this.offeringsService.findAll();
    return { offerings };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const offering = await this.offeringsService.findById(id);
    if (!offering) {
      throw new NotFoundException('Offrande non trouvée');
    }
    return offering;
  }

     @Post('bulk')
  async findManyByIds(@Body('ids') ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { offerings: [] };
    }
    const offerings = await this.offeringsService.findManyByIds(ids);
    return { offerings };
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('illustration', {
    storage: multerStorage,
    fileFilter: multerFileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }))
  async create(
    @Body() data: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    console.log('[OfferingsController][POST] Données reçues:', {
      name: data.name,
      price: data.price,
      category: data.category,
      hasFile: !!file,
    });
    
    // Validation des champs requis
    const requiredFields = ['name', 'price', 'priceUSD', 'category', 'description'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error(`[OfferingsController] Champs manquants: ${missingFields.join(', ')}`);
      throw new BadRequestException(`Champs obligatoires manquants: ${missingFields.join(', ')}`);
    }
    
    // Validation des types
    const price = Number(data.price);
    const priceUSD = Number(data.priceUSD);
    
    if (isNaN(price) || price <= 0) {
      throw new BadRequestException('Le prix doit être un nombre positif');
    }
    
    if (isNaN(priceUSD) || priceUSD <= 0) {
      throw new BadRequestException('Le prix USD doit être un nombre positif');
    }
    
    // Validation de la catégorie
    const validCategories = ['animal', 'vegetal', 'beverage'];
    if (!validCategories.includes(data.category)) {
      throw new BadRequestException(`Catégorie invalide. Valeurs autorisées: ${validCategories.join(', ')}`);
    }
    
    // Construction de l'objet à créer
    const createData: CreateOfferingDto = {
      name: data.name.trim(),
      price,
      priceUSD,
      category: data.category,
      description: data.description.trim(),
    };
    
    // Ajouter l'URL de l'illustration si un fichier a été uploadé
    if (file) {
      createData.illustrationUrl = `${PUBLIC_URL}/${file.filename}`;
      console.log(`[OfferingsController] Nouvelle illustration: ${createData.illustrationUrl}`);
    } else if (data.illustrationUrl) {
      // Si une URL est fournie directement (pour les imports ou URLs externes)
      createData.illustrationUrl = data.illustrationUrl;
    }
    
    try {
      const created = await this.offeringsService.create(createData);
      console.log(`[OfferingsController] Offrande créée avec succès: ${created._id}`);
      return { success: true, offering: created };
    } catch (err) {
      console.error('[OfferingsController] Erreur lors de la création:', err);
      throw err;
    }
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('illustration', {
    storage: multerStorage,
    fileFilter: multerFileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }))
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    console.log(`[OfferingsController][PUT] Mise à jour de l'offrande ${id}`);
    console.log('[OfferingsController] Données reçues:', {
      name: updateData.name,
      price: updateData.price,
      category: updateData.category,
      hasFile: !!file,
      removeIllustration: updateData.removeIllustration === 'true',
    });
    
    // Récupérer l'offrande existante
    const existingOffering = await this.offeringsService.findById(id);
    if (!existingOffering) {
      throw new NotFoundException('Offrande non trouvée');
    }
    
    // Préparer les données de mise à jour
    const updatePayload: UpdateOfferingDto = {};
    
    // Mettre à jour les champs texte s'ils sont fournis
    if (updateData.name !== undefined) {
      updatePayload.name = updateData.name.trim();
    }
    if (updateData.price !== undefined) {
      const price = Number(updateData.price);
      if (isNaN(price) || price <= 0) {
        throw new BadRequestException('Le prix doit être un nombre positif');
      }
      updatePayload.price = price;
    }
    if (updateData.priceUSD !== undefined) {
      const priceUSD = Number(updateData.priceUSD);
      if (isNaN(priceUSD) || priceUSD <= 0) {
        throw new BadRequestException('Le prix USD doit être un nombre positif');
      }
      updatePayload.priceUSD = priceUSD;
    }
    if (updateData.category !== undefined) {
      const validCategories = ['animal', 'vegetal', 'beverage'];
      if (!validCategories.includes(updateData.category)) {
        throw new BadRequestException(`Catégorie invalide. Valeurs autorisées: ${validCategories.join(', ')}`);
      }
      updatePayload.category = updateData.category;
    }
    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description.trim();
    }
    
    // Gestion de l'illustration
    const shouldRemoveIllustration = updateData.removeIllustration === 'true';
    
    if (shouldRemoveIllustration) {
      // Supprimer l'image existante
      await deleteOldImage(existingOffering.illustrationUrl);
      updatePayload.illustrationUrl = undefined;
      console.log(`[OfferingsController] Illustration supprimée pour l'offrande ${id}`);
    } else if (file) {
      // Nouvelle image uploadée - supprimer l'ancienne
      await deleteOldImage(existingOffering.illustrationUrl);
      updatePayload.illustrationUrl = `${PUBLIC_URL}/${file.filename}`;
      console.log(`[OfferingsController] Nouvelle illustration: ${updatePayload.illustrationUrl}`);
    } else if (updateData.illustrationUrl !== undefined) {
      // URL d'illustration fournie directement (pour compatibilité)
      if (updateData.illustrationUrl === '') {
        updatePayload.illustrationUrl = undefined;
      } else {
        updatePayload.illustrationUrl = updateData.illustrationUrl;
      }
    }
    
    // Vérifier s'il y a des modifications
    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException('Aucune donnée de mise à jour fournie');
    }
    
    try {
      const updated = await this.offeringsService.updateById(id, updatePayload);
      if (!updated) {
        throw new NotFoundException('Offrande non trouvée');
      }
      
      console.log(`[OfferingsController] Offrande ${id} mise à jour avec succès`);
      return { success: true, offering: updated };
    } catch (err) {
      console.error('[OfferingsController] Erreur lors de la mise à jour:', err);
      throw err;
    }
  }

  @Post('bulk-update')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async bulkUpdate(@Body('offerings') offerings: any[]) {
    if (!Array.isArray(offerings)) {
      throw new BadRequestException('Le corps de la requête doit contenir un tableau "offerings"');
    }
    
    await this.offeringsService.bulkUpdate(offerings);
    return { 
      success: true, 
      message: `${offerings.length} offrandes sauvegardées avec succès` 
    };
  }
  
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async delete(@Param('id') id: string) {
    const offering = await this.offeringsService.findById(id);
    if (!offering) {
      throw new NotFoundException('Offrande non trouvée');
    }
    
    // Supprimer l'image associée
    await deleteOldImage(offering.illustrationUrl);
    
    const deleted = await this.offeringsService.deleteById(id);
    if (!deleted) {
      throw new NotFoundException('Offrande non trouvée');
    }
    
    return { success: true, message: 'Offrande supprimée avec succès' };
  }
}