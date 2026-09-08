/**
 * Journal des courses / sessions : ajout, persistance, rétention, effacement.
 */
import { useHistoryStore } from '../historyStore';
import { useSettingsStore } from '../settingsStore';
import { TARIFS_DEFAUT } from '../../constants';

jest.mock('../../utils/storage', () => ({
  chargerCoursesHistorique: jest.fn(),
  sauvegarderCoursesHistorique: jest.fn(),
  chargerSessionsHistorique: jest.fn(),
  sauvegarderSessionsHistorique: jest.fn(),
  chargerHistorique: jest.fn(),
  chargerLogDepuis: jest.fn(),
  sauvegarderLogDepuis: jest.fn(),
  supprimer: jest.fn(),
  chargerSettings: jest.fn(),
  sauvegarderSettings: jest.fn(),
}));

const storage = require('../../utils/storage');
const store = () => useHistoryStore.getState();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 8, 12, 0, 0)); // 2026-09-08

  storage.chargerCoursesHistorique.mockReset().mockResolvedValue([]);
  storage.sauvegarderCoursesHistorique.mockReset().mockResolvedValue(undefined);
  storage.chargerSessionsHistorique.mockReset().mockResolvedValue([]);
  storage.sauvegarderSessionsHistorique.mockReset().mockResolvedValue(undefined);
  storage.chargerHistorique.mockReset().mockResolvedValue([]);
  storage.chargerLogDepuis.mockReset().mockResolvedValue('2026-09-08');
  storage.sauvegarderLogDepuis.mockReset().mockResolvedValue(undefined);
  storage.supprimer.mockReset().mockResolvedValue(undefined);

  useHistoryStore.setState({
    courses: [],
    sessions: [],
    agregatsLegacy: [],
    logDepuis: '2026-09-08',
    chargement: false,
  });
  useSettingsStore.setState({ settings: { tarifs: TARIFS_DEFAUT } });
});

afterEach(() => jest.useRealTimers());

describe('chargerHistorique', () => {
  it('charge courses, sessions et le legacy', async () => {
    storage.chargerCoursesHistorique.mockResolvedValue([{ id: 'c1' }]);
    storage.chargerSessionsHistorique.mockResolvedValue([{ id: 's1' }]);
    storage.chargerHistorique.mockResolvedValue([{ date: '2026-09-01' }]);

    await store().chargerHistorique();

    expect(store().courses).toHaveLength(1);
    expect(store().sessions).toHaveLength(1);
    expect(store().agregatsLegacy).toHaveLength(1);
  });

  it('fixe logDepuis au jour courant au premier lancement', async () => {
    storage.chargerLogDepuis.mockResolvedValue(null);

    await store().chargerHistorique();

    expect(store().logDepuis).toBe('2026-09-08');
    expect(storage.sauvegarderLogDepuis).toHaveBeenCalledWith('2026-09-08');
  });

  it('conserve un logDepuis déjà stocké', async () => {
    storage.chargerLogDepuis.mockResolvedValue('2026-06-01');

    await store().chargerHistorique();

    expect(store().logDepuis).toBe('2026-06-01');
    expect(storage.sauvegarderLogDepuis).not.toHaveBeenCalled();
  });
});

describe('enregistrerCourse', () => {
  it('ajoute une ligne datée du jour et persiste', async () => {
    await store().enregistrerCourse({ debut: 1000, duree: 600, revenu: 12 });

    const c = store().courses;
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ date: '2026-09-08', duree: 600, revenu: 12 });
    expect(c[0].id).toBeTruthy();
    expect(storage.sauvegarderCoursesHistorique).toHaveBeenCalledWith(c);
  });

  it('purge selon la rétention configurée', async () => {
    // Jour courant : 2026-09-08. -90 j ≈ 2026-06-10 ; -30 j = 2026-08-09.
    useHistoryStore.setState({
      courses: [
        { id: 'vieux', date: '2026-05-01', debut: 0, duree: 1, revenu: 1 },
        { id: 'moyen', date: '2026-07-15', debut: 0, duree: 1, revenu: 1 },
        { id: 'recent', date: '2026-09-01', debut: 0, duree: 1, revenu: 1 },
      ],
    });

    // Défaut 90 j : 2026-05-01 sort, le reste tient.
    await store().enregistrerCourse({ debut: 0, duree: 60, revenu: 5 });
    let dates = store().courses.map(c => c.date);
    expect(dates).not.toContain('2026-05-01');
    expect(dates).toContain('2026-07-15');

    // Rétention 30 j : 2026-07-15 sort à son tour.
    useSettingsStore.setState({
      settings: { tarifs: TARIFS_DEFAUT, retentionJours: 30 },
    });
    await store().enregistrerCourse({ debut: 0, duree: 60, revenu: 5 });
    dates = store().courses.map(c => c.date);
    expect(dates).not.toContain('2026-07-15');
    expect(dates).toContain('2026-09-01');
  });
});

describe('effacer', () => {
  it('vide tout le journal et réinitialise logDepuis', async () => {
    useHistoryStore.setState({
      courses: [{ id: 'c', date: '2026-09-08', debut: 0, duree: 1, revenu: 1 }],
      sessions: [
        {
          id: 's',
          date: '2026-09-08',
          debut: 0,
          fin: 1,
          tempsService: 1,
          tempsPause: 0,
        },
      ],
      agregatsLegacy: [
        { date: '2026-09-01', nbCourses: 1, tempsTotal: 1, revenuTotal: 1 },
      ],
      logDepuis: '2026-06-01',
    });

    await store().effacer();

    expect(store().courses).toEqual([]);
    expect(store().sessions).toEqual([]);
    expect(store().agregatsLegacy).toEqual([]);
    expect(store().logDepuis).toBe('2026-09-08');
    expect(storage.sauvegarderCoursesHistorique).toHaveBeenCalledWith([]);
    expect(storage.supprimer).toHaveBeenCalledWith('@vtc_historique');
  });
});

describe('enregistrerSession', () => {
  it('ajoute une session datée du jour et persiste', async () => {
    await store().enregistrerSession({
      debut: 1,
      fin: 2,
      tempsService: 3600,
      tempsPause: 600,
    });

    const s = store().sessions;
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({
      date: '2026-09-08',
      tempsService: 3600,
      tempsPause: 600,
    });
    expect(storage.sauvegarderSessionsHistorique).toHaveBeenCalledWith(s);
  });
});
