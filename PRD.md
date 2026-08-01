# AutoCare — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-02-07
**Status:** Draft

---

## 1. Product Overview

### 1.1 Vision

AutoCare is a **SaaS platform** for automobile service centers in the UAE. It digitizes the entire vehicle servicing workflow — from customer booking through diagnosis, parts procurement, servicing, payment, and delivery — providing transparency to customers and operational efficiency to garage operators.

### 1.2 Value Proposition

| Stakeholder | Problem | AutoCare Solution |
|-------------|---------|-------------------|
| **Garage Owners** | Paper/WhatsApp-based job tracking, no visibility into operations | Digital job cards, real-time dashboards, revenue analytics |
| **Customers** | No idea what's happening to their car, surprise bills | Real-time status tracking, upfront estimates, digital approvals |
| **Service Advisors** | Manual estimate creation, phone-based vendor coordination | Digital estimates, automated RFQ to multiple vendors |
| **Technicians** | Verbal work instructions, no documentation | Digital work orders, photo/video progress updates |
| **Drivers** | Paper-based pickup schedules, no route optimization | Digital pickup/delivery queue with navigation |
| **Vendors** | Miss RFQ opportunities, slow quote turnaround | Push-notified RFQs, digital quote submission |

### 1.3 Target Market

- **Geography:** UAE (Dubai, Abu Dhabi, Sharjah — expandable to GCC)
- **Segment:** Independent garages, multi-branch service chains, franchise workshops
- **Size:** 5–200 employees per tenant, 10–100 jobs per day per branch
- **Language:** English (Arabic deferred)

### 1.4 Business Model

SaaS subscription (pricing model to be determined post-validation). Initial focus is on feature completeness and user acquisition. Monetization options under consideration:

- Monthly subscription per garage/branch
- Per-job transaction fee
- Tiered plans (Free/Basic/Pro/Enterprise)
- Freemium with premium features gated

---

## 2. User Personas

### 2.1 Garage Owner / Admin

**Role in system:** `admin`

- Owns one or more branches
- Manages staff, vendors, and operations
- Tracks revenue, job throughput, and customer satisfaction
- Needs: Dashboard analytics, user management, branch configuration, reports

### 2.2 Service Advisor

**Role in system:** `service_advisor`

- Front-desk staff who receives vehicles and manages job flow
- Creates estimates, sends RFQs to vendors, coordinates with technicians
- Primary operator of the web dashboard
- Needs: Job queue, estimate builder, RFQ management, customer communication

### 2.3 Technician / Mechanic

**Role in system:** `technician`

- Performs diagnosis, repairs, and quality checks
- Posts progress updates with photos/videos
- Needs: Assigned job list, work order details, update posting, QC checklists

### 2.4 Driver

**Role in system:** `driver`

- Handles vehicle pickup from customer and delivery back
- Tracks location during transit
- May collect cash payments on delivery
- Needs: Pickup/delivery queue, navigation, location sharing, cash collection

### 2.5 Vendor / Parts Supplier

**Role in system:** `vendor`

- Receives RFQs for parts
- Submits quotes with pricing, availability, and warranty info
- Fulfills orders and tracks delivery
- Needs: RFQ notifications, quote submission, order management

### 2.6 Customer / Vehicle Owner

**Role in system:** `customer`

- Books service, drops off or requests vehicle pickup
- Approves estimates and parts quotes
- Makes payments online or in cash
- Tracks job progress in real time
- Needs: Booking wizard, status tracking, approval actions, payment, feedback

---

## 3. Feature Requirements

### Priority Legend (MoSCoW)

- **M** — Must Have (required for launch)
- **S** — Should Have (high value, launch without if needed)
- **C** — Could Have (nice to have, post-launch)
- **W** — Won't Have (out of scope for v1)

---

### 3.1 Multi-Tenancy & SaaS Layer [M]

**Current state:** Single-tenant. `Branch` model exists but no tenant/organization isolation.

| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| MT-1 | Organization/Tenant model | M | New `Organization` entity above `Branch`. Each garage signup creates one Organization. |
| MT-2 | Tenant-scoped data isolation | M | All queries filtered by `organization_id`. Users, vehicles, jobs, payments — all scoped. |
| MT-3 | Tenant admin role | M | `org_admin` role that manages their own branches, staff, vendors, and settings. Distinct from platform `super_admin`. |
| MT-4 | Self-service garage signup | S | Onboarding wizard: create org → add first branch → invite staff. |
| MT-5 | Super-admin panel | S | Platform-level admin to manage all tenants, view platform-wide metrics, handle support. |
| MT-6 | Tenant-level settings | M | Each org configures: working hours, service types, tax rates, payment methods, notification preferences. |
| MT-7 | Subscription & billing | W | Deferred. Free access during validation phase. |
| MT-8 | Custom branding per tenant | C | Logo, colors, business name shown in customer-facing screens and invoices. |

