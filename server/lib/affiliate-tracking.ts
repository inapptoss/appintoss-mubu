/**
 * 제휴 마케팅 클릭 추적 서비스
 */

import { storage } from '../storage';

export interface ClickTrackingData {
  userId?: string;
  platform: 'coupang' | 'naver';
  productName: string;
  originalLink: string;
  affiliateLink: string;
  userAgent?: string;
  referrer?: string;
}

export interface ClickAnalytics {
  totalClicks: number;
  clicksByPlatform: Record<string, number>;
  topProducts: Array<{
    productName: string;
    clicks: number;
    platform: string;
  }>;
  clicksByDate: Array<{
    date: string;
    clicks: number;
  }>;
}

export class AffiliateTrackingService {
  /**
   * 제휴 링크 클릭 추적
   */
  async trackClick(trackingData: ClickTrackingData): Promise<void> {
    try {
      await storage.recordAffiliateClick(trackingData);
      console.log(`Tracked ${trackingData.platform} click for: ${trackingData.productName}`);
    } catch (error) {
      console.error('Error tracking affiliate click:', error);
      throw error;
    }
  }

  /**
   * 클릭 분석 데이터 조회 (실제 집계)
   */
  async getClickAnalytics(
    options: {
      userId?: string;
      platform?: 'coupang' | 'naver';
      days?: number;
    } = {}
  ): Promise<ClickAnalytics> {
    try {
      const { userId, platform, days = 30 } = options;
      
      // 실제 클릭 데이터 조회
      const allClicks = await storage.getAffiliateClicks(userId, platform, days);
      
      // 총 클릭 수
      const totalClicks = allClicks.length;
      
      // 플랫폼별 클릭 수 집계
      const clicksByPlatform = allClicks.reduce((acc: Record<string, number>, click: any) => {
        acc[click.platform] = (acc[click.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // 인기 상품 집계 (상위 5개)
      const productCounts = allClicks.reduce((acc: Record<string, number>, click: any) => {
        const key = `${click.productName}|${click.platform}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([key, clicks]) => {
          const [productName, platform] = key.split('|');
          return { productName, clicks: clicks as number, platform };
        });
      
      // 날짜별 클릭 수 (최근 7일)
      const clicksByDate = this.getClicksByDate(allClicks, 7);

      const analytics: ClickAnalytics = {
        totalClicks,
        clicksByPlatform: {
          coupang: clicksByPlatform.coupang || 0,
          naver: clicksByPlatform.naver || 0
        },
        topProducts,
        clicksByDate
      };

      console.log(`Retrieved click analytics: ${totalClicks} total clicks over ${days} days`);
      return analytics;
    } catch (error) {
      console.error('Error retrieving click analytics:', error);
      throw error;
    }
  }

  /**
   * 날짜별 클릭 데이터 집계
   */
  private getClicksByDate(clicks: any[], days: number): Array<{ date: string; clicks: number }> {
    const dateMap = new Map<string, number>();
    const today = new Date();
    
    // 최근 N일 날짜 초기화
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
    }
    
    // 클릭 데이터 집계
    clicks.forEach(click => {
      const clickDate = new Date(click.clickedAt);
      const dateStr = clickDate.toISOString().split('T')[0];
      
      if (dateMap.has(dateStr)) {
        dateMap.set(dateStr, dateMap.get(dateStr)! + 1);
      }
    });
    
    return Array.from(dateMap.entries())
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 수익 추정 계산 (클릭 기반)
   */
  calculateEstimatedRevenue(analytics: ClickAnalytics): number {
    const coupangClicks = analytics.clicksByPlatform.coupang || 0;
    const naverClicks = analytics.clicksByPlatform.naver || 0;
    
    // 예상 수익률 (현실적인 추정치)
    const coupangConversion = 0.03; // 3% 전환율
    const naverConversion = 0.025;  // 2.5% 전환율
    const avgOrderValue = 50000;    // 평균 주문 금액 5만원
    const avgCommission = 0.025;    // 평균 수수료 2.5%
    
    const estimatedRevenue = 
      (coupangClicks * coupangConversion * avgOrderValue * avgCommission) +
      (naverClicks * naverConversion * avgOrderValue * avgCommission);
    
    return Math.round(estimatedRevenue);
  }
}

export const affiliateTrackingService = new AffiliateTrackingService();