# Application Layer Build Guide
## Next Steps: Building the Client Application for Your Fabric Network

---

## 🎯 WHAT YOU'LL BUILD

A complete client application that connects to your blockchain network:

```
┌─────────────────────────────────────────────────┐
│  Frontend (React/HTML)                          │
│  - Create Project Form                          │
│  - Submit Work Package                           │
│  - View Projects Dashboard                      │
└──────────────┬──────────────────────────────────┘
               │ HTTP/REST
               ▼
┌─────────────────────────────────────────────────┐
│  Backend API (Express.js)                       │
│  - POST /api/projects                           │
│  - GET /api/projects/:id                        │
│  - POST /api/workpackages                       │
│  - Authentication & Authorization               │
└──────────────┬──────────────────────────────────┘
               │ Fabric SDK
               ▼
┌─────────────────────────────────────────────────┐
│  Fabric Gateway (fabric-network)                │
│  - Wallet Management                            │
│  - Identity Selection                           │
│  - Transaction Submission                       │
└──────────────┬──────────────────────────────────┘
               │ gRPC/TLS
               ▼
┌─────────────────────────────────────────────────┐
│  YOUR BLOCKCHAIN NETWORK                        │
│  - Peers, Orderer, Chaincode                   │
└─────────────────────────────────────────────────┘
```

---

## 📁 STEP 1: CREATE PROJECT STRUCTURE

```bash
cd /home/janjua/projchain/blockchain-contracting-system

# Create application directories
mkdir -p application/{config,scripts,api,wallet}
mkdir -p application/api/{controllers,routes,middleware}

# Create frontend (optional for now)
# mkdir -p frontend/src/{components,pages,services}
```

**Your final structure:**
```
blockchain-contracting-system/
├── chaincode/              ✅ (Already built)
├── network/                ✅ (Already built)
└── application/            🔨 (Building now)
    ├── config/
    │   ├── connection-employer.json
    │   ├── connection-engineer.json
    │   └── connection-contractor.json
    ├── scripts/
    │   ├── enrollAdmin.js
    │   ├── registerUser.js
    │   └── testConnection.js
    ├── api/
    │   ├── server.js
    │   ├── routes/
    │   ├── controllers/
    │   └── middleware/
    ├── wallet/
    │   └── (identities stored here)
    ├── package.json
    └── .env
```

---

## 📦 STEP 2: INITIALIZE NODE.JS PROJECT

```bash
cd application

# Initialize package.json
npm init -y

# Install Fabric SDK dependencies
npm install fabric-network fabric-ca-client

# Install API dependencies
npm install express cors body-parser dotenv

# Install development dependencies
npm install --save-dev nodemon
```

