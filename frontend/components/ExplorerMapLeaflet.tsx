"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { DiscoverEvent } from "@/lib/types";

const CARTO_DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const TILE_OPACITY = 0.58;
const FIT_BOUNDS_PADDING: L.PointExpression = [56, 56];

interface ExplorerMapLeafletProps {
  events: DiscoverEvent[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelectEvent: (id: string) => void;
}

type EventCluster = {
  id: string;
  lat: number;
  lng: number;
  events: DiscoverEvent[];
};

function clusterEvents(events: DiscoverEvent[], zoom: number): EventCluster[] {
  const precision = zoom <= 10 ? 2 : zoom <= 12 ? 3 : 5;
  const factor = 10 ** precision;
  const buckets = new Map<string, DiscoverEvent[]>();

  for (const event of events) {
    const latKey = Math.round(event.lat * factor) / factor;
    const lngKey = Math.round(event.lng * factor) / factor;
    const key = `${latKey},${lngKey}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(event);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries()).map(([key, clusterEvents]) => {
    const lat =
      clusterEvents.reduce((sum, event) => sum + event.lat, 0) /
      clusterEvents.length;
    const lng =
      clusterEvents.reduce((sum, event) => sum + event.lng, 0) /
      clusterEvents.length;
    return { id: key, lat, lng, events: clusterEvents };
  });
}

function MapViewportController({
  events,
  selectedId,
  center,
}: {
  events: DiscoverEvent[];
  selectedId: string | null;
  center: { lat: number; lng: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedId) {
      const selected = events.find((event) => event.id === selectedId);
      if (selected) {
        map.flyTo([selected.lat, selected.lng], 14, {
          animate: true,
          duration: 0.55,
        });
        return;
      }
    }

    if (events.length > 1) {
      const bounds = L.latLngBounds(
        events.map((event) => [event.lat, event.lng] as [number, number]),
      );
      map.fitBounds(bounds, {
        padding: FIT_BOUNDS_PADDING,
        maxZoom: 13,
        animate: true,
      });
      return;
    }

    if (events.length === 1) {
      map.flyTo([events[0].lat, events[0].lng], 13, {
        animate: true,
        duration: 0.55,
      });
      return;
    }

    map.flyTo([center.lat, center.lng], 11, { animate: true, duration: 0.55 });
  }, [center.lat, center.lng, events, map, selectedId]);

  return null;
}

function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [map]);

  return null;
}

function MapZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();

  useEffect(() => {
    onZoomChange(map.getZoom());
    const handleZoom = () => onZoomChange(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function createGlowingPinIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "glowing-pin-wrapper",
    html: `<div class="glowing-pin ${selected ? "glowing-pin--selected" : ""}" aria-hidden="true"><span class="glowing-pin__core"></span><span class="glowing-pin__ring"></span><span class="glowing-pin__ripple"></span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createClusterIcon(count: number): L.DivIcon {
  const label = count > 99 ? "99+" : String(count);
  return L.divIcon({
    className: "map-cluster-wrapper",
    html: `<div class="map-cluster" aria-hidden="true"><span class="map-cluster__halo"></span><span class="map-cluster__count">${label}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export default function ExplorerMapLeaflet({
  events,
  center,
  selectedId,
  onSelectEvent,
}: ExplorerMapLeafletProps) {
  const [zoom, setZoom] = useState(11);

  const clusters = useMemo(
    () => clusterEvents(events, zoom),
    [events, zoom],
  );

  const showClusters = events.length > 6 && zoom < 13;

function ClusterMarker({
  cluster,
  onSelectEvent,
}: {
  cluster: EventCluster;
  onSelectEvent: (id: string) => void;
}) {
  const map = useMap();

  const handleClick = () => {
    if (cluster.events.length === 1) {
      onSelectEvent(cluster.events[0].id);
      return;
    }

    const bounds = L.latLngBounds(
      cluster.events.map((event) => [event.lat, event.lng] as [number, number]),
    );
    map.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: 14,
      animate: true,
    });
  };

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={createClusterIcon(cluster.events.length)}
      eventHandlers={{ click: handleClick }}
      zIndexOffset={500}
    />
  );
}

  return (
    <div className="explorer-map-abstract relative h-full min-h-[280px] w-full md:min-h-[400px]">
      <div
        className="explorer-map-backdrop pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />

      <div className="explorer-map-legend pointer-events-none absolute left-4 top-4 z-[2]">
        <div className="explorer-map-legend__card">
          <span className="explorer-map-legend__dot" aria-hidden="true" />
          <div>
            <p className="explorer-map-legend__title">Events near you</p>
            <p className="explorer-map-legend__count">
              {events.length} {events.length === 1 ? "pin" : "pins"}
            </p>
          </div>
        </div>
      </div>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={11}
        className="explorer-map-leaflet relative z-[1] h-full min-h-[280px] w-full md:min-h-[400px]"
        style={{
          height: "100%",
          width: "100%",
          minHeight: 280,
          background: "transparent",
        }}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url={CARTO_DARK_TILES}
          opacity={TILE_OPACITY}
          className="explorer-map-tiles"
        />
        <MapViewportController
          events={events}
          selectedId={selectedId}
          center={center}
        />
        <MapInvalidateSize />
        <MapZoomTracker onZoomChange={setZoom} />

        {showClusters
          ? clusters.map((cluster) => {
              const isSingle = cluster.events.length === 1;
              const event = cluster.events[0];
              const isSelected =
                isSingle && selectedId != null && selectedId === event.id;

              if (isSingle) {
                return (
                  <Marker
                    key={event.id}
                    position={[event.lat, event.lng]}
                    icon={createGlowingPinIcon(isSelected)}
                    eventHandlers={{
                      click: () => onSelectEvent(event.id),
                    }}
                    zIndexOffset={isSelected ? 1000 : 0}
                  />
                );
              }

              return (
                <ClusterMarker
                  key={cluster.id}
                  cluster={cluster}
                  onSelectEvent={onSelectEvent}
                />
              );
            })
          : events.map((event) => {
              const isSelected = selectedId === event.id;
              return (
                <Marker
                  key={event.id}
                  position={[event.lat, event.lng]}
                  icon={createGlowingPinIcon(isSelected)}
                  eventHandlers={{
                    click: () => onSelectEvent(event.id),
                  }}
                  zIndexOffset={isSelected ? 1000 : 0}
                />
              );
            })}
      </MapContainer>
    </div>
  );
}
