import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { verifyToken } from "./verifyToken.js";

const PORT = process.env.PORT || 8000;
const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db("booknookDB");
const booksCollection = db.collection("books");
const borrowsCollection = db.collection("borrows");

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
    try {
        const limit = Number(req.query.limit) || 0;
        const filter = req.query.email ? { userEmail: req.query.email } : {};
        const books = await booksCollection
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
        res.send(books);
    } catch (err) {
        res.status(500).send({ message: "Failed to load books" });
    }
});


app.get("/books/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid book id" });
        }

        const book = await booksCollection.findOne({ _id: new ObjectId(id) });

        if (!book) {
            return res.status(404).send({ message: "Book not found" });
        }

        res.send(book);
    } catch (err) {
        res.status(500).send({ message: "Failed to load book" });
    }
});


app.post("/books", verifyToken, async (req, res) => {
    try {
        const book = req.body;
        book.totalCopies = Number(book.totalCopies) || 1;
        book.createdAt = new Date();
        const result = await booksCollection.insertOne(book);
        res.send(result);
    } catch (err) {
        res.status(500).send({ message: "Failed to add book" });
    }
});

app.delete("/books/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid book id" });
        }

        const book = await booksCollection.findOne({ _id: new ObjectId(id) });
        if (!book) {
            return res.status(404).send({ message: "Book not found" });
        }

        if (book.userEmail !== req.user.email) {
            return res.status(403).send({ message: "You can only delete your own books" });
        }

        const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
    } catch (err) {
        res.status(500).send({ message: "Failed to delete book" });
    }
});

app.patch("/books/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid book id" });
        }

        const book = await booksCollection.findOne({ _id: new ObjectId(id) });
        if (!book) {
            return res.status(404).send({ message: "Book not found" });
        }

        if (book.userEmail !== req.user.email) {
            return res.status(403).send({ message: "You can only edit your own books" });
        }

        const { title, author, category, image, description, totalCopies } = req.body;

        const updates = { title, author, category, image, description };
        if (totalCopies !== undefined) {
            updates.totalCopies = Number(totalCopies);
        }

        Object.keys(updates).forEach((key) => {
            if (updates[key] === undefined) delete updates[key];
        });

        const result = await booksCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        res.send(result);
    } catch (err) {
        res.status(500).send({ message: "Failed to update book" });
    }
});


app.post("/borrows", verifyToken, async (req, res) => {
    try {
        const { bookId, userName, returnDate } = req.body;
        const userEmail = req.user.email;

        if (!bookId || !ObjectId.isValid(bookId)) {
            return res.status(400).send({ message: "Invalid book id" });
        }

        const parsedReturnDate = new Date(returnDate);
        if (!returnDate || isNaN(parsedReturnDate.getTime())) {
            return res.status(400).send({ message: "A valid return date is required" });
        }

        if (parsedReturnDate <= new Date()) {
            return res.status(400).send({ message: "Return date must be in the future" });
        }

        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
        if (!book) {
            return res.status(404).send({ message: "Book not found" });
        }

        const alreadyBorrowed = await borrowsCollection.findOne({ bookId, userEmail });
        if (alreadyBorrowed) {
            return res.status(409).send({ message: "You already borrowed this book" });
        }


        const decrement = await booksCollection.updateOne(
            { _id: new ObjectId(bookId), totalCopies: { $gt: 0 } },
            { $inc: { totalCopies: -1 } }
        );

        if (decrement.modifiedCount === 0) {
            return res.status(400).send({ message: "This book is not available" });
        }

        try {
            const result = await borrowsCollection.insertOne({
                bookId,
                bookTitle: book.title,
                bookImage: book.image,
                userName,
                userEmail,
                borrowDate: new Date(),
                returnDate: parsedReturnDate,
            });
            res.send(result);
        } catch (insertErr) {
    
            await booksCollection.updateOne(
                { _id: new ObjectId(bookId) },
                { $inc: { totalCopies: 1 } }
            );
            res.status(500).send({ message: "Failed to borrow the book" });
        }
    } catch (err) {
        res.status(500).send({ message: "Failed to borrow the book" });
    }
});

app.get("/borrows", verifyToken, async (req, res) => {
    try {
    
        const borrows = await borrowsCollection
            .find({ userEmail: req.user.email })
            .sort({ borrowDate: -1 })
            .toArray();

        res.send(borrows);
    } catch (err) {
        res.status(500).send({ message: "Failed to load borrows" });
    }
});

app.delete("/borrows/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid borrow id" });
        }

        const borrow = await borrowsCollection.findOne({ _id: new ObjectId(id) });
        if (!borrow) {
            return res.status(404).send({ message: "Borrow record not found" });
        }

        if (borrow.userEmail !== req.user.email) {
            return res.status(403).send({ message: "You can only return your own borrows" });
        }

        await borrowsCollection.deleteOne({ _id: new ObjectId(id) });

        if (ObjectId.isValid(borrow.bookId)) {
            await booksCollection.updateOne(
                { _id: new ObjectId(borrow.bookId) },
                { $inc: { totalCopies: 1 } }
            );
        }

        res.send({ deletedCount: 1 });
    } catch (err) {
        res.status(500).send({ message: "Failed to return the book" });
    }
});

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
export default app;