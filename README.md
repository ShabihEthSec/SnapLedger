# SnapLedger

> Don’t track expenses. Prove them.

SnapLedger is a mobile-first, verifiable invoicing and expense proof system. It allows users to capture receipts, extract data, process stablecoin payments via **Dodo Payments**, and anchor proofs on Solana with **SNS Identity** integration.

---

## 🔁 Updated End-to-End Flow

```
Receipt → OCR → Invoice → Pay via USDC (Dodo) → SNS Identity → On-Chain Proof → Solana
```

---

## ✅ New Features

### 💳 Stablecoin Payments (Dodo)
- Integrated **Dodo Payments** for seamless USDC (Solana) and Card payments.
- Real-time payment verification via Webhooks.
- Automatic on-chain anchoring upon successful settlement.

### 👤 Decentralized Identity (SNS)
- Support for **Solana Name Service (.sol)** domains.
- Automatically resolves wallet addresses to human-readable handles.
- Links identity directly to verifiable payment proofs.

### ⛓️ Proof of Payment
- Every paid invoice generates an immutable proof on Solana via SPL Memo.
- Publicly verifiable, tamper-evident audit trail.

---

## 🧱 What’s Implemented

### ✅ Invoicing System
- Create and manage invoices locally (IndexedDB).
- "Offline-first" design with secure server-side payment processing.

### ✅ OCR Pipeline
- Mobile-first camera capture
- OCR using `tesseract.js`
- Fully client-side (no backend)

### ✅ Solana Anchoring
- Hash stored via SPL Memo
- Public, immutable, permissionless
- Supports any standard Solana wallet (Phantom, etc.)

---

## 🧰 Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS
- **Payments:** Dodo Payments (USDC & Card)
- **Identity:** Solana Name Service (SNS)
- **OCR:** Tesseract.js
- **Blockchain:** Solana (SPL Memo)
- **Data:** GoldRush (Covalent) for wallet analytics

---

## 🚀 Getting Started

```bash
cd snapledger
npm install
npm run dev
```

### Environment Variables
Configure `.env.local`:
```bash
DODO_PAYMENTS_API_KEY=sk_test_...
DODO_PAYMENTS_WEBHOOK_KEY=whsec_...
DODO_PRODUCT_ID=prod_...
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## 🏁 Hackathon Context

Built for Frontier / Solana ecosystem.

Focus:
- Real-world utility (Invoicing)
- Stablecoin adoption (USDC)
- Social Identity (SNS)
- Trust minimization