**User Stories:**
- As a garage owner, I can sign up and create my organization so I can start managing my service center digitally.
- As a garage owner, I can add multiple branches under my organization.
- As a garage owner, I can only see data belonging to my organization.
- As a platform super-admin, I can view and manage all organizations.

**Acceptance Criteria:**
- No data leakage between tenants under any circumstance
- Existing single-tenant features continue working with tenant context added
- Branch, User, Vehicle, Job, Payment, RFQ models all gain `organization_id` FK
- API endpoints enforce tenant isolation via middleware/dependency

---

### 3.2 Authentication & Authorization [M]

**Current state:** OTP-based auth working. JWT tokens with refresh. 6 roles with route-level access control.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| AU-1 | OTP login (customer) | M | Done |
| AU-2 | OTP login (staff/admin) | M | Done |
| AU-3 | JWT access + refresh tokens | M | Done |
| AU-4 | Role-based access control (6 roles) | M | Done |
| AU-5 | Tenant-scoped authorization | M | Not started — add org-level isolation |
| AU-6 | Rate limiting on OTP endpoints | S | Not started |
| AU-7 | OTP via real SMS (Twilio) | M | Stub exists |
| AU-8 | Password-based login for staff | C | Not started (OTP-only currently) |
| AU-9 | Session management / device tracking | C | Not started |

---

### 3.3 Job Card Lifecycle [M]

**Current state:** 23-state machine implemented in backend. Mobile and web partially wired.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| JC-1 | Customer creates booking | M | Done (mobile + web) |
| JC-2 | Service advisor schedules job | M | Backend done, web UI missing status update |
| JC-3 | Driver pickup flow | M | Backend done, mobile partial |
| JC-4 | Vehicle intake checklist | M | Backend done, no frontend |
| JC-5 | Technician diagnosis | M | Backend done, no frontend |
| JC-6 | Estimate creation (line items) | M | Backend done, web create missing |
| JC-7 | Customer estimate approval | M | Done (mobile) |
| JC-8 | RFQ to vendors | M | Backend done, web stub |
| JC-9 | Vendor quote submission | M | Backend done, mobile stub |
| JC-10 | Quote comparison & selection | M | Backend done, no frontend |
| JC-11 | Customer parts approval | M | Done (mobile) |
| JC-12 | Payment collection | M | Backend done, mobile partial |
| JC-13 | Work order assignment | S | Backend done, no frontend |
| JC-14 | Progress updates with photos | M | Done (mobile + backend) |
| JC-15 | QC checklist | S | Backend done, no frontend |
| JC-16 | Vehicle delivery | M | Backend done, mobile partial |
| JC-17 | Customer feedback & rating | M | Done (mobile + backend) |
| JC-18 | Job status update from web dashboard | M | Backend done, web button not wired |
| JC-19 | Job card PDF/print | S | Not started |

---

### 3.4 Vehicle Management [M]

**Current state:** CRUD working. UAE plate lookup is mock.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| VM-1 | Vehicle CRUD | M | Done (backend) |
| VM-2 | Customer vehicle list (mobile) | M | Done |
| VM-3 | Mulkiya document upload | M | Done (backend) |
| VM-4 | UAE plate number API lookup | M | Mock — integrate real CarRegistrationAPI or Surepass |
| VM-5 | Quick vehicle register (admin/web) | M | Done |
| VM-6 | Vehicle management page (web) | S | Stub only |
| VM-7 | Vehicle service history | S | Not started |
| VM-8 | Mulkiya expiry reminders | C | Not started |

---

### 3.5 Payments & Invoicing [M]

**Current state:** Backend logic complete but payment gateways are mock.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| PM-1 | Cash payment recording | M | Done (backend) |
| PM-2 | Stripe integration (online payments) | M | Mock — integrate real Stripe |
| PM-3 | Payment link generation & delivery | M | Backend done (mock link) |
| PM-4 | Stripe webhook handling | M | Stub only |
| PM-5 | Invoice generation | M | Backend done |
| PM-6 | Invoice PDF export | S | Not started |
| PM-7 | Payment history (customer mobile) | S | API ready, no UI |
| PM-8 | Payments page (web dashboard) | M | Stub with mock data |
| PM-9 | Partial payments / deposits | M | Backend done |
| PM-10 | Driver cash collection recording | S | API ready, no UI |
| PM-11 | PayPal integration | C | Stub only |
| PM-12 | Refund processing | C | Model exists, no logic |

---

### 3.6 RFQ & Vendor Management [M]

**Current state:** Backend complete. Frontend mostly stub.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| RQ-1 | Create RFQ with parts list | M | Backend done |
| RQ-2 | Send RFQ to selected vendors | M | Backend done |
| RQ-3 | Vendor receives RFQ notification | M | Backend done (in-app), needs push |
| RQ-4 | Vendor submits quote | M | Backend done, mobile stub |
| RQ-5 | Quote comparison view | M | Backend done, no frontend |
| RQ-6 | Auto-select best quote | S | Backend done (3 rules) |
| RQ-7 | Order tracking after selection | S | Backend done, mobile stub |
| RQ-8 | Vendor ships order with tracking | S | Backend done |
| RQ-9 | RFQ page (web dashboard) | M | Stub only |
| RQ-10 | Vendor mobile screens (RFQ, quotes, orders) | M | Stubs only |

