# Demo provider

`src/lib/demo-provider.ts` is a fully in-memory provider for the product demo. It has no network access, does not read credentials, and never runs user-supplied command text.

The provider starts from fixed seed data, emits a fixed sequence through `advance()`, and turns a user command into a visible `user.command.sent` / `user.command.response` pair. Its reducer and contracts are provider-neutral, so a durable or live provider can publish the same `WarehouseEvent` objects later.

`getSnapshot()` returns a defensive copy; callers should treat every snapshot and event as immutable.
