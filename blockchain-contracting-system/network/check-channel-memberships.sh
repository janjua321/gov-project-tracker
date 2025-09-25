#!/bin/bash

# Script to check which peers are joined to channel1
set -e

echo "🔍 CHECKING PEER CHANNEL MEMBERSHIPS"
echo "===================================="
echo ""

# Function to check channel membership for a peer
check_peer_channels() {
    local org=$1
    local peer_name=$2
    local peer_port=$3
    local msp_id=$4
    
    echo "📋 Checking $peer_name ($msp_id)..."
    
    # Use timeout to prevent hanging
    timeout 15s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer channel list 2>/dev/null || echo "❌ Failed to connect to $peer_name"
    
    echo ""
}

# Check all peers that should be in channel1 according to configtx.yaml
echo "Checking peers that should be in channel1 (Employer, Engineer, Contractor):"
echo ""

check_peer_channels "employer" "peer0.employer.example.com" "7051" "EmployerMSP"
check_peer_channels "engineer" "peer0.engineer.example.com" "8051" "EngineerMSP" 
check_peer_channels "contractor" "peer0.contractor.example.com" "9051" "ContractorMSP"

echo "🔍 SPECIFIC CHECK: Is channel1 available?"
echo "============================================"
echo ""

# Check if channel1 specifically exists on each peer
for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    
    echo "🎯 Checking if $peer_name has channel1..."
    timeout 15s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer channel getinfo -c channel1 2>/dev/null && echo "✅ $peer_name IS joined to channel1" || echo "❌ $peer_name is NOT joined to channel1"
    echo ""
done

echo "📊 SUMMARY"
echo "=========="
echo "• If peers show 'channel1' in their channel list, they are joined"
echo "• If 'peer channel getinfo -c channel1' succeeds, the peer has channel1"
echo "• If commands timeout or fail, there may be network communication issues"
echo ""
