# RFC: Campaign Soundboard

Iterated design for campaign-wide, keyboard-triggered one-shot sound effects.

## Problem

Ambora can build a continuous soundscape from music and ambient layers, but a
GM also needs sounds that happen at an exact dramatic moment: thunder after a
spell, a bell at midnight, a door slam, footsteps behind the players, or a
creature's roar. These effects do not belong in a climate playlist or on an
automatic ambient schedule, and finding the right file in a media player during
play is too slow.

The control must remain immediately available without consuming most of the
campaign screen. It must work from the desktop keyboard and from the phone
remote, while keeping local filesystem paths on the computer that owns them.

## Design

Each Campaign gains an optional list of **Soundboard Sounds**. A sound is one
local audio file, an optional letter shortcut, a relative volume, an optional
Lucide icon and color, and a rule for repeated triggers.

Unlike Ambient Layers, soundboard sounds are campaign-wide. They remain
available when the active climate changes because effects such as bells,
weapons, doors, and footsteps are useful across many scenes.

### Retrigger modes

| Mode         | Behaviour                                                                  |
| ------------ | -------------------------------------------------------------------------- |
| **Ignore**   | Does nothing while an instance is already playing.                         |
| **Stop**     | A new trigger stops the active sound without starting another.             |
| **Restart**  | Stops active instances and starts again from the beginning (default).      |
| **Multiple** | Starts a new independent instance on every trigger; instances may overlap. |

These modes cover the common one-shot behaviours without making the GM manage
audio voices directly. More specialized behaviours, such as loops or
press-and-hold playback, remain separate future concepts.

### Keyboard convention

- Only Unicode letters are accepted in the first version.
- Shortcuts use `KeyboardEvent.key`, not physical `KeyboardEvent.code`, so the
  assignment follows the character produced by the active keyboard layout.
- The stored letter is normalized to lowercase.
- Pressing the letter plays at the sound's configured volume.
- Pressing Shift plus the letter plays the same sound at 100%.
- Shift is not stored as part of the shortcut.
- Ctrl, Alt, and Meta combinations are ignored.
- Repeated `keydown` events are ignored.
- Events from text inputs, textareas, and editable content are ignored, so
  editing a name cannot fire an effect. A focused select still allows shortcuts.
- Each letter can be assigned to only one sound in a campaign.

Associating the produced letter rather than a physical key avoids pretending
that every connected keyboard has the same layout. A sound assigned to `n`
works wherever the user can type `n`; layout-specific characters are not part
of the first version.

Numbers are deliberately reserved for future session controls or loop slots. A
full graphical keyboard is not part of the design: it consumes too much space
and introduces misleading physical-layout assumptions.

### Scope decisions

- **Soundboard sounds are local files only.** One-shots need low latency and
  reliable overlapping playback; YouTube players cannot provide either.
- **Sounds belong to a campaign** (`campaign.soundboard[]`), not a climate, so
  the same effect remains available throughout a session.
- **One sound represents one file.** Random clip groups and scheduled playback
  already belong to Ambient Layers.
- **No LUFS normalization.** Short effects are poor candidates for gated LUFS
  measurement. Per-sound volume is the authored control.
- **The shortcut is optional.** A sound without a letter can still be played
  from its desktop button or its icon on the phone.

### Data model

```ts
type SoundboardPlaybackMode = 'ignore' | 'stop' | 'restart' | 'multiple'

interface SoundboardSound {
  id: string
  name: string
  localFilePath: string
  volume: number // 0–100, relative to master
  shortcutKey?: string // one Unicode letter, stored lowercase
  icon?: string // curated Lucide identifier
  iconColor?: string // #RRGGBB
  playbackMode: SoundboardPlaybackMode
  duration?: number
  order: number
}

interface Campaign {
  // …existing fields
  soundboard?: SoundboardSound[] // optional — old campaigns load unchanged
}
```

`soundboard` is optional, so existing `campaigns.json` files load without a
migration step. Missing `playbackMode` values from early development data fall
back to `restart`; the default authored volume is 70%.

### Audio architecture

A dedicated `SoundboardEngine` runs beside `AudioEngine` and `AmbientEngine` and
shares the renderer's `AudioContext`. It does not participate in music
crossfades or climate activation.

```
sound file ──decode once──▶ AudioBuffer cache
                                  │
                    AudioBufferSourceNode (per voice)
                                  │
                       per-voice gain ── sound volume
                                  │
                         soundboard master gain
                                  │
                              destination
```

Files are decoded into cached `AudioBuffer`s. Every playback voice receives its
own source and gain nodes, which makes `multiple` genuinely polyphonic. A short
30ms gain ramp is used when stopping voices so `stop` and `restart` do not click.

**Master volume governs the soundboard.** Per-sound volume is relative to the
app master, so the desktop and phone master controls still mean "the complete
soundscape". Shift bypasses only the per-sound volume; it does not bypass the
master.

Loading is included in retrigger semantics. For example, `ignore` will not
start a second decode while the first trigger is loading, and a `stop` or
`restart` invalidates an older pending trigger before it can begin late.

### Runtime state is ephemeral

Playback voices are not persisted in Zustand or `campaigns.json`. The engine
publishes an activity event for each sound containing:

```ts
interface SoundboardActivity {
  playing: boolean
  voiceCount: number
  startedAtMs?: number // newest voice
  durationMs?: number // newest voice
}
```

