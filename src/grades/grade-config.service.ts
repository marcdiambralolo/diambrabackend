import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rubrique, RubriqueDocument } from '../rubriques/rubrique.schema';
import { User } from '../users/schemas/user.schema';
import { CreateGradeConfigDto } from './dto/create-grade-config.dto';
import { ReorderGradeChoicesDto } from './dto/reorder-grade-choices.dto';
import { UpdateGradeConfigDto } from './dto/update-grade-config.dto';
import { GradeConfig } from './schemas/grade-config.schema';


interface GradeConfigDto {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    order: number;
    isActive: boolean;
    requirements: {
        consultations: number;
        rituels: number;
        livres: number;
    };

    minConsultations: number | null;
    maxConsultations: number | null;

    // nextGradeId supprimé
    // nextGradeName supprimé

    consultationChoices: Array<{
        id: string;
        rubriqueId: string | null;
        rubriqueName: string | null;
        consultationType: string | null;
        label: string | null;
        price: number | null;
        duration: number | null;
        order: number;
        isActive: boolean;
    }>;

    consultationChoicesCount: number;

    hasCycle: boolean;
    cyclePath: string[];

    createdAt: string | null;
    updatedAt: string | null;
    consultations?: number;
    rituels?: number;
    livres?: number;

}

function asString(value: any): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
        if (value._id != null) return String(value._id);
        if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
            return String(value);
        }
    }
    return null;
}

