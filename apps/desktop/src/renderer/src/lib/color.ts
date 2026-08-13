/**
 * Convertit une couleur hexadécimale (#RRGGBB) en triplet HSL au format
 * attendu par nos variables CSS ("H S% L%", sans fonction hsl() — voir
 * packages/ui/src/styles/globals.css). Fonction pure, testée isolément.
 */
export function hexToHslString(hex: string): string | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;

  const [hexValue] = match;
  const value = hexValue.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const THEME_CSS_VARS = {
  primaryColor: "--primary",
  secondaryColor: "--secondary",
  buttonColor: "--button",
  menuColor: "--menu",
  windowColor: "--window",
  destructiveColor: "--destructive",
  successColor: "--success",
  warningColor: "--warning",
} as const;

/**
 * Couleurs dont le texte associé (`--xColor-foreground`) doit rester lisible quelle que soit la
 * teinte choisie par l'établissement — ajouté le 2026-08-02 (retour du porteur du projet, captures
 * d'écran : "Couleur des fenêtres" réglée sur une teinte claire, tout le texte blanc qui repose
 * dessus — entête, sous-navigation Paramètres, liste des rôles... — devenait illisible). Jusqu'ici
 * `--xColor-foreground` était figé à blanc dans globals.css, en supposant une couleur de fond
 * toujours foncée ; calculé ici à la place, à partir de la luminosité perçue de la couleur choisie.
 */
const CONTRAST_PAIRS: { colorKey: keyof ThemeColors; foregroundVar: string }[] = [
  { colorKey: "windowColor", foregroundVar: "--window-foreground" },
  { colorKey: "primaryColor", foregroundVar: "--primary-foreground" },
  { colorKey: "buttonColor", foregroundVar: "--button-foreground" },
];

const DARK_FOREGROUND = "222 47% 11%";
const LIGHT_FOREGROUND = "0 0% 100%";

/**
 * Texte sombre ou blanc selon la luminosité perçue (formule YIQ, seuil usuel de 155/255) — plus
 * fiable que la seule luminosité HSL pour juger de la lisibilité d'un texte superposé.
 */
export function contrastForeground(hex: string): string | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const [hexValue] = match;
  const value = hexValue.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? DARK_FOREGROUND : LIGHT_FOREGROUND;
}

export interface ThemeColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  buttonColor?: string | null;
  menuColor?: string | null;
  windowColor?: string | null;
  destructiveColor?: string | null;
  successColor?: string | null;
  warningColor?: string | null;
}

/**
 * Applique les couleurs en direct (avant même l'enregistrement, pour
 * prévisualisation — voir MODULE-02 §4.2/§3.6). Les couleurs non définies ne
 * modifient pas la variable correspondante (garde le token par défaut).
 */
export function applyThemeColors(theme: ThemeColors) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(THEME_CSS_VARS) as [
    keyof ThemeColors,
    string,
  ][]) {
    const value = theme[key];
    if (!value) continue;
    const hsl = hexToHslString(value);
    if (hsl) root.style.setProperty(cssVar, hsl);
  }
  for (const { colorKey, foregroundVar } of CONTRAST_PAIRS) {
    const value = theme[colorKey];
    if (!value) continue;
    const foreground = contrastForeground(value);
    if (foreground) root.style.setProperty(foregroundVar, foreground);
  }
}
