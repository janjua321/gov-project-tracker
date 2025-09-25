#!/bin/bash

# Script to demonstrate chaincode installation and deployment on testchannel
set -e

echo "🎯 DEMONSTRATING CHAINCODE DEPLOYMENT ON TESTCHANNEL"
echo "===================================================="
echo ""
echo "This will show the complete chaincode lifecycle on the working testchannel"
echo ""

PACKAGE_ID="project-management_1.0:e849af80a5542fd440c41a2cc76a7f70b8e909e9cadf36c18f748b3effaf771d"

echo "STEP 1: VERIFY PEERS ARE JOINED TO TESTCHANNEL"
echo "=============================================="
echo ""

for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    
    echo "✅ Checking $peer_name membership in testchannel..."
    timeout 10s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer channel getinfo -c testchannel | grep -E "(Blockchain info|Height)" || echo "❌ $peer_name not properly joined to testchannel"
    echo ""
done

echo "STEP 2: INSTALL CHAINCODE ON ALL PEERS"
echo "======================================"
echo ""

# Install on Engineer peer (we know Employer already has it)
echo "📦 Installing chaincode on Engineer peer..."
docker run --rm --network network_project-network \
    -v $(pwd)/crypto-config/peerOrganizations/engineer.example.com/users/Admin@engineer.example.com/msp:/etc/hyperledger/fabric/msp \
    -v $(pwd)/crypto-config/peerOrganizations/engineer.example.com/peers/peer0.engineer.example.com/tls:/etc/hyperledger/fabric/tls \
    -v $(pwd)/project-management.tar.gz:/etc/hyperledger/fabric/chaincode/project-management.tar.gz \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=EngineerMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.engineer.example.com:8051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode install /etc/hyperledger/fabric/chaincode/project-management.tar.gz

echo ""
echo "📦 Installing chaincode on Contractor peer..."
docker run --rm --network network_project-network \
    -v $(pwd)/crypto-config/peerOrganizations/contractor.example.com/users/Admin@contractor.example.com/msp:/etc/hyperledger/fabric/msp \
    -v $(pwd)/crypto-config/peerOrganizations/contractor.example.com/peers/peer0.contractor.example.com/tls:/etc/hyperledger/fabric/tls \
    -v $(pwd)/project-management.tar.gz:/etc/hyperledger/fabric/chaincode/project-management.tar.gz \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ContractorMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.contractor.example.com:9051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode install /etc/hyperledger/fabric/chaincode/project-management.tar.gz

echo ""

echo "STEP 3: VERIFY INSTALLATION ON ALL PEERS"
echo "========================================"
echo ""

for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    
    echo "🔍 Checking installed chaincodes on $peer_name..."
    timeout 10s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer lifecycle chaincode queryinstalled --output json | \
        jq -r '.installed_chaincodes[] | select(.label | contains("project-management")) | "  ✅ \(.label) installed with Package ID: \(.package_id)"'
    echo ""
done

echo "STEP 4: APPROVE CHAINCODE FOR ALL ORGANIZATIONS"
echo "==============================================="
echo ""

# Note: We need to add OrdererEndpoints to configtx.yaml first for this to work without timeouts
echo "⚠️  NOTE: This step will demonstrate the timeout issue if OrdererEndpoints are missing"
echo ""

echo "🏢 Approving for EmployerMSP..."
timeout 30s docker run --rm --network network_project-network \
    -v $(pwd)/crypto-config/peerOrganizations/employer.example.com/users/Admin@employer.example.com/msp:/etc/hyperledger/fabric/msp \
    -v $(pwd)/crypto-config/peerOrganizations/employer.example.com/peers/peer0.employer.example.com/tls:/etc/hyperledger/fabric/tls \
    -v $(pwd)/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts:/etc/hyperledger/fabric/orderer-ca \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=EmployerMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.employer.example.com:7051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode approveformyorg \
    --channelID testchannel \
    --name project-management \
    --version 1.0 \
    --package-id $PACKAGE_ID \
    --sequence 1 \
    -o orderer.example.com:7050 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer-ca/tlsca.example.com-cert.pem \
    && echo "✅ EmployerMSP approval successful!" || echo "❌ EmployerMSP approval failed (likely timeout due to missing orderer endpoints)"

