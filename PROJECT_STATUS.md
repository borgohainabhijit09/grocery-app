# Grocery App — Project Status

_Last updated: 2026-10-17_

## 1. Project Overview
A **single-vendor grocery e-commerce platform** built milestone-by-milestone, consisting of:
- **Web storefront** (customer-facing shopping)
- **Web admin panel** (vendor management)
- **Two native Android apps**: customer app + admin app

Repository: `C:\Users\320301827\Documents\WORKSPACE\01_CLIENTS\Active\Ananta Yein\grocery-app`
Isolated git repo (branch `main`, no remote), initial commit `a114fb1`. The parent `Active/` folder is a **different** repo (`hasty-tasty`) — grocery-app must never be committed there.

## 2. Tech Stack & Environment
- **Next.js 16.2.9** (Turbopack), **React 19.2.4**, **Prisma 6.19.3**, **NextAuth v5 beta**, **Turborepo**, **Tailwind v4**, **PostgreSQL**.
- **Database:** `postgresql://postgres:password@localhost:5460/grocery`. No `prisma/migrations` — uses `prisma db push`.
- **Dev server:** port **3010**; health check `/api/health` -> `{"ok":true,"db":true}`.
- **Seed credentials:**
  - Admin: `admin@grocery.test` / `Admin@12345`
  - Staff: `staff@grocery.test` / `Admin@12345`
  - Customer: `customer@grocery.test` / `Customer@123`
  - Delivery: `delivery@grocery.test` / `Delivery@123`
- **Monorepo layout:** `apps/web`, `packages/database`, `packages/shared`. The two mobile apps are **standalone** (not npm workspaces, no imports of `shared`/`database`).

## 3. Web Milestones (M0–M6) — Complete & Verified
- **M0** Foundation / project scaffolding
- **M1** Catalog & storefront
- **M2** Cart & checkout
- **M3** Admin orders
- **M4** Delivery & notifications
- **M5** Notifications / queue processing
- **M6** Phone OTP auth

## 4. Web Features & Fixes Shipped
- **Post-launch batch (7 features) — shipped & typechecked:**
  - **Stock badges / clarity** — shared `packages/shared/src/utils/stock.ts` (`stockState`, `stockLabel`, threshold 5); "Only X left" badges on web `product-card` + product page (`Badge variant="warning"`) and mobile `product-card` + product detail; `lowStockThreshold` now serialized in product cards.
  - **Reorder / Buy again** — `lib/cart-service.ts` (`ensureUserCart`, `cartPayload`, `reorderIntoCart`), `reorderAction` (`app/actions/cart.ts`), `components/reorder-button.tsx`; wired on web account orders list + detail, mobile orders list + detail. API `POST /api/v1/orders/[id]/reorder`.
  - **Up-front serviceability** — `GET /api/v1/serviceability` (Haversine vs `StoreSettings` radius → fee/free-above/min-order); `components/delivery-checker.tsx` on home + product pages; checkout computes per-address `serviceable`, blocks submit with a notice when out of range.
  - **Order-status push** — `lib/push.ts` (Expo Push API), `processNotificationQueue` now handles `PUSH` via `DeviceToken`, `queueNotification` fans out to EMAIL + PUSH, and `processNotificationQueueSoon()` drains the outbox in the background after order placed/cancelled/status changes. New `back_in_stock` template.
  - **Back-in-stock notify** — `lib/stock-alerts.ts` stores requests in `AuditLog` (entity `StockAlert`, no schema change), de-duplicated while pending; `notifyWhenBackInStockAction` + `components/notify-stock-button.tsx` on out-of-stock product page (guest email or signed-in account), mobile "Notify me" button via `POST /api/v1/products/[id]/stock-alert`; auto-fires when an admin restocks a variant from 0 → >0 (server actions + admin inventory API).
  - **Search upgrades** — `GET /api/v1/products/suggest` (products + categories, plus popular terms from `AuditLog`); web `components/shop/header-search.tsx` rewritten (debounced suggestions, recent searches in `localStorage`, trending), `lib/search-log.ts` records queries (throttled). Mobile shop tab now shows an inline suggestions panel.
  - **Admin slot management** — `app/admin/(dashboard)/slots/**` (CRUD + activate/deactivate, booked/capacity counts, "has orders → deactivate not delete") via `app/actions/admin/slots.ts`; "Slots" added to admin nav.
