import { useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"

// Parse a shortcut string like "ctrl+n" into its components
interface ParsedShortcut {
  key: string
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

function parseShortcut(shortcut: string): ParsedShortcut | null {
  if (!shortcut) return null

  const parts = shortcut.toLowerCase().split('+')
  const key = parts.pop() || ''
  const ctrl = parts.includes('ctrl') || parts.includes('control')
  const meta = parts.includes('meta') || parts.includes('cmd') || parts.includes('command')
  const alt = parts.includes('alt')
  const shift = parts.includes('shift')

  return { key, ctrl, meta, alt, shift }
}

function formatShortcut(shortcut: string): string {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts.pop() || ''
  const modifiers = parts

  // Format modifiers nicely
  const formattedModifiers = modifiers.map(m => {
    switch (m) {
      case 'ctrl': return 'Ctrl'
      case 'control': return 'Ctrl'
      case 'meta': return 'Cmd'
      case 'cmd': return 'Cmd'
      case 'command': return 'Cmd'
      case 'alt': return 'Alt'
      case 'shift': return 'Shift'
      default: return m.charAt(0).toUpperCase() + m.slice(1)
    }
  })

  // Format the key nicely
  let formattedKey = key.toUpperCase()
  if (key === 'enter') formattedKey = 'Enter'
  if (key === 'escape') formattedKey = 'Esc'
  if (key === 'tab') formattedKey = 'Tab'
  if (key === ' ') formattedKey = 'Space'
  if (key === 'arrowup') formattedKey = '↑'
  if (key === 'arrowdown') formattedKey = '↓'
  if (key === 'arrowleft') formattedKey = '←'
  if (key === 'arrowright') formattedKey = '→'
  if (key.startsWith('arrow')) formattedKey = key.replace('arrow', '').toUpperCase()

  return [...formattedModifiers, formattedKey].join(' + ')
}

function shortcutMatches(parsed: ParsedShortcut, event: KeyboardEvent): boolean {
  const eventKey = event.key.toLowerCase()

  // Handle special key names
  let eventKeyMatch = eventKey
  if (eventKey === ' ') eventKeyMatch = 'space'
  if (event.key.startsWith('Arrow')) eventKeyMatch = event.key.toLowerCase().replace('arrow', 'arrow')

  const keyMatch = parsed.key === eventKeyMatch

  // Check modifiers
  const ctrlMatch = parsed.ctrl === event.ctrlKey
  const metaMatch = parsed.meta === event.metaKey
  const altMatch = parsed.alt === event.altKey
  const shiftMatch = parsed.shift === event.shiftKey

  // For single key shortcuts (no modifiers), require no modifiers pressed
  const hasModifiers = parsed.ctrl || parsed.meta || parsed.alt || parsed.shift
  if (!hasModifiers && (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)) {
    return false
  }

  return keyMatch && ctrlMatch && metaMatch && altMatch && shiftMatch
}

export { formatShortcut, parseShortcut }

export function useKeyboardShortcuts(createShortcut?: string) {
  const navigate = useNavigate()
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accumulatedKeysRef = useRef("")
  const parsedShortcut = useRef<ParsedShortcut | null>(null)

  // Update parsed shortcut when it changes
  if (parsedShortcut.current?.key !== parseShortcut(createShortcut || "")?.key) {
    parsedShortcut.current = parseShortcut(createShortcut || "")
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input, textarea, or contenteditable
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return
    }

    // Check if the pressed key matches the create shortcut
    if (parsedShortcut.current && shortcutMatches(parsedShortcut.current, e)) {
      e.preventDefault()
      navigate("/new")
      return
    }

    // Escape: Go back to home
    if (e.key === "Escape") {
      navigate("/")
      return
    }

    // Typing detection: focus search when user starts typing (no modifiers)
    // Skip if the create shortcut is a single letter that might be typed
    const isSingleLetterShortcut = parsedShortcut.current &&
      !parsedShortcut.current.ctrl &&
      !parsedShortcut.current.meta &&
      !parsedShortcut.current.alt &&
      !parsedShortcut.current.shift &&
      parsedShortcut.current.key.length === 1

    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      !e.key.match(/^[F0-9]$/) && // Skip function keys and numbers
      !isSingleLetterShortcut // Skip if this letter is the create shortcut
    ) {
      // Prevent the key from being entered twice
      e.preventDefault()

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Accumulate typed characters
      accumulatedKeysRef.current += e.key

      // Focus search input
      const searchInput = document.querySelector("input[placeholder*='Search']") as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
        // Set the accumulated value
        searchInput.value = accumulatedKeysRef.current
        // Trigger input event to update state
        searchInput.dispatchEvent(new Event("input", { bubbles: true }))
      }

      // Clear accumulated keys after 1 second of no typing
      typingTimeoutRef.current = setTimeout(() => {
        accumulatedKeysRef.current = ""
      }, 1000)
    }
  }, [navigate, createShortcut])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [handleKeyDown])
}
