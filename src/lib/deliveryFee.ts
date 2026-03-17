// Delivery fee structure for Iraq
// Erbil: 2,500 IQD
// Sulaymaniyah, Duhok, Halabja: 4,000 IQD
// All other Iraqi cities: 5,000 IQD

const FREE_DELIVERY_THRESHOLD = 40000;

export function getDeliveryFee(city: string | null | undefined, subtotal: number): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;

  const normalized = (city || "").trim().toLowerCase();

  if (normalized === "erbil") return 2500;

  if (["sulaymaniyah", "duhok", "halabja"].includes(normalized)) return 4000;

  return 5000;
}

export const FREE_DELIVERY_MIN = FREE_DELIVERY_THRESHOLD;
