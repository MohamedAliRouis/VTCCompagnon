import { CourseHistorique, SessionHistorique } from '../../types';
import {
  toYmd,
  ajouterJours,
  debutSemaine,
  debutMois,
  finMois,
  bornesPeriode,
  decalerPeriode,
  libellePeriode,
  agregerParJour,
  agregatPeriode,
  grouperParDate,
} from '../historique';

describe('arithmétique de dates', () => {
  it('toYmd formate en local', () => {
    expect(toYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('ajouterJours passe les bornes de mois et d’année', () => {
    expect(ajouterJours('2026-01-31', 1)).toBe('2026-02-01');
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('debutSemaine renvoie le lundi', () => {
    // 2026-09-08 est un mardi
    expect(debutSemaine('2026-09-08')).toBe('2026-09-07');
    // un lundi reste inchangé
    expect(debutSemaine('2026-09-07')).toBe('2026-09-07');
    // un dimanche renvoie le lundi précédent
    expect(debutSemaine('2026-09-13')).toBe('2026-09-07');
  });

  it('debutMois / finMois', () => {
    expect(debutMois('2026-09-08')).toBe('2026-09-01');
    expect(finMois('2026-09-08')).toBe('2026-09-30');
    expect(finMois('2026-02-15')).toBe('2026-02-28');
  });
});

describe('bornesPeriode', () => {
  it('jour', () => {
    expect(bornesPeriode('jour', '2026-09-08')).toEqual({
      debut: '2026-09-08',
      fin: '2026-09-08',
    });
  });
  it('semaine = lundi -> dimanche', () => {
    expect(bornesPeriode('semaine', '2026-09-08')).toEqual({
      debut: '2026-09-07',
      fin: '2026-09-13',
    });
  });
  it('mois entier', () => {
    expect(bornesPeriode('mois', '2026-09-08')).toEqual({
      debut: '2026-09-01',
      fin: '2026-09-30',
    });
  });
});

describe('decalerPeriode', () => {
  it('recule / avance d’un jour', () => {
    expect(decalerPeriode('jour', '2026-09-08', -1)).toBe('2026-09-07');
    expect(decalerPeriode('jour', '2026-09-08', 1)).toBe('2026-09-09');
  });
  it('recule d’une semaine (aligné lundi)', () => {
    expect(decalerPeriode('semaine', '2026-09-08', -1)).toBe('2026-08-31');
  });
  it('recule / avance d’un mois', () => {
    expect(decalerPeriode('mois', '2026-09-15', -1)).toBe('2026-08-01');
    expect(decalerPeriode('mois', '2026-12-10', 1)).toBe('2027-01-01');
  });
});

describe('libellePeriode', () => {
  const auj = '2026-09-08';
  it('jour : aujourd’hui / hier / date', () => {
    expect(libellePeriode('jour', auj, auj, auj)).toBe("Aujourd'hui");
    expect(libellePeriode('jour', '2026-09-07', '2026-09-07', auj)).toBe('Hier');
    expect(libellePeriode('jour', '2026-09-03', '2026-09-03', auj)).toBe(
      '3 septembre',
    );
  });
  it('semaine dans le même mois', () => {
    expect(libellePeriode('semaine', '2026-09-07', '2026-09-13', auj)).toBe(
      '7–13 septembre',
    );
  });
  it('mois', () => {
    expect(libellePeriode('mois', '2026-09-01', '2026-09-30', auj)).toBe(
      'septembre 2026',
    );
  });
});

describe('agregerParJour', () => {
  const course = (
    date: string,
    duree: number,
    revenu: number,
  ): CourseHistorique => ({ id: date + revenu, date, debut: 0, duree, revenu });
  const session = (
    date: string,
    tempsService: number,
    tempsPause: number,
  ): SessionHistorique => ({
    id: date + tempsService,
    date,
    debut: 0,
    fin: 0,
    tempsService,
    tempsPause,
  });

  it('agrège les courses d’un même jour', () => {
    const map = agregerParJour(
      [course('2026-09-08', 600, 10), course('2026-09-08', 300, 5)],
      [],
    );
    const j = map.get('2026-09-08')!;
    expect(j.nbCourses).toBe(2);
    expect(j.tempsConduite).toBe(900);
    expect(j.revenu).toBe(15);
  });

  it('ajoute le temps de service / pause des sessions', () => {
    const map = agregerParJour(
      [course('2026-09-08', 600, 10)],
      [session('2026-09-08', 3600, 900)],
    );
    const j = map.get('2026-09-08')!;
    expect(j.tempsService).toBe(3600);
    expect(j.tempsPause).toBe(900);
    expect(j.revenu).toBe(10);
  });

  it('legacy = base ; les lignes du journal s’AJOUTENT (jour de bascule)', () => {
    const legacy = [
      { date: '2026-09-01', nbCourses: 9, tempsTotal: 9999, revenuTotal: 99 },
      { date: '2026-09-08', nbCourses: 5, tempsTotal: 5000, revenuTotal: 50 },
    ];
    const map = agregerParJour(
      [course('2026-09-08', 600, 10)],
      [],
      legacy,
      '2026-09-08', // logDepuis = jour de bascule
    );
    // jour antérieur : legacy seul
    expect(map.get('2026-09-01')!.revenu).toBe(99);
    // jour de bascule : legacy (matin) + course du journal (après-midi)
    expect(map.get('2026-09-08')!.nbCourses).toBe(6);
    expect(map.get('2026-09-08')!.revenu).toBe(60);
  });

  it('ignore un legacy postérieur à la bascule', () => {
    const legacy = [
      { date: '2026-09-10', nbCourses: 3, tempsTotal: 30, revenuTotal: 30 },
    ];
    const map = agregerParJour(
      [course('2026-09-10', 600, 12)],
      [],
      legacy,
      '2026-09-08',
    );
    // le journal fait foi : pas de double comptage avec le legacy
    expect(map.get('2026-09-10')!.nbCourses).toBe(1);
    expect(map.get('2026-09-10')!.revenu).toBe(12);
  });
});

describe('agregatPeriode', () => {
  // 09-07 : une course de 30 min, pas de service terminé -> présence = amplitude
  // 09-09 : service terminé de 4 h + 2 courses (1 h 30 de conduite)
  const map = agregerParJour(
    [
      { id: 'a', date: '2026-09-07', debut: 1_000_000, duree: 1800, revenu: 25 },
      { id: 'b', date: '2026-09-09', debut: 2_100_000, duree: 3600, revenu: 30 },
      { id: 'c', date: '2026-09-09', debut: 2_200_000, duree: 1800, revenu: 20 },
    ],
    [
      {
        id: 's',
        date: '2026-09-09',
        debut: 2_000_000,
        fin: 2_000_000 + 14_400_000,
        tempsService: 14400,
        tempsPause: 1800,
      },
    ],
  );

  const agg = agregatPeriode(map, 'semaine', '2026-09-07', '2026-09-13');

  it('remplit tous les jours de la période (zéros compris)', () => {
    expect(agg.jours).toHaveLength(7);
    expect(agg.jours[1].revenu).toBe(0); // 2026-09-08
  });

  it('somme les totaux', () => {
    expect(agg.nbCourses).toBe(3);
    expect(agg.revenu).toBe(75);
    expect(agg.tempsConduite).toBe(7200);
    expect(agg.tempsService).toBe(14400);
  });

  it('temps de présence : service réel + amplitude en fallback', () => {
    // 09-07 : amplitude 1800 s ; 09-09 : service 14400 s
    expect(agg.tempsPresence).toBe(1800 + 14400);
  });

  it('calcule les indicateurs sur le temps de présence', () => {
    expect(agg.revenuParHeure).toBeCloseTo(75 / (16200 / 3600), 5);
    expect(agg.efficacite).toBeCloseTo(7200 / 16200, 5);
    expect(agg.revenuMoyenCourse).toBeCloseTo(75 / 3, 5);
  });

  it('efficacité est bornée à 100 %', () => {
    const m = agregerParJour(
      [{ id: 'x', date: '2026-09-07', debut: 1000, duree: 3600, revenu: 5 }],
      [
        {
          id: 'y',
          date: '2026-09-07',
          debut: 1000,
          fin: 1000 + 1_200_000,
          tempsService: 1200, // service plus court que la conduite (donnée douteuse)
          tempsPause: 0,
        },
      ],
    );
    const a = agregatPeriode(m, 'jour', '2026-09-07', '2026-09-07');
    expect(a.efficacite).toBe(1);
  });

  it('sous le seuil de 5 min : pas de taux horaire', () => {
    const m = agregerParJour(
      [{ id: 'z', date: '2026-09-07', debut: 1000, duree: 60, revenu: 3 }],
      [],
    );
    const a = agregatPeriode(m, 'jour', '2026-09-07', '2026-09-07');
    expect(a.revenuParHeure).toBe(0);
    expect(a.efficacite).toBe(0);
  });

  it('identifie le meilleur jour (revenu max)', () => {
    // 09-07 : 25 ; 09-09 : 30 + 20 = 50
    expect(agg.meilleurJour?.date).toBe('2026-09-09');
    expect(agg.meilleurJour?.revenu).toBe(50);
  });

  it('meilleurJour est null sans revenu', () => {
    const vide = agregatPeriode(new Map(), 'semaine', '2026-09-07', '2026-09-13');
    expect(vide.meilleurJour).toBeNull();
    expect(vide.revenuParHeure).toBe(0);
    expect(vide.efficacite).toBe(0);
    expect(vide.tempsPresence).toBe(0);
  });
});

describe('grouperParDate', () => {
  it('regroupe par date', () => {
    const rows = [
      { id: '1', date: '2026-09-08' },
      { id: '2', date: '2026-09-08' },
      { id: '3', date: '2026-09-09' },
    ];
    const map = grouperParDate(rows);
    expect(map.get('2026-09-08')).toHaveLength(2);
    expect(map.get('2026-09-09')).toHaveLength(1);
  });
});