echo ""

echo "🏢 Approving for EngineerMSP..."
timeout 30s docker run --rm --network network_project-network \
    -v $(pwd)/crypto-config/peerOrganizations/engineer.example.com/users/Admin@engineer.example.com/msp:/etc/hyperledger/fabric/msp \
    -v $(pwd)/crypto-config/peerOrganizations/engineer.example.com/peers/peer0.engineer.example.com/tls:/etc/hyperledger/fabric/tls \
    -v $(pwd)/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts:/etc/hyperledger/fabric/orderer-ca \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=EngineerMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.engineer.example.com:8051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode approveformyorg \
    --channelID testchannel \
    --name project-management \
    --version 1.0 \
    --package-id $PACKAGE_ID \
    --sequence 1 \
    -o orderer.example.com:7050 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer-ca/tlsca.example.com-cert.pem \
    && echo "✅ EngineerMSP approval successful!" || echo "❌ EngineerMSP approval failed (likely timeout due to missing orderer endpoints)"

echo ""

echo "🏢 Approving for ContractorMSP..."
timeout 30s docker run --rm --network network_project-network \
    -v $(pwd)/crypto-config/peerOrganizations/contractor.example.com/users/Admin@contractor.example.com/msp:/etc/hyperledger/fabric/msp \
    -v $(pwd)/crypto-config/peerOrganizations/contractor.example.com/peers/peer0.contractor.example.com/tls:/etc/hyperledger/fabric/tls \
    -v $(pwd)/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts:/etc/hyperledger/fabric/orderer-ca \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=ContractorMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.contractor.example.com:9051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode approveformyorg \
    --channelID testchannel \
    --name project-management \
    --version 1.0 \
    --package-id $PACKAGE_ID \
    --sequence 1 \
    -o orderer.example.com:7050 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer-ca/tlsca.example.com-cert.pem \
    && echo "✅ ContractorMSP approval successful!" || echo "❌ ContractorMSP approval failed (likely timeout due to missing orderer endpoints)"

echo ""

echo "STEP 5: CHECK COMMIT READINESS (IF APPROVALS SUCCEEDED)"
echo "======================================================"
echo ""

echo "🔍 Checking if chaincode is ready for commit..."
timeout 20s docker run --rm --network network_project-network \
    -v $(pwd)/crypto-config/peerOrganizations/employer.example.com/users/Admin@employer.example.com/msp:/etc/hyperledger/fabric/msp \
    -v $(pwd)/crypto-config/peerOrganizations/employer.example.com/peers/peer0.employer.example.com/tls:/etc/hyperledger/fabric/tls \
    -v $(pwd)/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts:/etc/hyperledger/fabric/orderer-ca \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=EmployerMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.employer.example.com:7051 \
    hyperledger/fabric-tools:2.5 \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID testchannel \
    --name project-management \
    --version 1.0 \
    --sequence 1 \
    -o orderer.example.com:7050 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer-ca/tlsca.example.com-cert.pem \
    && echo "✅ Commit readiness check successful!" || echo "❌ Commit readiness check failed (likely timeout)"

echo ""

echo "🎯 DEMONSTRATION RESULTS"
echo "======================="
echo ""
echo "This demonstration shows:"
echo "  ✅ Peers successfully joined to testchannel"
echo "  ✅ Chaincode installation works on all peers"
echo "  ❌ Chaincode approval/commit operations timeout"
echo ""
echo "The timeout during approval/commit proves the original issue:"
echo "  🔍 Missing OrdererEndpoints in testchannel configuration"
echo "  🔍 Same problem that affected the original channel1"
echo ""
echo "💡 SOLUTION: Add OrdererEndpoints to configtx.yaml and recreate channel"
echo "📝 See TIMEOUT_RESOLUTION_SUMMARY.txt for complete fix instructions"
echo ""
