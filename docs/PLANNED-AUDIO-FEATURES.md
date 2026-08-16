# Planned Audio Features

Working design notes for the next Ambora audio features. This document records
the decisions made during soundboard planning and is intended to be split into
focused RFCs or implementation issues as each feature begins.

It is not a promise that every item will ship unchanged. Sections marked **Open
question** must be resolved in the corresponding RFC or PR.

## Product principles

### Simple by default

The basic workflow must remain:

```text
drop a file → press Play
```

Importing a sound must produce a usable row immediately. A user who only wants
to play one file should not need to understand retriggering, ducking, speed
variation, groups, buses, or fades.

Default sound settings:

```text
Volume: 70%
Retrigger mode: Restart
Ducking: Off
Speed variation: 0%
Source: Single file
```

### Progressive disclosure

Keep the normal row focused on identity and playback:

```text
◯ G  Gunshot                    70%  ▶  ⚙
```

The row should normally expose only:

- Shortcut or icon.
- Name.
- Volume.
- Play.
- Settings.
- Small status controls for configured features when useful.

Opening Settings reveals common configuration such as retrigger mode, icon,
color, and group files. A nested **Advanced** section contains ducking, speed
variation, and future specialist controls.

An advanced section with no configured features should remain collapsed. If it
contains active configuration, Settings may show a subtle marker or summary.

### Indicators have one meaning

Compact indicators such as `[D]` represent only whether a configurable feature
is enabled. They must not also indicate whether the sound is currently playing
or whether the feature is currently affecting audio.

Example:

```text
[D] dim     Ducking disabled
[D] lit     Ducking enabled
```

Clicking `[D]` may enable or disable ducking without opening Settings. The
button needs a tooltip and accessible name because the letter alone is not
self-explanatory.

Playback remains represented by the existing circular key and progress state.
Do not assign runtime playback meaning to `[D]`.

Other features should receive indicators only after their interaction is
defined. Loop, groups, and variation are not automatically on/off controls and
should not copy the ducking indicator without considering their semantics.

## Recommended delivery order

1. Global Music / Ambient / SFX mixer.
2. Loop retrigger mode.
3. Sound groups.
4. Playback-speed variation.
5. Ducking.
6. Simultaneous scenes.
7. Portable campaigns and external campaign references.

Ducking depends on the mixer. Simultaneous scenes should reuse the mixer buses
and effective-volume calculation. Portable campaigns should follow the
soundboard and scene-model changes so their manifests do not need immediate
redesign.

## 1. Global audio mixer

### Goal

Allow the GM to change the balance of audio categories globally, for example
lowering music without lowering rain or sound effects.

### Classification

Use Ambora's existing structure instead of asking users to classify each file:

| Ambora content | Mixer bus   |
| -------------- | ----------- |
| Climate tracks | **Music**   |
| Ambient Layers | **Ambient** |
| Soundboard     | **SFX**     |

The signal hierarchy is:

```text
Master
├── Music
├── Ambient
└── SFX
```

Per-track, per-layer, and per-sound volume remains relative to its bus. Each bus
is relative to Master.

### UI direction

Master remains the only always-visible global control. The three category
sliders appear in a collapsible Mixer section:

```text
Master       80%
▾ Mixer
  Music      65%
  Ambient    80%
  SFX        90%
```

Users who never expand Mixer keep the current workflow.

### YouTube

YouTube does not pass through the Web Audio graph. Ambora can still calculate
the effective Music level and send it through the IFrame API.

**Current recommendation:** the global Music slider should include YouTube;
otherwise a control labelled Music would behave unexpectedly. If this makes the
first implementation disproportionately complex, a local-audio-only prototype
is acceptable, but the limitation must be explicit and should not become the
final UX silently.

### Risks and acceptance criteria

- Effective volume must compose Master × bus × item volume without modifying
  authored slider values.
- Music, Ambient, and SFX levels must persist as application/session settings as
  decided by the implementation RFC.
- Existing master-volume behaviour must remain intact.
- Remote volume UX must clearly distinguish Master from the expanded mixer.
- YouTube and local music must not drift to visibly different slider states.

Estimated effort: **medium/high**.

## 2. Loop retrigger mode

**Status: implemented.**

### Goal

Allow a campaign-wide soundboard sound to behave as a simple toggled loop: one
key press starts it and the next key press fades it out.

