import { create } from 'zustand';
import { SessionTravail } from '../types';
import {
  chargerSessionTravail,
  sauvegarderSessionTravail,
} from '../utils/storage';
import { getDateJour } from '../utils/formatters';
import { useHistoryStore } from './historyStore';

interface SessionState {
  session: SessionTravail;
  commencerService: () => void;
  mettreEnPause: () => void;
  reprendreService: () => void;
  terminerService: () => void;
  majTemps: (maintenant: number) => void;
  chargerDepuisStockage: () => Promise<void>;
}

const creerSessionInitiale = (): SessionTravail => ({
  etat: 'HORS_SERVICE',
  tempsDebutService: null,
  tempsDebutPause: null,
  tempsServiceEcoule: 0,
  tempsPauseEcoule: 0,
  tempsPauseCumule: 0,
  date: getDateJour(),
});

const calculerTemps = (
  session: SessionTravail,
  maintenant: number,
): SessionTravail => {
  if (session.etat === 'HORS_SERVICE' || !session.tempsDebutService) {
    return session;
  }

  // Tout est calculé en millisecondes puis arrondi une seule fois : pendant une
  // pause, tempsTotalMs et pauseEnCoursMs augmentent du même delta réel, donc
  // le temps de service reste strictement figé (pas de gigue de ±1 s).
  const pauseEnCoursMs = session.tempsDebutPause
    ? Math.max(0, maintenant - session.tempsDebutPause)
    : 0;
  const tempsTotalMs = Math.max(0, maintenant - session.tempsDebutService);
  const tempsServiceMs = Math.max(
    0,
    tempsTotalMs - session.tempsPauseCumule * 1000 - pauseEnCoursMs,
  );

  return {
    ...session,
    tempsServiceEcoule: Math.floor(tempsServiceMs / 1000),
    tempsPauseEcoule: Math.floor(pauseEnCoursMs / 1000),
  };
};

export const useSessionStore = create<SessionState>((set, get) => ({
  session: creerSessionInitiale(),

  commencerService: () => {
    const maintenant = Date.now();
    const session: SessionTravail = {
      ...creerSessionInitiale(),
      etat: 'EN_SERVICE',
      tempsDebutService: maintenant,
    };
    set({ session });
    sauvegarderSessionTravail(session);
  },

  mettreEnPause: () => {
    const { session } = get();
    if (session.etat !== 'EN_SERVICE') {
      return;
    }

    const maintenant = Date.now();
    const miseAJour = calculerTemps(
      {
        ...session,
        etat: 'EN_PAUSE',
        tempsDebutPause: maintenant,
      },
      maintenant,
    );
    set({ session: miseAJour });
    sauvegarderSessionTravail(miseAJour);
  },

  reprendreService: () => {
    const { session } = get();
    if (session.etat !== 'EN_PAUSE' || !session.tempsDebutPause) {
      return;
    }

    const maintenant = Date.now();
    const dureePause = Math.max(
      0,
      Math.floor((maintenant - session.tempsDebutPause) / 1000),
    );
    const miseAJour = calculerTemps(
      {
        ...session,
        etat: 'EN_SERVICE',
        tempsDebutPause: null,
        tempsPauseEcoule: 0,
        tempsPauseCumule: session.tempsPauseCumule + dureePause,
      },
      maintenant,
    );
    set({ session: miseAJour });
    sauvegarderSessionTravail(miseAJour);
  },

  terminerService: () => {
    const { session } = get();

    // Journaliser le service qui s'achève avant de réinitialiser.
    if (session.etat !== 'HORS_SERVICE' && session.tempsDebutService) {
      const fin = Date.now();
      const finale = calculerTemps(session, fin);
      const tempsPause = finale.tempsPauseCumule + finale.tempsPauseEcoule;
      if (finale.tempsServiceEcoule + tempsPause >= 1) {
        // fire-and-forget : la persistance ne bloque pas la réinitialisation
        useHistoryStore.getState().enregistrerSession({
          debut: session.tempsDebutService,
          fin,
          tempsService: finale.tempsServiceEcoule,
          tempsPause,
        });
      }
    }

    const nouvelle = creerSessionInitiale();
    set({ session: nouvelle });
    sauvegarderSessionTravail(nouvelle);
  },

  majTemps: (maintenant: number) => {
    set(state => ({ session: calculerTemps(state.session, maintenant) }));
  },

  chargerDepuisStockage: async () => {
    const session = await chargerSessionTravail();
    if (!session || session.etat === 'HORS_SERVICE') {
      return;
    }

    set({ session: calculerTemps(session, Date.now()) });
  },
}));
