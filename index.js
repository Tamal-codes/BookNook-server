import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import "dotenv/config";

const PORT = 8000;
const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db("booknookDB");
const booksCollection = db.collection("books");

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

connectToMongoDB();

app.get("/", (req, res) => {
    res.send("hello world");
});

app.get("/books", async (req, res) => {
    const books = await booksCollection.find().toArray();
    res.send(books);
});


app.post("/books", async (req, res) => {
  const book = req.body;
  book.createdAt = new Date();
  const result = await booksCollection.insertOne(book);
  res.send(result);
});

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});