import { useEffect } from 'react';
import {
  useCourseStore,
  useSessionStore,
  useSettingsStore,
  useStatsStore,
} from '../store';

/**
 * Charge l'état persistant au démarrage. Monté dans `App` pour ne pas dépendre
 * de l'ordre de montage des onglets (avant, seul `HomeScreen` déclenchait ces
 * chargements).
 */
export const useBootstrap = (): void => {
  const chargerCourse = useCourseStore(s => s.chargerDepuisStockage);
  const chargerSession = useSessionStore(s => s.chargerDepuisStockage);
  const chargerSettings = useSettingsStore(s => s.chargerSettings);
  const chargerStats = useStatsStore(s => s.chargerStats);

  useEffect(() => {
    Promise.all([
      chargerCourse(),
      chargerSession(),
      chargerSettings(),
      chargerStats(),
    ]).catch(e => console.error('Erreur bootstrap:', e));
  }, [chargerCourse, chargerSession, chargerSettings, chargerStats]);
};
