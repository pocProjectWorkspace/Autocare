/**
 * AutoCare Web Dashboard - Main Application
 */

// =============================================
// Configuration
// =============================================
const API_URL = '/api';
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'autocare_access_token',
    REFRESH_TOKEN: 'autocare_refresh_token',
    USER: 'autocare_user',
};

// =============================================
// State
// =============================================
let state = {
    user: null,
    isAuthenticated: false,
    currentPage: 'overview',
    jobs: [],
    customers: [],
    stats: null,
    // Pagination
    jobsPage: 1,
    jobsPageSize: 20,
    jobsTotal: 0,
    jobsFilter: 'all',
    // Vehicles Pagination
    vehiclesPage: 1,
    vehiclesPageSize: 20,
    vehiclesTotal: 0,
    vehiclesPages: 1,
    // Reports
    reportPeriod: 'month',
    // Team
    teamRole: 'all',
};

// Chart instance tracking
let statusChartInstance = null;
let revenueChartInstance = null;
let serviceTypeChartInstance = null;
let branchChartInstance = null;

// Current job in modal for status updates
let currentJobInModal = null;

// Estimate builder state
let estimateJobId = null;

// Notification polling
let notificationInterval = null;

// =============================================
// API Client
// =============================================
const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);

            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    return this.request(endpoint, options);
                } else {
                    logout();
                    return null;
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) return false;

            const response = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    get: (endpoint) => api.request(endpoint),

    post: (endpoint, data) => api.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    put: (endpoint, data) => api.request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),
};

// =============================================
// Auth Functions
// =============================================
let authStep = 'mobile';
let pendingMobile = '';

