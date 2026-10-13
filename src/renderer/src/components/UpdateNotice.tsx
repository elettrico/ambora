import { useEffect, useState } from 'react'
import { CircleArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAudioStore } from '@/store/audioStore'
import type { UpdateStatus } from '@/lib/types'

/**
 * Shown once an update has finished downloading. It installs on its own the
 * next time Ambora quits, so this never interrupts a session: restarting now
 * is offered, never forced, and confirmed if music is playing.
 */
export function UpdateNotice(): React.JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isPlaying = useAudioStore((s) => s.isPlaying)

  useEffect(() => {
    let cancelled = false
    window.api.getUpdateStatus().then((initial) => {
      if (!cancelled) setStatus(initial)
    })
    const unsubscribe = window.api.onUpdateStatus(setStatus)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (status.state !== 'ready') return null

  function handleRestart(): void {
    if (isPlaying) {
      setConfirmOpen(true)
    } else {
      window.api.installUpdate()
    }
  }

  return (
    <div className="px-3 pb-3">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-3">
        <div className="flex items-start gap-2">
          <CircleArrowUp className="mt-0.5 size-4 shrink-0 text-accent" />
          <div className="flex flex-col gap-1">
            <p className="text-[13px] font-medium text-text-primary">
              Ambora {status.version} is ready
            </p>
            <p className="text-[11px] text-text-secondary">It installs when you quit Ambora.</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRestart}>
          Restart now
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart to update?</AlertDialogTitle>
            <AlertDialogDescription>
              Restarting stops the music that&apos;s playing. If you wait, the update installs the
              next time you quit Ambora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.api.installUpdate()}>
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
