/**
 * MUBU 프리미엄 업셀 모달
 * 여행자를 위한 맞춤형 결제 플랜
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Map, TrendingUp, X, CreditCard, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUsageStats, HARD_WALL_THRESHOLD } from '@/lib/usage-tracking';

// 아임포트 Window 타입 정의
declare global {
  interface Window {
    IMP?: {
      init: (userCode: string) => void;
      request_pay: (data: any, callback: (response: any) => void) => void;
    };
  }
}

interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  badge?: string;
  badgeColor?: string;
  recommended?: boolean;
}

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage?: number;
  dailyLimit?: number;
}

const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'daily',
    name: '여행자 일일 패스',
    price: 2900,
    duration: '24시간',
    badge: '빠른 시작',
    badgeColor: 'bg-green-500',
    features: [
      '24시간 무제한 가격 비교',
      '실시간 환율 변환',
      '절약 통계 대시보드',
      '제휴 할인 링크 제공'
    ]
  },
  {
    id: 'weekly',
    name: '여행 패키지',
    price: 9900,
    duration: '7일간',
    badge: '가장 인기',
    badgeColor: 'bg-foreground',
    recommended: true,
    features: [
      '7일간 무제한 가격 비교',
      '오프라인 저장 기능',
      '여행 쇼핑 리포트 PDF',
      '제휴 할인 우선 알림',
      '24/7 카카오톡 지원'
    ]
  },
  {
    id: 'monthly',
    name: '월간 무제한',
    price: 19900,
    duration: '30일간',
    badge: '최고 가성비',
    badgeColor: 'bg-blue-500',
    features: [
      '30일간 무제한 가격 비교',
      '고급 통계 및 분석',
      '여행 소비 패턴 분석',
      'VIP 제휴 할인 (최대 15%)',
      '우선 고객 지원',
      '여행자 커뮤니티 액세스'
    ]
  }
];

export default function PremiumModal({ isOpen, onClose, currentUsage, dailyLimit }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localUsage, setLocalUsage] = useState(0);
  const { toast } = useToast();

  // localStorage에서 실제 사용량 가져오기
  useEffect(() => {
    const stats = getCurrentUsageStats();
    setLocalUsage(stats.uses);
  }, [isOpen]);

  // localStorage 기반 사용량 사용 (서버 데이터는 무시)
  const effectiveUsage = localUsage;
  const effectiveLimit = HARD_WALL_THRESHOLD;

  // 사용량 초과 여부 확인
  const isLimitExceeded = effectiveUsage >= effectiveLimit;

  const handlePlanSelect = (plan: PremiumPlan) => {
    setSelectedPlan(plan);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);

    try {
      // 사용자 지역 감지 (간단한 구현)
      const isDomestic = navigator.language.includes('ko') || window.location.href.includes('localhost');

      if (isDomestic) {
        // 국내 사용자 - 아임포트 결제
        await processIamportPayment(selectedPlan);
      } else {
        // 해외 사용자 - Stripe 결제
        await processStripePayment(selectedPlan);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "결제 실패",
        description: "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processIamportPayment = async (plan: PremiumPlan) => {
    if (!window.IMP) {
      throw new Error('아임포트 SDK가 로드되지 않았습니다.');
    }

    // 아임포트 초기화 (실제 가맹점 코드로 교체 필요)
    window.IMP.init('iamport_test_code');

    // 결제 데이터 준비
    const paymentData = {
      pg: 'html5_inicis',
      pay_method: 'card',
      merchant_uid: `mubu_${Date.now()}`,
      name: plan.name,
      amount: plan.price,
      buyer_email: 'traveler@mubu.app',
      buyer_name: '여행자',
      buyer_tel: '010-0000-0000',
      buyer_addr: '',
      buyer_postcode: '',
      m_redirect_url: window.location.href,
    };

    return new Promise((resolve, reject) => {
      window.IMP!.request_pay(paymentData, async (response: any) => {
        if (response.success) {
          try {
            // 서버에서 결제 검증
            const verifyResponse = await fetch('/api/payment/iamport/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                impUid: response.imp_uid,
                merchantUid: response.merchant_uid,
                amount: plan.price,
              }),
            });

            const verifyResult = await verifyResponse.json();

            if (verifyResult.success) {
              toast({
                title: "결제 완료",
                description: `${plan.name}이 활성화되었습니다. 즐거운 여행 쇼핑 되세요!`,
              });
              onClose();
              resolve(response);
            } else {
              throw new Error('결제 검증 실패');
            }
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(response.error_msg || '결제가 취소되었습니다.'));
        }
      });
    });
  };

  const processStripePayment = async (plan: PremiumPlan) => {
    // Stripe 결제 구현 (향후 구현)
    toast({
      title: "준비 중입니다",
      description: "해외 결제는 곧 지원될 예정입니다.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[calc(100vh-6rem)] overflow-y-auto top-24 translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              MUBU 프리미엄으로 업그레이드
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-premium">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isLimitExceeded && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-foreground">
                일일 검색 한도 ({effectiveLimit}회)에 도달했습니다. 프리미엄으로 무제한 이용하세요!
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* 플랜 카드들 */}
          <div className="grid md:grid-cols-3 gap-4">
            {PREMIUM_PLANS.map((plan) => (
              <Card 
                key={plan.id} 
                className={`cursor-pointer transition-all duration-200 ${
                  selectedPlan?.id === plan.id 
                    ? 'ring-2 ring-foreground shadow-lg' 
                    : 'hover-elevate'
                } ${plan.recommended ? 'scale-105 border-border' : ''}`}
                onClick={() => handlePlanSelect(plan)}
                data-testid={`card-plan-${plan.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.badge && (
                      <Badge className={`${plan.badgeColor} text-white text-xs`}>
                        {plan.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      ₩{plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {plan.duration}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 선택된 플랜 결제 섹션 */}
          {selectedPlan && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                결제 수단 선택
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-white dark:bg-gray-800">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">카카오페이 · 토스</p>
                    <p className="text-xs text-muted-foreground">간편결제</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-white dark:bg-gray-800">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">신용카드</p>
                    <p className="text-xs text-muted-foreground">모든 카드 지원</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full"
                data-testid="button-confirm-payment"
              >
                {isProcessing ? '결제 처리 중...' : `₩${selectedPlan.price.toLocaleString()} 결제하기`}
              </Button>
            </div>
          )}

          {/* 혜택 요약 */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <Clock className="h-8 w-8 text-foreground mx-auto mb-2" />
              <p className="font-medium text-sm">즉시 활성화</p>
              <p className="text-xs text-muted-foreground">결제 후 바로 이용</p>
            </div>
            <div className="text-center">
              <Map className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-medium text-sm">전 세계 여행</p>
              <p className="text-xs text-muted-foreground">어디서나 가격 비교</p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-sm">절약 보장</p>
              <p className="text-xs text-muted-foreground">평균 30% 절약</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}