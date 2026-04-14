import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for the chat list page – mimics avatar + 2 text lines per row */
export const ChatListSkeleton = () => (
  <div className="flex flex-col min-h-screen bg-background">
    {/* Header skeleton */}
    <div className="px-5 pt-5 pb-3 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>

    {/* Chat rows */}
    <div className="flex-1 px-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3.5">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 rounded" style={{ width: `${60 + (i % 3) * 20}px` }} />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
            <Skeleton className="h-3 rounded" style={{ width: `${120 + (i % 4) * 30}px` }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Skeleton for an individual chat page – header + bubble placeholders */
export const ChatPageSkeleton = () => (
  <div className="flex flex-col h-screen bg-background">
    {/* Header */}
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
    </div>

    {/* Messages area */}
    <div className="flex-1 px-4 py-6 space-y-4">
      {/* Incoming */}
      <div className="flex justify-start">
        <Skeleton className="h-10 rounded-2xl" style={{ width: "55%" }} />
      </div>
      {/* Outgoing */}
      <div className="flex justify-end">
        <Skeleton className="h-10 rounded-2xl" style={{ width: "45%" }} />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-16 rounded-2xl" style={{ width: "65%" }} />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 rounded-2xl" style={{ width: "40%" }} />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-10 rounded-2xl" style={{ width: "50%" }} />
      </div>
    </div>

    {/* Input bar */}
    <div className="px-4 pb-4">
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  </div>
);
