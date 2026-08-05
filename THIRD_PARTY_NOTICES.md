# Third-party notices

Ambora itself is licensed under the MIT License (see [LICENSE](LICENSE)).

## FFmpeg

Ambora ships a platform-native **ffmpeg** binary (via the `ffmpeg-static` npm
package) and runs it as a **separate subprocess**. It is not linked into Ambora's
Electron binary.

This tool is used to:

- measure integrated loudness (EBU R128 / `ebur128`) for local-track normalization
- probe audio codecs before import so unsupported formats fail with a clear message

The bundled FFmpeg builds typically include GPL-enabled components (see the
package's `LICENSE` / `ffmpeg.LICENSE` under `node_modules`). Redistribution of
that binary is subject to the FFmpeg project's license terms (LGPL and/or GPL,
depending on the build). Source for the corresponding FFmpeg releases is available
from the FFmpeg project and from the upstream static-binary package repository:

- https://ffmpeg.org/
- https://github.com/eugeneware/ffmpeg-static

Ambora's own source code remains MIT-licensed.
