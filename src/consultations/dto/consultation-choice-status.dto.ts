/**
 * DTO pour retourner le statut d'un choix de consultation
 */
export interface ConsultationChoiceStatusDto {
  choiceId: string;
  choiceTitle: string;
  buttonStatus: 'CONSULTER' | 'RÉPONSE EN ATTENTE' | 'VOIR L\'ANALYSE';
  hasActiveConsultation: boolean; // Indique si une consultation active existe
  consultationId: string | null; // ID de la consultation si elle existe, null sinon
}

/**
 * DTO pour la réponse avec tous les statuts des choix de consultation
 */
export interface UserConsultationChoicesStatusDto {
  userId: string;
  choices: ConsultationChoiceStatusDto[];
}
