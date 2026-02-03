/**
 * API Configuration
 */

export const API_URL = __DEV__
    ? 'http://localhost:8000/api'  // Development
    : 'https://api.autocare.ae/api';  // Production

export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user',
    ONBOARDING_COMPLETE: 'onboarding_complete',
};

export const JOB_STATUS_LABELS: Record<string, string> = {
    requested: 'Requested',
    scheduled: 'Scheduled',
    vehicle_picked: 'Vehicle Picked Up',
    in_intake: 'In Intake',
    diagnosed: 'Diagnosed',
    awaiting_estimate_approval: 'Awaiting Estimate Approval',
    estimate_approved: 'Estimate Approved',
    rfq_sent: 'Getting Quotes',
    quotes_received: 'Quotes Received',
    awaiting_parts_approval: 'Awaiting Parts Approval',
    parts_approved: 'Parts Approved',
    awaiting_payment: 'Awaiting Payment',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    parts_ordered: 'Parts Ordered',
    parts_received: 'Parts Received',
    in_service: 'In Service',
    testing: 'Quality Testing',
    ready: 'Ready',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    closed: 'Closed',
    cancelled: 'Cancelled',
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
    diagnosis_only: 'Diagnosis Only',
    minor: 'Minor Service',
    regular: 'Regular Service',
    major: 'Major Service',
    ac_service: 'AC Service',
    electrical: 'Electrical',
    battery: 'Battery',
    tyre: 'Tyre Service',
    accident_repair: 'Accident Repair',
    body_work: 'Body Work',
    other: 'Other',
};
