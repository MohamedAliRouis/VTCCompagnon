import { format } from 'date-fns';

// Formater le temps (MM:SS ou HH:MM:SS)
export const formaterTemps = (secondes: number): string => {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = secondes % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Formater l'argent (format français)
export const formaterArgent = (montant: number): string => {
  return `${montant.toFixed(2).replace('.', ',')} €`;
};

// Formater une date ISO en JJ/MM/YYYY
export const formaterDate = (isoString: string): string => {
  return format(new Date(isoString), 'dd/MM/yyyy');
};

// Obtenir la date du jour (YYYY-MM-DD)
export const getDateJour = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Générer un ID unique
export const genererId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
