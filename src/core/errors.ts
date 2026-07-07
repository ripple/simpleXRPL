/* eslint-disable max-classes-per-file -- The error hierarchy lives in one module. */
/**
 * Error hierarchy for simpleXRPL.
 *
 * NOTE: These classes are a subset of a larger planned error model, stubbed
 * here so the Custody auth layer can land independently. They are intended
 * to later be folded into the shared core error module.
 */

/** Base class for every error simpleXRPL throws. */
export class SimpleXRPLError extends Error {
  /**
   * Construct a SimpleXRPLError.
   *
   * @param message - Human-readable error message.
   * @param options - Optional settings.
   * @param options.cause - Underlying cause for error chaining.
   */
  public constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = new.target.name
    // Restore the prototype chain so `instanceof` holds across transpile targets.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Raised when Custody authentication fails: the challenge/JWT exchange is
 * rejected, the single 401 refresh-and-retry still fails, or token acquisition
 * errors out. Carries no key material.
 */
export class CustodyAuthError extends SimpleXRPLError {
  public readonly status?: number

  /**
   * Construct a CustodyAuthError.
   *
   * @param message - Human-readable error message.
   * @param options - Optional settings.
   * @param options.status - HTTP status code, if any.
   * @param options.cause - Underlying cause for error chaining.
   */
  public constructor(
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.status = options?.status
  }
}

/**
 * Raised for non-auth Custody API failures. `hint` preserves Custody's
 * `processing.hint` verbatim; `raw` carries the full response body.
 * Defined here only so the auth layer can distinguish it from
 * {@link CustodyAuthError}; a fuller version is planned for later.
 */
export class CustodyApiError extends SimpleXRPLError {
  public readonly status?: number
  public readonly hint?: string
  public readonly raw: unknown

  /**
   * Construct a CustodyApiError.
   *
   * @param message - Human-readable error message.
   * @param options - Optional settings.
   * @param options.status - HTTP status code, if any.
   * @param options.hint - Custody `processing.hint`, preserved verbatim.
   * @param options.raw - The full Custody response body.
   * @param options.cause - Underlying cause for error chaining.
   */
  public constructor(
    message: string,
    options?: {
      status?: number
      hint?: string
      raw?: unknown
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.status = options?.status
    this.hint = options?.hint
    this.raw = options?.raw
  }
}
