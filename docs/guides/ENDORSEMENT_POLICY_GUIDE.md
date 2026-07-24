# Endorsement Policy Guide
## How to Change and When It's Checked

---

## ✅ YES - You Can Change Endorsement Policy

There are **THREE places** where you can set endorsement policies:

---

## 🎯 OPTION 1: Channel-Level Default (configtx.yaml)

**Location:** `/network/configtx.yaml`

**Current Setting:**
```yaml
Application: &ApplicationDefaults
  Policies:
    Endorsement:
      Type: ImplicitMeta
      Rule: "MAJORITY Endorsement"  # 2 of 3 orgs must endorse
```

**Change to ALL orgs:**
```yaml
Application: &ApplicationDefaults
  Policies:
    Endorsement:
      Type: ImplicitMeta
      Rule: "ALL Endorsement"  # All 3 orgs must endorse
```

**Other Options:**
```yaml
# ANY org can endorse (least secure)
Rule: "ANY Endorsement"

# MAJORITY of orgs must endorse (default)
Rule: "MAJORITY Endorsement"

# ALL orgs must endorse (most secure)
Rule: "ALL Endorsement"
```

**When This Applies:**
- Default policy for ALL chaincode on the channel
- Used if no chaincode-specific policy is set
- Applies to chaincode lifecycle operations

**How to Apply:**
```bash
# You'd need to reconfigure the channel
# This is complex - requires channel update transaction
configtxgen -profile DirectChannel -outputBlock updated_channel.block
peer channel update -c directchannel -f updated_channel.block
```

⚠️ **Problem:** Changing channel config is complex and requires admin signatures

---

## 🎯 OPTION 2: Chaincode-Level Policy (RECOMMENDED)

**Location:** When you commit chaincode

**Current (Implicit):**
```bash
# Your current commit command (uses channel default)
peer lifecycle chaincode commit \
  --channelID directchannel \
  --name project-management \
  --version 1.1 \
  --sequence 2
  # No explicit policy = uses channel default (MAJORITY)
```

**Change to ALL orgs (Explicit):**
```bash
peer lifecycle chaincode commit \
  --channelID directchannel \
  --name project-management \
  --version 1.2 \
  --sequence 3 \
  --signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"
  # ↑ ALL three must endorse
```

**Other Policy Examples:**
```bash
# ANY org can endorse
--signature-policy "OR('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"

# At least 2 out of 3 (explicit MAJORITY)
--signature-policy "OutOf(2, 'EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"

# Employer AND Engineer (Contractor not required)
--signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer')"

# Employer AND (Engineer OR Contractor)
--signature-policy "AND('EmployerMSP.peer', OR('EngineerMSP.peer', 'ContractorMSP.peer'))"
```

**How to Apply:**
```bash
# 1. All orgs must approve the NEW policy
docker exec cli-employer peer lifecycle chaincode approveformyorg \
  --channelID directchannel \
  --name project-management \
  --version 1.2 \
  --sequence 3 \
  --signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"

docker exec cli-engineer peer lifecycle chaincode approveformyorg \
  --channelID directchannel \
  --name project-management \
  --version 1.2 \
  --sequence 3 \
  --signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"

docker exec cli-contractor peer lifecycle chaincode approveformyorg \
  --channelID directchannel \
  --name project-management \
  --version 1.2 \
  --sequence 3 \
  --signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"

# 2. Commit with the new policy
peer lifecycle chaincode commit \
  --channelID directchannel \
  --name project-management \
  --version 1.2 \
  --sequence 3 \
  --signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"
```

✅ **Best Approach:** This is the recommended way!

---

## 🎯 OPTION 3: Function-Level Policy (State-Based Endorsement)

**Location:** In chaincode using `ctx.stub.setStateValidationParameter()`

**Example Implementation:**
```javascript
async createProject(ctx, projectId, name, description, totalValue) {
    const mspId = ctx.clientIdentity.getMSPID();
    if (mspId !== 'EmployerMSP') {
        throw new Error('Access denied: Only Employer organization can create projects');
    }

    const project = {
        projectId,
        name,
        description,
        employer: mspId,
        totalValue: parseInt(totalValue),
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        createdBy: ctx.clientIdentity.getID(),
        milestones: [],
        workPackages: [],
        payments: [],
        approvals: {}
    };

    await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
    
    // SET STATE-BASED ENDORSEMENT POLICY
    // Future updates to THIS project require ALL three orgs
    const endorsementPolicy = {
        identities: [
            { role: { name: 'member', mspId: 'EmployerMSP' } },
            { role: { name: 'member', mspId: 'EngineerMSP' } },
            { role: { name: 'member', mspId: 'ContractorMSP' } }
        ],
        policy: {
            '3-of': [
                { 'signed-by': 0 },  // EmployerMSP
                { 'signed-by': 1 },  // EngineerMSP
                { 'signed-by': 2 }   // ContractorMSP
            ]
        }
    };

    await ctx.stub.setStateValidationParameter(
        projectId,
        Buffer.from(JSON.stringify(endorsementPolicy))
    );

    console.info('============= END : Create Project ===========');
    return JSON.stringify(project);
}
```

**When This Applies:**
- Only for THIS specific asset (project)
- Overrides chaincode-level policy
- Different projects can have different policies
- Most granular control

---

## 🔍 WHEN IS ENDORSEMENT POLICY CHECKED?

### Answer: **EVERY TIME** a transaction is submitted (not queries)

Here's the flow:

