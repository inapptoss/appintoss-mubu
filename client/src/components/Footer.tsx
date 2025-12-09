import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* 로고 */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">MUBU</span>
          </div>
          
          {/* 설명 */}
          <p className="text-sm text-muted-foreground max-w-md">
            해외여행에서 스마트한 쇼핑을 위한 실시간 가격 비교 앱
          </p>
          
          <Separator className="w-24" />
          
          {/* 링크 */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a 
              href="/privacy-policy.html" 
              target="_blank"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              개인정보처리방침
            </a>
            <span className="text-muted-foreground">•</span>
            <a 
              href="/terms-of-service.html" 
              target="_blank"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              이용약관
            </a>
            <span className="text-muted-foreground">•</span>
            <a 
              href="mailto:support@mubu-app.com"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              고객지원
            </a>
          </div>
          
          {/* 저작권 */}
          <p className="text-xs text-muted-foreground">
            © 2025 MUBU. All rights reserved.
          </p>
          
          {/* 제휴 고지 */}
          <p className="text-xs text-muted-foreground max-w-sm">
            MUBU는 쿠팡, 네이버쇼핑 등의 제휴 프로그램에 참여하여 일정 수수료를 받을 수 있습니다.
          </p>
          
          {/* 앱 스토어 심사용 정보 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>카메라 권한:</strong> 상품 촬영 및 가격표 인식용</p>
            <p><strong>데이터 처리:</strong> 촬영 이미지는 분석 후 즉시 삭제</p>
            <p><strong>연령 제한:</strong> 만 14세 이상 이용 가능</p>
          </div>
        </div>
      </div>
    </footer>
  );
}