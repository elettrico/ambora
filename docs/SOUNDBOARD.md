# Soundboard Guide

The campaign soundboard keeps one-shot effects such as thunder, bells,
footsteps, doors, and weapon sounds available throughout a session. It belongs
to the campaign rather than a climate, so changing the active climate does not
change the available effects.

## Add sounds

Open a campaign and find **Soundboard** at the bottom of the window.

- Select **Add sound** to choose one or more local audio files.
- Select **Add folder** to import supported audio files from a folder and its
  subfolders. Other file types are ignored.
- Audio pickers reopen in the last folder used anywhere in Ambora, including
  after restarting the app. On Linux, Ambora selects a portal v4-compatible
  file chooser (or the GTK/KDE fallback) so the saved folder is respected.
- Drag audio files onto the soundboard to import them directly.

Imported sounds use the filename as their initial name. Rename them in the
expanded soundboard; hovering the name shows the original filename.

Soundboard files remain in their original location. Moving, renaming, or
deleting a file outside Ambora will make that sound unavailable.

## Assign a keyboard shortcut

Select the circular key at the left of a sound, then press the letter you want
to assign. Each letter can belong to only one sound in a campaign.

- Press the letter to play at the configured sound volume.
- Press Shift plus the letter to play at 100% sound volume.
- Select the circular key again to replace its assignment.

Shortcuts follow the character produced by the current keyboard layout. They
are letter-based rather than tied to the physical position of a key. Numbers
are not supported in this version.

Shortcuts remain available while the soundboard is compact or hidden. They do
not fire while typing in a text field.

## Choose repeated-trigger behaviour

The playback-mode selector controls what happens when a sound is triggered
again before it finishes:

| Mode         | Behaviour                                                         |
| ------------ | ----------------------------------------------------------------- |
| **Ignore**   | Ignores new triggers until the sound finishes.                    |
| **Stop**     | Stops the playing sound without starting it again.                |
| **Restart**  | Stops it and plays again from the beginning. This is the default. |
| **Multiple** | Starts another instance, allowing sounds to overlap.              |
| **Loop**     | Loops continuously; trigger it again to fade out and stop.        |

Use **Ignore** for long announcements, **Restart** for effects that should react
immediately, **Stop** for sounds that may need cancelling, and **Multiple** for
effects such as impacts or footsteps. Use **Loop** for continuous sounds such as
rain, machinery, alarms, or drones. A loop remains illuminated while active and
shows a rotating half-ring until it is stopped. The animation becomes a static
arc when reduced motion is enabled. Loops fade out over 400ms when stopped.

## Set volume, icon, and color

Use the volume slider on each expanded row to set its normal playback volume.
This is relative to Ambora's global Master and SFX mixer levels.

Select the icon button to search the bundled Lucide icon collection. A sound
can use the default accent, a campaign preset color, or a custom color. If no
icon is selected, its assigned letter remains in the center of the circle.

The circular border shows playback progress. In **Multiple** mode, a badge shows
the number of active instances and the progress ring follows the newest one.

Use the **Pitch ±** slider from 0–20% to give every trigger a slightly different
pitch and speed. For example, 10% chooses a fresh playback rate between 0.90× and
1.10×. The original audio file is never modified.

For a Loop sound, Ambora draws one pitch when the loop starts and keeps it stable
while that activation repeats, avoiding an audible jump at the loop boundary.
Stop and start it again to draw a new pitch. Finite sounds draw a new pitch on
every trigger, including every voice created by **Multiple**.

Ambient Layers provide the same **Pitch ±** slider in their expanded settings.
Random and One-shot layers draw a fresh value for every clip, so a small set of
files—such as mine drips—can produce more natural variation. Ambient Loop layers
use one stable randomized pitch per activation, just like Soundboard loops. The
configured value is shown in the collapsed layer row when it is above 0%.

## Change the soundboard layout

The soundboard remembers its last layout:

- **Expanded** shows all editing controls and uses two columns when space allows.
- **Compact** shows only assigned circular sound keys.
- **Hidden** leaves only the soundboard header visible.

When hidden, use the grid button to open it directly in compact mode or the
expand button to open the full editor.

## Use the phone remote

Connect the phone remote normally using Ambora's QR code. Sounds from the active
campaign appear in a collapsible pad above Now Playing.

Tap a circle to trigger it. The circle lights in its configured color, displays
playback progress, and turns off when playback finishes. The phone also reflects
sounds triggered from the desktop or keyboard.

The phone soundboard can be expanded or collapsed from its header. Its open state
is remembered, and the expanded pad wraps into rows instead of requiring
horizontal scrolling.

Sound files never travel to the phone. The phone sends the command to the
desktop, and the desktop plays the local file.

## Export and import

Campaign exports preserve sound names, order, shortcut assignments, volume,
playback mode, pitch variation, icons, and colors. They do not contain the audio
files or their absolute paths.

After importing a campaign on another computer, Ambora recreates the soundboard
entries and warns that their audio files must be added again. Portable campaign
audio bundles are not supported yet.

## Design reference

For technical decisions, data structures, audio architecture, and deferred
work, see [RFC: Campaign Soundboard](RFC-soundboard.md).
