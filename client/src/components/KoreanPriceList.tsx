import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink, Star } from "lucide-react";

interface PriceItem {
  source: string;
  price: number;
  url: string;
  rating?: number;
  reviewCount?: number;
  shipping?: string;
  seller?: string;
}

interface KoreanPriceListProps {
  productName: string;
  prices: PriceItem[];
  onClose: () => void;
}

export default function KoreanPriceList({ productName, prices, onClose }: KoreanPriceListProps) {
  const sortedPrices = [...prices].sort((a, b) => a.price - b.price);

  const handleVisitStore = (url: string, source: string) => {
    console.log(`Opening ${source}: ${url}`);
    // todo: remove mock functionality - in real app would open external URL
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold line-clamp-1" data-testid="text-price-list-title">
              {productName}
            </h2>
            <p className="text-sm text-muted-foreground">한국 최저가 비교</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-price-list">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Price List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {sortedPrices.map((item, index) => (
              <Card key={index} className="hover-elevate" data-testid={`price-item-${index}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-base" data-testid={`price-source-${index}`}>
                          {item.source}
                        </span>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            최저가
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-2xl font-bold text-primary" data-testid={`price-amount-${index}`}>
                        ₩{item.price.toLocaleString()}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{item.rating}</span>
                            {item.reviewCount && (
                              <span>({item.reviewCount.toLocaleString()})</span>
                            )}
                          </div>
                        )}
                        {item.shipping && (
                          <Badge variant="outline" className="text-xs">
                            {item.shipping}
                          </Badge>
                        )}
                      </div>
                      
                      {item.seller && (
                        <p className="text-sm text-muted-foreground mt-1">
                          판매자: {item.seller}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleVisitStore(item.url, item.source)}
                      className="flex-shrink-0"
                      data-testid={`button-visit-${index}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      보러가기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {sortedPrices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>검색 결과가 없습니다.</p>
              <p className="text-sm mt-1">다른 상품명으로 다시 시도해보세요.</p>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {sortedPrices.length > 0 && (
          <div className="p-4 border-t bg-muted/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                총 {sortedPrices.length}개 쇼핑몰에서 검색된 결과
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                최저가: ₩{sortedPrices[0].price.toLocaleString()} ({sortedPrices[0].source})
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}