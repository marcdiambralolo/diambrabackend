import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/**
 * Clé de metadata pour les rôles requis
 */
export const ROLES_KEY = 'roles';

/**
 * Décorateur pour spécifier les rôles autorisés sur une route
 * @example
 * @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 * @Get('admin-only')
 * adminOnlyRoute() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
