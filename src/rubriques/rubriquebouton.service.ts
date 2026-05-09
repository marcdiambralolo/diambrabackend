import { Analysis } from '@/consultations/schemas/analysis.schema';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { ConsultationChoiceWithCountDto, RubriqueWithChoiceCountDto } from './dto/rubrique-with-count.dto';
import { Rubrique, RubriqueDocument } from './rubrique.schema';

@Injectable()
export class RubriqueBoutonService {

    constructor(
        @InjectModel(Rubrique.name) private rubriqueModel: Model<RubriqueDocument>,
        @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
        @InjectModel(Analysis.name) private analysisModel: Model<Analysis>,
    ) { }

    toIdString(v: unknown): string | null {
        if (!v) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'object') {
            const anyV = v as any;
            if (anyV._id?.toString) return anyV._id.toString();
            if (anyV.toString) return anyV.toString();
        }
        return null;
    }

    getConsultationMeta(v: unknown): { status?: string; analysisNotified?: boolean } {
        if (!v || typeof v !== 'object') return {};
        const anyV = v as any;
        return {
            status: typeof anyV.status === 'string' ? anyV.status : undefined,
            analysisNotified: typeof anyV.analysisNotified === 'boolean' ? anyV.analysisNotified : undefined,
        };
    }

    async getChoicesWithConsultationCount(
        rubriqueId: string,
        userId: string,
    ): Promise<RubriqueWithChoiceCountDto> {

        type ButtonStatus = 'CONSULTER' | 'RÉPONSE EN ATTENTE' | "VOIR L'ANALYSE";

        const rubrique = await this.rubriqueModel.findById(rubriqueId)
            .populate('categorieId')
            .populate('consultationChoices.gradeId')
            .exec();
            
        if (!rubrique) throw new NotFoundException('Rubrique non trouvée');

        const consultationChoices = Array.isArray(rubrique.consultationChoices) ? rubrique.consultationChoices : [];

        const choicesWithCount: ConsultationChoiceWithCountDto[] = await Promise.all(
            consultationChoices.map(async (choice: any) => {
                const {
                    _id,
                    order = 0,
                    title = '',
                    description = '',
                    frequence = 'LIBRE',
                    participants = null,
                    offering = {},
                    prompt = '',
                    pdfFile,
                    gradeId = null,
                } = choice || {};
                const choiceId = this.toIdString(_id) ?? null;
                let buttonStatus: ButtonStatus = 'CONSULTER';
                let consultationId: string | null = null;
                let consultationCount = 0;

                // Ajout du nom de l'offrande si présent
                let offeringName = '';
                if (offering && typeof offering === 'object' && 'name' in offering) {
                    offeringName = offering.name;
                }

                if (choice && pdfFile) {
                    return {
                        _id: choiceId,
                        title,
                        description,
                        frequence,
                        participants,
                        order,
                        offering,
                        offeringName,
                        consultationCount,
                        buttonStatus,
                        consultationId,
                        prompt,
                        pdfFile,
                        gradeId,
                    };
                }

                if (!choiceId) {
                    return {
                        _id: null,
                        title,
                        description,
                        frequence,
                        participants,
                        order,
                        offering,
                        offeringName,
                        consultationCount,
                        buttonStatus,
                        consultationId,
                        prompt,
                        pdfFile,
                        gradeId,
                    };
                }

                if (frequence === 'UNE_FOIS_VIE') {
                    const consultationObj = await this.consultationModel.findOne({
                        clientId: userId,
                        $or: [
                            { choiceId },
                            { 'choice._id': choiceId },
                        ],
                    }).sort({ createdAt: -1 }).lean().exec();
                    if (consultationObj) {
                        consultationId = this.toIdString(consultationObj._id);
                        const hasAnalysis = await this.analysisModel.exists({ clientId: userId, choiceId, analysisNotified: true });
                        buttonStatus = hasAnalysis ? "VOIR L'ANALYSE" : 'RÉPONSE EN ATTENTE';
                    }
                } else {
                    consultationCount = await this.analysisModel.countDocuments({
                        clientId: userId,
                        choiceId,
                        analysisNotified: true,
                    }) || 0;
                    buttonStatus = 'CONSULTER';
                }
                return {
                    _id: choiceId,
                    title,
                    description,
                    frequence,
                    participants,
                    order,
                    offering,
                    offeringName,
                    consultationCount,
                    buttonStatus,
                    consultationId,
                    prompt,
                    pdfFile,
                    gradeId,
                };
            })
        );
        choicesWithCount.sort((a, b) => (a.order || 0) - (b.order || 0));

        return {
            _id: this.toIdString((rubrique as any)._id) ?? String((rubrique as any)._id),
            titre: rubrique.titre || '',
            description: rubrique.description || '',
            categorie: (rubrique as any).categorie,
            typeconsultation: (rubrique as any).typeconsultation,
            consultationChoices: choicesWithCount,
        };
    }
}