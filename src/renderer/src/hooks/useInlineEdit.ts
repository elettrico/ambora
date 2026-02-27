import { useState, useCallback, useRef } from 'react'

interface UseInlineEditOptions {
  value: string
  onSave: (value: string) => void
}

interface InlineEditReturn {
  isEditing: boolean
  editValue: string
  setEditValue: (value: string) => void
  startEditing: () => void
  handleSave: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  inputProps: {
    autoFocus: boolean
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => void
  }
}

export function useInlineEdit({ value, onSave }: UseInlineEditOptions): InlineEditReturn {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const shouldSelect = useRef(false)

  const startEditing = useCallback((): void => {
    setEditValue(value)
    shouldSelect.current = true
    setIsEditing(true)
  }, [value])

  const handleSave = useCallback((): void => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    }
    setIsEditing(false)
  }, [editValue, value, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        setEditValue(value)
        setIsEditing(false)
      }
    },
    [handleSave, value],
  )

  const onFocus = useCallback((e: React.FocusEvent<HTMLInputElement>): void => {
    if (shouldSelect.current) {
      e.target.select()
      shouldSelect.current = false
    }
  }, [])

  return {
    isEditing,
    editValue,
    setEditValue,
    startEditing,
    handleSave,
    handleKeyDown,
    inputProps: {
      autoFocus: true,
      onFocus,
    },
  }
}