---

### 3.7 Notifications & Communication [M]

**Current state:** In-app notifications working. WhatsApp/SMS/Push all stubbed.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| NT-1 | In-app notifications | M | Done |
| NT-2 | WhatsApp via Twilio | M | Mock — integrate real Twilio WhatsApp API |
| NT-3 | Firebase push notifications (mobile) | M | Service ready, not connected |
| NT-4 | SMS via Twilio (OTP delivery) | M | Stub — needed for production OTP |
| NT-5 | Email notifications | S | Not started |
| NT-6 | Notification preferences per user | C | Not started |
| NT-7 | Real-time WebSocket updates in UI | S | Backend done, mobile/web not connected |
| NT-8 | Notification bell (web dashboard) | S | Static badge, not wired |

---

### 3.8 Driver & Logistics [S]

**Current state:** Backend endpoints complete. Mobile has pickup/delivery screens.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| DR-1 | Pickup queue & management | M | Done (backend + mobile) |
| DR-2 | Delivery queue & management | M | Done (backend + mobile) |
| DR-3 | Real-time location tracking | S | Backend WS ready, model fields missing |
| DR-4 | Route optimization / multi-stop nav | S | Basic implementation (Google Maps URLs) |
| DR-5 | Driver history | S | API ready, mobile stub |
| DR-6 | Cash collection on delivery | S | API ready, no UI |
| DR-7 | Delivery confirmation with OTP | C | Not started |
| DR-8 | Customer sees driver on map | C | Not started |

---

### 3.9 Reports & Analytics [S]

**Current state:** Backend endpoints complete. Web dashboard shows mock data.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| RP-1 | Dashboard KPIs (jobs, revenue, pending) | M | Backend done, web uses mock data |
| RP-2 | Jobs by status breakdown | M | Backend done |
| RP-3 | Revenue trend (daily/weekly/monthly) | M | Backend done |
| RP-4 | Service type breakdown | S | Backend done |
| RP-5 | Branch performance comparison | S | Backend done |
| RP-6 | Customer insights (top customers, new/returning) | S | Backend done |
| RP-7 | CSV export | S | Backend done |
| RP-8 | PDF report generation | C | Not started |
| RP-9 | Reports page (web dashboard) | M | Stub — wire to real API data |
| RP-10 | Technician workload & performance | C | Schema exists, no implementation |
| RP-11 | Vendor performance analytics | C | Not started |

---

### 3.10 Admin & User Management [M]

**Current state:** Backend CRUD complete. Web dashboard has user listing.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| AM-1 | Create/edit/deactivate staff | M | Backend done |
| AM-2 | Create/edit vendors | M | Backend done |
| AM-3 | Bulk user import | S | Backend done |
| AM-4 | Branch CRUD | M | Backend done |
| AM-5 | User management page (web) | M | Partial (list only) |
| AM-6 | Settings page (web) | S | Stub — forms not wired |
| AM-7 | Org-level admin dashboard | M | Not started (needs MT-1) |

---

### 3.11 Web Dashboard Completion [M]

**Current state:** Auth, jobs, and job creation working. 5 pages stubbed.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| WD-1 | Overview page with real API data | M | Charts use mock — wire to `/reports/dashboard` |
| WD-2 | Job status update action | M | Button exists, not wired |
| WD-3 | Vehicles page | S | Stub — add loading + CRUD |
| WD-4 | RFQ page with vendor quotes | M | Stub — wire to `/rfq` endpoints |
| WD-5 | Payments page with real data | M | Mock — wire to `/payments` endpoints |
| WD-6 | Reports page with real data | M | Mock — wire to `/reports` endpoints |
| WD-7 | Settings page (profile + branch) | S | Forms not wired |
| WD-8 | Search functionality | S | Search box exists, not wired |
| WD-9 | Pagination | S | Buttons disabled |
| WD-10 | Notification bell with real count | S | Static badge |
| WD-11 | Export functionality | S | Button exists, not wired |
| WD-12 | Estimate builder UI | M | Not started |
| WD-13 | Intake & diagnosis forms | M | Not started |

---

### 3.12 Mobile App Completion [M]

**Current state:** Customer flows mostly done. Staff/driver/vendor features partial.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| MA-1 | Customer home + booking + jobs | M | Done |
| MA-2 | Estimate approval flow | M | Done |
| MA-3 | Payment flow | M | Partial — needs real Stripe |
| MA-4 | Vendor RFQ screen | M | Stub |
| MA-5 | Vendor quote submission | M | Stub |
| MA-6 | Vendor orders management | S | Stub |
| MA-7 | Driver history screen | S | Stub |
| MA-8 | Edit profile screen | S | Not started |
| MA-9 | Manage vehicles screen | S | Not started |
| MA-10 | Payment history | S | Not started |
| MA-11 | WebSocket integration in screens | S | Service ready, not connected |
| MA-12 | Push notification deep linking | S | Listeners ready, navigation commented |
| MA-13 | Staff intake & diagnosis screens | M | Not started |
| MA-14 | Staff estimate creation | M | Not started |

