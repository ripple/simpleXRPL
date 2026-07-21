/**
 * Issue a Real-World Asset (RWA) as a Multi-Purpose Token (MPT).
 *
 * RWAs are issued as MPTs via the `token` vertical. Metadata follows the XLS-89
 * standard and is validated before submission (`asset_class: 'rwa'` requires an
 * `asset_subclass`). The issuance signs as the acting account — set `from` to
 * the account that should be the issuer.
 *
 * NOTE: the Ripple Custody connector is in progress. The issuance call below is
 * identical regardless of connector — once Ripple Custody is bound in `init`,
 * point `from` at its account (e.g. its r-address) and nothing else changes.
 */
import { LocalSigner, SimpleXRPL } from 'simplexrpl'

const client = await SimpleXRPL.init({
  rippledUrl: 'wss://s.altnet.rippletest.net:51233',
  // Bind your Ripple Custody connector here when available; using local
  // signing as a stand-in so the sample is runnable today.
  signers: [LocalSigner.fromEnv()],
})

// The issuer account. With Ripple Custody bound, this is its r-address.
const issuer = client.resolveAccount().address

const result = await client.token.issue(
  {
    metadata: {
      ticker: 'TBILL',
      name: 'Acme 3-Month T-Bill',
      icon: 'https://acme.example/tbill.png',
      asset_class: 'rwa',
      asset_subclass: 'treasury',
      issuer_name: 'Acme Capital',
    },
    // 2 decimal places of display precision.
    assetScale: 2,
    // 0.5% fee on secondary transfers.
    transferFee: 0.5,
    // Keep the issuer able to claw back (compliance); other capabilities on.
    flags: { canClawback: true, canTransfer: true },
  },
  { from: issuer },
)

console.log('issued MPT:', result.intent.mptIssuanceId)

await client.disconnect()
