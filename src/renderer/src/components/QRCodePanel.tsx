import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useConnectionStore } from '@/store/connectionStore'

export function QRCodePanel(): React.JSX.Element {
  const { serverUrl, connectedClients, clients } = useConnectionStore()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!serverUrl) return

    QRCode.toDataURL(serverUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: '#EAEAED',
        light: '#00000000',
      },
    }).then(setQrDataUrl)
  }, [serverUrl])

  if (!serverUrl) {
    return (
      <div className="mt-auto border-t border-border-subtle p-4">
        <div className="rounded-md bg-surface-2 p-4">
          <p className="text-[11px] text-text-tertiary">Loading server info...</p>
        </div>
      </div>
    )
  }

  const isConnected = connectedClients > 0

  return (
    <div className="mt-auto border-t border-border-subtle p-4">
      <div className="rounded-md bg-surface-2 p-4">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
            Connect Phone
          </p>
        </div>

        {qrDataUrl && (
          <div className="mt-3 flex justify-center">
            <img src={qrDataUrl} alt="QR code for phone remote" width={120} height={120} />
          </div>
        )}

        <p className="mt-2 select-all text-center text-[11px] text-text-tertiary">{serverUrl}</p>

        {isConnected ? (
          <div className="mt-3 space-y-1.5">
            {clients.map((client) => (
              <div key={`${client.address}-${client.label}`} className="flex items-center gap-1.5">
                <div className="size-2 shrink-0 rounded-full bg-success" />
                <p className="min-w-0 truncate text-[11px] text-text-tertiary">
                  {client.label} <span className="opacity-70">· {client.address}</span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <div className="size-2 rounded-full bg-danger" />
            <p className="text-[11px] text-text-tertiary">Disconnected</p>
          </div>
        )}
      </div>
    </div>
  )
}
