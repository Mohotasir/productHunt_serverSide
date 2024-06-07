const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ey9o5hx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const productCollection = client.db("Phunt").collection("allProducts");
    const userCollection = client.db("Phunt").collection("users");
    const reviewCollection = client.db("Phunt").collection("review");
    //jwt api.................
    app.post('/jwt',async(req,res)=>{
       const user =  req.body;
       const token = jwt.sign(user , process.env.ACCESS_TOKEN_SECRET ,{ expiresIn : '1hr'})
       res.send({token})
    })
    app.get("/products", async (req, res) => {
      const products = await productCollection
        .find()
        .sort({ timestamp: -1 })
        .toArray();
      res.send(products);
    });
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const objectId = new ObjectId(id);
      const result = await productCollection.findOne({ _id: objectId });
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const user = await userCollection
        .find()
        .sort({ timestamp: -1 })
        .toArray();
      res.send(user);
    });

    app.get("/products/:email", async (req, res) => {
      const Uemail = req.params.email;
      const query = { useremail: Uemail };
      const result = await productCollection
        .find(query)
        .sort({ timestamp: -1 })
        .toArray();
      res.send(result);
    });
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const user = await userCollection.findOne({ email: email });
        if (user) {
          res.send(user);
        } else {
          res.status(404).send("User not found");
        }
      } catch (error) {
        res.status(500).send(error.message);
      }
    });
    //update post status
    // app.patch("/product/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const { status } = req.body;
    //   const result = await productCollection.updateOne(
    //     { _id: new ObjectId(id) },
    //     { $set: { status: status } }
    //   );
    //   res.send(result);
    // });
    app.patch("/product/:id", async (req, res) => {
      const id = req.params.id;
      const { status ,featured } = req.body;
      const updateFields = {};
      if (status) updateFields.status = status;
      if (featured) updateFields.featured = featured;
      const result = await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set:updateFields}
      );
      res.send(result);
    });
    //update user role
    app.patch("/user/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: role } }
      );
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existUser = await userCollection.findOne(query);
      if (existUser) {
        return res.send({ message: "user already  exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.post("/products", async (req, res) => {
      const products = req.body;
      products.timestamp = new Date().toLocaleString();
      const result = await productCollection.insertOne(products);
      res.send(result);
    });
    //review data
    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/review", async (req, res) => {
      const rev = req.body;
      const result = await reviewCollection.insertOne(rev);
      res.send(result);
    });
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      console.log("deleted id is:", id);
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running !");
});

app.listen(port, () => {
  console.log(`app running on port ${port}`);
});
