// electron-builder afterSign hook.
//
// When building the macOS app WITHOUT a Developer ID certificate (the current
// CI setup has no signing secrets), electron-builder leaves the bundle with a
// broken/default ad-hoc signature. Once such a build is downloaded — and macOS
// applies the com.apple.quarantine attribute — Gatekeeper reports it as
// "Ambora.app is damaged and can't be opened", because on Apple Silicon an
// invalid signature is fatal.
//
// This hook re-applies a *valid* ad-hoc signature so the app can be opened via
// right-click -> Open (users still strip quarantine / accept the unidentified
// developer prompt, but it is no longer reported as damaged).
//
// It is a no-op once real Developer ID signing is configured (CSC_LINK /
// CSC_NAME present) or on non-macOS builds — at that point electron-builder's
// own signature must be preserved for notarization.

const { execFileSync } = require('node:child_process')
const path = require('node:path')

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return
  if (process.env.CSC_LINK || process.env.CSC_NAME) return // real signing in use

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  console.log(`[afterSign] applying valid ad-hoc signature to ${appPath}`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
}
