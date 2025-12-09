import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingDown, TrendingUp, Minus, ExternalLink, Check, Plus, Crown, User, Gift, Sparkles, Info } from "lucide-react";
import { useState, useEffect } from "react";
import PremiumModal from "./PremiumModal";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUsageStats, incrementUsage, UsageStats, HARD_WALL_THRESHOLD } from "@/lib/usage-tracking";
import { useAuth } from "@/hooks/useAuth";

interface PriceData {
  localPrice: number;
  localCurrency: string;
  koreanPrice: number;
  savingsAmount: number;
  productName: string;
  imageUrl?: string;
  comparisonSource: string;
  convertedLocalPrice: number; // 환율 변환된 현지 가격 (KRW)
  productLink?: string; // 한국 쇼핑몰 제품 링크
}

interface PriceComparisonProps {
  data: PriceData;
  onPurchase?: () => void;
  onViewSource?: () => void;
}

export default function PriceComparison({ data, onPurchase, onViewSource }: PriceComparisonProps) {
  const { localPrice, localCurrency, koreanPrice, savingsAmount, productName, imageUrl, comparisonSource, convertedLocalPrice, productLink } = data;
  const [quantity, setQuantity] = useState(1);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [localUsageStats, setLocalUsageStats] = useState<UsageStats>(getCurrentUsageStats());
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // localStorage 사용량 상태 동기화
  useEffect(() => {
    const stats = getCurrentUsageStats();
    setLocalUsageStats(stats);
  }, []);
  
  // 서버에서 현재 사용량 조회
  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ['/api/usage/current'],
    queryFn: () => fetch('/api/usage/current').then(res => res.json()),
  });

  const dailyUsage = usageData?.data?.currentUsage || 0;
  const DAILY_LIMIT = usageData?.data?.dailyLimit || 5;

  // 사용량 증가 뮤테이션
  const usageCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/usage/check', {});
      return await response.json();
    },
    onSuccess: () => {
      // 데이터 새로고침만 담당 (UI 제어는 handleKoreanPriceView에서만)
      refetchUsage();
    },
    onError: (error) => {
      console.error('Usage check failed:', error);
      toast({
        title: "오류 발생",
        description: "사용량 확인 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // DB 저장 뮤테이션 (로그인 사용자만)
  const savePriceComparisonMutation = useMutation({
    mutationFn: async (comparisonData: {
      productName: string;
      localPrice: number;
      localCurrency: string;
      koreanPrice: number;
      savingsAmount: number;
      convertedLocalPrice: number;
      productLink?: string;
    }) => {
      const response = await apiRequest('POST', '/api/price-comparisons', comparisonData);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      // 가격 비교 기록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['/api/price-comparisons'] });
    },
    onError: (error: any) => {
      // 401 에러는 로그인 안 된 것이므로 무시 (정상 동작)
      if (error?.message?.includes('401')) {
        return;
      }
      console.error('Failed to save price comparison:', error);
      // DB 저장 실패 시에도 localStorage는 이미 저장되었으므로 계속 진행
    }
  });

  // Use converted local price in KRW directly
  const unitLocalKRW = convertedLocalPrice;
  
  // Calculate totals based on quantity
  const totalLocalPrice = localPrice * quantity;
  const totalKoreanPrice = koreanPrice * quantity;
  const totalLocalKRW = unitLocalKRW * quantity;
  const totalSavingsAmount = savingsAmount * quantity;
  
  const getSavingsMessage = () => {
    // Check if Korean price data is unavailable
    if (koreanPrice === 0) {
      return { 
        text: "한국에서 구할 수 없는걸 수도", 
        variant: "secondary" as const,
        bgColor: "bg-muted text-muted-foreground"
      };
    }
    
    // Calculate savings percentage: (koreanPrice - convertedPrice) / convertedPrice * 100
    // Positive = local cheaper (discount), Negative = Korea cheaper
    const savingsPercentage = totalLocalKRW === 0 ? 0 : (totalSavingsAmount / totalLocalKRW) * 100;
    
    if (savingsPercentage < 0) {
      // Korea is cheaper
      return { 
        text: "한국에서 사세요", 
        variant: "outline" as const,
        bgColor: "bg-muted text-foreground"
      };
    } else if (savingsPercentage < 5) {
      // Less than 5% savings - not worth the hassle
      const messages = [
        "구지 힘들게 이걸 사?",
        "수하물 무게는 넉넉하니?"
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      return { 
        text: randomMessage, 
        variant: "secondary" as const,
        bgColor: "bg-muted text-muted-foreground"
      };
    } else if (savingsPercentage < 15) {
      // 5% to 15% savings - good deal
      return { 
        text: "여기서 사는게 이득", 
        variant: "default" as const,
        bgColor: "bg-muted text-foreground"
      };
    } else {
      // 15%+ savings - excellent deal
      return { 
        text: "다 쓸어 담어", 
        variant: "default" as const,
        bgColor: "bg-muted text-foreground"
      };
    }
  };

  const message = getSavingsMessage();
  const savingsIcon = totalSavingsAmount > 0 ? TrendingDown : totalSavingsAmount < 0 ? TrendingUp : Minus;
  const SavingsIcon = savingsIcon;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        {imageUrl && !imageError && (
          <div className="mb-4">
            <img 
              src={imageUrl} 
              alt={productName}
              className="w-full h-48 rounded-lg object-cover bg-muted"
              onError={(e) => {
                console.error('[MUBU] Image load failed:', imageUrl);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('[MUBU] Image loaded successfully:', imageUrl);
              }}
            />
          </div>
        )}
        <div>
          <CardTitle className="text-xl font-medium mb-2" data-testid="text-product-name">
            {productName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            출처: {comparisonSource}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quantity Selector */}
        <div className="flex items-center justify-center gap-4 bg-muted/50 rounded-lg p-3">
          <span className="text-sm font-medium">수량</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              data-testid="button-quantity-decrease"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold min-w-[2rem] text-center" data-testid="text-quantity">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(Math.min(99, quantity + 1))}
              data-testid="button-quantity-increase"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Unit Price Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">현지 단가</p>
            <p className="text-lg font-bold" data-testid="text-local-unit-price">
              {localPrice.toLocaleString()}{localCurrency}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">한국 단가</p>
            <p className="text-lg font-bold" data-testid="text-korean-unit-price">
              ₩{koreanPrice.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Price Comparison */}
        <div className="grid grid-cols-2 gap-4 border-t pt-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">현지 총액</p>
            <p className="text-lg font-bold text-foreground" data-testid="text-local-total-price">
              {totalLocalPrice.toLocaleString()}{localCurrency}
            </p>
            <p className="text-lg font-bold text-muted-foreground" data-testid="text-local-total-krw">
              ₩{totalLocalKRW.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">한국 총액</p>
            <p className="text-xl font-bold text-foreground" data-testid="text-korean-total-price">
              ₩{totalKoreanPrice.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Savings Indicator */}
        <div className={`rounded-lg p-4 text-center ${message.bgColor}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <SavingsIcon className="h-5 w-5" />
            <span className="text-lg font-semibold" data-testid="text-total-savings-amount">
              {totalSavingsAmount >= 0 
                ? `총 절약 ${Math.abs(totalSavingsAmount).toLocaleString()}원` 
                : `총 추가비용 ${Math.abs(totalSavingsAmount).toLocaleString()}원`
              }
            </span>
          </div>
          {quantity > 1 && (
            <p className="text-sm text-muted-foreground mb-1">
              개당 {savingsAmount >= 0 ? '절약' : '추가비용'}: {Math.abs(savingsAmount).toLocaleString()}원
            </p>
          )}
          <p className="text-lg font-medium" data-testid="text-savings-message">
            {message.text}
          </p>
        </div>

        {/* 무료 사용량 제한 알림 - localStorage 기반 */}
        {localUsageStats.uses >= HARD_WALL_THRESHOLD - 1 && (
          <div className="bg-muted border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {localUsageStats.uses >= HARD_WALL_THRESHOLD 
                    ? `일일 한도 ${HARD_WALL_THRESHOLD.toLocaleString()}회 도달!` 
                    : `무료 사용 ${localUsageStats.uses.toLocaleString()}/${HARD_WALL_THRESHOLD.toLocaleString()}회`
                  }
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => setIsPremiumModalOpen(true)}
                data-testid="button-upgrade-premium"
              >
                업그레이드
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              프리미엄으로 무제한 가격 비교하고 더 많이 절약하세요!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleKoreanPriceView()}
            className="flex gap-2"
            data-testid="button-view-source"
          >
            <ExternalLink className="h-4 w-4" />
            한국가격 보기
          </Button>
          <Button 
            onClick={onPurchase}
            className="flex gap-2"
            data-testid="button-purchase"
          >
            <Check className="h-4 w-4" />
            구매함
          </Button>
        </div>

        {/* 제휴 고지 및 면책 문구 */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1" data-testid="text-affiliate-notice">
            <Info className="h-3 w-3" />
            해당 링크를 통해 구매 시 소정의 수수료를 받을 수 있습니다
          </p>
          <p className="text-xs text-muted-foreground text-center" data-testid="text-price-disclaimer">
            ※ 가격 및 환율은 실시간 변동 가능하며, 동일 모델/옵션 기준으로 비교되었습니다
          </p>
        </div>
      </CardContent>

      {/* 프리미엄 모달 */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        currentUsage={localUsageStats.uses}
        dailyLimit={HARD_WALL_THRESHOLD}
      />

      {/* 로그인 유도 모달 (Soft Wall) */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-foreground" />
              지금까지 ₩{localUsageStats.totalSavings.toLocaleString()} 아꼈어요!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-foreground" />
              <div className="mb-2">
                <div className="text-xs text-muted-foreground mb-1">
                  {localUsageStats.uses}/{HARD_WALL_THRESHOLD} 무료 사용 ({HARD_WALL_THRESHOLD - localUsageStats.uses}회 남음)
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div 
                    className="bg-foreground h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((localUsageStats.uses / HARD_WALL_THRESHOLD) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                로그인하면 절약 기록 보관, 기기 동기화, 광고 제거 7일 체험!
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => {
                  // TODO: Replit 로그인 연결
                  toast({ title: "로그인 기능", description: "Replit 로그인 연결 예정" });
                  setIsLoginModalOpen(false);
                }}
                data-testid="button-login-replit"
              >
                <User className="mr-2 h-4 w-4" />
                Replit으로 계속하기
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsLoginModalOpen(false)}
                data-testid="button-login-later"
              >
                나중에 하기
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              로그인 없이도 계속 사용 가능합니다
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );

  /**
   * 한국 가격 보기 - localStorage + DB 동시 저장 (로그인 시)
   * 비로그인: localStorage만 저장
   * 로그인: DB + localStorage 동시 저장
   */
  async function handleKoreanPriceView() {
    try {
      // 1. localStorage 기반 Soft Wall 체크 (클라이언트 우선)
      const currentStats = getCurrentUsageStats();
      
      if (currentStats.needsPremium) {
        // Hard Wall: 500회 이상 - 프리미엄 필수
        setIsPremiumModalOpen(true);
        return;
      }
      
      if (currentStats.needsLogin) {
        // Soft Wall: 500회 - 로그인 유도하되 계속 사용 가능
        setIsLoginModalOpen(true);
      }

      // 2. localStorage 카운트 증가 (항상 수행)
      const updatedStats = incrementUsage(Math.abs(totalSavingsAmount));
      setLocalUsageStats(updatedStats);
      
      // 커스텀 이벤트 발생 (App.tsx가 totalSavings 업데이트할 수 있도록)
      window.dispatchEvent(new CustomEvent('mubu-savings-updated', { 
        detail: { totalSavings: updatedStats.totalSavings, uses: updatedStats.uses }
      }));

      // 3. DB 저장 시도 (로그인 여부와 관계없이 항상 시도)
      // - 로그인된 경우: 성공적으로 저장
      // - 비로그인 경우: 401 에러 발생 → mutation의 onError에서 무시
      // - 로딩 중: 401 에러 발생 → mutation의 onError에서 무시
      try {
        await savePriceComparisonMutation.mutateAsync({
          productName,
          localPrice,
          localCurrency,
          koreanPrice,
          savingsAmount,
          convertedLocalPrice,
          productLink,
        });
      } catch (dbError) {
        // 에러는 mutation의 onError에서 처리되므로 여기서는 무시
        // localStorage는 이미 저장되었으므로 계속 진행
      }

      // 4. 제품 링크 URL 결정 (productLink가 있으면 사용, 없으면 네이버 쇼핑 검색)
      const targetUrl = productLink || `https://shopping.naver.com/search?query=${encodeURIComponent(productName)}`;
      
      // 5. 새 탭에서 열기 (팝업 차단 방지를 위해 a 태그 사용)
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      
      // 6. 성공 메시지
      toast({
        title: "한국 가격 확인",
        description: productLink ? "제품 페이지로 이동합니다!" : "네이버 쇼핑에서 검색 결과를 확인하세요!",
      });

      // 7. onViewSource 콜백 호출 (기존 기능 유지)
      if (onViewSource) {
        onViewSource();
      }
    } catch (error) {
      console.error('Error handling Korean price view:', error);
      toast({
        title: "오류 발생",
        description: "가격 확인 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }
}