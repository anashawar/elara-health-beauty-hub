import { useState, useEffect, useRef, useCallback } from "react";
import { X, Navigation, Loader2, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom ELARA-branded marker icon (SVG data URI)
const elaraMarkerIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 12px rgba(139,92,246,0.4));">
    <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 32 20 32s20-18 20-32C40 8.954 31.046 0 20 0z" fill="hsl(271,76%,53%)"/>
      <circle cx="20" cy="19" r="8" fill="white" opacity="0.95"/>
      <circle cx="20" cy="19" r="4" fill="hsl(271,76%,53%)"/>
    </svg>
  </div>`,
  iconSize: [40, 52],
  iconAnchor: [20, 52],
  popupAnchor: [0, -52],
});

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

// Default to Erbil, Kurdistan Region, Iraq
const DEFAULT_LAT = 36.191;
const DEFAULT_LNG = 44.0119;
const DEFAULT_ZOOM = 13;

const MapPicker = ({ open, onClose, onConfirm, initialLat, initialLng }: MapPickerProps) => {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: initialLat || DEFAULT_LAT,
    lng: initialLng || DEFAULT_LNG,
  });
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [geoResolved, setGeoResolved] = useState(false);

  const locateUser = useCallback(async (map?: L.Map, marker?: L.Marker) => {
    const m = map || mapRef.current;
    const mk = marker || markerRef.current;
    if (!m || !mk) return;

    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      );
      const { latitude, longitude } = pos.coords;
      m.setView([latitude, longitude], 16, { animate: true });
      mk.setLatLng([latitude, longitude]);
      setPosition({ lat: latitude, lng: longitude });
      setGeoResolved(true);
    } catch (err) {
      console.warn("Geolocation unavailable, using default location");
    } finally {
      setLocating(false);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current) return;

    const hasInitial = initialLat != null && initialLng != null;
    const startLat = hasInitial ? initialLat : DEFAULT_LAT;
    const startLng = hasInitial ? initialLng : DEFAULT_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: hasInitial ? 16 : DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    // Modern clean map tiles (CartoDB Voyager)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Add zoom control to bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const marker = L.marker([startLat, startLng], {
      draggable: true,
      autoPan: true,
      icon: elaraMarkerIcon,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setPosition({ lat: pos.lat, lng: pos.lng });
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    setMapReady(true);

    // Auto-locate to user's GPS if no initial coords provided
    if (!hasInitial) {
      locateUser(map, marker);
    }

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
      setGeoResolved(false);
    };
  }, [open]);

  const handleConfirm = () => {
    onConfirm(position.lat, position.lng);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-display font-bold text-foreground">
            {t("addresses.selectLocation") || "Select Location"}
          </h1>
          <div className="w-7" />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* My Location button */}
        <button
          onClick={() => locateUser()}
          disabled={locating}
          className="absolute top-4 right-4 z-[1000] w-11 h-11 rounded-full bg-card shadow-premium-lg flex items-center justify-center border border-border hover:bg-secondary transition-colors"
        >
          {locating ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 text-primary" />
          )}
        </button>

        {/* Coordinates display */}
        <div className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-premium border border-border">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-mono text-muted-foreground">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Instruction hint */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-foreground/80 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
          <p className="text-[11px] text-background font-medium">
            {t("addresses.tapOrDrag") || "Tap the map or drag the pin"}
          </p>
        </div>
      </div>

      {/* Confirm button */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-4 bottom-nav-safe">
        <Button onClick={handleConfirm} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
          <Check className="w-4 h-4" />
          {t("addresses.confirmLocation") || "Confirm Location"}
        </Button>
      </div>
    </div>
  );
};

export default MapPicker;
