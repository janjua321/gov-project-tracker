const { Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const caService = require('./caService');

class FabricService {
    constructor() {
        this.wallet = null;
        this.gateway = null;
        this.network = null;
        this.contract = null;
        this.connectionProfile = null;
        this.isInitialized = false;
        this.currentUser = 'admin';
    }

    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('✅ Fabric service already initialized');
                return this;
            }

            console.log('🚀 Initializing Fabric SDK with proper CA enrollment...');

            // Step 1: Load connection profile
            console.log('📝 Step 1: Loading connection profile...');
            const ccpPath = path.resolve(__dirname, '../config/connection-profiles/connection-employer.json');
            
            if (!fs.existsSync(ccpPath)) {
                throw new Error(`Connection profile not found at: ${ccpPath}`);
            }

            this.connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
            console.log('✅ Connection profile loaded');

            // Step 2: Initialize CA client
            console.log('📝 Step 2: Initializing CA client...');
            await caService.initialize(this.connectionProfile);
            console.log('✅ CA client ready');

            // Step 3: Enroll admin user with CA
            console.log('📝 Step 3: Enrolling admin with Certificate Authority...');
            await caService.enrollAdmin();
            console.log('✅ Admin enrolled via CA');

            // Step 4: Get wallet from CA service
            console.log('📝 Step 4: Getting wallet...');
            this.wallet = caService.getWallet();
            console.log('✅ Wallet ready');

            // Step 5: Create and connect gateway
            console.log('📝 Step 5: Connecting to gateway...');
            this.gateway = new Gateway();
            
            await this.gateway.connect(this.connectionProfile, {
                wallet: this.wallet,
                identity: this.currentUser,
                discovery: { enabled: true, asLocalhost: true }
            });
            console.log('✅ Connected to Fabric gateway');

            // Step 6: Get network channel
            console.log('📝 Step 6: Getting network channel...');
            this.network = await this.gateway.getNetwork('channel1');
            console.log('✅ Connected to channel1');

            // Step 7: Get chaincode contract
            console.log('📝 Step 7: Getting chaincode contract...');
            this.contract = this.network.getContract('project-management');
            console.log('✅ Got contract: project-management');

            this.isInitialized = true;
            console.log('🎉 Fabric SDK initialization complete with proper CA enrollment!');
            
            return this;
        } catch (error) {
            console.error('❌ Failed to initialize Fabric SDK:', error);
            throw error;
        }
    }

    async registerUser(userId = 'appUser') {
        try {
            console.log(`📝 Registering and enrolling user: ${userId}`);
            await caService.registerAndEnrollUser(userId);
            console.log(`✅ User ${userId} registered and enrolled via CA`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to register user: ${error}`);
            throw error;
        }
    }

    async switchUser(userId) {
        try {
            const exists = await caService.identityExists(userId);
            if (!exists) {
                throw new Error(`User ${userId} not found in wallet. Please register first.`);
            }

            // Reconnect gateway with new user
            if (this.gateway) {
                await this.gateway.disconnect();
            }

            this.gateway = new Gateway();
            await this.gateway.connect(this.connectionProfile, {
                wallet: this.wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });

            this.network = await this.gateway.getNetwork('channel1');
            this.contract = this.network.getContract('project-management');
            this.currentUser = userId;

            console.log(`✅ Switched to user: ${userId}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to switch user: ${error}`);
            throw error;
        }
    }

    async invokeChaincode(functionName, ...args) {
        try {
            console.log(`📤 Invoking: ${functionName} with args:`, args);
            
            // Submit transaction (writes to ledger)
            const result = await this.contract.submitTransaction(functionName, ...args);
            
            console.log(`✅ Invoke ${functionName} successful`);
            return { success: true, output: result.toString() };
        } catch (error) {
            console.error(`❌ Failed to invoke ${functionName}:`, error.message);
            throw error;
        }
    }

    async queryChaincode(functionName, ...args) {
        try {
            console.log(`📥 Querying: ${functionName} with args:`, args);
            
            // evaluate transaction (read-only)
            const result = await this.contract.evaluateTransaction(functionName, ...args);
            
            console.log(`✅ Query ${functionName} successful`);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`❌ Failed to query ${functionName}:`, error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.gateway) {
            await this.gateway.disconnect();
            this.isInitialized = false;
            console.log('✅ Disconnected from Fabric network');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async listWalletIdentities() {
        try {
            const identities = await this.wallet.list();
            return identities.map(id => id.label);
        } catch (error) {
            console.error('❌ Failed to list wallet identities:', error);
            throw error;
        }
    }
}

module.exports = new FabricService();
