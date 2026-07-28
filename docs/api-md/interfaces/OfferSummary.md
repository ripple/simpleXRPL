# Interface: OfferSummary

Defined in: [reads/offers.ts:30](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/reads/offers.ts#L30)

A shaped open offer. `amount`/`price` mirror the `buyOffer`/`sellOffer` input
format (XRP auto-converted from drops), so an offer read here is directly
composable back into those write verbs.

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [reads/offers.ts:34](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/reads/offers.ts#L34)

The quantity of the base asset (the IOU/token being traded).

***

### offerSequence

> `readonly` **offerSequence**: `number`

Defined in: [reads/offers.ts:32](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/reads/offers.ts#L32)

The offer's sequence number (pass to `cancelOffer`).

***

### orderType

> `readonly` **orderType**: `"limit"` \| `"passive"`

Defined in: [reads/offers.ts:38](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/reads/offers.ts#L38)

Resting offers are `limit`, or `passive` when the passive flag is set.

***

### price

> `readonly` **price**: [`IOUOfferPrice`](../type-aliases/IOUOfferPrice.md)

Defined in: [reads/offers.ts:36](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/reads/offers.ts#L36)

What is paid/received for it, in `buyOffer`/`sellOffer` price form.

***

### type

> `readonly` **type**: `"buy"` \| `"sell"`

Defined in: [reads/offers.ts:40](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/reads/offers.ts#L40)

Whether the offer buys or sells the base asset.
