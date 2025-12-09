import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useState, useEffect } from "react";
import { getCurrentUsageStats, savePriceComparison as saveToLocalStorage } from "@/lib/usage-tracking";
import { useAuth } from "@/hooks/useAuth";

import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import CameraCapture from "@/components/CameraCapture";
import PriceComparison from "@/components/PriceComparison";
import LoadingAnimation from "@/components/LoadingAnimation";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Footer from "@/components/Footer";

function Router() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [showCamera, setShowCamera] = useState(false);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'analyzing' | 'searching' | 'comparing'>('analyzing');
  const [totalSavings, setTotalSavings] = useState(0);
  const [priceData, setPriceData] = useState({
    localPrice: 0,
    localCurrency: '',
    koreanPrice: 0,
    savingsAmount: 0,
    productName: '',
    imageUrl: '',
    comparisonSource: 'AI 가격 분석',
    convertedLocalPrice: 0,
    productLink: undefined as string | undefined
  });
  
  // localStorage에서 절약액 로드
  useEffect(() => {
    const updateSavings = () => {
      const stats = getCurrentUsageStats();
      setTotalSavings(stats.totalSavings);
    };
    
    updateSavings();
    
    // storage 이벤트 리스너 (다른 탭에서 변경시 감지)
    window.addEventListener('storage', updateSavings);
    
    // 커스텀 이벤트 리스너 (같은 페이지에서 localStorage 변경시 감지)
    const handleSavingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.totalSavings !== undefined) {
        setTotalSavings(customEvent.detail.totalSavings);
      }
    };
    window.addEventListener('mubu-savings-updated', handleSavingsUpdate);
    
    return () => {
      window.removeEventListener('storage', updateSavings);
      window.removeEventListener('mubu-savings-updated', handleSavingsUpdate);
    };
  }, []);
  
  const mockRecentComparisons = [
    { productName: 'Nike Air Force 1 운동화', savings: 19000 },
    { productName: 'Uniqlo 히트텍 티셔츠', savings: 8000 },
    { productName: 'Apple AirPods', savings: -5000 }
  ];

  // 검색 결과가 원래 제품과 관련있는지 검증하는 함수
  const isProductRelevant = (searchedProductName: string, foundProductName: string, brand?: string): boolean => {
    const searchLower = searchedProductName.toLowerCase();
    const foundLower = foundProductName.toLowerCase();
    
    // 브랜드가 있으면 브랜드 매칭 체크
    if (brand) {
      const brandLower = brand.toLowerCase();
      if (foundLower.includes(brandLower) || searchLower.includes(brandLower)) {
        console.log(`[MUBU] Brand match found: "${brand}" in search or result`);
        return true;
      }
    }
    
    // 검색어의 주요 키워드를 추출 (2글자 이상)
    const searchKeywords = searchLower.split(/\s+/).filter(word => word.length >= 2);
    
    // 키워드가 결과에 포함되는지 체크
    const matchCount = searchKeywords.filter(keyword => foundLower.includes(keyword)).length;
    const matchRatio = searchKeywords.length > 0 ? matchCount / searchKeywords.length : 0;
    
    console.log(`[MUBU] Relevance check: "${searchedProductName}" vs "${foundProductName}"`);
    console.log(`[MUBU] Keywords: [${searchKeywords.join(', ')}], matched ${matchCount}/${searchKeywords.length} (${Math.round(matchRatio * 100)}%)`);
    
    // 키워드 50% 이상 매칭되면 관련 제품으로 판단 (예: "농심 신라면 KPOP 대몬" 중 "신라면 KPOP" 2개 매칭 = 50% = PASS)
    const isRelevant = matchRatio >= 0.5;
    console.log(`[MUBU] ${isRelevant ? 'PASS' : 'FAIL'} - Product relevance check (threshold: 50%)`);
    return isRelevant;
  };

  const handleCameraCapture = async (data: {
    productImage: File;
    productName: string;
    productNameKorean: string;
    price: number;
    currency: string;
    currencySymbol: string;
    priceTagDetected: boolean;
  }) => {
    console.log('[MUBU] Product captured:', data.productName, data.price, data.currencySymbol);
    setShowCamera(false);
    
    // Upload image to Object Storage for permanent URL
    let imageUrl = '';
    try {
      const formData = new FormData();
      formData.append('image', data.productImage);
      
      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const uploadResult = await uploadResponse.json();
      imageUrl = uploadResult.imageUrl;
      console.log('[MUBU] Image uploaded to Object Storage:', imageUrl);
    } catch (error) {
      console.error('[MUBU] Error uploading image:', error);
      // Fallback to Blob URL if upload fails
      imageUrl = URL.createObjectURL(data.productImage);
      console.log('[MUBU] Fallback to Blob URL:', imageUrl);
    }
    
    try {
      setIsLoading(true);
      setLoadingStage('searching');
      console.log('[MUBU] Starting price comparison...');
      
      try {
        console.log('[MUBU] Converting currency:', data.price, data.currency, '-> KRW');
        const conversionResponse = await fetch('/api/convert-currency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: data.price,
            fromCurrency: data.currency,
            toCurrency: 'KRW'
          })
        });
        
        if (conversionResponse.ok) {
          const conversionResult = await conversionResponse.json();
          console.log('[MUBU] Currency conversion result:', conversionResult);
          
          if (conversionResult.success) {
            const convertedPrice = conversionResult.data.toAmount;
            
            // 한국 가격 검색 단계
            setLoadingStage('searching');
            let koreanPrice = 0;
            let comparisonSource = '';
            let priceFound = false;
            
            try {
              console.log('[MUBU] Searching Korean shopping platforms...');
              console.log(`[MUBU] Using Korean name for search: "${data.productNameKorean}"`);
              const koreanSearchResponse = await fetch('/api/search-all-korean-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  productName: data.productNameKorean,
                  maxResults: 3
                })
              });
              
              if (koreanSearchResponse.ok) {
                const koreanSearchResult = await koreanSearchResponse.json();
                console.log('[MUBU] Multi-platform shopping search result:', koreanSearchResult);
                
                if (koreanSearchResult.success && koreanSearchResult.data.items.length > 0) {
                  // 1단계: 가격 필터 (10,000원 이상 제품 우선)
                  const mainProducts = koreanSearchResult.data.items.filter((item: any) => item.price > 10000);
                  
                  // 2단계: 관련성 검증 - 검색 결과가 실제 제품과 관련있는지 확인
                  const relevantProducts = (mainProducts.length > 0 ? mainProducts : koreanSearchResult.data.items).filter((item: any) => {
                    return isProductRelevant(data.productNameKorean, item.productName, item.brand);
                  });
                  
                  if (relevantProducts.length > 0) {
                    // 관련있는 제품 중 최저가 선택
                    const lowestPriceItem = relevantProducts[0];
                    koreanPrice = lowestPriceItem.price;
                    const source = lowestPriceItem.source || 'unknown';
                    comparisonSource = lowestPriceItem.mallName || source;
                    priceFound = true;
                    
                    // 제품 링크 저장 (affiliateLink 우선, 없으면 일반 link)
                    const productLink = lowestPriceItem.affiliateLink || lowestPriceItem.link;
                    console.log(`[MUBU] ✅ Found relevant Korean price: ${koreanPrice}원 from ${lowestPriceItem.mallName} (${source})`);
                    console.log(`[MUBU] 🔗 Product link: ${productLink}`);
                    
                    // priceData에 링크 포함
                    setPriceData({
                      productName: data.productName,
                      localPrice: data.price,
                      localCurrency: data.currencySymbol,
                      koreanPrice: koreanPrice,
                      savingsAmount: koreanPrice - convertedPrice,
                      imageUrl: imageUrl,
                      comparisonSource: comparisonSource,
                      convertedLocalPrice: convertedPrice,
                      productLink: productLink
                    });
                    
                    setIsLoading(false);
                    setShowPriceComparison(true);
                    return;
                  } else {
                    console.warn(`[MUBU] ❌ Search returned ${koreanSearchResult.data.items.length} items but none were relevant to "${data.productNameKorean}"`);
                    comparisonSource = '한국 가격 정보 없음';
                  }
                } else {
                  console.warn('[MUBU] No Korean price found for product:', data.productName);
                  comparisonSource = '한국 가격 정보 없음';
                }
              } else {
                console.error('[MUBU] Korean search API failed:', koreanSearchResponse.status);
                comparisonSource = '한국 가격 조회 실패';
              }
            } catch (koreanSearchError) {
              console.error('[MUBU] Korean price search failed:', koreanSearchError);
              comparisonSource = '한국 가격 조회 실패';
            }
            
            // 가격 비교 단계
            setLoadingStage('comparing');
            const savings = priceFound ? koreanPrice - convertedPrice : 0;
            
            if (priceFound) {
              console.log(`[MUBU] Price comparison: ${convertedPrice} KRW (converted) vs ${koreanPrice} KRW (Korean), savings: ${savings}`);
            } else {
              console.log(`[MUBU] Price comparison skipped: Korean price not available`);
            }
            
            setPriceData({
              productName: data.productName,
              localPrice: data.price,
              localCurrency: data.currencySymbol,
              koreanPrice: priceFound ? koreanPrice : 0,
              savingsAmount: priceFound ? savings : 0,
              imageUrl: imageUrl,
              comparisonSource: comparisonSource || 'AI 가격 분석',
              convertedLocalPrice: convertedPrice,
              productLink: undefined
            });
            
            setIsLoading(false);
            setShowPriceComparison(true);
          } else {
            console.error('[MUBU] Currency conversion returned success=false:', conversionResult);
            setPriceData({
              productName: data.productName,
              localPrice: data.price,
              localCurrency: data.currencySymbol,
              koreanPrice: 0,
              savingsAmount: 0,
              imageUrl: imageUrl,
              comparisonSource: 'AI 가격 분석',
              convertedLocalPrice: 0,
              productLink: undefined
            });
            setIsLoading(false);
            setShowPriceComparison(true);
          }
        } else {
          console.error('[MUBU] Currency conversion API failed:', conversionResponse.status);
          setPriceData({
            productName: data.productName,
            localPrice: data.price,
            localCurrency: data.currencySymbol,
            koreanPrice: 0,
            savingsAmount: 0,
            imageUrl: imageUrl,
            comparisonSource: 'AI 가격 분석',
            convertedLocalPrice: 0,
            productLink: undefined
          });
          setIsLoading(false);
          setShowPriceComparison(true);
        }
      } catch (conversionError) {
        console.error('[MUBU] Currency conversion failed:', conversionError);
        setPriceData({
          productName: data.productName,
          localPrice: data.price,
          localCurrency: data.currencySymbol,
          koreanPrice: 0,
          savingsAmount: 0,
          imageUrl: imageUrl,
          comparisonSource: 'AI 가격 분석',
          convertedLocalPrice: 0,
          productLink: undefined
        });
        setIsLoading(false);
        setShowPriceComparison(true);
      }
    } catch (error) {
      console.error('[MUBU] Error in price comparison:', error);
      setPriceData({
        productName: data.productName,
        localPrice: data.price,
        localCurrency: data.currencySymbol,
        koreanPrice: 0,
        savingsAmount: 0,
        imageUrl: imageUrl,
        comparisonSource: '한국 가격 조회 실패',
        convertedLocalPrice: 0,
        productLink: undefined
      });
      setIsLoading(false);
      setShowPriceComparison(true);
    }
  };

  // DB 저장 mutation (로그인된 사용자만)
  const savePriceComparisonMutation = useMutation({
    mutationFn: async (comparisonData: {
      productName: string;
      productImageUrl: string;
      localPrice: number;
      localCurrency: string;
      koreaPrice: number | null;
      convertedLocalPrice: number;
      savingsAmount: number;
      productLink?: string;
      status: 'completed';
    }) => {
      const response = await apiRequest('POST', '/api/price-comparisons', comparisonData);
      return await response.json();
    },
    onSuccess: () => {
      // 가격 비교 기록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['/api/price-comparisons'] });
      // 사용자 정보도 갱신 (total_savings가 업데이트되므로)
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      console.error('Failed to save price comparison:', error);
    }
  });

  const handlePurchaseConfirm = async () => {
    console.log('Purchase confirmed');
    setShowPriceComparison(false);
    
    // 1. localStorage에 가격 비교 내역 저장 (모든 사용자)
    saveToLocalStorage({
      productName: priceData.productName,
      productImageUrl: priceData.imageUrl || '',
      localPrice: priceData.localPrice,
      localCurrency: priceData.localCurrency,
      koreaPrice: priceData.koreanPrice || 0,
      savingsAmount: priceData.savingsAmount,
      convertedLocalPrice: priceData.convertedLocalPrice
    });
    
    // 2. 로그인된 사용자는 DB에도 저장
    if (isAuthenticated) {
      try {
        await savePriceComparisonMutation.mutateAsync({
          productName: priceData.productName,
          productImageUrl: priceData.imageUrl || '',
          localPrice: priceData.localPrice,
          localCurrency: priceData.localCurrency,
          koreaPrice: priceData.koreanPrice || null,
          convertedLocalPrice: priceData.convertedLocalPrice,
          savingsAmount: priceData.savingsAmount,
          productLink: priceData.productLink,
          status: 'completed'
        });
      } catch (error) {
        console.error('[MUBU] DB 저장 실패:', error);
      }
    }
    
    // 3. totalSavings 갱신
    const stats = getCurrentUsageStats();
    setTotalSavings(stats.totalSavings);
    
    setCurrentView('dashboard');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <Home 
            onCameraClick={() => setShowCamera(true)}
            totalSavings={totalSavings}
            recentComparisons={mockRecentComparisons}
          />
        );
      case 'dashboard':
        return <Dashboard />;
      case 'profile':
        return <Profile />;
      default:
        return (
          <Home 
            onCameraClick={() => setShowCamera(true)}
            totalSavings={totalSavings}
            recentComparisons={mockRecentComparisons}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-24">
        {renderCurrentView()}
      </main>

      <Footer />

      <BottomNavigation
        activeTab={currentView}
        onTabChange={setCurrentView}
        onCameraClick={() => setShowCamera(true)}
      />

      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      {showPriceComparison && (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
          <PriceComparison
            data={priceData}
            onPurchase={handlePurchaseConfirm}
            onViewSource={() => {
              console.log('View Korean price source');
            }}
          />
        </div>
      )}

      {/* MUBU 로딩 애니메이션 */}
      <LoadingAnimation 
        isVisible={isLoading}
        stage={loadingStage}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light" 
        enableSystem={false}
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}