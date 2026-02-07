"""
Database Seed Script
"""
from datetime import datetime, timedelta, time
from app.core.database import SessionLocal, engine, Base
from app.models import *
from app.models.organization import Organization, SubscriptionPlan, SubscriptionStatus
import uuid


def seed_database():
    """Seed database with sample data"""
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already seeded")
            return

        print("Seeding database...")

        # ── 1. Create Organization ──
        org = Organization(
            id=uuid.uuid4(),
            name="AutoCare Demo",
            slug="autocare-demo",
            subscription_plan=SubscriptionPlan.PROFESSIONAL,
            subscription_status=SubscriptionStatus.ACTIVE,
            trial_ends_at=datetime.utcnow() + timedelta(days=30),
            settings={
                "currency": "AED",
                "tax_rate": 5.0,
                "working_hours": {"open": "08:00", "close": "20:00"},
                "notification_preferences": {"whatsapp": True, "email": True, "push": True}
            },
            max_branches=5,
            max_users=50,
            is_active=True
        )
        db.add(org)
        db.flush()

        # ── 2. Create Branches ──
        branch1 = Branch(
            id=uuid.uuid4(),
            organization_id=org.id,
            name="AutoCare Downtown",
            code="DT01",
            address="123 Sheikh Zayed Road, Dubai",
            city="Dubai",
            emirate="Dubai",
            latitude=25.2048,
            longitude=55.2708,
            phone="+971501234567",
            email="downtown@autocare.ae",
            opens_at=time(8, 0),
            closes_at=time(20, 0),
            has_pickup_service=True,
            has_ac_service=True,
            has_body_shop=True,
            max_daily_capacity=30
        )

        branch2 = Branch(
            id=uuid.uuid4(),
            organization_id=org.id,
            name="AutoCare Al Quoz",
            code="AQ01",
            address="456 Al Quoz Industrial Area, Dubai",
            city="Dubai",
            emirate="Dubai",
            latitude=25.1234,
            longitude=55.2345,
            phone="+971501234568",
            has_pickup_service=True,
            has_ac_service=True,
            has_body_shop=False,
            max_daily_capacity=25
        )

        db.add_all([branch1, branch2])
        db.flush()

        # ── 3. Create Users (all scoped to org) ──
        admin = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="System Admin",
            mobile="+971500000001",
            email="admin@autocare.ae",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True
        )

        # Set org owner
        org.owner_id = admin.id

        advisor = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="Ahmed Hassan",
            mobile="+971500000002",
            email="ahmed@autocare.ae",
            role=UserRole.SERVICE_ADVISOR,
            branch_id=branch1.id,
            is_active=True,
            is_verified=True
        )

        tech = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="Mohammed Ali",
            mobile="+971500000003",
            role=UserRole.TECHNICIAN,
            branch_id=branch1.id,
            is_active=True,
            is_verified=True
        )

        driver = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="Rashid Khan",
            mobile="+971500000004",
            role=UserRole.DRIVER,
            branch_id=branch1.id,
            is_active=True,
            is_verified=True
        )

        vendor1 = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="Al Futtaim Parts",
            mobile="+971500000010",
            email="parts@alfuttaim.ae",
            role=UserRole.VENDOR,
            company_name="Al Futtaim Auto Parts",
            trade_license="TL-12345",
            vendor_rating="4.5",
            is_active=True,
            is_verified=True
        )

        vendor2 = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="Emirates Spares",
            mobile="+971500000011",
            email="sales@emiratesspares.ae",
            role=UserRole.VENDOR,
            company_name="Emirates Auto Spares LLC",
            trade_license="TL-67890",
            vendor_rating="4.2",
            is_active=True,
            is_verified=True
        )

        customer = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="Khalid Mohammed",
            mobile="+971501234599",
            email="khalid@gmail.com",
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True
        )

        test_customer = User(
            id=uuid.uuid4(),
            organization_id=org.id,
            full_name="Test User",
            mobile="+971525495518",
            email="test@autocare.ae",
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True
        )

        db.add_all([admin, advisor, tech, driver, vendor1, vendor2, customer, test_customer])
        db.flush()

        # ── 4. Create Vehicles ──
        vehicle = Vehicle(
            id=uuid.uuid4(),
            organization_id=org.id,
            owner_id=customer.id,
            plate_number="A 12345",
            make="Toyota",
            model="Camry",
            year=2022,
            color="White",
            vin="1HGBH41JXMN109186",
            mulkiya_number="MK-123456"
        )

        test_vehicle = Vehicle(
            id=uuid.uuid4(),
            organization_id=org.id,
            owner_id=test_customer.id,
            plate_number="DXB 789",
            make="Nissan",
            model="Patrol",
            year=2023,
            color="Black",
            vin="V1234567890",
            mulkiya_number="MK-789012"
        )

        db.add_all([vehicle, test_vehicle])
        db.flush()

        # ── 5. Create Sample Job Card ──
        job = JobCard(
            id=uuid.uuid4(),
            organization_id=org.id,
            job_number="JC202502010001",
            customer_id=customer.id,
            vehicle_id=vehicle.id,
            branch_id=branch1.id,
            service_advisor_id=advisor.id,
            technician_id=tech.id,
            service_type=ServiceType.REGULAR,
            status=JobStatus.IN_SERVICE,
            intake_type=DeliveryType.DROP_OFF,
            customer_notes="Regular service due. AC not cooling properly.",
            scheduled_date=datetime.now() - timedelta(days=1),
            estimated_completion_days=2,
            labour_total=500,
            parts_total=350,
            tax_amount=42.5,
            grand_total=892.5,
            amount_paid=450,
            balance_due=442.5
        )

        db.add(job)
        db.commit()

        print("Database seeded successfully!")
        print(f"Organization: {org.name} (slug: {org.slug})")
        print(f"Admin: {admin.mobile}")
        print(f"Customer: {customer.mobile}")
        print(f"Test Customer: {test_customer.mobile}")
        print(f"Advisor: {advisor.mobile}")
        print(f"Vendor: {vendor1.mobile}")
        print("\\n*** For testing login, use OTP: 123456 ***")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
