import { Controller, Get, Param, Inject } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';

@Controller('config')
export class ConfigController {
  constructor(
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
  ) {}
  
  /**
   * GET /config/domaines
   * Retourne la liste complète des domaines (arborescence complète)
   */
  @Get('domaines')
  async getDomaines() {
    // Retourne toutes les catégories avec rubriques (arborescence dynamique)
    return this.categoriesService.findAll();
  }

  /**
   * GET /config/domaines/:domaineId/consultations
   * Retourne toutes les consultations d'un domaine
   */
  @Get('domaines/:domaineId/consultations')
  async getConsultationsByDomaine(@Param('domaineId') domaineId: string) {
    // On suppose que domaineId = id de la catégorie
    const cat = await this.categoriesService.findOne(domaineId);
    if (!cat || !cat.rubriques) return [];
    // Agrège toutes les consultations de toutes les rubriques de la catégorie
    let consultations: any[] = [];
    for (const rubriqueRaw of cat.rubriques) {
      const rubrique = rubriqueRaw as any;
      if (rubrique.consultationChoices) {
        consultations = consultations.concat(rubrique.consultationChoices);
      }
    }
    return consultations;
  }

  /**
   * GET /config/sous-rubriques/:sousRubriqueId/consultations
   * Retourne toutes les consultations d'une sous-rubrique
   */
  @Get('sous-rubriques/:sousRubriqueId/consultations')
  async getConsultationsBySousRubrique(@Param('sousRubriqueId') sousRubriqueId: string) {
    // Recherche la catégorie qui contient la sous-rubrique
    const categories = await this.categoriesService.findAll();
    for (const cat of categories) {
      const rubriqueRaw = cat.rubriques.find((r: any) => r._id?.toString() === sousRubriqueId || r.id === sousRubriqueId);
      const rubrique = rubriqueRaw as any;
      if (rubrique && rubrique.consultationChoices) {
        return rubrique.consultationChoices;
      }
    }
    return [];
  }

  /**
   * GET /config/consultations/:consultationId
   * Retourne le détail d'une consultation
   */
  @Get('consultations/:consultationId')
  async getConsultationById(@Param('consultationId') consultationId: string) {
    // Recherche la consultation par id dans toutes les rubriques de toutes les catégories
    const categories = await this.categoriesService.findAll();
    for (const cat of categories) {
      for (const rubriqueRaw of cat.rubriques) {
        const rubrique = rubriqueRaw as any;
        if (rubrique.consultationChoices) {
          const found = rubrique.consultationChoices.find((c: any) => c._id?.toString() === consultationId || c.id === consultationId);
          if (found) return found;
        }
      }
    }
    return undefined;
  }

  /**
   * GET /config/stats
   * Statistiques de la plateforme
   */
  @Get('stats')
  async getStats() {
    // Statistiques dynamiques depuis la base
    const categories = await this.categoriesService.findAll();
    let totalConsultations = 0;
    let consultationsUnique = 0;
    let consultationsCycliques = 0;
    let totalRubriques = 0;
    for (const cat of categories) {
      for (const rubriqueRaw of cat.rubriques) {
        const rubrique = rubriqueRaw as any;
        totalRubriques++;
        if (rubrique.consultationChoices) {
          for (const consultation of rubrique.consultationChoices) {
            totalConsultations++;
            if (consultation.type === 'unique') consultationsUnique++;
            else consultationsCycliques++;
          }
        }
      }
    }
    return {
      totalDomaines: categories.length,
      totalRubriques,
      totalConsultations,
      consultationsUnique,
      consultationsCycliques,
    };
  }
}