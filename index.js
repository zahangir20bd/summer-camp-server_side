const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;

// Middleware

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Middleware for Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { user_email: email };
      const user = await usersCollection.findOne(query);
      if (user.user_role !== "Admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // Middleware for Verify Admin
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { user_email: email };
      const user = await usersCollection.findOne(query);
      if (user.user_role !== "Instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // load all class data
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // Post Method for add class on Database
    app.post("/classes", verifyJWT, async (req, res) => {
      const item = req.body;
      const result = await classesCollection.insertOne(item);
      res.send(result);
    });

    // Update a class Status Approved
    app.patch("/classes/approved/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Approved",
        },
      };
      const result = await classesCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Update a class Status Deny
    app.patch("/classes/deny/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Deny",
        },
      };
      const result = await classesCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Post operation for add a new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { user_email: user.user_email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exist" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Load All Users
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // Check isAdmin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { user_email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.user_role === "Admin" };
      res.send(result);
    });

    // Check isInstructor
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { user_email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.user_role === "Instructor" };
      res.send(result);
    });

    // Load All Users
    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Update an User as Admin
    app.patch("/users/admin/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          user_role: "Admin",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Update an User Instructor
    app.patch("/users/instructor/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          user_role: "Instructor",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Update an User Student
    app.patch("/users/student/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          user_role: "Student",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // load all instructor
    app.get("/instructors", async (req, res) => {
      const query = { user_role: "Instructor" };
      const instructors = await usersCollection.find(query).toArray();
      res.send(instructors);
    });

    // Load all students
    app.get("/students", async (req, res) => {
      const query = { user_role: "Student" };
      const students = await usersCollection.find(query).toArray();
      res.send(students);
    });

    // load all admin
    app.get("/admins", verifyJWT, async (req, res) => {
      const query = { user_role: "Admin" };
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
    app.get("/selectclasses", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { user_email: email };
      const result = await selectClassesCollection.find(query).toArray();
      res.send(result);
    });

    // Delete Selected Class from Database
    app.delete("/selectclasses/:id", verifyJWT, async (req, res) => {
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
