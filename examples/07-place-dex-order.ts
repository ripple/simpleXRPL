/**
 * Place an order on the DEX.
 *
 * The `iou` vertical places orders to buy or sell an issued currency; the
 * `token` vertical places generic offers between any two DEX-tradeable assets
 * (XRP or IOU). Order type controls how the offer is worked.
 */
import { iou, LocalSigner, SimpleXRPL, XRP_ASSET } from 'simplexrpl'

const client = await SimpleXRPL.init({
  rippledUrl: 'wss://s.altnet.rippletest.net:51233',
  signers: [LocalSigner.fromEnv()],
})

// --- Via the IOU vertical: sell 100 USD for 50 XRP -------------------------
// orderType: 'limit' rests on the book; 'market' = immediate-or-cancel;
// 'fok' = fill-or-kill; 'passive' = rest without crossing.
const sell = await client.iou.sellOffer({
  ticker: 'USD',
  amount: 100,
  orderType: 'limit',
  price: { currency: 'XRP', amount: 50 },
})
console.log('sell offer submitted:', sell.txHash)

// Buy 100 USD, paying in another IOU (EUR):
await client.iou.buyOffer({
  ticker: 'USD',
  amount: 100,
  orderType: 'fok',
  price: {
    ticker: 'EUR',
    issuer: 'rEurIssuer000000000000000000000000',
    amount: 90,
  },
})

// Cancel a resting offer by its sequence number:
await client.iou.cancelOffer({ offerSequence: 42 })

// --- Via the token vertical: a generic XRP/IOU offer -----------------------
await client.token.createOffer({
  takerGets: { asset: XRP_ASSET, value: '50' },
  takerPays: {
    asset: iou('USD', 'rIssuer00000000000000000000000000000'),
    value: '100',
  },
  flags: { immediateOrCancel: true },
})

await client.disconnect()
