import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: text("sess").notNull(), // JSON as text
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table - Replit Auth compatible
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // OAuth sub from Replit
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // 구독 관련 정보
  subscriptionType: text("subscription_type").$type<"free" | "daily" | "weekly" | "monthly">().default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  
  // 무료 사용량 제한
  dailySearchCount: integer("daily_search_count").default(0),
  lastSearchDate: timestamp("last_search_date").default(sql`CURRENT_TIMESTAMP`),
  
  // 절약액 누적
  totalSavings: integer("total_savings").default(0),
  
  // 계정 상태 및 국제화
  lastLoginAt: timestamp("last_login_at"),
  status: text("status").$type<"active" | "blocked">().default("active"),
  country: varchar("country"), // ISO 3166-1 alpha-2 (예: "KR", "TH", "US")
  language: varchar("language").default("ko"), // ISO 639-1 (예: "ko", "en", "th")
  
  // 타임스탬프
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 제휴 클릭 추적 테이블
export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    platform: text("platform").$type<"coupang" | "naver">().notNull(),
    productName: text("product_name").notNull(),
    originalLink: text("original_link").notNull(),
    affiliateLink: text("affiliate_link").notNull(),
    clickedAt: timestamp("clicked_at").default(sql`CURRENT_TIMESTAMP`),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
  },
  (table) => [
    index("idx_affiliate_clicked_at").on(table.clickedAt),
    index("idx_affiliate_platform_clicked").on(table.platform, table.clickedAt),
  ]
);

// 검색 로그 테이블 (분석용)
export const searchLogs = pgTable("search_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  productName: text("product_name"),
  localCurrency: text("local_currency"),
  localPrice: integer("local_price"),
  krwPrice: integer("krw_price"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 가격 비교 기록 테이블
export const priceComparisons = pgTable("price_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  // 상품 정보 (AI 인식 결과)
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  productImageUrl: text("product_image_url").notNull(), // Object Storage URL
  
  // 가격 정보
  localPrice: integer("local_price").notNull(), // 센트/소수점 제거한 정수 (예: 1200 = 1,200฿)
  localCurrency: text("local_currency").notNull(), // THB, USD, EUR, JPY, etc
  koreaPrice: integer("korea_price"), // 원화 (예: 13500)
  convertedLocalPrice: integer("converted_local_price"), // 현지 가격을 원화로 환산 (예: 52000)
  savingsAmount: integer("savings_amount"), // 절약액 (koreaPrice - convertedLocalPrice)
  
  // 가격표 정보 (선택적)
  priceTagImageUrl: text("price_tag_image_url"), // 가격표만 따로 촬영한 경우
  ocrRawText: text("ocr_raw_text"), // OCR 원본 텍스트
  
  // 쇼핑몰 링크
  productLink: text("product_link"), // 네이버쇼핑/쿠팡 제품 링크
  
  // 상태
  status: text("status").$type<"processing" | "completed" | "failed">().default("processing"),
  
  // 메타데이터
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Replit Auth용 upsert 스키마
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertPriceComparisonSchema = createInsertSchema(priceComparisons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPriceComparison = z.infer<typeof insertPriceComparisonSchema>;
export type PriceComparison = typeof priceComparisons.$inferSelect;
