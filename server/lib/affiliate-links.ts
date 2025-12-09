/**
 * 제휴 마케팅 링크 변환 서비스
 * 쿠팡 파트너스, 네이버 어필리에이트 링크 생성
 */

export interface AffiliateLink {
  originalLink: string;
  affiliateLink: string;
  platform: 'coupang' | 'naver';
  commission?: string; // 예상 수수료율
}

export interface AffiliateConfig {
  coupang: {
    partnerId?: string;
    subId?: string;
  };
  naver: {
    partnerId?: string;
    channelId?: string;
  };
}

/**
 * 제휴 링크 변환 서비스
 */
export class AffiliateLinkService {
  private config: AffiliateConfig;

  constructor(config: AffiliateConfig = { coupang: {}, naver: {} }) {
    this.config = config;
  }

  /**
   * 쿠팡 파트너스 링크 생성
   * 형식: https://link.coupang.com/a/[PARTNER_ID]?url=[ENCODED_URL]&subid=[SUB_ID]
   */
  generateCoupangAffiliateLink(originalUrl: string, productName: string): AffiliateLink {
    // 쿠팡 파트너스 ID (환경변수 또는 기본값)
    const partnerId = process.env.COUPANG_PARTNER_ID || 'demo_partner';
    const subId = `mubu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // URL 인코딩
    const encodedUrl = encodeURIComponent(originalUrl);
    
    // 쿠팡 파트너스 링크 생성
    const affiliateLink = `https://link.coupang.com/a/${partnerId}?url=${encodedUrl}&subid=${subId}`;
    
    console.log(`Generated Coupang affiliate link for: ${productName}`);
    
    return {
      originalLink: originalUrl,
      affiliateLink,
      platform: 'coupang',
      commission: '최대 3%' // 쿠팡 파트너스 일반 수수료율
    };
  }

  /**
   * 네이버 쇼핑 어필리에이트 링크 생성
   * 형식: https://search.shopping.naver.com/[PRODUCT_ID]?af_id=[PARTNER_ID]&ref=mubu
   */
  generateNaverAffiliateLink(originalUrl: string, productName: string): AffiliateLink {
    // 네이버 파트너 ID (환경변수 또는 기본값)
    const partnerId = process.env.NAVER_AFFILIATE_ID || 'demo_naver';
    
    // 네이버 쇼핑 링크에서 상품 ID 추출
    const productIdMatch = originalUrl.match(/\/(\d+)(?:\?|$)/);
    const productId = productIdMatch ? productIdMatch[1] : 'unknown';
    
    // 기존 URL에 제휴 파라미터 추가
    const url = new URL(originalUrl);
    url.searchParams.set('af_id', partnerId);
    url.searchParams.set('ref', 'mubu');
    url.searchParams.set('utm_source', 'mubu_app');
    url.searchParams.set('utm_medium', 'affiliate');
    
    const affiliateLink = url.toString();
    
    console.log(`Generated Naver affiliate link for: ${productName}`);
    
    return {
      originalLink: originalUrl,
      affiliateLink,
      platform: 'naver',
      commission: '최대 2%' // 네이버 어필리에이트 일반 수수료율
    };
  }

  /**
   * 플랫폼 자동 감지 후 제휴 링크 생성
   */
  generateAffiliateLink(originalUrl: string, productName: string): AffiliateLink {
    if (originalUrl.includes('coupang.com')) {
      return this.generateCoupangAffiliateLink(originalUrl, productName);
    } else if (originalUrl.includes('naver.com') || originalUrl.includes('shopping.naver.com')) {
      return this.generateNaverAffiliateLink(originalUrl, productName);
    } else {
      // 기본적으로 원본 링크 반환
      return {
        originalLink: originalUrl,
        affiliateLink: originalUrl,
        platform: originalUrl.includes('coupang') ? 'coupang' : 'naver',
        commission: '0%'
      };
    }
  }

  /**
   * 여러 제품의 제휴 링크를 일괄 생성
   */
  generateBulkAffiliateLinks(
    products: Array<{ link: string; productName: string }>
  ): AffiliateLink[] {
    return products.map(product => 
      this.generateAffiliateLink(product.link, product.productName)
    );
  }

  /**
   * 제휴 링크 클릭 추적용 단축 URL 생성
   */
  generateTrackingLink(
    affiliateLink: AffiliateLink,
    userId?: string
  ): string {
    // MUBU 자체 추적 링크 생성
    const trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    
    // 추적 파라미터 인코딩
    const params = new URLSearchParams({
      t: trackingId,
      p: affiliateLink.platform,
      u: userId || 'anonymous',
      target: affiliateLink.affiliateLink
    });
    
    return `${baseUrl}/track/click?${params.toString()}`;
  }
}

/**
 * 기본 제휴 링크 서비스 인스턴스
 */
export const affiliateLinkService = new AffiliateLinkService({
  coupang: {
    partnerId: process.env.COUPANG_PARTNER_ID,
    subId: 'mubu_app'
  },
  naver: {
    partnerId: process.env.NAVER_AFFILIATE_ID,
    channelId: 'mubu_channel'
  }
});