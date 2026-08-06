# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Ambora, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainers with a description of the vulnerability
3. Include steps to reproduce if possible
4. Allow reasonable time for a fix before public disclosure

## Security Considerations

Ambora runs a local Express + WebSocket server on your machine for phone remote control. Key security notes:

- The server only binds to your local network interface
- No data is transmitted over the internet (except YouTube playback which requires connectivity)
- Campaign data is stored locally as JSON files in your user data directory
- The phone remote does not require authentication (it relies on local network trust)
- The remote protocol sends a sanitized campaign projection — absolute filesystem paths and media tokens are never included
- WebSocket commands are validated against a known command allowlist with a small max payload
- No sensitive credentials or tokens are stored by the application
