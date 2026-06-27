"use client";

import dynamic from "next/dynamic";

import type { DiscoverEvent } from "@/lib/types";

const ExplorerMapLeaflet = dynamic(() => import("@/components/ExplorerMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="explorer-map-abstract relative h-full min-h-[280px] w-full md:min-h-[400px]">
      <div className="explorer-map-backdrop absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <span className="h-6 w-6 animate-spin-gentle rounded-full border-2 border-foreground/20 border-t-foreground/70" />
          <p className="text-sm">Loading map…</p>
        </div>
      </div>
    </div>
  ),
});

interface ExplorerMapProps {
  events: DiscoverEvent[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelectEvent: (id: string) => void;
}

export default function ExplorerMap(props: ExplorerMapProps) {
  return <ExplorerMapLeaflet {...props} />;
}
