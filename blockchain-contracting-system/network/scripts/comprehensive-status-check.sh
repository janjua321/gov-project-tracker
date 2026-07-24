#!/bin/bash

# Comprehensive network status check script
set -e

echo "🌐 COMPREHENSIVE NETWORK STATUS CHECK"
echo "====================================="
echo ""
echo "This script will check:"
echo "  1. Container status"
echo "  2. Channel memberships"
echo "  3. Chaincode installation status"
echo "  4. Network connectivity"
echo ""

echo "STEP 1: CONTAINER STATUS"
echo "========================"
echo ""

echo "🐳 Checking Docker containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(orderer|peer0\.(employer|engineer|contractor))" || echo "❌ No matching containers found"
echo ""

echo "STEP 2: BASIC NETWORK CONNECTIVITY"
echo "=================================="
echo ""

echo "🔗 Testing basic connectivity from fabric-tools container..."
timeout 10s docker run --rm --network network_project-network \
    hyperledger/fabric-tools:2.5 \
    sh -c "
        echo '🎯 Testing orderer connectivity:'
        nc -z orderer.example.com 7050 && echo '  ✅ orderer.example.com:7050 accessible' || echo '  ❌ orderer.example.com:7050 NOT accessible'
        
        echo '🎯 Testing peer connectivity:'
        nc -z peer0.employer.example.com 7051 && echo '  ✅ peer0.employer.example.com:7051 accessible' || echo '  ❌ peer0.employer.example.com:7051 NOT accessible'
        nc -z peer0.engineer.example.com 8051 && echo '  ✅ peer0.engineer.example.com:8051 accessible' || echo '  ❌ peer0.engineer.example.com:8051 NOT accessible'
        nc -z peer0.contractor.example.com 9051 && echo '  ✅ peer0.contractor.example.com:9051 accessible' || echo '  ❌ peer0.contractor.example.com:9051 NOT accessible'
    " || echo "❌ Network connectivity test failed"

echo ""

echo "STEP 3: CHANNEL MEMBERSHIP CHECK"
echo "================================"
echo ""

# Run the channel membership check script
if [ -f "./check-channel-memberships.sh" ]; then
    chmod +x ./check-channel-memberships.sh
    ./check-channel-memberships.sh
else
    echo "❌ check-channel-memberships.sh not found"
fi

echo ""

echo "STEP 4: CHAINCODE STATUS CHECK" 
echo "=============================="
echo ""

# Run the chaincode status check script
if [ -f "./check-chaincode-status.sh" ]; then
    chmod +x ./check-chaincode-status.sh
    ./check-chaincode-status.sh
else
    echo "❌ check-chaincode-status.sh not found"
fi

echo ""

echo "STEP 5: CHANNEL1 SPECIFIC DIAGNOSTICS"
echo "====================================="
echo ""

echo "🔍 Checking if channel1 has orderer endpoints defined..."
timeout 15s docker run --rm --network network_project-network \
    -v $(pwd)/crypto-config/peerOrganizations/employer.example.com/users/Admin@employer.example.com/msp:/etc/hyperledger/fabric/msp \
    -v $(pwd)/crypto-config/peerOrganizations/employer.example.com/peers/peer0.employer.example.com/tls:/etc/hyperledger/fabric/tls \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID=EmployerMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_ADDRESS=peer0.employer.example.com:7051 \
    hyperledger/fabric-tools:2.5 \
    peer channel getinfo -c channel1 2>&1 | grep -i "endpoints\|timeout\|error" || echo "✅ No endpoint errors detected"

echo ""

echo "🎯 FINAL DIAGNOSTIC SUMMARY"
echo "============================"
echo ""
echo "If you see:"
echo "  ✅ All containers running"
echo "  ✅ Network connectivity working" 
echo "  ✅ Peers joined to channel1"
echo "  ✅ project-management chaincode installed"
echo "  ✅ No 'endpoints' or 'timeout' errors"
echo ""
echo "Then your network is healthy and ready for chaincode operations."
echo ""
echo "If you see timeouts or 'no endpoints defined' errors,"
echo "the issue is with missing OrdererEndpoints in configtx.yaml"
echo ""
echo "📝 Check TIMEOUT_RESOLUTION_SUMMARY.txt for the complete solution."
echo ""
