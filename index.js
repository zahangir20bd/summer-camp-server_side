const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;

// Middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8grpiox.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classesCollection = client.db("focusAcademyDB").collection("classes");
    const reviewsCollection = client.db("focusAcademyDB").collection("reviews");
    const usersCollection = client.db("focusAcademyDB").collection("users");
    const selectClassesCollection = client
      .db("focusAcademyDB")
      .collection("selectClasses");

    // load all class data
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // Post operation for add a new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log("User", user);
      const query = { user_email: user.user_email };
      const existingUser = await usersCollection.findOne(query);
      console.log("Existing User", existingUser);
      if (existingUser) {
        return res.send({ message: "User already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Load All Users
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // load all instructor
    app.get("/instructors", async (req, res) => {
      const query = { user_role: "instructor" };
      const instructors = await usersCollection.find(query).toArray();
      res.send(instructors);
    });

    // Load all students
    app.get("/students", async (req, res) => {
      const query = { user_role: "student" };
      const students = await usersCollection.find(query).toArray();
      res.send(students);
    });

    // load all admin
    app.get("/admins", async (req, res) => {
      const query = { user_role: "admin" };
      const admins = await usersCollection.find(query).toArray();
      res.send(admins);
    });

    // Load All Reviews
    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollection.find().toArray();
      res.send(reviews);
    });

    // add a select class  to the database
    app.post("/selectclasses", async (req, res) => {
      const item = req.body;
      const selectClasses = await selectClassesCollection.insertOne(item);
      res.send(selectClasses);
    });

    // Get select classes by using query or without query
    app.get("/selectclasses", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        const result = await selectClassesCollection.find().toArray();
        res.send(result);
      } else {
        const query = { user_email: email };
        const result = await selectClassesCollection.find(query).toArray();
        res.send(result);
      }
    });

    // Delete Selected Class from Database
    app.delete("/selectclasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectClassesCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Focus Academy Server is now Running");
});

app.listen(port, () => {
  console.log(`Focus Academy Server Running on Port: ${port}`);
});
