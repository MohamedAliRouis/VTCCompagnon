import { EtatSession } from '../types';

// Si le seuil est déjà dépassé au moment de planifier (app relancée en plein
// service), on ne notifie pas instantanément : on laisse une petite marge.
export const DELAI_MIN_RAPPEL_MS = 60_000;

/**
 * Instant (epoch ms) auquel déclencher le rappel de pause, ou null s'il ne faut
 * rien planifier (rappel désactivé, hors service, en pause).
 */
export const calculerRappelPause = (p: {
  actif: boolean;
  etat: EtatSession;
  derniereReprise: number | null;
  seuilMs: number;
  maintenant: number;
}): number | null => {
  if (!p.actif || p.etat !== 'EN_SERVICE' || !p.derniereReprise) {
    return null;
  }
  return Math.max(
    p.derniereReprise + p.seuilMs,
    p.maintenant + DELAI_MIN_RAPPEL_MS,
  );
};