### Behaviour

Add `loop` as a fifth retrigger mode:

| Mode       | Trigger while active                 |
| ---------- | ------------------------------------ |
| `ignore`   | Do nothing.                          |
| `stop`     | Stop without starting again.         |
| `restart`  | Stop and restart from the beginning. |
| `multiple` | Start another independent voice.     |
| `loop`     | Fade out and stop the active loop.   |

For `loop`, the first trigger starts a looping voice. The next trigger applies
a fixed 400ms fade-out and stops it. There is no editable fade duration or curve.

### UI direction

Loop belongs in the normal retrigger selector because it changes the primary
button/key interaction. It is not an Advanced setting.

The circular sound key remains illuminated while the loop is active. It should
not show finite duration progress because the loop has no natural end. Desktop
and phone show a slowly rotating half-ring, or a static half-ring when reduced
motion is enabled.

### Initial constraint

Keep Loop limited to a single file in the first version. Do not combine it with
sound groups until a clear rule exists for choosing and changing loop clips.

### Risks and acceptance criteria

- Desktop, keyboard, and phone must share the same active loop state.
- A second trigger must fade and stop the loop deterministically.
- Changing campaign, deleting the sound, or shutting down playback must not
  leave an orphaned loop.
- Master and SFX bus changes must affect an active loop.

Estimated effort: **medium**.

## 3. Sound groups

### Goal

Allow one soundboard slot to contain several similar recordings, such as door
noises, footsteps, gunshots, screams, or impacts, so repeated triggers do not
sound identical.

### Model direction

Evolve a sound from one file toward a list of clips:

```ts
interface SoundboardClip {
  id: string
  title: string
  localFilePath: string
  duration?: number
  order: number
}

type SoundboardClipOrder = 'shuffle' | 'random' | 'sequential'
```

Reuse the selection semantics already used by Ambient Layers:

- **Shuffle bag** by default: use every clip once before repeating and avoid
  carrying the same clip across a cycle boundary.
- **Random**: independent choice on each trigger.
- **Sequential**: stored order.

Single-file sounds should remain visually and conceptually simple. Internally,
the migration may represent them as one clip, but the UI should not force the
user to create a "group" manually for the common case.

### UI direction

Settings exposes Source as Single file or Sound group. When Sound group is
selected, show the selection method and a reorderable file list. Adding more
files to a single sound may offer to convert it into a group.

Any compact group marker must describe configuration, not runtime state. A
summary such as `4 files` is clearer than an unexplained toggle.

### Risks and acceptance criteria

- Existing single-file campaigns must migrate without user action.
- Retrigger modes must operate on the selected clip and active voices correctly.
- Export/import must preserve clips, order, and selection method.
- Missing files should identify the affected clip rather than invalidating the
  entire group.
- Loop + group remains unsupported initially.

Estimated effort: **medium/high**.

## 4. Playback-speed variation

**Status: implemented for Soundboard sounds and Ambient Layers.**

### Goal

Introduce small per-trigger differences so repeated effects such as gunshots,
impacts, or creature noises feel less mechanical.

### Behaviour

Store a symmetric percentage range, disabled by default:

```text
Speed variation: 5%
Playback rate per trigger: random value from 0.95× to 1.05×
```

Use `AudioBufferSourceNode.playbackRate`. Speed variation also changes pitch;
that is desirable for this use case and does not require separate pitch
processing.

Recommended initial range: 0–20%. Apply a fresh random value to every voice,
including voices created by `multiple`, Ambient Layer triggers, and clips
selected from a group.

Loop voices are the deliberate exception to per-cycle variation: they draw one
rate when activated and keep it through every repeat to preserve a clean loop
boundary. A later activation draws a new rate.

### UI direction

Soundboard exposes a compact `Pitch ±N%` authoring control in its expanded row.
Ambient Layers expose the same range in their expanded settings. At 0%, the
feature is inactive and adds no runtime processing beyond the normal source.

### Risks and acceptance criteria

- The progress indicator must use duration adjusted by playback rate.
- Retrigger and end events must follow the actual adjusted duration.
- Values must be clamped during load/import as well as in the UI.
- Variation is applied per trigger and never rewrites the source file.

Estimated effort: **low/medium**.

## 5. Ducking

### Goal

