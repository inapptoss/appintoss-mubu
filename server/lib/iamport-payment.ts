/**
 * 아임포트 결제 서비스
 * 국내 사용자를 위한 카카오페이, 토스, 신용카드 결제 처리
 */

// 아임포트 REST API 클라이언트
interface IamportPaymentRequest {
  merchantUid: string;       // 가맹점 주문번호
  amount: number;           // 결제금액
  buyerName: string;        // 구매자 이름
  buyerEmail?: string;      // 구매자 이메일
  buyerTel?: string;        // 구매자 전화번호
  name: string;             // 상품명
  payMethod?: 'card' | 'trans' | 'vbank' | 'phone' | 'kakaopay' | 'tosspay';
}

interface IamportPaymentResponse {
  code: number;
  message: string;
  response?: {
    imp_uid: string;
    merchant_uid: string;
    amount: number;
    status: 'ready' | 'paid' | 'cancelled' | 'failed';
    paid_at?: number;
    receipt_url?: string;
  };
}

export class IamportPaymentService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.iamport.kr';
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.apiKey = process.env.IMP_KEY || '';
    this.apiSecret = process.env.IMP_SECRET || '';
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('Iamport API credentials not configured');
    }
  }

  /**
   * 액세스 토큰 발급
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/getToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imp_key: this.apiKey,
          imp_secret: this.apiSecret,
        }),
      });

      const data = await response.json();
      
      if (data.code === 0) {
        this.accessToken = data.response.access_token;
        this.tokenExpiry = new Date(Date.now() + (data.response.expired_at * 1000));
        return this.accessToken || '';
      } else {
        throw new Error(`Failed to get access token: ${data.message}`);
      }
    } catch (error) {
      console.error('Error getting Iamport access token:', error);
      throw error;
    }
  }

  /**
   * 결제 준비 (사전 등록)
   * 프론트엔드에서 IMP.request_pay() 호출 전에 서버에서 미리 등록
   */
  async preparePayment(paymentData: IamportPaymentRequest): Promise<{ merchantUid: string }> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.baseUrl}/payments/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchant_uid: paymentData.merchantUid,
          amount: paymentData.amount,
        }),
      });

      const data = await response.json();
      
      if (data.code === 0) {
        console.log(`Payment prepared: ${paymentData.merchantUid} for ₩${paymentData.amount.toLocaleString()}`);
        return { merchantUid: paymentData.merchantUid };
      } else {
        throw new Error(`Payment preparation failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error preparing Iamport payment:', error);
      throw error;
    }
  }

  /**
   * 결제 결과 검증
   * 프론트엔드에서 결제 완료 후 서버에서 검증
   */
  async verifyPayment(impUid: string, merchantUid: string, expectedAmount: number): Promise<IamportPaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.baseUrl}/payments/${impUid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: IamportPaymentResponse = await response.json();
      
      if (data.code === 0 && data.response) {
        const payment = data.response;
        
        // 결제 금액 검증
        if (payment.amount !== expectedAmount) {
          throw new Error(`Payment amount mismatch: expected ${expectedAmount}, got ${payment.amount}`);
        }
        
        // 가맹점 주문번호 검증
        if (payment.merchant_uid !== merchantUid) {
          throw new Error(`Merchant UID mismatch: expected ${merchantUid}, got ${payment.merchant_uid}`);
        }
        
        console.log(`Payment verified: ${impUid} - ₩${payment.amount.toLocaleString()} - ${payment.status}`);
        return data;
      } else {
        throw new Error(`Payment verification failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error verifying Iamport payment:', error);
      throw error;
    }
  }

  /**
   * 결제 취소
   */
  async cancelPayment(impUid: string, reason: string, cancelAmount?: number): Promise<IamportPaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.baseUrl}/payments/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imp_uid: impUid,
          reason,
          amount: cancelAmount, // 부분취소 시 금액 지정
        }),
      });

      const data: IamportPaymentResponse = await response.json();
      
      if (data.code === 0) {
        console.log(`Payment cancelled: ${impUid} - Reason: ${reason}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error cancelling Iamport payment:', error);
      throw error;
    }
  }

  /**
   * 결제 수단별 추천 설정
   */
  getPaymentMethodRecommendation(userAgent?: string): string[] {
    // 모바일인지 확인
    const isMobile = userAgent && /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    if (isMobile) {
      return ['kakaopay', 'tosspay', 'card', 'trans'];
    } else {
      return ['card', 'kakaopay', 'tosspay', 'trans'];
    }
  }
}

export const iamportPaymentService = new IamportPaymentService();