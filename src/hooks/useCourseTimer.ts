import { useEffect } from 'react';
import { useCourseStore, useSettingsStore } from '../store';

export const useCourseTimer = () => {
  const { course, majTemps, setTarifs } = useCourseStore();
  const tarifs = useSettingsStore(state => state.settings.tarifs);

  useEffect(() => {
    setTarifs(tarifs);
  }, [setTarifs, tarifs]);

  useEffect(() => {
    if (course.etat === 'REPOS' || !course.tempsDebut) {
      return;
    }

    const updateTimer = () => {
      const tempsEcoule = Math.floor((Date.now() - course.tempsDebut!) / 1000);
      majTemps(tempsEcoule);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [course.etat, course.tempsDebut, majTemps]);
};
