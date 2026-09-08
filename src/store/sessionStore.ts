import { create } from 'zustand';
import { SessionTravail } from '../types';
import {
  chargerSessionTravail,
  sauvegarderSessionTravail,
} from '../utils/storage';
import { getDateJour } from '../utils/formatters';

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

  const pauseEnCours = session.tempsDebutPause
    ? Math.max(0, Math.floor((maintenant - session.tempsDebutPause) / 1000))
    : 0;
  const tempsTotal = Math.max(
    0,
    Math.floor((maintenant - session.tempsDebutService) / 1000),
  );

  return {
    ...session,
    tempsServiceEcoule: Math.max(
      0,
      tempsTotal - session.tempsPauseCumule - pauseEnCours,
    ),
    tempsPauseEcoule: pauseEnCours,
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
    const session = creerSessionInitiale();
    set({ session });
    sauvegarderSessionTravail(session);
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
