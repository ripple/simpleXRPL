---
feedback:
  hide: true
---

An **intent** represents a request to execute an action within the system, which shall eventually be executed if fully approved. 

In Ripple Custody, all security-critical operations follow the below execution lifecycle:

1. a user submits a properly signed intent to execute an action;
2. Ripple Custody browses through the **policies**, sorted by `rank`, and selects the first **policy** with matching `intentTypes` and `condition`;
3. Ripple Custody validates that the **policy** authorizes the author of the intent to submit it and sets the full approval `workflow` required for execution;
4. Ripple Custody waits for the required quorum of approvals as defined in the selected **policy** `workflow`;
5. Once fully approved, Ripple Custody executes the intent and mutates the state of the system, possibly triggering the execution of a side effect such as the processing of a transaction.

The author of an intent defines, in particular, the following fields:

- `payload`, which sets the `type` of the intent and the details of the operation to process;
- `expiry`, which sets an expiration time to the intent;
- `targetDomainId`, which sets the domain in which to execute the intent (either in the current domain or within a descendant domain);
- `type`, which defines whether the intent is an original submission (`Propose`), an intention to approve an existing intent (`Approve`) or an intention to reject an existing intent (`Reject`).

There exist four intent types for most entities in the system, as prefixed by:

- **Create** to create an entity of a given type;
- **Update** to update the definition of an entity;
- **Lock** to lock an entity;
- **Unlock** to unlock an entity.

Exceptions exist, such as for the release of quarantined **transfers**, which has its dedicated intent called **ReleaseQuarantinedTransfers**.

A generic intent, named **NotarizeData**, allows the submission of intents not related to internal processes of Ripple Custody. Such **intents** may be used to trigger external effects to extend the capabilities of the system, such as to initiate fiat payment orders or trading orders.

## Structure of an intent

There are two request body types to propose an intent:

- Propose an intent request body: Request body to propose a new intent.
- Dry run and signature request body: Request body to perform a dry run of the intent proposal, or add a signature to the propose an intent request body.

Both types include the same set of standard fields and fields that are specific to the intent type.

You can see an example of each request body type in the examples below.

### Standard fields of an intent

The data you need to specify in your request is as follows:

| Field | Description|
| --- |  ------------------------|
|`author.id` | User ID of the intent submitter. |
|`author.domainId` | Domain ID of the intent submitter. For intents that must be submitted in a specific domain, for example, updates to a subdomain name from a parent domain, this ID must correspond to the required domain.<br>The intent follows the approval process defined by the policy at the level of the domain specified and the level of all its parent domains, up to the root. |
|`expiryAt` | Expiry date for the intent, expressed as a data string in format ISO timestamp at zero UTC (`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`). |
|`targetDomainId` | Target domain where the intent is to be executed. Users can submit an intent in the domain they belong to or a subdomain. If the intent is a request to create or update a domain, set this to the parent domain. |
|`id` | A new ID for the intent in a valid UUID format. |
|`payload` | Specific details for the intent type. For more information, see [Specific fields of an intent](#specific-fields-of-an-intent). |
|`description` | An optional human-readable description. |
|`type` | The operation type, `Propose` for proposing an intent. |
| `signature` | A cryptographic signature generated with the intent submitter's private key.  |

### Specific fields of an intent

All the properties that are specific to the type of intent being created (create a domain, update some user details, and so on) are inside the `payload` block.

You can see examples of `payload` blocks in the following sections:

- [Manage your environment](../../api/environment.md)
- [Manage accounting entities](../../api/accounting-entities.md)
- [Perform accounting transactions](../../api/accounting.md)

### Propose an intent request body

The following example shows the request body needed to propose an endpoint creation intent:

```json {% title="Propose an intent request body" %}
{
    "request": {
        "author": {
            "id": "9b672a12-37d1-456a-8d35-57426090a156",
            "domainId": "9067d363-6411-498b-a32b-15d230a86706"
        },
        "expiryAt": "2022-11-19T16:00:01.621Z",
        "targetDomainId": "9067d363-6411-498b-a32b-15d230a86706",
        "id": "00baa536-421e-11ee-be56-0242ac120002",
        "payload": {
            "id": "202c33d0-421e-11ee-be56-0242ac120002",
            "address": "0xD135295cC7562593995202638b8509ba3d108e1",
            "trustScore": 100,
            "ledgerId": "avalanche-chain-testnet-fuji",
            "alias": "New endpoint",
            "lock": "Unlocked",
            "customProperties": {},
            "type": "v0_CreateEndpoint"
        },
        "description": "Test endpoint create",
        "type": "Propose"
    },
    "signature": "<SIGNATURE>"
}
```

### Dry run and signature request body

The following example shows the subset of the [Propose an intent request body](#propose-an-intent-request-body) needed to:
- Perform a dry run of an endpoint creation intent.
- Generate the cryptographic signature for an endpoint creation intent proposal.

```json {% title="Dry run and signature request body" %}
{
    "author": {
        "id": "9b672a12-37d1-456a-8d35-57426090a156",
        "domainId": "9067d363-6411-498b-a32b-15d230a86706"
    },
    "expiryAt": "2022-11-19T16:00:01.621Z",
    "targetDomainId": "9067d363-6411-498b-a32b-15d230a86706",
    "id": "00baa536-421e-11ee-be56-0242ac120002",
    "payload": {
        "id": "202c33d0-421e-11ee-be56-0242ac120002",
        "address": "0xD135295cC7562593995202638b8509ba3d108e1",
        "trustScore": 100,
        "ledgerId": "avalanche-chain-testnet-fuji",
        "alias": "New endpoint",
        "lock": "Unlocked",
        "customProperties": {},
        "type": "v0_CreateEndpoint"
    },
    "description": "Test endpoint create",
    "type": "Propose"
}
```