---

### 3.13 External Integrations [M]

| ID | Integration | Priority | Status | Details |
|----|------------|----------|--------|---------|
| EI-1 | Twilio WhatsApp | M | Mock | Real-time customer notifications via WhatsApp Business API |
| EI-2 | Twilio SMS | M | Stub | OTP delivery for production (currently returned in API response) |
| EI-3 | Stripe Payments | M | Mock | Online card payments, payment links, webhook processing |
| EI-4 | UAE Vehicle API (Surepass/CarRegistrationAPI) | M | Mock | Real plate number → vehicle details lookup |
| EI-5 | Firebase Cloud Messaging | M | Stub | Push notifications to mobile app |
| EI-6 | S3/MinIO file storage | M | Done | Photo/document uploads |
| EI-7 | PayPal | C | Stub | Alternative payment gateway |
| EI-8 | Google Maps / HERE Maps | C | Basic | In-app navigation for drivers |

---

### 3.14 Customer-Facing Website [C]

**Current state:** `public/` folder has landing page, booking wizard, and tracking page — all static HTML, not connected to API.

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| CW-1 | Landing page | C | Done (static HTML) |
| CW-2 | Service booking wizard | C | Done (static, no API) |
| CW-3 | Job tracking page | C | Done (static, no API) |
| CW-4 | Connect booking to real API | C | Not started |
| CW-5 | Connect tracking to real API | C | Not started |

---

## 4. System Architecture

### 4.1 Current Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Mobile App  │────▶│              │     │  PostgreSQL /    │
│  (Expo/RN)   │     │  FastAPI     │────▶│  SQLite          │
└─────────────┘     │  Backend     │     └─────────────────┘
                    │  (Python)    │
┌─────────────┐     │              │     ┌─────────────────┐
│  Web Admin   │────▶│  Port 8000   │────▶│  Redis           │
│  (Vanilla JS)│     │              │     └─────────────────┘
└─────────────┘     │              │
                    │              │     ┌─────────────────┐
                    │              │────▶│  MinIO (S3)      │
                    └──────────────┘     └─────────────────┘
```

### 4.2 Target Architecture (SaaS)

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│  Mobile App  │────▶│                 API Gateway               │
│  (Expo/RN)   │     │          (Tenant Resolution)              │
└─────────────┘     └────────────────┬─────────────────────────┘
                                     │
┌─────────────┐     ┌────────────────▼─────────────────────────┐
│  Web Admin   │────▶│           FastAPI Backend                 │
│  (Vanilla JS)│     │                                           │
└─────────────┘     │  ┌─────────┐ ┌──────────┐ ┌───────────┐ │
                    │  │  Auth   │ │  Tenant   │ │  Business  │ │
┌─────────────┐     │  │  Layer  │ │  Isolation│ │  Logic     │ │
│  Public Web  │────▶│  └─────────┘ └──────────┘ └───────────┘ │
│  (Landing)   │     └──────┬──────────┬──────────┬────────────┘
└─────────────┘             │          │          │
                    ┌───────▼──┐ ┌─────▼────┐ ┌──▼──────────┐
                    │PostgreSQL│ │  Redis    │ │  MinIO (S3) │
                    │(per-row  │ │  + Celery │ │  (per-org   │
                    │ tenant)  │ │           │ │  folder)    │
                    └──────────┘ └──────────┘ └─────────────┘
                                      │
                    ┌─────────────────▼────────────────────────┐
                    │           External Services               │
                    │  Twilio │ Stripe │ Firebase │ Vehicle API │
                    └──────────────────────────────────────────┘
```

### 4.3 Multi-Tenancy Strategy

**Approach:** Shared database with per-row tenant isolation (most cost-effective for early-stage SaaS).

- Add `organization_id` column to all tenant-scoped tables
- FastAPI middleware resolves tenant from JWT token
- All queries automatically filtered by `organization_id`
- S3 storage organized by `org_id/` prefix
- Redis cache keys prefixed with `org:{id}:`

**Migration path to dedicated databases (future):**
- If a tenant needs isolation (enterprise tier), migrate their data to a separate schema or database
- Application code stays the same — only the connection routing changes

---

## 5. Data Model

### 5.1 New Entities for SaaS

```
Organization (NEW)
├── id (UUID, PK)
├── name (String) — "Al Tayer Motors"
├── slug (String, unique) — "al-tayer-motors"
├── owner_id (UUID, FK → User)
├── logo_url (String)
├── primary_color (String)
├── phone (String)
├── email (String)
├── address (Text)
├── emirate (String)
├── trade_license (String)
├── tax_registration (String) — TRN for VAT
├── subscription_plan (String) — "free" / "basic" / "pro"
├── subscription_status (String) — "active" / "trial" / "suspended"
├── trial_ends_at (DateTime)
├── is_active (Boolean)
├── settings (JSON) — tax_rate, currency, notification prefs
├── created_at (DateTime)
└── updated_at (DateTime)

SuperAdmin (NEW role or separate User flag)
├── Can manage all Organizations
├── Platform-level analytics
└── Support and troubleshooting
```

