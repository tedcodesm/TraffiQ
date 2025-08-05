import express from 'express';
import Map from '../models/Map.js';

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({extended:true}));

router.post("/bus_log", async(req,res)=>{
  try {
  const { userId, type, pickupTime, arrivalTime } = req.body;

  const date = new Date();
  date.setHours(0, 0, 0, 0); 

  let map = await Map.findOne({
    userId,
    date
  });

    if (!map) {
        map = new Map({
            userId,
            date,
        });
    }

    if (type === 'morning') {
        map.morningPickup = pickupTime;
        map.morningArrival = arrivalTime;
    }   
    else if (type === 'evening') {
        map.eveningPickup = pickupTime;
        map.eveningArrival = arrivalTime;
    }

    await map.save();
    res.status(200).json({ message: 'Bus log updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
export default router;