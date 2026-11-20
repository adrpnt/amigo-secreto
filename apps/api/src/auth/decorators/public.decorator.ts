import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// Libera a rota do SessionGuard: toda rota exige sessão por padrão.
export const Public = () => SetMetadata(IS_PUBLIC, true);