### 5.2 Modified Entities (add `organization_id`)

All these models gain `organization_id (UUID, FK → Organization)`:

- `User` (staff belongs to org; customers can span orgs via `CustomerOrganization` join table)
- `Branch`
- `Vehicle` (owned by customer, visible to orgs they interact with)
- `JobCard`
- `RFQ`, `VendorQuote`
- `Payment`, `Invoice`
- `WorkOrder`, `WorkOrderTask`, `QCChecklist`
- `Notification`, `JobUpdate`, `AuditLog`

### 5.3 Existing Entity Relationship Summary

```
Organization (1) ──── (N) Branch
Organization (1) ──── (N) User (staff/admin)
User:Customer (N) ──── (N) Organization (via CustomerOrganization)
User:Customer (1) ──── (N) Vehicle
Vehicle (1) ──── (N) JobCard
Branch (1) ──── (N) JobCard
JobCard (1) ──── (1) VehicleIntake
JobCard (1) ──── (1) Diagnosis
JobCard (1) ──── (N) EstimateItem
JobCard (1) ──── (N) RFQ ──── (N) VendorQuote
JobCard (1) ──── (N) Payment
JobCard (1) ──── (N) Invoice
JobCard (1) ──── (N) WorkOrder ──── (N) WorkOrderTask
JobCard (1) ──── (N) JobUpdate
JobCard (1) ──── (N) Notification
JobCard (1) ──── (N) AuditLog
```

---

## 6. API Specification

### 6.1 Current Endpoint Count: 62

| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth | 6 | Done |
| Vehicles | 6 | Done |
| Jobs | 9 | Done |
| RFQ | 6 | Done |
| Payments | 5 | Done |
| Branches | 4 | Done |
| Admin | 8 | Done |
| Admin Users | 8 | Done |
| Driver | 8 | Done |
| Vendor | 6 | Done |
| Notifications | 2 | Done |
| Reports | 7 | Done |
| Uploads | 2 | Done |
| WebSocket | 1 | Done |

