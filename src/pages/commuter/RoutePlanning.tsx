import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from '@/hooks/use-toast';
import { MapPin, ArrowRightLeft, Zap, ArrowRight } from "lucide-react";
import { authenticatedFetch } from '@/lib/api'; // Import the helper
import { Layout } from '@/components/layout/Layout'; // <-- IMPORT THE LAYOUT
import { useNavigate } from 'react-router-dom';

// Define type for the Route object received from backend
interface PlannedRoute {
  routeId: number;
  startStationName: string;
  endStationName: string;
  distance: number;
}

export const RoutePlanning = () => {
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [stations, setStations] = useState<string[]>([]);
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null);
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch stations on component mount
  useEffect(() => {
    const fetchStations = async () => {
      setIsLoadingStations(true);
      try {
        const response = await authenticatedFetch('/routes/stations');
        if (!response.ok) throw new Error('Failed to fetch stations');
        const data: string[] = await response.json();
        setStations(data);
      } catch (error: any) {
        console.error("Error fetching stations:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Could not load stations.",
        });
      } finally {
        setIsLoadingStations(false);
      }
    };
    fetchStations();
  }, [toast]);

  // Handle planning the route
  const handlePlanRoute = async () => {
    if (!source || !destination || source === destination) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please select valid and different source and destination stations.",
      });
      return;
    }

    setIsLoadingRoute(true);
    setPlannedRoute(null);

    try {
      const params = new URLSearchParams({ source, destination });
      const response = await authenticatedFetch(`/routes/plan?${params.toString()}`);

      if (!response.ok) {
        let errorMsg = "Failed to plan route.";
        if (response.status === 404) {
          errorMsg = "No route found between the selected stations.";
        } else if (response.status === 400) {
          try { const body = await response.text(); errorMsg = body || "Invalid stations selected."; } catch (_) { }
        }
        throw new Error(errorMsg);
      }

      const data: PlannedRoute = await response.json();
      setPlannedRoute(data);
      toast({ title: "Route Found!", description: `Fastest route is ${data.distance.toFixed(1)} km.` });

    } catch (error: any) {
      console.error("Error planning route:", error);
      toast({
        variant: "destructive",
        title: "Route Planning Failed",
        description: error.message || "Could not plan the route.",
      });
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // --- WRAP THE CONTENT IN <Layout> ---
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Plan Your Journey</h1>

        <Card className="shadow-lg mb-8 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" /> Select Stations
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-end">
            {/* Source Station Select */}
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1 block">From</label>
              <Select value={source} onValueChange={setSource} disabled={isLoadingStations}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingStations ? "Loading stations..." : "Select source station"} />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={`source-${station}`} value={station} disabled={station === destination}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Icon */}
            <Button variant="ghost" size="icon" className="hidden md:inline-flex mb-1"
              onClick={() => { const temp = source; setSource(destination); setDestination(temp); }}>
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </Button>

            {/* Destination Station Select */}
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1 block">To</label>
              <Select value={destination} onValueChange={setDestination} disabled={isLoadingStations}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingStations ? "Loading stations..." : "Select destination station"} />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={`dest-${station}`} value={station} disabled={station === source}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan Route Button */}
            <Button
              onClick={handlePlanRoute}
              disabled={isLoadingRoute || isLoadingStations || !source || !destination}
              className="w-full md:w-auto mt-4 md:mt-0 md:mb-1"
            >
              {isLoadingRoute ? <LoadingSpinner size="sm" className="mr-2" /> : <Zap className="mr-2 h-4 w-4" />}
              Find Route
            </Button>
          </CardContent>
        </Card>

        {/* Route Results Display */}
        {isLoadingRoute && (
          <div className="text-center p-8">
            <LoadingSpinner />
            <p className="mt-2 text-muted-foreground">Finding the fastest route...</p>
          </div>
        )}

        {plannedRoute && !isLoadingRoute && (
          <Card className="shadow-lg bg-gradient-card animate-fade-in">
            <CardHeader>
              <CardTitle>Fastest Route Found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center font-medium">
                  <MapPin className="mr-2 h-5 w-5 text-primary" />
                  {plannedRoute.startStationName}
                </div>
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground mx-4" />
                <div className="flex items-center font-medium">
                  <MapPin className="mr-2 h-5 w-5 text-destructive" />
                  {plannedRoute.endStationName}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-sm p-3 bg-background rounded">
                  <Zap className="mr-2 h-4 w-4 text-primary" />
                  Distance: <span className="font-semibold ml-1">{plannedRoute.distance.toFixed(1)} km</span>
                </div>
              </div>
              <Button
                variant="default"
                className="w-full mt-4" // Your existing class
                onClick={() => navigate('/booking', { state: { route: plannedRoute } })} // <-- ADD THIS onClick
              >
                Book Tickets
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};