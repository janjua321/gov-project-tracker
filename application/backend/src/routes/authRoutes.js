const express = require('express');
const router = express.Router();
const fabricService = require('../services/fabricMultiChannelService');
const { createSession, deleteSession } = require('../middleware/authMiddleware');

// Demo user credentials (In production, use a database with hashed passwords)
const USERS = {
    'employer': {
        password: 'employer123',
        organization: 'Employer',
        mspId: 'EmployerMSP'
    },
    'contractor': {
        password: 'contractor123',
        organization: 'Contractor',
        mspId: 'ContractorMSP'
    },
    'engineer': {
        password: 'engineer123',
        organization: 'Engineer',
        mspId: 'EngineerMSP'
    }
};

/**
 * Login endpoint with username/password verification
 * POST /api/auth/login
 * Body: { organization: "Employer", username: "employer", password: "employer123" }
 */
router.post('/login', async (req, res) => {
    try {
        const { organization, username, password } = req.body;
        
        if (!organization || !username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Organization, username, and password are required'
            });
        }

        // Verify credentials
        const user = USERS[username.toLowerCase()];
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Verify organization matches
        if (user.organization !== organization) {
            return res.status(403).json({
                success: false,
                error: `User '${username}' is not authorized as ${organization}`
            });
        }

        // Create admin identity for this organization if not exists
        const adminId = `admin-${user.mspId}`;
        
        // Ensure the identity exists in the wallet
        const identities = await fabricService.listWalletIdentities();
        if (!identities.includes(adminId)) {
            console.log(`📝 Creating identity for ${organization}...`);
            await fabricService.switchOrganization(organization);
        }

        // Create session
        const sessionId = createSession(adminId, organization, user.mspId);

        res.json({
            success: true,
            message: `Successfully logged in as ${username}`,
            sessionId,
            user: {
                username,
                organization,
                mspId: user.mspId,
                role: organization.toLowerCase()
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Login failed'
        });
    }
});

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (sessionId) {
        deleteSession(sessionId);
    }

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * Check session status
 * GET /api/auth/status
 */
router.get('/status', (req, res) => {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (!sessionId) {
        return res.json({
            authenticated: false
        });
    }

    const { getSession } = require('../middleware/authMiddleware');
    const session = getSession(sessionId);

    if (!session) {
        return res.json({
            authenticated: false
        });
    }

    res.json({
        authenticated: true,
        user: {
            organization: session.organization,
            mspId: session.mspId
        }
    });
});

module.exports = router;
