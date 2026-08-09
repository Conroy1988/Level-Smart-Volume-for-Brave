# Level testing guide

## Automated checks

Run:

```bash
npm run assets
npm run check
npm run package
```

The checks validate JavaScript syntax, Manifest V3 requirements, packaged file references, CSP-safe HTML, version consistency, and deterministic adaptive-controller behaviour.

## Manual browser matrix

Test on the current stable Brave release and at least one current Chromium release.

| Scenario | Expected result |
|---|---|
| Start on a normal HTTPS audio tab | Badge shows ON; audio continues; popup shows active |
| Close popup | Audio remains processed |
| Navigate within the captured tab | Audio remains processed |
| Stop Level | Original tab audio path returns immediately; badge clears |
| Close captured tab | Session is removed without affecting other tabs |
| Activate two audible tabs | Each has independent mode, output, meter, and stop control |
| Open `brave://settings` | Start control is disabled with protected-page explanation |
| Quiet speech after silence | Gain rises smoothly rather than jumping |
| Sudden loud transition | Gain reduces quickly; output does not audibly clip |
| Prolonged silence | Gain returns towards unity; room noise is not held at maximum lift |
| Switch all four modes | Filters and dynamics change without clicks or stream restarts |
| Adjust output rapidly | Audio changes smoothly; final value persists |
| Enable website memory | Mode/output return when Level is next opened on that domain |
| Disable website memory | Domain shows memory off and does not inherit the default offer |
| Keyboard shortcut | Current tab toggles without opening the popup |
| Browser restarts | Stale active-session state is absent |

## Source material

Use legally accessible test material that contains:

- low-level spoken voice;
- voice over background music;
- wide-dynamic-range film material;
- compressed music;
- isolated transients;
- digital silence and low room tone.

Do not judge Level solely with synthetic tones. The controller is intentionally tuned around programme behaviour over time.

## Listening safety

Begin testing with the operating-system output at a conservative level. Maximum extension output is 200%, and test devices/headphones can vary dramatically in sensitivity.
