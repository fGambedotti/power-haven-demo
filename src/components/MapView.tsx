"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Datacentre {
  id: string;
  name: string;
  lat: number;
  lon: number;
  batteryMw: number;
  batteryMwh: number;
  baselineLoadMw: number;
  region: string;
}

interface GenerationSite {
  id: string;
  name: string;
  type: "renewable" | "non-renewable";
  capacityMw: number;
  lat: number;
  lon: number;
}

interface MapViewProps {
  regions: GeoJSON.FeatureCollection;
  corridors: GeoJSON.FeatureCollection;
  datacentres: Datacentre[];
  generationSites: GenerationSite[];
  selectedDatacentreId: string | null;
  highlightedCorridors: string[];
  dispatchLine: GeoJSON.FeatureCollection | null;
  onSelectDatacentre: (id: string) => void;
}

const NESO_COORD: [number, number] = [-1.7, 52.7];

export default function MapView({
  regions,
  corridors,
  datacentres,
  generationSites,
  selectedDatacentreId,
  highlightedCorridors,
  dispatchLine,
  onSelectDatacentre
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  const datacentreGeo = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: datacentres.map((dc) => ({
        type: "Feature",
        properties: { id: dc.id, name: dc.name },
        geometry: { type: "Point", coordinates: [dc.lon, dc.lat] }
      }))
    } as GeoJSON.FeatureCollection;
  }, [datacentres]);

  const generationGeo = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: generationSites.map((site) => ({
        type: "Feature",
        properties: { id: site.id, type: site.type, name: site.name },
        geometry: { type: "Point", coordinates: [site.lon, site.lat] }
      }))
    } as GeoJSON.FeatureCollection;
  }, [generationSites]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f4f6fa" }
          }
        ]
      },
      center: [-2.2, 53.4],
      zoom: 5.2,
      minZoom: 4.2,
      maxZoom: 7.5,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("regions", { type: "geojson", data: regions });
      map.addLayer({
        id: "regions-fill",
        type: "fill",
        source: "regions",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "demand"],
            0.3,
            "#dbeafe",
            0.5,
            "#93c5fd",
            0.7,
            "#60a5fa",
            0.9,
            "#2563eb"
          ],
          "fill-opacity": 0.65
        }
      });
      map.addLayer({
        id: "regions-outline",
        type: "line",
        source: "regions",
        paint: {
          "line-color": "#1e293b",
          "line-width": 0.8,
          "line-opacity": 0.35
        }
      });

      map.addSource("corridors", { type: "geojson", data: corridors });
      map.addLayer({
        id: "corridors-line",
        type: "line",
        source: "corridors",
        paint: {
          "line-color": "#64748b",
          "line-width": 2.5,
          "line-opacity": 0.4
        }
      });

      map.addLayer({
        id: "corridors-highlight",
        type: "line",
        source: "corridors",
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 4,
          "line-opacity": 0.85
        },
        filter: ["in", ["get", "id"], ["literal", []]]
      });

      map.addSource("generation", { type: "geojson", data: generationGeo });
      map.addLayer({
        id: "generation-points",
        type: "circle",
        source: "generation",
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "type"],
            "renewable",
            "#10b981",
            "#f97316"
          ],
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 1
        }
      });

      map.addSource("datacentres", { type: "geojson", data: datacentreGeo });
      map.addLayer({
        id: "datacentres",
        type: "circle",
        source: "datacentres",
        paint: {
          "circle-radius": 7,
          "circle-color": "#0f172a",
          "circle-stroke-color": "#38bdf8",
          "circle-stroke-width": 2
        }
      });

      map.addLayer({
        id: "datacentres-selected",
        type: "circle",
        source: "datacentres",
        paint: {
          "circle-radius": 10,
          "circle-color": "#38bdf8",
          "circle-opacity": 0.85
        },
        filter: ["==", ["get", "id"], selectedDatacentreId ?? ""]
      });

      map.addSource("neso", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "NESO" },
              geometry: { type: "Point", coordinates: NESO_COORD }
            }
          ]
        }
      });
      map.addLayer({
        id: "neso-node",
        type: "circle",
        source: "neso",
        paint: {
          "circle-radius": 8,
          "circle-color": "#111827",
          "circle-stroke-color": "#f59e0b",
          "circle-stroke-width": 3
        }
      });

      map.addLayer({
        id: "neso-label",
        type: "symbol",
        source: "neso",
        layout: {
          "text-field": "NESO",
          "text-offset": [0, 1.4],
          "text-size": 12
        },
        paint: {
          "text-color": "#1f2937"
        }
      });

      map.addSource("dispatch", {
        type: "geojson",
        data: dispatchLine ?? { type: "FeatureCollection", features: [] }
      });
      map.addLayer({
        id: "dispatch-line",
        type: "line",
        source: "dispatch",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-dasharray": [1, 1.5]
        }
      });

      map.on("click", "datacentres", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature?.properties?.id) return;
        onSelectDatacentre(feature.properties.id as string);
      });

      map.on("mouseenter", "datacentres", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "datacentres", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
  }, [regions, corridors, datacentreGeo, generationGeo, selectedDatacentreId, dispatchLine, highlightedCorridors, onSelectDatacentre]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("datacentres") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(datacentreGeo);
    }
    if (map.getLayer("datacentres-selected")) {
      map.setFilter("datacentres-selected", ["==", ["get", "id"], selectedDatacentreId ?? ""]);
    }
  }, [datacentreGeo, selectedDatacentreId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("corridors") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(corridors);
    }
    if (map.getLayer("corridors-highlight")) {
      map.setFilter("corridors-highlight", ["in", ["get", "id"], ["literal", highlightedCorridors]]);
    }
  }, [corridors, highlightedCorridors]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("dispatch") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(dispatchLine ?? { type: "FeatureCollection", features: [] });
    }
  }, [dispatchLine]);

  return <div className="maplibre-container rounded-3xl border border-slate/10 bg-white shadow-card" ref={containerRef} />;
}
