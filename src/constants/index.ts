import { Tarifs } from '../types';

export { COULEURS } from './theme';

// Clés AsyncStorage
export const CLES_STOCKAGE = {
  STATS_JOUR: '@vtc_stats_jour',
  COURSE_EN_COURS: '@vtc_course_en_cours',
  DATE_DERNIER_RESET: '@vtc_date_reset',
  HISTORIQUE: '@vtc_historique', // legacy : agrégats journaliers (fallback)
  COURSES_HISTORIQUE: '@vtc_courses',
  SESSIONS_HISTORIQUE: '@vtc_sessions',
  LOG_DEPUIS: '@vtc_log_depuis', // date de bascule vers le journal détaillé
  SETTINGS: '@vtc_settings',
  SESSION_TRAVAIL: '@vtc_session_travail',
} as const;

// Rétention par défaut du journal (courses + sessions), en jours.
export const RETENTION_JOURS = 90;
export const RETENTIONS_POSSIBLES = [30, 90, 365] as const;

// Tarifs par défaut (modifiables dans Settings)
export const TARIFS_DEFAUT: Tarifs = {
  priseEnCharge: 2.50,
  parMinute: 0.35,
};

// Couleurs par état de course
export const COULEURS_ETAT: Record<string, string> = {
  REPOS: '#4a4a6a',
  PICKUP: '#f39c12',
  EN_COURSE: '#27ae60',
};

// Textes par état
export const TEXTES_ETAT: Record<string, string> = {
  REPOS: 'EN REPOS',
  PICKUP: 'VERS CLIENT',
  EN_COURSE: 'EN COURSE',
};