### 6.2 New Endpoints Needed for SaaS

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/org/register` | Create new organization (garage signup) |
| GET | `/api/org/me` | Get current org details |
| PUT | `/api/org/me` | Update org settings (name, logo, tax rate) |
| GET | `/api/org/subscription` | Get subscription status |
| POST | `/api/org/invite` | Invite staff member to org |
| GET | `/api/superadmin/orgs` | List all organizations (super admin) |
| GET | `/api/superadmin/orgs/{id}` | Get org details (super admin) |
| PUT | `/api/superadmin/orgs/{id}/status` | Activate/suspend org (super admin) |
| GET | `/api/superadmin/metrics` | Platform-wide metrics (super admin) |

### 6.3 Endpoint Modifications

All existing endpoints need tenant filtering:
- JWT token carries `organization_id`
- FastAPI dependency `get_current_org()` extracts org context
- All DB queries add `.filter(Model.organization_id == current_org_id)`
- Cross-tenant access returns 404 (not 403, to avoid information leakage)

---

## 7. UI/UX Requirements

### 7.1 Mobile App — Key Screens

| Screen | Role | Status | Priority |
|--------|------|--------|----------|
| Welcome / Onboarding | All | Done | — |
| Login (OTP) | All | Done | — |
| Register | Customer | Done | — |
| OTP Verification | All | Done | — |
| Customer Home | Customer | Done | — |
| Service Booking (4-step) | Customer | Done | — |
| My Jobs (list) | Customer | Done | — |
| Job Detail + Timeline | Customer | Done | — |
| Estimate Approval | Customer | Done | — |
| Payment Action | Customer | Partial | M |
| Notifications | All | Done | — |
| Profile Menu | All | Done | — |
| **Edit Profile** | All | **Not started** | S |
| **Manage Vehicles** | Customer | **Not started** | S |
| **Payment History** | Customer | **Not started** | S |
| Staff Dashboard | Staff | Partial (mock stats) | M |
| **Intake Form** | Staff | **Not started** | M |
| **Diagnosis Form** | Staff | **Not started** | M |
| **Estimate Builder** | Staff | **Not started** | M |
| **RFQ Management** | Staff | **Not started** | M |
| Pickup Queue | Driver | Done | — |
| Delivery Queue | Driver | Done | — |
| Route Map | Driver | Done | — |
| **Driver History** | Driver | **Stub** | S |
| **Vendor RFQ List** | Vendor | **Stub** | M |
| **Vendor Quote Form** | Vendor | **Stub** | M |
| **Vendor Orders** | Vendor | **Stub** | S |

### 7.2 Web Dashboard — Key Screens

| Screen | Status | Priority |
|--------|--------|----------|
| Login (OTP) | Done | — |
| Dashboard Overview | Partial (mock data) | M — wire to API |
| Job List + Filters | Done | — |
| Job Detail Modal | Done | — |
| New Job Modal | Done | — |
| **Job Status Update** | **Button not wired** | M |
| **Estimate Builder** | **Not started** | M |
| **Intake/Diagnosis Forms** | **Not started** | M |
| Customer List | Partial | S |
| **Vehicle List** | **Stub** | S |
| **RFQ Management** | **Stub** | M |
| **Payments Page** | **Stub (mock)** | M |
| **Reports Page** | **Stub (mock)** | M |
| **Settings Page** | **Stub** | S |
| **User Management (full CRUD)** | **List only** | M |
| **Organization Settings** | **Not started** | M (for SaaS) |

### 7.3 Design System

**Current:** Professional dark theme with consistent design tokens across mobile and web.

| Token | Value | Notes |
|-------|-------|-------|
| Primary | #4F5BFF | Blue/purple gradient |
| Accent | #0EC7D9 | Cyan for highlights |
| Background | #0A0E27 | Deep navy |
| Success | #10B981 | Green |
| Warning | #F59E0B | Amber |
| Error | #EF4444 | Red |
| Border radius | 8–24px | Rounded modern look |

**Needed:** Light theme option (customer preference), consistent component library between web and mobile.

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target |
|--------|--------|
| API response time (p95) | < 500ms |
| Page load (web dashboard) | < 3 seconds |
| Mobile app cold start | < 4 seconds |
| WebSocket message latency | < 200ms |
| Concurrent users per tenant | 50+ |
| Jobs per day per branch | 100+ |

### 8.2 Security

| Requirement | Status | Priority |
|-------------|--------|----------|
| JWT with short-lived access tokens | Done | — |
| OTP rate limiting (5 attempts / 15 min) | Not started | M |
| Tenant data isolation | Not started | M |
| HTTPS enforcement | Not started (dev) | M |
| Input sanitization (XSS prevention) | Partial | M |
| CSRF protection (web) | Not started | S |
| Content Security Policy headers | Not started | S |
| Secure token storage (mobile) | Done (expo-secure-store) | — |
| Migrate web tokens from localStorage to httpOnly cookies | Not started | S |
| SQL injection prevention | Done (SQLAlchemy ORM) | — |
| File upload validation (type, size) | Partial | M |
| Audit logging | Done | — |
| Secrets in environment variables | Done | — |
| Production credential rotation | Not started | M |

### 8.3 Scalability

| Concern | Strategy |
|---------|----------|
| Database scaling | Read replicas for reports, connection pooling |
| File storage | S3 with CDN for static assets |
| Background jobs | Celery workers scale horizontally |
| WebSocket connections | Redis pub/sub for multi-server |
| API servers | Stateless design allows horizontal scaling |
| Tenant growth | Shared DB initially, per-schema option for enterprise tenants |

### 8.4 Reliability

| Requirement | Target |
|-------------|--------|
| Uptime SLA | 99.5% |
| Database backups | Daily automated |
| Error tracking | Sentry integration |
| Health checks | `/health` endpoint (exists) |
| Graceful degradation | Fallback to in-app if WhatsApp/push fails |

### 8.5 Observability

| Tool | Purpose | Status |
|------|---------|--------|
| Sentry | Error tracking & alerting | Not started |
| Application logs | Structured logging (JSON) | Basic (print) |
| Metrics | Request latency, error rates | Not started |
| Uptime monitoring | Health check polling | Not started |
| Audit logs | User action tracking | Done (AuditLog model) |

---

## 9. Implementation Phases

### Phase 0: Stabilization (Week 1–2)

**Goal:** Fix critical bugs, align models with service code, ensure existing features work end-to-end.

| Task | Details |
|------|---------|
| Fix `driver.py` missing `func` import | Add `from sqlalchemy import func` |
| Fix RFQ model/schema field mismatches | Add `rfq_number`, `parts_list`, `selection_rule`, `max_delivery_days`, `sent_at` to RFQ model |
| Fix Payment model missing fields | Add `payment_number`, `collected_by_id` to Payment model |
| Fix JobCard missing driver location fields | Add `driver_latitude`, `driver_longitude`, `location_updated_at` |
| Fix Invoice model incomplete fields | Add `invoice_type`, `line_items` (JSON), `is_paid`, `terms` |
| Fix PaymentStatus enum mismatch | Align SUCCESS vs COMPLETED across model and services |
| Fix Intake model field name mismatch | Align `odometer_reading` vs `mileage` |
| Generate Alembic migration | Create initial migration from corrected models |
| Run full integration test | Manually test all API endpoints via Swagger |
| Remove unused axios from web | Clean dead dependency |

**Deliverable:** All 62 API endpoints working correctly. Models aligned with schemas and services.

---

### Phase 1: SaaS Foundation + Core Integrations (Week 3–6)

**Goal:** Add multi-tenancy layer and connect real external services.

| Task | Details |
|------|---------|
| Create `Organization` model | With all fields from Section 5.1 |
| Add `organization_id` to all models | Migration to add FK column |
| Create tenant resolution middleware | Extract org from JWT, inject into request |
| Add org-scoped query filters | All service methods filter by org |
| Create org registration endpoint | POST `/api/org/register` |
| Create org settings endpoints | GET/PUT `/api/org/me` |
| Seed data migration | Add default org to existing data |
| Integrate Twilio WhatsApp | Replace mock adapter with real API |
| Integrate Twilio SMS for OTP | Replace dev OTP return with real SMS |
| Integrate Stripe | Payment links, checkout, webhooks |
| Integrate UAE Vehicle API | Replace mock with real CarRegistrationAPI |
| Integrate Firebase Push | Register tokens, send notifications |
| Add OTP rate limiting | Redis-based rate limiter |

**Deliverable:** Multi-tenant backend with real integrations. Existing features work within tenant context.

---

### Phase 2: Web Dashboard Completion (Week 5–8)

**Goal:** Complete all stubbed pages and missing features in web admin dashboard.

| Task | Details |
|------|---------|
| Wire overview page to real API | Replace mock stats/charts with `/reports/dashboard` |
| Implement job status update | Dropdown + API call from job modal |
| Build estimate creation UI | Line item editor with totals calculation |
| Build intake/diagnosis forms | Checklist UI with photo upload |
| Wire RFQ page | List, create, send, view quotes |
| Wire payments page | Real payment data, record cash, generate links |
| Wire reports page | Connect all chart and table components to API |
| Wire settings page | Profile save, branch config, org settings |
| Implement pagination | Track page state, API calls with page param |
| Implement search | Global search across jobs, customers, vehicles |
| Wire notification bell | Real count from API, dropdown list |
| Wire export buttons | CSV download from reports API |
| Build user management CRUD | Full create/edit/deactivate UI |
| Add org settings page | Logo, tax rate, working hours, notifications |

**Deliverable:** Fully functional web dashboard for service advisors and admins.

---

### Phase 3: Mobile App Completion (Week 5–8)

**Goal:** Complete all stub screens and connect real-time features.

| Task | Details |
|------|---------|
| Build vendor RFQ list screen | Browse available RFQs |
| Build vendor quote submission form | Part-by-part pricing with totals |
| Build vendor orders screen | Track accepted orders |
| Build staff intake form | Checklist with camera |
| Build staff diagnosis form | Findings + recommendations + photos |
| Build staff estimate builder | Line items with live totals |
| Build staff RFQ management | Create, send, view quotes |
| Build edit profile screen | Name, email, avatar upload |
| Build manage vehicles screen | List, add, edit, delete |
| Build payment history screen | Past payments with status |
| Connect WebSocket to screens | Real-time job updates, driver location |
| Wire push notification navigation | Deep link from notification to relevant screen |
| Complete driver history screen | Past pickups/deliveries |
| Wire Stripe payment flow | Real payment sheet or web redirect |
| Dashboard real stats | Replace mock with reports API |

**Deliverable:** Feature-complete mobile app for all 6 roles.

---

### Phase 4: Production Readiness (Week 9–10)

**Goal:** Security hardening, testing, deployment infrastructure.

| Task | Details |
|------|---------|
| Set up CI/CD pipeline | GitHub Actions: lint, test, build, deploy |
| Write backend tests | pytest: auth, jobs, payments, RFQ, tenant isolation |
| Write mobile tests | Component tests with React Native Testing Library |
| Security audit | OWASP top 10 review, dependency scanning |
| Add Sentry error tracking | Backend + mobile + web |
| Set up production infrastructure | Cloud hosting (AWS/GCP), managed PostgreSQL, Redis |
| Configure HTTPS | SSL certificates, force redirect |
| Set up database backups | Automated daily backups |
| Set up monitoring | Uptime checks, performance alerts |
| Load testing | Simulate 50+ concurrent users per tenant |
| Create deployment scripts | Docker production compose, env management |
| App store preparation | Screenshots, descriptions, privacy policy |

**Deliverable:** Production-deployed, monitored, and tested platform.

---

### Phase 5: Growth & Polish (Post-Launch)

| Feature | Details |
|---------|---------|
| Subscription billing (Stripe) | Plans, usage tracking, billing portal |
| Arabic / RTL support | i18n framework, translated strings, RTL layouts |
| Custom branding per tenant | Logo, colors in customer-facing screens |
| Advanced analytics | Technician utilization, vendor performance, SLA tracking |
| Customer-facing website integration | Connect booking wizard and tracking page to API |
| Chat/messaging system | In-app messaging between customer and service center |
| Mulkiya OCR scanning | Camera → extract registration details |
| In-app map for customer | See driver location during pickup/delivery |
| Review/rating system for vendors | Rate vendors by quote accuracy, delivery, quality |
| Mobile offline support | Queue actions when offline, sync on reconnect |

---

## 10. Tech Debt & Refactoring

### 10.1 Critical Fixes (Phase 0)

| Issue | File | Impact |
|-------|------|--------|
| Missing `func` import | `backend/app/api/driver.py` | Runtime crash on driver queries |
| RFQ model/schema mismatch | `backend/app/models/rfq.py` vs services | RFQ creation fails |
| Payment model missing fields | `backend/app/models/payment.py` | Payment recording fails |
| JobCard missing driver fields | `backend/app/models/job_card.py` | Location tracking fails |
| Invoice model incomplete | `backend/app/models/payment.py` | Invoice generation fails |
| PaymentStatus enum inconsistency | `backend/app/models/payment.py` | Status queries return wrong results |
| Intake field name mismatch | `backend/app/models/intake.py` vs schemas | Data serialization errors |

### 10.2 Code Quality Improvements

| Issue | Recommendation |
|-------|----------------|
| No tests | Add pytest suite for all services and API routes |
| No CI/CD | GitHub Actions for lint + test + build |
| Console logging | Replace `print()` with structured `logging` |
| Unused axios in web | Remove from package.json |
| Web uses innerHTML with user data | Sanitize or use textContent |
| Web stores JWT in localStorage | Migrate to httpOnly cookies |
| No database indexes on FK columns | Add indexes on `organization_id`, `branch_id`, `customer_id`, `status` |
| Hardcoded credentials in docker-compose | Use `.env` file for Docker secrets |
| No Alembic migration versions | Generate initial migration from current models |
| Debug OTP bypass "123456" | Gate behind `ENV=development` check |

### 10.3 Architecture Improvements

| Area | Current | Target |
|------|---------|--------|
| Error handling | Try/catch with generic messages | Structured error responses with error codes |
| Logging | Print statements | Structured JSON logging with correlation IDs |
| Caching | None | Redis caching for branch lists, user profiles, dashboard stats |
| Background tasks | Celery installed but unused | Use for email, WhatsApp, PDF generation, report building |
| API versioning | None | `/api/v1/` prefix for future backward compatibility |
| Database connections | Sync SQLAlchemy | Consider async SQLAlchemy for better concurrency |
| File uploads | Direct to S3 | Consider presigned upload URLs for large files |
| WebSocket | In-memory connection store | Redis-backed for multi-server deployment |

---

## 11. Open Questions

| # | Question | Context | Decision Needed By |
|---|----------|---------|-------------------|
| 1 | Tenant isolation: shared DB vs schema-per-tenant? | Shared DB is simpler and cheaper. Schema-per-tenant offers better isolation. | Phase 1 |
| 2 | Should customers belong to one org or span multiple? | A customer might service their car at different garages. | Phase 1 |
| 3 | How to handle vendor sharing across tenants? | Vendors (parts suppliers) likely serve multiple garages. Shared vendor pool vs per-org vendors. | Phase 1 |
| 4 | Mobile app: one app or per-tenant branded apps? | Single app with tenant context is simpler. White-label apps are more professional. | Phase 3 |
| 5 | Web dashboard: single domain or per-tenant subdomain? | `app.autocare.ae` vs `altayer.autocare.ae` | Phase 2 |
| 6 | Pricing model specifics? | Monthly subscription vs per-job vs tiered — need market validation. | Phase 5 |
| 7 | Offline support priority? | UAE has good connectivity, but garages may have poor WiFi in workshops. | Phase 5 |
| 8 | Should the 23-state lifecycle be configurable per tenant? | Some garages may want simpler workflows (skip RFQ, skip pickup). | Phase 5 |
| 9 | Data retention policy? | How long to keep audit logs, completed jobs, notifications? | Phase 4 |
| 10 | GDPR / UAE data protection compliance? | UAE has PDPL (Personal Data Protection Law). Need privacy policy and data handling procedures. | Phase 4 |

---

## Appendix A: Current Codebase Statistics

| Metric | Backend | Mobile | Web | Total |
|--------|---------|--------|-----|-------|
| Source files | ~45 .py | ~40 .tsx | ~5 .js/.html/.css | ~90 |
| Lines of code | ~8,000+ | ~8,000+ | ~2,800 | ~18,800+ |
| API endpoints | 62 | — | — | 62 |
| DB models | 18 tables | — | — | 18 |
| Dependencies | 20 | 28 | 4 | 52 |
| Test coverage | 0% | 0% | 0% | 0% |

## Appendix B: Test Credentials

| Role | Phone | OTP (dev) |
|------|-------|-----------|
| Admin | +971500000001 | 123456 |
| Service Advisor | +971500000002 | 123456 |
| Technician | +971500000003 | 123456 |
| Driver | +971500000004 | 123456 |
| Vendor 1 | +971500000010 | 123456 |
| Vendor 2 | +971500000011 | 123456 |
| Customer | +971501234599 | 123456 |
| Test Customer | +971525495518 | 123456 |

## Appendix C: Service Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | 8000 | http://localhost:8000 |
| Swagger Docs | 8000 | http://localhost:8000/docs |
| Web Dashboard | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
