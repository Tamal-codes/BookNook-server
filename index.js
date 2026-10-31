import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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

app.get("/books/:id", async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid book id" });
    }

    const book = await booksCollection.findOne({ _id: new ObjectId(id) });

    if (!book) {
        return res.status(404).send({ message: "Book not found" });
    }

    res.send(book);
});

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});

