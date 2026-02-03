/**
 * API Service - Axios client with authentication
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '@/constants/config';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error getting token:', error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/auth/refresh`, {
                        refresh_token: refreshToken,
                    });

                    const { access_token, refresh_token } = response.data;
                    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access_token);
                    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
                await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
                await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// API methods
export const authAPI = {
    requestOTP: (mobile: string, purpose: string = 'login') =>
        api.post('/auth/request-otp', { mobile, purpose }),

    verifyOTP: (mobile: string, otp: string) =>
        api.post('/auth/verify-otp', { mobile, otp }),

    register: (data: { full_name: string; mobile: string; email?: string; otp: string }) =>
        api.post('/auth/register', data),

    getProfile: () => api.get('/auth/me'),

    updateProfile: (data: any) => api.put('/auth/me', data),
};

export const vehicleAPI = {
    list: () => api.get('/vehicles'),
    get: (id: string) => api.get(`/vehicles/${id}`),
    create: (data: any) => api.post('/vehicles', data),
    update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
    delete: (id: string) => api.delete(`/vehicles/${id}`),
    uploadMulkiya: (id: string, formData: FormData) =>
        api.post(`/vehicles/${id}/mulkiya`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export const branchAPI = {
    list: (city?: string) => api.get('/branches', { params: { city } }),
    get: (id: string) => api.get(`/branches/${id}`),
};

export const jobAPI = {
    list: (params?: { status_filter?: string; page?: number; page_size?: number }) =>
        api.get('/jobs', { params }),
    get: (id: string) => api.get(`/jobs/${id}`),
    create: (data: any) => api.post('/jobs', data),
    updateStatus: (id: string, status: string, notes?: string) =>
        api.post(`/jobs/${id}/status`, { status, notes }),
    createEstimate: (id: string, data: any) => api.post(`/jobs/${id}/estimate`, data),
    approveEstimate: (id: string, approved: boolean) =>
        api.post(`/jobs/${id}/approve-estimate`, { approved }),
    approveParts: (id: string, approved: boolean) =>
        api.post(`/jobs/${id}/approve-parts`, { approved }),
    submitFeedback: (id: string, rating: number, feedback?: string) =>
        api.post(`/jobs/${id}/feedback`, { rating, feedback }),
    addJobUpdate: (id: string, data: { title: string; message: string; media_urls?: string[]; is_visible_to_customer?: boolean }) =>
        api.post(`/jobs/${id}/updates`, data),
};

export const paymentAPI = {
    getJobPayments: (jobId: string) => api.get(`/payments/job/${jobId}`),
    createPaymentLink: (jobId: string, amount: number) =>
        api.post(`/payments/job/${jobId}/link`, { amount }),
    recordCashPayment: (jobId: string, data: any) =>
        api.post(`/payments/job/${jobId}/cash`, data),
};

export const notificationAPI = {
    list: (unreadOnly?: boolean) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
    markRead: (ids: string[]) => api.post('/notifications/read', { notification_ids: ids }),
};

export const uploadAPI = {
    upload: (formData: FormData, folder: string = 'uploads') =>
        api.post(`/upload?folder=${folder}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    uploadFile: (formData: FormData) =>
        api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export const rfqAPI = {
    // Customer/Staff endpoints
    list: (jobId?: string) => api.get('/rfq', { params: { job_id: jobId } }),
    get: (id: string) => api.get(`/rfq/${id}`),
    create: (data: any) => api.post('/rfq', data),

    // Vendor endpoints
    getVendorRFQs: () => api.get('/vendor/rfqs'),
    getMyQuotes: () => api.get('/vendor/quotes'),
    getVendorOrders: () => api.get('/vendor/orders'),
    submitQuote: (rfqId: string, data: any) => api.post(`/vendor/rfqs/${rfqId}/quote`, data),

    // Quote comparison (staff)
    getQuotes: (rfqId: string) => api.get(`/rfq/${rfqId}/quotes`),
    selectQuote: (rfqId: string, quoteId: string) => api.post(`/rfq/${rfqId}/select-quote`, { quote_id: quoteId }),
};

export const driverAPI = {
    getPickups: (date?: string) => api.get('/driver/pickups', { params: { date_filter: date } }),
    getDeliveries: (date?: string) => api.get('/driver/deliveries', { params: { date_filter: date } }),
    startPickup: (jobId: string) => api.post(`/driver/${jobId}/start-pickup`),
    confirmPickup: (jobId: string) => api.post(`/driver/${jobId}/confirm-pickup`),
    startDelivery: (jobId: string) => api.post(`/driver/${jobId}/start-delivery`),
    confirmDelivery: (jobId: string, cashCollected?: number) =>
        api.post(`/driver/${jobId}/confirm-delivery`, { cash_collected: cashCollected }),
    updateLocation: (jobId: string, lat: number, lng: number) =>
        api.post(`/driver/${jobId}/location`, { latitude: lat, longitude: lng }),
    getHistory: (page?: number) => api.get('/driver/history', { params: { page } }),
};

export const reportsAPI = {
    getDashboard: (period: string = 'today', branchId?: string) =>
        api.get('/reports/dashboard', { params: { period, branch_id: branchId } }),
    getJobsByStatus: (branchId?: string) =>
        api.get('/reports/jobs-by-status', { params: { branch_id: branchId } }),
    getRevenueTrend: (days: number = 30, branchId?: string) =>
        api.get('/reports/revenue-trend', { params: { days, branch_id: branchId } }),
    getServiceTypeBreakdown: (period: string = 'month') =>
        api.get('/reports/service-type-breakdown', { params: { period } }),
    getBranchPerformance: (period: string = 'month') =>
        api.get('/reports/branch-performance', { params: { period } }),
    getCustomerInsights: () => api.get('/reports/customer-insights'),
    exportJobs: (params: any) => api.get('/reports/export/jobs', { params }),
};

