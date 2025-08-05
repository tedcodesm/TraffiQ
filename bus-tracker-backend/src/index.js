import express from "express";
import dotenv from "dotenv"
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"
import mapRoutes from "./routes/mapRoutes.js"
 
dotenv.config();
const app = express();
const port = process.env.PORT;
app.use(express.json({limit : '10mb'}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use("/api/auth",authRoutes);
app.use("/api/map",mapRoutes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});