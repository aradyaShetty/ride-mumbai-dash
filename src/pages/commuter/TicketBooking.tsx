import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Layout } from '@/components/layout/Layout';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import QRCode from 'qrcode.react';
import { authenticatedFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Ticket, 
  CreditCard, 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  CheckCircle2,
  Download,
  History,
  Wallet,
  ArrowRight,
  ArrowRightLeft,
  Navigation as NavigationIcon
} from 'lucide-react';

// Define data interfaces
interface PlannedRoute {
    routeId: number;
    startStationName: string;
    endStationName: string;
    distance: number;
}
interface BackendTicket {
    ticketId: number;
    routeId: number;
    fare: number;
    bookingDateTime: string;
    ticketType: string;
    qrCodeData: string;
    status: string;
}
interface BookingDetails {
  from: string;
  to: string;
  ticketType: string;
  passengers: number;
  travelDate: string;
  totalFare: number;
  bookingId: string;
  qrCodeData: string;
  bookingDateTime: string;
}

const ticketTypes = [
  { id: 'single', name: 'Single Journey', description: 'One-way ticket for immediate travel' },
  { id: 'return', name: 'Return Journey', description: 'Round-trip ticket valid for same day' },
];

export const TicketBooking = () => {
    // --- State for SRC/DST Selection ---
    const [source, setSource] = useState<string>('');
    const [destination, setDestination] = useState<string>('');
    const [stations, setStations] = useState<string[]>([]);
    const [isLoadingStations, setIsLoadingStations] = useState<boolean>(true);
    const [isPlanningRoute, setIsPlanningRoute] = useState<boolean>(false); 
    
    // --- Route/Booking State ---
    const [route, setRoute] = useState<PlannedRoute | null>(null);
    const [fare, setFare] = useState<number>(0);
    const [ticketType, setTicketType] = useState('single');
    const [passengers, setPassengers] = useState(1);
    const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [showPayment, setShowPayment] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [bookingComplete, setBookingComplete] = useState(false);
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('WALLET');

    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();

    // --- Load Stations and Check for Passed Route ---
    useEffect(() => {
        const fetchStationsAndRoute = async () => {
            setIsLoadingStations(true);
            try {
                const response = await authenticatedFetch('/routes/stations');
                if (!response.ok) throw new Error('Failed to fetch stations');
                const data: string[] = await response.json();
                setStations(data);
            } catch (error) {
                console.error("Error fetching stations:", error);
            } finally {
                setIsLoadingStations(false);
            }

            if (location.state && location.state.route) {
                const passedRoute: PlannedRoute = location.state.route;
                setRoute(passedRoute);
                setSource(passedRoute.startStationName);
                setDestination(passedRoute.endStationName);
                const calculatedFare = (passedRoute.distance || 0) * 2.5; 
                setFare(calculatedFare);
            }
        };
        fetchStationsAndRoute();
    }, [location]);
    
    // --- Plan Route (if not passed from previous page) ---
    const handlePlanRoute = async () => {
        if (!source || !destination || source === destination) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please select valid and different source and destination stations." });
            return;
        }

        setIsPlanningRoute(true);
        setRoute(null); 
        setFare(0);
        
        try {
            const params = new URLSearchParams({ source, destination });
            const response = await authenticatedFetch(`/routes/plan?${params.toString()}`);

            if (!response.ok) {
                let errorMsg = "Route planning failed.";
                if (response.status === 404) errorMsg = "No route found between selected stations.";
                throw new Error(errorMsg);
            }

            const data: PlannedRoute = await response.json();
            setRoute(data);
            const calculatedFare = (data.distance || 0) * 2.5;
            setFare(calculatedFare);
            toast({ title: "Route Confirmed", description: `Route is ${data.distance.toFixed(1)} km. Fare calculated.` });

        } catch (error: any) {
            console.error("Route planning error:", error);
            toast({ variant: "destructive", title: "Route Planning Failed", description: error.message });
        } finally {
            setIsPlanningRoute(false);
        }
    };
    
    // --- Open Payment Modal ---
    const handleBookTicket = () => {
      if (!route) {
          toast({ title: "Error", description: "Please plan a route first.", variant: "destructive" });
          return;
      }
      setShowPayment(true);
    };

    // --- Call Booking API ---
    const handlePayment = async () => {
      if (!route) return;

      setIsProcessingPayment(true);
      try {
        // This request body matches the backend DTO
        const requestBody = {
            startStationName: route.startStationName,
            endStationName: route.endStationName,
            distance: route.distance,
            ticketType: ticketTypes.find(t => t.id === ticketType)?.name || "Single Journey",
            paymentMethod: paymentMethod,
        };

        const response = await authenticatedFetch('/tickets/book', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let errorMsg = "Booking failed. Please try again.";
          if (response.status === 400) {
              const bodyText = await response.text();
              errorMsg = bodyText || "Payment or booking failed.";
          }
          throw new Error(errorMsg);
        }

        const data: BackendTicket = await response.json();

        setBookingDetails({
          from: route.startStationName,
          to: route.endStationName,
          ticketType: data.ticketType,
          passengers: passengers, 
          travelDate: travelDate,
          totalFare: data.fare, 
          bookingId: data.ticketId.toString(),
          qrCodeData: data.qrCodeData,
          bookingDateTime: data.bookingDateTime
        });

        setIsProcessingPayment(false);
        setShowPayment(false);
        setBookingComplete(true);

        toast({ title: "Booking Successful!", description: `Ticket ID: ${data.ticketId} booked successfully.` });

      } catch (error: any) {
        setIsProcessingPayment(false);
        console.error("Booking error:", error);
        toast({
          variant: "destructive",
          title: "Booking Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    };

    const getCalculatedTotalFare = () => {
      return fare * passengers;
    };
    
    // --- Render Logic ---

    // Show planning UI if no route is set
    if (!route && !bookingComplete) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <h1 className="text-3xl font-bold mb-6 text-primary">Book Ticket</h1>
                    <Card className="shadow-custom-lg mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center"><NavigationIcon className="w-5 h-5 mr-2" /> Plan Your Route</CardTitle>
                            <CardDescription>Select your start and end stations to calculate fare.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="from">From Station</Label>
                                    <Select value={source} onValueChange={setSource} disabled={isLoadingStations}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingStations ? "Loading stations..." : "Select source station"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stations.map((station) => (
                                                <SelectItem key={`from-${station}`} value={station} disabled={station === destination}>
                                                    <div className="flex items-center">
                                                        <MapPin className="w-4 h-4 mr-2 text-primary" />{station}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="to">To Station</Label>
                                    <Select value={destination} onValueChange={setDestination} disabled={isLoadingStations}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingStations ? "Loading stations..." : "Select destination station"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stations.map((station) => (
                                                <SelectItem key={`to-${station}`} value={station} disabled={station === source}>
                                                    <div className="flex items-center">
                                                        <MapPin className="w-4 h-4 mr-2 text-success" />{station}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-center">
                                <Button variant="outline" size="icon" onClick={() => { const temp = source; setSource(destination); setDestination(temp); }} className="rounded-full">
                                    <ArrowRightLeft className="w-4 h-4" />
                                </Button>
                            </div>

                            <Button 
                                onClick={handlePlanRoute} 
                                className="w-full"
                                disabled={isPlanningRoute || isLoadingStations || !source || !destination}
                                size="lg"
                            >
                                {isPlanningRoute ? (
                                    <><LoadingSpinner size="sm" className="mr-2" /> Planning Route...</>
                                ) : (
                                    <><NavigationIcon className="w-4 h-4 mr-2" /> Find Route & Fare</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    // Show Booking Form if route is set
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {bookingComplete ? 'Booking Successful!' : 'Book Your Ticket'}
            </h1>
            <p className="text-muted-foreground">
              {bookingComplete ? 'Scan the QR code below for entry.' : 'Confirm your journey details and proceed to payment.'}
            </p>
          </div>

          {!bookingComplete ? (
            <Card className="shadow-custom-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="w-5 h-5 mr-2" />
                  Journey & Fare
                </CardTitle>
                <CardDescription>
                    <div className="font-semibold text-foreground">
                        {route?.startStationName} <ArrowRight className='inline h-3 w-3 mx-1' /> {route?.endStationName}
                    </div>
                    <span className="text-muted-foreground text-xs">Distance: {route?.distance?.toFixed(1) || 'N/A'} km</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-3">
                  <Label>Ticket Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ticketTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          ticketType === type.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setTicketType(type.id)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            ticketType === type.id ? 'border-primary bg-primary' : 'border-border'
                          }`} />
                          <h3 className="font-medium">{type.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Number of Passengers</Label>
                    <Select value={passengers.toString()} onValueChange={(value) => setPassengers(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              {num} {num === 1 ? 'Passenger' : 'Passengers'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Travel Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="pl-10"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Base Fare:</span>
                    <span className="font-medium">₹{fare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Passengers:</span>
                    <span className="font-medium">{passengers}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3 pb-3 border-b">
                    <span className="text-sm text-muted-foreground">Ticket Type:</span>
                    <span className="font-medium">{ticketTypes.find(t => t.id === ticketType)?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Fare:</span>
                    <span className="text-2xl font-bold text-primary">₹{getCalculatedTotalFare().toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleBookTicket} 
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Payment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="shadow-custom-lg text-center border-success">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your tickets are ready. Show the QR code at the gate.
                  </p>
                  
                  {bookingDetails && (
                    <div className="max-w-md mx-auto">
                      <div className="bg-gradient-card p-6 rounded-lg mb-6">
                        <h3 className="font-semibold text-lg mb-4">Ticket</h3>
                        <div className="space-y-2 text-sm">
                          <div className="bg-white p-6 rounded-lg shadow-inner mb-6">
                            <QRCode 
                              value={bookingDetails.qrCodeData}
                              size={200}
                              className="mx-auto"
                            />
                            <p className="text-xs text-gray-600 mt-2">Scan this code at the station</p>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Booking ID:</span>
                            <span className="font-mono font-semibold">{bookingDetails.bookingId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Route:</span>
                            <span>{bookingDetails.from} → {bookingDetails.to}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Total Paid:</span>
                            <span className="text-primary">₹{bookingDetails.totalFare.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => navigate('/history')}>
                          <History className="w-4 h-4 mr-2" />
                          View History
                        </Button>
                        <Button variant="default" className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Download Ticket
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center space-x-4">
                <Button onClick={() => {
                    setBookingComplete(false);
                    setRoute(null); // Clear route state
                }}>
                  Book Another Ticket
                </Button>
              </div>
            </div>
          )}

          {/* Payment Modal */}
          <Dialog open={showPayment} onOpenChange={setShowPayment}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Confirmation
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Payment Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Route:</span>
                      <span>{route?.startStationName} → {route?.endStationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passengers:</span>
                      <span>{passengers}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
