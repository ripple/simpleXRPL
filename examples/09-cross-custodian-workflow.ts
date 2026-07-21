/**
 * Run a workflow across two custodians.
 *
 * A single client can drive accounts held by different connectors. Two ways to
 * sequence work across them:
 *
 *   1. Vertical verbs with `from` — each call routes to the custodian that owns
 *      the named account. Best for the common case.
 *   2. `runMultiStep` — commits an ordered (transaction, account) sequence step
 *      by step (no rollback), where steps can target different custodians. Best
 *      when the order matters and you want one call site.
 */
import {
  LocalSigner,
  PalisadeCustody,
  runMultiStep,
  SimpleXRPL,
} from 'simplexrpl'
import type { Payment } from 'xrpl'

const local = LocalSigner.fromEnv()
const palisade = await PalisadeCustody.create({
  baseUrl: 'https://api.sandbox.palisade.co',
  clientId: process.env.PALISADE_CLIENT_ID ?? '',
  clientSecret: process.env.PALISADE_CLIENT_SECRET ?? '',
  primary: { vaultId: 'vault-id', walletId: 'wallet-id' },
})

const client = await SimpleXRPL.init({
  rippledUrl: 'wss://s.altnet.rippletest.net:51233',
  signers: [local, palisade],
})

// One account on each connector.
const localAccount = client.resolveAccount(local.primary.address)
const palisadeAccount = client.resolveAccount(palisade.primary.address)

// --- Approach 1: vertical verbs, each targeting a different custodian ------
// Issue an IOU as the local account, then pay out from the Palisade account.
await client.iou.issue({ ticker: 'USD' })
await client.xrp.transfer(
  { to: 'rBeneficiary00000000000000000000000', amount: '25' },
  { from: palisadeAccount.address },
)

// --- Approach 2: an ordered multi-step workflow across both ----------------
const stepOne: Payment = {
  TransactionType: 'Payment',
  Account: localAccount.address,
  Destination: 'rBeneficiary00000000000000000000000',
  Amount: '1000000',
}
const stepTwo: Payment = {
  TransactionType: 'Payment',
  Account: palisadeAccount.address,
  Destination: 'rBeneficiary00000000000000000000000',
  Amount: '2000000',
}

// Step 1 signs on Local, step 2 on Palisade — each routed automatically.
const results = await runMultiStep(client, [
  { transaction: stepOne, account: localAccount },
  { transaction: stepTwo, account: palisadeAccount },
])
console.log(`workflow committed ${results.length} steps`)

await client.disconnect()
