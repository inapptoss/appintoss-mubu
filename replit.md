# MUBU - Must Buy

## Overview
MUBU (Must Buy) is a mobile-first web application enabling overseas travelers to make informed shopping decisions by comparing local product prices with Korean online retailers in real-time. Key features include camera-based product recognition, currency conversion, price comparison, and gamified savings tracking. The project aims to provide a smart shopping companion for travelers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **Styling**: Tailwind CSS with shadcn/ui component library, custom orange-based color scheme, dark/light mode.
- **State Management**: React Query for server state.
- **Routing**: Wouter for lightweight client-side routing.
- **PWA Support**: Configured for a mobile-like experience.
- **Mobile-First Design**: Responsive layout optimized for mobile, bottom tab navigation, Inter and Noto Sans KR fonts.

### Backend
- **Server**: Express.js with TypeScript.
- **Database**: Drizzle ORM with PostgreSQL (Neon serverless) for data persistence, including user management and price comparison schemas.
- **API**: Endpoints for image upload, price comparison, and user authentication.
- **Object Storage**: Replit Object Storage for persistent image hosting.

### Data Flow
- **Image Processing**: Camera capture and upload to object storage.
- **Price Comparison**: Structured flow for local vs. Korean price analysis.
- **Savings Tracking**: Gamified progress system.

### Authentication
- **Integration**: Replit Auth with multi-provider support (Google, GitHub, Apple, Email).
- **Session Management**: PostgreSQL session storage.
- **User Management**: Automatic user creation, protected routes.

### Security & Middleware
- **CSP**: Helmet CSP (disabled in development).
- **Rate Limiting**: Environment-aware configuration (60 req/min in production).
- **CORS**: Whitelist-based origin control in production.
- **Validation**: Zod for input validation on API endpoints.

## External Dependencies

### Core
- **Database**: Neon PostgreSQL serverless database.
- **ORM**: Drizzle ORM.
- **State Management**: React Query (TanStack Query).

### UI & Design
- **Component Library**: shadcn/ui (built on Radix UI).
- **CSS Framework**: Tailwind CSS.
- **Icons**: Lucide React.

### Development Tools
- **Build Tool**: Vite.
- **Language**: TypeScript.
- **Bundler**: ESBuild.

### Integrations
- **Object Storage**: Replit Object Storage.
- **Authentication**: Replit Auth.