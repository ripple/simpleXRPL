# Ripple Custody

`RippleCustody` signs and submits through Ripple Custody.
Writes from the verticals map to native Custody operations where Custody has
one, and beyond the verticals the whole Custody API is available, typed from
the bundled spec.

- [Setting up](#setting-up)
- [Calling the Custody API](#calling-the-custody-api)
- [XRPL transaction orders](#xrpl-transaction-orders)
- [Waiting on intents](#waiting-on-intents)
- [Dry runs](#dry-runs)
- [Lists, lookups, and account keys](#lists-lookups-and-account-keys)
- [Creating an API key](#creating-an-api-key)
- [API key in an HSM or KMS](#api-key-in-an-hsm-or-kms)
- [Custody versions](#custody-versions)
- [Errors](#errors)

## Setting up

`RippleCustody.fromEnv()` reads its configuration from the environment:

| Variable                          |                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `RIPPLE_CUSTODY_GATEWAY_URL`      | The Custody API gateway (HTTPS).                                                                                                               |
| `RIPPLE_CUSTODY_AUTH_TOKEN_URL`   | The full OAuth token endpoint, not the auth server's base URL.                                                                                 |
| `RIPPLE_CUSTODY_AUTH_SIGNING_KEY` | The API user's private key: the PEM itself, a path to a `.pem` file, or an AWS Secrets Manager secret ARN. Not read when a `signer` is passed. |
| `RIPPLE_CUSTODY_DOMAIN_ID`        | Optional: the Custody domain. Left out, the domain holding the `primary` address is used.                                                      |
| `RIPPLE_CUSTODY_AUTH_CLIENT_ID`   | Optional: the OAuth client id; defaults to `customer_api`.                                                                                     |

```ts
import { RippleCustody, SimpleXRPL } from 'simplexrpl'

const custody = await RippleCustody.fromEnv({ primary: 'r...' })
const client = await SimpleXRPL.init({
  xrpldUrl: 'wss://s.altnet.rippletest.net:51233',
  signers: [custody],
})
```

`RippleCustody.create()` takes the same settings as options. Each Custody
request is abandoned after 30 s; `requestTimeoutMs` changes that. `debug` logs
the HTTP traffic with credentials masked; see
[Debug logging](../README.md#debug-logging).

## Calling the Custody API

Beyond the verticals, a `RippleCustody` exposes the whole Custody API, typed
from the bundled spec:

```ts
// Any endpoint by operationId, or by method and path (including the ones
// with no operationId, such as user invitations).
await custody.api.call('getIntent', { path: { domainId, intentId } })
await custody.api.request('GET', '/v1/domains/{domainId}/users/invitations', {
  path: { domainId },
})

// Governed intents, signed with the API user key. The returned intentId is
// the handle for reading, awaiting, approving, or rejecting the intent.
const { intentId } = await custody.api.propose(payload)
await custody.api.approve(intentId, { reason: 'within limits' })
await custody.api.reject(intentId, { reason: 'unexpected destination' })
```

`approve` and `reject` fetch the intent and sign the decision for you; the API
user must be allowed to decide on that intent under its policy.

## XRPL transaction orders

The verticals build an XRPL transaction for you. To send Custody's own XRPL
operation exactly as Custody defines it — for example a `Payment` to a Custody
`Endpoint`, or an `MPTokenIssuanceCreate` with your own flags — use
`api.proposeTransactionOrder`. It looks up the Custody account that holds the
sending address, fills in what Custody requires (`Priority: Low` fee and no
memos, unless you set them), and signs and proposes the order:

```ts
const { intentId } = await custody.api.proposeTransactionOrder(
  {
    account: 'r...', // the sending address
    operation: {
      type: 'Payment',
      destination: { type: 'Endpoint', endpointId },
      amount: '1000',
      currency: { type: 'MultiPurposeToken', issuanceId },
    },
  },
  { dryRun: true }, // check with Custody first
)
```

With `dryRun: true`, Custody checks the order first; if it would fail, a
`DryRunFailedError` is thrown and nothing is proposed. The other options are the
same as `api.propose`'s. `id` is the idempotency key, and the returned
`intentId` is also the order id, which the on-chain transaction is filed under
(`client.intent.awaitOnChain(intentId)`).

## Waiting on intents

To find out how an intent ended, `api.waitForIntent` reports the outcome
instead of throwing. A rejected, expired, or failed intent, or one still
pending when the wait runs out, comes back as an answer:

```ts
const outcome = await custody.api.waitForIntent(intentId, { timeoutMs: 30_000 })
// → { status, isTerminal, isSuccess, reason, intent }
if (!outcome.isSuccess) console.log(outcome.reason)

// Or propose and wait in one call.
const result = await custody.api.proposeAndWait(payload)
```

An intent still `Open` when the wait ends is most likely waiting for a person
to approve it, so keep the `intentId` and check back later.
`client.intent.outcome(intentId)` does the same from a `SimpleXRPL` client.

## Dry runs

`api.dryRun` asks Custody whether an intent would go through, without creating
it, and returns the verdict instead of throwing. `api.dryRunTransaction` does
the same for an XRPL transaction, and includes the fee estimate:

```ts
const check = await custody.api.dryRunTransaction(payment, { ledgerId: 'xrpl' })
// → { success, errors, result, estimate: { fee, minimumCostInDrops, ... } }
```

To pre-flight a single vertical write, pass `dryRun: true`, e.g.
`client.xrp.transfer(params, { dryRun: true })`. If the dry-run fails, the
write throws a `DryRunFailedError` (carrying Custody's full response) and
nothing is submitted. This works for Ripple Custody accounts; other signers
reject the option.

## Lists, lookups, and account keys

List endpoints return one page at a time. `api.paginate` follows the
`nextStartingAfter` cursor and yields every item, fetching each page only when
the loop needs it:

```ts
for await (const account of custody.api.paginate('getAccounts', {
  path: { domainId },
  query: { limit: 100 },
})) {
  // every account in the domain
}
```

`api.findByAddress` finds the account that holds an address, across every
domain the API user can see:

```ts
const ref = await custody.api.findByAddress('r...', { ledgerId: 'xrpl' })
// → { domainId, accountId, ledgerId, ... }, or undefined if no account holds it
```

It throws if more than one account matches. That includes one account holding
the address on several ledgers, so pass `ledgerId` and/or `domainId` to pick
one.

`api.getPublicKey` reads that account's XRPL public key in the form XRPL uses
(compressed, uppercase hex), e.g. to set up a regular key or a signer list:

```ts
const publicKey = await custody.api.getPublicKey('r...', { ledgerId: 'xrpl' })
// → '02218AB4…'
```

`domainId` is optional when creating a `RippleCustody`. If it's left out, the
domain holding the `primary` address is looked up when the custodian is
created; `custody.domainId` returns it either way.

## Creating an API key

`generateCustodyKeypair` makes a new key pair for an API user, in any of the
three algorithms Custody supports:

```ts
import { generateCustodyKeypair } from 'simplexrpl'

const { privateKey, publicKey } = await generateCustodyKeypair('ed25519') // or 'secp256k1', 'secp256r1'
```

Register `publicKey` (base64 SPKI DER) for the API user in Custody, and store
`privateKey` (PKCS#8 PEM) wherever the SDK reads its signing key from:
`auth.signingKey`, or `RIPPLE_CUSTODY_AUTH_SIGNING_KEY` as the PEM itself, a
path to a `.pem` file, or an AWS Secrets Manager secret ARN. To keep the key in
an HSM or KMS instead, generate it there; see
[API key in an HSM or KMS](#api-key-in-an-hsm-or-kms).

## API key in an HSM or KMS

The Ripple Custody API user's key signs the login challenge and every intent
the SDK proposes. By default it is a PEM key held in the process
(`auth.signingKey`, or `RIPPLE_CUSTODY_AUTH_SIGNING_KEY` with `fromEnv`). To
keep it inside an HSM or KMS instead, pass a `signer`:

```ts
import { RippleCustody } from 'simplexrpl'
import { AwsKmsCustodySigner } from 'simplexrpl/aws-kms'

const signer = await AwsKmsCustodySigner.create({
  keyId: 'alias/custody-api-user', // an ECC_SECG_P256K1 or ECC_NIST_P256 key
  region: 'us-east-1',
})
const custody = await RippleCustody.fromEnv({ primary: 'r...', signer })
```

Other HSMs and KMSs implement `CustodySignerPort`: `algorithm`, `publicKey()`,
and `sign(data, context)`, which runs only the raw signing primitive.

- **secp256k1 and secp256r1** keys receive a 32-byte SHA-256 digest to sign as
  a digest, and return a DER signature.
- **ed25519** keys receive the exact bytes to sign, and return the raw 64-byte
  signature.

`context` (`'auth-challenge'` or `'intent'`) lets an HSM policy treat the two
differently. The SDK checks every signature against the public key before
sending it, so a misconfigured signer fails with a clear error rather than a
401 from Custody.

## Custody versions

Each Custody instance runs its own version, so not every instance serves every
endpoint or operation the SDK knows about. `RippleCustody.create()` reads the
instance's version from the OpenAPI document it serves, and blocks a call the
instance can't handle — an `api.call` endpoint, an `api.propose` intent type, or
a vertical's native XRPL operation — with an `UnsupportedInVersionError` naming
what is missing, before anything is sent.

```ts
const custody = await RippleCustody.fromEnv({ primary: 'r...' })
custody.backendVersion // e.g. '1.43.4'
```

To skip the detection request, pin the version instead; calls are then checked
against data bundled with the SDK (one entry per minor version):

```ts
await RippleCustody.fromEnv({ primary: 'r...', apiVersion: '1.43' })
```

The error also says where the missing piece _is_ available — e.g. `official
1.37+`, or `pre-release Custody builds` for a feature only those have so far. The
full table is in [`custody-endpoints.md`](./custody-endpoints.md).

If the version can't be detected, the SDK emits a single Node warning
(`SIMPLEXRPL_CUSTODY_VERSION_UNDETECTED`) and lets every call through to the
server. `autoDetectVersion: false` turns detection off without the warning, and
`openApiUrl` points it at a different document URL.

## Errors

A failed Custody call throws a `CustodyApiError` whose message leads with
Custody's own reason and explanation:

```
Custody API error (404 EntityNotFoundError): Intent 3f1c… not found.
```

The same parts are fields, beside the full response body: `status`, `reason`,
`detail`, `hint`, and `raw`. `toJSON()` gives a plain object for structured
logs.

A `401` that a token refresh doesn't fix throws a `CustodyAuthError` named for
its reason: `CustodySignatureError` (`InvalidSignatureError`) or
`CustodyPermissionError` (`PermissionDeniedError`). Its `apiError` is the
underlying `CustodyApiError`.

When a failure matches a known Custody server bug, `hint` says how to work
around it. For example, a `quarantineStatus` filter can return a 500 on the
transfers endpoint.

A request that gets no response within its timeout throws a
`CustodyTimeoutError`. Its outcome is unknown: Custody may still have processed
it. For an intent proposal, the error carries the `intentId` — check it with
`api.waitForIntent`, or re-submit with that idempotency key, rather than
proposing it again under a new one.

A failed dry-run pre-flight throws a `DryRunFailedError`, carrying Custody's full
`response`.
