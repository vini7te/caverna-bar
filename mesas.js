// Planta do salão em centímetros (7,20 m × 12 m). Mude aqui as posições e a quantidade de mesas.
// kind: "booth" (sofá de palete), "square" (mesa), "barrel" (tambor bistrô), "pool" (sinuca)
export const MESAS = [
  { n: 1, kind: "booth", x: 40, y: 150, w: 150, h: 120 },
  { n: 2, kind: "booth", x: 40, y: 320, w: 150, h: 120 },
  { n: 3, kind: "booth", x: 40, y: 490, w: 150, h: 120 },
  { n: 4, kind: "booth", x: 40, y: 660, w: 150, h: 120 },
  { n: 5, kind: "square", x: 270, y: 170, w: 100, h: 100 },
  { n: 6, kind: "square", x: 270, y: 340, w: 100, h: 100 },
  { n: 7, kind: "square", x: 270, y: 510, w: 100, h: 100 },
  { n: 8, kind: "square", x: 270, y: 680, w: 100, h: 100 },
  { n: 9, kind: "barrel", cx: 520, cy: 190, r: 46 },
  { n: 10, kind: "barrel", cx: 520, cy: 340, r: 46 },
  { n: 11, kind: "barrel", cx: 470, cy: 560, r: 42 },
  { n: 12, kind: "pool", x: 50, y: 860, w: 240, h: 130 }
];

export const TIPOS = { atendente: "Chamar atendente", conta: "Pedir a conta", gelo: "Gelo / copos" };
