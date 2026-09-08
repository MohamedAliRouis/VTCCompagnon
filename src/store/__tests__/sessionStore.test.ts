/**
 * Machine à états de la session de travail : HORS_SERVICE -> EN_SERVICE <-> EN_PAUSE.
 * On pilote Date.now() pour vérifier que le temps de service se fige pendant une
 * pause pendant que le temps de pause augmente, puis reprend correctement.
 */
import { useSessionStore } from '../sessionStore';

jest.mock('../../utils/storage', () => ({
  chargerSessionTravail: jest.fn(),
  sauvegarderSessionTravail: jest.fn(),
}));

const storage = require('../../utils/storage');

const store = () => useSessionStore.getState();
const session = () => useSessionStore.getState().session;

// Base volontairement non multiple de 1000 pour exposer d'éventuels arrondis désalignés.
const T0 = 1_700_000_000_123;
let clock = T0;
const setNow = (ms: number) => {
  clock = ms;
};

let nowSpy: jest.SpyInstance;

beforeEach(() => {
  clock = T0;
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
  store().terminerService(); // remet la session à HORS_SERVICE
  (storage.chargerSessionTravail as jest.Mock).mockReset();
  (storage.sauvegarderSessionTravail as jest.Mock).mockReset();
});

afterEach(() => {
  nowSpy.mockRestore();
});

describe('démarrage du service', () => {
  it('part de HORS_SERVICE', () => {
    expect(session().etat).toBe('HORS_SERVICE');
    expect(session().tempsServiceEcoule).toBe(0);
  });

  it('commencerService ancre le début et remet les pauses à zéro', () => {
    setNow(T0 + 5_000);
    store().commencerService();

    expect(session().etat).toBe('EN_SERVICE');
    expect(session().tempsDebutService).toBe(T0 + 5_000);
    expect(session().tempsDebutPause).toBeNull();
    expect(session().tempsPauseCumule).toBe(0);
    expect(storage.sauvegarderSessionTravail).toHaveBeenCalled();
  });

  it('le temps de service suit le temps réel', () => {
    store().commencerService();

    setNow(T0 + 90_000);
    store().majTemps(Date.now());
    expect(session().tempsServiceEcoule).toBe(90);
    expect(session().tempsPauseEcoule).toBe(0);
  });
});

describe('pause', () => {
  it('fige le temps de service et fait monter le temps de pause', () => {
    store().commencerService();

    setNow(T0 + 120_000);
    store().majTemps(Date.now());
    expect(session().tempsServiceEcoule).toBe(120);

    store().mettreEnPause();
    expect(session().etat).toBe('EN_PAUSE');
    expect(session().tempsDebutPause).toBe(T0 + 120_000);

    setNow(T0 + 150_000); // +30 s de pause
    store().majTemps(Date.now());
    expect(session().tempsServiceEcoule).toBe(120); // gelé
    expect(session().tempsPauseEcoule).toBe(30);

    setNow(T0 + 180_000); // +60 s de pause
    store().majTemps(Date.now());
    expect(session().tempsServiceEcoule).toBe(120); // toujours gelé
    expect(session().tempsPauseEcoule).toBe(60);
  });

  it('aucune gigue : le temps de service est strictement constant à chaque tick de pause', () => {
    store().commencerService();
    setNow(T0 + 4_500);
    store().majTemps(Date.now());
    store().mettreEnPause();

    const fige = session().tempsServiceEcoule;
    for (let i = 0; i < 40; i++) {
      setNow(T0 + 4_500 + i * 250); // ticks non alignés sur la seconde
      store().majTemps(Date.now());
      expect(session().tempsServiceEcoule).toBe(fige);
    }
  });

  it('mettreEnPause est ignoré hors service', () => {
    store().mettreEnPause();
    expect(session().etat).toBe('HORS_SERVICE');
  });
});

describe('reprise', () => {
  it('cumule la durée de pause et repart du bon temps de service', () => {
    store().commencerService();

    setNow(T0 + 60_000);
    store().majTemps(Date.now());
    store().mettreEnPause();

    setNow(T0 + 60_000 + 45_000); // 45 s de pause
    store().majTemps(Date.now());
    store().reprendreService();

    expect(session().etat).toBe('EN_SERVICE');
    expect(session().tempsDebutPause).toBeNull();
    expect(session().tempsPauseEcoule).toBe(0);
    expect(session().tempsPauseCumule).toBe(45);

    setNow(T0 + 60_000 + 45_000 + 15_000);
    store().majTemps(Date.now());
    expect(session().tempsServiceEcoule).toBe(75); // 60 avant pause + 15 après
    expect(session().tempsPauseCumule).toBe(45);
  });

  it('deux pauses successives : les durées s’additionnent', () => {
    store().commencerService();

    setNow(T0 + 10_000);
    store().mettreEnPause();
    setNow(T0 + 30_000); // pause 1 = 20 s
    store().reprendreService();
    expect(session().tempsPauseCumule).toBe(20);

    setNow(T0 + 40_000);
    store().mettreEnPause();
    setNow(T0 + 70_000); // pause 2 = 30 s
    store().reprendreService();
    expect(session().tempsPauseCumule).toBe(50);

    setNow(T0 + 75_000);
    store().majTemps(Date.now());
    expect(session().tempsServiceEcoule).toBe(25); // 75 s écoulées - 50 s de pause
  });

  it('reprendreService est ignoré si on n’est pas en pause', () => {
    store().commencerService();
    store().reprendreService();
    expect(session().etat).toBe('EN_SERVICE');
    expect(session().tempsPauseCumule).toBe(0);
  });
});

describe('fin de service', () => {
  it('terminerService remet toute la session à zéro', () => {
    store().commencerService();
    setNow(T0 + 5_000);
    store().majTemps(Date.now());

    store().terminerService();

    expect(session().etat).toBe('HORS_SERVICE');
    expect(session().tempsServiceEcoule).toBe(0);
    expect(session().tempsPauseEcoule).toBe(0);
    expect(session().tempsPauseCumule).toBe(0);
    expect(session().tempsDebutService).toBeNull();
  });
});

describe('rechargement depuis le stockage', () => {
  it('recalcule le temps figé après un redémarrage pendant une pause', async () => {
    (storage.chargerSessionTravail as jest.Mock).mockResolvedValue({
      etat: 'EN_PAUSE',
      tempsDebutService: T0,
      tempsDebutPause: T0 + 100_000, // pause démarrée à +100 s
      tempsServiceEcoule: 0,
      tempsPauseEcoule: 0,
      tempsPauseCumule: 0,
      date: '2026-09-08',
    });

    setNow(T0 + 160_000); // app rouverte 60 s après le début de la pause
    await store().chargerDepuisStockage();

    expect(session().etat).toBe('EN_PAUSE');
    expect(session().tempsServiceEcoule).toBe(100); // 160 s - 60 s de pause
    expect(session().tempsPauseEcoule).toBe(60);
  });

  it('ignore une session HORS_SERVICE stockée', async () => {
    (storage.chargerSessionTravail as jest.Mock).mockResolvedValue({
      etat: 'HORS_SERVICE',
      tempsDebutService: null,
      tempsDebutPause: null,
      tempsServiceEcoule: 0,
      tempsPauseEcoule: 0,
      tempsPauseCumule: 0,
      date: '2026-09-08',
    });

    store().commencerService(); // état courant qui ne doit pas être écrasé
    await store().chargerDepuisStockage();

    expect(session().etat).toBe('EN_SERVICE');
  });
});
