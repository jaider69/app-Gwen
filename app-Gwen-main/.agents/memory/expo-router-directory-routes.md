---
name: Expo Router directory routes
description: Expo Router route registration behavior for directory index screens.
---

When an Expo Router screen lives at `app/<folder>/index.tsx`, register it in an explicit stack with `name="<folder>/index"` rather than `name="<folder>"`.

**Why:** Metro can run while emitting a route warning and the named stack screen is not recognized, even though the folder route appears in the generated route list.

**How to apply:** Use the explicit `folder/index` name for directory-based screens; keep dynamic children such as `folder/[id]` registered separately.