- **Floating delivery checker + footer redesign:**
  - The "Check delivery availability" section was removed from the home and product pages and replaced by a site-wide **floating widget** (`components/delivery-checker-float.tsx`, rendered from the storefront layout): a small collapsible pill (bottom-left) that expands into a compact panel, auto-checks the signed-in user's default address (status dot) and reuses `GET /api/v1/serviceability`.
  - The site footer was rebuilt (`components/layout/site-footer.tsx`) — 4-column layout with brand/tagline, trust badges (free-delivery threshold, pickup, secure payments), WhatsApp CTA, Shop/Account link columns, contact details pulled from `StoreSettings`, and a slim bottom bar.
  - Also fixed: a dynamic-route name collision — the restock-alert API was moved from `api/v1/products/[id]/stock-alert` to `api/v1/products/[slug]/stock-alert` so it no longer conflicts with `api/v1/products/[slug]` (the collision had broken all product detail lookups).
- **Admin panel overhaul + UI beautification** (all typechecked/linted; dashboard queries runtime-verified against the DB):
  - **UI kit + dark mode** — added `@custom-variant dark` (class-based), `.dark` token overrides, `--chart-1..5`, `.skeleton` shimmer and `.scrollbar-thin` in `globals.css`; new primitives `components/ui/{dropdown-menu,select,dialog,tabs,tooltip,checkbox,skeleton,toast,table,confirm-dialog}.tsx` (Subpath `radix-ui/*` imports); `components/theme-provider.tsx` (`useTheme` via `useSyncExternalStore`, no-flash `ThemeScript` in root layout, `ThemeToggle`); custom toast store + `<Toaster/>`.
  - **Quick wins** — active-state sidebar `components/admin/admin-nav.tsx` (grouped + mobile), `components/admin/page-header.tsx`, unified `components/status-badge.tsx` (`StatusBadge`/`OrderStatusBadge`/`PaymentStatusBadge`/`NotificationStatusBadge`; old `order-status-badge.tsx` re-exports it), admin `loading.tsx` + `error.tsx`, rebuilt admin shell layout.
  - **Tables & bulk actions** — `orderItem`/product/inventory tables rebuilt on `ui/table` primitives with row selection + bulk toolbars; new actions `bulkUpdateOrderStatusAction` (orders), `bulkProductAction` (products: activate/deactivate/feature/unfeature/delete), `bulkSetStockAction` (inventory: set/add), `toggleCustomerActiveAction` (customers); CSV exports `api/admin/{orders,customers,products}/export`; customers block/enable + Export; inventory bulk stock + filters; all pages use `PageHeader`.
  - **Dashboard analytics** — `app/admin/(dashboard)/page.tsx` now has 7/30/90-day ranges, KPI cards with period-over-period deltas (`components/admin/stat-card.tsx`), inline SVG revenue trend (`components/admin/trend-chart.tsx`), order-status breakdown, top products, low-stock list, "needs attention" (pending / unassigned deliveries) and recent orders.
- **Storefront redesign (home / checkout / account)** —
  - Home: compact circular category grid (`grid-cols-4 sm:6 lg:8`), featured-products **carousel** (`components/home/featured-carousel.tsx`), festive-season CTA banner (`festive-cta.tsx`), lead-capture popup (`lead-capture-popup.tsx`, appears after 6s, dismiss persisted in `localStorage`, submits `captureLeadAction`), and an app-download section (`app-download.tsx`, driven by `NEXT_PUBLIC_PLAY_STORE_URL` / `NEXT_PUBLIC_APP_STORE_URL`). CTA + app-download sit in a 1-row 2-col grid (`lg:grid-cols-2`).
  - Home — **five added sections** (all server-rendered from existing tables, no schema change): **Trust / USP strip** (`usp-strip.tsx`; free-delivery threshold pulled from `StoreSettings.freeDeliveryAbovePaise`), **Shop-by-need promo tiles** (`promo-tiles.tsx`; first 3 categories with image + gradient overlay), **Best sellers** rail (aggregates `OrderItem` via `groupBy` on `variantId` → product totals), **Deals of the day** grid (active products whose representative variant has `mrpPaise > pricePaise`, ranked by discount %), and a **Store / pickup banner** (`store-info.tsx`; `StoreSettings` address/phone, next available `PICKUP` slot, and an embedded Google Maps iframe from lat/long).
  - Checkout: rebuilt as a 2-column layout (`lg:grid-cols-[1fr_360px]`) with a **horizontal date + time slot picker** (separate date chips and time chips, grouped by day), selectable address/payment/fulfillment cards, coupon chips moved into a sticky order-summary sidebar with the "Place order" CTA.
  - Shop / category: on **mobile**, the product filters open in a **left slide-in drawer** (`components/shop/filter-drawer.tsx`, `animate-slide-in-left`, mirrors the right-side cart drawer) triggered by a "Filters" button; the desktop left sidebar is unchanged (`hidden lg:block`). New keyframe `slide-in-left` added in `globals.css`.
  - Order details: status **progress stepper** (delivery vs pickup flow, terminal states handled), order timeline, and a sticky sidebar (fulfillment, payment, address, help).
  - Account: **editable profile** — `updateProfileAction` (`app/actions/profile.ts`) + `components/account/profile-form.tsx`, phone-uniqueness guarded; email read-only.
