// backend/server.js

// Import necessary modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // For handling Cross-Origin Resource Sharing

// Initialize Express app and create an HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
// Allow all origins for development purposes. In production, restrict to your frontend's domain.
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"]
    }
});

// Use middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies

// --- In-Memory Database (for demonstration purposes) ---
// In a real application, this would be a persistent database like PostgreSQL, MongoDB, or Firestore.

let buses = [
    { bus_id: 'B001', license_plate: 'KCA 123A', capacity: 50, current_route_id: 'R001', driver_id: 'D001' },
    { bus_id: 'B002', license_plate: 'KCB 456B', capacity: 45, current_route_id: 'R002', driver_id: 'D002' },
    { bus_id: 'B003', license_plate: 'KCC 789C', capacity: 60, current_route_id: 'R001', driver_id: 'D003' }
];

let routes = [
    { route_id: 'R001', route_name: 'City Center to Airport', polyline_coordinates: [
        { latitude: -1.286389, longitude: 36.817223 }, // Nairobi CBD
        { latitude: -1.292066, longitude: 36.820000 },
        { latitude: -1.300000, longitude: 36.830000 },
        { latitude: -1.310000, longitude: 36.840000 },
        { latitude: -1.319722, longitude: 36.890000 }  // Near JKIA
    ]},
    { route_id: 'R002', route_name: 'CBD to Westlands', polyline_coordinates: [
        { latitude: -1.286389, longitude: 36.817223 }, // Nairobi CBD
        { latitude: -1.275000, longitude: 36.800000 },
        { latitude: -1.260000, longitude: 36.790000 },
        { latitude: -1.250000, longitude: 36.780000 }  // Westlands
    ]}
];

let stops = [
    { stop_id: 'S001', stop_name: 'CBD Main Terminal', latitude: -1.286389, longitude: 36.817223 },
    { stop_id: 'S002', stop_name: 'Museum Hill', latitude: -1.278000, longitude: 36.810000 },
    { stop_id: 'S003', stop_name: 'Airport Entrance', latitude: -1.319722, longitude: 36.890000 },
    { stop_id: 'S004', stop_name: 'Westlands Mall', latitude: -1.250000, longitude: 36.780000 }
];

let routeStops = [
    { route_id: 'R001', stop_id: 'S001', order_in_route: 1, scheduled_arrival_time: '08:00', scheduled_departure_time: '08:05' },
    { route_id: 'R001', stop_id: 'S002', order_in_route: 2, scheduled_arrival_time: '08:15', scheduled_departure_time: '08:16' },
    { route_id: 'R001', stop_id: 'S003', order_in_route: 3, scheduled_arrival_time: '08:45', scheduled_departure_time: '08:50' },
    { route_id: 'R002', stop_id: 'S001', order_in_route: 1, scheduled_arrival_time: '09:00', scheduled_departure_time: '09:05' },
    { route_id: 'R002', stop_id: 'S004', order_in_route: 2, scheduled_arrival_time: '09:25', scheduled_departure_time: '09:30' }
];

let liveLocations = [
    { bus_id: 'B001', latitude: -1.286389, longitude: 36.817223, timestamp: Date.now() },
    { bus_id: 'B002', latitude: -1.275000, longitude: 36.800000, timestamp: Date.now() },
    { bus_id: 'B003', latitude: -1.286389, longitude: 36.817223, timestamp: Date.now() }
];

// --- Helper function for Haversine distance calculation (between two lat/lon points) ---
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d; // returns distance in meters
}

// --- API Endpoints ---

// GET /routes: Retrieve all bus routes
app.get('/routes', (req, res) => {
    res.json(routes);
});

// GET /routes/:id/stops: Get stops for a specific route
app.get('/routes/:id/stops', (req, res) => {
    const { id } = req.params;
    const stopsOnRoute = routeStops.filter(rs => rs.route_id === id)
                                   .map(rs => {
                                       const stop = stops.find(s => s.stop_id === rs.stop_id);
                                       return { ...stop, ...rs }; // Combine stop details with route-specific stop info
                                   })
                                   .sort((a, b) => a.order_in_route - b.order_in_route);
    if (stopsOnRoute.length > 0) {
        res.json(stopsOnRoute);
    } else {
        res.status(404).json({ message: 'Route or stops not found.' });
    }
});

// GET /stops/:id: Get details for a specific stop
app.get('/stops/:id', (req, res) => {
    const { id } = req.params;
    const stop = stops.find(s => s.stop_id === id);
    if (stop) {
        res.json(stop);
    } else {
        res.status(404).json({ message: 'Stop not found.' });
    }
});

// GET /buses/live-location/:bus_id: Get the latest live location of a specific bus
app.get('/buses/live-location/:bus_id', (req, res) => {
    const { bus_id } = req.params;
    const location = liveLocations.find(loc => loc.bus_id === bus_id);
    if (location) {
        res.json(location);
    } else {
        res.status(404).json({ message: 'Live location not found for this bus.' });
    }
});