**Your package.json should look like:**
```json
{
  "name": "gov-project-tracker-app",
  "version": "1.0.0",
  "description": "Application layer for Government Infrastructure Project Tracker",
  "main": "api/server.js",
  "scripts": {
    "start": "node api/server.js",
    "dev": "nodemon api/server.js",
    "enroll": "node scripts/enrollAdmin.js",
    "register": "node scripts/registerUser.js",
    "test-connection": "node scripts/testConnection.js"
  },
  "dependencies": {
    "fabric-network": "^2.5.0",
    "fabric-ca-client": "^2.5.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 🔧 STEP 3: CREATE CONNECTION PROFILE

Create `application/config/connection-employer.json`:

```json
{
  "name": "gov-project-network",
  "version": "1.0.0",
  "client": {
    "organization": "Employer",
    "connection": {
      "timeout": {
        "peer": {
          "endorser": "300"
        },
        "orderer": "300"
      }
    }
  },
  "channels": {
    "directchannel": {
      "orderers": ["orderer.example.com"],
      "peers": {
        "peer0.employer.example.com": {
          "endorsingPeer": true,
          "chaincodeQuery": true,
          "ledgerQuery": true,
          "eventSource": true
        },
        "peer0.engineer.example.com": {
          "endorsingPeer": true,
          "chaincodeQuery": true,
          "ledgerQuery": true,
          "eventSource": true
        },
        "peer0.contractor.example.com": {
          "endorsingPeer": true,
          "chaincodeQuery": true,
          "ledgerQuery": true,
          "eventSource": true
        }
      }
    }
  },
  "organizations": {
    "Employer": {
      "mspid": "EmployerMSP",
      "peers": ["peer0.employer.example.com"],
      "certificateAuthorities": ["ca.employer.example.com"]
    }
  },
  "orderers": {
    "orderer.example.com": {
      "url": "grpcs://localhost:7050",
      "tlsCACerts": {
        "path": "../network/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt"
      },
      "grpcOptions": {
        "ssl-target-name-override": "orderer.example.com"
      }
    }
  },
  "peers": {
    "peer0.employer.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "path": "../network/crypto-config/peerOrganizations/employer.example.com/peers/peer0.employer.example.com/tls/ca.crt"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.employer.example.com",
        "hostnameOverride": "peer0.employer.example.com"
      }
    },
    "peer0.engineer.example.com": {
      "url": "grpcs://localhost:8051",
      "tlsCACerts": {
        "path": "../network/crypto-config/peerOrganizations/engineer.example.com/peers/peer0.engineer.example.com/tls/ca.crt"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.engineer.example.com",
        "hostnameOverride": "peer0.engineer.example.com"
      }
    },
    "peer0.contractor.example.com": {
      "url": "grpcs://localhost:9051",
      "tlsCACerts": {
        "path": "../network/crypto-config/peerOrganizations/contractor.example.com/peers/peer0.contractor.example.com/tls/ca.crt"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.contractor.example.com",
        "hostnameOverride": "peer0.contractor.example.com"
      }
    }
  },
  "certificateAuthorities": {
    "ca.employer.example.com": {
      "url": "https://localhost:7054",
      "caName": "ca.employer.example.com",
      "tlsCACerts": {
        "path": "../network/crypto-config/peerOrganizations/employer.example.com/ca/ca.employer.example.com-cert.pem"
      },
      "httpOptions": {
        "verify": false
      }
    }
  }
}
```

**Repeat for Engineer and Contractor** with different ports and paths.

---

## 🔐 STEP 4: CREATE ENROLLMENT SCRIPT

Create `application/scripts/enrollAdmin.js`:

```javascript
'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollAdmin(orgName, mspId, caPort) {
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'config', `connection-${orgName.toLowerCase()}.json`);
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create CA client
        const caInfo = ccp.certificateAuthorities[`ca.${orgName.toLowerCase()}.example.com`];
        const caTLSCACerts = fs.readFileSync(path.resolve(__dirname, caInfo.tlsCACerts.path), 'utf8');
        const ca = new FabricCAServices(
            caInfo.url,
            { trustedRoots: caTLSCACerts, verify: false },
            caInfo.caName
        );

        // Create wallet
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if admin already enrolled
        const identity = await wallet.get(`admin-${orgName.toLowerCase()}`);
        if (identity) {
            console.log(`✅ Admin identity for ${orgName} already exists in wallet`);
            return;
        }

        // Enroll admin
        console.log(`📝 Enrolling admin for ${orgName}...`);
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        // Create X.509 identity
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspId,
            type: 'X.509',
        };

        // Store in wallet
        await wallet.put(`admin-${orgName.toLowerCase()}`, x509Identity);
        console.log(`✅ Successfully enrolled admin for ${orgName} and imported into wallet`);

    } catch (error) {
        console.error(`❌ Failed to enroll admin for ${orgName}: ${error}`);
        process.exit(1);
    }
}

async function main() {
    // Enroll admins for all organizations
    await enrollAdmin('Employer', 'EmployerMSP', 7054);
    await enrollAdmin('Engineer', 'EngineerMSP', 8054);
    await enrollAdmin('Contractor', 'ContractorMSP', 9054);
    
    console.log('\n🎉 All admin identities enrolled successfully!');
}

main();
```

---

## 👤 STEP 5: CREATE USER REGISTRATION SCRIPT

Create `application/scripts/registerUser.js`:

```javascript
'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function registerUser(orgName, mspId, username, role = 'client') {
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'config', `connection-${orgName.toLowerCase()}.json`);
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create CA client
        const caInfo = ccp.certificateAuthorities[`ca.${orgName.toLowerCase()}.example.com`];
        const caTLSCACerts = fs.readFileSync(path.resolve(__dirname, caInfo.tlsCACerts.path), 'utf8');
        const ca = new FabricCAServices(
            caInfo.url,
            { trustedRoots: caTLSCACerts, verify: false },
            caInfo.caName
        );

        // Load wallet
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if user already exists
        const userIdentity = await wallet.get(username);
        if (userIdentity) {
            console.log(`✅ User ${username} already exists in wallet`);
            return;
        }

        // Get admin identity from wallet
        const adminIdentity = await wallet.get(`admin-${orgName.toLowerCase()}`);
        if (!adminIdentity) {
            console.log(`❌ Admin identity for ${orgName} does not exist. Run enrollAdmin.js first.`);
            return;
        }

        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, `admin-${orgName.toLowerCase()}`);

        // Register the user
        console.log(`📝 Registering user ${username} for ${orgName}...`);
        const secret = await ca.register(
            {
                affiliation: `${orgName.toLowerCase()}.department1`,
                enrollmentID: username,
                role: role,
                attrs: [
                    { name: 'role', value: role, ecert: true },
                    { name: 'org', value: orgName, ecert: true }
                ]
            },
            adminUser
        );

        // Enroll the user
        const enrollment = await ca.enroll({
            enrollmentID: username,
            enrollmentSecret: secret
        });

        // Create X.509 identity
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspId,
            type: 'X.509',
        };

        // Store in wallet
        await wallet.put(username, x509Identity);
        console.log(`✅ Successfully registered and enrolled user ${username} and imported into wallet`);

    } catch (error) {
        console.error(`❌ Failed to register user ${username}: ${error}`);
    }
}

