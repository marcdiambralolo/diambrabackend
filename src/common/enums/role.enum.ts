/**
 * Rôles disponibles dans le système Diambra
 * Hiérarchie: SUPER_ADMIN > ADMIN > CONSULTANT > USER > GUEST
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN', // Accès total au système
  ADMIN = 'ADMIN', // Gestion des utilisateurs et consultations
  USER = 'USER', // Client standard
  GUEST = 'GUEST', // Visiteur non authentifié
}

export const isRoleHigherOrEqual = (userRole: Role, requiredRole: Role): boolean => {
  const hierarchy = {
    [Role.SUPER_ADMIN]: 5,
    [Role.ADMIN]: 4,
    [Role.USER]: 2,
    [Role.GUEST]: 1,
  };

  return hierarchy[userRole] >= hierarchy[requiredRole];
};
