const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

class CAService {
    constructor() {
        this.caClient = null;
        this.wallet = null;
        this.adminUserId = 'admin';
        this.adminPassword = 'adminpw';
        this.mspId = 'EmployerMSP';
        this.caName = 'ca.employer.example.com'; // Use the CA container name
    }

    /**
     * Initialize the CA client and wallet
     */
    async initialize(connectionProfile, orgName = 'employer') {
        try {
            console.log('🔐 Initializing Certificate Authority client...');

            // Create wallet (only once)
            if (!this.wallet) {
                const walletPath = path.join(__dirname, '../config/wallet');
                this.wallet = await Wallets.newFileSystemWallet(walletPath);
                console.log(`📁 Wallet path: ${walletPath}`);
            }

            // Determine which CA to use based on current MSP
            const caMapping = {
                'EmployerMSP': 'ca.employer.example.com',
                'ContractorMSP': 'ca.contractor.example.com',
                'EngineerMSP': 'ca.engineer.example.com'
            };
            
            const caKey = caMapping[this.mspId] || 'ca.employer.example.com';
            
            // Get CA info from connection profile
            const caInfo = connectionProfile.certificateAuthorities[caKey] || connectionProfile.certificateAuthorities['ca.employer.example.com'];
            
            // Resolve the CA TLS cert path based on MSP
            const orgNameLower = this.mspId.replace('MSP', '').toLowerCase();
            let caTLSCACertsPath = path.resolve(__dirname, `../../../../blockchain-contracting-system/network/crypto-config/peerOrganizations/${orgNameLower}.example.com/ca/ca.${orgNameLower}.example.com-cert.pem`);
            
            if (!fs.existsSync(caTLSCACertsPath)) {
                // Fallback to employer
                caTLSCACertsPath = path.resolve(__dirname, '../../../../blockchain-contracting-system/network/crypto-config/peerOrganizations/employer.example.com/ca/ca.employer.example.com-cert.pem');
            }
            
            if (!fs.existsSync(caTLSCACertsPath)) {
                throw new Error(`CA TLS cert not found at: ${caTLSCACertsPath}`);
            }

            const caTLSCACerts = fs.readFileSync(caTLSCACertsPath, 'utf8');
            console.log(`✅ CA TLS cert loaded from: ${caTLSCACertsPath}`);

            // Create CA client
            this.caClient = new FabricCAServices(
                caInfo.url,
                { 
                    trustedRoots: caTLSCACerts, 
                    verify: false 
                },
                this.caName
            );

            console.log('✅ CA client initialized');
            return this;
        } catch (error) {
            console.error('❌ Failed to initialize CA client:', error);
            throw error;
        }
    }

    /**
     * Enroll the admin user with the CA
     * TRUE Fabric SDK implementation - uses CA enrollment only
     */
    async enrollAdmin() {
        try {
            console.log('👤 Enrolling admin user via Certificate Authority...');

            // Check if admin already enrolled for this MSP
            const adminId = `${this.adminUserId}-${this.mspId}`;
            const adminIdentity = await this.wallet.get(adminId);
            if (adminIdentity) {
                console.log(`✅ Admin identity already exists in wallet for ${this.mspId}`);
                // Update the default admin reference
                await this.wallet.put(this.adminUserId, adminIdentity);
                return adminIdentity;
            }
            
            // Check if default admin exists
            const defaultAdminIdentity = await this.wallet.get(this.adminUserId);
            if (defaultAdminIdentity && defaultAdminIdentity.mspId === this.mspId) {
                console.log('✅ Admin identity already exists in wallet');
                return adminIdentity;
            }

            // Enroll admin with CA
            console.log(`📝 Enrolling admin (${this.adminUserId}) with CA...`);
            const enrollment = await this.caClient.enroll({
                enrollmentID: this.adminUserId,
                enrollmentSecret: this.adminPassword
            });

            console.log('✅ Admin enrolled successfully via CA');

            // Create identity object
            const identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: this.mspId,
                type: 'X.509',
            };

            // Store in wallet
            await this.wallet.put(this.adminUserId, identity);
            console.log('✅ Admin identity stored in wallet');

            return identity;
        } catch (error) {
            console.error('❌ Failed to enroll admin:', error);
            throw error;
        }
    }

    /**
     * Register and enroll a new user with the CA
     */
    async registerAndEnrollUser(userId, affiliation = 'org1.department1') {
        try {
            console.log(`👤 Registering and enrolling user: ${userId}`);

            // Check if user already exists in wallet
            const userIdentity = await this.wallet.get(userId);
            if (userIdentity) {
                console.log(`✅ User ${userId} already exists in wallet`);
                return userIdentity;
            }

            // Get admin identity to register new user
            const adminIdentity = await this.wallet.get(this.adminUserId);
            if (!adminIdentity) {
                throw new Error('Admin identity not found in wallet. Please enroll admin first.');
            }

            // Build user object for authenticating with the CA
            const provider = this.wallet.getProviderRegistry().getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, this.adminUserId);

            // Register the user with the CA
            console.log(`📝 Registering user ${userId} with CA...`);
            const secret = await this.caClient.register(
                {
                    affiliation: affiliation,
                    enrollmentID: userId,
                    role: 'client',
                    attrs: [
                        { name: 'role', value: 'appUser', ecert: true }
                    ]
                },
                adminUser
            );

            console.log(`✅ User ${userId} registered with CA`);

            // Enroll the user
            console.log(`📝 Enrolling user ${userId}...`);
            const enrollment = await this.caClient.enroll({
                enrollmentID: userId,
                enrollmentSecret: secret
            });

            console.log(`✅ User ${userId} enrolled successfully via CA`);

            // Create identity object
            const identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: this.mspId,
                type: 'X.509',
            };

            // Store in wallet
            await this.wallet.put(userId, identity);
            console.log(`✅ User ${userId} identity stored in wallet`);

            return identity;
        } catch (error) {
            console.error(`❌ Failed to register/enroll user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get the wallet instance
     */
    getWallet() {
        return this.wallet;
    }

    /**
     * Check if an identity exists in the wallet
     */
    async identityExists(userId) {
        const identity = await this.wallet.get(userId);
        return !!identity;
    }
}

module.exports = new CAService();