Allow an important SFX voice to temporarily lower Music and Ambient while
leaving other SFX untouched. Example: make a gunshot dominate a jazz-club scene
without lowering other simultaneous impacts.

### Percentage semantics

Store the **background volume remaining**, not the amount subtracted:

```text
Background volume while playing: 40%
```

While the sound has an active voice:

```text
Music   → 40% of its otherwise effective volume
Ambient → 40% of its otherwise effective volume
SFX     → unchanged
```

- 100% produces no audible reduction.
- 40% leaves Music and Ambient at 40%.
- 0% fully mutes Music and Ambient.

Ducking has a separate enabled flag so the configured percentage can be kept
while temporarily disabled.

### Multiple duckers

The lowest active background percentage wins:

```text
Gunshot configured at 60%
Explosion configured at 40%
Both active → background at 40%
Explosion ends → background returns to 60%
Gunshot ends → background returns to 100%
```

Ducking begins when the voice actually starts, not when a file begins loading.
It ends when that voice finishes or is stopped. With `multiple`, ducking remains
until the last active voice from that sound ends.

Never implement ducking by overwriting stored Music or Ambient slider values.
It is a runtime multiplier composed with Master, bus, and item volume.

### UI direction

The expanded Advanced settings show:

```text
⏻ Ducking              Enabled

Background volume
40%  ─────●────────────
```

The compact row may expose `[D]` as an enable/disable button:

```text
[D] dim     Ducking disabled
[D] lit     Ducking enabled
```

`[D]` does not illuminate when ducking is currently engaged. Playback runtime
continues to use the circular key indicator. Disabling `[D]` while the sound is
playing must immediately recompute the remaining active ducking level.

### YouTube

The first implementation may ignore YouTube for ducking if reliable runtime
volume changes add too much complexity. Local Music and Ambient remain the MVP.
This limitation matters for scenes whose music is a YouTube track and must be
visible in the feature documentation.

**Open question:** after the mixer supports YouTube volume, determine whether
ducking can reuse that effective-volume calculation without introducing
noticeable latency or jumps. If it can, include YouTube rather than preserving
an artificial limitation.

### Risks and acceptance criteria

- Concurrent duckers must always resolve to the minimum active percentage.
- Stop, Restart, Multiple, deletion, campaign changes, and playback errors must
  release their ducking contribution correctly.
- Other SFX must never be reduced.
- Disabling ducking at runtime must take effect immediately.
- A short fixed attack/release may prevent volume jumps; keep it non-configurable
  initially.

Estimated effort: **high**.

## 6. Simultaneous scenes

### Goal

Allow two or more scenes (currently called Climates in the data model) to play
at the same time and to be stopped independently. This makes scene composition
possible without duplicating audio configuration.

For example, a tavern and exterior rain remain independent scenes:

```text
TAVERN
  music:
    medieval_tavern_01
    medieval_tavern_02
  ambient:
    crowd       loop
    fireplace   loop

RAIN
  music:
    <empty>
  ambient:
    rain        loop
    thunder     random
    wind        random
```

The GM can start `TAVERN`, add `RAIN`, and later stop only `RAIN` without
interrupting the tavern music, crowd, or fireplace.

### Playback actions

Every scene needs three explicit actions:

- **Play / Stop independently** — start a scene without affecting any other
  active scene; once active, stop only that scene.
- **Stop all** — stop every active scene. This preserves the purpose of the
  current bottom playback button.
- **Play exclusively** — stop every active scene and start the selected scene.
  This preserves the current one-scene-at-a-time behaviour but moves it to a
  separate icon and accessible action.

The independent Play/Stop and exclusive-play controls must use visibly
different icons, tooltips, and accessible labels. The exact exclusive-play icon
is an **open question** for the UI RFC; it must communicate replacement rather
than ordinary playback.

### State and audio direction

- Replace the single `activeClimateId` assumption with a collection of active
  scene IDs and per-scene runtime state.
- Each active scene owns its music playlist and Ambient Layer runtime; stopping
  one scene must release only its own tracks, timers, random layers, and fades.
- Starting a scene additively must not crossfade or restart scenes that are
  already active.
- Exclusive play should fade out all active scenes and start the requested
  scene using a clearly defined transition.
- Stop All must cancel every active scene, random timer, pending load, and
  looping layer deterministically.
- Desktop and phone must expose the same set of active scenes and playback
  actions through Zustand, IPC, and WebSocket state.
