import { Tarifs } from '../types';

// Clés AsyncStorage
export const CLES_STOCKAGE = {
  STATS_JOUR: '@vtc_stats_jour',
  COURSE_EN_COURS: '@vtc_course_en_cours',
  DATE_DERNIER_RESET: '@vtc_date_reset',
  HISTORIQUE: '@vtc_historique',
  SETTINGS: '@vtc_settings',
} as const;

// Tarifs par défaut (modifiables dans Settings)
export const TARIFS_DEFAUT: Tarifs = {
  priseEnCharge: 2.50,
  parMinute: 0.35,
  parKm: 1.20,
};

// Couleurs par état de course
export const COULEURS_ETAT: Record<string, string> = {
  REPOS: '#4a4a6a',
  PICKUP: '#f39c12',
  EN_COURSE: '#27ae60',
  RETOUR: '#3498db',
};

// Textes par état
export const TEXTES_ETAT: Record<string, string> = {
  REPOS: 'EN REPOS',
  PICKUP: 'VERS CLIENT',
  EN_COURSE: 'EN COURSE',
  RETOUR: 'RETOUR',
};

// Textes boutons
export const TEXTES_BOUTON_PRINCIPAL: Record<string, string> = {
  REPOS: '▶ DÉMARRER',
  PICKUP: 'CLIENT MONTÉ',
  EN_COURSE: 'ARRIVÉE',
  RETOUR: 'TERMINER',
};

export const TEXTES_BOUTON_SECONDAIRE: Record<string, string> = {
  PICKUP: 'ANNULER',
  EN_COURSE: 'TERMINER',
  RETOUR: 'NOUVELLE',
};
