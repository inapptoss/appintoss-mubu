import { type User, type UpsertUser, type InsertPriceComparison, type PriceComparison, users, priceComparisons } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

interface ClickTrackingData {
  userId?: string;
  platform: 'coupang' | 'naver';
  productName: string;
  originalLink: string;
  affiliateLink: string;
  userAgent?: string;
  referrer?: string;
}

export interface IStorage {
  // Replit Auth 필수 메서드
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // 가격 비교 메서드
  savePriceComparison(data: InsertPriceComparison): Promise<PriceComparison>;
  getUserPriceComparisons(userId: string, limit?: number): Promise<PriceComparison[]>;
  
  // MUBU 기능 메서드
  recordAffiliateClick(data: ClickTrackingData): Promise<void>;
  updateUserSubscription(userId: string, subscriptionType: string, expiresAt: Date): Promise<User>;
  updateUserUsage(userId: string, searchCount: number, lastSearchDate: Date): Promise<User>;
  updateUserSavings(userId: string, savingsAmount: number): Promise<User>;
  getAffiliateClicks(userId?: string, platform?: 'coupang' | 'naver', days?: number): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private affiliateClicks: Array<any>;
  private priceComparisons: Array<PriceComparison>;

  constructor() {
    this.users = new Map();
    this.affiliateClicks = [];
    this.priceComparisons = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    
    const user: User = {
      id: userData.id,
      email: userData.email ?? existingUser?.email ?? null,
      firstName: userData.firstName ?? existingUser?.firstName ?? null,
      lastName: userData.lastName ?? existingUser?.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? existingUser?.profileImageUrl ?? null,
      subscriptionType: existingUser?.subscriptionType ?? "free",
      subscriptionExpiresAt: existingUser?.subscriptionExpiresAt ?? null,
      stripeCustomerId: existingUser?.stripeCustomerId ?? null,
      stripeSubscriptionId: existingUser?.stripeSubscriptionId ?? null,
      dailySearchCount: existingUser?.dailySearchCount ?? 0,
      lastSearchDate: existingUser?.lastSearchDate ?? new Date(),
      totalSavings: existingUser?.totalSavings ?? 0,
      createdAt: existingUser?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(userData.id, user);
    return user;
  }

  async recordAffiliateClick(data: ClickTrackingData): Promise<void> {
    const clickRecord = {
      id: randomUUID(),
      userId: data.userId || null,
      platform: data.platform,
      productName: data.productName,
      originalLink: data.originalLink,
      affiliateLink: data.affiliateLink,
      clickedAt: new Date(),
      userAgent: data.userAgent || null,
      referrer: data.referrer || null
    };
    this.affiliateClicks.push(clickRecord);
    console.log(`Recorded ${data.platform} affiliate click for: ${data.productName}`);
  }

  async updateUserSubscription(userId: string, subscriptionType: string, expiresAt: Date): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser: User = {
      ...user,
      subscriptionType: subscriptionType as any,
      subscriptionExpiresAt: expiresAt
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserUsage(userId: string, searchCount: number, lastSearchDate: Date): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser: User = {
      ...user,
      dailySearchCount: searchCount,
      lastSearchDate: lastSearchDate
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getAffiliateClicks(userId?: string, platform?: 'coupang' | 'naver', days?: number): Promise<any[]> {
    const daysCutoff = days || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysCutoff);

    let filteredClicks = this.affiliateClicks.filter(click => {
      const clickDate = new Date(click.clickedAt);
      return clickDate >= cutoffDate;
    });

    // 사용자 필터
    if (userId) {
      filteredClicks = filteredClicks.filter(click => click.userId === userId);
    }

    // 플랫폼 필터
    if (platform) {
      filteredClicks = filteredClicks.filter(click => click.platform === platform);
    }

    return filteredClicks;
  }

  async updateUserSavings(userId: string, savingsAmount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser: User = {
      ...user,
      totalSavings: (user.totalSavings || 0) + savingsAmount,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async savePriceComparison(data: InsertPriceComparison): Promise<PriceComparison> {
    const comparison: PriceComparison = {
      id: randomUUID(),
      userId: data.userId ?? null,
      productName: data.productName,
      productDescription: data.productDescription ?? null,
      productImageUrl: data.productImageUrl,
      localPrice: data.localPrice,
      localCurrency: data.localCurrency,
      koreaPrice: data.koreaPrice ?? null,
      convertedLocalPrice: data.convertedLocalPrice ?? null,
      savingsAmount: data.savingsAmount ?? null,
      priceTagImageUrl: data.priceTagImageUrl ?? null,
      ocrRawText: data.ocrRawText ?? null,
      productLink: data.productLink ?? null,
      status: (data.status as "processing" | "completed" | "failed" | null) ?? "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.priceComparisons.push(comparison);
    
    // 절약액이 있으면 사용자 총 절약액 업데이트
    if (data.userId && data.savingsAmount) {
      await this.updateUserSavings(data.userId, data.savingsAmount);
    }
    
    console.log(`💾 Saved price comparison: ${data.productName} (${data.savingsAmount}원 절약)`);
    return comparison;
  }

  async getUserPriceComparisons(userId: string, limit: number = 10): Promise<PriceComparison[]> {
    return this.priceComparisons
      .filter(c => c.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }
}

// Drizzle ORM 기반 PostgreSQL Storage
export class DrizzleStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return result[0];
  }

  async savePriceComparison(data: InsertPriceComparison): Promise<PriceComparison> {
    // Use transaction to ensure atomicity between insert and savings update
    return await db.transaction(async (tx) => {
      const result = await tx
        .insert(priceComparisons)
        .values({
          userId: data.userId,
          productName: data.productName,
          productDescription: data.productDescription,
          productImageUrl: data.productImageUrl ?? '',
          localPrice: data.localPrice,
          localCurrency: data.localCurrency,
          koreaPrice: data.koreaPrice,
          convertedLocalPrice: data.convertedLocalPrice,
          savingsAmount: data.savingsAmount,
          priceTagImageUrl: data.priceTagImageUrl,
          ocrRawText: data.ocrRawText,
          productLink: data.productLink,
          status: (data.status as "processing" | "completed" | "failed" | null) ?? "completed",
        })
        .returning();
      
      const comparison = result[0];
      
      // 절약액이 있으면 사용자 총 절약액 업데이트 (atomic increment with SQL)
      if (data.userId && data.savingsAmount) {
        await tx
          .update(users)
          .set({
            totalSavings: sql`${users.totalSavings} + ${data.savingsAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, data.userId));
      }
      
      console.log(`💾 Saved price comparison to DB: ${data.productName} (${data.savingsAmount}원 절약)`);
      return comparison;
    });
  }

  async getUserPriceComparisons(userId: string, limit: number = 10): Promise<PriceComparison[]> {
    return await db
      .select()
      .from(priceComparisons)
      .where(eq(priceComparisons.userId, userId))
      .orderBy(desc(priceComparisons.createdAt))
      .limit(limit);
  }

  async recordAffiliateClick(data: ClickTrackingData): Promise<void> {
    // Not implemented for DrizzleStorage yet
    console.log(`Recorded ${data.platform} affiliate click for: ${data.productName}`);
  }

  async updateUserSubscription(userId: string, subscriptionType: string, expiresAt: Date): Promise<User> {
    const result = await db
      .update(users)
      .set({
        subscriptionType: subscriptionType as any,
        subscriptionExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }

  async updateUserUsage(userId: string, searchCount: number, lastSearchDate: Date): Promise<User> {
    const result = await db
      .update(users)
      .set({
        dailySearchCount: searchCount,
        lastSearchDate: lastSearchDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }

  async updateUserSavings(userId: string, savingsAmount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const result = await db
      .update(users)
      .set({
        totalSavings: (user.totalSavings || 0) + savingsAmount,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }

  async getAffiliateClicks(userId?: string, platform?: 'coupang' | 'naver', days?: number): Promise<any[]> {
    // Not implemented for DrizzleStorage yet
    return [];
  }
}

// Use DrizzleStorage for PostgreSQL persistence
export const storage = new DrizzleStorage();
