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
  ukOutline: GeoJSON.FeatureCollection;
  regions: GeoJSON.FeatureCollection;
  corridors: GeoJSON.FeatureCollection;
  datacentres: Datacentre[];
  generationSites: GenerationSite[];
  selectedDatacentreId: string | null;
  highlightedCorridors: string[];
  dispatchLine: GeoJSON.FeatureCollection | null;
  showRegions?: boolean;
  showCorridors?: boolean;
  showGeneration?: boolean;
  showDatacentreLabels?: boolean;
  onSelectDatacentre: (id: string) => void;
}

const NESO_COORD: [number, number] = [-1.7, 52.7];

export default function MapView({
  ukOutline,
  regions,
  corridors,
  datacentres,
  generationSites,
  selectedDatacentreId,
  highlightedCorridors,
  dispatchLine,
  showRegions = true,
  showCorridors = true,
  showGeneration = true,
  showDatacentreLabels = false,
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
            paint: { "background-color": "#eef3f9" }
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
      map.addSource("uk-outline", { type: "geojson", data: ukOutline });
      map.addLayer({
        id: "uk-outline-fill",
        type: "fill",
        source: "uk-outline",
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.92
        }
      });
      map.addLayer({
        id: "uk-outline-line",
        type: "line",
        source: "uk-outline",
        paint: {
          "line-color": "#475569",
          "line-width": 1.4,
          "line-opacity": 0.65
        }
      });

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
            "#c4ddff",
            0.5,
            "#93c5fd",
            0.7,
            "#60a5fa",
            0.9,
            "#2563eb"
          ],
          "fill-opacity": 0.7
        }
      });
      map.addLayer({
        id: "regions-outline",
        type: "line",
        source: "regions",
        paint: {
          "line-color": "#334155",
          "line-width": 1,
          "line-opacity": 0.45
        }
      });

      map.addSource("corridors", { type: "geojson", data: corridors });
      map.addLayer({
        id: "corridors-line",
        type: "line",
        source: "corridors",
        paint: {
          "line-color": "#64748b",
          "line-width": 2,
          "line-opacity": 0.36
        }
      });

      map.addLayer({
        id: "corridors-highlight",
        type: "line",
        source: "corridors",
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 4.5,
          "line-opacity": 0.9
        },
        filter: ["in", ["get", "id"], ["literal", []]]
      });

      map.addSource("generation", { type: "geojson", data: generationGeo });
      map.addLayer({
        id: "generation-points",
        type: "circle",
        source: "generation",
        paint: {
          "circle-radius": 4.5,
          "circle-color": ["match", ["get", "type"], "renewable", "#10b981", "#f97316"],
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 0.8
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
          "circle-stroke-color": "#67e8f9",
          "circle-stroke-width": 2
        }
      });
      map.addLayer({
        id: "datacentres-labels",
        type: "symbol",
        source: "datacentres",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, 1.3],
          visibility: showDatacentreLabels ? "visible" : "none"
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1
        }
      });

      map.addLayer({
        id: "datacentres-selected",
        type: "circle",
        source: "datacentres",
        paint: {
          "circle-radius": 11,
          "circle-color": "#38bdf8",
          "circle-opacity": 0.28,
          "circle-stroke-color": "#0ea5e9",
          "circle-stroke-width": 2
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
          "text-offset": [0, 1.35],
          "text-size": 12,
          "text-font": ["Open Sans Bold"]
        },
        paint: {
          "text-color": "#334155"
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
          "line-color": [
            "match",
            ["get", "tier"],
            "primary",
            "#f59e0b",
            "secondary",
            "#38bdf8",
            "#94a3b8"
          ],
          "line-width": [
            "match",
            ["get", "tier"],
            "primary",
            4.5,
            "secondary",
            3,
            2.5
          ],
          "line-opacity": [
            "match",
            ["get", "tier"],
            "primary",
            0.95,
            "secondary",
            0.7,
            0.45
          ],
          "line-dasharray": [1, 1.4]
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [ukOutline, regions, corridors, datacentreGeo, generationGeo, selectedDatacentreId, dispatchLine, showDatacentreLabels, onSelectDatacentre]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("datacentres") as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(datacentreGeo);
    if (map.getLayer("datacentres-selected")) {
      map.setFilter("datacentres-selected", ["==", ["get", "id"], selectedDatacentreId ?? ""]);
    }
  }, [datacentreGeo, selectedDatacentreId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("corridors") as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(corridors);
    if (map.getLayer("corridors-highlight")) {
      map.setFilter("corridors-highlight", ["in", ["get", "id"], ["literal", highlightedCorridors]]);
    }
  }, [corridors, highlightedCorridors]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("dispatch") as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(dispatchLine ?? { type: "FeatureCollection", features: [] });
  }, [dispatchLine]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("regions-fill")) map.setLayoutProperty("regions-fill", "visibility", showRegions ? "visible" : "none");
    if (map.getLayer("regions-outline")) map.setLayoutProperty("regions-outline", "visibility", showRegions ? "visible" : "none");
  }, [showRegions]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("corridors-line")) map.setLayoutProperty("corridors-line", "visibility", showCorridors ? "visible" : "none");
    if (map.getLayer("corridors-highlight")) map.setLayoutProperty("corridors-highlight", "visibility", showCorridors ? "visible" : "none");
  }, [showCorridors]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("generation-points")) map.setLayoutProperty("generation-points", "visibility", showGeneration ? "visible" : "none");
  }, [showGeneration]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("datacentres-labels")) {
      map.setLayoutProperty("datacentres-labels", "visibility", showDatacentreLabels ? "visible" : "none");
    }
  }, [showDatacentreLabels]);

  return <div className="maplibre-container overflow-hidden rounded-2xl border border-slate-200 bg-white" ref={containerRef} />;
}
