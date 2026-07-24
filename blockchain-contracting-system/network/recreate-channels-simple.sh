#!/bin/bash

# Simple script to recreate channels based on configtx.yaml profiles
# Uses docker run with fabric-tools instead of CLI container

set -e

CONFIGTXGEN=/home/janjua/projchain/test/fabric-samples/bin/configtxgen
NETWORK_NAME="network_project-network"

echo "==========================================="
echo "Channel Recreation Script"
echo "==========================================="
echo ""

echo "Step 1: Stopping the network..."
docker-compose down

echo ""
echo "Step 2: Removing old channel artifacts..."
rm -f channel1.block channel2.block channel3.block
rm -f channel-artifacts/*.block

echo ""
echo "Step 3: Generating channel configuration blocks..."

echo "  - Generating channel1 block (Employer, Engineer, Contractor)..."
$CONFIGTXGEN -profile Channel1Profile -outputBlock ./channel-artifacts/channel1.block -channelID channel1

echo "  - Generating channel2 block (Contractor, SubContractor, Engineer, Designer, Supplier)..."
$CONFIGTXGEN -profile Channel2Profile -outputBlock ./channel-artifacts/channel2.block -channelID channel2

echo "  - Generating channel3 block (Employer, MoR, FinConsortia)..."
$CONFIGTXGEN -profile Channel3Profile -outputBlock ./channel-artifacts/channel3.block -channelID channel3

echo ""
echo "Step 4: Starting the network..."
docker-compose up -d

echo "  - Waiting for containers to start..."
sleep 15

echo ""
echo "Step 5: Creating channels on orderer..."

# Create channels using osnadmin (modern Fabric 2.x approach)
echo "  - Creating channel1 on orderer..."
docker exec orderer.example.com osnadmin channel join \
    --channelID channel1 \
    --config-block /var/hyperledger/orderer/channel-artifacts/channel1.block \
    -o localhost:7053 \
    --ca-file /var/hyperledger/orderer/tls/ca.crt \
    --client-cert /var/hyperledger/orderer/tls/server.crt \
    --client-key /var/hyperledger/orderer/tls/server.key 2>&1 || echo "Channel1 may already exist"

echo "  - Creating channel2 on orderer..."
docker exec orderer.example.com osnadmin channel join \
    --channelID channel2 \
    --config-block /var/hyperledger/orderer/channel-artifacts/channel2.block \
    -o localhost:7053 \
    --ca-file /var/hyperledger/orderer/tls/ca.crt \
    --client-cert /var/hyperledger/orderer/tls/server.crt \
    --client-key /var/hyperledger/orderer/tls/server.key 2>&1 || echo "Channel2 may already exist"

echo "  - Creating channel3 on orderer..."
docker exec orderer.example.com osnadmin channel join \
    --channelID channel3 \
    --config-block /var/hyperledger/orderer/channel-artifacts/channel3.block \
    -o localhost:7053 \
    --ca-file /var/hyperledger/orderer/tls/ca.crt \
    --client-cert /var/hyperledger/orderer/tls/server.crt \
    --client-key /var/hyperledger/orderer/tls/server.key 2>&1 || echo "Channel3 may already exist"

sleep 5

echo ""
echo "Step 6: Joining peers to their respective channels..."

# Function to join peer to channel
join_peer() {
    local org=$1
    local peer_name=$2
    local peer_port=$3
    local msp_id=$4
    local channel=$5
    
    echo "  - Joining $peer_name to $channel..."
    
    docker run --rm --network $NETWORK_NAME \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/users/Admin@${org}.example.com/msp:/etc/hyperledger/fabric/msp \
        -v $(pwd)/channel-artifacts:/etc/hyperledger/fabric/channel-artifacts \
        -v $(pwd)/crypto-config/peerOrganizations/${org}.example.com/peers/${peer_name}/tls:/etc/hyperledger/fabric/tls \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_LOCALMSPID=$msp_id \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
        -e CORE_PEER_ADDRESS=${peer_name}:${peer_port} \
        hyperledger/fabric-tools:2.5 \
        peer channel join -b /etc/hyperledger/fabric/channel-artifacts/${channel}.block 2>&1 || echo "    (May already be joined)"
}

# Channel 1: Employer, Engineer, Contractor
echo ""
echo "Channel 1 (Employer, Engineer, Contractor):"
join_peer "employer" "peer0.employer.example.com" "7051" "EmployerMSP" "channel1"
join_peer "engineer" "peer0.engineer.example.com" "8051" "EngineerMSP" "channel1"
join_peer "contractor" "peer0.contractor.example.com" "9051" "ContractorMSP" "channel1"

# Channel 2: Contractor, SubContractor, Engineer, Designer, Supplier
echo ""
echo "Channel 2 (Contractor, SubContractor, Engineer, Designer, Supplier):"
join_peer "contractor" "peer0.contractor.example.com" "9051" "ContractorMSP" "channel2"
join_peer "subcontractor" "peer0.subcontractor.example.com" "11051" "SubContractorMSP" "channel2"
join_peer "engineer" "peer0.engineer.example.com" "8051" "EngineerMSP" "channel2"
join_peer "designer" "peer0.designer.example.com" "10051" "DesignerMSP" "channel2"
join_peer "supplier" "peer0.supplier.example.com" "12051" "SupplierMSP" "channel2"

# Channel 3: Employer, MoR, FinConsortia
echo ""
echo "Channel 3 (Employer, MoR, FinConsortia):"
join_peer "employer" "peer0.employer.example.com" "7051" "EmployerMSP" "channel3"
join_peer "mor" "peer0.mor.example.com" "13051" "MoRMSP" "channel3"
join_peer "finconsortia" "peer0.finconsortia.example.com" "14051" "FinConsortiaMSP" "channel3"

echo ""
echo "==========================================="
echo "✅ Channel recreation complete!"
echo "==========================================="
echo ""
echo "Summary:"
echo "  • Channel1: Employer, Engineer, Contractor"
echo "  • Channel2: Contractor, SubContractor, Engineer, Designer, Supplier"
echo "  • Channel3: Employer, MoR, FinConsortia"
echo ""
echo "Next steps:"
echo "  1. Verify channel memberships: ./scripts/check-channel-memberships.sh"
echo "  2. Update anchor peers if needed"
echo "  3. Deploy chaincode to appropriate channels"
echo ""
