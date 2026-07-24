#!/bin/bash

# Script to check and join peers to testchannel, then verify chaincode installation
set -e

echo "🔍 PEER MEMBERSHIP AND CHAINCODE STATUS CHECK"
echo "============================================="
echo ""

PACKAGE_ID="project-management_1.0:e849af80a5542fd440c41a2cc76a7f70b8e909e9cadf36c18f748b3effaf771d"

echo "STEP 1: CHECK CURRENT CHANNEL MEMBERSHIP"
echo "========================================"
echo ""

# Function to check if peer is joined to testchannel
check_channel_membership() {
    local org=$1
    local peer_name=$2
    local peer_port=$3
    local msp_id=$4
    
    echo "🔍 Checking $peer_name membership in testchannel..."
    
    # Try to get channel info - if it works, peer is joined
    timeout 10s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer channel list 2>/dev/null | grep -q "testchannel" && echo "  ✅ $peer_name is joined to testchannel" || echo "  ❌ $peer_name is NOT joined to testchannel"
}

# Check all peers
for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    check_channel_membership "$org" "$peer_name" "$peer_port" "$msp_id"
done

echo ""

echo "STEP 2: JOIN PEERS TO TESTCHANNEL (IF NOT ALREADY JOINED)"
echo "========================================================"
echo ""

# Function to join peer to testchannel
join_peer_to_channel() {
    local org=$1
    local peer_name=$2
    local peer_port=$3
    local msp_id=$4
    
    echo "🔗 Attempting to join $peer_name to testchannel..."
    
    # Check if testchannel.block exists
    if [ ! -f "./channel-artifacts/testchannel.block" ]; then
        echo "❌ testchannel.block not found in channel-artifacts/"
        return 1
    fi
    
    timeout 15s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/channel-artifacts:/etc/hyperledger/fabric/channel-artifacts \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer channel join \
        -b /etc/hyperledger/fabric/channel-artifacts/testchannel.block \
        && echo "  ✅ $peer_name successfully joined testchannel" || echo "  ❌ $peer_name failed to join testchannel (may already be joined)"
}

# Try to join all peers (will skip if already joined)
for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    join_peer_to_channel "$org" "$peer_name" "$peer_port" "$msp_id"
done

echo ""

echo "STEP 3: VERIFY CHANNEL MEMBERSHIP AFTER JOIN"
echo "==========================================="
echo ""

for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    check_channel_membership "$org" "$peer_name" "$peer_port" "$msp_id"
done

echo ""

echo "STEP 4: CHECK CHAINCODE INSTALLATION STATUS"
echo "==========================================="
echo ""

# Function to check installed chaincodes
check_chaincode_installation() {
    local org=$1
    local peer_name=$2
    local peer_port=$3
    local msp_id=$4
    
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
        peer lifecycle chaincode queryinstalled --output json 2>/dev/null | \
        jq -r '.installed_chaincodes[] | "  📦 \(.label) - Package ID: \(.package_id)"' || echo "  ❌ Failed to query chaincodes on $peer_name"
    
    # Specifically check for project-management
    echo "🎯 Looking for project-management chaincode:"
    timeout 10s docker run --rm --network network_project-network \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer lifecycle chaincode queryinstalled --output json 2>/dev/null | \
        jq -r '.installed_chaincodes[] | select(.label | contains("project-management")) | "  ✅ project-management found: \(.package_id)"' || echo "  ❌ project-management NOT found on $peer_name"
    
    echo ""
}

# Check chaincode installation on all peers
for org_info in "employer:peer0.employer.example.com:7051:EmployerMSP" "engineer:peer0.engineer.example.com:8051:EngineerMSP" "contractor:peer0.contractor.example.com:9051:ContractorMSP"; do
    IFS=':' read -r org peer_name peer_port msp_id <<< "$org_info"
    check_chaincode_installation "$org" "$peer_name" "$peer_port" "$msp_id"
done

echo "📊 SUMMARY REPORT"
echo "================="
echo ""
echo "Channel Membership Status:"
echo "  - Check if all 3 peers show testchannel in their channel list"
echo ""
echo "Chaincode Installation Status:" 
echo "  - project-management_1.0 should be installed on all peers"
echo "  - Package ID should be: $PACKAGE_ID"
echo ""
echo "Next Steps:"
echo "  - If peers are joined and chaincode is installed → Ready for approval/commit"
echo "  - If missing chaincode → Run installation script"
echo "  - If approval/commit fails → OrdererEndpoints issue (see TIMEOUT_RESOLUTION_SUMMARY.txt)"
echo ""
