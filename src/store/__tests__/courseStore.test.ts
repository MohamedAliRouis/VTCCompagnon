/**
 * Machine à états de la course : REPOS -> PICKUP -> EN_COURSE -> REPOS.
 */
import { useCourseStore } from '../courseStore';

jest.mock('../../utils/storage', () => ({
  chargerCourseEnCours: jest.fn(),
  sauvegarderCourseEnCours: jest.fn(),
}));

const storage = require('../../utils/storage');

const store = () => useCourseStore.getState();
const course = () => useCourseStore.getState().course;

const T0 = 1_700_000_000_000;
let clock = T0;
let nowSpy: jest.SpyInstance;

beforeEach(() => {
  clock = T0;
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
  store().annulerCourse(); // reset -> REPOS
  (storage.chargerCourseEnCours as jest.Mock).mockReset();
  (storage.sauvegarderCourseEnCours as jest.Mock).mockReset();
});

afterEach(() => {
  nowSpy.mockRestore();
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
