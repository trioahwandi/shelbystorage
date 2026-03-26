# ShelbyStorage 🗄️

A decentralized file storage dApp built on [Shelby Protocol](https://shelby.xyz) and the Aptos blockchain.

## Features

- 🔐 Connect with Petra Wallet
- ⬆️ Upload files to Shelby decentralized hot storage
- ⬇️ Download / retrieve your uploaded files
- ⚡ Sub-second retrieval via Shelby network
- 🎨 Dark theme matching Shelby's brand

## Tech Stack

- **Next.js 14** — React framework
- **Shelby Protocol SDK** — Decentralized storage
- **Aptos Wallet Adapter** — Wallet connection
- **TypeScript** — Type safety

---

## Setup (Local)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/shelbystorage
cd shelbystorage
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API key from [geomi.dev](https://geomi.dev):

```
NEXT_PUBLIC_SHELBY_API_KEY=aptoslabs_your_key_here
NEXT_PUBLIC_APTOS_API_KEY=aptoslabs_your_key_here
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add environment variables:
   - `NEXT_PUBLIC_SHELBY_API_KEY` = your Geomi API key
   - `NEXT_PUBLIC_APTOS_API_KEY` = your Geomi API key
4. Deploy!

---

## Prerequisites

- [Petra Wallet](https://petra.app) browser extension
- Aptos Testnet APT tokens (from [faucet](https://aptos.dev/network/faucet))
- ShelbyUSD tokens (from [Shelby Discord](https://discord.gg/shelbyprotocol))

---

Built for Shelby Protocol Early Access 🚀
