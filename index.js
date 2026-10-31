import express, { json } from "express";
import cors from "cors"
import { MongoClient } from 'mongodb';
import 'dotenv/config'



const PORT = 8000;
const app = express();


app.use(express.json());


const client = new MongoClient(process.env.MONGO_URI);
export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

connectToMongoDB()

app.get("/", (req, res) => {
    res.send("hello world")
})






app.listen(PORT, () => {
    console.log(`server is running on port${PORT}`)
});