```
┌──────────────────────────────────────────────────────┐
│ 1. CLIENT SENDS TRANSACTION PROPOSAL                 │
│    contract.submitTransaction('createProject', ...)  │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ 2. SDK SENDS TO ENDORSING PEERS                      │
│    Based on discovery or manual selection            │
│    ✅ Sends to: Employer, Engineer, Contractor       │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ 3. EACH PEER EXECUTES CHAINCODE                      │
│    - Runs your JavaScript code                       │
│    - Checks MSP identity (your code)                 │
│    - Simulates transaction                           │
│    - Returns signed endorsement (read-write set)     │
│    ❌ Does NOT check endorsement policy here!        │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ 4. SDK COLLECTS ENDORSEMENTS                         │
│    - Gets signatures from all peers                  │
│    - Packages into transaction                       │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ 5. SUBMITTED TO ORDERER                              │
│    - Transaction with all endorsements               │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ 6. ✅ ORDERER VALIDATES ENDORSEMENT POLICY           │
│    - Checks: Do we have enough signatures?           │
│    - If policy = ALL → Need 3 signatures             │
│    - If policy = MAJORITY → Need 2 signatures        │
│    - If policy = ANY → Need 1 signature              │
│    - If PASS → Add to block                          │
│    - If FAIL → Reject transaction                    │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ 7. BLOCK COMMITTED TO ALL PEERS                      │
│    - Peers validate again before committing          │
│    - ✅ Each peer ALSO checks endorsement policy     │
│    - Write to ledger if valid                        │
└──────────────────────────────────────────────────────┘
```

### Critical Points:

**✅ Checked During:**
1. **Transaction Submission** (write operations - `submitTransaction`)
2. **Every single write transaction**
3. **Before block creation** (orderer validates)
4. **Before block commit** (peers validate)

**❌ NOT Checked During:**
1. **Query operations** (`evaluateTransaction`)
2. **Reading from ledger**
3. **Chaincode execution** (that's MSP checks)

---

## 📊 COMPARISON TABLE

| Policy Type | Where Set | Scope | Change Difficulty | Checked When |
|-------------|-----------|-------|-------------------|--------------|
| **Channel Default** | configtx.yaml | All chaincode on channel | Hard (channel update) | Every write tx |
| **Chaincode Policy** | commit command | This chaincode only | Medium (re-commit) | Every write tx |
| **State-Based** | In chaincode | Per asset/key | Easy (code change) | Every write tx for that key |

---

## 🔨 HOW TO CHANGE YOUR POLICY TO "ALL"

### Step-by-Step:

**1. Choose chaincode-level policy (recommended)**

**2. Create update script:**

Create `/network/scripts/update-endorsement-policy.sh`:

```bash
#!/bin/bash

echo "🔄 Updating endorsement policy to require ALL organizations..."

# Set environment for Employer
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="EmployerMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/employer.example.com/peers/peer0.employer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/employer.example.com/users/Admin@employer.example.com/msp
export CORE_PEER_ADDRESS=peer0.employer.example.com:7051

# Get current package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep project-management | awk '{print $3}' | sed 's/,//')

# Approve with new policy (Employer)
peer lifecycle chaincode approveformyorg \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --channelID directchannel \
  --name project-management \
  --version 1.2 \
  --sequence 3 \
  --package-id $PACKAGE_ID \
  --signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')"

echo "✅ Employer approved"

# Repeat for Engineer and Contractor...
# (Similar blocks with different MSP settings)

# Commit the new policy
peer lifecycle chaincode commit \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --channelID directchannel \
  --name project-management \
  --version 1.2 \
  --sequence 3 \
  --signature-policy "AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')" \
  --peerAddresses peer0.employer.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/employer.example.com/peers/peer0.employer.example.com/tls/ca.crt \
  --peerAddresses peer0.engineer.example.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/engineer.example.com/peers/peer0.engineer.example.com/tls/ca.crt \
  --peerAddresses peer0.contractor.example.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/contractor.example.com/peers/peer0.contractor.example.com/tls/ca.crt

echo "✅ New endorsement policy committed!"
echo "📋 Policy: ALL three organizations must endorse every transaction"
```

**3. Run the script:**
```bash
cd /home/janjua/projchain/blockchain-contracting-system/network
chmod +x scripts/update-endorsement-policy.sh
./scripts/update-endorsement-policy.sh
```

---

## 🎤 FOR YOUR INTERVIEW

**Q: Can the endorsement policy be changed to require every org?**

**A:** "Yes, absolutely. There are three levels where endorsement policies can be set:

1. **Channel-level default** in configtx.yaml - applies to all chaincode but requires a channel update transaction which is complex.

2. **Chaincode-level policy** specified during the commit phase of the chaincode lifecycle - this is the recommended approach. You can use `--signature-policy` flag with policies like `AND('EmployerMSP.peer', 'EngineerMSP.peer', 'ContractorMSP.peer')` to require all organizations to endorse.

3. **State-based endorsement** (SBE) set programmatically in chaincode using `setStateValidationParameter()` - allows different endorsement policies for different assets.

Currently, my implementation uses the channel default MAJORITY policy, meaning 2 out of 3 organizations must endorse. To change it to require ALL organizations, I would increment the sequence number, have all orgs approve the new policy, and re-commit the chaincode with the explicit AND signature policy."

**Q: Is the policy checked every time a chaincode function is called?**

**A:** "The endorsement policy is checked on **every write transaction** (submitTransaction), but NOT on read-only queries (evaluateTransaction). 

The validation happens in two places:
1. At the orderer - when it receives the transaction with endorsements, it validates that enough organizations signed according to the policy
2. At each peer during block validation - before committing to the ledger

So yes, for every createProject, submitWorkPackage, or approvePayment invocation, the endorsement policy is enforced. However, for queryProject or queryAllProjects, no endorsement is needed since they're read-only operations that don't modify the ledger."

This shows deep understanding! 🎯
