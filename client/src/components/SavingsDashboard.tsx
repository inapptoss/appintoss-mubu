import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plane, Trophy, TrendingUp, ShoppingBag } from "lucide-react";

interface SavingsData {
  totalSavings: number;
  flightCost: number;
  purchaseCount: number;
  averageSavings: number;
  recentPurchases: Array<{
    productName: string;
    savings: number;
    date: string;
    quantity?: number;
    unitPrice?: number;
    koreanPrice?: number;
  }>;
}

interface SavingsDashboardProps {
  data: SavingsData;
}

export default function SavingsDashboard({ data }: SavingsDashboardProps) {
  const { totalSavings, flightCost, purchaseCount, averageSavings, recentPurchases } = data;
  const progressPercentage = Math.min((totalSavings / flightCost) * 100, 100);
  const remainingAmount = Math.max(flightCost - totalSavings, 0);

  return (
    <div className="space-y-6">
      {/* 비행기값 벌기 챌린지 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            비행기값 벌기 챌린지
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary" data-testid="text-total-savings">
              ₩{totalSavings.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">총 절약 금액</p>
          </div>
          
          <Progress value={progressPercentage} className="h-3" />
          
          <div className="flex justify-between text-sm">
            <span data-testid="text-progress-percentage">{progressPercentage.toFixed(1)}% 달성</span>
            <span>목표: ₩{flightCost.toLocaleString()}</span>
          </div>
          
          {remainingAmount > 0 ? (
            <p className="text-center text-muted-foreground" data-testid="text-remaining-amount">
              목표까지 ₩{remainingAmount.toLocaleString()} 남음!
            </p>
          ) : (
            <Badge variant="default" className="w-full justify-center py-2">
              <Trophy className="h-4 w-4 mr-2" />
              축하합니다! 비행기값을 모두 벌었어요!
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold" data-testid="text-purchase-count">{purchaseCount}</p>
            <p className="text-sm text-muted-foreground">구매 횟수</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold" data-testid="text-average-savings">₩{averageSavings.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">평균 절약</p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 구매 내역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">최근 구매 내역</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentPurchases.length > 0 ? (
            recentPurchases.map((purchase, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between py-3 border-b last:border-0"
                data-testid={`purchase-item-${index}`}
              >
                <div className="flex-1">
                  <p className="font-medium line-clamp-1">{purchase.productName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{purchase.date}</span>
                    {purchase.quantity && (
                      <>
                        <span>•</span>
                        <span data-testid={`quantity-${index}`}>수량: {purchase.quantity}개</span>
                      </>
                    )}
                  </div>
                  {purchase.quantity && purchase.unitPrice && purchase.koreanPrice && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>현지 {purchase.unitPrice.toLocaleString()}฿ × {purchase.quantity} = {(purchase.unitPrice * purchase.quantity).toLocaleString()}฿</span>
                      <span className="mx-2">vs</span>
                      <span>한국 ₩{(purchase.koreanPrice * purchase.quantity).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <Badge 
                    variant={purchase.savings > 0 ? "default" : "secondary"}
                    className="mb-1"
                    data-testid={`savings-${index}`}
                  >
                    {purchase.savings > 0 ? '+' : ''}{purchase.savings.toLocaleString()}원
                  </Badge>
                  {purchase.quantity && purchase.quantity > 1 && (
                    <p className="text-xs text-muted-foreground">
                      개당 {(purchase.savings / purchase.quantity).toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">
              아직 구매 내역이 없어요. 첫 번째 상품을 촬영해보세요!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}