export type RubriqueCategory = 'GENERAL';

export interface ConsultationOffering {
  category: 'animal' | 'vegetal' | 'beverage';
  offeringId: string;
  quantity: number;
}

export interface ConsultationChoice {
  id: string;
  title: string;
  description: string;
  frequence?: 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE';
  participants?: 'SOLO' | 'AVEC_TIERS' | 'GROUPE' | 'POUR_TIERS';
  offering: {
    alternatives: ConsultationOffering[];
  };
}
