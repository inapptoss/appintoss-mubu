import KoreanPriceList from '../KoreanPriceList';
import { useState } from 'react';
import { Button } from "@/components/ui/button";

export default function KoreanPriceListExample() {
  const [isOpen, setIsOpen] = useState(false);
  
  // todo: remove mock functionality
  const mockPrices = [
    {
      source: '쿠팡',
      price: 65000,
      url: 'https://coupang.com',
      rating: 4.5,
      reviewCount: 1234,
      shipping: '무료배송',
      seller: '나이키 공식스토어'
    },
    {
      source: '네이버쇼핑',
      price: 67900,
      url: 'https://shopping.naver.com',
      rating: 4.3,
      reviewCount: 892,
      shipping: '배송비 2,500원',
      seller: '스포츠몰'
    },
    {
      source: '11번가',
      price: 69000,
      url: 'https://11st.co.kr',
      rating: 4.2,
      reviewCount: 567,
      shipping: '무료배송',
      seller: '신발전문점'
    },
    {
      source: 'G마켓',
      price: 71500,
      url: 'https://gmarket.co.kr',
      rating: 4.0,
      reviewCount: 445,
      shipping: '배송비 3,000원',
      seller: '운동화마트'
    },
    {
      source: '무신사',
      price: 89000,
      url: 'https://musinsa.com',
      rating: 4.7,
      reviewCount: 234,
      shipping: '무료배송',
      seller: '무신사 스탠다드'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <Button onClick={() => setIsOpen(true)}>
        한국가격 목록 보기
      </Button>
      
      {isOpen && (
        <KoreanPriceList
          productName="Nike Air Force 1 운동화"
          prices={mockPrices}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}