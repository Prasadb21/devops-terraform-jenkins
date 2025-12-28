// Configuration
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// State Management
const state = {
    user: null,
    tasks: [],
    categories: [],
    currentView: 'dashboard',
    filters: {},
    socket: null,
    pomodoroTime: 25 * 60,
    pomodoroTimer: null,
    pomodoroRunning: false,
    pomodoroSessions: 0
};

// Utility Functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function isToday(date) {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
}

function isOverdue(date) {
    if (!date) return false;
    return new Date(date) < new Date() && !isToday(date);
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// Authentication
async function login(email, password) {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('token', data.token);
        state.user = data.user;
        showApp();
        showToast('Welcome back!', 'success');
        await loadData();
    } catch (error) {
        // Error already shown in apiRequest
    }
}

async function register(name, email, password) {
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        localStorage.setItem('token', data.token);
        state.user = data.user;
        showApp();
        showToast('Account created successfully!', 'success');
        await loadData();
    } catch (error) {
        // Error already shown in apiRequest
    }
}

function logout() {
    localStorage.removeItem('token');
    state.user = null;
    state.tasks = [];
    state.categories = [];
    if (state.socket) state.socket.disconnect();
    showAuthModal();
    showToast('Logged out successfully', 'success');
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const data = await apiRequest('/auth/me');
            state.user = data.user;
            showApp();
            await loadData();
        } catch (error) {
            logout();
        }
    } else {
        showAuthModal();
    }
}

// Data Loading
async function loadData() {
    await Promise.all([
        loadTasks(),
        loadCategories(),
        loadAnalytics()
    ]);
    initializeSocket();
}

async function loadTasks(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const data = await apiRequest(`/tasks?${params}`);
        state.tasks = data.tasks;
        renderCurrentView();
    } catch (error) {
        // Error already shown
    }
}

async function loadCategories() {
    try {
        const data = await apiRequest('/categories');
        state.categories = data.categories;
        renderCategories();
    } catch (error) {
        // Error already shown
    }
}

async function loadAnalytics() {
    try {
        const data = await apiRequest('/analytics');
        updateDashboardStats(data.analytics);
    } catch (error) {
        // Error already shown
    }
}

// Task Operations
async function createTask(taskData) {
    try {
        const data = await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        state.tasks.push(data.task);
        renderCurrentView();
        showToast('Task created!', 'success');
        closeTaskModal();
    } catch (error) {
        // Error already shown
    }
}

async function updateTask(id, updates) {
    try {
        const data = await apiRequest(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        const index = state.tasks.findIndex(t => t._id === id);
        if (index !== -1) {
            state.tasks[index] = data.task;
        }
        renderCurrentView();
        showToast('Task updated!', 'success');
        closeTaskModal();
    } catch (error) {
        // Error already shown
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
        state.tasks = state.tasks.filter(t => t._id !== id);
        renderCurrentView();
        showToast('Task deleted!', 'success');
    } catch (error) {
        // Error already shown
    }
}

async function toggleTaskComplete(id) {
    const task = state.tasks.find(t => t._id === id);
    if (!task) return;

    const newStatus = task.completed ? 'todo' : 'completed';
    await updateTask(id, { 
        completed: !task.completed,
        status: newStatus,
        completedAt: !task.completed ? new Date() : null
    });
}

// Category Operations
async function createCategory(categoryData) {
    try {
        const data = await apiRequest('/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
        state.categories.push(data.category);
        renderCategories();
        showToast('Category created!', 'success');
        closeCategoryModal();
    } catch (error) {
        // Error already shown
    }
}

// Socket.IO
function initializeSocket() {
    state.socket = io(SOCKET_URL, {
        auth: { token: localStorage.getItem('token') }
    });

    state.socket.on('task-created', (task) => {
        if (task.userId !== state.user._id) {
            state.tasks.push(task);
            renderCurrentView();
            showToast('New task added', 'info');
        }
    });

    state.socket.on('task-updated', (task) => {
        const index = state.tasks.findIndex(t => t._id === task._id);
        if (index !== -1) {
            state.tasks[index] = task;
            renderCurrentView();
        }
    });

    state.socket.on('task-deleted', (taskId) => {
        state.tasks = state.tasks.filter(t => t._id !== taskId);
        renderCurrentView();
    });
}

// Rendering Functions
function renderTask(task) {
    const priorityClass = `priority-${task.priority}`;
    const completedClass = task.completed ? 'completed' : '';

    return `
        <div class="task-card ${completedClass}" data-id="${task._id}">
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-actions">
                    <button class="icon-btn" onclick="toggleTaskComplete('${task._id}')">
                        <i class="fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button class="icon-btn" onclick="editTask('${task._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn" onclick="deleteTask('${task._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span class="priority-badge ${priorityClass}">${task.priority}</span>
                ${task.dueDate ? `<span class="task-date ${isOverdue(task.dueDate) ? 'text-danger' : ''}">
                    <i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}
                </span>` : ''}
                ${task.category ? `<span class="task-category">
                    <i class="fas fa-folder"></i> ${task.category}
                </span>` : ''}
            </div>
        </div>
    `;
}

function renderTasks(tasks, containerId) {
    const container = $(containerId);
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No tasks found</h3>
                <p>Create your first task to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => renderTask(task)).join('');
}

function renderCategories() {
    const container = $('#categoryList');
    const select = $('#taskCategory');

    if (container) {
        container.innerHTML = state.categories.map(cat => `
            <div class="category-item" data-id="${cat._id}">
                <span class="category-dot" style="background: ${cat.color}"></span>
                <span>${cat.icon || '📋'} ${cat.name}</span>
            </div>
        `).join('');
    }

    if (select) {
        select.innerHTML = '<option value="">No Category</option>' +
            state.categories.map(cat => `
                <option value="${cat.name}">${cat.icon || '📋'} ${cat.name}</option>
            `).join('');
    }
}

function updateDashboardStats(analytics) {
    $('#totalTasks').textContent = analytics.total || 0;
    $('#completedTasks').textContent = analytics.completed || 0;
    $('#pendingTasks').textContent = analytics.pending || 0;
    $('#urgentTasks').textContent = analytics.byPriority?.urgent || 0;

    // Update completion rate
    const completionRate = analytics.total > 0 
        ? Math.round((analytics.completed / analytics.total) * 100) 
        : 0;
    $('#completionRate').textContent = completionRate + '%';

    const circle = $('#completionCircle');
    if (circle) {
        const radius = 90;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (completionRate / 100) * circumference;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
    }

    // Render priority chart
    renderPriorityChart(analytics.byPriority);
}

function renderPriorityChart(byPriority) {
    const canvas = $('#priorityChart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');

    if (state.priorityChart) {
        state.priorityChart.destroy();
    }

    state.priorityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Urgent', 'High', 'Medium', 'Low'],
            datasets: [{
                data: [
                    byPriority?.urgent || 0,
                    byPriority?.high || 0,
                    byPriority?.medium || 0,
                    byPriority?.low || 0
                ],
                backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}
