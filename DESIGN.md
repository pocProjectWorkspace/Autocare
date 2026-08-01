# AutoCare — UI/UX Design Brief

**Purpose:** Feed this document into a design tool (Figma AI, Claude Design, v0, etc.) to generate high-fidelity mockups for the AutoCare SaaS platform.

**Product:** Multi-tenant SaaS for UAE automobile service centers. Digitizes the full workflow from booking → diagnosis → parts → service → payment → delivery.

**Deliverables expected from designer:**
- Web admin dashboard (desktop-first, 1440px)
- Mobile app screens (iOS + Android, 390x844)
- Public customer-facing website (responsive)

---

## 1. Design Principles

1. **Operational clarity over decoration.** Garage staff work fast; screens must be scan-able in 2 seconds.
2. **Status is the hero.** Every screen answers "what state is this job in and what happens next?"
3. **Photo-forward.** Vehicles, damage, parts, progress — imagery is primary content, not garnish.
4. **Mobile-first for field roles** (customer, driver, technician, vendor). **Desktop-first for admin/advisor.**
5. **English-only v1.** Design left-to-right, but keep layouts RTL-ready (avoid text baked into images).
6. **UAE context.** AED currency, +971 phone formats, Mulkiya (registration doc), Emirates plate formats.

---

## 2. Brand & Visual System

### 2.1 Brand personality
Trustworthy · Professional · Fast · Modern · Approachable — not corporate-stiff, not consumer-playful.

### 2.2 Color palette

| Token | Hex | Use |
|---|---|---|
| `primary/600` | `#0F62FE` | Primary actions, links, active nav |
| `primary/700` | `#0043CE` | Hover state |
| `primary/50` | `#EDF5FF` | Selected row, subtle backgrounds |
| `success/600` | `#24A148` | Paid, delivered, approved |
| `warning/600` | `#F1C21B` | Awaiting approval, pending |
| `danger/600` | `#DA1E28` | Overdue, rejected, cancelled |
| `info/600` | `#4589FF` | Informational states |
| `neutral/900` | `#161616` | Primary text |
| `neutral/700` | `#525252` | Secondary text |
| `neutral/500` | `#8D8D8D` | Placeholder, disabled |
| `neutral/200` | `#E0E0E0` | Borders, dividers |
| `neutral/100` | `#F4F4F4` | Page background |
| `neutral/0` | `#FFFFFF` | Surface (cards, sidebar) |

Support **per-tenant primary color override** (garages can set their brand color in settings — used in customer-facing screens and invoices).

### 2.3 Typography
- **Font:** Inter (already loaded from Google Fonts)
- Display / H1: 32px, 700
- H2: 24px, 600
- H3: 20px, 600
- Body: 14px, 400
- Body small: 12px, 400
- Numeric (KPIs, currency): tabular-nums, 700

### 2.4 Spacing & radius
- Base unit: 4px. Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- Radius: 8px (cards), 6px (inputs, buttons), 999px (pills, avatars)
- Shadow: soft — `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`

### 2.5 Iconography
Lucide icons (already loaded). Line style, 20px default, 16px in dense tables.

### 2.6 Core components to design
- Buttons: primary / secondary / ghost / danger / icon-only — sizes sm/md/lg
- Inputs: text, phone (+971 mask), OTP 6-digit, date, select, textarea, file upload with preview
- Status badges (see §3), avatar, chip, tag
- Cards: elevated, flat, interactive (hover state)
- Tables: sortable header, sticky first column, row hover, empty state, pagination footer
- Modals / drawers / bottom sheets (mobile)
- Toast + inline banner + full-page empty/error states
- Tab bar (mobile), sidebar nav (web), breadcrumbs
- Timeline component for job history
- KPI stat card with trend arrow
- Charts: line (revenue), donut (status breakdown), bar (branch comparison)

---

## 3. Domain Concepts (must appear in UI)

### 3.1 Job Card status pills (23 states)
Group into 5 visual clusters — one color hue per cluster:

| Cluster | Statuses | Color |
|---|---|---|
| **Booked** | `requested`, `scheduled` | info blue |
| **In transit** | `vehicle_picked`, `en_route_pickup`, `out_for_delivery` | violet |
| **In shop** | `in_intake`, `diagnosed`, `in_service`, `testing`, `ready` | primary blue |
| **Awaiting customer** | `awaiting_estimate_approval`, `awaiting_parts_approval`, `awaiting_payment` | warning yellow |
| **Parts/RFQ** | `rfq_sent`, `quotes_received`, `estimate_approved`, `parts_approved`, `parts_ordered`, `parts_received`, `paid` | teal |
| **Done** | `delivered`, `closed` | success green |
| **Failed** | `cancelled`, `rejected` | danger red |

