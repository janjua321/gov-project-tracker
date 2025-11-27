const { Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const caService = require('./caService');

class FabricService {
    constructor() {
        this.wallet = null;
        this.gateway = null;
        this.networks = {}; // Store multiple channel networks
        this.contracts = {}; // Store contracts per channel
        this.connectionProfile = null;
        this.isInitialized = false;
        this.currentUser = 'admin';
        this.currentChannel = 'channel1'; // Default channel
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

            // Step 6: Initialize Channel 1 (Project Management)
            console.log('📝 Step 6: Initializing Channel 1 (Project Management)...');
            await this.connectToChannel('channel1', 'project-management');
            console.log('✅ Channel 1 ready');

            this.isInitialized = true;
            console.log('🎉 Fabric SDK initialization complete with proper CA enrollment!');
            console.log('📋 Connected Channels:', Object.keys(this.networks));
            
            return this;
        } catch (error) {
            console.error('❌ Failed to initialize Fabric SDK:', error);
            throw error;
        }
    }

    /**
     * Connect to a specific channel and get its contract
     * @param {string} channelName - Name of the channel (channel1, channel2, channel3)
     * @param {string} chaincodeName - Name of the chaincode contract
     */
    async connectToChannel(channelName, chaincodeName) {
        try {
            console.log(`📡 Connecting to ${channelName}...`);

            // Get network for the channel
            const network = await this.gateway.getNetwork(channelName);
            this.networks[channelName] = network;
            console.log(`✅ Connected to ${channelName}`);

            // Get contract if chaincode name provided
            if (chaincodeName) {
                const contract = network.getContract(chaincodeName);
                this.contracts[channelName] = contract;
                console.log(`✅ Got contract '${chaincodeName}' on ${channelName}`);
            }

            return { network, contract: this.contracts[channelName] };
        } catch (error) {
            console.error(`❌ Failed to connect to ${channelName}:`, error);
            throw error;
        }
    }

    /**
     * Switch to a different channel
     * @param {string} channelName - Channel to switch to
     */
    async switchChannel(channelName) {
        try {
            if (!this.networks[channelName]) {
                throw new Error(`Channel ${channelName} not connected. Call connectToChannel() first.`);
            }
            
            this.currentChannel = channelName;
            console.log(`✅ Switched to ${channelName}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to switch channel:`, error);
            throw error;
        }
    }

    /**
     * Get the current active network
     */
    getNetwork(channelName = null) {
        const channel = channelName || this.currentChannel;
        return this.networks[channel];
    }

    /**
     * Get the current active contract
     */
    getContract(channelName = null) {
        const channel = channelName || this.currentChannel;
        return this.contracts[channel];
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

            // Reconnect to all previously connected channels
            const channelNames = Object.keys(this.networks);
            this.networks = {};
            this.contracts = {};
            
            for (const channelName of channelNames) {
                // Reconnect to the network
                const network = await this.gateway.getNetwork(channelName);
                this.networks[channelName] = network;
            }

            this.currentUser = userId;

            console.log(`✅ Switched to user: ${userId}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to switch user: ${error}`);
            throw error;
        }
    }

    async invokeChaincode(functionName, channelName = null, ...args) {
        try {
            const contract = this.getContract(channelName);
            if (!contract) {
                const channel = channelName || this.currentChannel;
                throw new Error(`No contract available for channel ${channel}`);
            }

            const channel = channelName || this.currentChannel;
            console.log(`📤 Invoking: ${functionName} on ${channel} with args:`, args);
            
            // Submit transaction (writes to ledger)
            const result = await contract.submitTransaction(functionName, ...args);
            
            console.log(`✅ Invoke ${functionName} successful`);
            return { success: true, output: result.toString() };
        } catch (error) {
            console.error(`❌ Failed to invoke ${functionName}:`, error.message);
            throw error;
        }
    }

    async queryChaincode(functionName, channelName = null, ...args) {
        try {
            const contract = this.getContract(channelName);
            if (!contract) {
                const channel = channelName || this.currentChannel;
                throw new Error(`No contract available for channel ${channel}`);
            }

            const channel = channelName || this.currentChannel;
            console.log(`📥 Querying: ${functionName} on ${channel} with args:`, args);
            
            // Evaluate transaction (read-only)
            const result = await contract.evaluateTransaction(functionName, ...args);
            const resultString = result.toString();
            
            console.log(`✅ Query ${functionName} successful`);
            console.log(`📄 Result length: ${resultString.length} bytes`);
            
            // Try to parse JSON
            try {
                return JSON.parse(resultString);
            } catch (parseError) {
                console.error(`❌ Failed to parse response as JSON:`, resultString.substring(0, 200));
                throw new Error(`Invalid JSON response from chaincode: ${parseError.message}`);
            }
        } catch (error) {
            console.error(`❌ Failed to query ${functionName}:`, error.message);
            throw error;
        }
    }

    /**
     * Switch to a different organization identity
     * @param {string} orgName - Organization name (Employer, Contractor, Engineer)
     */
    async switchOrganization(orgName) {
        try {
            console.log(`🔄 Switching to ${orgName} organization...`);
            
            // Map org names to MSP IDs and peer info
            const orgMap = {
                'Employer': { 
                    mspId: 'EmployerMSP',
                    peer: 'peer0.employer.example.com'
                },
                'Contractor': { 
                    mspId: 'ContractorMSP',
                    peer: 'peer0.contractor.example.com'
                },
                'Engineer': { 
                    mspId: 'EngineerMSP',
                    peer: 'peer0.engineer.example.com'
                }
            };

            if (!orgMap[orgName]) {
                throw new Error(`Unknown organization: ${orgName}`);
            }

            const org = orgMap[orgName];
            
            // Check if we already have an identity for this org in the wallet
            const orgAdminId = `admin-${org.mspId}`;
            let identity = await this.wallet.get(orgAdminId);
            
            if (!identity) {
                // Create a new identity for this org using the crypto-config materials
                console.log(`📝 Loading identity for ${org.mspId} from crypto-config...`);
                
                const fs = require('fs');
                const path = require('path');
                
                // Determine org name from MSP
                const orgNameLower = org.mspId.replace('MSP', '').toLowerCase();
                const cryptoPath = path.resolve(__dirname, '../../../../blockchain-contracting-system/network/crypto-config');
                
                // Load admin cert and key
                const certPath = path.join(cryptoPath, `peerOrganizations/${orgNameLower}.example.com/users/Admin@${orgNameLower}.example.com/msp/signcerts/Admin@${orgNameLower}.example.com-cert.pem`);
                const keyPath = path.join(cryptoPath, `peerOrganizations/${orgNameLower}.example.com/users/Admin@${orgNameLower}.example.com/msp/keystore`);
                
                if (!fs.existsSync(certPath)) {
                    throw new Error(`Admin cert not found at: ${certPath}`);
                }
                
                const certificate = fs.readFileSync(certPath, 'utf8');
                
                // Get the private key (first file in keystore directory)
                const keyFiles = fs.readdirSync(keyPath);
                if (keyFiles.length === 0) {
                    throw new Error(`No private key found in: ${keyPath}`);
                }
                const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');
                
                // Create identity
                identity = {
                    credentials: {
                        certificate: certificate,
                        privateKey: privateKey,
                    },
                    mspId: org.mspId,
                    type: 'X.509',
                };
                
                // Store in wallet
                await this.wallet.put(orgAdminId, identity);
                console.log(`✅ ${org.mspId} admin identity loaded and stored in wallet`);
            }
            
            // Disconnect current gateway
            if (this.gateway) {
                await this.gateway.disconnect();
                console.log('✅ Disconnected from current gateway');
            }
            
            // Reconnect gateway with new identity
            this.gateway = new Gateway();
            await this.gateway.connect(this.connectionProfile, {
                wallet: this.wallet,
                identity: orgAdminId,
                discovery: { 
                    enabled: true, 
                    asLocalhost: true
                },
                eventHandlerOptions: {
                    commitTimeout: 300,
                    endorseTimeout: 30
                }
            });
            
            console.log(`✅ Gateway reconnected with ${orgName} identity`);
            
            // Reconnect to channels
            await this.connectToChannel('channel1', 'project-management');
            
            console.log(`✅ Switched to ${orgName} (${org.mspId})`);
            return this;
        } catch (error) {
            console.error(`❌ Failed to switch organization:`, error);
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

    getCurrentChannel() {
        return this.currentChannel;
    }

    getAvailableChannels() {
        return Object.keys(this.networks);
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
