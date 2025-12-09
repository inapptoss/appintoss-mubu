import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProductInfo {
  productName: string;
  price?: number;
  currency?: string;
  brand?: string;
  confidence: number;
}

export interface PriceTagInfo {
  price: number;
  currency: string;
  currencySymbol: string;
  rawText: string;
  confidence: number;
}

export interface ProductWithPriceAnalysis {
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

export async function analyzeProductImage(imageBase64: string, mimeType: string = "image/jpeg"): Promise<ProductInfo> {
  try {
    const systemPrompt = `You are a product recognition expert for price comparison apps. 
Analyze this image and extract product information with high accuracy.
Look for:
1. Product name/title (be specific, include brand and model if visible)
2. Price (look for price tags, labels, or displayed prices)
3. Currency symbol or text
4. Brand name if clearly visible

Respond with JSON in this exact format:
{
  "productName": "specific product name with brand and model",
  "price": number or null,
  "currency": "currency symbol or code" or null,
  "brand": "brand name" or null,
  "confidence": number between 0 and 1
}

If you cannot identify the product clearly, set confidence below 0.5.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            productName: { type: "string" },
            price: { type: ["number", "null"] },
            currency: { type: ["string", "null"] },
            brand: { type: ["string", "null"] },
            confidence: { type: "number" },
          },
          required: ["productName", "confidence"],
        },
      },
      contents: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        "Analyze this product image and extract detailed product information for price comparison."
      ],
    });

    const rawJson = response.text;
    console.log(`Product analysis result: ${rawJson}`);

    if (rawJson) {
      const data: ProductInfo = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from Gemini AI");
    }
  } catch (error) {
    console.error("Failed to analyze product image:", error);
    throw new Error(`Failed to analyze product image: ${error}`);
  }
}

// 가격표만 OCR하는 함수
export async function analyzePriceTag(imageBase64: string, mimeType: string = "image/jpeg"): Promise<PriceTagInfo> {
  try {
    const systemPrompt = `You are a price tag OCR expert. 
Your job is to extract price information from price tags, labels, or receipts.

Look for:
1. Numeric price value (extract only the number)
2. Currency symbol (฿, $, €, ¥, £, etc.)
3. Currency code (THB, USD, EUR, JPY, KRW, etc.)
4. Raw text exactly as shown on the price tag

Common currencies:
- ฿ = THB (Thai Baht)
- $ = USD (US Dollar) 
- € = EUR (Euro)
- ¥ = JPY (Japanese Yen) or CNY (Chinese Yuan)
- £ = GBP (British Pound)
- ₩ = KRW (Korean Won)

Respond with JSON:
{
  "price": extracted number only,
  "currency": "currency code (THB, USD, EUR, etc)",
  "currencySymbol": "actual symbol (฿, $, etc)",
  "rawText": "exact text from price tag",
  "confidence": number between 0 and 1
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            price: { type: "number" },
            currency: { type: "string" },
            currencySymbol: { type: "string" },
            rawText: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["price", "currency", "currencySymbol", "rawText", "confidence"],
        },
      },
      contents: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        "Extract the price information from this price tag image."
      ],
    });

    const rawJson = response.text;
    console.log(`Price tag OCR result: ${rawJson}`);

    if (rawJson) {
      const data: PriceTagInfo = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from Gemini AI");
    }
  } catch (error) {
    console.error("Failed to analyze price tag:", error);
    throw new Error(`Failed to analyze price tag: ${error}`);
  }
}

