# Level privacy policy

**Effective:** 9 August 2026

Level — Smart Volume for Brave (Unofficial) is designed so its central function does not require the developer to receive audio or browsing data.

## Audio processing

Only after the user activates Level for a tab, the browser provides Level with that tab's audio stream. Level processes that stream locally in browser memory and immediately plays the adjusted audio through the user's device.

Level does not record, retain, transmit, sell, or share audio.

For Chrome Web Store disclosure purposes, this transient local audio processing is classified as handling **website content**. It is used only to provide Level's user-facing audio controls.

## Data stored locally

Level uses the browser extension storage API to store:

- general extension settings;
- selected listening modes and output percentages;
- optional per-website preferences, indexed by website hostname;
- the hostname and page title of the current or audible tab, used to show the user which tab Level will control;
- active-session metadata for the current browser session.

This information remains in the user's browser profile. Website preferences can be removed individually or cleared together from the settings page.

For Chrome Web Store disclosure purposes, handling a tab hostname or title is classified as **web history**. Level does not build, retain, or transmit a general browsing-history record.

## Network activity

Level has no server component and makes no analytics, telemetry, advertising, account, tracking, or audio-processing network requests. Its runtime contains no remotely hosted executable code.

## Browser permissions

- `tabCapture` provides the audio stream for the tab explicitly activated by the user.
- `offscreen` keeps the local processing graph active after the popup closes.
- `activeTab` grants access to the tab where the user invoked Level.
- `tabs` identifies current and audible tabs, reads the active page hostname for optional website preferences, and maintains session labels across navigation.
- `storage` saves settings and website preferences in the browser profile.

Level does not request broad website host permissions.

## Disclosure and sale

Level does not sell, rent, transfer, or disclose personal data to third parties. It contains no advertising SDK, analytics SDK, or third-party tracking code.

Level's use of information received from browser APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is used only to provide or improve Level's single, user-facing purpose.

## Children

Level is not designed to collect personal data from anyone, including children.

## Changes

If Level's data practices materially change, this document and the browser-store privacy disclosure will be updated before that changed version is distributed.

## Contact and security

Privacy questions can be raised through the project's GitHub repository. Suspected security vulnerabilities should use GitHub private vulnerability reporting rather than a public issue.