### 3.2 Roles
`customer` · `service_advisor` · `technician` · `driver` · `vendor` · `admin` (org owner) · `super_admin` (platform)

### 3.3 Key entities
Organization · Branch · User · Vehicle (with Mulkiya) · JobCard · VehicleIntake · Diagnosis · Estimate · RFQ · VendorQuote · WorkOrder · Payment · Invoice · Notification

---

## 4. Web Admin Dashboard (desktop, 1440px)

**Layout:** Fixed 240px sidebar (collapsible to 64px) + top bar (64px) + content area.
**Top bar contains:** breadcrumbs, global search, notification bell, org switcher (for multi-branch), user avatar menu.
**Sidebar sections:** Operations · Catalog · Finance · Insights · Admin

### 4.1 Login / OTP
- Split screen: left half brand illustration (garage/service imagery), right half auth card
- Steps: phone number → OTP 6-digit (auto-advance inputs) → dashboard
- Dev mode shows OTP on screen (small monospace hint)

### 4.2 Onboarding wizard (first-time org)
4-step full-screen wizard with progress bar:
1. **Organization** — name, trade license, emirate, TRN
2. **First branch** — name, address, working hours grid
3. **Invite team** — email/phone rows with role dropdown (skip-able)
4. **Done** — confetti, "Go to dashboard" CTA

### 4.3 Overview / Dashboard (Home)
Priority page. Layout top-to-bottom:
- **Row 1 — KPI cards (4 cols):** Active Jobs · Revenue Today · Awaiting Approval · Ready for Delivery. Each shows number, delta vs yesterday, mini sparkline.
- **Row 2 — Split (2/3 + 1/3):**
  - Left: Revenue trend line chart (7d / 30d / 90d toggle)
  - Right: Job status donut with legend
- **Row 3 — Today's schedule:** Timeline of scheduled pickups/deliveries with driver avatars
- **Row 4 — Recent activity feed:** last 10 job events (status changes, payments, RFQs)
- **Row 5 — Two-column tables:** "Awaiting your action" (approvals stuck) + "Top customers this month"

### 4.4 Job Cards — list
- Filter chip row: status cluster · branch · service advisor · date range · search
- Table columns: JC# · Customer · Vehicle (plate + model) · Status (pill) · Advisor · Created · Est. Total · Actions (view/kebab)
- Row click → job detail drawer (right-side, 640px wide) OR full-page detail
- Bulk actions bar appears when rows selected
- "New Job Card" primary button top-right

### 4.5 Job Card — detail
Full-page. Left column (2/3) + right column (1/3, sticky).

**Left column tabs:**
- **Overview** — customer card, vehicle card, current status stepper (horizontal for 23 states, current state highlighted), advisor notes
- **Intake** — checklist (fuel, odometer, exterior damages with photo pins, interior items), signature capture area
- **Diagnosis** — findings, recommendations, before-photos gallery, technician notes
- **Estimate** — line-item table (labor + parts), tax, total, "Send for approval" button, approval status
- **RFQ & Parts** — parts list, vendors invited (chips), quote comparison table (vendor · price · warranty · delivery ETA · select radio), selected quote highlighted
- **Payments** — payment history table + "Collect payment" button + payment link generator
- **Work orders** — task list with assignee, status, time spent
- **QC** — checklist with pass/fail toggles + photos
- **Delivery** — driver assignment, ETA, customer signature capture

**Right column (sticky):**
- Status pill (large)
- Quick action stack: Advance status · Assign advisor · Assign technician · Assign driver · Print/PDF
- Timeline of all events (compact, scrollable)
- Attached files list

### 4.6 New Job Card wizard
4-step modal:
1. **Customer** — search existing (autocomplete) or "Quick register" inline form (name + phone)
2. **Vehicle** — search existing OR plate lookup (Mulkiya API) OR manual entry (plate, make, model, year, VIN, color) with Mulkiya upload
3. **Service** — service type multi-select, priority, complaint text, requested date/time, pickup required toggle → address if yes
4. **Review** — summary, "Create job card" CTA

### 4.7 Customers
- Table: Name · Phone · # Vehicles · # Jobs · Lifetime Value · Last Visit · Actions
- Row click → customer profile drawer: contact info, vehicle list (mini-cards), job history timeline, payment history, "Message on WhatsApp" button

### 4.8 Vehicles
- Table: Plate · Make/Model · Year · Owner · Last Service · Mulkiya Expiry (colored if <30d)
- Filter by expiring Mulkiya
- Detail view: photos carousel, spec panel, service history timeline, current active jobs

### 4.9 RFQs
- Two tabs: **Open RFQs** / **Closed**
- Table: RFQ# · Job · Parts (count + preview) · Vendors invited · Quotes received · Deadline · Status
- Detail: parts list top, quotes side-by-side comparison cards (vendor logo, price, warranty, delivery ETA, notes), "Auto-pick best" button with 3 rule choices (cheapest / fastest / best warranty), manual select radio

