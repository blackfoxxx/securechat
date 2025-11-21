import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationMessageProps {
  latitude: number;
  longitude: number;
  address?: string;
}

export function LocationMessage({ latitude, longitude, address }: LocationMessageProps) {
  const openInMaps = () => {
    // Open in Google Maps
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-accent/50 rounded-lg max-w-sm">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <span className="font-medium">Location</span>
      </div>
      
      {address && (
        <p className="text-sm text-muted-foreground">{address}</p>
      )}
      
      <div className="text-xs text-muted-foreground">
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={openInMaps}
        className="w-full"
      >
        Open in Maps
      </Button>
    </div>
  );
}
