# Reflection Rewards Tracker

A single-file local web app that tallies the dividend tokens your Solana wallets **actually received**
from reflection tokens (StonkFun reward-mode coins such as KNOTS → STONK, ZCAT → ZEC, coins paired with
tokenized stocks, etc.) over any period, so you can compare against the estimates on
[thestonkboard.com](https://thestonkboard.com/).

No Python, no build step, no server. Open `index.html` in a browser.

## Use

1. **Open** `index.html` (double-click it, or drag it into Chrome/Firefox/Safari).
2. **Pick a data source**
   - **Solscan Pro API** (recommended): paste an API key from [solscan.io/apis](https://solscan.io/apis).
     One request per 100 transfers, so a week is usually a handful of calls per wallet.
   - **Solana JSON-RPC**: paste any RPC URL (a free Helius/QuickNode/Triton key works well; the public
     `api.mainnet-beta.solana.com` endpoint works but is rate-limited). No Solscan key needed. The app
     enumerates your token accounts, lists their signatures in the window, fetches each transaction and
     diffs token balances. Fetched transactions are cached in the browser so repeat runs are fast.
3. **Paste wallet addresses**, one per line, optionally followed by a label.
4. **Choose the window** (last 1/2/3/7/14/30 days, or a custom local-time range) and click **Fetch rewards**.
5. Read the table: per reward token, total received, per-day rate, payout count, and USD at current price
   when a price is available. Each token card expands into by-wallet, by-sender (distributor), by-day and
   per-payout views with Solscan links. **Export CSV** downloads every payout.
6. Type the site's daily estimate into **Estimate/day** on a card (in token units or USD) to see the
   actual-vs-estimate difference. Estimates and sender labels are remembered per token in this browser.

## How a "reward" is identified

Reflection payouts are pushed to holders by a distributor wallet; you do not sign them and you send nothing.
Default **strict** mode therefore counts an inbound token transfer only when, in that same transaction,
the wallet sent no tokens or SOL and (when the provider exposes signers) did not sign. Buys, sells, swaps
and self-transfers are excluded. Switch to **Any inbound transfer** to see everything that arrived.

Because a reward token like STONK can be paid out by several coins you hold, use the **by sender**
breakdown to attribute payouts to each distributor and give it a label.

## Privacy

Everything runs in the browser tab. Addresses, keys, estimates and the transaction cache are stored in
`localStorage` for that file only. Network calls go only to the provider you selected and, for token
symbols and prices, to Jupiter's public token API (`lite-api.jup.ag`). Use **Clear cached transactions**
to drop the cache.

## Notes and limits

- "Per day" is the window total divided by the window length. thestonkboard's estimate is modeled from
  recent payouts (holding USD × APR ÷ 365), and payouts scale with trading volume, so some divergence is
  expected. Persistent large gaps are what this tool is for.
- Wallets must hold at least the minimum StonkFun pays to (around $20 of the coin) to receive anything.
- RPC mode only sees token accounts that currently exist; a reward token account you closed will not be
  scanned. Solscan mode does not have this limit.
- Token-2022 and classic SPL tokens are both handled.
- Not financial advice.

## Development

`index.html` is the whole app (vanilla JS, no dependencies). `test/e2e.js` runs it headless in Chromium
with mocked Solscan and RPC responses:

```
npm i -g playwright   # once; also install a Chromium via `npx playwright install chromium`
node test/e2e.js
```
