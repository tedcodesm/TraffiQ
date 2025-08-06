import express from 'express';
import Map from '../models/Map.js';

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Utility function to convert time string to Date object (for today's date)
const convertTimeToDate = (timeStr) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

router.post('/bus_log', async (req, res) => {
  try {
    const { userId, type, pickupTime, arrivalTime } = req.body;

    const date = new Date();
    date.setHours(0, 0, 0, 0); // normalize to midnight

    let map = await Map.findOne({ userId, date });

    if (!map) {
      map = new Map({ userId, date });
    }

    // Convert time strings to Date objects
    const pickup = convertTimeToDate(pickupTime);
    const arrival = convertTimeToDate(arrivalTime);

    if (type === 'morning') {
      map.morningPickup = pickup;
      map.morningArrival = arrival;
    } else if (type === 'evening') {
      map.eveningPickup = pickup;
      map.eveningArrival = arrival;
    }

    await map.save();
    res.status(200).json({ message: 'Bus log updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.get("/bus_log/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const log = await Map.findOne({ userId, date });

    if (!log) {
      return res.status(404).json({ message: "No log found" });
    }

    res.json({
      morningPickup: log.morningPickup
        ? new Date(log.morningPickup).toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
      morningArrival: log.morningArrival
        ? new Date(log.morningArrival).toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
      eveningPickup: log.eveningPickup
        ? new Date(log.eveningPickup).toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
      eveningArrival: log.eveningArrival
        ? new Date(log.eveningArrival).toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


export default router;
