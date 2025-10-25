import { useState, useEffect } from 'react'; // Import useEffect
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from '@/components/layout/Layout';
import QRCode from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { authenticatedFetch } from '@/lib/api'; // Import our helper
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  History,
  Search,
  Filter,
  Download,
  RotateCcw,
  MapPin,
  Calendar,
  Clock,
  Users,
  CreditCard,
  XCircle // Added for Cancel
} from 'lucide-react';

// Type for TravelHistory object from backend
interface TravelRecord {
  historyId: number;
  commuterId: number;
  ticketId: number;
  journeyDateTime: string;
  startStationName: string;
  endStationName: string;
  farePaid: number;
  // We need ticket status, but TravelHistory doesn't have it.
  // We'll fetch Tickets instead, which is more accurate.
}

// Type for Ticket object from backend
interface BackendTicket {
  ticketId: number;
  routeId: number; // We'd need to fetch route details separately if needed
  fare: number;
  bookingDateTime: string;
  ticketType: string;
  qrCodeData: string;
  status: 'BOOKED' | 'USED' | 'CANCELLED' | 'EXPIRED';
  // We need to get route info for display.
  // Our backend /api/commuter/tickets endpoint doesn't provide this yet.
  // Let's use /api/commuter/history as it's simpler for now.
}

export const TravelHistory = () => {
  const [history, setHistory] = useState<TravelRecord[]>([]); // Use TravelRecord
  const [filteredHistory, setFilteredHistory] = useState<TravelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // This filter won't work yet
  const [selectedTicket, setSelectedTicket] = useState<TravelRecord | null>(null);
  const { toast } = useToast();

  // --- NEW: Fetch history on load ---
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/commuter/history');
      if (!response.ok) throw new Error('Failed to fetch travel history');
      const data: TravelRecord[] = await response.json();
      // Sort by date, newest first
      data.sort((a, b) => new Date(b.journeyDateTime).getTime() - new Date(a.journeyDateTime).getTime());
      setHistory(data);
      setFilteredHistory(data); // Initially show all
      console.log("History fetched:", data);
    } catch (error: any) {
      console.error("Error fetching history:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []); // Removed 'toast' from dependency array to prevent re-fetch on toast

  // --- MODIFIED: Filter logic ---
  useEffect(() => {
    let filtered = history;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.startStationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.endStationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.ticketId.toString().includes(searchTerm)
      );
    }

    // Note: Status filter is not possible as /api/commuter/history
    // does not return the *current* ticket status (e.g. "CANCELLED").
    // We will ignore this filter for now.

    setFilteredHistory(filtered);
  }, [searchTerm, statusFilter, history]);


  // --- NEW: Handle Ticket Cancellation ---
  const handleCancelTicket = async (ticketId: number) => {
    try {
      const response = await authenticatedFetch(`/commuter/tickets/${ticketId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg || "Failed to cancel ticket.");
      }

      toast({ title: "Success", description: "Ticket cancelled and refunded (if applicable)." });
      fetchHistory(); // Refresh the list

    } catch (error: any) {
      console.error("Cancel error:", error);
      toast({ variant: "destructive", title: "Cancellation Failed", description: error.message });
    }
  };

  // Mock rebook
  const handleRebook = (record: TravelRecord) => {
    console.log('Rebooking ticket:', record);
    toast({ title: "Note", description: "Rebooking not implemented yet." });
  };

  // Mock QR modal (uses history data)
  const handleViewQR = (record: TravelRecord) => {
    setSelectedTicket(record);
  };

  // Status color (simplified)
  const getStatusColor = (status: string) => {
    // This is mocked as history doesn't contain real-time status
    if (status === 'cancelled') return 'bg-destructive text-destructive-foreground';
    if (status === 'upcoming') return 'bg-primary text-primary-foreground';
    return 'bg-success text-success-foreground';
  };


  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header (No changes) */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Travel History</h1>
          <p className="text-muted-foreground">View and manage your past and upcoming journeys</p>
        </div>

        {/* Filters (Modified: Search only) */}
        <Card className="shadow-custom-md mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by station or ticket ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {/* Status filter is disabled as data is not available */}
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={true}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status (Default)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List (MODIFIED) */}
        {isLoading ? (
          <div className="text-center p-12"><LoadingSpinner size="lg" /></div>
        ) : filteredHistory.length === 0 ? (
          <Card className="shadow-custom-md">
            <CardContent className="p-8 text-center">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No tickets found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria.' : 'You haven\'t booked any tickets yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((record) => (
              <Card key={record.historyId} className="shadow-custom-md hover:shadow-custom-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Ticket Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-semibold">{record.startStationName}</span>
                            <span className="text-muted-foreground">→</span>
                            <MapPin className="w-4 h-4 text-success" />
                            <span className="font-semibold">{record.endStationName}</span>
                          </div>
                        </div>
                        {/* We can't show status from history, so we hide it */}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(record.journeyDateTime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(record.journeyDateTime).toLocaleTimeString()}</span>
                        </div>
                        {/* Passengers data not in TravelHistory. Need backend update. */}
                        {/* <div className="flex items-center space-x-2">
                                                  <Users className="w-4 h-4 text-muted-foreground" />
                                                  <span>{record.passengers} passenger{record.passengers > 1 ? 's' : ''}</span>
                                              </div> */}
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">₹{record.farePaid.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-muted-foreground">Ticket ID: </span>
                          <span className="text-xs font-mono font-semibold">{record.ticketId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:w-auto w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewQR(record)} // Shows mock QR
                      >
                        View QR
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelTicket(record.ticketId)}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Cancel Ticket
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal (Kept from your original, but uses record data) */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Travel Ticket</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCode
                  value={JSON.stringify({ // QR data is mock, as history doesn't store QR
                    bookingId: selectedTicket.ticketId,
                    from: selectedTicket.startStationName,
                    to: selectedTicket.endStationName,
                    date: selectedTicket.journeyDateTime,
                  })}
                  size={200}
                  className="mx-auto"
                />
              </div>

              <div className="text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route:</span>
                  <span>{selectedTicket.startStationName} → {selectedTicket.endStationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(selectedTicket.journeyDateTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono">{selectedTicket.ticketId}</span>
                </div>
              </div>

              <Button onClick={() => setSelectedTicket(null)} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
  </Layout >
  );

}