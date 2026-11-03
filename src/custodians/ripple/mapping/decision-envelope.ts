import type { components } from '../../../generated/custody.js'
import type { IntentSigner } from '../auth/intent-signer.js'

/** Approving or rejecting an existing intent. */
export type IntentDecision = 'Approve' | 'Reject'

/** A signed approve or reject body, ready to POST. */
export type IntentDecisionBody =
  | components['schemas']['Core_ApproveIntentBody']
  | components['schemas']['Core_RejectIntentBody']

/** Inputs for {@link buildDecisionEnvelope}. */
export interface DecisionEnvelopeInput {
  /** The Custody domain the deciding user acts in. */
  readonly domainId: string
  /** The deciding user's own Custody user id. */
  readonly authorUserId: string
  /** The intent being decided, as `getIntent` returns it. */
  readonly intent: components['schemas']['Core_TrustedIntent']
  /** Approve or reject. */
  readonly decision: IntentDecision
  /** Why — required by Custody for a rejection, optional for an approval. */
  readonly reason?: string
}

/**
 * Build and sign the body that approves or rejects an existing intent. It
 * names the intent by id and carries the proposal's own signature, which
 * Custody uses to bind the decision to exactly the proposal that was signed.
 *
 * @param intentSigner - Signs the canonicalized request with the API user key.
 * @param input - The intent, the decision, and the deciding user.
 * @returns The signed `{ request, signature }` body.
 */
export async function buildDecisionEnvelope(
  intentSigner: IntentSigner,
  input: DecisionEnvelopeInput,
): Promise<IntentDecisionBody> {
  const { details } = input.intent.data
  const common = {
    author: { id: input.authorUserId, domainId: input.domainId },
    targetDomainId: details.targetDomainId,
    intentId: input.intent.data.id,
    proposalSignature: details.proposalSignature,
  }
  if (input.decision === 'Approve') {
    return intentSigner.signEnvelope({
      request: {
        ...common,
        type: 'Approve' as const,
        ...(input.reason === undefined ? {} : { approvalReason: input.reason }),
      },
    })
  }
  return intentSigner.signEnvelope({
    request: {
      ...common,
      type: 'Reject' as const,
      rejectReason: input.reason ?? '',
    },
  })
}
