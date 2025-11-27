require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fabricService = require('./src/services/fabricMultiChannelService');
const authRoutes = require('./src/routes/authRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const historyRoutes = require('./src/routes/historyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Government Project Tracker API is running (Multi-Channel)',
        channels: fabricService.getAvailableChannels(),
        currentUser: fabricService.getCurrentUser(),
        timestamp: new Date().toISOString()
    });
});

// Switch organization endpoint
app.post('/api/switch-org', async (req, res) => {
    try {
        const { organization } = req.body;
        
        if (!organization) {
            return res.status(400).json({
                success: false,
                message: 'Organization name is required (Employer, Contractor, Engineer)'
            });
        }

        await fabricService.switchOrganization(organization);
        
        res.json({
            success: true,
            message: `Switched to ${organization} organization`,
            organization: organization
        });
    } catch (error) {
        console.error('❌ Failed to switch organization:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to switch organization'
        });
    }
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Initialize Fabric connection
async function initializeFabric() {
    try {
        console.log('🚀 Initializing Multi-Channel Fabric connection with CA enrollment...');
        await fabricService.initialize();
        
        // Register an application user
        console.log('👤 Registering application user...');
        await fabricService.registerUser('appUser');
        
        console.log('✅ Fabric service ready with proper CA enrollment');
        console.log(`📋 Current user: ${fabricService.getCurrentUser()}`);
        console.log(`🔗 Available channels: ${fabricService.getAvailableChannels().join(', ')}`);
    } catch (error) {
        console.error('❌ Failed to initialize Fabric service:', error);
        process.exit(1);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`\n🌐 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📝 Projects API: http://localhost:${PORT}/api/projects`);
    console.log(`📜 History API: http://localhost:${PORT}/api/history`);
    console.log(`\n📚 History Endpoints:`);
    console.log(`   - /api/history/project/:projectId       (Channel 1)`);
    console.log(`   - /api/history/supply/:projectId        (Channel 2)`);
    console.log(`   - /api/history/financial/:projectId     (Channel 3)`);
    console.log(`   - /api/history/complete/:projectId      (All Channels)`);
    console.log(`   - /api/history/timeline/:projectId      (Chronological)\n`);
    await initializeFabric();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await fabricService.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await fabricService.disconnect();
    process.exit(0);
});