// 상품과 가격표를 함께 분석하는 함수 (MUBU의 핵심 기능)
export async function analyzeProductWithPriceTag(
  imageBase64: string, 
  mimeType: string = "image/jpeg"
): Promise<ProductWithPriceAnalysis> {
  try {
    const systemPrompt = `You are a product and price analysis expert for MUBU price comparison app.

CRITICAL TASK: Analyze this image and separate two distinct pieces of information:
1. THE PRODUCT ITSELF (what item is being sold)
2. THE PRICE TAG/LABEL (if visible in the image)

⚠️ IMAGE TYPE DETECTION - CHECK FIRST:
- IF this is a WEBPAGE/APP SCREENSHOT (e.g., online shopping page):
  * PRIORITY 1: Read the PAGE TITLE/PRODUCT TITLE text at the top
  * PRIORITY 2: Read product description text
  * PRIORITY 3: Look at product images as secondary reference
  * The TEXT on the page is MORE ACCURATE than the product image
- IF this is a PHYSICAL PRODUCT PHOTO (e.g., package in hand):
  * Read ALL text on the package/label carefully
  * Look at product images and packaging design

Product Analysis - STEP BY STEP:
STEP 1: READ ALL TEXT FIRST (웹페이지 제목, 상품명, 설명문 등)
- Extract exact product name from title/heading text
- Look for keywords indicating product type in text
- Identify if it's a PART/ACCESSORY vs COMPLETE PRODUCT

STEP 2: IDENTIFY EXACT PRODUCT TYPE
Complete Products vs Parts/Accessories:
- ✅ "Mouse" "마우스" = Complete computer mouse
- ❌ "Mouse Parts" "마우스 부품" "나사" "스크류" = Parts/components
- ✅ "Phone" "핸드폰" = Complete phone
- ❌ "Phone Case" "케이스" "Screen Protector" = Accessories
- ✅ "Laptop" "노트북" = Complete laptop
- ❌ "Laptop Battery" "배터리" "Charger" "충전기" = Parts

Product Type Categories:
- Electronics (완제품 vs 부품/액세서리 구분 필수)
- Food/Snacks (정확한 종류: 거미/건과일/과자/사탕 등)
- Clothing/Fashion (의류/신발/가방 등)
- Other categories

STEP 3: EXTRACT BRAND AND MODEL
- Brand name (if visible)
- Specific model number or variant

STEP 4: CREATE ACCURATE PRODUCT NAMES
- nameEnglish: Use text from image (if English) or translate
- nameKorean: Use text from image (if Korean) or translate accurately
- MUST PRESERVE the exact product type (parts vs complete, accessory vs main product)

CRITICAL RULES:
1. ⚠️ TEXT PRIORITY: Text on webpage/package is MORE accurate than images
2. ⚠️ DO NOT assume complete product when text says "parts" or "accessory"
3. ⚠️ If title says "나사" (screw) don't call it "마우스" (mouse)
4. Include ALL important keywords from title (brand + type + model + variant)
5. Korean name should match Korean shopping search terms exactly

IMPORTANT: Korean name should be suitable for searching Korean e-commerce sites like Naver Shopping.
- Include brand in Korean if well-known (e.g., "Logitech" → "로지텍", "Apple" → "애플")
- Include exact product type from title (e.g., "부품" "나사" "케이스" etc.)
- Preserve part/accessory designation if mentioned

Price Tag Analysis:
- Look for ANY price tag, label, sticker, or price display IN THE IMAGE
- Extract the exact price number
- Identify the currency symbol (฿, $, €, ¥, £, ₩)
- Determine currency code (THB, USD, EUR, JPY, KRW)
- Copy the exact text from the price tag

Common currencies:
- ฿ = THB (Thai Baht)
- $ = USD (US Dollar)
- € = EUR (Euro)
- ¥ = JPY or CNY
- £ = GBP
- ₩ = KRW

Respond with JSON:
{
  "product": {
    "name": "specific product name with brand and type (English or original)",
    "nameEnglish": "Brand + Product Type + Flavor (e.g., KUNNA Mango Gummy)",
    "nameKorean": "브랜드 + 제품타입 + 맛 (예: 쿤나 망고 거미)",
    "brand": "brand name" or null,
    "description": "Product type and brief details (e.g., Soft chewy mango-flavored gummy candy)" or null
  },
  "priceTag": {
    "detected": true/false,
    "price": number or null,
    "currency": "currency code" or null,
    "currencySymbol": "symbol" or null,
    "rawText": "exact text from tag" or null
  },
  "confidence": number between 0 and 1
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            product: {
              type: "object",
              properties: {
                name: { type: "string" },
                nameEnglish: { type: "string" },
                nameKorean: { type: "string" },
                brand: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
              },
              required: ["name", "nameEnglish", "nameKorean"],
            },
            priceTag: {
              type: "object",
              properties: {
                detected: { type: "boolean" },
                price: { type: ["number", "null"] },
                currency: { type: ["string", "null"] },
                currencySymbol: { type: ["string", "null"] },
                rawText: { type: ["string", "null"] },
              },
              required: ["detected"],
            },
            confidence: { type: "number" },
          },
          required: ["product", "priceTag", "confidence"],
        },
      },
      contents: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        "Analyze this image and extract BOTH product information AND price tag information if visible."
      ],
    });

    const rawJson = response.text;
    console.log(`Product with price tag analysis result: ${rawJson}`);

    if (rawJson) {
      const data: ProductWithPriceAnalysis = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from Gemini AI");
    }
  } catch (error) {
    console.error("Failed to analyze product with price tag:", error);
    throw new Error(`Failed to analyze product with price tag: ${error}`);
  }
}