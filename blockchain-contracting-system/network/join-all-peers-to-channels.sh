#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Joining Peers to Channels ===${NC}"

# Channel1: Employer, Engineer, Contractor (already joined)
echo -e "${GREEN}Channel1 members (Employer, Engineer, Contractor):${NC}"
docker exec peer0.employer.example.com peer channel list
docker exec peer0.engineer.example.com peer channel list
docker exec peer0.contractor.example.com peer channel list

# Channel2: Contractor, SubContractor, Engineer, Designer, Supplier
echo -e "${YELLOW}\n=== Channel2 members should be: Contractor, SubContractor, Engineer, Designer, Supplier ===${NC}"

# Join Designer to channel2
echo -e "${GREEN}Joining Designer to channel2...${NC}"
docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.designer.example.com:7051 \
    -e CORE_PEER_LOCALMSPID=DesignerMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    peer0.designer.example.com \
    peer channel join -b /etc/hyperledger/fabric/channel2.block

# Join SubContractor to channel2
echo -e "${GREEN}Joining SubContractor to channel2...${NC}"
docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.subcontractor.example.com:7051 \
    -e CORE_PEER_LOCALMSPID=SubContractorMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    peer0.subcontractor.example.com \
    peer channel join -b /etc/hyperledger/fabric/channel2.block

# Join Supplier to channel2
echo -e "${GREEN}Joining Supplier to channel2...${NC}"
docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.supplier.example.com:7051 \
    -e CORE_PEER_LOCALMSPID=SupplierMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    peer0.supplier.example.com \
    peer channel join -b /etc/hyperledger/fabric/channel2.block

# Channel3: Employer, MoR, FinConsortia
echo -e "${YELLOW}\n=== Channel3 members should be: Employer, MoR, FinConsortia ===${NC}"

# Join MoR to channel3
echo -e "${GREEN}Joining MoR to channel3...${NC}"
docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.mor.example.com:7051 \
    -e CORE_PEER_LOCALMSPID=MoRMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    peer0.mor.example.com \
    peer channel join -b /etc/hyperledger/fabric/channel3.block

# Join FinConsortia to channel3
echo -e "${GREEN}Joining FinConsortia to channel3...${NC}"
docker exec \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.finconsortia.example.com:7051 \
    -e CORE_PEER_LOCALMSPID=FinConsortiaMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    peer0.finconsortia.example.com \
    peer channel join -b /etc/hyperledger/fabric/channel3.block

echo -e "${GREEN}\n=== Verifying Channel Memberships ===${NC}"
echo -e "${YELLOW}Channel2 peers:${NC}"
docker exec peer0.contractor.example.com peer channel list | grep channel2
docker exec peer0.subcontractor.example.com peer channel list | grep channel2
docker exec peer0.engineer.example.com peer channel list | grep channel2
docker exec peer0.designer.example.com peer channel list | grep channel2
docker exec peer0.supplier.example.com peer channel list | grep channel2

echo -e "${YELLOW}Channel3 peers:${NC}"
docker exec peer0.employer.example.com peer channel list | grep channel3
docker exec peer0.mor.example.com peer channel list | grep channel3
docker exec peer0.finconsortia.example.com peer channel list | grep channel3

echo -e "${GREEN}Done!${NC}"
