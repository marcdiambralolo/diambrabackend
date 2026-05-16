/**
 * Statuts d'une consultation spirituelle
 */
export enum ConsultationStatus {
  PENDING = 'PENDING', // En attente d'attribution
  COMPLETED = 'COMPLETED', // Terminée
  CANCELLED = 'CANCELLED', // Annulée
  REFUNDED = 'REFUNDED', // Remboursée
}
