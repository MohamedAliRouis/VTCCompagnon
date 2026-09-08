import { CourseHistorique, SessionHistorique, HistoriqueJour } from '../types';

export type Periode = 'jour' | 'semaine' | 'mois';

export interface AgregatJour {
  date: string; // YYYY-MM-DD
  nbCourses: number;
  tempsConduite: number; // s : somme des durées de courses
  revenu: number;
  tempsService: number; // s : somme des sessions du jour, hors pauses
  tempsPause: number; // s
}

export interface AgregatPeriode {
  periode: Periode;
  debut: string; // YYYY-MM-DD inclus
  fin: string; // YYYY-MM-DD inclus
  jours: AgregatJour[]; // un par jour de la période, zéros compris
  nbCourses: number;
  tempsConduite: number;
  revenu: number;
  tempsService: number;
  tempsPause: number;
  revenuParHeure: number; // revenu / heures de service ; 0 sans service
  ratioConduite: number; // tempsConduite / tempsService ; 0 sans service
  revenuMoyenCourse: number;
  meilleurJour: AgregatJour | null; // jour de revenu max (> 0)
}

// --- dates : local, granularité jour ---

const pad = (n: number) => String(n).padStart(2, '0');

export const toYmd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Parse 'YYYY-MM-DD' à midi local (évite les sauts d'heure d'été).
const parseYmd = (ymd: string): Date => {
  const [a, m, j] = ymd.split('-').map(Number);
  return new Date(a, m - 1, j, 12, 0, 0, 0);
};

export const ajouterJours = (ymd: string, n: number): string => {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};

// Lundi de la semaine contenant ymd.
export const debutSemaine = (ymd: string): string => {
  const d = parseYmd(ymd);
  const decalage = (d.getDay() + 6) % 7; // dim=0 -> 6, lun=1 -> 0
  d.setDate(d.getDate() - decalage);
  return toYmd(d);
};

export const debutMois = (ymd: string): string => {
  const d = parseYmd(ymd);
  return toYmd(new Date(d.getFullYear(), d.getMonth(), 1, 12));
};

export const finMois = (ymd: string): string => {
  const d = parseYmd(ymd);
  return toYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
};

export const bornesPeriode = (
  periode: Periode,
  ancre: string,
): { debut: string; fin: string } => {
  if (periode === 'jour') {
    return { debut: ancre, fin: ancre };
  }
  if (periode === 'semaine') {
    const debut = debutSemaine(ancre);
    return { debut, fin: ajouterJours(debut, 6) };
  }
  return { debut: debutMois(ancre), fin: finMois(ancre) };
};

// Recule (-1) ou avance (+1) l'ancre d'une période entière.
export const decalerPeriode = (
  periode: Periode,
  ancre: string,
  sens: -1 | 1,
): string => {
  if (periode === 'jour') {
    return ajouterJours(ancre, sens);
  }
  if (periode === 'semaine') {
    return ajouterJours(debutSemaine(ancre), sens * 7);
  }
  const d = parseYmd(debutMois(ancre));
  return toYmd(new Date(d.getFullYear(), d.getMonth() + sens, 1, 12));
};

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export const libellePeriode = (
  periode: Periode,
  debut: string,
  fin: string,
  aujourdhui: string,
): string => {
  if (periode === 'jour') {
    if (debut === aujourdhui) {
      return "Aujourd'hui";
    }
    if (debut === ajouterJours(aujourdhui, -1)) {
      return 'Hier';
    }
    const d = parseYmd(debut);
    return `${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
  }
  if (periode === 'semaine') {
    const d1 = parseYmd(debut);
    const d2 = parseYmd(fin);
    return d1.getMonth() === d2.getMonth()
      ? `${d1.getDate()}–${d2.getDate()} ${MOIS_FR[d1.getMonth()]}`
      : `${d1.getDate()} ${MOIS_FR[d1.getMonth()].slice(0, 3)} – ${d2.getDate()} ${MOIS_FR[
          d2.getMonth()
        ].slice(0, 3)}`;
  }
  const d = parseYmd(debut);
  return `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
};

// --- agrégation ---

const jourVide = (date: string): AgregatJour => ({
  date,
  nbCourses: 0,
  tempsConduite: 0,
  revenu: 0,
  tempsService: 0,
  tempsPause: 0,
});

// Map date -> AgregatJour, à partir des logs bruts + fallback legacy.
// Un jour présent dans `courses` remplace entièrement l'entrée legacy du
// même jour (données dérivées prioritaires).
export const agregerParJour = (
  courses: CourseHistorique[],
  sessions: SessionHistorique[],
  legacy: HistoriqueJour[] = [],
): Map<string, AgregatJour> => {
  const map = new Map<string, AgregatJour>();

  for (const l of legacy) {
    map.set(l.date, {
      ...jourVide(l.date),
      nbCourses: l.nbCourses,
      tempsConduite: l.tempsTotal,
      revenu: l.revenuTotal,
    });
  }

  const joursDerives = new Set<string>();
  for (const c of courses) {
    if (!joursDerives.has(c.date)) {
      joursDerives.add(c.date);
      map.set(c.date, jourVide(c.date));
    }
    const j = map.get(c.date) as AgregatJour;
    j.nbCourses += 1;
    j.tempsConduite += c.duree;
    j.revenu += c.revenu;
  }

  for (const s of sessions) {
    const j = map.get(s.date) ?? jourVide(s.date);
    j.tempsService += s.tempsService;
    j.tempsPause += s.tempsPause;
    map.set(s.date, j);
  }

  return map;
};

export const agregatPeriode = (
  parJour: Map<string, AgregatJour>,
  periode: Periode,
  debut: string,
  fin: string,
): AgregatPeriode => {
  const jours: AgregatJour[] = [];
  for (let d = debut; d <= fin; d = ajouterJours(d, 1)) {
    jours.push(parJour.get(d) ?? jourVide(d));
  }

  const somme = jours.reduce(
    (acc, j) => ({
      nbCourses: acc.nbCourses + j.nbCourses,
      tempsConduite: acc.tempsConduite + j.tempsConduite,
      revenu: acc.revenu + j.revenu,
      tempsService: acc.tempsService + j.tempsService,
      tempsPause: acc.tempsPause + j.tempsPause,
    }),
    { nbCourses: 0, tempsConduite: 0, revenu: 0, tempsService: 0, tempsPause: 0 },
  );

  const meilleurJour = jours.reduce<AgregatJour | null>(
    (best, j) =>
      j.revenu > 0 && (!best || j.revenu > best.revenu) ? j : best,
    null,
  );

  return {
    periode,
    debut,
    fin,
    jours,
    ...somme,
    revenuParHeure:
      somme.tempsService > 0 ? somme.revenu / (somme.tempsService / 3600) : 0,
    ratioConduite:
      somme.tempsService > 0 ? somme.tempsConduite / somme.tempsService : 0,
    revenuMoyenCourse: somme.nbCourses > 0 ? somme.revenu / somme.nbCourses : 0,
    meilleurJour,
  };
};

// Regroupe une liste de lignes par date (détail dépliable).
export const grouperParDate = <T extends { date: string }>(
  rows: T[],
): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const arr = map.get(r.date);
    if (arr) {
      arr.push(r);
    } else {
      map.set(r.date, [r]);
    }
  }
  return map;
};
