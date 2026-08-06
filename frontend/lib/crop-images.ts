const CROP_IMAGES: Record<string, string> = {
  // Las dos fotografías originales llegaron con el nombre intercambiado.
  papa: "camote",
  camote: "papa",
  arroz: "arroz",
  maiz: "maiz",
  quinua: "quinua",
  oca: "oca",
  canihua: "canihua",
  kiwicha: "kiwicha",
  tomate: "tomate",
  cebolla: "cebolla",
  brocoli: "brocoli",
  repollo: "repollo",
  zanahoria: "zanahoria",
  coliflor: "coliflor",
  apio: "apio",
  ajo: "ajo",
  lechuga: "lechuga",
  espinaca: "espinaca",
  rabano: "rabano",
  berenjena: "berenjena",
  pimiento: "pimiento",
  pepino: "pepino",
  zapallo: "zapallo",
  "zapallito italiano": "zapallito-italiano",
  melon: "melon",
  sandia: "sandia",
  betarraga: "betarraga",
  yuca: "yuca",
  "frijol verde": "frijol-verde",
  "frijol seco": "frijol-seco",
  garbanzo: "garbanzo",
  "haba verde": "haba-verde",
  "haba seca": "haba-seca",
  mani: "mani",
  lenteja: "lenteja",
  "arveja verde": "arveja-verde",
  soya: "soya",
  alcachofa: "alcachofa",
  esparrago: "esparrago",
  fresa: "fresa",
  algodon: "algodon",
  sesamo: "sesamo",
  girasol: "girasol",
  cebada: "cebada",
  avena: "avena",
  trigo: "trigo",
  "maiz choclo": "maiz-choclo",
  sorgo: "sorgo",
  alfalfa: "alfalfa",
  "cana de azucar": "cana-de-azucar",
  platano: "platano",
  cacao: "cacao",
  cafe: "cafe",
  pina: "pina",
  vid: "vid",
  palta: "palta",
  citricos: "citricos",
  olivo: "olivo",
  manzano: "manzano",
  durazno: "durazno",
};

export function normalizeCropName(value?: string) {
  return value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() ?? "";
}

export function cropImage(name?: string) {
  const slug = CROP_IMAGES[normalizeCropName(name)];
  return slug ? `/images/crops/${slug}.webp` : "/images/sira-andes-irrigation.webp";
}

const LOW_FOCUS = new Set([
  "ajo", "betarraga", "camote", "cebolla", "mani", "oca", "papa", "rabano", "yuca", "zanahoria",
]);

const HIGH_FOCUS = new Set([
  "alcachofa", "algodon", "avena", "cana de azucar", "cebada", "esparrago", "girasol", "quinua", "sesamo", "sorgo", "trigo",
]);

export function cropImagePosition(name?: string) {
  const normalized = normalizeCropName(name);
  if (LOW_FOCUS.has(normalized)) return "50% 68%";
  if (HIGH_FOCUS.has(normalized)) return "50% 42%";
  return "50% 54%";
}
