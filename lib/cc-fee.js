// Credit card processing fee constants
export const CC_FEE_RATE = 0.029; // 2.9%
export const CC_FEE_FLAT = 0.30;  // $0.30

export function calculateCcFee(basePrice) {
  return Math.round((basePrice * CC_FEE_RATE + CC_FEE_FLAT) * 100) / 100;
}