Desktop and phone indicators derive from that runtime event. In `multiple` mode
the progress ring follows the newest voice, the sound remains active until all
voices end, and the desktop shows an `xN` badge for overlapping instances.

## Desktop UI

The campaign screen gains a bottom-docked soundboard above Now Playing and
outside the campaign scroll. Keeping it at the bottom makes its position stable
while climates and tracks change.

The dock remembers one of three modes in `localStorage`:

- **Expanded** — editable rows in a scroll-limited panel.
- **Compact** — a small six-column pad showing only circular sound keys.
- **Hidden** — header only; keyboard shortcuts remain active.

From the hidden header, separate actions open the compact pad or the full editor
directly. The user does not have to cycle through intermediate modes.

```
EXPANDED
┌────────────────────────────────────────────────────────────┐
│ Soundboard                         + Folder  + Files   —  ▦ │
├────────────────────────────────────────────────────────────┤
│ ◯ H  Bell       ───●── 70%  Restart  ▶  ⋯ │ ◯ F  Steps … │
│ ◯ T  Thunder    ─────● 90%  Multiple ▶  ⋯ │ ◯ D  Door  … │
└────────────────────────────────────────────────────────────┘

COMPACT                    HIDDEN
┌──────────────────────┐   ┌─────────────────────────────────┐
│ ◯  ◯  ◯  ◯  ◯  ◯    │   │ Soundboard              Open ▦ │
└──────────────────────┘   └─────────────────────────────────┘
```

Expanded rows flow into two columns when enough width is available. Each row
contains the circular key, name, volume, retrigger mode, audition control, and
playing indicator. Hovering the displayed name shows the original filename.

The whole expanded dock accepts dropped audio files. `Add files` opens a normal
multi-file picker; `Add folder` recursively imports supported audio files from a
selected folder and its subfolders while ignoring other files. Bulk import does
not force shortcut assignment after every file; letters can be assigned later.

### Circular keys and icons

Assigned letters use a thick circular key in expanded and compact modes. While
the sound plays, the key receives its configured accent fill and its outer ring
visualizes duration.

Each sound can use one of more than 80 bundled Lucide icons selected for RPG
use, spanning animals, food, gaming, nature, places, people, tools,
transportation, weather, and sound. No remote icon library or CDN is required.

When an icon is present it replaces the large center letter, while the shortcut
moves to a small badge above the circle. Without an icon, the letter remains
centered. Icon color can use the default UI accent, one of the campaign preset
colors, or a custom color. The circle size does not change when these options
change.

## Phone remote UI

The active campaign's soundboard appears at the bottom of the phone interface,
above Now Playing, as one horizontally scrollable row of 48px circular buttons.
It is hidden when the active campaign has no usable sounds.

Each button shows its configured icon and color, or its shortcut letter when no
icon is assigned. Authoring controls, names, volume sliders, and mode selectors
stay on desktop so the mobile surface remains a one-tap pad with 44×44px minimum
touch targets.

The circle uses authoritative engine activity rather than a fixed tap flash. It
lights in the icon color when playback actually begins, displays a circular
duration indicator, and turns off when the last voice ends. It also reacts when
the sound was triggered from the desktop keyboard, not only from the phone.

## WebSocket protocol

One command is added from phone to desktop:

```ts
{ type: 'trigger-soundboard', payload: { soundId } }
```

The renderer validates the sound against the active campaign before passing it
to `SoundboardEngine`. A runtime event travels from desktop to phone whenever a
sound starts or its active voice count changes:

```ts
{
  type: 'soundboard-activity',
  payload: { soundId, playing, voiceCount, startedAtMs?, durationMs? }
}
```

Campaign definitions reach the phone through the existing `full-state` and
`campaigns-update` messages, but through a sanitized projection containing only
`id`, `name`, `shortcutKey`, `icon`, `iconColor`, and `order`. Filesystem paths,
volume, and playback modes never leave the desktop.

Full-state updates are broadcast to already-connected phones as well as cached
for new connections. Remote static assets are served with `Cache-Control:
no-store` so a phone cannot remain on an older UI after the desktop app updates.

## Campaign export and import

Campaign export format v3 includes soundboard metadata: name, configured
volume, shortcut, icon, icon color, playback mode, known duration, and order.
Absolute filesystem paths are deliberately excluded because they are both
machine-specific and private.

Import recreates the sound rows and their assignments with an empty local path,
then warns that the audio files must be re-added on the destination computer.
This preserves campaign organization but does **not** yet make an `.ambora` file
a portable audio archive.

## Deferred

These are deliberately outside the first version:

- **Portable audio bundles** — embedding or copying sound files into campaign
  exports needs an archive format, size limits, duplicate handling, and secure
  extraction rules.
- **Numbers and modifier combinations** — digits remain available for loops or
  other session-level controls; Ctrl, Alt, and Meta semantics are undecided.
- **Loop and hold modes** — these need lifecycle controls distinct from
  one-shot retrigger behaviour.
- **Random sound groups** — use an Ambient Layer today; a campaign-wide effect
  group may be added if a concrete play workflow requires it.
- **Physical-key assignments** — `KeyboardEvent.code` could be offered as an
  explicit alternative later, but character-based shortcuts remain the
  portable default.
- **Remote authoring** — file selection, volume, icons, shortcut assignment, and
  mode editing stay on the computer that owns the files.
