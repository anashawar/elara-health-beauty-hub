// All governorates and major cities of Iraq
export const iraqCities = [
  // Kurdistan Region
  "Erbil",
  "Sulaymaniyah",
  "Duhok",
  "Halabja",
  // Baghdad
  "Baghdad",
  // Southern
  "Basra",
  "Nasiriyah",
  "Amarah",
  "Kut",
  "Diwaniyah",
  "Samawah",
  // Central
  "Hillah",
  "Karbala",
  "Najaf",
  "Ramadi",
  "Fallujah",
  // Northern
  "Mosul",
  "Kirkuk",
  "Tikrit",
  "Samarra",
  // Eastern
  "Baqubah",
  // Western
  "Rutba",
] as const;

export type IraqCity = (typeof iraqCities)[number];
