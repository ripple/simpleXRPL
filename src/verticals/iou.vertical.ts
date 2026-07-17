import type { SubmissionHost } from '../pipeline/index.js'

import { IOU } from './iou.js'
import type { IOUIssueParams } from './iou.types.js'

/**
 * The `IOU` vertical entry point: issues new IOUs. Exposed as `client.iou`.
 * The returned {@link IOU} handle carries the remaining lifecycle methods
 * (`authorize`, `lock`, `unlock`, `clawback`, `transfer`, and DEX offers).
 */
export class IOUVertical {
  private readonly host: SubmissionHost

  /**
   * Construct the IOU vertical entry point.
   *
   * @param host - The client the pipeline runs against.
   */
  public constructor(host: SubmissionHost) {
    this.host = host
  }

  /**
   * Issue a new IOU. See {@link IOU.issue}.
   *
   * @param params - The ticker to issue.
   * @returns The issued IOU handle.
   */
  public async issue(params: IOUIssueParams): Promise<IOU> {
    return IOU.issue(this.host, params)
  }
}
