import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut, HelpCircle, Star, Award, RotateCcw, FileText, Shield } from "lucide-react";
import { resetUsage } from "@/lib/usage-tracking";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SiGoogle, SiGithub, SiApple } from "react-icons/si";
import { Mail } from "lucide-react";

interface ProfileProps {}

export default function Profile({}: ProfileProps) {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, login, logout, isLoggingOut } = useAuth();
  
  // todo: remove mock functionality
  const mockUserData = {
    name: "김여행",
    email: "travel@example.com",
    joinDate: "2024년 1월",
    level: "골드 여행자",
    totalTrips: 5,
    totalSavings: 450000,
    achievements: [
      { name: "첫 구매", description: "첫 번째 상품 구매 완료" },
      { name: "절약왕", description: "10만원 이상 절약 달성" },
      { name: "여행 마니아", description: "5개 국가에서 쇼핑" }
    ]
  };

  const handleResetUsage = () => {
    resetUsage();
    toast({
      title: "사용량 초기화 완료",
      description: "사용 횟수가 0으로 리셋되었습니다.",
    });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-32 pt-20">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // 비로그인 상태 - 로그인 UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-32 pt-20">
        <main className="pb-8 px-8">
          <div className="max-w-sm mx-auto space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium text-foreground mb-2">로그인</h2>
              <p className="text-muted-foreground">
                가격 비교 결과를 저장하고<br />
                절약 내역을 확인하세요
              </p>
            </div>
            
            <div className="bg-muted rounded-3xl p-6 space-y-3">
              <Button
                className="w-full"
                variant="outline"
                data-testid="button-login-google"
                onClick={() => login('google')}
              >
                <SiGoogle className="mr-2 h-4 w-4" />
                Google로 계속하기
              </Button>
              
              <Button
                className="w-full"
                variant="outline"
                data-testid="button-login-github"
                onClick={() => login('github')}
              >
                <SiGithub className="mr-2 h-4 w-4" />
                GitHub로 계속하기
              </Button>
              
              <Button
                className="w-full"
                variant="outline"
                data-testid="button-login-apple"
                onClick={() => login('apple')}
              >
                <SiApple className="mr-2 h-4 w-4" />
                Apple로 계속하기
              </Button>
              
              <Button
                className="w-full"
                variant="outline"
                data-testid="button-login-email"
                onClick={() => login('email')}
              >
                <Mail className="mr-2 h-4 w-4" />
                이메일로 계속하기
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 로그인 상태 - 프로필 UI
  const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email?.split('@')[0] || '사용자';
  const totalSavings = user?.totalSavings || 0;

  return (
    <div className="min-h-screen bg-background pb-32 pt-20">
      <main className="pb-8 px-8">
        <div className="max-w-sm mx-auto space-y-8">
          {/* Profile Header */}
          <div className="bg-muted rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={userName} />}
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="text-xl font-medium text-foreground" data-testid="text-user-name">
                  {userName}
                </h2>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
                <Badge variant="secondary" className="mt-2">
                  {mockUserData.level}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted rounded-2xl p-4 text-center">
              <p className="text-2xl font-light text-foreground" data-testid="text-total-trips">
                {mockUserData.totalTrips}
              </p>
              <p className="text-xs text-muted-foreground">여행 횟수</p>
            </div>
            
            <div className="bg-muted rounded-2xl p-4 text-center">
              <p className="text-2xl font-light text-foreground" data-testid="text-profile-savings">
                ₩{(totalSavings / 10000).toFixed(0)}만
              </p>
              <p className="text-xs text-muted-foreground">총 절약</p>
            </div>
            
            <div className="bg-muted rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center mb-1">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-light text-foreground">{mockUserData.achievements.length}</p>
              <p className="text-xs text-muted-foreground">뱃지</p>
            </div>
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Award className="h-5 w-5" />
              달성한 뱃지
            </h3>
            <div className="space-y-3">
              {mockUserData.achievements.map((achievement, index) => (
                <div 
                  key={index}
                  className="bg-muted rounded-2xl p-4 flex items-center gap-3"
                  data-testid={`achievement-${index}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{achievement.name}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings & Actions */}
          <div className="bg-muted rounded-3xl overflow-hidden">
            <div className="divide-y divide-border">
              <Button
                variant="ghost"
                className="w-full justify-start h-14 rounded-none"
                data-testid="button-settings"
                onClick={() => console.log('Settings clicked')}
              >
                <Settings className="h-4 w-4 mr-3" />
                설정
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-14 rounded-none"
                data-testid="button-help"
                onClick={() => console.log('Help clicked')}
              >
                <HelpCircle className="h-4 w-4 mr-3" />
                도움말
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-14 rounded-none"
                data-testid="button-terms"
                onClick={() => window.open('https://mubu-plan-aidenbk.replit.app/terms', '_blank')}
              >
                <FileText className="h-4 w-4 mr-3" />
                이용약관
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-14 rounded-none"
                data-testid="button-privacy"
                onClick={() => window.open('https://mubu-plan-aidenbk.replit.app/privacy', '_blank')}
              >
                <Shield className="h-4 w-4 mr-3" />
                개인정보처리방침
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-14 rounded-none text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="button-logout"
                onClick={logout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4 mr-3" />
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </Button>
            </div>
          </div>

          {/* Dev/Test Tools - Hidden Section */}
          <div className="bg-muted/50 rounded-2xl border-dashed border opacity-50 hover:opacity-100 transition-opacity overflow-hidden">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-none text-muted-foreground hover:text-foreground"
              data-testid="button-reset-usage"
              onClick={handleResetUsage}
            >
              <RotateCcw className="h-4 w-4 mr-3" />
              <span className="text-xs">사용량 초기화 (테스트용)</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}