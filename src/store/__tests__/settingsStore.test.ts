import { useSettingsStore } from '../settingsStore';
import { TARIFS_DEFAUT } from '../../constants';

jest.mock('../../utils/storage', () => ({
  chargerSettings: jest.fn(),
  sauvegarderSettings: jest.fn().mockResolvedValue(undefined),
}));

const storage = require('../../utils/storage');
const settings = () => useSettingsStore.getState().settings;

beforeEach(() => {
  storage.sauvegarderSettings.mockClear();
  useSettingsStore.setState({ settings: { tarifs: TARIFS_DEFAUT } });
});

describe('settingsStore', () => {
  it('setTarifs remplace les tarifs et persiste', async () => {
    await useSettingsStore
      .getState()
      .setTarifs({ priseEnCharge: 3, parMinute: 0.4 });
    expect(settings().tarifs).toEqual({ priseEnCharge: 3, parMinute: 0.4 });
    expect(storage.sauvegarderSettings).toHaveBeenCalledWith(settings());
  });

  it('setObjectifJournalier : valeur > 0 pose la clé, sinon la retire', async () => {
    await useSettingsStore.getState().setObjectifJournalier(150);
    expect(settings().objectifJournalier).toBe(150);

    await useSettingsStore.getState().setObjectifJournalier(null);
    expect('objectifJournalier' in settings()).toBe(false);

    await useSettingsStore.getState().setObjectifJournalier(0);
    expect('objectifJournalier' in settings()).toBe(false);
  });

  it('setRetentionJours et setDebutSemaine', async () => {
    await useSettingsStore.getState().setRetentionJours(30);
    expect(settings().retentionJours).toBe(30);

    await useSettingsStore.getState().setDebutSemaine('dimanche');
    expect(settings().debutSemaine).toBe('dimanche');
    // ne touche pas au reste
    expect(settings().retentionJours).toBe(30);
  });
});
