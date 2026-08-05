// electron-builder afterSign hook.
//
// When the macOS app is built WITHOUT a Developer ID certificate, electron-builder
// leaves the bundle with a broken/default ad-hoc signature. Once such a build is
// downloaded — and macOS applies the com.apple.quarantine attribute — Gatekeeper
// reports it as "Ambora.app is damaged and can't be opened", because on Apple
// Silicon an invalid signature is fatal.
//
// This hook re-applies a *valid* ad-hoc signature so the app can still be opened
// via right-click -> Open.
//
// It MUST NOT touch a properly signed app: re-signing ad-hoc would strip the
// Developer ID signature and break notarization. Rather than inferring that from
// env vars — which misses a local `npm run dist:mac` that picked up an identity
// from the keychain, where CSC_LINK is never set — it inspects the signature
// electron-builder actually produced.
//
// Bundled ffmpeg/ffprobe helpers are also codesigned when we apply the ad-hoc
// signature (Developer ID builds are already signed by electron-builder's deep
// sign pass, including asarUnpack binaries).

const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

/**
 * True when the bundle carries a real (non-ad-hoc) signature. `codesign -dvv`
 * prints an `Authority=` chain for identity-signed apps; ad-hoc signatures report
 * `Signature=adhoc` with no authority, and unsigned bundles exit non-zero.
 *
 * spawnSync, not execFileSync: codesign writes its diagnostics to stderr, which
 * execFileSync only surfaces when the command *fails* — so a successful lookup
 * would come back empty and every app would look unsigned.
 */
function hasIdentitySignature(appPath) {
  const result = spawnSync('codesign', ['--display', '--verbose=2', appPath], { encoding: 'utf8' })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  return /^Authority=/m.test(output)
}

function collectHelperBinaries(appPath) {
  const roots = [
    path.join(appPath, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules'),
    path.join(appPath, 'Contents', 'Resources', 'app.asar.unpacked'),
  ]
  const names = new Set(['ffmpeg', 'ffprobe', 'ffmpeg.exe', 'ffprobe.exe'])
  const found = []

  function walk(dir, depth) {
    if (depth > 8 || !fs.existsSync(dir)) return
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, depth + 1)
      } else if (names.has(entry.name)) {
        found.push(full)
      }
    }
  }

  for (const root of roots) walk(root, 0)
  return found
}

function signHelperBinaries(appPath) {
  const helpers = collectHelperBinaries(appPath)
  for (const helper of helpers) {
    console.log(`[afterSign] ad-hoc signing helper ${helper}`)
    execFileSync('codesign', ['--force', '--sign', '-', '--options', 'runtime', helper], {
      stdio: 'inherit',
    })
  }
}

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  if (hasIdentitySignature(appPath)) {
    console.log(`[afterSign] ${appPath} carries a real signature — leaving it untouched`)
    return
  }

  // Sign helpers before the bundle so --deep sees valid nested signatures.
  signHelperBinaries(appPath)

  console.log(`[afterSign] applying valid ad-hoc signature to ${appPath}`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
}
