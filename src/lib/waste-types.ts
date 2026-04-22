export const WASTE_COLUMNS = [
  { key: "aprovechables_organicos", label: "Aprovechables Orgánicos", group: "no_peligrosos" },
  { key: "aprovechables", label: "Aprovechables", group: "no_peligrosos" },
  { key: "no_aprovechables", label: "No Aprovechables", group: "no_peligrosos" },
  { key: "biosanitarios", label: "Biosanitarios", group: "infecciosos" },
  { key: "anatomopatologicos", label: "Anatomopatológicos", group: "infecciosos" },
  { key: "cortopunzantes", label: "Cortopunzantes", group: "infecciosos" },
  { key: "de_animales", label: "De Animales", group: "infecciosos" },
  { key: "farmacos", label: "Fármacos", group: "quimicos" },
] as const;

export type WasteKey = (typeof WASTE_COLUMNS)[number]["key"];

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();