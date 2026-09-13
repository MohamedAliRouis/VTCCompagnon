import { useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';
import { useSessionStore, useSettingsStore } from '../store';
import {
  RAPPEL_PAUSE_HEURES_DEFAUT,
  RAPPEL_PAUSE_RELANCE_MS,
} from '../constants';
import { calculerRappelPause } from '../utils/rappelPause';

const { RappelPause } = NativeModules;

/**
 * À monter une seule fois (dans `App`). Programme côté natif la notification
 * « prenez une pause » au bout du seuil de service continu, et l'annule dès
 * qu'on se met en pause ou qu'on termine le service.
 *
 * Le déclenchement est confié à AlarmManager plutôt qu'à un minuteur JS : le JS
 * est suspendu dès que l'app passe en arrière-plan, ce qui est justement le cas
 * pendant que le chauffeur navigue.
 */
export const useRappelPause = (): void => {
  const etat = useSessionStore(s => s.session.etat);
  const derniereReprise = useSessionStore(
    s => s.session.tempsDerniereReprise ?? s.session.tempsDebutService,
  );
  const actif = useSettingsStore(s => s.settings.rappelPauseActif ?? false);
  const heures = useSettingsStore(
    s => s.settings.rappelPauseHeures ?? RAPPEL_PAUSE_HEURES_DEFAUT,
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !RappelPause) {
      return;
    }

    const declenchement = calculerRappelPause({
      actif,
      etat,
      derniereReprise,
      seuilMs: heures * 3_600_000,
      maintenant: Date.now(),
    });

    const appel =
      declenchement === null
        ? RappelPause.annuler()
        : RappelPause.planifier(
            declenchement,
            RAPPEL_PAUSE_RELANCE_MS,
            derniereReprise,
          );

    appel.catch((e: unknown) => console.error('Erreur rappel de pause:', e));
  }, [actif, etat, derniereReprise, heures]);
};
