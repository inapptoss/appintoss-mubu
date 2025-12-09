# MUBU Design Guidelines

## Design Approach
**Reference-Based Approach** - Drawing inspiration from successful mobile commerce apps like Shopify, Instagram Shopping, and travel apps like Airbnb for their visual-rich, experience-focused design patterns that drive user engagement through emotional connection.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Orange primary: 25 85% 55% (vibrant orange matching the logo)
- Orange secondary: 25 75% 65% (lighter orange for accents)
- Dark mode background: 220 15% 8% (deep charcoal)
- Light mode background: 0 0% 98% (warm white)

**Supporting Colors:**
- Success green: 142 76% 36% (for "다 쓸어담어!" messages)
- Warning amber: 43 96% 56% (for "굳이?" messages) 
- Info blue: 217 91% 60% (for "여행에 충실해라" messages)
- Neutral grays: 220 9% ranges from 15% to 85%

### B. Typography
**Primary Font:** Inter (Google Fonts)
- Headlines: 600-700 weight, 24-32px
- Body text: 400-500 weight, 16-18px
- UI elements: 500 weight, 14-16px

**Korean Support:** Noto Sans KR (Google Fonts) for Korean text
- Same weight and size hierarchy as Inter

### C. Layout System
**Tailwind Spacing Units:** Consistent use of 2, 4, 6, 8, 12, 16 units
- Micro spacing: p-2, m-2 (8px)
- Standard spacing: p-4, m-4 (16px) 
- Section spacing: p-8, m-8 (32px)
- Large spacing: p-16 (64px) for major sections

### D. Component Library

**Navigation:**
- Bottom tab navigation with orange accent for active states
- Clean, minimal top bar with MUBU logo
- Floating camera button as primary CTA

**Camera Interface:**
- Full-screen camera viewfinder
- Subtle overlay guides for product framing
- Orange capture button with subtle glow effect

**Price Comparison Cards:**
- Clean white/dark cards with subtle shadows
- Clear price typography with currency symbols
- Color-coded savings indicators (green for savings, amber for neutral)

**Results Display:**
- Large, readable price comparisons
- Fun emoji-enhanced messages
- Clear "구매함" (Purchased) button in orange

**Progress Tracking:**
- "비행기값 벌기" progress bars in orange gradient
- Achievement badges and milestone celebrations
- Clean data visualization for spending history

**Forms & Inputs:**
- Consistent dark mode implementation across all form elements
- Orange focus states and active indicators
- Rounded corners (8px) for modern feel

### E. Animations
**Minimal & Purposeful:**
- Camera capture flash effect
- Gentle slide transitions between screens  
- Success animations for purchase confirmations
- Subtle loading states for API calls

## Images
**Logo Placement:** MUBU orange shopping bag logo in top navigation bar and splash screen

**Product Photos:** User-captured images displayed in rounded containers with subtle shadows

**Empty States:** Friendly illustrations encouraging first camera capture, using orange accent colors consistent with brand

**No Large Hero Image:** This is a utility-focused mobile app - the camera interface serves as the primary visual element rather than traditional hero imagery.

## Key UX Principles
- **Mobile-first:** Optimized for one-handed use
- **Instant feedback:** Clear visual responses to all user actions
- **Joy in utility:** Fun messaging that makes price comparison entertaining
- **Accessibility:** High contrast ratios, readable fonts, clear touch targets
- **Korean UX patterns:** Familiar interaction patterns for Korean mobile users