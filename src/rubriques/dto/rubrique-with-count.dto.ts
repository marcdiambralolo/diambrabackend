export class ConsultationChoiceWithCountDto {
  _id!: string | null;
  title!: string;
  description!: string;
  frequence!: string;
  participants!: string | null;
  order?: number;
  offering!: any;
  offeringName?: string;
  consultationCount!: number;
  buttonStatus?: string;
  consultationId?: string | null;
  prompt?: string;
  gradeId?: any; // Peut être string ou objet peuplé
}

export class RubriqueWithChoiceCountDto {
  _id!: string;
  titre!: string;
  description!: string;
  categorie!: string;
  typeconsultation!: string;
  consultationChoices!: ConsultationChoiceWithCountDto[];
}
