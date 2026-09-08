import { useEffect } from 'react';
import { useSessionStore } from '../store';

export const useSessionTimer = () => {
  const etat = useSessionStore(state => state.session.etat);
  const majTemps = useSessionStore(state => state.majTemps);

  useEffect(() => {
    if (etat === 'HORS_SERVICE') {
      return;
    }

    const updateTimer = () => majTemps(Date.now());
    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [etat, majTemps]);
};
