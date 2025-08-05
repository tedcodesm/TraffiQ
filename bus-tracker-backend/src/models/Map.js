import mongoose from 'mongoose';

const MapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  reachedAt: {
    type: Date,
    default: Date.now
  }
},
{timestamps:true});