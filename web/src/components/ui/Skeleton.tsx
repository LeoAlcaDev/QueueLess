import { cn } from '@/lib/cn';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: string;
  className?: string;
}

// El shimmer vive en index.css (.ql-skeleton); aca solo damos forma y tamano.
export function Skeleton({ width = '100%', height = 14, rounded = 'rounded-md', className }: SkeletonProps) {
  return <div className={cn('ql-skeleton', rounded, className)} style={{ width, height }} />;
}

export function SkeletonCard({ photo = true }: { photo?: boolean }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {photo && <Skeleton height={120} rounded="rounded-none" />}
      <div className="flex flex-col gap-2.5 p-3.5">
        <Skeleton width="62%" height={16} />
        <Skeleton width="40%" height={12} />
        <Skeleton width={90} height={24} rounded="rounded-pill" />
      </div>
    </div>
  );
}
