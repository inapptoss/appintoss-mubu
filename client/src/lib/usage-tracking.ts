/**
 * localStorage 기반 게스트 사용량 추적
 * GPT 제안: 클라이언트에서 성공적인 가격 비교 횟수 추적
 */

const STORAGE_KEY = 'mubu_uses';
const SAVINGS_KEY = 'mubu_total_savings';
const COMPARISONS_KEY = 'mubu_price_comparisons';

// 환경변수로 임계값 관리 (테스트 기간: 사실상 무제한)
export const SOFT_WALL_THRESHOLD = parseInt(import.meta.env.VITE_FREE_SOFTWALL_AT || '999999');
export const HARD_WALL_THRESHOLD = parseInt(import.meta.env.VITE_FREE_PAYWALL_AT || '999999');

export interface UsageStats {
  uses: number;
  totalSavings: number;
  needsLogin: boolean;
  needsPremium: boolean;
  lastUsed: string;
}

/**
 * 현재 사용량 통계 조회 (NaN 가드 추가)
 */
export function getCurrentUsageStats(): UsageStats {
  const uses = parseInt(localStorage.getItem(STORAGE_KEY) || '0') || 0; // NaN 가드
  const totalSavings = parseFloat(localStorage.getItem(SAVINGS_KEY) || '0') || 0; // NaN 가드
  const lastUsed = localStorage.getItem('mubu_last_used') || new Date().toISOString();

  return {
    uses,
    totalSavings,
    needsLogin: uses >= SOFT_WALL_THRESHOLD && uses < HARD_WALL_THRESHOLD,
    needsPremium: uses >= HARD_WALL_THRESHOLD,
    lastUsed
  };
}

/**
 * 성공적인 가격 비교 후 사용량 증가
 */
export function incrementUsage(savingsAmount: number = 0): UsageStats {
  const currentUses = parseInt(localStorage.getItem(STORAGE_KEY) || '0') || 0; // NaN 가드
  const currentSavings = parseFloat(localStorage.getItem(SAVINGS_KEY) || '0') || 0; // NaN 가드
  
  const newUses = currentUses + 1;
  // 절약액이 음수면 추가비용, 양수면 절약 - 모두 누적 표시용으로 절댓값 사용
  const newSavings = currentSavings + Math.abs(savingsAmount);
  
  localStorage.setItem(STORAGE_KEY, newUses.toString());
  localStorage.setItem(SAVINGS_KEY, newSavings.toString());
  localStorage.setItem('mubu_last_used', new Date().toISOString());
  
  // 사용량별 로그 메시지
  const stats = getCurrentUsageStats();
  if (stats.needsPremium) {
    console.log(`Hard Wall: ${newUses} uses (Premium required)`);
  } else if (stats.needsLogin) {
    console.log(`Soft Wall: ${newUses} uses (Login encouraged), ₩${newSavings.toLocaleString()} total`);
  } else {
    console.log(`Free usage: ${newUses} uses, ₩${newSavings.toLocaleString()} total savings`);
  }
  
  return getCurrentUsageStats();
}

/**
 * 사용량 초기화 (테스트용)
 */
export function resetUsage(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SAVINGS_KEY);
  localStorage.removeItem('mubu_last_used');
  console.log('Usage stats reset');
}

/**
 * 로그인 후 서버와 동기화
 */
export function syncWithServer(serverUsage: number, serverSavings: number): void {
  localStorage.setItem(STORAGE_KEY, serverUsage.toString());
  localStorage.setItem(SAVINGS_KEY, serverSavings.toString());
  console.log(`Synced with server: ${serverUsage} uses, ₩${serverSavings.toLocaleString()} savings`);
}

/**
 * Alias: 사용량 증가 (짧은 이름)
 */
export function incUse(savingsAmount: number = 0): number {
  incrementUsage(savingsAmount);
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0') || 0;
}

/**
 * Alias: Wall 상태 확인
 */
export function getWallState(): { soft: boolean; hard: boolean } {
  const stats = getCurrentUsageStats();
  return {
    soft: stats.needsLogin,
    hard: stats.needsPremium
  };
}

/**
 * 가격 비교 내역 저장 (localStorage)
 */
export interface LocalPriceComparison {
  id: string;
  productName: string;
  productImageUrl: string;
  localPrice: number;
  localCurrency: string;
  koreaPrice: number;
  savingsAmount: number;
  convertedLocalPrice: number;
  createdAt: string;
}

export function savePriceComparison(comparison: Omit<LocalPriceComparison, 'id' | 'createdAt'>): void {
  const comparisons = getPriceComparisons();
  const newComparison: LocalPriceComparison = {
    ...comparison,
    id: `local-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  
  comparisons.unshift(newComparison); // 최신순으로 추가
  
  // 최대 100개까지만 저장
  const trimmed = comparisons.slice(0, 100);
  localStorage.setItem(COMPARISONS_KEY, JSON.stringify(trimmed));
  
  console.log(`✅ Saved price comparison to localStorage: ${newComparison.productName}`);
}

export function getPriceComparisons(): LocalPriceComparison[] {
  const data = localStorage.getItem(COMPARISONS_KEY);
  if (!data) return [];
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse price comparisons:', error);
    return [];
  }
}