import { useState, useEffect, useRef, useCallback } from "react";
import { X, Navigation, Loader2, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

// Default to Baghdad, Iraq
const DEFAULT_LAT = 33.3152;
const DEFAULT_LNG = 44.3661;
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

  // Initialize map
  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current) return;

    const startLat = initialLat || DEFAULT_LAT;
    const startLng = initialLng || DEFAULT_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: initialLat ? 16 : DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control to bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const marker = L.marker([startLat, startLng], {
      draggable: true,
      autoPan: true,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setPosition({ lat: pos.lat, lng: pos.lng });
    });

    // Click on map to move marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    setMapReady(true);

    // If no initial location, try to get current position
    if (!initialLat) {
      locateUser(map, marker);
    }

    // Force a resize after mount for proper rendering
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [open]);

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
          maximumAge: 0,
        })
      );
      const { latitude, longitude } = pos.coords;
      m.setView([latitude, longitude], 16, { animate: true });
      mk.setLatLng([latitude, longitude]);
      setPosition({ lat: latitude, lng: longitude });
    } catch (err) {
      console.error("Geolocation error:", err);
      // Stay at default/current position
    } finally {
      setLocating(false);
    }
  }, []);

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
