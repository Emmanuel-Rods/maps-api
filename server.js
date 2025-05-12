import express, { json } from "express";
import cors from "cors";
import scraper from "./index.js";
const app = express();
const PORT = 4000;

app.use(cors()); // Allow frontend to call this API
app.use(json()); // Enable JSON body parsing

app.get("/", async (req, res) => {
  try {
    res.json({ success: true }); // Send response
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get("/api/Gmaps", async (req, res) => {
  try {
    const { business, place } = req.query;
    console.log(business, place);

    const data = await scraper(business, place); // Call your scraper function

    res.json({ success: true, data }); // Send response
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ success: false, error: "Failed to get data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
