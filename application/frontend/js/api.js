/**
 * API utility functions for authenticated requests
 */

const API_BASE = 'http://localhost:3000';

/**
 * Get session ID from localStorage
 */
function getSessionId() {
    return localStorage.getItem('sessionId');
}

/**
 * Get user organization
 */
function getUserOrg() {
    return localStorage.getItem('userOrg');
}

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    const sessionId = getSessionId();
    
    if (!sessionId) {
        window.location.href = '/index.html';
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/status`, {
            headers: {
                'X-Session-Id': sessionId
            }
        });

        const data = await response.json();

        if (!data.authenticated) {
            localStorage.clear();
            window.location.href = '/index.html';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.clear();
        window.location.href = '/index.html';
        return false;
    }
}

/**
 * Make an authenticated GET request
 */
async function apiGet(endpoint) {
    const sessionId = getSessionId();
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
            'X-Session-Id': sessionId,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Request failed');
    }

    return await response.json();
}

/**
 * Make an authenticated POST request
 */
async function apiPost(endpoint, body) {
    const sessionId = getSessionId();
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            'X-Session-Id': sessionId,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Request failed');
    }

    return await response.json();
}

/**
 * Logout user
 */
async function logout() {
    const sessionId = getSessionId();
    
    try {
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'X-Session-Id': sessionId
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.clear();
    window.location.href = '/index.html';
}
