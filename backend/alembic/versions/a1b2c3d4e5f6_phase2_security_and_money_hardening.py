"""Phase 2: security, exact money, per-tenant keys, workshop tables

Covers:
  * money columns Float -> Numeric(12, 2)
  * document number uniqueness moved from global to per-organization
  * OTP codes stored as keyed hashes, with an attempt counter
  * new tables: document_sequences, device_tokens
  * work order / QC tables aligned with the service layer
  * backfill of orphaned rows into a default organization before the
    per-tenant unique indexes are created

Revision ID: a1b2c3d4e5f6
Revises: 16831d9c1a5d
Create Date: 2026-08-29
"""
import uuid

import sqlalchemy as sa
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "16831d9c1a5d"
branch_labels = None
depends_on = None

MONEY = sa.Numeric(12, 2)

# (table, column) pairs converted to exact decimal.
MONEY_COLUMNS = [
    ("job_cards", "labour_total"),
    ("job_cards", "parts_total"),
    ("job_cards", "pickup_delivery_fee"),
    ("job_cards", "tax_amount"),
    ("job_cards", "discount_amount"),
    ("job_cards", "estimate_total"),
    ("job_cards", "grand_total"),
    ("job_cards", "amount_paid"),
    ("job_cards", "balance_due"),
    ("payments", "amount"),
    ("invoices", "subtotal"),
    ("invoices", "tax_amount"),
    ("invoices", "discount_amount"),
    ("invoices", "grand_total"),
    ("invoices", "total_amount"),
    ("vendor_quotes", "subtotal"),
    ("vendor_quotes", "tax_amount"),
    ("vendor_quotes", "total_amount"),
    ("estimate_items", "unit_price"),
    ("estimate_items", "total_price"),
]

# Unique constraints that must become per-tenant.
GLOBAL_UNIQUES = [
    ("job_cards", "job_number", "uq_job_cards_org_number"),
    ("payments", "payment_number", "uq_payments_org_number"),
    ("invoices", "invoice_number", "uq_invoices_org_number"),
    ("rfqs", "rfq_number", "uq_rfqs_org_number"),
    ("branches", "code", "uq_branches_org_code"),
]


def _dialect() -> str:
    return op.get_bind().dialect.name


def _has_table(name: str) -> bool:
    return name in sa.inspect(op.get_bind()).get_table_names()