async function main() {
    // Register users for different organizations
    await registerUser('Employer', 'EmployerMSP', 'employerUser1', 'client');
    await registerUser('Engineer', 'EngineerMSP', 'engineerUser1', 'client');
    await registerUser('Contractor', 'ContractorMSP', 'contractorUser1', 'client');
    
    console.log('\n🎉 All users registered successfully!');
}

main();
```

---

## 🧪 STEP 6: CREATE TEST CONNECTION SCRIPT

Create `application/scripts/testConnection.js`:

```javascript
'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function testConnection() {
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'config', 'connection-employer.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Load wallet
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check identity exists
        const identity = await wallet.get('admin-employer');
        if (!identity) {
            console.log('❌ Admin identity not found. Run enrollAdmin.js first.');
            return;
        }

        // Create gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin-employer',
            discovery: { enabled: true, asLocalhost: true }
        });

        console.log('✅ Connected to gateway successfully!');

        // Get network
        const network = await gateway.getNetwork('directchannel');
        console.log('✅ Connected to channel: directchannel');

        // Get contract
        const contract = network.getContract('project-management');
        console.log('✅ Got contract: project-management');

        // Query all projects
        console.log('\n📊 Querying all projects...');
        const result = await contract.evaluateTransaction('queryAllProjects', '', '', '10');
        const projects = JSON.parse(result.toString());
        console.log(`Found ${projects.projects.length} project(s)`);
        console.log(JSON.stringify(projects, null, 2));

        // Disconnect
        gateway.disconnect();
        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.error(`❌ Test failed: ${error}`);
        console.error(error.stack);
    }
}

testConnection();
```

---

## 🌐 STEP 7: CREATE REST API SERVER

Create `application/api/server.js`:

```javascript
'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const projectRoutes = require('./routes/projectRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/projects', projectRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
```

Create `application/api/routes/projectRoutes.js`:

```javascript
'use strict';

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// Project routes
router.post('/', projectController.createProject);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProject);

// Work package routes
router.post('/:id/workpackages', projectController.submitWorkPackage);
router.get('/:id/workpackages', projectController.getWorkPackages);

// Payment routes
router.post('/:id/payments', projectController.approvePayment);
router.get('/:id/payments', projectController.getPayments);

