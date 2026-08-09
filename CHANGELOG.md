# Changelog

All notable changes to Level are documented here.

## 1.0.1 — 2026-08-09

### Fixed

- Fixed a first-run popup race that could show "Ready to level" after audio processing had already started.
- Prevented duplicate capture attempts when Level is already active on a tab.
- Corrected the misleading protected-page error shown for an existing active stream.
- Resynchronised popup controls automatically after a failed start or stop request.

## 1.0.0 — 2026-08-09

### Added

- Adaptive loudness levelling powered by a dedicated AudioWorklet.
- Balanced, Dialogue, Cinema, and Night listening modes.
- Fast peak control and configurable output safety ceiling.
- Dialogue presence and low-frequency cleanup filters.
- Per-site mode and volume memory.
- Live control of audible tabs.
- Persistent processing across navigation in an activated tab.
- Keyboard shortcut, accessible popup, and advanced settings page.
- Fully local processing with no accounts, telemetry, advertisements, or remote code.
