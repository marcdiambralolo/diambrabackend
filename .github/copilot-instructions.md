# Copilot Instructions for Diambra

Diambra is a full-stack spiritual guidance platform (voyance, astrology, numerology) built with Next.js 14 App Router, TypeScript, and a separate backend API. These instructions help AI agents be immediately productive in this codebase.

## Project Overview
- **Framework**: Next.js 14 (App Router) with TypeScript strict mode
- **UI**: Tailwind CSS + Framer Motion animations, `lucide-react` icons
- **Backend**: External REST API at `NEXT_PUBLIC_API_URL` (default: `localhost:3001`)
- **Language**: French UI and metadata (`<html lang="fr">`)
- **Auth**: JWT-based with access/refresh tokens, localStorage + cookies for SSR middleware

## Developer Workflows

### Run & Build
- **Dev**: `npm run dev` → `http://localhost:3000` (ensure backend at `:3001`)
- **Build**: `npm run build` (static + SSR hybrid)
- **Lint**: `npm run lint` (Next.js ESLint config)
- **Requirements**: Node 18+

### Adding Features
1. **New API service**: Create `lib/api/services/myfeature.service.ts` with exported methods; add endpoints to `lib/api/endpoints.ts`
2. **New protected page**: Create `app/star/mypage/page.tsx`; data fetching via custom hook in `hooks/mypage/useMyPage.ts`
3. **New admin page**: Create `app/admin/mypage/page.tsx`; add nav config entry in `components/admin/AdminNavConfig.ts`
4. **New public page**: Create `app/mypage/page.tsx`; add to `publicRoutes` in `middleware.ts` if needed
5. **New component**: Place in `components/myfeature/`; mark `'use client'` if using hooks/motion

### Authentication Debugging
- Check `monetoile_access_token` cookie in DevTools → Application → Cookies
- Inspect localStorage: `monetoile_access_token`, `monetoile_refresh_token`, `monetoile_user`
- Token refresh logs in console: `"Error refreshing token:"` if refresh fails
- Middleware redirects logged: check `/auth/login?returnTo=...` in URL

### Common Gotchas
- **Middleware redirect loops**: Ensure `/auth/logout` is in `authActionRoutes` to prevent redirect when logging out
- **Token sync**: Always sync to cookie after setting token in localStorage (`document.cookie = ...`)
- **Dynamic routes**: Protected layouts must export `dynamic = "force-dynamic"` for middleware to work correctly
- **Axios interceptors**: Public routes (`/auth/login`, `/auth/register`) skip auth header; token refresh queues failed requests
- **Framer Motion SSR**: Wrap with `'use client'` directive to avoid hydration mismatches

## Architecture & Key Patterns

### Route Structure
- **Public**: `/`, `/auth/login`, `/auth/register`, `/terms`
- **Protected**: `/star/*` (user routes) and `/admin/*` (admin dashboard)
- **Middleware**: `middleware.ts` handles auth redirects; checks `monetoile_access_token` cookie and redirects unauthenticated users from protected routes
- **Dynamic routes**: Both star and admin layouts use `export const dynamic = "force-dynamic"` to ensure SSR compatibility

### Authentication Flow
1. Login/register via `authService` (`lib/api/services/auth.service.ts`)
2. Tokens stored in localStorage + synced to cookie (`document.cookie = 'monetoile_access_token=...'`)
3. `lib/api/client.ts` (Axios instance) adds `Authorization: Bearer ${token}` to requests, refreshes tokens on 401
4. `AuthContext` (`lib/auth/AuthContext.tsx`) provides `user`, `isAuthenticated`, `hasRole()`, `hasPermission()`
5. `ProtectedRoute` component redirects if not authenticated; `RoleGuard` checks roles (e.g., `Role.ADMIN`)

### API Integration
- **Client**: `lib/api/client.ts` - Axios instance with interceptors for token refresh
- **Services**: `lib/api/services/*` - domain-specific services (e.g., `auth.service.ts`, `notifications.service.ts`)
- **Endpoints**: `lib/api/endpoints.ts` - centralized API endpoint definitions
- **Base URL**: Configured via `lib/config.ts` → `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`
- **Token refresh**: Automatic retry on 401 using refresh token; clears auth and redirects to login on failure

### Component & Hook Patterns
- **Custom hooks**: Extract data fetching + state management (e.g., `hooks/admin/useAdminStats.ts`)
  - Pattern: `useState` for data/loading/error, `useCallback` for refetch, `useEffect` for initial fetch
  - Example: `useAdminStats()` returns `{ stats, loading, error, refetch, lastUpdated }`
- **Client components**: Mark with `'use client'` if using `framer-motion`, state, or browser APIs
- **Admin shell**: `components/admin/AdminShell.tsx` wraps admin pages with sidebar, top bar, mobile nav; uses `ProtectedRoute` + `RoleGuard`
- **Layouts**: `app/star/layout.tsx` and `app/admin/layout.tsx` wrap protected sections with `AuthProvider`, `ErrorBoundary`, sticky header

