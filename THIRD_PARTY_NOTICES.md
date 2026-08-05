# Third-party notices

Ambora itself is licensed under the MIT License (see [LICENSE](LICENSE)).

## FFmpeg and ffprobe

Ambora ships platform-native **ffmpeg** and **ffprobe** binaries (via the
`ffmpeg-static` and `ffprobe-static` npm packages) and runs them as **separate
subprocesses**. They are not linked into Ambora's Electron binary.

These tools are used to:

- measure integrated loudness (EBU R128 / `ebur128`) for local-track normalization
- probe audio codecs before import so unsupported formats fail with a clear message

The bundled FFmpeg builds typically include GPL-enabled components (see each
package's `LICENSE` / `ffmpeg.LICENSE` under `node_modules`). Redistribution of
those binaries is subject to the FFmpeg project's license terms (LGPL and/or GPL,
depending on the build). Source for the corresponding FFmpeg releases is available
from the FFmpeg project and from the upstream static-binary package repositories:

- https://ffmpeg.org/
- https://github.com/eugeneware/ffmpeg-static
- https://github.com/joshwnj/ffprobe-static

Ambora's own source code remains MIT-licensed.