### 4.10 Payments
- KPI strip: Collected today · Pending · Overdue · This month
- Tabs: All / Cash / Card / Payment Links / Refunds
- Table: Payment# · Job · Customer · Method · Amount · Status · Date · Collected by
- Generate payment link modal (amount, expiry, delivery via WhatsApp/SMS toggle)

### 4.11 Reports
- Date range picker + branch filter top bar
- Grid of report cards; each expands to full chart on click:
  - Revenue trend (line)
  - Jobs by status (donut)
  - Jobs by service type (bar)
  - Branch performance (bar comparison)
  - Technician performance (leaderboard table)
  - Customer insights (new vs returning donut + top 10 table)
  - Vendor performance (avg response time, quote win rate)
- Export CSV / PDF buttons per report

### 4.12 Users & Roles
- Tab: Staff · Vendors · Customers
- Table with invite/deactivate actions
- Add user modal: name, phone, email, role dropdown, branch multi-select
- Bulk import from CSV with template download

### 4.13 Branches
- Card grid: each branch = card with name, address, active jobs count, staff count, "Manage" button
- Detail: working hours editor (weekly grid), services offered checklist, staff assigned

### 4.14 Settings
Left sub-nav:
- **Organization** — logo upload, name, address, trade license, TRN, primary color picker (live preview)
- **Billing/Subscription** — plan card, usage meters, invoices (deferred v1)
- **Notifications** — toggles per channel (in-app / WhatsApp / SMS / email) per event type
- **Payment methods** — Stripe keys, cash on delivery toggle, tax rate, currency
- **Integrations** — Twilio, Firebase, Vehicle lookup API — connect/disconnect cards
- **Profile** — personal info + change photo + change phone

### 4.15 Super-admin console (separate app or hidden route)
- Table of all Organizations with plan, status, MRR, active users
- Per-org drill-down: usage graphs, support notes, impersonate button

---

## 5. Mobile App (390x844, iOS + Android)

Bottom tab bar for each role. Uses same design system. Photos are large, tap targets ≥44px.

### 5.1 Shared auth
- **Splash** — logo, subtle animation
- **Login** — phone input with UAE flag prefix
- **OTP verify** — 6 boxes, resend timer, dev-mode OTP hint
- **Register** — name + phone (customer self-signup)

### 5.2 Customer role — tab bar: Home · Book · My Jobs · Notifications · Profile

**Home**
- Greeting header ("Good morning, Ahmed")
- Big "Book a service" CTA card with car illustration
- Active jobs horizontal card carousel (each shows vehicle image, status pill, ETA)
- Quick actions: My vehicles · Payment history · Support
- Nearest branch card with map thumbnail

**Book service (multi-step)**
1. Select vehicle (card list with "+ Add vehicle")
2. Service type (grid of icon tiles: Periodic · AC · Brakes · Battery · Detailing · Other)
3. Describe issue (text area + optional photos)
4. Pickup/Drop-off toggle → address if pickup
5. Preferred date/time slots
6. Review + confirm → success screen with JC number

**Add vehicle screen** — plate lookup input (auto-fills via Mulkiya API) with fallback manual form + Mulkiya photo upload

**My Jobs — list**
- Segmented control: Active / History
- Cards: vehicle photo, plate, status pill, one-line status message, chevron

**My Jobs — detail**
- Hero: vehicle photo carousel, plate, status pill (large)
- **Status stepper** — vertical timeline of 23 states, current highlighted, past checked, future muted
- Estimate card (if awaiting approval): line items, total, Approve/Reject buttons
- Parts quote card (if awaiting parts approval): selected quote details, Approve/Reject
- Payment card (if awaiting): amount, "Pay now" button → Stripe sheet
- Progress updates feed: photos + captions from technician
- Chat/message advisor button (deferred but reserve space)
- After delivery: Rate service (5-star + comment)

**Notifications** — grouped by day, unread dot, icon per type, tap deep-links to job

**Profile** — avatar, name, phone, edit · My vehicles · Payment history · Language · Notifications settings · Logout

### 5.3 Driver role — tab bar: Pickups · Deliveries · Map · History · Profile

**Pickups**
- Cards stacked: customer name, phone, address (with distance), vehicle plate + model, scheduled time, "Start pickup" button
- Detail: full address, call/WhatsApp customer buttons, "Navigate" (opens Maps), "Arrived" → "Loaded" → "En route to shop" — swipe-through state machine with photo capture at each step

**Deliveries** — mirror of pickups. Extra: cash collection screen if COD (amount, "Mark collected", digital receipt), customer OTP confirmation input, signature capture