- **Lead capture** — popup submissions stored with **no schema change** in the existing `AuditLog` model (`entity:"Lead"`, `action:"LEAD_CAPTURE"`, details in `diff` JSON).
- **Cart drawer full-height fix** — root cause: header `backdrop-blur` created a containing block for `position:fixed`. Fixed via `createPortal` to `document.body`, enter-only animations, overlay blur, slide-in keyframes in `globals.css`; rewrote `cart-drawer.tsx`.
- **Hero redesign** — CSS background + gradient overlay, badge, CTAs, chips; hero image now `public/grocery-hero.png` rendered with `next/image` (`fill`, `priority`) on `(storefront)/page.tsx`.
- **Coupon management** — full admin CRUD (web + API + mobile admin) plus a customer-facing available-coupons list on the web checkout; tappable coupon chips on mobile checkout.
- **Browser geolocation** in address form (auto-capture for new addresses, "Use current location", controlled lat/long).
- **Favicon** — `app/icon.svg` (green basket + leaf).
- **Earlier features:** quick-add, My Account pages/tabs, Admin Customers list+detail, responsive admin tables, admin mobile nav, page transitions (`fade-in`/`fade-up`/`scale-in` + `template.tsx`).

## 5. REST API Layer (`/api/v1/*`) — Built for Mobile
**Foundation:** `lib/api-helpers.ts`, `lib/api-auth.ts`, `lib/api-serialize.ts`, `lib/api-admin-serialize.ts`, `lib/order-service.ts`.
- **Auth:** JWT HS256 via `jose`, 30-day TTL, secret `AUTH_SECRET ?? NEXTAUTH_SECRET ?? dev-api-secret-change-me`; `Bearer` header; verifies live active user in DB.
- **Guards:** `requireApiUser`, `requireApiRole`, `requireStaffApi`, `requireAdminApi`.

**Customer endpoints (24; original 20 runtime-verified, +4 new):**
`auth/login`, `auth/register`, `auth/otp/request`, `auth/otp/verify`, `me`, `categories`, `products` (search/filter/sort/paginate), `products/[slug]`, `products/suggest`, `products/[id]/stock-alert`, `settings`, `serviceability`, `slots`, `cart` (GET/POST/PATCH/DELETE), `addresses` + `[id]` + `[id]/default`, `coupons` (list active), `coupons/validate`, `orders` (list + place), `orders/[id]`, `orders/[id]/cancel`, `orders/[id]/reorder`, `notifications/register`.

**Admin endpoints (22) — runtime-verified:**
`admin/stats`; `admin/products` + `[id]` + `[id]/toggle`; `admin/categories` + `[id]`; `admin/coupons` + `[id]` + `[id]/toggle`; `admin/orders` + `[id]` + `[id]/status|paid|assign`; `admin/inventory`; `admin/customers` + `[id]`; `admin/delivery` + `[id]/toggle`; `admin/settings` (GET/PUT); `admin/notifications` + `process` + `[id]/retry`.

**Runtime tests (`apitest.ps1`) all passed:** customer login 200 (token 257 chars); catalog 200; nonexistent product 404; cart add invalid variant 400; all 9 admin GETs 200; admin/stats as customer -> 403; `/api/v1/me` no token -> 401.

