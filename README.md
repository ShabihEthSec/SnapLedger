# SnapLedger

> Don’t track expenses. Prove them.

SnapLedger is a mobile-first expense proof system for crypto freelancers. It allows users to capture receipts, extract data offline, and generate tamper-evident proofs anchored on Solana.

---

## 🚨 Problem

Freelancers paid in USDC/USDT (especially in India, SEA, LatAm) face a major issue:

- Expenses are tracked using spreadsheets or screenshots
- Receipts are easy to manipulate
- No reliable way to **prove authenticity** during audits or reimbursements
- Heavy dependence on trust (client, accountant, or platform)

---

## 💡 Solution

SnapLedger replaces trust with **cryptographic proof**.

Users can:

1. 📸 Capture a receipt
2. 🤖 Extract data locally (offline OCR)
3. 🧠 Automatically detect merchant, amount, date
4. ✏️ Confirm or edit details
5. 🔐 (Next phase) Generate a tamper-proof hash
6. ⛓️ Anchor proof on Solana
7. 📤 Share verifiable proof with anyone

---

## 🧱 Current Implementation (What’s Done)

### ✅ Phase 1 — OCR Pipeline

- Camera capture (mobile-first UI)
- OCR using `tesseract.js`
- Fully client-side (no API calls)

### ✅ Phase 2 — Intelligent Extraction

- Amount detection (multi-strategy)
- Merchant extraction (header filtering + heuristics)
- Date extraction (multi-match + validation)
- Confidence scoring system

### ✅ Phase 3 — Human-in-the-loop UX

- Editable confirmation screen
- Category tagging
- Error handling + confidence warnings

### ✅ Working Flow

```

Image → OCR → Extract → Confirm → Save

```

---

## 🧠 Key Technical Highlights

### 1. Offline-First OCR

- Runs entirely in-browser
- No data leaves the device
- Privacy-preserving by design

### 2. Heuristic Extraction Engine

- Handles noisy OCR text
- Filters irrelevant lines (e.g., "RECEIPT", "TOTAL")
- Uses multiple fallback strategies

### 3. Robust Date Parsing

- Handles ambiguous formats (DD-MM vs MM-DD)
- Avoids JS date auto-correction bugs
- Selects best candidate from multiple matches

### 4. Confidence System

- Flags uncertain extraction
- Ensures user verification before finalization

---

## 🔗 Why Solana? (Core Design Decision)

Traditional systems rely on trust:

- PDFs → editable
- SaaS tools → require platform trust
- DocuSign → centralized authority

SnapLedger anchors expense hashes on Solana:

- Public, permissionless verification
- No intermediary required
- Tamper-evident records
- Trust shifts from institutions → cryptography

---

## 🔮 Next Steps (Planned)

### ⛓️ Phase 4 — Proof Generation

- keccak256 hashing of expense data
- deterministic proof string

### 🔍 Phase 5 — Verification System

- paste proof → recompute hash
- compare with on-chain record
- detect tampering instantly

### 📤 Phase 6 — Sharing

- share single expense proof
- no full ledger exposure

---

## 🎯 Target Users

- Crypto freelancers
- Remote contractors
- Digital nomads
- Anyone paid in stablecoins

---

## 🧪 Example Output

```json
{
  "merchant": "RECEIPT",
  "amount": 64.42,
  "date": "2019-03-01",
  "category": "Other"
}
```

---

## 🧰 Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Tesseract.js (OCR)
- (Upcoming) Solana Web3.js

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
- Merchant detection is heuristic-based (not perfect)
- Date format ambiguity handled with assumptions
- On-chain proof not yet integrated (planned next)

---

## 🧠 Key Insight

SnapLedger is not just an expense tracker.

It is a **proof system for financial records**.

---

## 🏁 Hackathon Context

Built for Frontier / Solana ecosystem.

Focus:

- Real-world problem
- Offline-first design
- Verifiable data
- Simple, demo-ready UX

---

## 👤 Author

Mohd Shabihul Hasan Khan (ShabihEthSec)

---
