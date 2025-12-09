import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // 사용자 정보 조회 (로그인 상태 확인)
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });

  const isAuthenticated = !!user && !error;

  // 로그인 함수 (Replit Auth 페이지로 리다이렉트)
  const login = (provider: 'google' | 'github' | 'apple' | 'email') => {
    window.location.href = `/api/login?provider=${provider}`;
  };

  // 로그아웃 함수 (GET /api/logout으로 리다이렉트)
  // Replit Auth가 OIDC end-session을 처리하고 홈으로 리다이렉트
  const logout = () => {
    window.location.href = '/api/logout';
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    isLoggingOut: false, // 리다이렉트 방식이므로 항상 false
  };
}
