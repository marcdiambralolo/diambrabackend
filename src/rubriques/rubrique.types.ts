export interface ConsultationOffering {
  offeringId: string;
  quantity: number;
}

export interface ConsultationChoice {
  id: string;
  title: string;
  description: string;
  offering: {
    alternatives: ConsultationOffering[];
  };
}