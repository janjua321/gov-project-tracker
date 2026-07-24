# Hiring Manager Prep — Hyperledger Fabric Project (Swiggy Round)

## Quick one-liner to start
This document collects concise, interview-ready notes tying your Hyperledger Fabric project to Swiggy's scale, resilience, and culture expectations.

---

## 1) Opening Hook — Why this project matters to Swiggy (30–45s)
- Built a multi-party trust system (8 orgs) with strong auditability and privacy controls — directly maps to Swiggy’s need to coordinate restaurants, delivery partners, and payment providers.
- Key strengths: multi-stakeholder coordination, real-time state sync, immutable audit trails, and careful privacy vs transparency trade-offs.

Memorize: "I built a system where independent organizations must reach consensus on critical transactions — that experience translates to Swiggy's multi-party order/pay/partner flows."

---

## 2) Three ownership stories (STAR + lesson) — 2–3 minutes each

A. The 3-Channel Architecture Decision
- Problem: conflicting privacy requirements (finance vs operations vs regulators).
- Decision: design 3 channels (Operations, Financial, Regulatory) rather than single-channel or many micro-channels.
- Tradeoffs: more governance and off-chain correlation vs stronger isolation and simpler per-channel scaling.
- Result: started with 1 channel for debugging, documented migration path to 3 channels for production.
- Lesson: start simple, design for scale, migrate deliberately.

B. Chaincode Container Death-Loop (production-style bug)
- Symptom: chaincode containers exited with status 0; peers could not register chaincode.
- Root cause: wrong start script in package.json (`node index.js` vs `fabric-chaincode-node start`).
- Fixes: corrected start script, added container healthchecks, added CI validation for start script, repackaged and re-committed chaincode.
- Outcome: restored reliability and added prevention measures.
- Lesson: protocol contracts matter; add lightweight smoke tests and healthchecks early.

C. Query Optimization & Resource Limits
- Problem: getProjectHistory loaded full project objects → memory spikes under load.
- Fix: paginated history, return summaries (txId, timestamp, status) not full objects, added limits.
- Result: memory dropped dramatically and P99 latency improved.
- Lesson: always bound datasets at API level; optimize for typical queries.

---

## 3) Scale-aware technical points (short answers)
- Channels: partitioning (ops / finance / regulatory) increases throughput by isolating workloads and reduces blast radius.
- Endorsement policy: MAJORITY (resilience) vs AND (stronger guarantee). Policy checked for every write transaction at orderer/peer validation; reads unaffected.
- CouchDB: per-peer per-channel CouchDB DBs (naming: `channel_chaincodename`). Chaincode never imports CouchDB directly; Fabric updates state automatically.
- Performance levers: block BatchSize/BatchTimeout, endorsement peer count, chaincode efficiency, off-chain aggregation for cross-channel queries.

---

## 4) Resilience & failure handling (concise)
- Peer crash during endorsement: MAJORITY policy lets transactions succeed if enough peers endorse.
- Orderer outage: plan for 3-node Raft (HA) — single orderer is a single point of failure.
- CouchDB corrupt: rebuild world state by replaying blocks from blockchain files.
- Cert expiry: monitor cert expiry, automate rotation, use Fabric-CA in prod.

---

## 5) Culture & ownership answers (short)
- Why you want Swiggy: scale + constraints; real-world impact; chance to broaden from blockchain to high-throughput distributed systems (Kafka, Go, K8s).
- How you work: prefer high ownership with periodic syncs, blameless postmortems, document learnings, teach teammates (weekly micro-talks).
- Failure story: demo failure → created pre-demo checklist and smoke tests; learned to prepare and avoid live debugging with stakeholders.

---

## 6) Role fit and growth (30–45s)
- Short term: learn Go, Kafka, and Swiggy internal patterns; contribute to a service and own a feature.
- Medium term: architect cross-team systems (delivery assignment, order batching).
- Long term: mentor, own high-impact services and lead reliability initiatives.

---

## 7) Two-minute answers to likely HM prompts
- "Tell me about a hard trade-off you made": 3-channel vs single-channel (privacy vs complexity) — start with single-channel for dev velocity, plan migration.
- "How do you handle incidents?": detect via healthchecks/metrics, isolate, rebuild from source-of-truth, blameless postmortem, automate prevention.
- "How would you scale this for 10× throughput?": partition by channels + shard within services, optimize endorsement policy, tune block parameters, move state-heavy queries off-chain.

---

## 8) Questions to ask the hiring manager (pick 2–3)
1. What is Swiggy's primary engineering constraint today (DB throughput, real-time connections, geo-sharding)?
2. How does the team balance rapid experimentation vs production stability (e.g., can I roll out to one city before wider rollouts)?
3. What does the onboarding path look like for engineers learning core infra (pairing, starter services)?

---

## 9) 60-second closing pitch (memorize)
"I build systems for real-world constraints — not theoretical best-practices. My blockchain project required me to design for privacy, consistency, and resilience across multiple organizations. I shipped an MVP quickly, iterated with tests, and planned a careful migration to production. At Swiggy I’ll bring that same pragmatic trade-off analysis, bias for ownership, and focus on measurable impact — I want to move from specialist to platform-scale engineer and mentor others along the way."

---

## Quick usage
- File: `/home/janjua/projchain/HM_PREP_SWIGGY.md`
- Read top sections before interview: Opening Hook, 3 Ownership Stories, 60-second pitch.
- Use the "Questions to ask" section at the end of the interview.

---

Good luck — practice each story aloud for 2–3 minutes and keep answers crisp and concrete.