## 6. Customer Expo App (`apps/mobile`) — Phase 3 Complete
**Stack:** Expo SDK 57, expo-router, TypeScript, React 19.2.0 / RN 0.84.1.
- **Config:** `package.json`, `app.json` (expo-router + expo-notifications + expo-location plugins), `babel.config.js`, `tsconfig.json` (`@/*` -> `./src/*`), `metro.config.js`, `eas.json`.
- **Lib:** `types.ts` (local), `format.ts`, `storage.ts` (SecureStore), `api.ts` (host auto-detect via `expo-constants` hostUri -> port 3010, `EXPO_PUBLIC_API_URL` override), `errors.ts`, `push.ts`.
- **Context/Components:** `context/auth.tsx`, `context/cart.tsx`, `hooks/use-add-to-cart.ts`, `components/{ui,product-card,quantity-stepper}.tsx`, `theme.ts`.
- **Screens:** `_layout`, `login` (email/password + OTP), `register`, `(tabs)/{_layout,index,shop,cart,orders,account}`, `product/[slug]`, `checkout`, `orders/[id]`, `addresses`.

## 7. Admin Expo App (`apps/admin-mobile`) — Phase 5 Built
Full parity with the web admin.
- **Config:** same set as mobile (staff-gated login, dark slate branding, `com.freshbasket.admin`, scheme `freshbasketadmin`).
- **Lib:** admin `types.ts`, `api.ts` (covers all 18 admin endpoints), `format.ts` (+ `rupeesToPaise`/`paiseToRupees`/status flow), `errors.ts`, `storage.ts`.
- **Core:** `context/auth.tsx` (rejects non-ADMIN/STAFF), `components/ui.tsx` (Button/TextField/Badge/Chip/RowLink/EmptyState/Loading/ErrorText).
- **Tabs:** Dashboard (6 stat cards + recent orders, pull-to-refresh), Orders (status chips w/ counts, search, unassigned filter, pagination), Products (search, feature/active toggles, new), More (links + sign out).
- **Stack screens:** `orders/[id]` (status transitions, mark paid, assign partner, timeline, payments, address), `products/[id]` (new + edit: variants, images, categories, tags, flags, delete), `categories` (modal CRUD + parent picker), `coupons` (list + status filters + modal CRUD, quick activate/deactivate), `inventory` (quick +/-1, set stock/threshold, low-stock filter), `customers/index` + `[id]`, `delivery`, `settings` (admin-only), `notifications` (outbox, process, retry).
- **Post-launch batch (mobile parity):** low-stock badges on product cards + detail; "Buy again" on orders list + detail (`api.reorder` + cart context); "Notify me when back in stock" button on out-of-stock product detail (`api.stockAlert`); debounced search suggestions panel on the Shop tab (`api.suggest`); device push registration already wired (`api.registerDevice`).

## 8. Mobile Config & Build
- **Config:** `package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `metro.config.js`, `eas.json` for both apps.
- **Metro isolation:** `metro.config.js` scopes Metro to each app's own `node_modules` (`watchFolders`, `nodeModulesPaths`).
- **EAS:** `eas.json` in both apps with `preview`/`production` profiles producing **APK**; `EXPO_PUBLIC_API_URL` env (e.g. `http://192.168.1.10:3010`) configured per profile.
- **Expo SDK 57 pinned versions** (verified via `expo-doctor`): `expo ~57.0.30`, `react 19.2.3`, `react-dom 19.2.3`, `react-native 0.86.3`, `expo-router ~57.0.28`, `expo-secure-store ~57.0.4`, `expo-constants ~57.0.22`, `expo-linking ~57.0.13`, `expo-notifications ~57.0.23`, `expo-location ~57.0.21`, `expo-status-bar ~57.0.1`, `expo-device ~57.0.2`, `expo-font ~57.0.4`, `react-native-safe-area-context ~5.7.0`, `react-native-screens ~4.26.0`, `@expo/vector-icons ^15.0.2`, dev: `@babel/core ^7.20.0`, `babel-preset-expo ~57.0.16`, `typescript ~6.0.3`, `@types/react ~19.2.2`.
- **Decision:** ship **source code only**; APKs are built by the client.