### Configuration & Environment
- **Config**: `lib/config.ts` centralizes API URL, auth keys, routes, pagination defaults
- **Env vars**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL` (for metadata)
- **TypeScript**: Path alias `@/*` maps to project root; strict mode enabled
- **Next.js**: `next.config.js` is active (JS takes precedence over TS); defines `images.remotePatterns` for `genspark.ai`

### Data Types & Interfaces
- **Core**: `lib/interfaces.ts` - `User`, `Consultation`, `Offering`, `Notification`, enums (`Role`, `Permission`, `SigneZodiacal`, etc.)
- **Auth types**: `lib/types/auth.types.ts` - `LoginDto`, `RegisterDto`, `AuthResponse`, `TokenPayload`
- **Service types**: Domain-specific types in `lib/types/*` (e.g., `notification.types.ts`, `knowledge.types.ts`)

## Styling Conventions
- **Tailwind utilities** for layout and spacing
- **Cosmic colors**: Use `cosmic-purple`, `cosmic-indigo`, `cosmic-pink` (defined in `tailwind.config.ts` and `app/globals.css`)
- **Gradients**: Consistent `from-purple-600 to-indigo-600` pattern; use `bg-gradient-to-r`
- **Animations**: Tailwind `animate-pulse`, `animate-spin`; custom keyframes (`float`, `glow`) in `globals.css`
- **Icons**: Import from `lucide-react` individually; standard sizing `w-6 h-6`

## External Integrations
- **Payment**: MoneyFusion service (`lib/api/services/moneyfusion.service.ts`); uses `/api/payments/moneyfusion/verify` for server-side verification
- **PDF generation**: `@react-pdf/renderer` for reports
- **Charts**: `recharts` for analytics/stats visualizations
- **Markdown**: `react-markdown` + `remark-gfm` for content rendering

## Environment Variables
Required environment variables (add to `.env.local`):
```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001

# Frontend URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=https://www.diambra.net

# Optional: City API (for location autocomplete)
NEXT_PUBLIC_CITY_API_URL=
NEXT_PUBLIC_CITY_API_KEY=

# Optional: Service ID (for specific consultations)
NEXT_PUBLIC_SERVICE_ID=
```

**Critical**: All Next.js public env vars must be prefixed with `NEXT_PUBLIC_` to be accessible in client components.

## Error Handling Patterns

### Error Boundary
- **Global**: `components/commons/ErrorBoundary.tsx` wraps app in `app/layout.tsx` via `ClientProviders`
- **Usage**: Catches React render errors; displays user-friendly fallback with retry button
- **Development mode**: Shows error stack trace; production shows generic message

### API Error Handling
- **Try-catch in hooks**: All API calls wrapped in try-catch; set error state for UI display
- **Pattern**: 
  ```ts
  try {
    const response = await api.get('/endpoint');
    setData(response.data);
  } catch (err: any) {
    setError(err.response?.data?.message || err.message || 'Erreur inconnue');
  } finally {
    setLoading(false);
  }
  ```
- **Axios interceptor**: Handles 401 (token refresh), 403 (permission denied) globally

### Component Error States
- **Pattern**: Dedicated `ErrorState` components per feature (e.g., `components/consultations/ErrorState.tsx`)
- **Display**: Animated error cards with `framer-motion`; retry buttons where applicable
- **Styling**: Gradient backgrounds (`from-red-900 via-rose-900`), icons from `lucide-react` (`AlertCircle`)

## Business Logic & Calculations

### Astrological Calculations
- **Carte du Ciel**: Generated by backend; frontend displays positions from `CarteDuCielData` interface
- **5 Portes**: Extracted via `lib/functions.ts → extractCinqPortes()`
  - Signe Solaire (position du Soleil)
  - Ascendant (Maison 1)
  - Signe Lunaire (position de la Lune)
  - Milieu du Ciel (Maison 10)
  - Descendant (opposé à l'Ascendant ou Maison 7)
- **Planet symbols**: Defined in `components/carteduciel/PositionCard.tsx` and `components/admin/genereanalyse/PlanetChip.tsx`
- **Zodiac signs**: Enum `SigneZodiacal` in `lib/interfaces.ts` (12 signs in French)

### Numerology Calculations
- **Hook**: `hooks/numerologie/useNumerologyCalculator.ts`
- **Calculations**:
  - **Chemin de Vie** (Life Path): Sum of birth date digits, reduce to single digit (keep 11, 22, 33)
  - **Nombre d'Expression**: Sum of all letters in full name (A=1, B=2, ...)
  - **Nombre d'Âme**: Sum of vowels only (AEIOUY)
  - **Nombre de Personnalité**: Sum of consonants only
  - **Nombre de Naissance**: Day of birth reduced
- **Master numbers**: 11, 22, 33 not reduced further
- **Interpretations**: Hardcoded in `useNumerologyCalculator` for each number 1-9, 11, 22, 33

### Data Processing
- **User data mapping**: `lib/functions.ts → mapFormDataToBackend()` converts frontend User to backend DTO
- **Date formatting**: `formatDate()` uses French locale (`fr-FR`)
- **Processed data**: `processUserData()` transforms raw User data for display components

## Testing
- **No test suite currently**: Project has Playwright dependencies but no active tests
- **Manual testing**: Focus on auth flows, payment callbacks, and consultation generation
- **Debugging**: Use browser DevTools → Network tab for API calls; Console for errors







## Examples

### Create a new protected feature
1. Hook: `hooks/myfeature/useMyFeature.ts`
   ```ts
   import { useState, useEffect } from 'react';
   import { api } from '@/lib/api/client';
   
   export function useMyFeature() {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);
     useEffect(() => {
       api.get('/myfeature').then(res => setData(res.data)).finally(() => setLoading(false));
     }, []);
     return { data, loading };
   }
   ```
2. Page: `app/star/myfeature/page.tsx`
   ```tsx
   'use client';
   import { useMyFeature } from '@/hooks/myfeature/useMyFeature';
   
   export default function MyFeaturePage() {
     const { data, loading } = useMyFeature();
     if (loading) return <div>Chargement...</div>;
     return <div>{data}</div>;
   }
   ```

### Add a new admin page
3. Page is automatically wrapped in `AdminShell` (sidebar + auth guards)

Keep changes focused and test auth flows when modifying `middleware.ts`, `AuthContext`, or API client interceptors.