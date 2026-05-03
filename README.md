# SnapLedger

> Don’t track expenses. Prove them.

SnapLedger is a mobile-first, verifiable expense proof system for crypto freelancers. It allows users to capture receipts, extract data locally, generate deterministic proofs, and anchor them on Solana for independent verification.

---

## 🚨 Problem

Freelancers paid in USDC/USDT (especially in India, SEA, LatAm) face a major issue:

- Expenses are tracked via spreadsheets or screenshots
- Receipts can be easily manipulated
- No reliable way to **prove authenticity** during audits or reimbursements
- Heavy dependence on trust (client, accountant, or platform)

---

## 💡 Solution

SnapLedger replaces trust with **cryptographic verification**.

Instead of storing receipts, SnapLedger generates **tamper-evident proofs**:

1. 📸 Capture a receipt
2. 🤖 Extract data locally (OCR)
3. 🧠 Detect merchant, amount, date
4. ✏️ User confirms or edits
5. 🔐 Generate deterministic proof (SHA-256 hash)
6. ⛓️ Anchor hash on Solana (SPL Memo)
7. 🔍 Verify proof independently

---

## 🔁 End-to-End Flow

```

Receipt → OCR → Extract → Confirm → Normalize → Hash → Solana → Verify

```

---

## 🧱 What’s Implemented

## 🤖 QVAC Integration (Tether Track)

SnapLedger integrates Tether’s QVAC SDK to perform local OCR inference via a Node.js API route.

- Runs OCR using QVAC locally (no external API)
- Model loaded and cached server-side
- Fallback to Tesseract for reliability

This demonstrates real-world usage of QVAC for on-device AI in financial workflows.

### ✅ OCR Pipeline

- Mobile-first camera capture
- OCR using `tesseract.js`
- Fully client-side (no backend)

### ✅ Intelligent Extraction

- Amount detection (multi-strategy)
- Merchant filtering + heuristics
- Date parsing (multi-match + validation)
- Confidence scoring

### ✅ Human-in-the-loop UX

- Editable confirmation screen
- Error handling + confidence warnings

### ✅ Proof Generation

- Deterministic normalization:

```

merchant|amount|date

```

- SHA-256 hashing
- Consistent across devices

### ✅ On-Chain Anchoring (Solana)

- Hash stored via SPL Memo
- Public, immutable, permissionless
- No centralized dependency

### ✅ Verification System

- Input:

```

normalized|hash|txSignature

```

- Recompute hash locally
- Fetch transaction from Solana
- Compare memo data

✔ Detects tampering instantly

### ✅ Persistence & Recovery

- IndexedDB (local storage of proofs)
- Export JSON backup (`snapledger-proofs.json`)
- Import JSON restore
- Deep-link verification support

---

## 🔗 Why Solana?

SnapLedger uses Solana as a **trust anchor**, not a database.

Instead of storing full data:

- Only the **hash** is stored on-chain
- Full data remains user-controlled

### Benefits:

- Permissionless verification
- No platform dependency
- Low cost + high throughput
- Tamper-evident records

---

## 🧠 Architecture

```

User Data (local / export)
↓
Normalized → SHA256 Hash
↓
Solana (immutable anchor)

```

---

## 🧪 Example Proof

```text
starbucks|64.42|2019-03-01|3ec101...|txSignature
```

---

## 🔍 Verification Logic

1. Parse proof
2. Recompute hash
3. Compare with provided hash
4. Fetch Solana transaction
5. Validate memo

### Result:

- ✅ VALID — data matches and is anchored
- ❌ INVALID — tampered or mismatch

---

## 🎯 Target Users

- Crypto freelancers
- Remote contractors
- Digital nomads
- Anyone needing verifiable expense records

---

## 🧰 Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Tesseract.js (OCR)
- Solana Web3.js (SPL Memo)
- IndexedDB (local persistence)

---

## 🚀 Getting Started

```bash
cd snapledger
npm install
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## ⚠️ Known Limitations

- OCR accuracy depends on image quality
- Merchant detection is heuristic-based
- Requires internet for on-chain verification
- Devnet may have RPC / airdrop instability

---

## 🧨 Key Insight

SnapLedger is not an expense tracker.

It is a:

> **Deterministic, verifiable, tamper-evident financial proof system**

---

## 🏁 Hackathon Context

Built for Frontier / Solana ecosystem.

Focus:

- Real-world problem
- Offline-first design
- Trust minimization
- Verifiable data
- Demo-ready UX

---

## 👤 Author

Mohd Shabihul Hasan Khan (ShabihEthSec)
