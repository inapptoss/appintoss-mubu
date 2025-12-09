import type { Express } from "express";
import { createServer, type Server } from "http";
import { affiliateTrackingService } from './lib/affiliate-tracking';
import { iamportPaymentService } from './lib/iamport-payment';
import { usageLimitService } from './lib/usage-limits';
import { storage } from "./storage";
import { analyzeProductImage, analyzePriceTag, analyzeProductWithPriceTag } from "./lib/gemini";
import { convertCurrency, getExchangeRate } from "./lib/exchange-rate";
import { createNaverShoppingClient } from "./lib/naver-shopping";
import { createCoupangMockClient } from "./lib/coupang-mock";
import { getUncachableGitHubClient } from "./lib/github";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPriceComparisonSchema } from "@shared/schema";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

import { ObjectStorageService } from "./objectStorage";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth (구글 로그인)
  await setupAuth(app);
  console.log('✅ Replit Auth setup complete (Google, GitHub, Apple, Email login enabled)');
  
  console.log('Registering MUBU API routes...');
  
  // ====================
  // Auth Routes
  // ====================
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // ====================
  // Image Upload Route
  // ====================
  
  // 이미지 업로드 (공개, 로그인 불필요)
  app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const objectStorageService = new ObjectStorageService();
      const imageUrl = await objectStorageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      
      console.log('[MUBU] Image uploaded successfully:', imageUrl);
      
      res.json({
        success: true,
        imageUrl: imageUrl
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // 이미지 서빙 (공개)
  // NOTE: This endpoint serves product images without ACL checks because all product images
  // are public by design (set with visibility: 'public' in uploadFile). This is a 
  // "public file uploading" scenario where users upload product photos that anyone can view.
  // If private files are needed in the future, implement a separate endpoint with ACL checks.
  app.get('/objects/:objectPath(*)', async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error('Error serving object:', error);
      res.sendStatus(404);
    }
  });
  
  // ====================
  // Price Comparison Routes
  // ====================
  
  // 가격 비교 결과 저장 (로그인 필요)
  app.post('/api/price-comparisons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Zod로 요청 데이터 검증
      const validationResult = insertPriceComparisonSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid price comparison data",
          details: validationResult.error.errors
        });
      }
      
      const savedComparison = await storage.savePriceComparison(validationResult.data);
      
      res.json({
        success: true,
        data: savedComparison
      });
    } catch (error) {
      console.error("Error saving price comparison:", error);
      res.status(500).json({ 
        error: "Failed to save price comparison",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // 사용자의 가격 비교 히스토리 조회 (로그인 필요)
  app.get('/api/price-comparisons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const comparisons = await storage.getUserPriceComparisons(userId, limit);
      
      res.json(comparisons);
    } catch (error) {
      console.error("Error fetching price comparisons:", error);
      res.status(500).json({ 
        error: "Failed to fetch price comparisons",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // ====================
  // Image Analysis Routes
  // ====================
  
  // Product image analysis endpoint
  app.post("/api/analyze-product", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      console.log(`Analyzing image: ${req.file.originalname}, size: ${req.file.size} bytes`);
      
      const productInfo = await analyzeProductImage(imageBase64, mimeType);
      
      res.json({
        success: true,
        data: productInfo
      });
    } catch (error) {
      console.error("Error analyzing product image:", error);
      res.status(500).json({ 
        error: "Failed to analyze product image",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // MUBU 핵심 기능: 상품 + 가격표 통합 분석
  app.post("/api/analyze-product-with-price", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      console.log(`[MUBU] Analyzing product with price tag: ${req.file.originalname}, size: ${req.file.size} bytes`);
      
      const analysis = await analyzeProductWithPriceTag(imageBase64, mimeType);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error("Error analyzing product with price:", error);
      res.status(500).json({ 
        error: "Failed to analyze product with price",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 가격표만 OCR
  app.post("/api/analyze-price-tag", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      console.log(`[MUBU] Analyzing price tag only: ${req.file.originalname}, size: ${req.file.size} bytes`);
      
      const priceInfo = await analyzePriceTag(imageBase64, mimeType);
      
      res.json({
        success: true,
        data: priceInfo
      });
    } catch (error) {
      console.error("Error analyzing price tag:", error);
      res.status(500).json({ 
        error: "Failed to analyze price tag",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Currency conversion endpoint
  app.get("/api/exchange-rate/:from/:to", async (req, res) => {
    try {
      const { from, to } = req.params;
      
      if (!from || !to) {
        return res.status(400).json({ error: "Both 'from' and 'to' currency codes are required" });
      }

      const rate = await getExchangeRate(from.toUpperCase(), to.toUpperCase());
      
      res.json({
        success: true,
        data: {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          rate,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      res.status(500).json({ 
        error: "Failed to fetch exchange rate",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Currency conversion endpoint
  app.post("/api/convert-currency", async (req, res) => {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;
      
      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({ 
          error: "amount, fromCurrency, and toCurrency are required" 
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number" });
      }

      const result = await convertCurrency(amount, fromCurrency.toUpperCase(), toCurrency.toUpperCase());
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error converting currency:", error);
      res.status(500).json({ 
        error: "Failed to convert currency",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Naver Shopping search endpoint
  app.post("/api/search-korean-prices", async (req, res) => {
    try {
      const { productName, maxResults = 5 } = req.body;
      
      if (!productName) {
        return res.status(400).json({ error: "productName is required" });
      }

      console.log(`Searching Korean prices for: "${productName}"`);
      const naverClient = createNaverShoppingClient();
      const searchResult = await naverClient.findLowestPrice(productName, maxResults);
      
      res.json({
        success: true,
        data: searchResult
      });
    } catch (error) {
      console.error("Error searching Korean prices:", error);
      res.status(500).json({ 
        error: "Failed to search Korean prices",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Coupang search endpoint (mock)
  app.post("/api/search-coupang-prices", async (req, res) => {
    try {
      const { productName, maxResults = 5 } = req.body;
      
      if (!productName) {
        return res.status(400).json({ error: "productName is required" });
      }

      console.log(`Searching Coupang (mock) prices for: "${productName}"`);
      const coupangClient = createCoupangMockClient();
      const searchResult = await coupangClient.findLowestPrice(productName, maxResults);
      
      res.json({
        success: true,
        data: searchResult
      });
    } catch (error) {
      console.error("Error searching Coupang prices:", error);
      res.status(500).json({ 
        error: "Failed to search Coupang prices",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Multi-platform price search (Naver Shopping only - Coupang Mock removed)
  app.post("/api/search-all-korean-prices", async (req, res) => {
    try {
      const { productName, maxResults = 5 } = req.body;
      
      if (!productName) {
        return res.status(400).json({ error: "productName is required" });
      }

      console.log(`Searching Naver Shopping for: "${productName}"`);
      
      // Search Naver Shopping only (removed Coupang Mock to avoid false results)
      const naverResults = await createNaverShoppingClient().findLowestPrice(productName, maxResults);
      
      // Process Naver results
      const combinedItems = naverResults.items.map(item => ({
        ...item,
        source: 'naver',
        mallName: item.mallName || 'Naver Shopping'
      }));
      
      // Sort by price (lowest first)
      combinedItems.sort((a, b) => a.price - b.price);
      
      // Limit total results
      const finalResults = combinedItems.slice(0, maxResults * 2);
      
      console.log(`Found ${finalResults.length} items from Naver Shopping`);
      
      res.json({
        success: true,
        data: {
          query: productName,
          total: finalResults.length,
          items: finalResults,
          sources: {
            naver: true,
            coupang: false
          }
        }
      });
    } catch (error) {
      console.error("Error searching Korean prices:", error);
      res.status(500).json({ 
        error: "Failed to search Korean prices",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 제휴 클릭 추적 엔드포인트 (보안 강화)
  app.get("/track/click", async (req, res) => {
    try {
      const { t: trackingId, p: platform, u: userId, target } = req.query;
      
      if (!platform || !target) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // 보안: 허용된 도메인만 리다이렉트
      const allowedDomains = [
        'shopping.naver.com',
        'search.naver.com', 
        'www.coupang.com',
        'coupang.com',
        'link.coupang.com'
      ];
      
      let targetUrl: URL;
      try {
        targetUrl = new URL(target as string);
      } catch {
        return res.status(400).json({ error: "Invalid target URL" });
      }
      
      const isAllowed = allowedDomains.some(domain => 
        targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
      );
      
      if (!isAllowed) {
        console.warn(`Blocked redirect to unauthorized domain: ${targetUrl.hostname}`);
        return res.status(403).json({ error: "Redirect not allowed" });
      }

      // URL에서 상품명 추출
      const productName = req.query.product || "Unknown Product";
      
      // 클릭 추적 기록
      await affiliateTrackingService.trackClick({
        userId: userId as string || undefined,
        platform: platform as 'coupang' | 'naver',
        productName: productName as string,
        originalLink: target as string,
        affiliateLink: target as string,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      });

      // 안전한 리다이렉트
      res.redirect(302, targetUrl.toString());
    } catch (error) {
      console.error("Error tracking affiliate click:", error);
      res.status(500).json({ error: "Tracking failed" });
    }
  });

  // 제휴 분석 데이터 조회 엔드포인트
  app.get("/api/affiliate/analytics", async (req, res) => {
    try {
      const { userId, platform, days } = req.query;
      
      const analytics = await affiliateTrackingService.getClickAnalytics({
        userId: userId as string || undefined,
        platform: platform as 'coupang' | 'naver' || undefined,
        days: days ? parseInt(days as string) : undefined
      });

      const estimatedRevenue = affiliateTrackingService.calculateEstimatedRevenue(analytics);

      res.json({
        success: true,
        data: {
          ...analytics,
          estimatedRevenue,
          currency: 'KRW'
        }
      });
    } catch (error) {
      console.error("Error retrieving affiliate analytics:", error);
      res.status(500).json({ 
        error: "Failed to retrieve analytics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 아임포트 결제 준비 엔드포인트
  app.post("/api/payment/iamport/prepare", async (req, res) => {
    try {
      const { amount, productName, buyerName, buyerEmail } = req.body;
      
      if (!amount || !productName || !buyerName) {
        return res.status(400).json({ 
          error: "Missing required fields: amount, productName, buyerName" 
        });
      }

      // 고유한 주문번호 생성
      const merchantUid = `mubu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const paymentData = {
        merchantUid,
        amount: parseInt(amount),
        buyerName,
        buyerEmail,
        name: productName,
        payMethod: 'card' as const
      };

      const result = await iamportPaymentService.preparePayment(paymentData);

      res.json({
        success: true,
        data: {
          merchantUid: result.merchantUid,
          amount: paymentData.amount,
          productName: paymentData.name,
          buyerName: paymentData.buyerName
        }
      });
    } catch (error) {
      console.error("Error preparing Iamport payment:", error);
      res.status(500).json({ 
        error: "Failed to prepare payment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 사용량 제한 확인 엔드포인트
  app.post("/api/usage/check", async (req, res) => {
    try {
      const { userId } = req.body;
      const sessionId = (req as any).session?.id || (req as any).sessionID;
      
      const usageResult = await usageLimitService.incrementAndCheck(userId, sessionId);
      
      res.json({
        success: true,
        data: usageResult
      });
    } catch (error) {
      console.error("Error checking usage limit:", error);
      res.status(500).json({ 
        error: "Failed to check usage limit",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 현재 사용량 조회 엔드포인트 
  app.get("/api/usage/current", async (req, res) => {
    try {
      const { userId } = req.query;
      const sessionId = (req as any).session?.id || (req as any).sessionID;
      
      const usageResult = await usageLimitService.getCurrentUsage(userId as string, sessionId);
      
      res.json({
        success: true,
        data: usageResult
      });
    } catch (error) {
      console.error("Error getting current usage:", error);
      res.status(500).json({ 
        error: "Failed to get current usage",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // 아임포트 결제 검증 엔드포인트
  app.post("/api/payment/iamport/verify", async (req, res) => {
    try {
      const { impUid, merchantUid, amount } = req.body;
      
      if (!impUid || !merchantUid || !amount) {
        return res.status(400).json({ 
          error: "Missing required fields: impUid, merchantUid, amount" 
        });
      }

      const verification = await iamportPaymentService.verifyPayment(
        impUid,
        merchantUid,
        parseInt(amount)
      );

      if (verification.response?.status === 'paid') {
        // 결제 성공 시 사용자 구독 상태 업데이트 (향후 구현)
        console.log(`Payment successful: ${impUid} - ₩${amount}`);
        
        res.json({
          success: true,
          data: {
            status: 'paid',
            impUid,
            merchantUid,
            amount: verification.response.amount,
            paidAt: verification.response.paid_at,
            receiptUrl: verification.response.receipt_url
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: "Payment not completed",
          status: verification.response?.status || 'unknown'
        });
      }
    } catch (error) {
      console.error("Error verifying Iamport payment:", error);
      res.status(500).json({ 
        error: "Failed to verify payment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // GitHub repository management endpoints
  app.post("/api/github/create-repo", async (req, res) => {
    try {
      const { name, description, private: isPrivate = false } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Repository name is required" });
      }

      const octokit = await getUncachableGitHubClient();
      
      // Create repository
      const repo = await octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: false,
      });

      res.json({
        success: true,
        data: {
          name: repo.data.name,
          fullName: repo.data.full_name,
          htmlUrl: repo.data.html_url,
          cloneUrl: repo.data.clone_url,
          sshUrl: repo.data.ssh_url,
        }
      });
    } catch (error) {
      console.error("Error creating GitHub repository:", error);
      res.status(500).json({ 
        error: "Failed to create repository",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/github/user", async (req, res) => {
    try {
      const octokit = await getUncachableGitHubClient();
      const user = await octokit.users.getAuthenticated();

      res.json({
        success: true,
        data: {
          login: user.data.login,
          name: user.data.name,
          email: user.data.email,
          avatarUrl: user.data.avatar_url,
        }
      });
    } catch (error) {
      console.error("Error fetching GitHub user:", error);
      res.status(500).json({ 
        error: "Failed to fetch user information",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
