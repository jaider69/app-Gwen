---
name: Expo package installation
description: Dependency installation constraint for the Gwen Inventario Expo artifact.
---

Expo dependencies belong to the mobile artifact package. Workspace-level package installation can fail because pnpm protects the monorepo root from accidental dependencies.

**Why:** The workspace contains several independent artifacts, so adding an Expo native package at the root creates the wrong dependency boundary and can break artifact-specific bundling.

**How to apply:** Target `@workspace/gwen-inventario` when adding Expo packages, then restart the mobile workflow because Metro must load the new dependency.