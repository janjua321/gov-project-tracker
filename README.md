# 🇮🇳 Government Project Tracker (Hybrid Blockchain)

A hybrid blockchain system designed for tracking and verifying Indian government infrastructure projects with full transparency and decentralization. This project implements a multi-stakeholder blockchain network using **Hyperledger Fabric** as the core permissioned blockchain, with plans for integration with **Polygon** for public verification and **IPFS** for decentralized document storage.

## 📖 Project Overview

This system models a real-world government infrastructure project involving multiple stakeholders. The blockchain network facilitates secure, transparent, and auditable interactions between all parties involved in large-scale infrastructure projects including highways, bridges, urban development, and other public infrastructure.

### Key Stakeholders

The system models the following organizations as separate blockchain participants:

- **Employer** - Government or private project owner/client
- **Engineer (PMC)** - Project Management Consultant
- **Contractor** - Main construction contractor
- **Designer** - Infrastructure design consultant
- **SubContractor** - Secondary contractors
- **Supplier** - Material and equipment suppliers
- **Ministry of Railways (MoR)** - Government oversight body
- **Financial Consortia** - International funding bodies and financial institutions

### Multi-Channel Architecture

The system implements a sophisticated multi-channel architecture for different stakeholder groups:

- **Channel 1 (C1)**: Primary project channel (Employer, Engineer, Contractor)
- **Channel 2 (C2)**: Contractor consortium channel (Contractor, SubContractor, Engineer, Designer, Supplier)
- **Channel 3 (C3)**: Financial oversight channel (Employer, MoR, FinConsortia)

---

## 🚀 Technologies Used

### Blockchain Layer
- **Hyperledger Fabric 2.5** – Core permissioned blockchain platform
- **Docker & Docker Compose** – Container orchestration for network deployment
- **etcdRaft** – Consensus mechanism for ordering service

### Planned Integrations
- **Polygon (Ethereum)** – For public project verification (hashes, milestones)
- **IPFS** – For decentralized document storage (PDFs, reports, contracts)
- **Node.js / Python** – Backend APIs and service layer
- **React.js** – Admin and public frontend dashboard

### Development Tools
- **Go 1.20+** – For chaincode development
- **Node.js v18/20** – For application development
- **cryptogen** – For generating cryptographic materials
- **configtxgen** – For generating network configuration artifacts

## 🏗️ Project Structure

```
projchain/
├── README.md                           # This comprehensive guide
├── SETUP.md                           # Detailed setup instructions
├── blockchain-contracting-system/     # Core Hyperledger Fabric network
│   ├── network/                       # Network configuration files
│   │   ├── configtx.yaml             # Channel and consortium configuration
│   │   ├── crypto-config.yaml        # Cryptographic material configuration
│   │   ├── docker-compose.yaml       # Container orchestration
│   │   ├── channel-artifacts/         # Generated network artifacts
│   │   │   ├── genesis.block          # Genesis block for ordering service
│   │   │   ├── channel1.tx            # Channel 1 configuration transaction
│   │   │   ├── channel2.tx            # Channel 2 configuration transaction
│   │   │   └── channel3.tx            # Channel 3 configuration transaction
│   │   └── crypto-config/             # Generated cryptographic materials
│   ├── chaincode/                     # Smart contracts (To be implemented)
│   ├── application/                   # Client applications (To be implemented)
│   ├── scripts/                       # Automation scripts (To be implemented)
│   └── docs/                          # Learning materials and documentation
├── backend-api/                       # REST API services (Planned)
├── frontend-api/                      # Web dashboard (Planned)
├── polygon/                           # Polygon integration (Planned)
├── ipfs/                             # IPFS integration (Planned)
└── test/                             # Test files and Fabric samples
```

## 🌐 Network Architecture

### Hyperledger Fabric Network Configuration

#### Organizations and MSPs
Each stakeholder is represented as a separate organization with its own Membership Service Provider (MSP):

| Organization | MSP ID | Domain | Role |
|--------------|--------|---------|------|
| OrdererOrg | OrdererMSP | example.com | Network ordering service |
| Employer | EmployerMSP | employer.example.com | Project client (DFCCIL) |
| Engineer | EngineerMSP | engineer.example.com | Technical consultant (PMC) |
| Contractor | ContractorMSP | contractor.example.com | Main contractor |
| Designer | DesignerMSP | designer.example.com | Design consultant |
| SubContractor | SubContractorMSP | subcontractor.example.com | Secondary contractor |
| Supplier | SupplierMSP | supplier.example.com | Material supplier |
| MoR | MoRMSP | mor.example.com | Ministry oversight |
| FinConsortia | FinConsortiaMSP | finconsortia.example.com | Financial bodies |

#### Channel Configuration
- **Channel1**: Primary project execution channel
  - Participants: Employer, Engineer, Contractor
  - Purpose: Main project coordination and milestone tracking
  
- **Channel2**: Contractor consortium channel
  - Participants: Contractor, SubContractor, Engineer, Designer, Supplier
  - Purpose: Supply chain and sub-contracting coordination
  
