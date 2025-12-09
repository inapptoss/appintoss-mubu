import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Camera, ShoppingBag, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { PriceComparison } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getPriceComparisons as getLocalComparisons, type LocalPriceComparison } from "@/lib/usage-tracking";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [localComparisons, setLocalComparisons] = useState<LocalPriceComparison[]>([]);

  // DB 가격 비교 기록 가져오기 (로그인 사용자)
  const { data: dbComparisons = [], isLoading } = useQuery<PriceComparison[]>({
    queryKey: ['/api/price-comparisons'],
    enabled: !!user,
  });

  // localStorage 가격 비교 기록 가져오기 (모든 사용자)
  useEffect(() => {
    setLocalComparisons(getLocalComparisons());
  }, []);

  // 로그인 여부에 따라 표시할 데이터 선택
  const priceComparisons = user ? dbComparisons : localComparisons;

  // 실제 절약액 합계 계산 (양수만)
  const totalSavings = priceComparisons.reduce((sum, item) => {
    const savings = item.savingsAmount || 0;
    return savings > 0 ? sum + savings : sum;
  }, 0);
  
  const comparisonCount = priceComparisons.length;

  return (
    <main className="min-h-screen bg-background pb-32 pt-20">
      <div className="pb-8 px-8">
        <div className="max-w-sm mx-auto space-y-8">
          {/* Total Savings Card */}
          <div className="bg-muted rounded-3xl p-8 text-center space-y-4">
            <div className="text-3xl font-light text-foreground" data-testid="text-dashboard-savings">
              ₩{totalSavings.toLocaleString()}
            </div>
            <div className="text-muted-foreground">총 절약 금액</div>
            <div className="flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-lg font-light text-foreground">{comparisonCount}</div>
                <div className="text-xs text-muted-foreground">비교 완료</div>
              </div>
              {totalSavings > 0 && (
                <div className="text-center">
                  <div className="text-lg font-light text-foreground">
                    {Math.min(100, Math.round((totalSavings / 500000) * 100))}%
                  </div>
                  <div className="text-xs text-muted-foreground">항공권 챌린지</div>
                </div>
              )}
            </div>
          </div>

          {/* Price Comparison History */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              절약 내역
            </h3>
            {isLoading ? (
              <div className="bg-muted rounded-3xl p-8 text-center text-muted-foreground">
                불러오는 중...
              </div>
            ) : priceComparisons.length === 0 ? (
              <div className="bg-muted rounded-3xl p-8 text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">아직 가격 비교를 하지 않았어요</p>
                <p className="text-sm text-muted-foreground">상품을 촬영해서 가격을 비교해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priceComparisons.map((comparison) => {
                  const savings = comparison.savingsAmount || 0;
                  const isSaving = savings > 0;
                  
                  return (
                    <div 
                      key={comparison.id} 
                      className="bg-muted rounded-2xl p-4"
                      data-testid={`card-comparison-${comparison.id}`}
                    >
                      <div className="flex gap-3">
                        {/* Product Image */}
                        {comparison.productImageUrl && (
                          <div className="flex-shrink-0">
                            <img 
                              src={comparison.productImageUrl} 
                              alt={comparison.productName}
                              className="w-16 h-16 object-cover rounded-lg"
                              data-testid={`img-product-${comparison.id}`}
                              onError={(e) => {
                                // 이미지 로드 실패 시 숨김
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex justify-between items-center">
                          <div>
                            <h4 
                              className="font-medium text-foreground mb-1 line-clamp-1"
                              data-testid={`text-product-name-${comparison.id}`}
                            >
                              {comparison.productName}
                            </h4>
                            <div className="text-xs text-muted-foreground" data-testid={`text-date-${comparison.id}`}>
                              {comparison.createdAt && format(new Date(comparison.createdAt), 'M월 d일', { locale: ko })}
                            </div>
                          </div>
                          <div className="text-right">
                            {isSaving ? (
                              <div 
                                className="font-medium text-foreground"
                                data-testid={`text-savings-${comparison.id}`}
                              >
                                +₩{savings.toLocaleString()}
                              </div>
                            ) : (
                              <div 
                                className="font-medium text-muted-foreground"
                                data-testid={`text-loss-${comparison.id}`}
                              >
                                -₩{Math.abs(savings).toLocaleString()}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {isSaving ? '절약' : '손해'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Challenge Progress (if savings exist) */}
          {totalSavings > 0 && (
            <div className="bg-muted rounded-3xl p-8">
              <h3 className="text-lg font-medium text-foreground mb-4">항공권 챌린지</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">목표 ₩500,000</span>
                  <span className="font-medium text-foreground">
                    {Math.min(100, Math.round((totalSavings / 500000) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalSavings / 500000) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  남은 금액: ₩{Math.max(0, 500000 - totalSavings).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
