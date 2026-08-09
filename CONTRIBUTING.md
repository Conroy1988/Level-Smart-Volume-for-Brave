# Contributing to Level

Thanks for helping make web audio less hostile.

## Development setup

1. Install Node.js 20 or newer.
2. Run `npm run assets` if the source artwork changed.
3. Run `npm run check`.
4. Open `brave://extensions`, enable Developer mode, choose **Load unpacked**, and select the repository root.

## Pull requests

- Keep all processing local and dependency-free at runtime.
- Do not add remote scripts, analytics, advertisements, accounts, or unnecessary permissions.
- Add or update tests for audio-control logic.
- Test silence, speech, music, sudden peaks, navigation, and tab closure.
- Explain user-visible changes in `CHANGELOG.md`.

By contributing, you agree that project maintainers may include your contribution in distributed builds of Level.