- **Channel3**: Financial oversight channel
  - Participants: Employer, MoR, FinConsortia
  - Purpose: Financial monitoring and compliance

#### Consensus and Ordering
- **Ordering Service**: etcdRaft consensus mechanism
- **Batch Configuration**: 
  - Timeout: 2 seconds
  - Max messages: 10 per batch
  - Max bytes: 99 MB absolute, 512 KB preferred

## 🚀 Getting Started

### Prerequisites

Before setting up the project, ensure you have the following installed:

- **WSL2** with Ubuntu 20.04 or 22.04 (for Windows users)
- **Docker** and **Docker Compose**
- **Go** 1.20 or higher
- **Node.js** v18 or v20
- **Git**

Detailed installation instructions are available in [`SETUP.md`](SETUP.md).

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd projchain
   ```

2. **Navigate to the network directory:**
   ```bash
   cd blockchain-contracting-system/network
   ```

3. **Set up Hyperledger Fabric tools:**
   ```bash
   # Add Fabric binaries to PATH (temporary)
   export PATH=${PWD}/../../test/fabric-samples/bin:$PATH
   export FABRIC_CFG_PATH=${PWD}
   ```

4. **Generate cryptographic materials:**
   ```bash
   cryptogen generate --config=./crypto-config.yaml --output="crypto-config"
   ```

5. **Create channel artifacts:**
   ```bash
   mkdir -p channel-artifacts
   
   # Generate genesis block
   configtxgen -profile ProjectGenesis -outputBlock ./channel-artifacts/genesis.block -channelID system-channel
   
   # Generate channel configuration transactions
   configtxgen -profile Channel1 -outputCreateChannelTx ./channel-artifacts/channel1.tx -channelID channel1
   configtxgen -profile Channel2 -outputCreateChannelTx ./channel-artifacts/channel2.tx -channelID channel2
   configtxgen -profile Channel3 -outputCreateChannelTx ./channel-artifacts/channel3.tx -channelID channel3
   ```

6. **Start the network:**
   ```bash
   docker-compose up -d
   ```

7. **Verify the network is running:**
   ```bash
   docker ps
   ```

### Network Operations

#### Stopping the Network
```bash
docker-compose down
```

#### Cleaning Up (Remove all containers and volumes)
```bash
docker-compose down --volumes --remove-orphans
docker system prune -f
```

## 🔧 Development Status

### ✅ Completed
- [x] Multi-organization network configuration
- [x] Three-channel architecture implementation
- [x] Cryptographic material generation
- [x] Docker container orchestration
- [x] Network deployment scripts
- [x] Basic documentation and learning materials

### 🚧 In Progress
- [ ] Smart contract (chaincode) development
- [ ] Client application development
- [ ] Channel creation and peer joining automation
- [ ] Network monitoring and logging

### 📋 Planned Features
- [ ] REST API backend services
- [ ] Web-based dashboard frontend
- [ ] Polygon blockchain integration for public verification
- [ ] IPFS integration for document storage
- [ ] Automated testing suite
- [ ] CI/CD pipeline
- [ ] Production deployment configurations

## 🤝 Stakeholder Workflows

### Project Initialization (Channel 1)
1. **Employer** creates project proposal and milestones
2. **Engineer** reviews and validates technical specifications
3. **Contractor** submits bids and project plans
4. All parties endorse project initiation

### Supply Chain Management (Channel 2)
1. **Contractor** creates procurement requests
2. **Designer** provides detailed specifications
3. **Supplier** submits quotations and delivery schedules
4. **SubContractor** coordinates specialized work packages

### Financial Oversight (Channel 3)
1. **FinConsortia** tracks fund disbursements
2. **MoR** monitors compliance and project progress
3. **Employer** submits progress reports and payment requests
4. Automated milestone-based payment releases

## 📚 Learning Resources

The project includes comprehensive learning materials in the `docs/` directory:

- **learning-I.txt**: Basic Hyperledger Fabric operations and asset management
- **learning-II.txt**: Network setup procedures and configuration steps

## 🔐 Security Features

- **Multi-signature endorsement policies** for critical transactions
- **TLS encryption** for all peer-to-peer communications
- **Certificate-based authentication** using X.509 certificates
- **Role-based access control** through MSP configurations
- **Channel-level data isolation** for sensitive information

## 🌟 Future Enhancements

1. **Smart Contract Development**
   - Project milestone tracking
   - Automated payment releases
   - Supply chain verification
   - Document hash verification

2. **Integration Layer**
   - Polygon smart contracts for public verification
   - IPFS integration for document storage
   - RESTful APIs for external system integration

3. **User Interface**
   - Web dashboard for project monitoring
   - Mobile application for field updates
   - Real-time notification system

4. **Analytics and Reporting**
   - Project progress analytics
   - Financial tracking and reporting
   - Compliance monitoring dashboards

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of a government infrastructure tracking initiative. License terms to be determined.

## 📞 Support

For questions, issues, or contributions, please refer to the project documentation or contact the development team.

---

*Last updated: August 10, 2025*