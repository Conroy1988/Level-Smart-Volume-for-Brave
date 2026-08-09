# Chrome Web Store listing kit

## Product name

**Level — Smart Volume for Brave (Unofficial)**

## Summary

Quiet dialogue up. Sudden blasts down. Private automatic volume levelling for every tab.

## Category

Accessibility

## Language

English (United Kingdom)

## Detailed description

Stop chasing the volume control.

Level automatically smooths inconsistent web audio: quiet dialogue becomes easier to hear, loud transitions are contained, and every activated tab stays closer to the volume you actually wanted.

Unlike a basic volume booster, Level continuously adapts. It raises sustained quiet material gradually, reduces loud changes quickly, shapes voices in Dialogue mode, and catches peaks before they become harsh.

FOUR LISTENING MODES

• Balanced — natural levelling for everyday web audio  
• Dialogue — clearer speech with less low-frequency muddiness  
• Cinema — controlled surprises while preserving impact  
• Night — stronger containment for late listening

BUILT FOR CONTROL

• Adjustable output from 50% to 200%  
• Per-website mode and output memory  
• Live loudness and gain display  
• Quick navigation between audible tabs  
• Customisable automatic-lift and peak ceiling limits  
• Ctrl+Shift+L keyboard shortcut

PRIVATE BY DESIGN

Audio processing happens entirely on your device. Level does not record or upload audio. It has no accounts, servers, tracking, analytics, advertisements, or subscriptions. All executable code is packaged with the extension.

Brave requires you to activate audio processing for each fresh tab. After activation, Level keeps working when the popup closes and through navigation in that tab.

Level works with Brave and compatible Chromium browsers version 116 or newer. It cannot run on protected internal browser pages and does not process system-wide or microphone audio.

Level is an independent, unofficial extension and is not affiliated with or endorsed by Brave Software, Inc.

## Single purpose statement

Level processes the audio of a user-activated browser tab locally to make its perceived volume more consistent and its dialogue easier to understand.

## Permission justifications

### `tabCapture`

Required to receive audio from the specific browser tab on which the user activates Level. Capture is initiated only following a direct user action.

### `offscreen`

Required to maintain the local Web Audio processing graph after the extension popup closes and while the activated tab navigates.

### `activeTab`

Required by Chromium to grant temporary access to the tab where the user invoked Level and from which the audio stream ID is requested.

### `tabs`

Required to identify the current tab, display currently audible tabs, retain readable session labels, and store an optional preference by website hostname. Level does not collect or upload browsing history.

### `storage`

Required to store extension settings, optional website profiles, and current-session metadata inside the user's browser profile.

## Remote code declaration

No. Level does not use or load remote code. All JavaScript and AudioWorklet code is included in the submitted package.

## Data-use disclosure

Level handles website information (the hostname and title of current/audible tabs) and user-generated configuration (settings and site preferences) solely to provide its user-facing features. This data is stored locally and is not transmitted. Tab audio is processed transiently in memory and is neither stored nor transmitted.

Chrome Web Store data categories: **Web history** (current/audible tab hostname and title) and **Website content** (the activated tab's transient audio stream). These categories apply even though all handling is local.

Data is not sold, used for advertising, used for creditworthiness or lending, transferred for unrelated purposes, or used outside Level's single purpose.

## Assets

- Icon: `assets/icons/icon-128.png`
- Small promotional tile: `assets/store/promo-small.png` (440 × 280)
- Marquee promotional tile: `assets/store/promo-marquee.png` (1400 × 560)
- Screenshot 1: `assets/store/screenshot-01.png` (1280 × 800)
