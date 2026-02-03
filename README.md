# AutoCare - Complete Automobile Service Center Platform

A modern, market-ready garage management system with digital job cards, approvals, parts sourcing, real-time updates, and delivery management.

## 🚀 Features

### Customer Features
- OTP-based registration & login
- Vehicle profile with Mulkiya upload
- Service booking (drop-off or pickup)
- Real-time job tracking
- Estimate & parts approval
- Online/cash payments
- WhatsApp + in-app notifications
- Delivery scheduling
- Rating & feedback

### Service Center Features
- Vehicle intake & inspection
- Digital diagnosis & estimates
- Vendor RFQ management
- Quote comparison & selection
- Work order management
- Progress updates with photos/videos
- QC checklists
- Delivery management

### Vendor Features
- RFQ notifications
- Quote submission
- Order tracking
- Performance ratings

### Admin Features
- Dashboard & analytics
- User & role management
- Branch management
- Vendor management
- Reports & insights

## 🛠 Tech Stack

### Mobile App
- **Expo (React Native)** - iOS, Android
- **React Query** - Data fetching & caching
- **Zustand** - State management
- **Expo Router** - Navigation

### Web Dashboard
- **Vite** - Build tool
- **Vanilla JS** - No framework overhead
- **Chart.js** - Analytics charts
- **Lucide Icons** - Icon library

### Backend
- **FastAPI** - Python REST API
- **PostgreSQL** - Database
- **SQLAlchemy** - ORM
- **Alembic** - Migrations
- **Redis** - Caching & queues
- **Celery** - Background tasks

## 📁 Project Structure

```
autocare/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Config, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helpers
│   ├── alembic/            # Migrations
│   └── requirements.txt
├── mobile/                  # Expo mobile app
│   ├── app/                # Expo Router screens
│   ├── components/         # Reusable components
│   ├── services/           # API services
│   ├── stores/             # State management
│   └── constants/          # Theme & config
├── web/                     # Admin web dashboard
│   ├── css/                # Styles
│   ├── js/                 # JavaScript
│   └── index.html          # Main HTML
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Backend Setup

```bash
# Start database with Docker
docker-compose up -d postgres redis

# Setup Python environment
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed sample data
python -m app.seed

# Start server
uvicorn app.main:app --reload --port 8000
```

### Mobile App Setup

```bash
cd mobile
npm install
npx expo start
```

### Web Dashboard Setup

```bash
cd web
npm install
npm run dev
# Opens at http://localhost:3000
```

## 📱 Screens by Role

### Customer
- Welcome/Onboarding
- OTP Login/Register  
- Profile & Vehicles
- Service Booking
- Job Tracking
- Approvals (Estimate, Parts)
- Payments
- Updates & Chat
- Delivery
- Feedback

### Service Advisor
- Dashboard
- Job Queue
- Intake & Inspection
- Diagnosis & Estimate
- RFQ Management
- Quote Selection
- Payment Collection
- Updates

### Technician
- Assigned Jobs
- Work Orders
- Progress Updates
- QC Checklist

### Driver
- Pickup Schedule
- Delivery Schedule
- Route & Navigation

### Vendor
- RFQ List
- Submit Quotes
- Order Status

### Admin
- Dashboard
- Analytics
- User Management
- Branch Management
- Vendor Management
- Reports

## 📊 Job Status Flow

```
Requested → Scheduled → Vehicle Picked → In Intake → Diagnosed →
Awaiting Estimate Approval → Estimate Approved → RFQ Sent → 
Quotes Received → Awaiting Parts Approval → Parts Approved →
Awaiting Payment → Paid → Parts Ordered → Parts Received →
In Service → Testing → Ready → Out for Delivery → Delivered → Closed
```

## 🔐 API Documentation

Once the backend is running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## � Demo Credentials

After seeding the database, use these test accounts:

| Role | Mobile | Purpose |
|------|--------|---------|
| Admin | +971500000001 | Full system access |
| Service Advisor | +971500000002 | Job management, estimates |
| Technician | +971500000003 | Work orders |
| Driver | +971500000004 | Pickup/delivery |
| Vendor | +971500000010 | Quote submission |
| Customer | +971501234599 | Customer experience |

**Note:** In development mode, OTP is returned in the API response for easy testing.

## 🐳 Full Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Generate migrations
docker-compose exec backend alembic revision --autogenerate -m "Initial"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Seed data
docker-compose exec backend python -m app.seed
```

## �📝 License

MIT License
