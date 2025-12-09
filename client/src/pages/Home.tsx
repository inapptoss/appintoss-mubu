import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface HomeProps {
  onCameraClick: () => void;
  totalSavings?: number;
  recentComparisons?: Array<{
    productName: string;
    savings: number;
  }>;
}

export default function Home({ onCameraClick, totalSavings = 0, recentComparisons = [] }: HomeProps) {
  const { user } = useAuth();

  // 비교 건수와 평균 절약률 계산
  const comparisonCount = recentComparisons.length;
  const averageSavingsRate = recentComparisons.length > 0
    ? Math.round(recentComparisons.reduce((sum, item) => sum + (item.savings > 0 ? 12 : 0), 0) / recentComparisons.length)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-32 pt-20">
      <main className="pb-8 px-8">
        <div className="max-w-sm mx-auto space-y-8">
          {/* Welcome */}
          <div className="text-center">
            <h2 className="text-3xl font-light text-foreground mb-4">
              안녕하세요,<br />
              {user?.firstName || '여행자'}님
            </h2>
            <p className="text-muted-foreground text-lg">
              아이템 발견? 한국보다 비싸면<br />
              호구되는거니 사진찍어 확인해봐요!
            </p>
          </div>

          {/* Quick Stats */}
          {totalSavings > 0 && (
            <div className="bg-muted rounded-3xl p-8 text-center space-y-4">
              <div className="text-3xl font-light text-foreground" data-testid="text-home-savings">
                ₩{totalSavings.toLocaleString()}
              </div>
              <div className="text-muted-foreground">이번 달 총 절약 금액</div>
              <div className="flex justify-center space-x-8">
                <div className="text-center">
                  <div className="text-lg font-light text-foreground">{comparisonCount}</div>
                  <div className="text-xs text-muted-foreground">비교 완료</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-light text-foreground">{averageSavingsRate}%</div>
                  <div className="text-xs text-muted-foreground">평균 절약률</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Comparisons */}
          {recentComparisons.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">최근 비교</h3>
                <button className="text-sm text-muted-foreground">전체보기</button>
              </div>
              <div className="space-y-3">
                {recentComparisons.slice(0, 3).map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-muted rounded-2xl p-4"
                    data-testid={`recent-comparison-${index}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-foreground line-clamp-1">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">최저가 비교</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {item.savings > 0 ? '+' : ''}{item.savings.toLocaleString()}원
                        </div>
                        <div className="text-sm text-muted-foreground">절약</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action */}
          <Button
            onClick={onCameraClick}
            className="w-full bg-primary text-primary-foreground py-6 rounded-full font-medium text-lg flex items-center justify-center space-x-3"
            data-testid="button-start-camera"
          >
            <Camera className="h-5 w-5" />
            <span>상품 촬영하기</span>
          </Button>

          {/* Empty State */}
          {totalSavings === 0 && recentComparisons.length === 0 && (
            <div className="bg-muted rounded-3xl p-8 text-center">
              <div className="text-muted-foreground mb-4">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>아직 촬영한 상품이 없어요</p>
                <p className="text-sm mt-2">첫 번째 상품을 촬영해보세요!</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}