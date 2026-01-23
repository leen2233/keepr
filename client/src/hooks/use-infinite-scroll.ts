import { useEffect, useRef, useState } from "react"

export function useInfiniteScroll(
  callback: () => void,
  enabled: boolean = true,
  threshold: number = 100
) {
  const observerTarget = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const observerTargetElement = observerTarget.current
    if (!observerTargetElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isIntersecting) {
          setIsIntersecting(true)
          callback()
          // Reset after a short delay to prevent multiple rapid calls
          setTimeout(() => setIsIntersecting(false), 500)
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    )

    observer.observe(observerTargetElement)

    return () => {
      observer.disconnect()
    }
  }, [callback, enabled, isIntersecting, threshold])

  return observerTarget
}
