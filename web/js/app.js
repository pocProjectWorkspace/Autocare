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
};

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
                // Token expired, try refresh
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
let authStep = 'mobile'; // 'mobile' or 'otp'
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
            // Request OTP
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

            // Show OTP in dev mode
            if (data.otp) {
                otpDisplay.textContent = `Dev Mode - OTP: ${data.otp}`;
                otpDisplay.classList.remove('hidden');
            }

        } else {
            // Verify OTP
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

            // Check if staff/admin
            if (!['service_advisor', 'technician', 'admin'].includes(data.user.role)) {
                throw new Error('Access denied. Staff/Admin only.');
            }

            // Login successful
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

    // Reset form
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

    // Update user info
    if (state.user) {
        document.getElementById('user-name').textContent = state.user.full_name;
        document.getElementById('user-role').textContent = getRoleLabel(state.user.role);
        document.getElementById('user-avatar').textContent = state.user.full_name.charAt(0).toUpperCase();
    }

    // Initialize Lucide icons
    lucide.createIcons();

    // Load initial data
    loadDashboardData();
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

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });

    // Update title
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

    // Load page data
    loadPageData(page);

    // Close mobile menu
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
        case 'payments':
            loadPayments();
            break;
    }
}

// =============================================
// Data Loading
// =============================================
async function loadDashboardData() {
    try {
        // Load stats (mock for now, would come from admin dashboard API)
        const stats = {
            pending: 12,
            inProgress: 8,
            completed: 5,
            revenue: 15420,
        };

        document.getElementById('stat-pending').textContent = stats.pending;
        document.getElementById('stat-progress').textContent = stats.inProgress;
        document.getElementById('stat-completed').textContent = stats.completed;
        document.getElementById('stat-revenue').textContent = `AED ${stats.revenue.toLocaleString()}`;

        // Load recent jobs
        const jobsData = await api.get('/jobs?page_size=5');
        if (jobsData) {
            state.jobs = jobsData.jobs || [];
            renderRecentJobs();
        }

        // Initialize charts
        initCharts();

    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

async function loadJobs(filter = 'all') {
    const tbody = document.getElementById('jobs-table');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading...</td></tr>';

    try {
        let statusFilter = '';
        if (filter === 'pending') {
            statusFilter = 'requested,scheduled';
        } else if (filter === 'in_progress') {
            statusFilter = 'in_intake,diagnosed,in_service,testing';
        } else if (filter === 'awaiting_approval') {
            statusFilter = 'awaiting_estimate_approval,awaiting_parts_approval,awaiting_payment';
        } else if (filter === 'completed') {
            statusFilter = 'delivered,closed';
        }

        const url = statusFilter ? `/jobs?status_filter=${statusFilter}&page_size=50` : '/jobs?page_size=50';
        const data = await api.get(url);

        if (data && data.jobs) {
            state.jobs = data.jobs;
            renderJobsTable();
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Failed to load jobs</td></tr>';
    }
}

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

async function loadPayments() {
    // Mock data for payments
    document.getElementById('today-collection').textContent = 'AED 5,420';
    document.getElementById('pending-payments').textContent = '8';
    document.getElementById('month-revenue').textContent = 'AED 124,500';

    const tbody = document.getElementById('payments-table');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No payments yet</td></tr>';
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
        in_intake: { class: 'in-progress', label: 'In Intake' },
        diagnosed: { class: 'in-progress', label: 'Diagnosed' },
        awaiting_estimate_approval: { class: 'awaiting', label: 'Awaiting Approval' },
        estimate_approved: { class: 'completed', label: 'Approved' },
        awaiting_parts_approval: { class: 'awaiting', label: 'Awaiting Parts' },
        awaiting_payment: { class: 'awaiting', label: 'Awaiting Payment' },
        in_service: { class: 'in-progress', label: 'In Service' },
        testing: { class: 'in-progress', label: 'Testing' },
        ready: { class: 'completed', label: 'Ready' },
        delivered: { class: 'completed', label: 'Delivered' },
        closed: { class: 'completed', label: 'Closed' },
        cancelled: { class: 'cancelled', label: 'Cancelled' },
    };

    const config = statusMap[status] || { class: 'pending', label: status };
    return `<span class="status-badge ${config.class}">${config.label}</span>`;
}

// =============================================
// Job Modal
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

        document.getElementById('modal-job-number').textContent = job.job_number;

        body.innerHTML = `
      <div class="job-detail-grid">
        <div class="detail-section">
          <h4>Customer & Vehicle</h4>
          <p><strong>Customer:</strong> ${job.customer_name || '-'}</p>
          <p><strong>Mobile:</strong> ${job.customer_mobile || '-'}</p>
          <p><strong>Vehicle:</strong> ${job.vehicle_plate} - ${job.vehicle_name || ''}</p>
        </div>
        
        <div class="detail-section">
          <h4>Service Details</h4>
          <p><strong>Type:</strong> ${getServiceLabel(job.service_type)}</p>
          <p><strong>Status:</strong> ${getStatusBadge(job.status)}</p>
          <p><strong>Branch:</strong> ${job.branch_name || '-'}</p>
        </div>
        
        <div class="detail-section">
          <h4>Financials</h4>
          <p><strong>Labour:</strong> AED ${job.labour_total?.toFixed(2) || '0.00'}</p>
          <p><strong>Parts:</strong> AED ${job.parts_total?.toFixed(2) || '0.00'}</p>
          <p><strong>Total:</strong> AED ${job.grand_total?.toFixed(2) || '0.00'}</p>
          <p><strong>Paid:</strong> AED ${job.amount_paid?.toFixed(2) || '0.00'}</p>
          <p><strong>Balance:</strong> AED ${job.balance_due?.toFixed(2) || '0.00'}</p>
        </div>
        
        ${job.customer_notes ? `
        <div class="detail-section full-width">
          <h4>Customer Notes</h4>
          <p>${job.customer_notes}</p>
        </div>
        ` : ''}
      </div>
    `;

    } catch (error) {
        body.innerHTML = '<p class="text-error">Failed to load job details</p>';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// =============================================
// New Job
// =============================================
async function openNewJobModal() {
    const modal = document.getElementById('new-job-modal');
    modal.classList.remove('hidden');

    // Load branches
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

        // 1. If it's a new vehicle, register it first
        if (isNewVehicle) {
            const vehicleData = {
                plate_number: document.getElementById('new-v-plate').value,
                make: document.getElementById('new-v-make').value,
                mulkiya_number: document.getElementById('new-v-mulkiya').value,
                year: parseInt(document.getElementById('new-v-year').value) || new Date().getFullYear(),
                mobile: mobile // We'll use this to associate with customer on backend
            };

            if (!vehicleData.plate_number || !vehicleData.make || !vehicleData.mulkiya_number) {
                alert('Please fill all required vehicle fields (Plate, Make, Mulkiya)');
                btn.disabled = false;
                return;
            }

            const newVehicle = await api.post('/admin/vehicles/quick-register', vehicleData);
            vehicleId = newVehicle.id;
        }

        // 2. Create the Job Card
        const data = {
            vehicle_id: vehicleId,
            branch_id: document.getElementById('job-branch').value,
            service_type: document.getElementById('job-service-type').value,
            intake_type: document.getElementById('job-intake-type').value,
            customer_notes: document.getElementById('job-notes').value,
        };

        if (!data.vehicle_id || !data.branch_id || !data.service_type) {
            alert('Please select a vehicle and branch');
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
function initCharts() {
    // Status chart
    const statusCtx = document.getElementById('status-chart');
    if (statusCtx) {
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'In Progress', 'Awaiting Approval', 'Completed'],
                datasets: [{
                    data: [12, 8, 5, 23],
                    backgroundColor: ['#F59E0B', '#3B82F6', '#EC4899', '#10B981'],
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#A8B2D1', padding: 16 },
                    },
                },
            },
        });
    }

    // Revenue chart
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue',
                    data: [4500, 6200, 5800, 7100, 8900, 12400, 15420],
                    borderColor: '#4F5BFF',
                    backgroundColor: 'rgba(79, 91, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
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
                        grid: { color: '#27272A' },
                        ticks: { color: '#6B7394' },
                    },
                    y: {
                        grid: { color: '#27272A' },
                        ticks: { color: '#6B7394' },
                    },
                },
            },
        });
    }
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

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadJobs(tab.dataset.filter);
        });
    });

    // Modal close
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

            // Clear previous data while typing
            nameInput.value = '';
            vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>';

            clearTimeout(lookupTimeout);
            if (mobile.length >= 10) {
                lookupTimeout = setTimeout(async () => {
                    try {
                        const data = await api.get(`/admin/customers/lookup?mobile=${encodeURIComponent(mobile)}`);
                        if (data && data.customer) {
                            nameInput.value = data.customer.full_name;

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
});

// Make viewJob global
window.viewJob = viewJob;