function asNumber(value: any): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function asBoolean(value: any, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function asDateIso(value: any): string | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function pickPrimitiveString(value: any): string | null {
    return typeof value === 'string' ? value : null;
}


@Injectable()
export class GradeConfigService {
    constructor(
        @InjectModel(GradeConfig.name)
        private gradeConfigModel: Model<GradeConfig>,
        @InjectModel(Rubrique.name)
        private rubriqueModel: Model<RubriqueDocument>,
    ) { }

    /**
     * Get a specific grade configuration by grade name (accessible à tout utilisateur authentifié)
     */
    async getGradeConfigByName(grade: string) {

        // Recherche par grade (clé technique), puis par name (libellé)
        let gradeConfig = await this.gradeConfigModel.findOne({ grade }).lean().exec();
        if (!gradeConfig) {
            gradeConfig = await this.gradeConfigModel.findOne({ name: grade }).lean().exec();
        }
        if (!gradeConfig) {
            console.error(`[getGradeConfigByName] Grade non trouvé pour: ${grade}`);
            throw new NotFoundException(`Grade ${grade} introuvable`);
        }
        // Construction d'un DTO plat, comme dans getAllGradeConfigs
        const id = asString(gradeConfig._id)!;
        const consultationChoices = Array.isArray(gradeConfig.consultationChoices)
            ? gradeConfig.consultationChoices.map((choice: any, index: number) => {
                const rubriqueId =
                    asString(choice?.rubriqueId) ??
                    asString(choice?.rubrique?._id) ??
                    null;
                const rubriqueName =
                    pickPrimitiveString(choice?.rubriqueName) ??
                    pickPrimitiveString(choice?.rubrique?.name) ??
                    pickPrimitiveString(choice?.rubrique?.title) ??
                    null;
                return {
                    id: asString(choice?._id) ?? `${id}-choice-${index}`,
                    rubriqueId,
                    rubriqueName,
                    consultationType: pickPrimitiveString(choice?.consultationType),
                    label: pickPrimitiveString(choice?.label),
                    price: asNumber(choice?.price),
                    duration: asNumber(choice?.duration),
                    order: asNumber(choice?.order) ?? index,
                    isActive: asBoolean(choice?.isActive, true),
                };
            })
            : [];
        return {
            ...gradeConfig,
            id,
            name: pickPrimitiveString(gradeConfig.name) ?? '',
            slug: pickPrimitiveString(gradeConfig.slug),
            description: pickPrimitiveString(gradeConfig.description),
            order: asNumber(gradeConfig.order) ?? 0,
            isActive: asBoolean(gradeConfig.isActive, true),
            minConsultations: asNumber(gradeConfig.minConsultations),
            maxConsultations: asNumber(gradeConfig.maxConsultations),
            consultationChoices,
            consultationChoicesCount: consultationChoices.length,
            hasCycle: false,
            cyclePath: [],
            createdAt: asDateIso(gradeConfig.createdAt),
            updatedAt: asDateIso(gradeConfig.updatedAt),
        };
    }

    /**
     * Get all grade configurations sorted by level
     */
    async getAllGradeConfigs(): Promise<any[]> {
        const grades = await this.gradeConfigModel
            .find({})
            .sort({ order: 1, createdAt: 1 })
            .lean({ virtuals: false });

        const idToGrade = new Map<string, any>();
        // nextById supprimé

        for (const grade of grades) {
            const id = asString(grade._id)!;
            idToGrade.set(id, grade);
        }

        const serialized: GradeConfigDto[] = grades.map((grade) => {
            const id = asString(grade._id)!;
            // nextGradeId supprimé
            // nextGrade supprimé

            const consultationChoices = Array.isArray(grade.consultationChoices)
                ? grade.consultationChoices.map((choice: any, index: number) => {
                    const rubriqueId =
                        asString(choice?.rubriqueId) ??
                        asString(choice?.rubrique?._id) ??
                        null;

                    const rubriqueName =
                        pickPrimitiveString(choice?.rubriqueName) ??
                        pickPrimitiveString(choice?.rubrique?.name) ??
                        pickPrimitiveString(choice?.rubrique?.title) ??
                        null;

                    return {
                        id: asString(choice?._id) ?? `${id}-choice-${index}`,
                        rubriqueId,
                        rubriqueName,
                        consultationType: pickPrimitiveString(choice?.consultationType),
                        label: pickPrimitiveString(choice?.label),
                        price: asNumber(choice?.price),
                        duration: asNumber(choice?.duration),
                        order: asNumber(choice?.order) ?? index,
                        isActive: asBoolean(choice?.isActive, true),
                    };
                })
                : [];

            return {
                ...grade,
                id,
                name: pickPrimitiveString(grade.name) ?? '',
                slug: pickPrimitiveString(grade.slug),
                description: pickPrimitiveString(grade.description),
                order: asNumber(grade.order) ?? 0,
                isActive: asBoolean(grade.isActive, true),

                minConsultations: asNumber(grade.minConsultations),
                maxConsultations: asNumber(grade.maxConsultations),

                consultationChoices,
                consultationChoicesCount: consultationChoices.length,

                hasCycle: false,
                cyclePath: [],

                createdAt: asDateIso(grade.createdAt),
                updatedAt: asDateIso(grade.updatedAt),
            };
        });
        return serialized;
    }



    /**
         * Retourne un mapping de chaque choiceId vers le grade auquel il appartient
         * { [choiceId]: { grade, gradeName, level } }
         */
    async getChoicesGradeMap() {
        // Nouvelle logique : parcourir toutes les rubriques, et pour chaque choix de consultation, utiliser son champ gradeId
        const rubriques = await this.rubriqueModel.find().lean().exec();
        // Pour retrouver le nom et le niveau du grade, on charge tous les grades une fois
        const grades = await this.gradeConfigModel.find().lean().exec();
        const gradeMap = new Map();
        for (const g of grades) {
            const gradeAny = g as any;
            gradeMap.set(gradeAny._id?.toString(), { grade: gradeAny.grade, gradeName: gradeAny.name, level: gradeAny.level });
        }
        const map: Record<string, { gradeId: string, grade: string, gradeName: string, level: number }> = {};
        for (const rubrique of rubriques) {
            if (rubrique.consultationChoices && Array.isArray(rubrique.consultationChoices)) {
                for (const choice of rubrique.consultationChoices) {
                    if (choice && choice._id && choice.gradeId) {
                        const key = choice._id.toString();
                        const gradeInfo = gradeMap.get(choice.gradeId?.toString());
                        if (gradeInfo) {
                            map[key] = {
                                gradeId: choice.gradeId?.toString(),
                                grade: gradeInfo.grade,
                                gradeName: gradeInfo.gradeName,
                                level: gradeInfo.level,
                            };
                        }
                    }
                }
            }
        }
        return map;
    }

    /**
     * Get all grade configurations with enriched info:
     * - nombre de consultationChoices assignés
     * - nom du grade suivant
    * - ...existing code...
     */
    async getEnrichedGradeConfigs(user: User) {
        this.validateAdminAccess(user);

        const grades = await this.gradeConfigModel
            .find()
            .sort({ level: 1 })
            .lean()
            .exec();

        // Construire une map id → grade pour résoudre nextGradeId
        return grades.map((grade) => {
            const g: any = grade;
            const consultationChoices = Array.isArray(g.consultationChoices)
                ? g.consultationChoices.map((choice: any, index: number) => {
                    return {
                        id: asString(choice?._id) ?? `${g._id}-choice-${index}`,
                        rubriqueId: asString(choice?.rubriqueId) ?? asString(choice?.rubrique?._id) ?? null,
                        rubriqueName: pickPrimitiveString(choice?.rubriqueName) ?? pickPrimitiveString(choice?.rubrique?.name) ?? pickPrimitiveString(choice?.rubrique?.title) ?? null,
                        consultationType: pickPrimitiveString(choice?.consultationType),
                        label: pickPrimitiveString(choice?.label),
                        price: asNumber(choice?.price),
                        duration: asNumber(choice?.duration),
                        order: asNumber(choice?.order) ?? index,
                        isActive: asBoolean(choice?.isActive, true),
                    };
                })
                : [];
            return {
                id: asString(g._id),
                grade: g.grade,
                level: g.level,
                name: pickPrimitiveString(g.name) ?? '',
                description: pickPrimitiveString(g.description),
                requirements: g.requirements
                    ? {
                        consultations: g.requirements.consultations,
                        rituels: g.requirements.rituels,
                        livres: g.requirements.livres,
                    }
                    : null,
                consultationChoicesCount: consultationChoices.length,
                consultationChoices,
                createdAt: asDateIso(g.createdAt),
                updatedAt: asDateIso(g.updatedAt),
            };
        });
    }

    /**
     * Create a new grade configuration
     */
    async createGradeConfig(dto: CreateGradeConfigDto, user: User) {
        this.validateAdminAccess(user);

        // Vérifier l'unicité du grade
        const existingGrade = await this.gradeConfigModel
            .findOne({ grade: dto.grade })
            .exec();
        if (existingGrade) {
            throw new BadRequestException(
                `Le grade ${dto.grade} existe déjà`,
            );
        }

        // Vérifier l'unicité du level
        const existingLevel = await this.gradeConfigModel
            .findOne({ level: dto.level })
            .exec();
        if (existingLevel) {
            const gradeDoc = existingLevel as any;
            throw new BadRequestException(
                `Le niveau ${dto.level} est déjà utilisé par le grade ${gradeDoc.grade}`,
            );
        }

        const grade = await this.gradeConfigModel.create({
            grade: dto.grade,
            level: dto.level,
            name: dto.name,
            requirements: dto.requirements,
            consultationChoices: [],
            description: dto.description || '',
        });
        return this.gradeConfigModel.findById(grade._id).exec();
    }

    /**
     * Delete a grade configuration
     */
    async deleteGradeConfig(id: string, user: User) {
        this.validateAdminAccess(user);

        const grade = await this.gradeConfigModel.findById(id).exec();
        if (!grade) {
            throw new NotFoundException(`Grade ${id} introuvable`);
        }

        await this.gradeConfigModel.findByIdAndDelete(id).exec();

        // nextGradeId supprimé : plus de chaîne à reconstruire

        const gradeDoc = grade as any;
        return { deleted: true, grade: gradeDoc.grade, level: gradeDoc.level };
    }



    /**
     * Get a specific grade configuration by ID
     */
    async getGradeConfigById(id: string, user: User) {
        this.validateAdminAccess(user);

        const grade = await this.gradeConfigModel.findById(id).exec();

        if (!grade) {
            throw new NotFoundException(`Grade ${id} introuvable`);
        }

        return grade;
    }

    /**
     * Get all available consultation choices from all rubriques
     */
    async getAvailableConsultationChoices(user: User) {
        this.validateAdminAccess(user);

        const rubriques = await this.rubriqueModel
            .find()
            .exec();

        const allChoices = [];

        for (const rubrique of rubriques) {
            if (rubrique.consultationChoices && rubrique.consultationChoices.length > 0) {
                for (const choice of rubrique.consultationChoices) {
                    allChoices.push({
                        _id: choice._id,
                        choiceId: choice._id?.toString(),
                        title: choice.title,
                        description: choice.description,
                        frequence: choice.frequence,
                        participants: choice.participants,
                        rubriqueId: rubrique._id,
                        rubriqueTitle: rubrique.titre,
                    });
                }
            }
        }

        return allChoices;
    }

    /**
     * Update grade configuration (consultation choices, next grade, description)
     */
    async updateGradeConfig(
        id: string,
        updateDto: UpdateGradeConfigDto 
    ) {
        const grade = await this.gradeConfigModel.findById(id).exec();
        if (!grade) {
            throw new NotFoundException(`Grade ${id} introuvable`);
        }

        // Mise à jour dynamique des champs simples
        const updatableFields: (keyof UpdateGradeConfigDto)[] = ['description', 'name'];
        for (const field of updatableFields) {
            if (updateDto[field] !== undefined) {
                grade.set(field, updateDto[field]);
            }
        }

        // Mise à jour des requirements si présents
        if (updateDto.requirements && typeof updateDto.requirements === 'object') {
            for (const key of ['consultations', 'rituels', 'livres'] as const) {
                if (updateDto.requirements[key] !== undefined) {
                    grade.set(`requirements.${key}`, updateDto.requirements[key]);
                }
            }
        }

        await grade.save();
        return grade;
    }

    // Méthode updateNextGrade supprimée (plus de nextGradeId)

    /**
     * Reorder consultation choices for a grade
     */
    async reorderGradeChoices(
        gradeId: string,
        reorderDto: ReorderGradeChoicesDto,
        user: User,
    ) {
        this.validateAdminAccess(user);

        const grade = await this.gradeConfigModel.findById(gradeId).exec();
        if (!grade) {
            throw new NotFoundException(`Grade ${gradeId} introuvable`);
        }

        // Update order for each choice
        for (const { choiceId, order } of reorderDto.choices) {
            const gradeDoc = grade as any;
            const choicesArr = gradeDoc.consultationChoices as any[];
            const choice = choicesArr.find(
                (c: any) => c.choiceId === choiceId,
            );
            if (choice) {
                choice.order = order;
            }
        }

        // Sort by order
        (grade as any).consultationChoices.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        await grade.save();
        return grade;
    }

    /**
     * Initialize all 9 grades with default requirements
     * Called during application bootstrap or manually for data seeding
     */
    async initializeGrades() {
        // Vérifier si la collection gradeconfigs contient déjà des documents
        const existingCount = await this.gradeConfigModel.countDocuments();
        if (existingCount > 0) {
            // Il y a déjà des grades, ne rien faire
            return await this.gradeConfigModel.find().sort({ level: 1 }).exec();
        }

        const GRADE_CONFIGS = [
            {
                grade: 'NEOPHYTE',
                level: 0,
                name: 'Néophyte',
                consultations: 1,
                rituels: 1,
                livres: 1,
            },
            {
                grade: 'ASPIRANT',
                level: 1,
                name: 'Aspirant',
                consultations: 3,
                rituels: 1,
                livres: 1,
            },
            {
                grade: 'CONTEMPLATEUR',
                level: 2,
                name: 'Contemplateur',
                consultations: 6,
                rituels: 2,
                livres: 1,
            },
            {
                grade: 'CONSCIENT',
                level: 3,
                name: 'Conscient',
                consultations: 9,
                rituels: 3,
                livres: 2,
            },
            {
                grade: 'INTEGRATEUR',
                level: 4,
                name: 'Intégrateur',
                consultations: 13,
                rituels: 4,
                livres: 2,
            },
            {
                grade: 'TRANSMUTANT',
                level: 5,
                name: 'Transmutant',
                consultations: 18,
                rituels: 6,
                livres: 3,
            },
            {
                grade: 'ALIGNE',
                level: 6,
                name: 'Aligné',
                consultations: 23,
                rituels: 8,
                livres: 4,
            },
            {
                grade: 'EVEILLE',
                level: 7,
                name: 'Éveillé',
                consultations: 28,
                rituels: 10,
                livres: 5,
            },
            {
                grade: 'SAGE',
                level: 8,
                name: 'Sage',
                consultations: 34,
                rituels: 10,
                livres: 6,
            },
            {
                grade: 'MAITRE_DE_SOI',
                level: 9,
                name: 'Maître de Soi',
                consultations: 40,
                rituels: 10,
                livres: 8,
            },
        ];

        // Créer les grades car la collection n'existe pas
        for (const config of GRADE_CONFIGS) {
            await this.gradeConfigModel.create({
                grade: config.grade,
                level: config.level,
                name: config.name,
                requirements: {
                    consultations: config.consultations,
                    rituels: config.rituels,
                    livres: config.livres,
                },
                consultationChoices: [],
                description: '',
            });
        }
        return await this.gradeConfigModel.find().sort({ level: 1 }).exec();
    }

    /**
     * Update rubrique requirements for a specific grade.
     * Defines how many consultations per rubrique are needed to progress from this grade.
     * 
     * IMPORTANT: Le nombre de consultations requis par rubrique pour évoluer
     * n'est PAS équivalent au nombre de consultations accessibles dans le grade.
     */
    // ...existing code...



    /**
     * Validate that the user has admin access
     */
    private validateAdminAccess(user: User): void {
        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            throw new UnauthorizedException(
                'Accès réservé aux administrateurs',
            );
        }
    }
}
