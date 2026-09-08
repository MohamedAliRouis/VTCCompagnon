// Formater le temps (MM:SS ou HH:MM:SS)
export const formaterTemps = (secondes: number): string => {
  const total = Math.max(0, Math.floor(secondes));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Formater l'argent (format français)
export const formaterArgent = (montant: number): string => {
  return `${montant.toFixed(2).replace('.', ',')} €`;
};

// Formater une date 'YYYY-MM-DD' en 'JJ/MM/AAAA'
export const formaterDate = (isoDate: string): string => {
  const [annee, mois, jour] = isoDate.split('-');
  return `${jour}/${mois}/${annee}`;
};

// Obtenir la date du jour (YYYY-MM-DD) dans le fuseau local.
// toISOString() renverrait la date UTC : une course terminée à 00h30 à Paris
// serait comptée sur le jour précédent.
export const getDateJour = (): string => {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
};

// Générer un ID unique
export const genererId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
