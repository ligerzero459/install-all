# Plan: Migrate clui → ink with 6-box dashboard UI

## TL;DR

Replace `clui`'s imperative `LineBuffer`/`Line`/`Progress` with an Ink React component tree. Layout: 2-column flexbox — primary box on the left (figlet header, progress bar, active installs list) and 5 stdout boxes stacked on the right, one per concurrency slot. Switch `execFile` → `spawn` in `install.js` to stream stdout live into each slot's box. Progress now increments on install completion (not start). No build step — use `React.createElement` in plain ESM `.js` files.

---

## Decisions

- **JSX**: `React.createElement` calls — no Babel/esbuild needed
- **Module system**: Convert to ESM (`"type": "module"`) — required since ink v6 is ESM-only
- **Progress**: Increment `installed` count AFTER `runInstall` resolves (on close), not before
- **Idle slots**: Empty/blank (no placeholder text)
- **figlet**: Keep in primary box, same behavior
- **UI components**: Use `@inkjs/ui` v2 (`ProgressBar`, `Spinner`) — confirmed compatible with ink v6 (`peerDependencies: { "ink": ">=5" }`). Default theme is sufficient; no `ThemeProvider` needed.
- **Tests**: Update all tests for new ESM + spawn + ink architecture

---

## Phase 1: ESM conversion + dependency swap

1. In `package.json`: add `"type": "module"`, add `react` + `ink` + `@inkjs/ui` to `dependencies`, remove `clui`
2. New `jest.config.js` for ESM: `transform: {}`, `extensionsToTreatAsEsm: ['.js']`, update test script to use `NODE_OPTIONS=--experimental-vm-modules`
3. Convert `src/cli.js`: `require` → `import`, `module.exports` → `export`
4. Convert `src/directory.js`: same ESM conversion
5. Convert `src/install.js`: same ESM conversion (spawn change is Phase 2)
6. Delete `src/console.js` (all UI moves to Ink) and `src/__tests__/console.test.js`

## Phase 2: Refactor install.js (spawn + onData)

7. Replace `util.promisify(execFile)` with `spawn` from `child_process`
8. New signature: `runInstall(dir, pm, options, onData)` — `onData(chunk: string)` called for each stdout/stderr data chunk
9. On `child.on('close', code)` → resolve `{ success: true }` or `{ success: false, error }` — same public contract as before
10. Update `src/__tests__/install.test.js`: mock `child_process.spawn` instead of `execFile`

## Phase 3: Create src/App.js (Ink component)

11. New file `src/App.js` — exports `App` component using `React.createElement`
12. **State shape:**
    ```
    {
      installed: number,     // completed (success + failure)
      failed: number,
      total: number,
      slots: Map<0..4, { dir: string, lines: string[] }>,
      done: boolean,
    }
    ```
13. **`@inkjs/ui` components**:
    - `import { ProgressBar } from '@inkjs/ui'` — `<ProgressBar value={pct} />` where `value` is 0–100
    - `import { Spinner } from '@inkjs/ui'` — `<Spinner label={dir} />` for active install entries in the primary box
14. **Layout:**
    - Root `<Box flexDirection="row">` fills terminal
    - **Left** `<Box borderStyle="round" width="50%" flexDirection="column">`:
      - figlet text as `<Text>`
      - `<Box width={40}><ProgressBar value={Math.round(installed/total * 100)} /></Box>`
      - `<Text>` showing `installed/total (N failed)`
      - For each active slot: `<Spinner label={dir} />` (idle slots omitted)
    - **Right** `<Box flexDirection="column" width="50%">`:
      - 5 child boxes, each `flexGrow={1} borderStyle="single" overflowY="hidden"`:
        - `<Text dimColor>` slot dir title (or empty if idle)
        - `<Text>` showing last ~20 lines of stdout output
15. App receives `dirs`, `isClean`, `onComplete(errors[])` as props
16. `useEffect` (run once on mount): starts `async.eachLimit(dirs, 5, ...)` with slot assignment; increments `installed` *after* each `runInstall` resolves

## Phase 4: Rewrite index.js

17. Remove all `clui` / `ConsoleUtils` / `LineBuffer` / `Progress` code
18. `render(<App dirs={dirs} isClean={isClean} onComplete={...} />)` → `await waitUntilExit()` → write error log + `process.exit(1)` if failures
19. Progress increment logic lives inside App's slot management (on close)

## Phase 5: Update remaining tests

20. `src/__tests__/index.test.js` — major rewrite: mock `ink` (`render` returns `{ waitUntilExit: jest.fn() }`), assert error log and exit behavior
21. `src/__tests__/cli.test.js` — ESM import updates
22. `src/__tests__/directory.test.js` — ESM import updates
23. Delete `src/__tests__/console.test.js`

---

## Affected Files

| File | Change |
|---|---|
| `package.json` | Add `react`, `ink`, `@inkjs/ui`; remove `clui`; add `"type": "module"`; update test script |
| `index.js` | Full rewrite |
| `src/install.js` | `execFile` → `spawn`, add `onData` param |
| `src/console.js` | **Delete** |
| `src/cli.js` | ESM conversion |
| `src/directory.js` | ESM conversion |
| `src/App.js` | **New** — Ink 6-box dashboard component |
| `jest.config.js` | **New** — ESM Jest config |
| `src/__tests__/install.test.js` | Mock `spawn` instead of `execFile` |
| `src/__tests__/index.test.js` | Major rewrite |
| `src/__tests__/console.test.js` | **Delete** |
| `src/__tests__/cli.test.js` | Minor ESM updates |
| `src/__tests__/directory.test.js` | Minor ESM updates |

---

## Verification

1. `npm test` — all tests pass
2. `node index.js` in a directory with multiple nested `package.json` files — 6-box dashboard renders live
3. Progress bar only advances as installs *complete* (not when they start)
4. Live stdout streams into the 5 right-side boxes as installs run
5. Slots go blank when an install finishes and no new one takes the slot
6. Error log still written to `$HOME` on failures, `process.exit(1)` still fires

---

## Further Considerations

1. **stdout line cap**: Cap each slot's `lines[]` to the last ~20 lines to prevent unbounded memory growth and vertical overflow in fixed-height boxes
2. **Terminal height**: On small terminals the 5 stdout boxes will be very short — use `overflowY="hidden"` per slot box and consider a `minHeight` guard
3. **async ESM import**: `async` v3 is dual CJS/ESM. Import as `import eachLimit from 'async/eachLimit.js'` (direct ESM entry) to avoid the default CJS import issue
