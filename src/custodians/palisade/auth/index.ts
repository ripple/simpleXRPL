/**
 * Palisade authentication layer.
 *
 * Internal to the PalisadeCustody adapter; not part of the public SDK surface
 * (the public error classes are re-exported from the package root instead).
 */
export { PalisadeAuthService } from './palisade-auth.service.js'
export type { PalisadeAuthServiceOptions } from './palisade-auth.service.js'
export type { PalisadeAuthPort, PalisadeTokenResponse } from './ports.js'
