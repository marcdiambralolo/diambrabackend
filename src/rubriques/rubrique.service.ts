import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserConsultationChoice, UserConsultationChoiceDocument } from '../consultations/schemas/user-consultation-choice.schema';
import { ReorderChoicesDto } from './dto/reorder-choices.dto';
import { RubriqueDto } from './dto/rubrique.dto';
import { ConsultationChoice, Rubrique, RubriqueDocument } from './rubrique.schema';
 
type UpdatedChoiceResponse = {
  _id: string;
  title?: string;
  description?: string;
  frequence?: string;
  participants?: string;
  offering?: unknown;
  order?: number;
  prompt: string;
  promptId?: string | null;
  rubriqueId: string;
  rubriqueTitle: string;
  pdfFile?: string;
};

@Injectable()
export class RubriqueService {
  constructor(
    @InjectModel(Rubrique.name) private rubriqueModel: Model<RubriqueDocument>,
    @InjectModel(UserConsultationChoice.name) private userConsultationChoiceModel: Model<UserConsultationChoiceDocument>,
  ) { }

  /**
   * Ajoute un choix de consultation à une rubrique
   */
  async addConsultationChoice(rubriqueId: string, dto: any) {
    try {
      console.log('addConsultationChoice called with:', { rubriqueId, dto });
      const rubrique = await this.rubriqueModel.findById(rubriqueId);
      if (!rubrique) throw new NotFoundException('Rubrique non trouvée');

      // Nettoyage et validation stricte du choix
      let gradeId: any = dto.gradeId;
      if (gradeId) {
        if (typeof gradeId === 'string') {
          if (Types.ObjectId.isValid(gradeId)) {
            gradeId = new Types.ObjectId(gradeId);
          } else {
            throw new Error("gradeId fourni n'est pas un ObjectId valide");
          }
        } else if (!(gradeId instanceof Types.ObjectId)) {
          throw new Error('gradeId doit être un ObjectId ou une string ObjectId');
        }
      } else {
        gradeId = undefined;
      }
      const freqEnum = ['UNE_FOIS_VIE', 'ANNUELLE', 'MENSUELLE', 'QUOTIDIENNE', 'LIBRE'];
      const partEnum = ['SOLO', 'AVEC_TIERS', 'GROUPE', 'POUR_TIERS'];
      const requiredCats = ['animal', 'vegetal', 'beverage'];

      // Normalisation de l'objet offering
      const offering = Array.isArray(dto.offering)
        ? { alternatives: dto.offering }
        : dto.offering;

      if (!offering || !Array.isArray(offering.alternatives)) {
        throw new Error(`L'objet 'offering' du choix '${dto.title}' est mal formé.`);
      }
      const alternatives = (offering.alternatives || []).map((alt: { category: string; offeringId: string; quantity: number }) => {
        const { category, offeringId, quantity } = alt;
        return { category, offeringId, quantity };
      });
      const catsSet = new Set(alternatives.map((a: { category: string }) => a.category));
      if (alternatives.length !== 3 || requiredCats.some(cat => !catsSet.has(cat))) {
        throw new Error('Chaque choix doit avoir 3 alternatives différentes : animal, vegetal, beverage');
      }

      // Validation des champs requis
      if (!dto.title || !dto.description || !gradeId || !dto.frequence || !dto.participants) {
        throw new Error('Champs requis manquants (title, description, gradeId, frequence, participants)');
      }
      if (!freqEnum.includes(dto.frequence)) {
        throw new Error('Valeur de frequence invalide');
      }
      if (!partEnum.includes(dto.participants)) {
        throw new Error('Valeur de participants invalide');
      }

      // Construction du choix nettoyé
      const cleanedChoice = {
        prompt: dto.prompt,
        title: dto.title,
        description: dto.description,
        frequence: dto.frequence,
        participants: dto.participants,
        order: 0,
        offering: { alternatives },
        pdfFile: typeof dto.pdfFile === 'string' ? dto.pdfFile : undefined,
        gradeId,
      };

      // DEBUG LOGS
      console.log('DEBUG gradeId:', gradeId, typeof gradeId, gradeId instanceof Types.ObjectId);
      console.log('DEBUG cleanedChoice:', cleanedChoice);

      // Création explicite du sous-document ConsultationChoice via le modèle Mongoose
      await this.rubriqueModel.updateOne(
        { _id: rubriqueId },
        { $push: { consultationChoices: cleanedChoice } }
      );
      // Recharge la rubrique mise à jour pour retour
      const updatedRubrique = await this.rubriqueModel.findById(rubriqueId);
      return updatedRubrique;
    } catch (err: any) {
      // Log l'erreur côté serveur
      console.error('Erreur addConsultationChoice:', err);
      // Retourne une erreur explicite côté API
      throw new Error(err?.message || 'Erreur inconnue lors de l\'ajout du choix');
    }
  }

 