module.exports = router;
```

Create `application/api/controllers/projectController.js`:

```javascript
'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// Helper function to get contract
async function getContract(orgName, username) {
    const ccpPath = path.resolve(__dirname, '..', '..', 'config', `connection-${orgName.toLowerCase()}.json`);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(__dirname, '..', '..', 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: username,
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('directchannel');
    const contract = network.getContract('project-management');

    return { contract, gateway };
}

// Create new project
exports.createProject = async (req, res) => {
    try {
        const { projectId, name, description, totalValue } = req.body;
        const { contract, gateway } = await getContract('Employer', 'admin-employer');

        await contract.submitTransaction(
            'createProject',
            projectId,
            name,
            description,
            totalValue.toString()
        );

        gateway.disconnect();
        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            projectId
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
    try {
        const { contract, gateway } = await getContract('Employer', 'admin-employer');

        const result = await contract.evaluateTransaction('queryAllProjects', '', '', '100');
        const projects = JSON.parse(result.toString());

        gateway.disconnect();
        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get single project
exports.getProject = async (req, res) => {
    try {
        const { contract, gateway } = await getContract('Employer', 'admin-employer');

        const result = await contract.evaluateTransaction('queryProject', req.params.id);
        const project = JSON.parse(result.toString());

        gateway.disconnect();
        res.json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Submit work package
exports.submitWorkPackage = async (req, res) => {
    try {
        const { workPackageId, description, ipfsHash, quantity, value } = req.body;
        const { contract, gateway } = await getContract('Contractor', 'admin-contractor');

        await contract.submitTransaction(
            'submitWorkPackage',
            req.params.id,
            workPackageId,
            description,
            ipfsHash,
            quantity.toString(),
            value.toString()
        );

        gateway.disconnect();
        res.status(201).json({
            success: true,
            message: 'Work package submitted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get work packages
exports.getWorkPackages = async (req, res) => {
    try {
        const { contract, gateway } = await getContract('Contractor', 'admin-contractor');

        const result = await contract.evaluateTransaction('queryWorkPackages', req.params.id);
        const workPackages = JSON.parse(result.toString());

        gateway.disconnect();
        res.json({ success: true, data: workPackages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Approve payment
exports.approvePayment = async (req, res) => {
    try {
        const { workPackageId, approvedAmount, remarks } = req.body;
        const { contract, gateway } = await getContract('Employer', 'admin-employer');

        await contract.submitTransaction(
            'approvePayment',
            req.params.id,
            workPackageId,
            approvedAmount.toString(),
            remarks || ''
        );

        gateway.disconnect();
        res.status(201).json({
            success: true,
            message: 'Payment approved successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get payments
exports.getPayments = async (req, res) => {
    try {
        const { contract, gateway } = await getContract('Employer', 'admin-employer');

        const result = await contract.evaluateTransaction('queryPayments', req.params.id);
        const payments = JSON.parse(result.toString());

        gateway.disconnect();
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
```

---

## ▶️ STEP 8: RUN THE APPLICATION

```bash
cd /home/janjua/projchain/blockchain-contracting-system/application

# 1. Enroll admin identities
npm run enroll

# 2. Register users
npm run register

# 3. Test connection
npm run test-connection

# 4. Start API server
npm run dev
```

**Expected output:**
```
✅ Admin identity for Employer already exists in wallet
✅ Admin identity for Engineer already exists in wallet
✅ Admin identity for Contractor already exists in wallet
🎉 All admin identities enrolled successfully!

🚀 Server running on port 3000
📡 Health check: http://localhost:3000/health
```

---

## 🧪 STEP 9: TEST THE API

**Using curl:**

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Get all projects
curl http://localhost:3000/api/projects

# 3. Create a project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJ_002",
    "name": "Metro Rail Project",
    "description": "Underground metro construction",
    "totalValue": 500000000
  }'

# 4. Get specific project
curl http://localhost:3000/api/projects/PROJ_002

# 5. Submit work package
curl -X POST http://localhost:3000/api/projects/PROJ_002/workpackages \
  -H "Content-Type: application/json" \
  -d '{
    "workPackageId": "WP_001",
    "description": "Foundation work",
    "ipfsHash": "QmXxxx...",
    "quantity": 100,
    "value": 5000000
  }'
```

**Using Postman:**
- Import the endpoints
- Create a collection
- Test each route

---

## 📊 WHAT YOU'LL DEMONSTRATE IN INTERVIEW

After building this, you can say:

✅ "I built a complete 3-tier architecture"  
✅ "The application uses Fabric SDK Gateway pattern"  
✅ "Wallet stores admin and user identities securely"  
✅ "REST API exposes blockchain functions to frontend"  
✅ "Each organization has separate connection profile"  
✅ "Implemented CA enrollment and user registration"  
✅ "API handles MSP-specific operations correctly"

---

## 🚀 NEXT ENHANCEMENTS

1. **Authentication**: Add JWT tokens for API security
2. **Frontend**: Build React dashboard
3. **WebSockets**: Real-time event notifications
4. **Logging**: Winston/Morgan for API logs
5. **Docker**: Containerize the application
6. **IPFS Integration**: Actually upload documents
7. **Unit Tests**: Jest for API testing
8. **Documentation**: Swagger/OpenAPI

---

## ⏱️ TIME TO BUILD

- **Step 1-2:** 10 minutes (setup)
- **Step 3-4:** 20 minutes (config files)
- **Step 5-6:** 30 minutes (enrollment scripts)
- **Step 7:** 40 minutes (API development)
- **Step 8-9:** 20 minutes (testing)

**Total: ~2 hours** to have a working application layer!

---

## 💡 PRO TIP FOR INTERVIEW

If you haven't built this yet but want to discuss it:

**Say:** "I focused on the blockchain infrastructure first because that's the hardest part. The application layer is straightforward - it's a standard Express.js API using the Fabric Node SDK with the Gateway pattern. I studied the reference implementation in fabric-samples and understand the architecture. Given 2 hours, I could build the complete REST API with wallet management and all CRUD operations."

This shows you **understand the architecture** even if you haven't coded it yet!
