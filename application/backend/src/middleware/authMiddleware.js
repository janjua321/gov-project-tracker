/**
 * Authentication Middleware
 * Extracts user identity from session/token and attaches to request
 */

const sessions = new Map(); // In-memory session storage (use Redis in production)

/**
 * Create a session for a user
 */
function createSession(userId, organization, mspId) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, {
        userId,
        organization,
        mspId,
        createdAt: new Date(),
        lastAccess: new Date()
    });
    return sessionId;
}

/**
 * Get session data
 */
function getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
        session.lastAccess = new Date();
    }
    return session;
}

/**
 * Delete a session
 */
function deleteSession(sessionId) {
    return sessions.delete(sessionId);
}

/**
 * Generate a simple session ID
 */
function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Middleware to extract user from session
 */
function authenticate(req, res, next) {
    // Get session ID from cookie or header
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (!sessionId) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated. Please login first.'
        });
    }

    const session = getSession(sessionId);
    if (!session) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired session. Please login again.'
        });
    }

    // Attach user info to request
    req.user = session;
    next();
}

/**
 * Optional authentication - doesn't fail if no session
 */
function optionalAuth(req, res, next) {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (sessionId) {
        const session = getSession(sessionId);
        if (session) {
            req.user = session;
        }
    }
    
    next();
}

module.exports = {
    authenticate,
    optionalAuth,
    createSession,
    getSession,
    deleteSession,
    sessions
};