  async findAll() {
    return this.rubriqueModel.find().populate('categorieId').lean().exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Identifiant de rubrique invalide');
    }
    const rubrique = await this.rubriqueModel.findById(id).populate('categorieId').lean().exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    return rubrique;
  }

  async create(dto: RubriqueDto) {
    dto.consultationChoices = dto.consultationChoices.map((choice) => {
      // Nettoyage gradeId
      const gradeId = (typeof choice.gradeId === 'string' && choice.gradeId.trim() === '') ? undefined : choice.gradeId;

      // Normalisation de l'objet offering
      const offering = Array.isArray(choice.offering)
        ? { alternatives: choice.offering }
        : choice.offering;

      if (!offering || !Array.isArray(offering.alternatives)) {
        throw new Error(`L'objet 'offering' du choix '${choice.title}' est mal formé.`);
      }

      // Nettoyage et validation des alternatives
      const alternatives = (offering.alternatives || []).map(({ category, offeringId, quantity }) => ({ category, offeringId, quantity }));
      const requiredCats = ['animal', 'vegetal', 'beverage'];
      const catsSet = new Set(alternatives.map(a => a.category));
      if (alternatives.length !== 3 || requiredCats.some(cat => !catsSet.has(cat))) {
        throw new Error('Chaque choix doit avoir 3 alternatives différentes : animal, vegetal, beverage');
      }

      // Validation frequence (respecte le type ConsultationChoiceDto)
      const freqEnum = ['UNE_FOIS_VIE', 'ANNUELLE', 'MENSUELLE', 'QUOTIDIENNE', 'LIBRE'];
      const frequence: 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE' = freqEnum.includes(choice.frequence as string)
        ? (choice.frequence as 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE')
        : 'LIBRE';

      // Validation participants
      const partEnum = ['SOLO', 'AVEC_TIERS', 'GROUPE', 'POUR_TIERS'];
      const participants: 'SOLO' | 'AVEC_TIERS' | 'GROUPE' | 'POUR_TIERS' | undefined =
        choice.participants && partEnum.includes(choice.participants)
          ? choice.participants as 'SOLO' | 'AVEC_TIERS' | 'GROUPE' | 'POUR_TIERS'
          : undefined;

      // Construction du choix nettoyé
      return {
        prompt: choice.prompt,
        title: choice.title,
        description: choice.description,
        frequence,
        participants,
        order: choice.order,
        offering: { alternatives },
        pdfFile: typeof choice.pdfFile === 'string' ? choice.pdfFile : undefined,
        gradeId,
      };
    });
    return this.rubriqueModel.create(dto);
  }

  cleanConsultationChoices(choices: any[]): ConsultationChoice[] {
    return choices.map(choice => {
      const gradeId = (typeof choice.gradeId === 'string' && choice.gradeId.trim() === '') ? undefined : choice.gradeId;
      return {
        _id: choice._id,
        prompt: choice.prompt,
        title: choice.title,
        description: choice.description,
        order: choice.order,
        frequence: choice.frequence,
        participants: choice.participants,
        offering: {
          alternatives: (choice.offering?.alternatives || []).map((alt: any) => ({
            _id: alt._id,
            category: alt.category,
            offeringId: alt.offeringId,
            quantity: alt.quantity,
          })),
        },
        pdfFile: typeof choice.pdfFile === 'string' ? choice.pdfFile : undefined,
        gradeId,
      };
    });
  }

  async update(id: string, dto: RubriqueDto) {
    return this.rubriqueModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async remove(id: string) {
    const rubrique = await this.rubriqueModel.findByIdAndDelete(id).exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    return { deleted: true };
  }

  /**
 * Retourne les alternatives d'un choix de consultation donné (par son _id)
 */
  async getAlternativesForChoice(choiceId: string) {
    console.log('Fetching alternatives for choiceId:', choiceId);
    // Recherche la rubrique contenant ce choix (sans populate)
    const rubrique = await this.rubriqueModel.findOne({ 'consultationChoices._id': choiceId })
      .lean()
      .exec();
    console.log('Found rubrique for choice:', rubrique?._id);
    console.log('Found rubrique:', rubrique);
    if (!rubrique) throw new NotFoundException('Aucune rubrique ne contient ce choix');
    const choice = (rubrique.consultationChoices || []).find((c: any) => c._id?.toString?.() === choiceId || c._id === choiceId);
    if (!choice) throw new NotFoundException('Choix de consultation non trouvé');
    if (!choice.offering || !Array.isArray(choice.offering.alternatives)) {
      throw new NotFoundException('Aucune alternative trouvée pour ce choix');
    }

    // Filtrer les alternatives avec un offeringId valide (avant populate)
    const validAlternatives = (choice.offering.alternatives || []).filter(
      (alt: any) =>
        typeof alt.offeringId === 'string' &&
        alt.offeringId.length === 24 &&
        /^[a-fA-F0-9]{24}$/.test(alt.offeringId)
    );

    if (validAlternatives.length === 0) return [];

    // Populate manuellement les données d'offering (name, illustrationUrl)
    // On évite le populate Mongoose pour ne pas planter sur les ids invalides
    const offeringIds = validAlternatives.map((alt: any) => alt.offeringId);
    const offeringDocs = await this.rubriqueModel.db.model('Offering').find({ _id: { $in: offeringIds } }, { name: 1, illustrationUrl: 1 }).lean();
    const offeringMap = new Map(offeringDocs.map((o: any) => [o._id.toString(), o]));

    const alternativesWithName = validAlternatives.map((alt: any) => {
      const offering = offeringMap.get(alt.offeringId);
      return {
        ...alt,
        name: offering?.name || '',
        illustrationUrl: offering?.illustrationUrl,
      };
    });

    return alternativesWithName;
  }

  async reorderChoices(id: string, dto: ReorderChoicesDto) {
    const rubrique = await this.rubriqueModel.findById(id).exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    const orderMap = new Map(dto.choices.map(c => [c.choiceId, c.order]));
    rubrique.consultationChoices.forEach(choice => {
      const newOrder = orderMap.get(choice._id?.toString() ?? '');
      if (newOrder !== undefined) {
        choice.order = newOrder;
      }
    });

    rubrique.consultationChoices.sort((a, b) => (a.order || 0) - (b.order || 0));

    return await rubrique.save();
  }
 
  // Helper: transforme une valeur (ObjectId | string | objet populate) en string id
  toIdString(v: unknown): string | null {
    if (!v) return null;

    if (typeof v === 'string') return v;

    if (typeof v === 'object') {
      const anyV = v as any;

      // populate: { _id: ... }
      if (anyV._id?.toString) return anyV._id.toString();

      // ObjectId direct
      if (anyV.toString) return anyV.toString();
    }

    return null;
  }

  // Helper: récupère status / analysisNotified uniquement si consultationId est populated
  getConsultationMeta(v: unknown): { status?: string; analysisNotified?: boolean } {
    if (!v || typeof v !== 'object') return {};
    const anyV = v as any;
    // si ce n'est pas une consultation peuplée, ces champs n'existent pas
    return {
      status: typeof anyV.status === 'string' ? anyV.status : undefined,
      analysisNotified: typeof anyV.analysisNotified === 'boolean' ? anyV.analysisNotified : undefined,
    };
  }

  /**
 * Met à jour un choix de consultation (gradeId, etc)
 */
  async updateConsultationChoice(rubriqueId: string, choiceId: string, update: Partial<ConsultationChoice>) {

    console.log('updateConsultationChoice called with:', { rubriqueId, choiceId, update });
    // On met à jour le choix ciblé directement avec $set
    const updateResult = await this.rubriqueModel.updateOne(
      { _id: rubriqueId, 'consultationChoices._id': choiceId },
      { $set: { 'consultationChoices.$': { _id: choiceId, ...update } } }
    );
    if (updateResult.modifiedCount === 0) {
      throw new NotFoundException('Rubrique ou choix non trouvé');
    }
    // Retourne le choix modifié (rechargé)
    const rubrique = await this.rubriqueModel.findById(rubriqueId).lean();
    const choice = rubrique?.consultationChoices?.find((c: any) => c._id?.toString?.() === choiceId || c._id === choiceId);
    console.log('Updated choice:', choice);
    return choice;
  }

  async updateChoicePrompt(choiceId: string, promptRaw: string): Promise<UpdatedChoiceResponse> {
    const prompt = (promptRaw ?? "").trim();
    if (!prompt) {
      throw new NotFoundException("Le prompt ne peut pas être vide.");
    }

    // ✅ CAST ObjectId si possible (évite mismatch string/ObjectId)
    const choiceObjectId = Types.ObjectId.isValid(choiceId)
      ? new Types.ObjectId(choiceId)
      : choiceId;

    const updatedRubrique = await this.rubriqueModel
      .findOneAndUpdate(
        { "consultationChoices._id": choiceObjectId },
        {
          $set: { "consultationChoices.$.prompt": prompt },
          $currentDate: { updatedAt: true }, // bump updatedAt (timestamps)
        },
        {
          new: true,
          projection: { titre: 1, consultationChoices: 1 },
          runValidators: true,
        },
      )
      .lean()
      .exec();

    if (!updatedRubrique) {
      throw new NotFoundException(
        `Aucun choix de consultation avec l'ID ${choiceId} trouvé.`,
      );
    }

    const rubriqueId = this.toIdString((updatedRubrique as any)._id) ?? "";
    const rubriqueTitle = ((updatedRubrique as any).titre as string) ?? "";

    const choice = ((updatedRubrique as any).consultationChoices ?? []).find((c: any) => {
      const cId = this.toIdString(c?._id);
      return cId === choiceId;
    });

    if (!choice) {
      throw new NotFoundException(
        `Choix ${choiceId} non retrouvé après mise à jour (incohérence).`,
      );
    }

    return {
      _id: this.toIdString(choice._id) ?? choiceId,
      title: choice.title,
      description: choice.description,
      frequence: choice.frequence,
      participants: choice.participants,
      offering: choice.offering,
      order: choice.order,
      prompt: choice.prompt ?? prompt,
      promptId: this.toIdString(choice.promptId),
      rubriqueId,
      rubriqueTitle,
      pdfFile: typeof (choice as any)?.pdfFile === 'string' ? (choice as any).pdfFile : undefined,
    };
  }
}