export interface Consultation {
  nom: string;
  type: 'unique' | 'relation' | 'individuel_ou_autre' | 'groupe' | 'annuel' | 'mensuel' | 'journalier';
  description: string;
}

export interface Rubrique {
  consultations?: Consultation[];
  info?: string;
}

export interface ServicesStructure {
  ASTROLOGIE: {
    MA_VIE_PERSONNELLE: Rubrique;
    FAMILLE_AMITIE_ET_COUPLE: Rubrique;
    MONDE_PROFESSIONNEL: Rubrique;
  };
  NUMEROLOGIE: {
    ANNEE_UNIVERSELLE: Rubrique;
    VOS_NOMBRES_PERSONNELS: Rubrique;
    VOS_CYCLES_PERSONNELS: Rubrique;
  };
}
