/**
 * Ripple Custody authentication & signing layer.
 *
 * Internal to the RippleCustody adapter; not part of the public SDK surface
 * (the public error classes are re-exported from the package root instead).
 */
export { KeypairService } from './keypair.service.js'
export { CustodyAuthService } from './custody-auth.service.js'
export type { CustodyAuthServiceOptions } from './custody-auth.service.js'
export { IntentSigner } from './intent-signer.js'
export type {
  CustodyAuthPort,
  SignedChallenge,
  TokenResponse,
} from './ports.js'
export type { KeypairAlgorithm, KeypairStrategy } from './keypairs.types.js'