- Mixer levels remain global; authored track and layer volumes remain local to
  their scenes.

### Risks and acceptance criteria

- The current dual-channel music engine assumes one active climate and will
  need a per-scene player/crossfade strategy rather than one global A/B pair.
- Starting or stopping rain must not alter tavern playback position or volume.
- Random layers from a stopped scene must never fire later.
- Campaign switches, deletion, missing files, and shutdown must clean up every
  active scene without orphaned audio.
- Existing campaigns continue to behave as before when the user chooses Play
  Exclusively.

Estimated effort: **very high**.

## 7. Portable campaigns and external campaign references

### Goal

Allow a user to choose a folder as a self-contained campaign, move that folder
to another computer, and open it with names, settings, and audio intact.

The application-level `campaigns.json` must support both storage models:

- **Inline campaigns** — preserve the current format, where complete campaign
  objects live directly inside `campaigns.json`.
- **Referenced campaigns** — allow the index to point to one or more external
  `campaign.json` files, particularly manifests inside portable campaign
  folders.

Backward compatibility is mandatory: the current root array remains valid and
must load without migration. A future indexed form may contain both inline
campaign objects and references, for example:

```json
{
  "version": 2,
  "campaigns": [
    { "type": "inline", "campaign": {} },
    { "type": "reference", "path": "../Copper Creek/campaign.json" }
  ]
}
```

This example records the intended capability, not a final schema. The data RFC
must decide versioning, relative versus absolute reference paths, duplicate
campaign IDs, unavailable references, and whether external manifests are
watched or loaded only on demand.

### Folder direction

A portable campaign may use a structure such as:

```text
My Campaign/
├── campaign.json
├── music/
├── ambient/
└── sfx/
```

All manifest paths are relative to the campaign folder. Ambora should support
both creating a campaign in a selected folder and opening an existing folder as
a campaign.

When adding media, Ambora copies it into the appropriate folder rather than
retaining a machine-specific absolute source path. The folder becomes the
portable source of truth.

### UX direction

Keep current lightweight campaigns available. Portability should be an explicit
campaign choice or conversion action, not a mandatory folder prompt for every
new user.

Possible actions:

- **Create portable campaign in folder…**
- **Convert campaign to portable folder…**
- **Open campaign folder…**
- **Show campaign folder**

### Risks and acceptance criteria

- Prevent path traversal and unsafe extraction (`../`, absolute paths, links
  escaping the campaign directory).
- Handle duplicate filenames and content reused in multiple places.
- Use atomic manifest writes and recover from interrupted copies.
- Define what happens when a user edits or removes files outside Ambora.
- Respect macOS folder permissions and persistent access requirements.
- Preserve compatibility with current metadata-only `.ambora` export/import.
- Preserve compatibility with the current inline `campaigns.json` root array.
- Load multiple external `campaign.json` references without copying their
  campaign objects or audio into the application data directory.
- Report missing, moved, malformed, or duplicate referenced campaigns without
  preventing valid inline or referenced campaigns from loading.
- Clearly distinguish copying a campaign folder from importing an archive.

**Open questions:**

- Whether the portable folder replaces or complements `.ambora` archives.
- Whether external files can remain linked or must always be copied.
- Whether Ambora watches the folder for external changes.
- How unused media is detected and cleaned without risking user files.

Estimated effort: **very high**.

## Related ideas outside this sequence

These ideas were discussed but are not part of the seven-feature delivery order:

### Temporary scenes

Current Ambora can model rain plus automatic/manual thunder with a normal
Climate containing Loop, Random, and One-shot Ambient Layers. It does not yet
have an ephemeral scene that can be discarded after a session.

A future temporary-scene workflow might start empty or duplicate the current
climate, then offer **Save as climate** or **Discard**.

### Climate keyboard shortcuts

Letters remain assigned to soundboard sounds. A future climate shortcut feature
could reserve `F1`–`F12`, subject to laptop Fn behaviour and operating-system
conflicts. Numbers remain reserved for future loops or session controls.

### Internet radio streams

Direct Icecast/Shoutcast-style MP3, AAC, or Ogg stream URLs may eventually
provide location/period "radio" without local downloads. This is preferable to
deep Spotify integration and more predictable than YouTube playlists, but needs
separate work around connectivity, metadata, formats, and crossfades.
