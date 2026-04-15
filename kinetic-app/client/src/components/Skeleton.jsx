export function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse bg-surface-container-highest rounded-xl ${className}`} />
  )
}

export function SkeletonText({ width = 'w-32' }) {
  return <div className={`animate-pulse bg-surface-container-highest rounded h-4 ${width}`} />
}
