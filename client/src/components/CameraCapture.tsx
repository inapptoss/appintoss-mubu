import { Camera, Upload, X, Settings, Check, Edit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useRef, useEffect } from "react";

interface CameraCaptureProps {
  onCapture?: (data: ProductCaptureResult) => void;
  onClose?: () => void;
  isOpen: boolean;
}

interface ProductCaptureResult {
  productImage: File;
  productName: string;
  productNameKorean: string;
  price: number;
  currency: string;
  currencySymbol: string;
  priceTagDetected: boolean;
}

interface ProductAnalysisResult {
  product: {
    name: string;
    nameEnglish: string;
    nameKorean: string;
    brand?: string;
    description?: string;
  };
  priceTag: {
    detected: boolean;
    price?: number;
    currency?: string;
    currencySymbol?: string;
    rawText?: string;
  };
  confidence: number;
}

type CaptureStep = 'product' | 'analyzing' | 'price_confirm' | 'price_manual' | 'price_capture';

export default function CameraCapture({ onCapture, onClose, isOpen }: CameraCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [captureStep, setCaptureStep] = useState<CaptureStep>('product');
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysisResult | null>(null);
  const [manualPrice, setManualPrice] = useState('');
  const [manualCurrency, setManualCurrency] = useState('THB');

  // 카메라 스트림 시작
  const startCamera = async () => {
    try {
      setError(null);
      setIsLoadingCamera(true);
      console.log('카메라 시작 시도...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('브라우저가 카메라를 지원하지 않습니다.');
      }
      
      // 후면 카메라 먼저 시도 (모바일 최적화)
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        console.log('후면 카메라 성공');
      } catch (err: any) {
        // 후면 카메라 실패 시 전면 카메라로 폴백
        if (err.name === 'OverconstrainedError' || err.name === 'NotFoundError') {
          console.log('후면 카메라 없음, 전면 카메라 시도...');
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }
          });
          console.log('전면 카메라 성공');
        } else {
          throw err;
        }
      }
      
      console.log('카메라 스트림 생성 성공');
      setStream(mediaStream);
      
      // video 엘리먼트가 준비될 때까지 대기
      await new Promise<void>((resolve) => {
        const checkVideo = () => {
          if (videoRef.current) {
            resolve();
          } else {
            requestAnimationFrame(checkVideo);
          }
        };
        checkVideo();
      });
      
      if (videoRef.current) {
        console.log('video 엘리먼트에 스트림 연결 중...');
        videoRef.current.srcObject = mediaStream;
        
        // loadedmetadata 이벤트 대기
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video metadata load timeout'));
          }, 5000);
          
          videoRef.current!.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log('Video metadata 로드 완료');
            resolve();
          };
        });
        
        // 비디오 재생 시작
        console.log('비디오 재생 시도...');
        await videoRef.current.play();
        console.log('비디오 재생 시작 성공');
      }
      
      setIsLoadingCamera(false);
      console.log('카메라 초기화 완료');
    } catch (err: any) {
      setIsLoadingCamera(false);
      const errorName = err?.name || 'Unknown';
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      
      console.error('카메라 접근 실패:', {
        name: errorName,
        message: errorMessage,
        error: err
      });
      
      if (err.name === 'NotAllowedError') {
        setError('카메라 권한을 허용해주세요. 브라우저 설정에서 권한을 확인하실 수 있습니다.');
      } else if (err.name === 'NotFoundError') {
        setError('카메라를 찾을 수 없습니다.');
      } else if (err.name === 'NotReadableError') {
        setError('카메라가 다른 앱에서 사용 중입니다.');
      } else {
        setError(`카메라 오류: ${errorMessage}`);
      }
    }
  };

  // 카메라 스트림 중지
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // videoRef가 바뀔 때마다 stream 재연결 (step 변경 시에도 stream 유지)
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('video 엘리먼트에 스트림 재연결...');
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Video play 실패:', err);
      });
    }
  }, [captureStep, stream]);

  // 컴포넌트 마운트/언마운트 시 카메라 관리
  useEffect(() => {
    if (isOpen) {
      console.log('[MUBU] CameraCapture 열림');
      
      // 상태 초기화
      resetState();
      
      // 모바일 최적화: 권한 체크 없이 바로 카메라 시작 시도
      // 브라우저가 자동으로 권한 다이얼로그를 표시함
      // 단, 한 번만 시도하고 실패 시 사용자에게 버튼 제공
      const initCamera = async () => {
        console.log('카메라 자동 시작 시도...');
        // 짧은 지연 후 시작 (모달 애니메이션 완료 대기)
        await new Promise(resolve => setTimeout(resolve, 300));
        await startCamera();
      };
      
      initCamera();
    }
    
    return () => {
      console.log('[MUBU] CameraCapture 닫힘, 카메라 중지');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      console.log('[MUBU] 파일 업로드됨:', file.name);
      
      // AI 분석 시작
      setCaptureStep('analyzing');
      setIsCapturing(true);
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/analyze-product-with-price', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('[MUBU] 상품 분석 완료:', result.data);
          setProductAnalysis(result.data);
          
          if (result.data.priceTag.detected && result.data.priceTag.price) {
            setCaptureStep('price_confirm');
          } else {
            setCaptureStep('price_manual');
          }
        } else {
          throw new Error(result.error || '분석 실패');
        }
      } catch (error) {
        console.error('[MUBU] 상품 분석 실패:', error);
        setError('상품 분석에 실패했습니다. 다시 시도해주세요.');
        setCaptureStep('product');
        setCapturedImage(null);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      console.error('카메라 준비되지 않음');
      return;
    }
    
    setIsCapturing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context 생성 실패');
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      
      console.log('[MUBU] 상품 촬영 완료, AI 분석 시작...');
      
      setCaptureStep('analyzing');
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append('image', blob, 'product.jpg');
          
          try {
            const response = await fetch('/api/analyze-product-with-price', {
              method: 'POST',
              body: formData,
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
              console.log('[MUBU] 상품 분석 완료:', result.data);
              setProductAnalysis(result.data);
              
              if (result.data.priceTag.detected && result.data.priceTag.price) {
                setCaptureStep('price_confirm');
              } else {
                setCaptureStep('price_manual');
              }
            } else {
              throw new Error(result.error || '분석 실패');
            }
          } catch (error) {
            console.error('[MUBU] 상품 분석 실패:', error);
            setError('상품 분석에 실패했습니다. 다시 시도해주세요.');
            setCaptureStep('product');
            setCapturedImage(null);
          }
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('촬영 중 오류:', error);
      setError('촬영 중 오류가 발생했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePriceConfirm = async () => {
    if (!capturedImage || !productAnalysis) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob && productAnalysis.priceTag.price) {
          const file = new File([blob], 'product.jpg', { type: 'image/jpeg' });
          onCapture?.({
            productImage: file,
            productName: productAnalysis.product.name,
            productNameKorean: productAnalysis.product.nameKorean,
            price: productAnalysis.priceTag.price!,
            currency: productAnalysis.priceTag.currency || 'THB',
            currencySymbol: productAnalysis.priceTag.currencySymbol || '฿',
            priceTagDetected: true,
          });
          resetState();
          onClose?.();
        }
      }, 'image/jpeg', 0.8);
    };
    
    img.src = capturedImage;
  };

  const handleCapturePriceTag = async () => {
    // 가격표 재촬영 모드로 전환 (카메라 스트림은 유지)
    setCaptureStep('price_capture');
    setError(null);
  };
  
  const handlePriceTagPhotoCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setCaptureStep('analyzing');
    setIsCapturing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context 생성 실패');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append('image', blob, 'price-tag.jpg');
          
          try {
            const response = await fetch('/api/analyze-price-tag', {
              method: 'POST',
              body: formData,
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
              console.log('[MUBU] 가격표 OCR 완료:', result.data);
              
              if (productAnalysis) {
                setProductAnalysis({
                  ...productAnalysis,
                  priceTag: {
                    detected: true,
                    price: result.data.price,
                    currency: result.data.currency,
                    currencySymbol: result.data.currencySymbol,
                    rawText: result.data.rawText,
                  },
                });
              }
              setCaptureStep('price_confirm');
            } else {
              throw new Error(result.error || '가격표 인식 실패');
            }
          } catch (error) {
            console.error('[MUBU] 가격표 OCR 실패:', error);
            setError('가격표 인식에 실패했습니다. 다시 시도하거나 직접 입력해주세요.');
            setCaptureStep('price_manual');
          } finally {
            setIsCapturing(false);
          }
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('가격표 촬영 오류:', error);
      setError('가격표 촬영 중 오류가 발생했습니다.');
      setCaptureStep('price_manual');
      setIsCapturing(false);
    }
  };

  const handleManualPriceSubmit = async () => {
    if (!capturedImage || !productAnalysis || !manualPrice) return;
    
    const price = parseFloat(manualPrice);
    if (isNaN(price) || price <= 0) {
      setError('올바른 가격을 입력해주세요.');
      return;
    }
    
    const currencySymbols: { [key: string]: string } = {
      THB: '฿',
      USD: '$',
      EUR: '€',
      JPY: '¥',
      KRW: '₩',
      GBP: '£',
      CNY: '¥',
    };
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'product.jpg', { type: 'image/jpeg' });
          onCapture?.({
            productImage: file,
            productName: productAnalysis.product.name,
            productNameKorean: productAnalysis.product.nameKorean,
            price,
            currency: manualCurrency,
            currencySymbol: currencySymbols[manualCurrency] || '฿',
            priceTagDetected: false,
          });
          resetState();
          onClose?.();
        }
      }, 'image/jpeg', 0.8);
    };
    
    img.src = capturedImage;
  };

  const handleRetake = async () => {
    resetState();
    // 카메라 재시작
    if (!stream) {
      await startCamera();
    }
  };

  const resetState = () => {
    setCapturedImage(null);
    setProductAnalysis(null);
    setCaptureStep('product');
    setManualPrice('');
    setManualCurrency('THB');
    setError(null);
  };

  if (!isOpen) return null;

  const getHeaderTitle = () => {
    switch (captureStep) {
      case 'product': return '상품 촬영';
      case 'analyzing': return '분석 중...';
      case 'price_confirm': return '가격 확인';
      case 'price_manual': return '가격 입력';
      case 'price_capture': return '가격표 촬영';
      default: return '상품 촬영';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{getHeaderTitle()}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-camera">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Area */}
        <div className={`flex-1 flex overflow-y-auto ${
          captureStep === 'product' || captureStep === 'price_capture' 
            ? '' 
            : 'items-center justify-center p-4'
        }`}>
          {captureStep === 'analyzing' && (
            <Card className="w-full max-w-md">
              <CardContent className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <div className="text-center">
                    <p className="font-medium mb-1">AI가 상품을 분석하고 있습니다</p>
                    <p className="text-sm text-muted-foreground">가격표를 찾는 중...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {captureStep === 'price_confirm' && productAnalysis && capturedImage && (
            <Card className="w-full max-w-md">
              <CardContent className="p-0">
                <img 
                  src={capturedImage} 
                  alt="Captured product" 
                  className="w-full h-64 object-cover rounded-t-lg"
                />
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{productAnalysis.product.name}</h3>
                    {productAnalysis.product.brand && (
                      <p className="text-sm text-muted-foreground">{productAnalysis.product.brand}</p>
                    )}
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">감지된 가격</p>
                    <p className="text-3xl font-bold text-primary">
                      {productAnalysis.priceTag.currencySymbol}{productAnalysis.priceTag.price?.toLocaleString()}
                    </p>
                    {productAnalysis.priceTag.rawText && (
                      <p className="text-xs text-muted-foreground mt-1">
                        원본: {productAnalysis.priceTag.rawText}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-sm text-center text-muted-foreground">
                    이 가격이 맞나요?
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      onClick={() => setCaptureStep('price_manual')}
                      data-testid="button-edit-price"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      수정
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handlePriceConfirm}
                      data-testid="button-confirm-price"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      맞아요
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {captureStep === 'price_manual' && productAnalysis && capturedImage && (
            <Card className="w-full max-w-md">
              <CardContent className="p-0">
                <img 
                  src={capturedImage} 
                  alt="Captured product" 
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{productAnalysis.product.name}</h3>
                    <p className="text-sm text-muted-foreground">가격표가 감지되지 않았습니다</p>
                  </div>
                  
                  {stream && (() => {
                    const productName = productAnalysis.product.name?.toLowerCase() || '';
                    const noProductPatterns = ['no specific product', 'no product detected', '제품 미감지', '제품을 감지할 수 없'];
                    const isProductMissing = noProductPatterns.some(pattern => productName.includes(pattern));
                    
                    return (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={isProductMissing ? handleRetake : handleCapturePriceTag}
                        data-testid="button-capture-price-tag"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {isProductMissing ? '촬영 재시도' : '가격표만 다시 촬영'}
                      </Button>
                    );
                  })()}
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">또는</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="manual-price">가격</Label>
                      <Input
                        id="manual-price"
                        type="number"
                        step="0.01"
                        placeholder="1200"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        data-testid="input-manual-price"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="manual-currency">통화</Label>
                      <Select value={manualCurrency} onValueChange={setManualCurrency}>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="THB">฿ Thai Baht (THB)</SelectItem>
                          <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                          <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                          <SelectItem value="JPY">¥ Japanese Yen (JPY)</SelectItem>
                          <SelectItem value="CNY">¥ Chinese Yuan (CNY)</SelectItem>
                          <SelectItem value="KRW">₩ Korean Won (KRW)</SelectItem>
                          <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {error && (
                      <p className="text-sm text-red-500">{error}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      onClick={handleRetake}
                      data-testid="button-cancel-manual"
                    >
                      취소
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleManualPriceSubmit}
                      disabled={!manualPrice}
                      data-testid="button-submit-manual-price"
                    >
                      확인
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {captureStep === 'price_capture' && (
            <div className="w-full h-full flex flex-col">
              {/* 가격표 촬영 모드 */}
              <div className="flex-1 bg-muted relative overflow-hidden">
                {/* Video element for price capture */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={stream ? "absolute inset-0 w-full h-full object-cover" : "hidden"}
                />
                {stream ? (
                  <>
                    {isCapturing && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                          <span className="text-sm text-muted-foreground">가격표 인식 중...</span>
                        </div>
                      </div>
                    )}
                    {/* 가격표 촬영 가이드 */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-8 border-2 border-white/50 rounded-lg shadow-lg"></div>
                      <div className="absolute top-4 left-4 right-4 text-center">
                        <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                          가격표를 프레임 안에 맞춰주세요
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center p-6">
                    {isLoadingCamera ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
                        <p className="text-sm font-medium">카메라 시작 중...</p>
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
                        <p className="text-sm font-medium">카메라 준비 중</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCaptureStep('price_manual')}
                  disabled={isCapturing}
                  data-testid="button-back-to-manual"
                >
                  취소
                </Button>
                <Button 
                  onClick={handlePriceTagPhotoCapture}
                  disabled={isCapturing || !stream}
                  className="flex gap-2"
                  data-testid="button-capture-price-tag-photo"
                >
                  <Camera className="h-4 w-4" />
                  촬영
                </Button>
              </div>
            </div>
          )}

          {captureStep === 'product' && !capturedImage && (
            <div className="w-full h-full flex flex-col">
              {/* 카메라 뷰파인더 - 화면 전체 사용 */}
              <div className="flex-1 bg-muted relative overflow-hidden">
                {/* Video element for product capture */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={stream ? "absolute inset-0 w-full h-full object-cover" : "hidden"}
                />
                {stream ? (
                  <>
                    {isCapturing && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                          <span className="text-sm text-muted-foreground">촬영 중...</span>
                        </div>
                      </div>
                    )}
                    {/* 촬영 가이드 */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-8 border-2 border-white/50 rounded-lg shadow-lg"></div>
                      <div className="absolute top-4 left-4 right-4 text-center">
                        <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                          상품을 프레임 안에 맞춰주세요
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center p-6">
                    {isLoadingCamera ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
                        <p className="text-sm font-medium">카메라 시작 중...</p>
                        <p className="text-xs text-muted-foreground">
                          권한 요청이 표시되면 허용을 선택해주세요
                        </p>
                      </>
                    ) : error ? (
                      <>
                        <Settings className="h-16 w-16 text-muted-foreground" />
                        <div className="space-y-3 max-w-xs">
                          <p className="text-base font-semibold text-foreground">카메라 권한이 필요해요</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            상품과 가격표를 촬영하려면 카메라 권한을 허용해주세요
                          </p>
                          
                          <div className="bg-muted p-3 rounded-lg text-left">
                            <p className="text-xs font-medium mb-2">권한 허용 방법:</p>
                            <ol className="text-xs text-muted-foreground space-y-1 pl-4">
                              <li>1. 주소창 왼쪽의 아이콘 클릭</li>
                              <li>2. "카메라" 또는 "권한" 선택</li>
                              <li>3. 카메라 권한을 "허용"으로 변경</li>
                              <li>4. 아래 버튼을 눌러 다시 시도</li>
                            </ol>
                          </div>
                        </div>
                        <Button 
                          onClick={startCamera}
                          className="mt-2 w-full max-w-xs"
                          data-testid="button-retry-camera"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          카메라 시작하기
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
                        <p className="text-sm font-medium">카메라 준비 중</p>
                        <p className="text-xs text-muted-foreground">
                          잠시만 기다려주세요...
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCapturing}
                  className="flex gap-2"
                  data-testid="button-upload"
                >
                  <Upload className="h-4 w-4" />
                  업로드
                </Button>
                <Button 
                  onClick={handleCapture}
                  disabled={isCapturing || !stream}
                  className="flex gap-2"
                  data-testid="button-capture"
                >
                  <Camera className="h-4 w-4" />
                  촬영
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
