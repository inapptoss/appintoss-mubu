export interface CoupangProduct {
  productName: string;
  price: number;
  originalPrice?: number;
  discountRate?: number;
  link: string;
  affiliateLink?: string; // 제휴 링크 추가
  image: string;
  mallName: string;
  brand: string;
  isRocket: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface CoupangSearchResult {
  query: string;
  total: number;
  items: CoupangProduct[];
  source: 'api' | 'mock';
}

/**
 * 쿠팡 모의 가격 데이터베이스
 * 실제 쿠팡 가격을 참고하여 작성된 현실적인 가격 데이터
 */
const MOCK_PRODUCTS: Record<string, CoupangProduct[]> = {
  // Nike Air Force 1 관련
  'nike air force': [
    {
      productName: '나이키 에어포스 1 \'07 화이트 315122-111 남녀공용',
      price: 109000,
      originalPrice: 129000,
      discountRate: 15,
      link: 'https://www.coupang.com/vp/products/mock-nike-af1-white',
      image: 'https://image.mock.coupang.com/nike-af1-white.jpg',
      mallName: '쿠팡',
      brand: '나이키',
      isRocket: true,
      rating: 4.8,
      reviewCount: 12458
    },
    {
      productName: '나이키 에어포스 1 \'07 블랙 315122-001',
      price: 115000,
      originalPrice: 129000,
      discountRate: 11,
      link: 'https://www.coupang.com/vp/products/mock-nike-af1-black',
      image: 'https://image.mock.coupang.com/nike-af1-black.jpg',
      mallName: '쿠팡',
      brand: '나이키',
      isRocket: true,
      rating: 4.7,
      reviewCount: 8932
    },
    {
      productName: '[로켓배송] 나이키 에어포스1 로우 화이트 블랙 클래식',
      price: 98000,
      originalPrice: 119000,
      discountRate: 18,
      link: 'https://www.coupang.com/vp/products/mock-nike-af1-classic',
      image: 'https://image.mock.coupang.com/nike-af1-classic.jpg',
      mallName: '쿠팡',
      brand: '나이키',
      isRocket: true,
      rating: 4.6,
      reviewCount: 5674
    }
  ],

  // iPhone 관련
  'iphone': [
    {
      productName: '애플 iPhone 15 128GB 블랙',
      price: 1199000,
      originalPrice: 1249000,
      discountRate: 4,
      link: 'https://www.coupang.com/vp/products/mock-iphone15-black',
      image: 'https://image.mock.coupang.com/iphone15-black.jpg',
      mallName: '쿠팡',
      brand: '애플',
      isRocket: true,
      rating: 4.9,
      reviewCount: 3421
    },
    {
      productName: '애플 iPhone 14 128GB 미드나이트',
      price: 899000,
      originalPrice: 1099000,
      discountRate: 18,
      link: 'https://www.coupang.com/vp/products/mock-iphone14-midnight',
      image: 'https://image.mock.coupang.com/iphone14-midnight.jpg',
      mallName: '쿠팡',
      brand: '애플',
      isRocket: true,
      rating: 4.8,
      reviewCount: 8976
    }
  ],

  // Samsung Galaxy 관련
  'samsung galaxy': [
    {
      productName: '삼성전자 갤럭시 S24 256GB 온릭스블랙',
      price: 999000,
      originalPrice: 1155000,
      discountRate: 14,
      link: 'https://www.coupang.com/vp/products/mock-galaxy-s24',
      image: 'https://image.mock.coupang.com/galaxy-s24.jpg',
      mallName: '쿠팡',
      brand: '삼성전자',
      isRocket: true,
      rating: 4.7,
      reviewCount: 6543
    }
  ],

  // 일반 제품들
  'default': [
    {
      productName: '로켓배송 베스트셀러 상품',
      price: 25900,
      originalPrice: 32900,
      discountRate: 21,
      link: 'https://www.coupang.com/vp/products/mock-bestseller',
      image: 'https://image.mock.coupang.com/bestseller.jpg',
      mallName: '쿠팡',
      brand: 'Generic',
      isRocket: true,
      rating: 4.5,
      reviewCount: 2156
    },
    {
      productName: '인기 생활용품 특가 상품',
      price: 15600,
      originalPrice: 19900,
      discountRate: 22,
      link: 'https://www.coupang.com/vp/products/mock-daily-goods',
      image: 'https://image.mock.coupang.com/daily-goods.jpg',
      mallName: '쿠팡',
      brand: 'Generic',
      isRocket: true,
      rating: 4.3,
      reviewCount: 1823
    }
  ]
};

import { affiliateLinkService } from './affiliate-links';

/**
 * 쿠팡 모의 검색 클라이언트
 */
export class CoupangMockClient {
  /**
   * 상품명으로 쿠팡에서 검색 (모의 데이터)
   */
  async searchProducts(
    query: string,
    options: {
      maxResults?: number;
      sortBy?: 'price' | 'popular' | 'recent';
    } = {}
  ): Promise<CoupangSearchResult> {
    const { maxResults = 5, sortBy = 'price' } = options;
    
    console.log(`Searching Coupang (mock) for: "${query}"`);
    
    // 키워드 매칭을 통해 적절한 제품군 선택
    let products: CoupangProduct[] = [];
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('nike') || lowerQuery.includes('나이키') || lowerQuery.includes('에어포스')) {
      products = [...(MOCK_PRODUCTS['nike air force'] || [])];
    } else if (lowerQuery.includes('iphone') || lowerQuery.includes('아이폰')) {
      products = [...(MOCK_PRODUCTS['iphone'] || [])];
    } else if (lowerQuery.includes('samsung') || lowerQuery.includes('삼성') || lowerQuery.includes('갤럭시')) {
      products = [...(MOCK_PRODUCTS['samsung galaxy'] || [])];
    } else {
      products = [...MOCK_PRODUCTS['default']];
    }
    
    // 가격에 약간의 랜덤 변동 추가 및 제휴 링크 생성
    products = products.map(product => {
      const updatedPrice = Math.round(product.price * (0.95 + Math.random() * 0.1));
      
      // 제휴 링크 생성
      const affiliateInfo = affiliateLinkService.generateAffiliateLink(product.link, product.productName);
      
      return {
        ...product,
        price: updatedPrice,
        affiliateLink: affiliateInfo.affiliateLink
      };
    });
    
    // 정렬
    switch (sortBy) {
      case 'price':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'popular':
        products.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      case 'recent':
        // 모의 데이터에서는 순서 유지
        break;
    }
    
    // 결과 제한
    const limitedProducts = products.slice(0, maxResults);
    
    console.log(`Found ${limitedProducts.length} products from Coupang (mock data)`);
    
    return {
      query,
      total: products.length * 100, // 실제 쿠팡의 많은 결과를 시뮬레이션
      items: limitedProducts,
      source: 'mock'
    };
  }

  /**
   * 최저가 상품 검색
   */
  async findLowestPrice(query: string, maxResults: number = 5): Promise<CoupangSearchResult> {
    return this.searchProducts(query, {
      maxResults,
      sortBy: 'price'
    });
  }
}

/**
 * 쿠팡 모의 클라이언트 인스턴스 생성
 */
export function createCoupangMockClient(): CoupangMockClient {
  return new CoupangMockClient();
}