**Map** — live map with pickup pins (blue) + delivery pins (green) + own location; tap pin → mini-card

**History** — completed pickups/deliveries list

### 5.4 Technician role — tab bar: My Jobs · Tasks · Updates · Profile
(Not in v1 mobile scope but design shell)

- **My Jobs** — assigned jobs list with priority pills
- **Job detail** — intake info, diagnosis form (findings, recommendations, photo capture), work order tasks (checkboxes with time logged), post progress update (photo + caption)

### 5.5 Vendor role — tab bar: RFQs · Quotes · Orders · Profile

**RFQs**
- Card list: RFQ#, parts count (with 2-line part name preview), deadline countdown, "Submit quote" button

**RFQ detail** → **Submit quote form**
- Parts table with editable price per line, availability toggle, warranty months input
- Delivery ETA date picker
- Notes textarea
- Total calculates live
- Submit → success + expected response time note

**Quotes** — my submitted quotes with status (pending / selected / rejected)

**Orders** — selected quotes = orders. Fulfillment stages: Confirmed → Packed → Shipped (tracking#) → Delivered

### 5.6 Admin/Advisor on mobile (lightweight companion)
Not full feature parity — read-only dashboards, approve on the go, respond to alerts.
- Home: KPIs (compact), pending approvals list
- Approvals inbox: estimate approvals, parts approvals, payment confirmations
- Push notification tap → deep link to item

---

## 6. Public Customer Website (responsive)

Static-feel marketing + booking. Same brand tokens.

### 6.1 Landing page
- Hero: headline "Your car deserves better service", CTA "Book a service", background photo of clean garage
- Trust bar: logos of insurance partners / payment methods
- 3-column value props (Trusted mechanics · Transparent pricing · Real-time tracking)
- How it works (4 steps with illustrations: Book → Pickup → Service → Delivery)
- Services grid (8 tiles)
- Testimonials carousel
- Branch locations map
- Footer: contact, socials, legal

### 6.2 Book service (public)
- Same wizard as mobile customer, but web layout
- On submit → customer receives OTP → auto-registers → redirects to tracking page

### 6.3 Track job page
- Enter JC# + phone → OTP → tracking view
- Big status pill, horizontal stepper, live progress feed with photos, ETA
- Contact advisor button

---

## 7. Key user flows to storyboard

Design tools do best when given end-to-end flows. Storyboard these 6:

1. **Customer books service** → OTP → vehicle add → service → pickup schedule → confirmation → push notification when driver assigned
2. **Driver picks up vehicle** → notification → open pickup → navigate → arrive → photo evidence → load → en-route → deliver to shop
3. **Advisor creates estimate** → job intake → diagnosis → line items → send to customer → customer approves in app → RFQ auto-created
4. **Vendor submits quote** → push notification → open RFQ → fill quote → submit → get selected notification → fulfill order
5. **Customer approves parts + pays** → notification → parts quote card → approve → payment card → Stripe sheet → success → job moves to `parts_ordered`
6. **Customer picks up finished car** → notification "Ready" → drive to garage OR request delivery → driver delivers → OTP confirm → rate service

---

## 8. Micro-interactions & states to design

- **Empty states** for every list (illustration + CTA)
- **Loading skeletons** for tables and cards (no spinners on primary content)
- **Error toast** with retry
- **Offline banner** (mobile)
- **Photo upload** with progress + retry per file
- **Status transition animation** — pill morphs color when advancing
- **Success confetti** for job delivered / payment complete
- **Pull-to-refresh** on mobile lists
- **Bottom sheet** for mobile actions (not full modals)
- **Sticky bottom CTA** on mobile forms (never hidden by keyboard)

---

## 9. Accessibility

- WCAG AA contrast (all colors above tested)
- Focus rings visible on all interactive elements
- Form fields labeled (no placeholder-only labels)
- Tap targets ≥44px mobile / ≥32px web
- Support system font scaling on mobile
- Screen reader labels on icon-only buttons

---

## 10. Out of scope for design v1

- Arabic RTL layouts (structure must not preclude but no visuals needed)
- Dark mode
- Super-admin platform UI (only spec, not visuals)
- Subscription billing screens
- Email templates (design separately)
- Invoice PDF layout (design separately)

---

## 11. Assets & references to include when handing off

- Real Emirati plate format examples (e.g., "Dubai A 12345")
- Common car makes/models in UAE (Toyota, Nissan, Lexus, Mercedes, BMW)
- Sample Mulkiya document image (blurred/redacted)
- WhatsApp message mockup for notifications
- Stripe payment sheet reference

---

**End of brief.** A good AI design generation should produce ~30–40 unique screens covering §4, §5, §6 above, plus the component library from §2.6.
