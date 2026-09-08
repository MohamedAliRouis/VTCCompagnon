/**
 * Machine à états de la course : REPOS -> PICKUP -> EN_COURSE -> REPOS.
 */
import { useCourseStore } from '../courseStore';

jest.mock('../../utils/storage', () => ({
  chargerCourseEnCours: jest.fn(),
  sauvegarderCourseEnCours: jest.fn(),
}));

const mockSupprimerCourse = jest.fn();
jest.mock('../historyStore', () => ({
  useHistoryStore: {
    getState: () => ({ supprimerCourse: mockSupprimerCourse }),
  },
}));

const mockRetirerCourse = jest.fn();
jest.mock('../statsStore', () => ({
  useStatsStore: { getState: () => ({ retirerCourse: mockRetirerCourse }) },
}));

const storage = require('../../utils/storage');

const store = () => useCourseStore.getState();
const course = () => useCourseStore.getState().course;

const T0 = 1_700_000_000_000;
let clock = T0;
let nowSpy: jest.SpyInstance;
const setNow = (ms: number) => {
  clock = ms;
};

beforeEach(() => {
  jest.useFakeTimers();
  clock = T0;
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
  store().annulerCourse(); // reset -> REPOS
  store().oublierAnnulation();
  (storage.chargerCourseEnCours as jest.Mock).mockReset();
  (storage.sauvegarderCourseEnCours as jest.Mock).mockReset();
  mockSupprimerCourse.mockReset().mockResolvedValue(undefined);
  mockRetirerCourse.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  nowSpy.mockRestore();
  jest.useRealTimers();
});

describe('transitions', () => {
  it('part de REPOS', () => {
    expect(course().etat).toBe('REPOS');
  });

  it('demarrerCourse -> PICKUP avec id et tempsDebut', () => {
    store().demarrerCourse();
    expect(course().etat).toBe('PICKUP');
    expect(course().tempsDebut).toBe(T0);
    expect(course().id).toBeTruthy();
    expect(storage.sauvegarderCourseEnCours).toHaveBeenCalled();
  });

  it('clientMonte : PICKUP -> EN_COURSE, ignoré depuis un autre état', () => {
    store().clientMonte();
    expect(course().etat).toBe('REPOS');

    store().demarrerCourse();
    store().clientMonte();
    expect(course().etat).toBe('EN_COURSE');
  });

  it('arriveeDestination et annulerCourse ramènent au REPOS', () => {
    store().demarrerCourse();
    store().clientMonte();
    store().arriveeDestination();
    expect(course().etat).toBe('REPOS');
    expect(course().tempsDebut).toBeNull();

    store().demarrerCourse();
    store().annulerCourse();
    expect(course().etat).toBe('REPOS');
  });
});

describe('majTemps', () => {
  it('calcule le revenu estimé : priseEnCharge + parMinute x minutes', () => {
    store().demarrerCourse();
    store().majTemps(120); // 2 min
    expect(course().tempsEcoule).toBe(120);
    expect(course().revenuEstime).toBeCloseTo(2.5 + 0.35 * 2, 5);
  });

  it('est ignoré au REPOS (pas de tick fantôme après arrivée)', () => {
    store().majTemps(999);
    expect(course().tempsEcoule).toBe(0);
    expect(course().revenuEstime).toBe(0);
  });
});

describe('rechargement depuis le stockage', () => {
  it('recalcule le temps écoulé et le revenu depuis tempsDebut', async () => {
    (storage.chargerCourseEnCours as jest.Mock).mockResolvedValue({
      id: 'x',
      etat: 'EN_COURSE',
      tempsDebut: T0,
      tempsEcoule: 0,
      revenuEstime: 0,
      dateCreation: '2026-09-08',
    });

    clock = T0 + 300_000; // +5 min
    await store().chargerDepuisStockage();

    expect(course().etat).toBe('EN_COURSE');
    expect(course().tempsEcoule).toBe(300);
    expect(course().revenuEstime).toBeCloseTo(2.5 + 0.35 * 5, 5);
  });

  it('ignore une course stockée au REPOS', async () => {
    (storage.chargerCourseEnCours as jest.Mock).mockResolvedValue({
      id: '',
      etat: 'REPOS',
      tempsDebut: null,
      tempsEcoule: 0,
      revenuEstime: 0,
      dateCreation: '2026-09-08',
    });

    store().demarrerCourse();
    await store().chargerDepuisStockage();
    expect(course().etat).toBe('PICKUP'); // état courant préservé
  });
});

describe("fenêtre d'annulation après ARRIVÉE", () => {
  const annulation = {
    idHistorique: 'h1',
    tempsDebut: T0 - 600_000, // course démarrée 10 min plus tôt
    duree: 600,
    revenu: 12,
    date: '2026-09-09',
  };

  it('preparerAnnulation ouvre une fenêtre datée', () => {
    store().preparerAnnulation(annulation);

    const a = store().annulationEnAttente;
    expect(a).toMatchObject(annulation);
    expect(a!.expireA).toBe(T0 + 10_000);
  });

  it('annulerFinDeCourse défait le journal, les stats, et remet la course', async () => {
    store().preparerAnnulation(annulation);
    setNow(T0 + 3_000); // 3 s plus tard, dans la fenêtre

    await store().annulerFinDeCourse();

    expect(mockSupprimerCourse).toHaveBeenCalledWith('h1');
    expect(mockRetirerCourse).toHaveBeenCalledWith({
      tempsEcoule: 600,
      revenu: 12,
      date: '2026-09-09',
    });
    // la course repart de son timestamp d'origine, pas d'un nouveau
    expect(course().etat).toBe('EN_COURSE');
    expect(course().tempsDebut).toBe(annulation.tempsDebut);
    expect(course().tempsEcoule).toBe(603);
    expect(store().annulationEnAttente).toBeNull();
  });

  it('ne fait rien une fois la fenêtre expirée', async () => {
    store().preparerAnnulation(annulation);
    setNow(T0 + 15_000); // au-delà des 10 s

    await store().annulerFinDeCourse();

    expect(mockSupprimerCourse).not.toHaveBeenCalled();
    expect(mockRetirerCourse).not.toHaveBeenCalled();
    expect(course().etat).toBe('REPOS');
  });

  it('la fenêtre se referme toute seule au bout du délai', () => {
    store().preparerAnnulation(annulation);
    expect(store().annulationEnAttente).not.toBeNull();

    jest.advanceTimersByTime(10_000);

    expect(store().annulationEnAttente).toBeNull();
  });

  it('démarrer une nouvelle course referme la fenêtre', () => {
    store().preparerAnnulation(annulation);
    store().demarrerCourse();

    expect(store().annulationEnAttente).toBeNull();
    expect(course().etat).toBe('PICKUP');
  });
});
