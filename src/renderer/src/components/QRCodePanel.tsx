import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useConnectionStore } from '@/store/connectionStore'
import { SidebarSection } from './SidebarSection'

interface QRCodePanelProps {
  open: boolean
  onToggle: () => void
}

export function QRCodePanel({ open, onToggle }: QRCodePanelProps): React.JSX.Element {
  const { serverUrl, connectedClients } = useConnectionStore()
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
      <SidebarSection
        title="Connect Phone"
        open={open}
        onToggle={onToggle}
        className="mt-auto border-t border-border-subtle"
        contentClassName="p-4 pt-0"
      >
        <div className="rounded-md bg-surface-2 p-4">
          <p className="text-[11px] text-text-tertiary">Loading server info...</p>
        </div>
      </SidebarSection>
    )
  }

  const isConnected = connectedClients > 0
  const statusText =
    connectedClients === 0
      ? 'Disconnected'
      : connectedClients === 1
        ? 'Connected'
        : `${connectedClients} Connected`

  return (
    <SidebarSection
      title="Connect Phone"
      open={open}
      onToggle={onToggle}
      className="mt-auto border-t border-border-subtle"
      contentClassName="px-4 pb-4"
      trailing={
        <span
          className={`size-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`}
          title={statusText}
        />
      }
    >
      <div className="rounded-md bg-surface-2 p-4">
        {qrDataUrl && (
          <div className="flex justify-center">
            <img src={qrDataUrl} alt="QR code for phone remote" width={120} height={120} />
          </div>
        )}

        <p className="mt-2 select-all text-center text-[11px] text-text-tertiary">{serverUrl}</p>

        <div className="mt-2 flex items-center justify-center gap-1.5">
          <div className={`size-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
          <p className="text-[11px] text-text-tertiary">{statusText}</p>
        </div>
      </div>
    </SidebarSection>
  )
}