// POST /buses/location-update: (Driver app) Endpoint for buses to send their current GPS coordinates
app.post('/buses/location-update', (req, res) => {
    const { bus_id, latitude, longitude } = req.body;
    if (!bus_id || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: 'Missing bus_id, latitude, or longitude.' });
    }

    let locationIndex = liveLocations.findIndex(loc => loc.bus_id === bus_id);
    if (locationIndex !== -1) {
        liveLocations[locationIndex] = { bus_id, latitude, longitude, timestamp: Date.now() };
    } else {
        liveLocations.push({ bus_id, latitude, longitude, timestamp: Date.now() });
    }

    // Emit live location update to all connected clients via Socket.IO
    io.emit('busLocationUpdate', { bus_id, latitude, longitude, timestamp: Date.now() });

    res.status(200).json({ message: 'Location updated successfully.', location: liveLocations.find(loc => loc.bus_id === bus_id) });
});

// GET /buses/eta/:bus_id/:destination_stop_id: Calculate and return ETA
app.get('/buses/eta/:bus_id/:destination_stop_id', (req, res) => {
    const { bus_id, destination_stop_id } = req.params;

    const busLocation = liveLocations.find(loc => loc.bus_id === bus_id);
    const destinationStop = stops.find(s => s.stop_id === destination_stop_id);
    const bus = buses.find(b => b.bus_id === bus_id);

    if (!busLocation || !destinationStop || !bus) {
        return res.status(404).json({ message: 'Bus, destination stop, or bus live location not found.' });
    }

    // Simplified ETA Calculation Logic:
    // This is a basic estimation. In a real app, you'd use a robust routing API
    // that considers actual road networks, traffic, and bus speed.

    // Find the route the bus is currently on
    const currentRoute = routes.find(r => r.route_id === bus.current_route_id);
    if (!currentRoute) {
        return res.status(404).json({ message: 'Bus is not assigned to a valid route.' });
    }

    // Get ordered stops for the current route
    const orderedRouteStops = routeStops
        .filter(rs => rs.route_id === currentRoute.route_id)
        .sort((a, b) => a.order_in_route - b.order_in_route)
        .map(rs => stops.find(s => s.stop_id === rs.stop_id));

    const destinationStopIndex = orderedRouteStops.findIndex(s => s.stop_id === destination_stop_id);
    if (destinationStopIndex === -1) {
        return res.status(400).json({ message: 'Destination stop is not on the bus\'s current route.' });
    }

    let estimatedDistanceMeters = 0;
    // Calculate distance from bus's current location to the destination stop
    // This is a very rough estimate, assuming direct path.
    // A more accurate approach would involve finding the closest point on the polyline,
    // then summing distances along the polyline to the destination stop.
    estimatedDistanceMeters = haversineDistance(
        busLocation.latitude, busLocation.longitude,
        destinationStop.latitude, destinationStop.longitude
    );

    // Estimate average bus speed (e.g., 20 km/h = 5.56 m/s)
    const averageBusSpeedMps = 5.56; // meters per second (approx 20 km/h)
    const estimatedTravelTimeSeconds = estimatedDistanceMeters / averageBusSpeedMps;
    const estimatedMinutes = Math.ceil(estimatedTravelTimeSeconds / 60);

    // In a real scenario, you'd also consider:
    // 1. Where the bus is on its route (e.g., has it passed previous stops?)
    // 2. Real-time traffic conditions (via Google Maps Directions API or similar)
    // 3. Scheduled times and delays.

    res.json({
        bus_id,
        destination_stop_id,
        estimated_arrival_time_minutes: estimatedMinutes,
        estimated_arrival_time_text: `${estimatedMinutes} minutes`
    });
});

// GET /buses/departure-time/:bus_id/:origin_stop_id: Get departure time
app.get('/buses/departure-time/:bus_id/:origin_stop_id', (req, res) => {
    const { bus_id, origin_stop_id } = req.params;

    const bus = buses.find(b => b.bus_id === bus_id);
    if (!bus) {
        return res.status(404).json({ message: 'Bus not found.' });
    }

    const routeStopInfo = routeStops.find(rs => rs.route_id === bus.current_route_id && rs.stop_id === origin_stop_id);

    if (routeStopInfo) {
        res.json({
            bus_id,
            origin_stop_id,
            scheduled_departure_time: routeStopInfo.scheduled_departure_time,
            // In a real app, you might also track actual departure times
            actual_departure_time: null // Placeholder
        });
    } else {
        res.status(404).json({ message: 'Departure time not found for this bus at this origin stop.' });
    }
});


// --- Start the Server ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log('--- API Endpoints ---');
    console.log(`GET  http://localhost:${PORT}/routes`);
    console.log(`GET  http://localhost:${PORT}/routes/:id/stops`);
    console.log(`GET  http://localhost:${PORT}/stops/:id`);
    console.log(`GET  http://localhost:${PORT}/buses/live-location/:bus_id`);
    console.log(`POST http://localhost:${PORT}/buses/location-update (body: {bus_id, latitude, longitude})`);
    console.log(`GET  http://localhost:${PORT}/buses/eta/:bus_id/:destination_stop_id`);
    console.log(`GET  http://localhost:${PORT}/buses/departure-time/:bus_id/:origin_stop_id`);
    console.log('--- Socket.IO Event ---');
    console.log('Emits: "busLocationUpdate" {bus_id, latitude, longitude, timestamp}');
});

