import { useState, useEffect } from 'react'; // Import useEffect
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from '@/components/layout/Layout';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin,
  ArrowRight,
  Clock,
  Train,
  Route,
  Navigation,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { authenticatedFetch } from '@/lib/api'; // Import our helper

// REMOVED hardcoded mumbaMetroStations array

// Define the REAL data structure from the backend (Task 6)
interface BackendRouteResult {
  routeId: number;
  startStationName: string;
  endStationName: string;
  distance: number;
}

// Kept your original UI-facing interface
interface RouteStep {
  station: string;
  line: string;
  platform: string;
  arrivalTime: string;
  departureTime: string;
  isTransfer?: boolean;
}

interface RouteResult {
  totalTime: string;
  totalDistance: string;
  fare: string;
  steps: RouteStep[];
  // Add backend data for passing to booking page
  backendRoute?: BackendRouteResult;
}

export const RoutePlanning = () => {
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [travelTime, setTravelTime] = useState('now');
  const [isPlanning, setIsPlanning] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize navigate

  // --- NEW STATE for stations ---
  const [stations, setStations] = useState<string[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);

  // --- NEW: Fetch stations from backend on load ---
  useEffect(() => {
    const fetchStations = async () => {
      setIsLoadingStations(true);
      try {
        const response = await authenticatedFetch('/routes/stations'); // Endpoint from Task 3
        if (!response.ok) throw new Error('Failed to fetch stations');
        const data: string[] = await response.json();
        setStations(data); // Use the 10 stations from our backend
        console.log("Stations fetched:", data);
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
  }, [toast]); // Run once

  // --- UPDATED: handlePlanRoute to call backend ---
  const handlePlanRoute = async () => {
    if (!fromStation || !toStation) {
      toast({ title: "Missing Information", description: "Please select both source and destination", variant: "destructive" });
      return;
    }
    if (fromStation === toStation) {
      toast({ title: "Invalid Route", description: "Source and destination cannot be the same", variant: "destructive" });
      return;
    }

    setIsPlanning(true);
    setRouteResult(null); // Clear previous results

    try {
      const params = new URLSearchParams({ source: fromStation, destination: toStation });
      const response = await authenticatedFetch(`/routes/plan?${params.toString()}`);

      if (!response.ok) {
        let errorMsg = "Failed to plan route.";
        if (response.status === 404) {
          errorMsg = "No route found between these stations.";
        } else if (response.status === 400) {
          errorMsg = "Invalid stations selected.";
        }
        throw new Error(errorMsg);
      }

      const data: BackendRouteResult = await response.json();
      console.log("Backend route data:", data);

      // --- ADAPT BACKEND DATA to frontend structure ---
      // We adapt the simple backend response to fit your complex UI
      setRouteResult({
        totalTime: "N/A", // We don't have this from backend yet
        totalDistance: `${data.distance.toFixed(1)} km`, // This works!
        fare: "N/A", // We don't have this from backend yet
        steps: [ // Create mock steps just to show start and end
          { station: data.startStationName, line: "Line 1", platform: "Platform 1 (Mock)", arrivalTime: "N/A", departureTime: "N/A" },
          { station: data.endStationName, line: "Line 1", platform: "Platform 2 (Mock)", arrivalTime: "N/A", departureTime: "N/A" }
        ],
        backendRoute: data // <-- Store the real backend data
      });

      toast({
        title: "Route Found!",
        description: `Fastest route is ${data.distance.toFixed(1)} km.`,
      });

    } catch (error: any) {
      console.error("Error planning route:", error);
      toast({
        variant: "destructive",
        title: "Route Planning Failed",
        description: error.message,
      });
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSwapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  // --- UPDATED: Navigate to booking ---
  const handleProceedToBooking = () => {
    if (routeResult?.backendRoute) {
      // Pass the *original* backend route object to the booking page
      navigate('/booking', { state: { route: routeResult.backendRoute } });
    } else {
      toast({ title: "Error", description: "Cannot proceed, route data missing.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header (No Changes) */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Plan Your Route
          </h1>
          <p className="text-muted-foreground">
            Find the best route for your Mumbai Metro journey
          </p>
        </div>

        {/* Route Planning Form */}
        <Card className="shadow-custom-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Route className="w-5 h-5 mr-2" />
              Route Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="from">From Station</Label>
                {/* UPDATED Select to use 'stations' state */}
                <Select value={fromStation} onValueChange={setFromStation} disabled={isLoadingStations}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingStations ? "Loading stations..." : "Select source station"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem key={`from-${station}`} value={station}>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-primary" />
                          {station}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="to">To Station</Label>
                {/* UPDATED Select to use 'stations' state */}
                <Select value={toStation} onValueChange={setToStation} disabled={isLoadingStations}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingStations ? "Loading stations..." : "Select destination station"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem key={`to-${station}`} value={station}>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-success" />
                          {station}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Swap Button (No Changes) */}
            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={handleSwapStations}
                className="rounded-full"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Time Select (No Changes - this is cosmetic for now) */}
            <div className="space-y-2">
              <Label htmlFor="time">Travel Time</Label>
              <Select value={travelTime} onValueChange={setTravelTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Leave Now</SelectItem>
                  <SelectItem value="depart">Depart at Specific Time</SelectItem>
                  <SelectItem value="arrive">Arrive by Specific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button (No Changes) */}
            <Button
              onClick={handlePlanRoute}
              className="w-full"
              disabled={isPlanning || isLoadingStations}
              size="lg"
            >
              {isPlanning ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Planning Route...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Plan My Route
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Route Results (Kept your UI, but uses adapted data) */}
        {routeResult && (
          <Card className="shadow-custom-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Train className="w-5 h-5 mr-2" />
                  Route Information
                </span>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Total Time: <span className="font-semibold text-foreground">{routeResult.totalTime}</span></div>
                  <div>Distance: <span className="font-semibold text-foreground">{routeResult.totalDistance}</span></div>
                  <div>Fare: <span className="font-semibold text-primary">{routeResult.fare}</span></div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routeResult.steps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-success' :
                          index === routeResult.steps.length - 1 ? 'bg-destructive' :
                            'bg-primary'
                        }`} />
                      {index < routeResult.steps.length - 1 && (
                        <div className="w-0.5 h-12 bg-border mt-2" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{step.station}</p>
                          <p className="text-sm text-muted-foreground">
                            {step.line} • {step.platform}
                          </p>
                          {step.isTransfer && (
                            <div className="flex items-center mt-1">
                              <AlertCircle className="w-3 h-3 text-warning mr-1" />
                              <span className="text-xs text-warning font-medium">Transfer</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {step.arrivalTime}
                          </div>
                          {step.departureTime !== step.arrivalTime && (
                                                    <div className="text-xs text-muted-foreground">
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                        
                                      <Button onClick={handleProceedToBooking} className="w-full mt-6">
                                        <ArrowRight className="w-4 h-4 mr-2" />
                                        Proceed to Booking
                                      </Button>
                                                              </CardContent>
                                                            </Card>
                                                          )}
                                                        </div>
                                                      </Layout>
                              );
                            };