## 9. Verification Status
- **Web:** typecheck, lint, and build all pass. API endpoints runtime-verified.
- **Storefront redesign (runtime-verified):** `/` returns **200** and renders the hero image, USP strip, promo tiles, category grid, "Best sellers" and "Featured products" carousels, "Deals of the day", "Store & pickup" banner (address, phone, earliest pickup slot, Maps iframe) and festive CTA + app-download section. Authenticated `/checkout` returns **200** with the new sections ("Pick a date", "Pick a time", "Order summary", "Apply coupon", "Place order"); `/account` returns **200** with "Edit profile"/"Save changes"; order-details page returns **200** with the status stepper, timeline and summary. Placing an order through the redesigned form posts the server action successfully (**303 -> `/checkout/success?orderId=...`**, real `Order` row created; blocked by the delivery-radius rule for the seed address on DELIVERY, works end-to-end via PICKUP). Lead-capture `AuditLog` write verified against the live DB.
- **Coupons (runtime-verified):** public `GET /api/v1/coupons` lists active coupons (seed: `WELCOME50`, `FRESH10`); admin list/create/get/patch/toggle/status-filter/delete all pass; duplicate code -> **409**; unauthenticated admin access -> **401**; `/admin/coupons` page compiles and redirects unauthenticated users (**307**).
- **Mobile apps (both):** dependencies installed; `tsc --noEmit` passes (strict mode); `expo-doctor` **21/21** checks pass; **Android production bundle exports successfully** (`npx expo export --platform android`). Not yet run on a device/emulator or built into an APK.
- **Post-launch batch (7 features):** `apps/web` `tsc --noEmit` and targeted `eslint` clean; `apps/mobile` `tsc --noEmit` clean. Not yet exercised end-to-end against the live DB (push delivery needs real Expo device tokens; restock-alert email/push needs a run with stock going 0 → positive).

## 10. Known Gaps / Pending
1. **`jose` lockfile not synced** — `apps/web/package.json` has `"jose": "^6.2.12"`; root `npm install` still pending (warning: Prisma `generate` can hit EPERM on `query_engine-windows.dll.node`).
2. **Delivery radius limits seed addresses** — the seeded address (`seed-address-1`) is outside the configured delivery radius, so DELIVERY orders fail validation in tests; PICKUP works. Not a code issue.
3. **Device smoke-test / APK builds** — run the apps on an emulator against the local API, then build APKs via EAS (client-side).
4. **Push delivery & restock alerts need runtime verification** — order-status push requires the mobile app to register an Expo token and `EXPO_ACCESS_TOKEN` (optional) on the server; back-in-stock alerts are stored as `AuditLog` rows (entity `StockAlert`) and fired on a 0 → positive stock change.
5. **Slot capacity race** — order placement counts-then-creates against `Slot.capacity` (TOCTOU); acceptable for now, may need a transaction/lock under high concurrency.

## 11. Key Reference Files
- `apps/web/src/app/api/v1/**` — customer + admin endpoints
- `apps/web/src/lib/{api-helpers,api-auth,api-serialize,api-admin-serialize,order-service,coupon,notifications}.ts`
- `apps/web/src/app/actions/admin/{_shared,categories,coupons,slots,inventory}.ts` — admin server actions
- `apps/web/src/app/actions/{leads,profile,stock-alerts}.ts` — lead-capture (`AuditLog`), profile update, and restock-alert actions
- `apps/web/src/lib/{push,stock-alerts,cart-service,search-log}.ts` — push sender, restock alerts (`AuditLog`), reorder service, search logging
- `apps/web/src/app/admin/(dashboard)/slots/**`, `apps/web/src/components/{delivery-checker,notify-stock-button,reorder-button,shop/header-search}.tsx`
- `apps/web/src/components/home/{featured-carousel,lead-capture-popup,festive-cta,app-download,usp-strip,promo-tiles,store-info}.tsx` — home sections
- `apps/web/src/app/(storefront)/page.tsx` — home data (`getHomeData`) + best-seller/deal helpers
- `apps/web/src/components/checkout/checkout-form.tsx`, `apps/web/src/components/account/profile-form.tsx`
- `apps/web/src/app/admin/(dashboard)/coupons/**` — admin coupon UI
- `apps/web/src/proxy.ts` — Next 16 middleware (passes `/api/*` through untouched)
- `apps/mobile/**`, `apps/admin-mobile/**` — the two native apps
- `packages/database/prisma/schema.prisma`, `packages/shared/src/{constants.ts,schemas/*,utils/*}`
- Test scripts in `C:\Users\320301~1\AppData\Local\Temp\opencode\` (`apitest.ps1`, `pages6.ps1`, `features7-test.ps1`, `cart7-test.ps1`)
