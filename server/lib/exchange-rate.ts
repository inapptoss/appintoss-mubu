import { memo } from "./cache";
import { http } from "./http";

const FX_TTL_SEC = 5 * 60;

export async function convert(amount: number, from: string, to: string) {
  const rates = await getRates();
  if (!rates[from] || !rates[to]) throw new Error("FX_RATE_NOT_FOUND");
  // 기준 USD
  const toUSD = amount / rates[from];
  const toAmt = toUSD * rates[to];
  return Math.round(toAmt);
}

async function getRates() {
  return memo("fx_rates_usd", FX_TTL_SEC, async () => {
    try {
      // 1차: open.er-api (무료)
      const r1 = await http.get("https://open.er-api.com/v6/latest/USD");
      if (r1.data?.result === "success") return r1.data.rates as Record<string, number>;
      throw new Error("fx_primary_fail");
    } catch {
      // 2차: exchangerate.host
      const r2 = await http.get("https://api.exchangerate.host/latest?base=USD");
      return r2.data?.rates as Record<string, number>;
    }
  });
}

// Support for common currencies used by Korean travelers (기존 유지)
export const SUPPORTED_CURRENCIES = {
  KRW: '원',
  USD: '$',
  JPY: '¥', 
  THB: '฿',
  VND: '₫',
  EUR: '€',
  CNY: '¥',
  GBP: '£',
  SGD: 'S$',
  HKD: 'HK$',
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

export function getCurrencySymbol(currencyCode: string): string {
  return SUPPORTED_CURRENCIES[currencyCode as SupportedCurrency] || currencyCode;
}

// 환율만 가져오는 함수
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const rates = await getRates();
  if (!rates[from] || !rates[to]) throw new Error("FX_RATE_NOT_FOUND");
  return rates[to] / rates[from];
}

// 기존 API 호환성을 위한 래퍼 (레거시 코드 지원)
export async function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string
) {
  const toAmount = await convert(amount, fromCurrency, toCurrency);
  const rates = await getRates();
  const exchangeRate = rates[toCurrency] / rates[fromCurrency];
  
  return {
    fromCurrency,
    toCurrency, 
    fromAmount: amount,
    toAmount,
    exchangeRate,
    lastUpdated: new Date().toISOString(),
  };
}