async function handleAuth(e) {
    e.preventDefault();

    const btn = document.getElementById('auth-btn');
    const errorEl = document.getElementById('auth-error');
    const otpDisplay = document.getElementById('otp-display');

    btn.disabled = true;
    errorEl.classList.add('hidden');
    otpDisplay.classList.add('hidden');

    try {
        if (authStep === 'mobile') {
            const mobile = document.getElementById('mobile').value.trim();
            if (!mobile) {
                throw new Error('Please enter mobile number');
            }

            const response = await fetch(`${API_URL}/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, purpose: 'login' }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to send OTP');
            }

            pendingMobile = mobile;
            authStep = 'otp';

            document.getElementById('otp-group').classList.remove('hidden');
            document.querySelector('.otp-input').focus();
            btn.innerHTML = '<span>Verify & Login</span>';

            if (data.otp) {
                otpDisplay.textContent = `Dev Mode - OTP: ${data.otp}`;
                otpDisplay.classList.remove('hidden');
            }

        } else {
            const otpInputs = document.querySelectorAll('.otp-input');
            const otp = Array.from(otpInputs).map(i => i.value).join('');

            if (otp.length !== 6) {
                throw new Error('Please enter complete OTP');
            }

            const response = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: pendingMobile, otp }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Invalid OTP');
            }

            if (!['service_advisor', 'technician', 'admin'].includes(data.user.role)) {
                throw new Error('Access denied. Staff/Admin only.');
            }

            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

            state.user = data.user;
            state.isAuthenticated = true;

            showDashboard();
        }
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);

    state.user = null;
    state.isAuthenticated = false;

    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }

    showAuth();
}

function checkAuth() {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);

    if (token && userJson) {
        try {
            state.user = JSON.parse(userJson);
            state.isAuthenticated = true;
            showDashboard();
        } catch {
            showAuth();
        }
    } else {
        showAuth();
    }
}

// =============================================
// UI Functions
// =============================================
function showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');

    authStep = 'mobile';
    pendingMobile = '';
    document.getElementById('mobile').value = '';
    document.getElementById('otp-group').classList.add('hidden');
    document.getElementById('auth-btn').innerHTML = '<span>Get OTP</span>';
    document.querySelectorAll('.otp-input').forEach(i => i.value = '');
}

function showDashboard() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    if (state.user) {
        document.getElementById('user-name').textContent = state.user.full_name;
        document.getElementById('user-role').textContent = getRoleLabel(state.user.role);
        document.getElementById('user-avatar').textContent = state.user.full_name.charAt(0).toUpperCase();
    }

    lucide.createIcons();

    loadDashboardData();
    loadNotifications();

    // Poll notifications every 60s
    if (notificationInterval) clearInterval(notificationInterval);
    notificationInterval = setInterval(loadNotifications, 60000);
}

function getRoleLabel(role) {
    const labels = {
        admin: 'Administrator',
        service_advisor: 'Service Advisor',
        technician: 'Technician',
        driver: 'Driver',
        vendor: 'Vendor',
        customer: 'Customer',
    };
    return labels[role] || role;
}

function navigateTo(page) {
    state.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });

    const titles = {
        overview: 'Dashboard Overview',
        jobs: 'Job Cards',
        customers: 'Customers',
        vehicles: 'Vehicles',
        rfq: 'RFQ & Quotes',
        payments: 'Payments',
        reports: 'Reports',
        settings: 'Settings',
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

    loadPageData(page);

    document.querySelector('.sidebar').classList.remove('open');
}

function loadPageData(page) {
    switch (page) {
        case 'overview':
            loadDashboardData();
            break;
        case 'jobs':
            loadJobs();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'vehicles':
            loadVehicles(1);
            break;
        case 'rfq':
            loadRFQs();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'reports':
            loadReports(state.reportPeriod);
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// =============================================
// Data Loading — Overview
// =============================================
async function loadDashboardData() {
    try {
        // Load real stats from admin dashboard
        const stats = await api.get('/admin/dashboard');
        if (stats) {
            document.getElementById('stat-pending').textContent = stats.pending_jobs || 0;
            document.getElementById('stat-progress').textContent = stats.in_progress_jobs || 0;
            document.getElementById('stat-completed').textContent = stats.completed_jobs || 0;
            document.getElementById('stat-revenue').textContent = `AED ${(stats.today_revenue || 0).toLocaleString()}`;
        }

        // Load recent jobs
        const jobsData = await api.get('/jobs?page_size=5');
        if (jobsData) {
            state.jobs = jobsData.jobs || [];
            renderRecentJobs();
        }

        // Initialize charts with real data
        await initCharts();

    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// =============================================
// Data Loading — Jobs with Pagination
// =============================================
async function loadJobs(filter, page) {
    if (filter !== undefined) {
        state.jobsFilter = filter;
        state.jobsPage = 1;
    }
    if (page !== undefined) {
        state.jobsPage = page;
    }

    const tbody = document.getElementById('jobs-table');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading...</td></tr>';

    try {
        let statusFilter = '';
        if (state.jobsFilter === 'pending') {
            statusFilter = 'requested,scheduled';
        } else if (state.jobsFilter === 'in_progress') {
            statusFilter = 'in_intake,diagnosed,in_service,testing';
        } else if (state.jobsFilter === 'awaiting_approval') {
            statusFilter = 'awaiting_estimate_approval,awaiting_parts_approval,awaiting_payment';
        } else if (state.jobsFilter === 'completed') {
            statusFilter = 'delivered,closed';
        }

        let url = `/jobs?page=${state.jobsPage}&page_size=${state.jobsPageSize}`;
        if (statusFilter) url += `&status_filter=${statusFilter}`;

        const data = await api.get(url);

        if (data && data.jobs) {
            state.jobs = data.jobs;
            state.jobsTotal = data.total || 0;
            renderJobsTable();
            updatePagination();
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Failed to load jobs</td></tr>';
    }
}

function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(state.jobsTotal / state.jobsPageSize));
    document.getElementById('page-info').textContent = `Page ${state.jobsPage} of ${totalPages}`;

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    prevBtn.disabled = state.jobsPage <= 1;
    nextBtn.disabled = state.jobsPage >= totalPages;
}

function updateVehiclesPagination() {
    const totalPages = Math.max(1, state.vehiclesPages || Math.ceil(state.vehiclesTotal / state.vehiclesPageSize));
    const pageInfo = document.getElementById('vehicles-page-info');
    if (pageInfo) pageInfo.textContent = `Page ${state.vehiclesPage} of ${totalPages}`;

    const prevBtn = document.getElementById('vehicles-prev-page');
    const nextBtn = document.getElementById('vehicles-next-page');
    if (prevBtn) prevBtn.disabled = state.vehiclesPage <= 1;
    if (nextBtn) nextBtn.disabled = state.vehiclesPage >= totalPages;
}

// =============================================
// Data Loading — Customers
// =============================================
async function loadCustomers() {
    const tbody = document.getElementById('customers-table');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading...</td></tr>';

    try {
        const data = await api.get('/admin/users?role=customer&page_size=50');
        if (data && data.users) {
            state.customers = data.users;
            renderCustomersTable();
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Failed to load customers</td></tr>';
    }
}

// =============================================
// Data Loading — Vehicles
// =============================================
async function loadVehicles(page) {
    if (page !== undefined) {
        state.vehiclesPage = page;
    }

    const tbody = document.getElementById('vehicles-table');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading...</td></tr>';

    try {
        const data = await api.get(`/admin/vehicles?page=${state.vehiclesPage}&page_size=${state.vehiclesPageSize}`);
        if (data && data.vehicles) {
            state.vehiclesTotal = data.total || 0;
            state.vehiclesPages = data.pages || 1;
            renderVehiclesTable(data.vehicles || []);
            updateVehiclesPagination();
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Failed to load vehicles</td></tr>';
    }
}

// =============================================
// Data Loading — RFQs
// =============================================
async function loadRFQs() {
    const tbody = document.getElementById('rfq-table');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading...</td></tr>';

    try {
        const data = await api.get('/admin/rfqs?page_size=50');
        if (data && data.rfqs) {
            renderRFQTable(data.rfqs);
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Failed to load RFQs</td></tr>';
    }
}

// =============================================
// Data Loading — Payments
// =============================================
async function loadPayments() {
    const tbody = document.getElementById('payments-table');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading...</td></tr>';

    try {
        const data = await api.get('/admin/payments?page_size=50');
        if (data) {
            // Update summary cards
            if (data.summary) {
                document.getElementById('today-collection').textContent = `AED ${(data.summary.today_collection || 0).toLocaleString()}`;
                document.getElementById('pending-payments').textContent = data.summary.pending_count || 0;
                document.getElementById('month-revenue').textContent = `AED ${(data.summary.month_total || 0).toLocaleString()}`;
            }
            renderPaymentsTable(data.payments || []);
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Failed to load payments</td></tr>';
    }
}

// =============================================
// Data Loading — Reports
// =============================================
async function loadReports(period) {
    state.reportPeriod = period || 'month';

    try {
        const [dashboard, serviceTypes, branchPerf, customers] = await Promise.all([
            api.get(`/reports/dashboard?period=${state.reportPeriod}`).catch(() => null),
            api.get(`/reports/service-type-breakdown?period=${state.reportPeriod}`).catch(() => null),
            api.get(`/reports/branch-performance?period=${state.reportPeriod}`).catch(() => null),
            api.get('/reports/customer-insights').catch(() => null),
        ]);

        // Stat cards
        if (dashboard) {
            document.getElementById('report-revenue').textContent = `AED ${(dashboard.total_revenue || 0).toLocaleString()}`;
            document.getElementById('report-jobs').textContent = dashboard.total_jobs || 0;
            document.getElementById('report-avg-ticket').textContent = `AED ${Math.round(dashboard.avg_job_value || 0).toLocaleString()}`;
        }
        if (customers) {
            document.getElementById('report-customers').textContent = customers.total_customers || 0;
            renderTopCustomers(customers.top_customers || []);
        }

        // Service type chart
        renderServiceTypeChart(serviceTypes || []);

        // Branch performance chart
        renderBranchChart(branchPerf || []);

    } catch (error) {
        console.error('Failed to load reports:', error);
    }
}

// =============================================
// Data Loading — Settings
// =============================================
async function loadSettings() {
    try {
        // Load profile
        const profile = await api.get('/auth/me').catch(() => null);
        if (profile) {
            document.getElementById('settings-name').value = profile.full_name || '';
            document.getElementById('settings-email').value = profile.email || '';
        }

        // Load org settings
        const org = await api.get('/org/me').catch(() => null);
        if (org) {
            document.getElementById('settings-org-name').value = org.name || '';
            const currencyEl = document.getElementById('settings-currency');
            const taxEl = document.getElementById('settings-tax-rate');
            if (org.settings) {
                currencyEl.value = org.settings.currency || 'AED';
                taxEl.value = org.settings.tax_rate || 5;
            }
        }

        // Load branches for dropdown
        const branches = await api.get('/branches').catch(() => null);
        if (branches && branches.branches) {
            const select = document.getElementById('settings-branch');
            select.innerHTML = '<option value="">Select Branch</option>' +
                branches.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        }

        // Load team
        loadTeam();

    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// =============================================
// Data Loading — Team Management
// =============================================
async function loadTeam(role) {
    if (role !== undefined) state.teamRole = role;

    const tbody = document.getElementById('team-table');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading...</td></tr>';

    try {
        let url = '/admin/users?page_size=50';
        if (state.teamRole && state.teamRole !== 'all') {
            url += `&role=${state.teamRole}`;
        }
        const data = await api.get(url);
        if (data && data.users) {
            // Filter out customers for "all" view
            const users = state.teamRole === 'all'
                ? data.users.filter(u => u.role !== 'customer')
                : data.users;
            renderTeamTable(users);
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Failed to load team</td></tr>';
    }
}

// =============================================
// Data Loading — Notifications
// =============================================
async function loadNotifications() {
    try {
        const data = await api.get('/notifications?unread_only=true&limit=5');
        if (data) {
            const countEl = document.getElementById('notification-count');
            countEl.textContent = data.unread_count || 0;
            countEl.style.display = data.unread_count > 0 ? 'flex' : 'none';

            renderNotificationList(data.notifications || []);
        }
    } catch (error) {
        // Silently fail on notification polling
    }
}

// =============================================
// Render Functions
// =============================================
function renderRecentJobs() {
    const tbody = document.getElementById('recent-jobs-table');

    if (!state.jobs.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No jobs found</td></tr>';
        return;
    }

    tbody.innerHTML = state.jobs.slice(0, 5).map(job => `
    <tr>
      <td><strong>${job.job_number}</strong></td>
      <td>${job.customer_name || '-'}</td>
      <td>${job.vehicle_plate || '-'}</td>
      <td>${getServiceLabel(job.service_type)}</td>
      <td>${getStatusBadge(job.status)}</td>
      <td>${job.grand_total ? `AED ${job.grand_total.toFixed(2)}` : '-'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewJob('${job.id}')">View</button>
      </td>
    </tr>
  `).join('');
}

function renderJobsTable() {
    const tbody = document.getElementById('jobs-table');

    if (!state.jobs.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No jobs found</td></tr>';
        return;
    }

    tbody.innerHTML = state.jobs.map(job => `
    <tr>
      <td><strong>${job.job_number}</strong></td>
      <td>${job.customer_name || '-'}</td>
      <td>${job.vehicle_plate || '-'}<br><small class="text-muted">${job.vehicle_name || ''}</small></td>
      <td>${getServiceLabel(job.service_type)}</td>
      <td>${getStatusBadge(job.status)}</td>
      <td>${new Date(job.created_at).toLocaleDateString()}</td>
      <td>${job.grand_total ? `AED ${job.grand_total.toFixed(2)}` : '-'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewJob('${job.id}')">View</button>
      </td>
    </tr>
  `).join('');
}

function renderCustomersTable() {
    const tbody = document.getElementById('customers-table');

    if (!state.customers.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No customers found</td></tr>';
        return;
    }

    tbody.innerHTML = state.customers.map(customer => `
    <tr>
      <td><strong>${customer.full_name}</strong></td>
      <td>${customer.mobile}</td>
      <td>${customer.email || '-'}</td>
      <td>-</td>
      <td>-</td>
      <td>${new Date(customer.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-secondary">View</button>
      </td>
    </tr>
  `).join('');
}

function renderVehiclesTable(vehicles) {
    const tbody = document.getElementById('vehicles-table');

    if (!vehicles.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No vehicles found</td></tr>';
        return;
    }

    tbody.innerHTML = vehicles.map(v => `
    <tr>
      <td><strong>${v.plate_number}</strong></td>
      <td>${v.make || ''} ${v.model || ''}</td>
      <td>${v.year || '-'}</td>
      <td>${v.owner_name || '-'}</td>
      <td>${v.last_service_date ? new Date(v.last_service_date).toLocaleDateString() : '-'}</td>
      <td>${v.job_count || 0}</td>
      <td>
        <button class="btn btn-sm btn-secondary">View</button>
      </td>
    </tr>
  `).join('');
}

function renderRFQTable(rfqs) {
    const tbody = document.getElementById('rfq-table');

    if (!rfqs.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No RFQs found</td></tr>';
        return;
    }

    tbody.innerHTML = rfqs.map(r => `
    <tr>
      <td><strong>${r.rfq_number}</strong></td>
      <td>${r.job_number}</td>
      <td>${r.parts_count}</td>
      <td>${r.vendor_count}</td>
      <td>${r.quotes_received}</td>
      <td>${getRFQStatusBadge(r.status)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewRFQ('${r.id}')">View</button>
      </td>
    </tr>
  `).join('');
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('payments-table');

    if (!payments.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No payments found</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(p => `
    <tr>
      <td><strong>${p.payment_number}</strong></td>
      <td>${p.job_number}</td>
      <td>${p.customer_name}</td>
      <td>AED ${(p.amount || 0).toFixed(2)}</td>
      <td>${getPaymentMethodLabel(p.payment_method)}</td>
      <td>${getPaymentStatusBadge(p.status)}</td>
      <td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString() : (p.created_at ? new Date(p.created_at).toLocaleDateString() : '-')}</td>
    </tr>
  `).join('');
}

function renderTopCustomers(customers) {
    const tbody = document.getElementById('top-customers-table');

    if (!customers.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">No data</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>AED ${(c.spend || 0).toLocaleString()}</td>
      <td>${c.jobs || 0}</td>
      <td>AED ${c.jobs ? Math.round(c.spend / c.jobs).toLocaleString() : 0}</td>
    </tr>
  `).join('');
}

function renderTeamTable(users) {
    const tbody = document.getElementById('team-table');

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No team members found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.full_name}</strong></td>
      <td>${u.mobile}</td>
      <td>${u.email || '-'}</td>
      <td>${getRoleLabel(u.role)}</td>
      <td>${u.is_active ? '<span class="status-badge completed">Active</span>' : '<span class="status-badge cancelled">Inactive</span>'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="toggleUserStatus('${u.id}', ${u.is_active})">${u.is_active ? 'Deactivate' : 'Activate'}</button>
      </td>
    </tr>
  `).join('');
}

function renderNotificationList(notifications) {
    const container = document.getElementById('notification-list');

    if (!notifications.length) {
        container.innerHTML = '<p class="notif-empty">No new notifications</p>';
        return;
    }

    container.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}">
      <div class="notif-title">${n.title}</div>
      <div class="notif-msg">${n.message}</div>
      <div class="notif-time">${timeAgo(n.created_at)}</div>
    </div>
  `).join('');
}

// =============================================
// Helper Functions
// =============================================
function getServiceLabel(type) {
    const labels = {
        diagnosis_only: 'Diagnosis',
        minor: 'Minor Service',
        regular: 'Regular Service',
        major: 'Major Service',
        ac_service: 'AC Service',
        electrical: 'Electrical',
        battery: 'Battery',
        tyre: 'Tyre Service',
    };
    return labels[type] || type;
}

function getStatusBadge(status) {
    const statusMap = {
        requested: { class: 'pending', label: 'Requested' },
        scheduled: { class: 'pending', label: 'Scheduled' },
        en_route_pickup: { class: 'in-progress', label: 'En Route' },
        vehicle_picked: { class: 'in-progress', label: 'Picked Up' },
        in_intake: { class: 'in-progress', label: 'In Intake' },
        diagnosed: { class: 'in-progress', label: 'Diagnosed' },
        awaiting_estimate_approval: { class: 'awaiting', label: 'Awaiting Approval' },
        estimate_approved: { class: 'completed', label: 'Approved' },
        rfq_sent: { class: 'in-progress', label: 'RFQ Sent' },
        quotes_received: { class: 'in-progress', label: 'Quotes In' },
        awaiting_parts_approval: { class: 'awaiting', label: 'Awaiting Parts' },
        parts_approved: { class: 'completed', label: 'Parts Approved' },
        awaiting_payment: { class: 'awaiting', label: 'Awaiting Payment' },
        partially_paid: { class: 'awaiting', label: 'Partially Paid' },
        paid: { class: 'completed', label: 'Paid' },
        parts_ordered: { class: 'in-progress', label: 'Parts Ordered' },
        parts_received: { class: 'in-progress', label: 'Parts Received' },
        in_service: { class: 'in-progress', label: 'In Service' },
        testing: { class: 'in-progress', label: 'Testing' },
        ready: { class: 'completed', label: 'Ready' },
        out_for_delivery: { class: 'in-progress', label: 'Out for Delivery' },
        delivered: { class: 'completed', label: 'Delivered' },
        closed: { class: 'completed', label: 'Closed' },
        cancelled: { class: 'cancelled', label: 'Cancelled' },
    };

    const config = statusMap[status] || { class: 'pending', label: status };
    return `<span class="status-badge ${config.class}">${config.label}</span>`;
}

function getRFQStatusBadge(status) {
    const map = {
        draft: { class: 'pending', label: 'Draft' },
        pending: { class: 'pending', label: 'Pending' },
        sent: { class: 'in-progress', label: 'Sent' },
        quotes_received: { class: 'in-progress', label: 'Quotes Received' },
        quote_selected: { class: 'completed', label: 'Selected' },
        ordered: { class: 'completed', label: 'Ordered' },
        cancelled: { class: 'cancelled', label: 'Cancelled' },
    };
    const config = map[status] || { class: 'pending', label: status };
    return `<span class="status-badge ${config.class}">${config.label}</span>`;
}

function getPaymentMethodLabel(method) {
    const labels = {
        cash: 'Cash',
        card: 'Card',
        online: 'Online',
        bank_transfer: 'Bank Transfer',
        cheque: 'Cheque',
        payment_link: 'Payment Link',
    };
    return labels[method] || method || '-';
}

function getPaymentStatusBadge(status) {
    const map = {
        pending: { class: 'pending', label: 'Pending' },
        processing: { class: 'in-progress', label: 'Processing' },
        completed: { class: 'completed', label: 'Completed' },
        failed: { class: 'cancelled', label: 'Failed' },
        cancelled: { class: 'cancelled', label: 'Cancelled' },
        refunded: { class: 'awaiting', label: 'Refunded' },
    };
    const config = map[status] || { class: 'pending', label: status };
    return `<span class="status-badge ${config.class}">${config.label}</span>`;
}

function getValidTransitions(status) {
    const transitions = {
        requested: ['scheduled', 'cancelled'],
        scheduled: ['vehicle_picked', 'in_intake', 'cancelled'],
        vehicle_picked: ['in_intake', 'cancelled'],
        in_intake: ['diagnosed', 'cancelled'],
        diagnosed: ['awaiting_estimate_approval', 'cancelled'],
        awaiting_estimate_approval: ['estimate_approved', 'cancelled'],
        estimate_approved: ['rfq_sent', 'awaiting_payment', 'in_service'],
        rfq_sent: ['quotes_received', 'cancelled'],
        quotes_received: ['awaiting_parts_approval'],
        awaiting_parts_approval: ['parts_approved', 'cancelled'],
        parts_approved: ['awaiting_payment'],
        awaiting_payment: ['partially_paid', 'paid', 'cancelled'],
        partially_paid: ['paid', 'parts_ordered', 'in_service'],
        paid: ['parts_ordered', 'in_service'],
        parts_ordered: ['parts_received'],
        parts_received: ['in_service'],
        in_service: ['testing'],
        testing: ['ready', 'in_service'],
        ready: ['out_for_delivery', 'delivered'],
        out_for_delivery: ['delivered'],
        delivered: ['closed'],
    };
    return transitions[status] || [];
}

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// =============================================
// Job Modal — with Status Update + Estimate
// =============================================
async function viewJob(jobId) {
    const modal = document.getElementById('job-modal');
    const body = document.getElementById('job-modal-body');

    body.innerHTML = '<p>Loading...</p>';
    modal.classList.remove('hidden');

    try {
        const job = await api.get(`/jobs/${jobId}`);

        if (!job) {
            body.innerHTML = '<p class="text-error">Failed to load job</p>';
            return;
        }

        currentJobInModal = job;
        document.getElementById('modal-job-number').textContent = job.job_number;

        // Build estimate items section
        let estimateHtml = '';
        if (job.estimate_items && job.estimate_items.length > 0) {
            estimateHtml = `
            <div class="detail-section full-width">
              <h4>Estimate Items</h4>
              <table class="data-table" style="margin-top:8px">
                <thead><tr><th>Type</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>
                  ${job.estimate_items.map(item => `
                    <tr>
                      <td>${item.item_type}</td>
                      <td>${item.description}</td>
                      <td>${item.quantity}</td>
                      <td>AED ${(item.unit_price || 0).toFixed(2)}</td>
                      <td>AED ${(item.total_price || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`;
        }

        // Build status update section
        const validTransitions = getValidTransitions(job.status);
        let statusUpdateHtml = '';
        if (validTransitions.length > 0) {
            statusUpdateHtml = `
            <div class="status-update-section">
              <h4>Update Status</h4>
              <select id="new-status-select">
                <option value="">Select new status...</option>
                ${validTransitions.map(s => `<option value="${s}">${getStatusBadge(s).replace(/<[^>]*>/g, '')}</option>`).join('')}
              </select>
              <textarea id="status-notes" rows="2" placeholder="Notes (optional)"></textarea>
            </div>`;
        }

        // Estimate builder button
        let estimateBtnHtml = '';
        if (['diagnosed', 'in_intake'].includes(job.status)) {
            estimateBtnHtml = `<button class="btn btn-sm btn-primary" onclick="openEstimateBuilder('${job.id}')" style="margin-top:var(--spacing-sm);">Create Estimate</button>`;
        }

        body.innerHTML = `
      <div class="job-detail-grid">
        <div class="detail-section">
          <h4>Customer & Vehicle</h4>
          <p><strong>Customer:</strong> ${job.customer_name || '-'}</p>
          <p><strong>Mobile:</strong> ${job.customer_mobile || '-'}</p>
          <p><strong>Vehicle:</strong> ${job.vehicle_plate || ''} - ${job.vehicle_name || ''}</p>
        </div>

        <div class="detail-section">
          <h4>Service Details</h4>
          <p><strong>Type:</strong> ${getServiceLabel(job.service_type)}</p>
          <p><strong>Status:</strong> ${getStatusBadge(job.status)}</p>
          <p><strong>Branch:</strong> ${job.branch_name || '-'}</p>
          ${estimateBtnHtml}
        </div>

        <div class="detail-section">
          <h4>Financials</h4>
          <p><strong>Labour:</strong> AED ${(job.labour_total || 0).toFixed(2)}</p>
          <p><strong>Parts:</strong> AED ${(job.parts_total || 0).toFixed(2)}</p>
          <p><strong>Tax:</strong> AED ${(job.tax_amount || 0).toFixed(2)}</p>
          <p><strong>Total:</strong> AED ${(job.grand_total || 0).toFixed(2)}</p>
          <p><strong>Paid:</strong> AED ${(job.amount_paid || 0).toFixed(2)}</p>
          <p><strong>Balance:</strong> AED ${(job.balance_due || 0).toFixed(2)}</p>
        </div>

        ${job.customer_notes ? `
        <div class="detail-section full-width">
          <h4>Customer Notes</h4>
          <p>${job.customer_notes}</p>
        </div>
        ` : ''}

        ${estimateHtml}
        ${statusUpdateHtml}
      </div>
    `;

    } catch (error) {
        body.innerHTML = '<p class="text-error">Failed to load job details</p>';
    }
}

async function updateJobStatus() {
    if (!currentJobInModal) return;

    const selectEl = document.getElementById('new-status-select');
    const notesEl = document.getElementById('status-notes');

    if (!selectEl || !selectEl.value) {
        alert('Please select a status');
        return;
    }

    try {
        await api.post(`/jobs/${currentJobInModal.id}/status`, {
            status: selectEl.value,
            notes: notesEl ? notesEl.value : null,
        });

        alert('Status updated successfully');
        closeModal('job-modal');

        // Refresh current page data
        if (state.currentPage === 'jobs') loadJobs();
        else if (state.currentPage === 'overview') loadDashboardData();

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// =============================================
// Estimate Builder
// =============================================
function openEstimateBuilder(jobId) {
    estimateJobId = jobId;
    const modal = document.getElementById('estimate-modal');

    if (currentJobInModal) {
        document.getElementById('estimate-job-number').textContent = currentJobInModal.job_number;
    }

    // Clear and add one empty row
    const tbody = document.getElementById('estimate-lines');
    tbody.innerHTML = '';
    addEstimateLine();

    // Pre-populate if existing items
    if (currentJobInModal && currentJobInModal.estimate_items && currentJobInModal.estimate_items.length > 0) {
        tbody.innerHTML = '';
        currentJobInModal.estimate_items.forEach(item => {
            addEstimateLine(item);
        });
    }

    recalculateEstimate();
    modal.classList.remove('hidden');

    // Close job modal
    closeModal('job-modal');
}

function addEstimateLine(item) {
    const tbody = document.getElementById('estimate-lines');
    const row = document.createElement('tr');
    row.innerHTML = `
    <td>
      <select class="est-type" onchange="recalculateEstimate()">
        <option value="labour" ${item?.item_type === 'labour' ? 'selected' : ''}>Labour</option>
        <option value="part" ${item?.item_type === 'part' ? 'selected' : ''}>Part</option>
        <option value="fee" ${item?.item_type === 'fee' ? 'selected' : ''}>Fee</option>
      </select>
    </td>
    <td><input type="text" class="est-desc" value="${item?.description || ''}" placeholder="Description"></td>
    <td><input type="number" class="est-qty" value="${item?.quantity || 1}" min="0.1" step="0.1" onchange="recalculateEstimate()"></td>
    <td><input type="number" class="est-price" value="${item?.unit_price || 0}" min="0" step="0.01" onchange="recalculateEstimate()"></td>
    <td class="est-line-total">AED 0.00</td>
    <td><button class="btn-icon" onclick="this.closest('tr').remove(); recalculateEstimate();"><i data-lucide="trash-2"></i></button></td>
  `;
    tbody.appendChild(row);
    recalculateEstimate();
    lucide.createIcons();
}

function recalculateEstimate() {
    let subtotal = 0;
    document.querySelectorAll('#estimate-lines tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.est-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.est-price')?.value) || 0;
        const lineTotal = qty * price;
        const totalCell = row.querySelector('.est-line-total');
        if (totalCell) totalCell.textContent = `AED ${lineTotal.toFixed(2)}`;
        subtotal += lineTotal;
    });

    const taxRate = 5;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    document.getElementById('est-subtotal').textContent = `AED ${subtotal.toFixed(2)}`;
    document.getElementById('est-tax').textContent = `AED ${tax.toFixed(2)}`;
    document.getElementById('est-total').textContent = `AED ${total.toFixed(2)}`;
}

async function submitEstimate() {
    if (!estimateJobId) return;

    const items = [];
    document.querySelectorAll('#estimate-lines tr').forEach(row => {
        const desc = row.querySelector('.est-desc')?.value;
        if (!desc) return;
        items.push({
            item_type: row.querySelector('.est-type')?.value || 'labour',
            description: desc,
            quantity: parseFloat(row.querySelector('.est-qty')?.value) || 1,
            unit_price: parseFloat(row.querySelector('.est-price')?.value) || 0,
        });
    });

    if (!items.length) {
        alert('Please add at least one line item');
        return;
    }

    try {
        await api.post(`/jobs/${estimateJobId}/estimate`, {
            items,
            pickup_delivery_fee: 0,
            tax_rate: 5,
        });

        alert('Estimate submitted successfully');
        closeModal('estimate-modal');
        if (state.currentPage === 'jobs') loadJobs();

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// =============================================
// RFQ Detail View
// =============================================
async function viewRFQ(rfqId) {
    const modal = document.getElementById('rfq-modal');
    const body = document.getElementById('rfq-modal-body');

    body.innerHTML = '<p>Loading...</p>';
    modal.classList.remove('hidden');

    try {
        const rfq = await api.get(`/rfq/${rfqId}`);

        if (!rfq) {
            body.innerHTML = '<p class="text-error">Failed to load RFQ</p>';
            return;
        }

        document.getElementById('rfq-modal-title').textContent = `RFQ ${rfq.rfq_number || rfqId.substring(0, 8)}`;

        // Parts list
        let partsHtml = '<h4 style="margin-bottom:8px;">Parts Requested</h4>';
        if (rfq.parts_list && rfq.parts_list.length > 0) {
            partsHtml += '<ul style="margin-left:16px; margin-bottom:16px;">';
            rfq.parts_list.forEach(p => {
                const partName = typeof p === 'string' ? p : (p.name || p.description || JSON.stringify(p));
                partsHtml += `<li style="margin-bottom:4px; color:var(--text-secondary);">${partName}</li>`;
            });
            partsHtml += '</ul>';
        } else {
            partsHtml += '<p class="text-muted">No parts listed</p>';
        }

        // Quotes comparison
        let quotesHtml = '<h4 style="margin-bottom:8px;">Vendor Quotes</h4>';
        if (rfq.quotes && rfq.quotes.length > 0) {
            quotesHtml += `
            <table class="data-table" style="margin-bottom:16px;">
              <thead><tr><th>Vendor</th><th>Total</th><th>Delivery</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                ${rfq.quotes.map(q => `
                  <tr>
                    <td>${q.vendor_name || 'Vendor'}</td>
                    <td>AED ${(q.total_amount || 0).toFixed(2)}</td>
                    <td>${q.delivery_days || '-'} days</td>
                    <td>${getStatusBadge(q.status)}</td>
                    <td>${rfq.status !== 'quote_selected' && q.status === 'submitted' ? `<button class="btn btn-sm btn-primary" onclick="selectQuote('${rfqId}','${q.id}')">Select</button>` : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`;
        } else {
            quotesHtml += '<p class="text-muted">No quotes received yet</p>';
        }

        body.innerHTML = `
        <p><strong>Job:</strong> ${rfq.job_number || '-'} &nbsp; <strong>Status:</strong> ${getRFQStatusBadge(rfq.status)}</p>
        <hr style="border-color:var(--neutral-800); margin:12px 0;">
        ${partsHtml}
        ${quotesHtml}
      `;

    } catch (error) {
        body.innerHTML = '<p class="text-error">Failed to load RFQ details</p>';
    }
}

async function selectQuote(rfqId, quoteId) {
    if (!confirm('Select this quote?')) return;

    try {
        await api.post(`/rfq/${rfqId}/select`, { quote_id: quoteId });
        alert('Quote selected successfully');
        closeModal('rfq-modal');
        loadRFQs();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// =============================================
// User Management
// =============================================
function openUserModal() {
    document.getElementById('user-edit-id').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('user-mobile').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-role').value = '';
    document.getElementById('user-modal-title').textContent = 'Add Team Member';

    // Load branches for user modal
    api.get('/branches').then(data => {
        if (data && data.branches) {
            const select = document.getElementById('user-branch');
            select.innerHTML = '<option value="">Select Branch</option>' +
                data.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        }
    }).catch(() => { });

    document.getElementById('user-modal').classList.remove('hidden');
}

async function saveUser() {
    const name = document.getElementById('user-name').value.trim();
    const mobile = document.getElementById('user-mobile').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const role = document.getElementById('user-role').value;
    const branchId = document.getElementById('user-branch').value;

    if (!name || !mobile || !role) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        if (role === 'vendor') {
            await api.post('/admin/vendor', {
                full_name: name,
                mobile,
                email: email || null,
                company_name: name,
            });
        } else {
            await api.post('/admin/staff', {
                full_name: name,
                mobile,
                email: email || null,
                role,
                branch_id: branchId || null,
            });
        }

        alert('Team member added successfully');
        closeModal('user-modal');
        loadTeam();

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function toggleUserStatus(userId, isActive) {
    const action = isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        await api.put(`/admin/users/${userId}/toggle-status`, {});
        loadTeam();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// =============================================
// Search
// =============================================
let searchTimeout = null;

function performSearch(query) {
    const dropdown = document.getElementById('search-results');

    if (!query || query.length < 2) {
        dropdown.classList.add('hidden');
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const data = await api.get(`/jobs?search=${encodeURIComponent(query)}&page_size=5`);
            if (data && data.jobs && data.jobs.length > 0) {
                dropdown.innerHTML = data.jobs.map(job => `
                <div class="search-result-item" onclick="viewJob('${job.id}'); document.getElementById('search-results').classList.add('hidden');">
                  <div>
                    <div class="sr-title">${job.job_number} - ${job.customer_name || ''}</div>
                    <div class="sr-sub">${job.vehicle_plate || ''} ${job.vehicle_name || ''}</div>
                  </div>
                  ${getStatusBadge(job.status)}
                </div>
              `).join('');
                dropdown.classList.remove('hidden');
            } else {
                dropdown.innerHTML = '<div class="search-result-item"><div class="sr-sub">No results found</div></div>';
                dropdown.classList.remove('hidden');
            }
        } catch {
            dropdown.classList.add('hidden');
        }
    }, 400);
}

// =============================================
// Export
// =============================================
async function exportReport() {
    try {
        const data = await api.get('/reports/export/jobs');
        if (data && data.csv_data) {
            const blob = new Blob([data.csv_data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename || 'jobs_export.csv';
            a.click();
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        alert('Export failed: ' + error.message);
    }
}

// =============================================
// New Job
// =============================================
async function openNewJobModal() {
    const modal = document.getElementById('new-job-modal');
    modal.classList.remove('hidden');

    try {
        const branches = await api.get('/branches');
        const select = document.getElementById('job-branch');
        select.innerHTML = '<option value="">Select Branch</option>' +
            (branches.branches || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    } catch (error) {
        console.error('Failed to load branches:', error);
    }
}

async function createJob() {
    const btn = document.getElementById('create-job-btn');
    const isNewVehicle = !document.getElementById('new-vehicle-section').classList.contains('hidden');
    btn.disabled = true;

    try {
        let vehicleId = document.getElementById('job-vehicle').value;
        const mobile = document.getElementById('job-customer-mobile').value;
        const customerName = document.getElementById('job-customer-name').value;

        if (isNewVehicle) {
            const vehicleData = {
                plate_number: document.getElementById('new-v-plate').value,
                make: document.getElementById('new-v-make').value,
                mulkiya_number: document.getElementById('new-v-mulkiya').value,
                year: parseInt(document.getElementById('new-v-year').value) || new Date().getFullYear(),
                mobile: mobile,
                customer_name: customerName,
                vin: document.getElementById('new-v-vin').value,
                chassis_number: document.getElementById('new-v-vin').value,
                engine_number: document.getElementById('new-v-engine').value,
                mulkiya_expiry: document.getElementById('new-v-mulkiya-expiry').value || null
            };

            if (!vehicleData.plate_number || !vehicleData.make || !vehicleData.mulkiya_number || !vehicleData.customer_name) {
                alert('Please fill customer name and all required vehicle fields');
                btn.disabled = false;
                return;
            }

            const newVehicle = await api.post('/admin/vehicles/quick-register', vehicleData);
            vehicleId = newVehicle.id;
            state.newJobCustomerId = newVehicle.owner_id;
        }

        const data = {
            vehicle_id: vehicleId,
            branch_id: document.getElementById('job-branch').value,
            service_type: document.getElementById('job-service-type').value,
            intake_type: document.getElementById('job-intake-type').value,
            customer_notes: document.getElementById('job-notes').value,
            customer_id: state.newJobCustomerId || undefined,
        };

        if (!data.vehicle_id || !data.branch_id || !data.service_type) {
            alert('Please select a vehicle and branch');
            btn.disabled = false;
            return;
        }
        if (!data.customer_id) {
            alert('Please enter a customer mobile so we can look them up');
            btn.disabled = false;
            return;
        }

        const result = await api.post('/jobs', data);

        if (result) {
            alert('Job created successfully!');
            closeModal('new-job-modal');
            loadJobs();
        }

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
    }
}

// =============================================
// Charts
// =============================================
async function initCharts() {
    // Status chart — fetch real data
    try {
        const statusData = await api.get('/reports/jobs-by-status');
        const statusCtx = document.getElementById('status-chart');
        if (statusCtx && statusData) {
            if (statusChartInstance) statusChartInstance.destroy();

            const labels = statusData.map(d => {
                const badge = getStatusBadge(d.status);
                return badge.replace(/<[^>]*>/g, '').trim();
            });
            const counts = statusData.map(d => d.count);
            const colors = ['#ec3013', '#201e1d', '#dd2b0f', '#605d5d', '#ff563c', '#9b9797', '#ae1800', '#bab6b6'];

            statusChartInstance = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: colors.slice(0, counts.length),
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '62%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#605d5d', padding: 14, font: { family: 'Archivo', size: 11 } },
                        },
                    },
                },
            });
        }
    } catch (error) {
        console.error('Failed to load status chart:', error);
    }

    // Revenue chart — fetch real data
    try {
        const revenueData = await api.get('/reports/revenue-trend?days=7');
        const revenueCtx = document.getElementById('revenue-chart');
        if (revenueCtx && revenueData) {
            if (revenueChartInstance) revenueChartInstance.destroy();

            const labels = revenueData.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('en-US', { weekday: 'short' });
            });
            const values = revenueData.map(d => d.revenue);

            revenueChartInstance = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: labels.length ? labels : ['No Data'],
                    datasets: [{
                        label: 'Revenue',
                        data: values.length ? values : [0],
                        borderColor: '#ec3013',
                        backgroundColor: 'rgba(236, 48, 19, 0.08)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointBackgroundColor: '#ec3013',
                        pointBorderColor: '#ec3013',
                        pointRadius: 3,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#605d5d', font: { family: 'Archivo', size: 11 } },
                        },
                        y: {
                            grid: { color: '#eae7e7' },
                            ticks: { color: '#605d5d', font: { family: 'Archivo', size: 11 } },
                        },
                    },
                },
            });
        }
    } catch (error) {
        console.error('Failed to load revenue chart:', error);
    }
}

function renderServiceTypeChart(data) {
    const ctx = document.getElementById('service-type-chart');
    if (!ctx) return;

    if (serviceTypeChartInstance) serviceTypeChartInstance.destroy();

    if (!data.length) {
        serviceTypeChartInstance = null;
        return;
    }

    const labels = data.map(d => getServiceLabel(d.service_type));
    const counts = data.map(d => d.count);

    serviceTypeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Jobs',
                data: counts,
                backgroundColor: '#ec3013',
                borderRadius: 0,
                maxBarThickness: 32,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#605d5d', font: { family: 'Archivo', size: 11 } } },
                y: { grid: { color: '#eae7e7' }, ticks: { color: '#605d5d', font: { family: 'Archivo', size: 11 } } },
            },
        },
    });
}

