export interface Offrande {
  id: string;
  nom: string;
  prix: number;
  description?: string;
}

export interface ConsultationOffrande {
  consultationNom: string;
  offrandes: string[]; // IDs des offrandes
}

export interface PanierUtilisateur {
  userId: string;
  achats: Array<{
    offrandeId: string;
    quantite: number;
    date: string;
    prixTotal: number;
  }>;
  totalDepense: number;
}
