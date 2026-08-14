/**
 * Mapeo de categorías de cápsulas a íconos de lucide-react.
 *
 * Cada categoría del catálogo se muestra en las cards con un ícono
 * distintivo en la esquina superior. Este mapeo es la fuente de verdad.
 *
 * Si una categoría nueva no tiene mapeo, se usa el fallback (BookOpen).
 *
 * Las categorías son texto libre (Innova las escribe desde el ABM), así
 * que hacemos el match case-insensitive.
 */

import {
  Users,
  Heart,
  Sparkles,
  Shield,
  Brain,
  Home,
  BookOpen,
  Scale,
  UserCheck,
  HandHeart,
} from 'lucide-react';

// Claves en lowercase para hacer match case-insensitive
const ICON_MAP = {
  'intervención social': Users,
  'intervencion social': Users,
  'derechos humanos': Scale,
  'salud mental': Brain,
  'actualización': Sparkles,
  'actualizacion': Sparkles,
  'familia e infancias': Home,
  'familia': Home,
  'infancias': Home,
  'género': Heart,
  'genero': Heart,
  'violencia': Shield,
  'niñez y adolescencia': Home,
  'ninez y adolescencia': Home,
  'discapacidad': UserCheck,
  'trabajo comunitario': HandHeart,
  'general': BookOpen,
};

const DEFAULT_ICON = BookOpen;

/**
 * Devuelve el componente ícono para una categoría dada.
 * Si no hay match, devuelve el ícono por default (BookOpen).
 */
export const getCategoryIcon = (category) => {
  if (!category || typeof category !== 'string') return DEFAULT_ICON;
  const normalized = category.trim().toLowerCase();
  return ICON_MAP[normalized] || DEFAULT_ICON;
};