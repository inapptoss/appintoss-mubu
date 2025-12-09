export interface NaverShoppingItem {
  title: string;
  link: string;
  image: string;
  lprice: string;  // 최저가
  hprice: string;  // 최고가
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

export interface NaverShoppingResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverShoppingItem[];
}

export interface ShoppingSearchResult {
  query: string;
  total: number;
  items: Array<{
    productName: string;
    price: number;
    link: string;
    affiliateLink?: string; // 제휴 링크 추가
    image: string;
    mallName: string;
    brand: string;
  }>;
}

import { affiliateLinkService } from './affiliate-links';
import { http } from "./http";
import { memo } from "./cache";

/**
 * 네이버 쇼핑 검색 API 클라이언트
 */
export class NaverShoppingClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://openapi.naver.com/v1/search/shop';

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * 상품명으로 네이버 쇼핑에서 검색
   * @param query 검색할 상품명
   * @param options 검색 옵션 (display: 결과 수, start: 시작 위치, sort: 정렬)
   */
  async searchProducts(
    query: string,
    options: {
      display?: number;  // 1-100, 기본 10
      start?: number;    // 1-1000, 기본 1  
      sort?: 'sim' | 'date' | 'asc' | 'dsc';  // sim(정확도), date(날짜), asc(가격낮은순), dsc(가격높은순)
    } = {}
  ): Promise<ShoppingSearchResult> {
    const { display = 10, start = 1, sort = 'asc' } = options;
    
    // URL 인코딩된 검색어
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}?query=${encodedQuery}&display=${display}&start=${start}&sort=${sort}`;

    console.log(`Searching Naver Shopping for: "${query}"`);
    console.log(`API URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret,
          'User-Agent': 'MUBU-PriceComparison/1.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Naver Shopping API Error:', response.status, errorText);
        throw new Error(`Naver Shopping API failed: ${response.status} ${response.statusText}`);
      }

      const data: NaverShoppingResponse = await response.json();
      console.log(`Found ${data.total} products, showing ${data.items.length} items`);

      // 결과를 정제하고 제휴 링크 추가
      const result: ShoppingSearchResult = {
        query,
        total: data.total,
        items: data.items.map(item => {
          const productName = this.cleanHtml(item.title);
          const originalLink = item.link;
          
          // 제휴 링크 생성
          const affiliateInfo = affiliateLinkService.generateAffiliateLink(originalLink, productName);
          
          return {
            productName,
            price: parseInt(item.lprice) || 0,
            link: originalLink,
            affiliateLink: affiliateInfo.affiliateLink,
            image: item.image,
            mallName: item.mallName,
            brand: item.brand || 'Unknown Brand'
          };
        })
      };

      console.log(`Processed ${result.items.length} shopping results`);
      return result;

    } catch (error) {
      console.error('Error searching Naver Shopping:', error);
      throw error;
    }
  }

  /**
   * 최저가 상품 검색 (가격 오름차순으로 정렬)
   */
  async findLowestPrice(query: string, maxResults: number = 5): Promise<ShoppingSearchResult> {
    return this.searchProducts(query, {
      display: maxResults,
      sort: 'asc'  // 가격 낮은 순
    });
  }

  /**
   * HTML 태그 제거 및 특수문자 처리
   */
  private cleanHtml(text: string): string {
    return text
      .replace(/<\/?[^>]+(>|$)/g, '')  // HTML 태그 제거
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

/**
 * 기본 네이버 쇼핑 클라이언트 인스턴스 생성
 */
export function createNaverShoppingClient(): NaverShoppingClient {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID and NAVER_CLIENT_SECRET environment variables are required');
  }

  return new NaverShoppingClient(clientId, clientSecret);
}

// ===== 새로운 간결한 최저가 검색 (캐시 & 필터링) =====

const TTL_SEC = 180;
const BAD_KEYWORDS = [/중고/i, /리퍼/i, /전시품/i, /케이스만/i, /빈박스/i];

/**
 * 최저가 검색 (캐시 적용 + 중고/리퍼 필터링)
 * @param name 검색할 상품명
 * @returns 최저가 상품 또는 null
 */
export async function searchLowestNaver(name: string) {
  return memo("nv:" + name, TTL_SEC, async () => {
    const id = process.env.NAVER_CLIENT_ID!;
    const secret = process.env.NAVER_CLIENT_SECRET!;
    if (!id || !secret) throw new Error("NAVER_KEY_MISSING");

    const r = await http.get("https://openapi.naver.com/v1/search/shop.json", {
      params: { query: name, sort: "asc", display: 12 },
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });

    const items: any[] = r.data?.items || [];
    const cleaned = items.filter((it) => BAD_KEYWORDS.every((re) => !re.test(it.title)));
    return cleaned.sort((a, b) => +a.lprice - +b.lprice)[0] || null;
  });
}