import { MapPin, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/contexts/SocketContext";

interface LiveLocationMessageProps {
  messageId: number;
  senderId: number;
  senderName: string;
  initialLatitude: number;
  initialLongitude: number;
  isActive: boolean;
  startedAt: string;
  onStop?: () => void;
  canStop?: boolean;
}

export function LiveLocationMessage({
  messageId,
  senderId,
  senderName,
  initialLatitude,
  initialLongitude,
  isActive,
  startedAt,
  onStop,
  canStop = false,
}: LiveLocationMessageProps) {
  const [currentLocation, setCurrentLocation] = useState({
    latitude: initialLatitude,
    longitude: initialLongitude,
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date(startedAt));
  const [duration, setDuration] = useState(0);
  const { socket } = useSocket();
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Update duration every second
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startedAt]);

  // Listen for location updates via Socket.IO
  useEffect(() => {
    if (!socket || !isActive) return;

    const handleLocationUpdate = (data: {
      messageId: number;
      latitude: number;
      longitude: number;
      timestamp: string;
    }) => {
      if (data.messageId === messageId) {
        setCurrentLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setLastUpdate(new Date(data.timestamp));

        // Update marker position on map
        if (markerRef.current && mapInstanceRef.current) {
          const newPosition = new google.maps.LatLng(data.latitude, data.longitude);
          markerRef.current.setPosition(newPosition);
          mapInstanceRef.current.panTo(newPosition);
        }
      }
    };

    socket.on("location:update", handleLocationUpdate);

    return () => {
      socket.off("location:update", handleLocationUpdate);
    };
  }, [socket, messageId, isActive]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
      });

      const marker = new google.maps.Marker({
        position: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        map: map,
        title: senderName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }
  }, [currentLocation.latitude, currentLocation.longitude, senderName]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLastUpdate = () => {
    const secondsAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minsAgo = Math.floor(secondsAgo / 60);
    return `${minsAgo}m ago`;
  };

  const openInMaps = () => {
    window.open(
      `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`,
      '_blank'
    );
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-accent/50 rounded-lg max-w-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className={`h-5 w-5 ${isActive ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
          <span className="font-medium">
            {isActive ? 'Live Location' : 'Location Sharing Ended'}
          </span>
        </div>
        {isActive && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Map container */}
      <div 
        ref={mapRef}
        className="w-full h-48 rounded-lg bg-muted"
        style={{ minHeight: '192px' }}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>
            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </span>
        </div>
        {isActive && <span>Updated {formatLastUpdate()}</span>}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={openInMaps}
          className="flex-1"
        >
          Open in Maps
        </Button>
        {canStop && isActive && onStop && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            className="flex-1"
          >
            Stop Sharing
          </Button>
        )}
      </div>
    </div>
  );
}
