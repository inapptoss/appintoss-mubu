/**
 * 사용량 제한 서비스
 * 서버 사이드에서 무료 사용자 일일 한도 관리
 */

import { storage } from '../storage';

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  dailyLimit: number;
  remaining: number;
  resetTime?: Date;
  needsLogin?: boolean;  // Soft wall: 로그인 유도
  totalSavings?: number; // 절약액 합계 (로그인 유도용)
}

export class UsageLimitService {
  private readonly FREE_DAILY_LIMIT = 999999; // 테스트 기간: 무제한 사용
  private readonly GUEST_HARD_LIMIT = 999999; // 테스트 기간: 무제한 사용
  private readonly PREMIUM_DAILY_LIMIT = 999999; // 사실상 무제한

  /**
   * 사용량 증가 및 한도 확인 (익명 사용자 포함)
   */
  async incrementAndCheck(userId?: string, sessionId?: string): Promise<UsageCheckResult> {
    // 익명 사용자 ID 생성 (세션 기반)
    const effectiveUserId = userId || `anon_${sessionId || 'unknown'}`;
    
    if (!userId && !sessionId) {
      // 세션 ID도 없으면 초기 상태로 반환
      return {
        allowed: true,
        currentUsage: 0,
        dailyLimit: this.FREE_DAILY_LIMIT,
        remaining: this.FREE_DAILY_LIMIT
      };
    }

    try {
      let user = await storage.getUser(effectiveUserId);
      
      // 익명 사용자인 경우 임시 사용자 생성
      if (!user && !userId) {
        user = await storage.createAnonymousUser(effectiveUserId);
      } else if (!user) {
        throw new Error('User not found');
      }

      // 프리미엄 사용자 확인
      const isPremium = this.isPremiumUser(user);
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIMIT : this.FREE_DAILY_LIMIT;

      // 오늘 날짜 확인
      const today = new Date();
      const userLastDate = user.lastSearchDate ? new Date(user.lastSearchDate) : null;
      
      let currentUsage = user.dailySearchCount || 0;

      // 새로운 날이면 카운트 리셋
      if (!userLastDate || !this.isSameDay(today, userLastDate)) {
        currentUsage = 0;
      }

      // Soft Wall 로직: 사용자별 맞춤 한도 적용
      let allowed = true;
      let needsLogin = false;
      let actualLimit = dailyLimit;

      if (!isPremium) {
        // 익명/무료 사용자: Soft Wall 적용
        if (currentUsage >= this.GUEST_HARD_LIMIT) {
          // Hard wall: 완전 차단 (500회 이상)
          allowed = false;
        } else if (currentUsage >= this.FREE_DAILY_LIMIT) {
          // Soft wall: 로그인 유도하되 계속 사용 가능 (5-499회)
          allowed = true;
          needsLogin = true;
          actualLimit = this.GUEST_HARD_LIMIT;
        }
        // 0-4회: 자유 사용
      }
      
      if (allowed) {
        // 사용량 증가
        currentUsage += 1;
        
        // 사용자 정보 업데이트
        await storage.updateUserUsage(effectiveUserId, currentUsage, today);
      }

      return {
        allowed,
        currentUsage,
        dailyLimit: actualLimit,
        remaining: Math.max(0, actualLimit - currentUsage),
        resetTime: this.getNextResetTime(),
        needsLogin,
        totalSavings: 0 // TODO: 실제 절약액 계산
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      
      // 오류 시 초기 상태로 반환
      return {
        allowed: true,
        currentUsage: 0,
        dailyLimit: this.FREE_DAILY_LIMIT,
        remaining: this.FREE_DAILY_LIMIT
      };
    }
  }

  /**
   * 현재 사용량만 조회 (증가하지 않음)
   */
  async getCurrentUsage(userId?: string, sessionId?: string): Promise<UsageCheckResult> {
    // 익명 사용자 ID 생성 (세션 기반)
    const effectiveUserId = userId || `anon_${sessionId || 'unknown'}`;
    
    if (!userId && !sessionId) {
      return {
        allowed: true,
        currentUsage: 0,
        dailyLimit: this.FREE_DAILY_LIMIT,
        remaining: this.FREE_DAILY_LIMIT
      };
    }

    try {
      let user = await storage.getUser(effectiveUserId);
      
      // 익명 사용자인 경우 임시 사용자 생성 (조회용)
      if (!user && !userId) {
        user = await storage.createAnonymousUser(effectiveUserId);
      } else if (!user) {
        throw new Error('User not found');
      }

      const isPremium = this.isPremiumUser(user);
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIMIT : this.FREE_DAILY_LIMIT;

      const today = new Date();
      const userLastDate = user.lastSearchDate ? new Date(user.lastSearchDate) : null;
      
      let currentUsage = user.dailySearchCount || 0;

      // 새로운 날이면 카운트 리셋
      if (!userLastDate || !this.isSameDay(today, userLastDate)) {
        currentUsage = 0;
      }

      // Soft Wall 로직: getCurrentUsage에도 동일 적용
      let allowed = true;
      let needsLogin = false;
      let actualLimit = dailyLimit;

      if (!isPremium) {
        // 익명/무료 사용자: Soft Wall 적용
        if (currentUsage >= this.GUEST_HARD_LIMIT) {
          // Hard wall: 완전 차단 (500회 이상)
          allowed = false;
        } else if (currentUsage >= this.FREE_DAILY_LIMIT) {
          // Soft wall: 로그인 유도하되 계속 사용 가능 (5-499회)
          allowed = true;
          needsLogin = true;
          actualLimit = this.GUEST_HARD_LIMIT;
        }
        // 0-4회: 자유 사용
      }

      return {
        allowed,
        currentUsage,
        dailyLimit: actualLimit,
        remaining: Math.max(0, actualLimit - currentUsage),
        resetTime: this.getNextResetTime(),
        needsLogin,
        totalSavings: 0 // TODO: 실제 절약액 계산
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return {
        allowed: true,
        currentUsage: 0,
        dailyLimit: this.FREE_DAILY_LIMIT,
        remaining: this.FREE_DAILY_LIMIT
      };
    }
  }

  /**
   * 프리미엄 사용자 여부 확인
   */
  private isPremiumUser(user: any): boolean {
    if (!user.subscriptionType || user.subscriptionType === 'free') {
      return false;
    }

    // 구독 만료일 확인
    if (user.subscriptionExpiresAt) {
      const expiryDate = new Date(user.subscriptionExpiresAt);
      const now = new Date();
      
      if (now > expiryDate) {
        return false; // 만료됨
      }
    }

    return ['daily', 'weekly', 'monthly'].includes(user.subscriptionType);
  }

  /**
   * 같은 날인지 확인
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * 다음 리셋 시간 계산 (자정)
   */
  private getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

export const usageLimitService = new UsageLimitService();