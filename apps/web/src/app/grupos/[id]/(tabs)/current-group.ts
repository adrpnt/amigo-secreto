import { cache } from 'react';
import { getGroup } from '@/lib/groups';

// O layout das abas, a aba aberta e o título leem o mesmo grupo com uma ida à
// API por requisição.
export const getCurrentGroup = cache(getGroup);
