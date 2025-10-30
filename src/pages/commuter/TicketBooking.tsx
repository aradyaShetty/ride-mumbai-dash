import { useState, useEffect } from 'react'; // Import useEffect
import { useLocation, useNavigate } from 'react-router-dom'; // Import useLocation/useNavigate
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Removed DialogTrigger
import { Layout } from '@/components/layout/Layout';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import QRCode from 'qrcode.react';
import { 
  Ticket, 
  CreditCard, 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  CheckCircle2,
  Smartphone,
  Download,
  Wallet, // Added Wallet Icon
  ArrowRight,
  History
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api'; // Import our helper
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup

// REMOVED mock mumbaMetroStations

// Kept your ticketTypes
const ticketTypes = [
  { id: 'single', name: 'Single Journey', description: 'One-way ticket for immediate travel' },
  { id: 'return', name: 'Return Journey', description: 'Round-trip ticket valid for same day' },
  { id: 'weekly', name: 'Weekly Pass', description: 'Unlimited travel for 7 days' },
  { id: 'monthly', name: 'Monthly Pass', description: 'Unlimited travel for 30 days' }
];

// Type for the route data passed from the planning page
interface PlannedRoute {
    routeId: number;
    startStationName: string;
    endStationName: string;
    distance: number;
}

// Type for the ticket object received from the backend
interface BackendTicket {
    ticketId: number;
    commuterId: number;
    routeId: number;
    fare: number;
    bookingDateTime: string; // This is LocalDateTime, will be a string
    ticketType: string;
    qrCodeData: string;
    status: string;
}

// Kept your BookingDetails, but it will be populated by BackendTicket
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

export const TicketBooking = () => {
  // --- NEW State for passed route and fare ---
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [fare, setFare] = useState<number>(0);

  // --- Existing State ---
  const [ticketType, setTicketType] = useState('single');
  const [passengers, setPassengers] = useState(1);
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  // isBooking state removed as we now use the dialog
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  // --- NEW State for Payment Method ---
  const [paymentMethod, setPaymentMethod] = useState<string>('WALLET');

  const { toast } = useToast();
  const { user } = useAuth(); // Get user for wallet balance
  const location = useLocation();
  const navigate = useNavigate();

  // --- NEW: Load route data from location state ---
  useEffect(() => {
    if (location.state && location.state.route) {
      const passedRoute: PlannedRoute = location.state.route;
      setRoute(passedRoute);
      // Calculate fare based on backend logic
      const calculatedFare = (passedRoute.distance || 0) * 2.5; // Use 2.5 as per our backend service
      setFare(calculatedFare);
    } else {
      toast({
        variant: "destructive",
        title: "No Route Selected",
        description: "Please plan a route first.",
      });
      navigate('/route-planning');
    }
  }, [location, navigate, toast]);

  // --- UPDATED: calculateFare to use real data ---
  const calculateFare = () => {
    // Simple calculation for now, ignoring ticket type multipliers
    // In a real app, this logic would match the backend's complexity
    return fare * passengers;
  };

  // --- UPDATED: handleBookTicket now just shows payment modal ---
  const handleBookTicket = () => {
    if (!route) {
      toast({ title: "Error", description: "Route data is missing.", variant: "destructive" });
      return;
    }
    setShowPayment(true);
  };

  // --- UPDATED: handlePayment calls the backend ---
  const handlePayment = async () => {
    if (!route) return;

    setIsProcessingPayment(true);
    try {
      const requestBody = {
        routeId: route.routeId, // This ID is -1L for dynamic routes, backend logic must handle this
        ticketType: ticketTypes.find(t => t.id === ticketType)?.name || "Single Journey",
        paymentMethod: paymentMethod,
        // Our backend TicketService doesn't handle passengers count yet,
        // but we'll send it. We need to update backend later.
        // For now, we'll book 1 ticket.
      };

      // --- BACKEND API CALL ---
      const response = await authenticatedFetch('/tickets/book', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Booking failed. Please try again.";
        if (response.status === 400) {
          try {
            const bodyText = await response.text();
            if (bodyText.toLowerCase().includes("insufficient wallet balance")) {
              errorMsg = "Insufficient wallet balance.";
            } else {
              errorMsg = bodyText || "Payment or booking failed.";
            }
          } catch (_) {}
        }
        throw new Error(errorMsg);
      }

      const data: BackendTicket = await response.json();

      // Map backend ticket to frontend's BookingDetails
      setBookingDetails({
        from: route.startStationName,
        to: route.endStationName,
        ticketType: data.ticketType,
        passengers: passengers, // Show passengers from form
        travelDate: travelDate,
        totalFare: data.fare, // Use fare from backend response
        bookingId: data.ticketId.toString(), // Use ticketId as bookingId
        qrCodeData: data.qrCodeData,
        bookingDateTime: data.bookingDateTime
      });

      setIsProcessingPayment(false);
      setShowPayment(false);
      setBookingComplete(true);

      toast({
        title: "Booking Successful!",
        description: "Your tickets have been booked successfully",
      });

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

  const qrCodeData = bookingDetails ? bookingDetails.qrCodeData : '';

  if (!route) {
      // Show loading or nothing while redirecting
      return <Layout><div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Book Your Ticket
          </h1>
          <p className="text-muted-foreground">
            Confirm your journey details and complete payment
          </p>
        </div>

        {!bookingComplete ? (
          <Card className="shadow-custom-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ticket className="w-5 h-5 mr-2" />
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* --- MODIFIED: Route Display --- */}
              <div className="space-y-2">
                <Label>Route</Label>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center font-medium">
                        <MapPin className="mr-2 h-5 w-5 text-primary" /> {route.startStationName}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground mx-4" />
                    <div className="flex items-center font-medium">
                        <MapPin className="mr-2 h-5 w-5 text-success" /> {route.endStationName}
                    </div>
                </div>
              </div>

              {/* Ticket Type Selection (Kept from your original) */}
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

              {/* Passengers and Date (Kept from your original) */}
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

              {/* Fare Summary (UPDATED to use real fare) */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Base Fare (per ticket):</span>
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
                  <span className="text-2xl font-bold text-primary">₹{calculateFare().toFixed(2)}</span>
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
          // Booking Success Screen (Kept from your original)
          <div className="space-y-6">
            <Card className="shadow-custom-lg text-center border-success">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Booking Successful!</h2>
                <p className="text-muted-foreground mb-6">
                  Your tickets have been booked. Show the QR code at the station for entry.
                </p>

                {bookingDetails && (
                  <div className="max-w-md mx-auto">
                    <div className="bg-gradient-card p-6 rounded-lg mb-6">
                      <h3 className="font-semibold text-lg mb-4">Booking Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Booking ID:</span>
                          <span className="font-mono font-semibold">{bookingDetails.bookingId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Route:</span>
                          <span>{bookingDetails.from} → {bookingDetails.to}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Passengers:</span>
                          <span>{bookingDetails.passengers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{new Date(bookingDetails.travelDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total Paid:</span>
                          <span className="text-primary">₹{bookingDetails.totalFare.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code (UPDATED to use real qrCodeData) */}
                    <div className="bg-white p-6 rounded-lg shadow-inner mb-6">
                      <QRCode 
                        value={qrCodeData}
                        size={200}
                        className="mx-auto"
                      />
                      <p className="text-xs text-gray-600 mt-2">Scan this QR code at the station</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => navigate('/history')}>
                        <History className="w-4 h-4 mr-2" />
                        View History
                      </Button>
                      <Button variant="outline" className="flex-1">
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
                  navigate('/route-planning'); // Go back to planning
              }}>
                Book Another Ticket
              </Button>
            </div>
          </div>
        )}

        {/* Payment Modal (UPDATED to use RadioGroup and new payment logic) */}
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Payment Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Route:</span>
                    <span>{route.startStationName} → {route.endStationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passengers:</span>
                    <span>{passengers}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-primary">₹{calculateFare().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2 p-3 bg-background rounded-md border">
                        <RadioGroupItem value="WALLET" id="wallet" />
                        <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center"><Wallet className="mr-2 h-4 w-4" /> Use Wallet</span>
                                <span className="text-sm text-muted-foreground">
                                    Balance: ₹{user?.walletBalance?.toFixed(2) ?? '0.00'}
                                </span>
                            </div>
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-background rounded-md border">
                        <RadioGroupItem value="UPI" id="upi" />
                        <Label htmlFor="upi" className="flex-1 cursor-pointer">
                            <span className="flex items-center"><CreditCard className="mr-2 h-4 w-4" /> UPI / Card / Other</span>
                        </Label>
                    </div>
                </RadioGroup>
              </div>

              <Button 
                onClick={handlePayment} 
                className="w-full" 
                disabled={isProcessingPayment}
                size="lg"
              >
                {isProcessingPayment ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing Payment...
                  </>
                ) : (
                  <>Pay ₹{calculateFare().toFixed(2)}</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};