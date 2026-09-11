# SuNett

Monorepo for **SuNett**, a browser library that renders Guitar Pro tablature as SVG.

## Packages

| Package                                   | Path              | Description                                  |
| ----------------------------------------- | ----------------- | -------------------------------------------- |
| [`@zklau/sunett-engine`](packages/engine) | `packages/engine` | Core renderer + engine (framework-agnostic). |
| [`@zklau/sunett-react`](packages/react)   | `packages/react`  | React adapter (`<SunettTab>`).               |

The `playground/` app is a Vite harness for manual visual testing against the engine source.

## Development

```bash
npm install          # installs all workspaces
npm run build        # builds every package
npm run typecheck    # typechecks every package
npm run test         # runs every package's tests
npm run lint         # oxlint across the repo
```

Run a single package's script with `-w`, e.g. `npm run build -w @zklau/sunett-react`.

## Releasing

Versioning and changelogs are managed with [Changesets](https://github.com/changesets/changesets):

```bash
npx changeset        # describe your change (per package) in a PR
```

Merging the generated **Version Packages** PR publishes the changed packages to npm.
