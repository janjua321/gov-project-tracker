#!/bin/bash

# Script to check chaincode installation status on all peers
set -e

echo "🔧 CHECKING CHAINCODE INSTALLATION STATUS"
echo "=========================================="
echo ""

# Function to check installed chaincodes on a peer
check_chaincode_installation() {
    local org=$1
    local peer_name=$2
    local peer_port=$3
    local msp_id=$4
    
    echo "🔍 Checking installed chaincodes on $peer_name ($msp_id)..."
    
    timeout 15s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer lifecycle chaincode queryinstalled --output json 2>/dev/null | \
        jq -r '.installed_chaincodes[] | "  📦 \(.label) - Package ID: \(.package_id)"' || echo "❌ Failed to query installed chaincodes on $peer_name"
    
    echo ""
}

# Function to check committed chaincodes on a channel
check_committed_chaincodes() {
    local channel=$1
    local org=$2
    local peer_name=$3
    local peer_port=$4
    local msp_id=$5
    
    echo "🎯 Checking committed chaincodes on $channel via $peer_name..."
    
    timeout 15s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer lifecycle chaincode querycommitted --channelID $channel 2>/dev/null || echo "❌ Failed to query committed chaincodes on $channel"
    
    echo ""
}

echo "PART 1: INSTALLED CHAINCODES ON EACH PEER"
echo "==========================================="
echo ""

# Check chaincode installation on all relevant peers
for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    check_chaincode_installation "$org" "$peer_name" "$peer_port" "$msp_id"
done

echo "PART 2: COMMITTED CHAINCODES ON CHANNEL1"
echo "========================================="
echo ""

# Try to check committed chaincodes on channel1 from the employer peer
check_committed_chaincodes "channel1" "employer" "peer0.employer.example.com" "7051" "EmployerMSP"

echo "PART 3: CHECK FOR PROJECT-MANAGEMENT CHAINCODE SPECIFICALLY"
echo "==========================================================="
echo ""

echo "🔍 Looking for project-management chaincode on each peer..."
echo ""

for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    
    echo "🎯 Checking $peer_name for project-management chaincode..."
    
    timeout 15s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer lifecycle chaincode queryinstalled --output json 2>/dev/null | \
        jq -r '.installed_chaincodes[] | select(.label | contains("project-management")) | "  ✅ Found: \(.label) - Package ID: \(.package_id)"' || echo "❌ No project-management chaincode found on $peer_name or query failed"
    
    echo ""
done

echo "📊 SUMMARY"
echo "=========="
echo "• Installed chaincodes: Show what chaincode packages are installed on each peer"
echo "• Committed chaincodes: Show what chaincodes are active on channel1" 
echo "• project-management: Our specific chaincode we're trying to deploy"
echo ""
echo "Expected results if everything is working:"
echo "  ✅ project-management_1.0 should be installed on all 3 peers"
echo "  ✅ channel1 should exist and be queryable"
echo "  ✅ Committed chaincodes should show project-management if deployment succeeded"
echo ""
