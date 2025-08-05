import mongoose from 'mongoose';

const MapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  date: {
    type: Date,
    required: true
  },

  // Morning trip
  morningPickup: {
    type: Date,
    default: null
  },
  morningArrival: {
    type: Date,
    default: null
  },

  // Evening trip
  eveningPickup: {
    type: Date,
    default: null
  },
  eveningArrival: {
    type: Date,
    default: null
  },

  from: String,
  to: String
},
{timestamps:true});

const Map = mongoose.model('Map', MapSchema);
export default Map;

