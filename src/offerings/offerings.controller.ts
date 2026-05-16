import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OfferingsService } from './offerings.service';
 
interface CreateOfferingDto {
  name: string;
  price: number;
  description: string;
}

interface UpdateOfferingDto extends Partial<CreateOfferingDto> {
  removeIllustration?: boolean;
}

// ==================== CONTROLLER ====================
@Controller('offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  
 
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
  async create(
    @Body() data: any,
  ) {
   
    const requiredFields = ['name', 'price', 'description'];
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
      description: data.description.trim(),
    };
     
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
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    console.log(`[OfferingsController][PUT] Mise à jour de l'offrande ${id}`);
    
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
   
    
    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description.trim();
    }
    
    // Gestion de l'illustration
     
    
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
    
    
    
    const deleted = await this.offeringsService.deleteById(id);
    if (!deleted) {
      throw new NotFoundException('Offrande non trouvée');
    }
    
    return { success: true, message: 'Offrande supprimée avec succès' };
  }
}