function renderBranchChart(data) {
    const ctx = document.getElementById('branch-chart');
    if (!ctx) return;

    if (branchChartInstance) branchChartInstance.destroy();

    if (!data.length) {
        branchChartInstance = null;
        return;
    }

    const labels = data.map(d => d.branch_name);
    const revenues = data.map(d => d.revenue);

    branchChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (AED)',
                data: revenues,
                backgroundColor: '#201e1d',
                borderRadius: 0,
                maxBarThickness: 32,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#605d5d', font: { family: 'Archivo', size: 11 } } },
                y: { grid: { color: '#eae7e7' }, ticks: { color: '#605d5d', font: { family: 'Archivo', size: 11 } } },
            },
        },
    });
}

// =============================================
// Event Listeners
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // Auth form
    document.getElementById('login-form').addEventListener('submit', handleAuth);

    // OTP input auto-focus
    document.querySelectorAll('.otp-input').forEach((input, index, inputs) => {
        input.addEventListener('input', (e) => {
            if (e.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Jobs filter tabs
    document.querySelectorAll('#page-jobs .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#page-jobs .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadJobs(tab.dataset.filter);
        });
    });

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (state.jobsPage > 1) loadJobs(undefined, state.jobsPage - 1);
    });
    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(state.jobsTotal / state.jobsPageSize);
        if (state.jobsPage < totalPages) loadJobs(undefined, state.jobsPage + 1);
    });

    // Vehicles Pagination
    const vehiclesPrevBtn = document.getElementById('vehicles-prev-page');
    const vehiclesNextBtn = document.getElementById('vehicles-next-page');
    if (vehiclesPrevBtn) {
        vehiclesPrevBtn.addEventListener('click', () => {
            if (state.vehiclesPage > 1) loadVehicles(state.vehiclesPage - 1);
        });
    }
    if (vehiclesNextBtn) {
        vehiclesNextBtn.addEventListener('click', () => {
            const totalPages = Math.max(1, state.vehiclesPages || Math.ceil(state.vehiclesTotal / state.vehiclesPageSize));
            if (state.vehiclesPage < totalPages) loadVehicles(state.vehiclesPage + 1);
        });
    }

    // Reports period filter tabs
    document.querySelectorAll('#page-reports .filter-tab[data-period]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#page-reports .filter-tab[data-period]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadReports(tab.dataset.period);
        });
    });

    // Export button
    const exportBtn = document.getElementById('export-report-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportReport);

    // Team role filter tabs
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('#team-role-tabs .filter-tab');
        if (tab) {
            document.querySelectorAll('#team-role-tabs .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTeam(tab.dataset.role);
        }
    });

    // Add user button
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) addUserBtn.addEventListener('click', openUserModal);

    // Save user button
    const saveUserBtn = document.getElementById('save-user-btn');
    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUser);

    // Modal close — use event delegation for dynamically added modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.add('hidden');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            overlay.closest('.modal').classList.add('hidden');
        });
    });

    // New job button
    document.getElementById('new-job-btn').addEventListener('click', openNewJobModal);
    document.getElementById('create-job-btn').addEventListener('click', createJob);

    // Update status button
    const updateStatusBtn = document.getElementById('update-status-btn');
    if (updateStatusBtn) updateStatusBtn.addEventListener('click', updateJobStatus);

    // Estimate builder
    const addLineBtn = document.getElementById('add-estimate-line');
    if (addLineBtn) addLineBtn.addEventListener('click', () => addEstimateLine());

    const submitEstBtn = document.getElementById('submit-estimate-btn');
    if (submitEstBtn) submitEstBtn.addEventListener('click', submitEstimate);

    // Settings forms
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await api.put('/auth/me', {
                    full_name: document.getElementById('settings-name').value,
                    email: document.getElementById('settings-email').value,
                });
                alert('Profile updated');
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }

    const orgForm = document.getElementById('org-settings-form');
    if (orgForm) {
        orgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await api.put('/org/me/settings', {
                    name: document.getElementById('settings-org-name').value,
                    currency: document.getElementById('settings-currency').value,
                    tax_rate: parseFloat(document.getElementById('settings-tax-rate').value) || 5,
                });
                alert('Organization settings updated');
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }

    // Search
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => performSearch(e.target.value.trim()));
    }

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
        const searchResults = document.getElementById('search-results');
        const searchWrapper = e.target.closest('.search-wrapper');
        if (!searchWrapper && searchResults) {
            searchResults.classList.add('hidden');
        }
    });

    // Notification bell
    const notifBell = document.getElementById('notification-bell');
    if (notifBell) {
        notifBell.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('notification-dropdown');
            dropdown.classList.toggle('hidden');
        });
    }

    // Mark all read
    const markAllRead = document.getElementById('mark-all-read');
    if (markAllRead) {
        markAllRead.addEventListener('click', async () => {
            try {
                // Get all notification IDs — we send an empty list to mark all
                const data = await api.get('/notifications?unread_only=true&limit=50');
                if (data && data.notifications && data.notifications.length > 0) {
                    const ids = data.notifications.map(n => n.id);
                    await api.post('/notifications/read', { notification_ids: ids });
                    loadNotifications();
                }
            } catch (error) {
                console.error('Failed to mark notifications as read:', error);
            }
        });
    }

    // Close notification dropdown on click outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notification-dropdown');
        const wrapper = e.target.closest('.notification-wrapper');
        if (!wrapper && dropdown) {
            dropdown.classList.add('hidden');
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });

    // Check auth on load
    checkAuth();

    // Customer lookup on mobile input
    let lookupTimeout;
    const mobileInput = document.getElementById('job-customer-mobile');
    if (mobileInput) {
        mobileInput.addEventListener('input', (e) => {
            const mobile = e.target.value;
            const nameInput = document.getElementById('job-customer-name');
            const vehicleSelect = document.getElementById('job-vehicle');

            nameInput.value = '';
            vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>';
            state.newJobCustomerId = null;

            clearTimeout(lookupTimeout);
            if (mobile.length >= 10) {
                lookupTimeout = setTimeout(async () => {
                    try {
                        const data = await api.get(`/admin/customers/lookup?mobile=${encodeURIComponent(mobile)}`);
                        if (data && data.customer) {
                            nameInput.value = data.customer.full_name;
                            state.newJobCustomerId = data.customer.id;

                            if (data.vehicles && data.vehicles.length > 0) {
                                vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>' +
                                    data.vehicles.map(v => `<option value="${v.id}">${v.plate_number} (${v.make} ${v.model})</option>`).join('');
                            } else {
                                vehicleSelect.innerHTML = '<option value="">No vehicles found</option>';
                            }
                        }
                    } catch (error) {
                        console.error('Customer not found');
                    }
                }, 500);
            }
        });
    }

    // New Vehicle toggle
    const toggleBtn = document.getElementById('toggle-new-vehicle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const section = document.getElementById('new-vehicle-section');
            const select = document.getElementById('job-vehicle');
            section.classList.toggle('hidden');

            if (!section.classList.contains('hidden')) {
                toggleBtn.textContent = 'Cancel';
                select.disabled = true;
                select.value = '';
            } else {
                toggleBtn.textContent = '+ New Vehicle';
                select.disabled = false;
            }
        });
    }

    // Vehicle lookup from external API
    const fetchBtn = document.getElementById('fetch-v-details');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const plate = document.getElementById('new-v-plate').value;
            if (!plate) {
                alert('Please enter a plate number first');
                return;
            }

            fetchBtn.disabled = true;
            fetchBtn.innerHTML = '<span>...</span>';

            try {
                const details = await api.get(`/admin/vehicles/lookup-plate?plate_number=${encodeURIComponent(plate)}`);
                if (details) {
                    document.getElementById('new-v-make').value = `${details.make} ${details.model}`;
                    document.getElementById('new-v-year').value = details.year;
                    document.getElementById('new-v-mulkiya').value = details.mulkiya_number || details.vin.substring(0, 8);
                    document.getElementById('new-v-vin').value = details.vin;
                    document.getElementById('new-v-engine').value = details.engine_number;

                    if (details.mulkiya_expiry) {
                        document.getElementById('new-v-mulkiya-expiry').value = details.mulkiya_expiry;
                    }

                    fetchBtn.innerHTML = 'Done';
                    setTimeout(() => { fetchBtn.innerHTML = 'Fetch'; fetchBtn.disabled = false; }, 2000);
                }
            } catch (error) {
                alert('Vehicle data not found or API service unavailable');
                fetchBtn.innerHTML = 'Fetch';
                fetchBtn.disabled = false;
            }
        });
    }
});

// Make functions accessible from onclick attributes
window.viewJob = viewJob;
window.viewRFQ = viewRFQ;
window.selectQuote = selectQuote;
window.openEstimateBuilder = openEstimateBuilder;
window.addEstimateLine = addEstimateLine;
window.recalculateEstimate = recalculateEstimate;
window.toggleUserStatus = toggleUserStatus;
