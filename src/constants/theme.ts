// Palette unique de l'application, dérivée du tableau de bord.
// Tous les écrans doivent piocher ici plutôt que de coder des couleurs en dur.
export const COULEURS = {
  fond: '#10131f',
  carte: '#1a1f30',
  carteBordure: '#293148',
  carteBordureAccent: '#3b4967',
  separateur: '#2a3145',

  texte: '#ffffff',
  texteSecondaire: '#8f96aa',
  texteFaible: '#7f879b',

  accent: '#4f9df8',
  accentClair: '#5fa8ff',
  surAccent: '#07101f', // texte posé sur un bouton accent

  positif: '#65d39a',
  alerte: '#f2bd62',
  danger: '#d67b82',

  boutonSecondaire: '#252c40',
  boutonSecondaireBordure: '#39435e',
} as const;
