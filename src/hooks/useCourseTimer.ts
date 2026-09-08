import { useEffect } from 'react';
import { useCourseStore, useSettingsStore } from '../store';

export const useCourseTimer = () => {
  // Sélecteurs fins : ce hook est monté dans App, il ne doit pas provoquer
  // de re-render de tout le navigateur à chaque tick. On ne lit donc pas
  // l'objet course complet (tempsEcoule / revenuEstime changent chaque seconde).
  const majTemps = useCourseStore(state => state.majTemps);
  const setTarifs = useCourseStore(state => state.setTarifs);
  const etat = useCourseStore(state => state.course.etat);
  const tempsDebut = useCourseStore(state => state.course.tempsDebut);
  const tarifs = useSettingsStore(state => state.settings.tarifs);

  useEffect(() => {
    setTarifs(tarifs);
  }, [setTarifs, tarifs]);

  useEffect(() => {
    if (etat === 'REPOS' || !tempsDebut) {
      return;
    }

    const updateTimer = () => {
      const tempsEcoule = Math.floor((Date.now() - tempsDebut) / 1000);
      majTemps(tempsEcoule);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [etat, tempsDebut, majTemps]);
};
