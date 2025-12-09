/**
 * MUBU 로고 로딩 애니메이션 컴포넌트
 * 촬영 후 상품 분석 중 표시되는 브랜드 애니메이션
 */

import { ShoppingCart, Plane, Search, Zap } from "lucide-react";

interface LoadingAnimationProps {
  isVisible: boolean;
  stage?: 'analyzing' | 'searching' | 'comparing';
}

export default function LoadingAnimation({ isVisible, stage = 'analyzing' }: LoadingAnimationProps) {
  if (!isVisible) return null;

  const getStageInfo = () => {
    switch (stage) {
      case 'analyzing':
        return {
          title: "상품 분석 중...",
          subtitle: "AI가 상품을 인식하고 있어요",
          icon: Search
        };
      case 'searching':
        return {
          title: "한국 가격 검색 중...",
          subtitle: "네이버, 쿠팡에서 최저가를 찾고 있어요",
          icon: ShoppingCart
        };
      case 'comparing':
        return {
          title: "가격 비교 중...",
          subtitle: "최고의 절약 기회를 계산하고 있어요",
          icon: Zap
        };
      default:
        return {
          title: "분석 중...",
          subtitle: "잠시만 기다려주세요",
          icon: Search
        };
    }
  };

  const stageInfo = getStageInfo();
  const IconComponent = stageInfo.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-6 px-6">
        {/* MUBU 로고 애니메이션 */}
        <div className="relative">
          {/* 외부 원형 파동 효과 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-muted animate-ping opacity-20"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-2 border-muted animate-ping opacity-40 delay-200"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-muted-foreground animate-ping opacity-60 delay-500"></div>
          </div>

          {/* 중앙 MUBU 로고 */}
          <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-foreground to-muted-foreground rounded-full flex items-center justify-center shadow-2xl animate-pulse">
            {/* MUBU 텍스트 */}
            <div className="text-center">
              <div className="text-2xl font-black text-background tracking-wider">
                MUBU
              </div>
              <div className="text-xs text-background/80 font-medium mt-1">
                Must Buy
              </div>
            </div>

            {/* 회전하는 아이콘들 */}
            <div className="absolute inset-0">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 animate-bounce delay-100">
                <Plane className="w-5 h-5 text-white opacity-80" />
              </div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 animate-bounce delay-300">
                <ShoppingCart className="w-5 h-5 text-white opacity-80" />
              </div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 animate-bounce delay-500">
                <Search className="w-4 h-4 text-white opacity-60" />
              </div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 animate-bounce delay-700">
                <Zap className="w-4 h-4 text-white opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* 스테이지별 메시지 */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <IconComponent className="w-6 h-6 text-foreground animate-spin" />
            <h2 className="text-xl font-bold text-foreground">
              {stageInfo.title}
            </h2>
          </div>
          
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {stageInfo.subtitle}
          </p>

          {/* 진행률 바 (시각적 효과) */}
          <div className="w-48 h-2 bg-muted rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-foreground rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* 여행자 팁 메시지 */}
        <div className="bg-muted border rounded-lg p-4 max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-foreground rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-foreground">
              여행자 TIP
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            해외에서 쇼핑할 때는 항상 한국 가격과 비교해보세요! 
            의외로 한국이 더 저렴한 경우가 많아요
          </p>
        </div>
      </div>

    </div>
  );
}