def _has_column(table: str, column: str) -> bool:
    if not _has_table(table):
        return False
    return column in {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def _drop_unique(table: str, column: str) -> None:
    """Drop whatever single-column unique constraint/index guards this column."""
    inspector = sa.inspect(op.get_bind())
    if not _has_table(table):
        return

    for uc in inspector.get_unique_constraints(table):
        if uc.get("column_names") == [column] and uc.get("name"):
            try:
                op.drop_constraint(uc["name"], table, type_="unique")
            except Exception:
                pass

    for ix in inspector.get_indexes(table):
        if ix.get("unique") and ix.get("column_names") == [column] and ix.get("name"):
            try:
                op.drop_index(ix["name"], table_name=table)
            except Exception:
                pass


def upgrade() -> None:
    bind = op.get_bind()
    dialect = _dialect()

    # ------------------------------------------------------------------ new tables
    if not _has_table("document_sequences"):
        op.create_table(
            "document_sequences",
            sa.Column("id", sa.CHAR(36) if dialect != "postgresql" else sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", sa.CHAR(36) if dialect != "postgresql" else sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("scope", sa.String(32), nullable=False),
            sa.Column("period", sa.String(16), nullable=False),
            sa.Column("last_value", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint(
                "organization_id", "scope", "period", name="uq_document_sequences_key"
            ),
        )
        op.create_index(
            "ix_document_sequences_organization_id",
            "document_sequences",
            ["organization_id"],
        )

    if not _has_table("device_tokens"):
        op.create_table(
            "device_tokens",
            sa.Column("id", sa.CHAR(36) if dialect != "postgresql" else sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", sa.CHAR(36) if dialect != "postgresql" else sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("organization_id", sa.CHAR(36) if dialect != "postgresql" else sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("token", sa.String(512), nullable=False),
            sa.Column("platform", sa.String(20), nullable=True),
            sa.Column("device_name", sa.String(255), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("last_seen_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("token", name="uq_device_tokens_token"),
        )
        op.create_index("ix_device_tokens_user_id", "device_tokens", ["user_id"])
        op.create_index(
            "ix_device_tokens_user_active", "device_tokens", ["user_id", "is_active"]
        )

    # ------------------------------------------------------------------ backfill tenants
    # Per-tenant unique indexes treat NULL organization_id as distinct on most
    # engines, which would let duplicates survive. Park orphaned rows in a
    # single house organization first so the constraint is meaningful.
    org_table = "organizations"
    if _has_table(org_table):
        default_org = bind.execute(
            sa.text("SELECT id FROM organizations ORDER BY created_at LIMIT 1")
        ).scalar()

        if default_org is None:
            default_org = str(uuid.uuid4())
            bind.execute(
                sa.text(
                    "INSERT INTO organizations (id, name, slug, is_active, created_at) "
                    "VALUES (:id, :name, :slug, :active, CURRENT_TIMESTAMP)"
                ),
                {
                    "id": default_org,
                    "name": "Default Organization",
                    "slug": "default",
                    "active": True,
                },
            )

        for table in [
            "users", "vehicles", "branches", "job_cards", "payments", "invoices",
            "rfqs", "work_orders", "notifications", "audit_logs",
        ]:
            if _has_column(table, "organization_id"):
                bind.execute(
                    sa.text(
                        "UPDATE %s SET organization_id = :org "
                        "WHERE organization_id IS NULL" % table
                    ),
                    {"org": default_org},
                )

    # ------------------------------------------------------------------ money
    for table, column in MONEY_COLUMNS:
        if not _has_column(table, column):
            continue
        # SQLite cannot ALTER a column type; batch_alter_table rebuilds the
        # table. On PostgreSQL this is a plain ALTER with an explicit cast.
        with op.batch_alter_table(table) as batch:
            batch.alter_column(
                column,
                type_=MONEY,
                existing_nullable=True,
                postgresql_using="%s::numeric(12,2)" % column,
            )

    # ------------------------------------------------------------------ per-tenant keys
    for table, column, constraint in GLOBAL_UNIQUES:
        if not _has_column(table, column):
            continue
        _drop_unique(table, column)
        with op.batch_alter_table(table) as batch:
            batch.create_unique_constraint(constraint, ["organization_id", column])

    # vendor_quotes.quote_number: drop the global unique, add per-vendor-per-RFQ
    if _has_column("vendor_quotes", "quote_number"):
        _drop_unique("vendor_quotes", "quote_number")
    if _has_table("vendor_quotes"):
        # Collapse any pre-existing duplicates before adding the constraint.
        bind.execute(
            sa.text(
                "DELETE FROM vendor_quotes a USING vendor_quotes b "
                "WHERE a.rfq_id = b.rfq_id AND a.vendor_id = b.vendor_id AND a.ctid > b.ctid"
            )
        )
        with op.batch_alter_table("vendor_quotes") as batch:
            batch.create_unique_constraint(
                "uq_vendor_quotes_rfq_vendor", ["rfq_id", "vendor_id"]
            )

    # rfqs.created_by_id: relax to nullable (it was NOT NULL but never populated)
    if _has_column("rfqs", "created_by_id"):
        with op.batch_alter_table("rfqs") as batch:
            batch.alter_column("created_by_id", existing_type=sa.CHAR(36), nullable=True)

    # ------------------------------------------------------------------ OTP hardening
    if _has_table("otp_codes"):
        if not _has_column("otp_codes", "code_hash"):
            op.add_column("otp_codes", sa.Column("code_hash", sa.String(128), nullable=True))
        if not _has_column("otp_codes", "attempts"):
            op.add_column(
                "otp_codes",
                sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            )
        if not _has_column("otp_codes", "consumed_at"):
            op.add_column("otp_codes", sa.Column("consumed_at", sa.DateTime(), nullable=True))

        # Plaintext codes cannot be migrated into keyed hashes, and they are
        # short-lived anyway. Burn every outstanding code; users simply request
        # a new one.
        bind.execute(sa.text("UPDATE otp_codes SET is_used = TRUE, code_hash = '' WHERE code_hash IS NULL"))

        if _has_column("otp_codes", "code"):
            with op.batch_alter_table("otp_codes") as batch:
                batch.drop_column("code")

        with op.batch_alter_table("otp_codes") as batch:
            batch.alter_column("code_hash", existing_type=sa.String(128), nullable=False)

        op.create_index(
            "ix_otp_codes_mobile_active",
            "otp_codes",
            ["mobile", "is_used", "expires_at"],
        )

    # ------------------------------------------------------------------ work orders
    for column, coltype in [
        ("work_order_number", sa.String(30)),
        ("planned_start", sa.DateTime()),
        ("planned_end", sa.DateTime()),
        ("actual_start", sa.DateTime()),
        ("actual_end", sa.DateTime()),
        ("instructions", sa.Text()),
        ("completion_notes", sa.Text()),
        ("updated_at", sa.DateTime()),
    ]:
        if _has_table("work_orders") and not _has_column("work_orders", column):
            op.add_column("work_orders", sa.Column(column, coltype, nullable=True))

    if _has_table("work_orders"):
        with op.batch_alter_table("work_orders") as batch:
            batch.create_unique_constraint(
                "uq_work_orders_org_number", ["organization_id", "work_order_number"]
            )

    for column, coltype, default in [
        ("sequence", sa.Integer(), "0"),
        ("title", sa.String(255), None),
        ("estimated_minutes", sa.Integer(), None),
        ("actual_minutes", sa.Integer(), None),
        ("started_at", sa.DateTime(), None),
        ("completed_at", sa.DateTime(), None),
        ("notes", sa.Text(), None),
        ("updated_at", sa.DateTime(), None),
    ]:
        if _has_table("work_order_tasks") and not _has_column("work_order_tasks", column):
            op.add_column(
                "work_order_tasks",
                sa.Column(column, coltype, nullable=True, server_default=default),
            )

    if _has_table("work_order_tasks") and _has_column("work_order_tasks", "description"):
        # Older rows carried the task name in `description`; the model now has
        # a dedicated title.
        bind.execute(
            sa.text(
                "UPDATE work_order_tasks SET title = description "
                "WHERE title IS NULL OR title = ''"
            )
        )

    for column, coltype in [
        ("organization_id", sa.CHAR(36) if dialect != "postgresql" else sa.dialects.postgresql.UUID(as_uuid=True)),
        ("photos", sa.JSON()),
    ]:
        if _has_table("qc_checklists") and not _has_column("qc_checklists", column):
            op.add_column("qc_checklists", sa.Column(column, coltype, nullable=True))

    # ------------------------------------------------------------------ indexes
    for name, table, columns in [
        ("ix_job_cards_org_status", "job_cards", ["organization_id", "status"]),
        ("ix_job_cards_org_customer", "job_cards", ["organization_id", "customer_id"]),
        ("ix_job_cards_org_branch", "job_cards", ["organization_id", "branch_id"]),
        ("ix_payments_org_status", "payments", ["organization_id", "status"]),
        ("ix_payments_job", "payments", ["job_card_id"]),
        ("ix_rfqs_org_status", "rfqs", ["organization_id", "status"]),
        ("ix_vendor_quotes_vendor_status", "vendor_quotes", ["vendor_id", "status"]),
        ("ix_users_org_role", "users", ["organization_id", "role"]),
        ("ix_users_org_branch", "users", ["organization_id", "branch_id"]),
        ("ix_work_orders_job", "work_orders", ["job_card_id"]),
        ("ix_work_orders_tech_status", "work_orders", ["technician_id", "status"]),
        ("ix_qc_checklists_job", "qc_checklists", ["job_card_id"]),
        ("ix_work_order_tasks_order", "work_order_tasks", ["work_order_id", "sequence"]),
    ]:
        if not _has_table(table):
            continue
        try:
            op.create_index(name, table, columns)
        except Exception:
            # Index already present.
            pass


def downgrade() -> None:
    """Reverse the structural changes.

    The money columns are returned to Float, which is lossy by definition -
    that imprecision is exactly what this migration removed.
    """
    for name, table in [
        ("ix_job_cards_org_status", "job_cards"),
        ("ix_job_cards_org_customer", "job_cards"),
        ("ix_job_cards_org_branch", "job_cards"),
        ("ix_payments_org_status", "payments"),
        ("ix_payments_job", "payments"),
        ("ix_rfqs_org_status", "rfqs"),
        ("ix_vendor_quotes_vendor_status", "vendor_quotes"),
        ("ix_users_org_role", "users"),
        ("ix_users_org_branch", "users"),
        ("ix_work_orders_job", "work_orders"),
        ("ix_work_orders_tech_status", "work_orders"),
        ("ix_qc_checklists_job", "qc_checklists"),
        ("ix_work_order_tasks_order", "work_order_tasks"),
        ("ix_otp_codes_mobile_active", "otp_codes"),
    ]:
        try:
            op.drop_index(name, table_name=table)
        except Exception:
            pass

    for table, _column, constraint in GLOBAL_UNIQUES:
        try:
            op.drop_constraint(constraint, table, type_="unique")
        except Exception:
            pass

    for table, column in MONEY_COLUMNS:
        if not _has_column(table, column):
            continue
        with op.batch_alter_table(table) as batch:
            batch.alter_column(
                column,
                type_=sa.Float(),
                existing_nullable=True,
                postgresql_using="%s::double precision" % column,
            )

    for table in ["device_tokens", "document_sequences"]:
        try:
            op.drop_table(table)
        except Exception:
            pass
