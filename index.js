const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();
console.log(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://phunt-9a498.web.app",
      "https://phunt-9a498.firebaseapp.com",
    ],
    credentials: true,
  })
);

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
    //await client.connect();
    const productCollection = client.db("Phunt").collection("allProducts");
    const userCollection = client.db("Phunt").collection("users");
    const reviewCollection = client.db("Phunt").collection("review");
    const couponCollection = client.db("Phunt").collection("coupon");
    //-------------middlewares.................
    const verifyToken = (req, res, next) => {
      console.log(req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbiddeen accesss" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    //jwt api.................
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    /////////////////search////////////////
    app.get('/search', async (req, res) => {
      try {
        const tagName = req.query.tag;
        const query = { tags: tagName };
        const searchResults = await productCollection.find(query).toArray();
        res.json(searchResults);
      } catch (error) {
        console.error('Error searching products by tag:', error);
        res.status(500).json({ error: 'Error searching products by tag' });
      }
    });

 
 
    ////////////PRODUCT ROUTE//////////////////

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const objectId = new ObjectId(id);
      const result = await productCollection.findOne({ _id: objectId });
      res.send(result);
    });
    app.patch("/product/:id", async (req, res) => {
      const id = req.params.id;
      const { productName, productImage, porductDescription, link, tags } =
        req.body;
      const filter = { _id: new ObjectId(id) };
      const updateData = {
        $set: {
          productName: productName,
          productImage: productImage,
          porductDescription: porductDescription,
          link: link,
          tags: tags,
        },
      };
      const result = await productCollection.updateOne(filter, updateData);
      res.send(result);
    });
    app.get("/users", verifyToken, async (req, res) => {
      const user = await userCollection
        .find()
        .sort({ timestamp: -1 })
        .toArray();
      res.send(user);
    });
    app.get("/products", async (req, res) => {
      const result = await productCollection
        .find()
        .sort({ upvoteCount: -1 })
        .toArray();
      res.send(result);
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
    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
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

    app.get("/page-products", async (req, res) => {
      try {
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);
        const skip = page * size;
        const result = await productCollection
          .find()
          .skip(skip)
          .limit(size)
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
      }
    });
    app.get("/accepted-products", async (req, res) => {
      try {
        const total = await productCollection.countDocuments({
          status: "accepted",
        });
        const products = await productCollection
          .find({ status: "accepted" })
          .toArray();
        res.send({ total, products });
      } catch (error) {
        console.error("Error fetching accepted products:", error);
        res.status(500).send("Error fetching accepted products");
      }
    });

    app.patch("/product/:id", async (req, res) => {
      const id = req.params.id;
      const { status, featured } = req.body;
      const updateFields = {};
      if (status) updateFields.status = status;
      if (featured) updateFields.featured = featured;
      const result = await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
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
    app.get("/coupon/:id", async (req, res) => {
      const id = req.params.id;
      const objectId = new ObjectId(id);
      const result = await couponCollection.findOne({ _id: objectId });
      res.send(result);
    });
    app.post("/review", async (req, res) => {
      const rev = req.body;
      const result = await reviewCollection.insertOne(rev);
      res.send(result);
    });
    //vote count----------------
    app.patch("/product/:id/vote", async (req, res) => {
      const productId = req.params.id;
      const userEmail = req.body.userEmail;

      try {
        const product = await productCollection.findOne({
          _id: new ObjectId(productId),
        });

        if (!product.voters) {
          product.voters = [];
        }

        if (product.voters.includes(userEmail)) {
          return res.status(400).send("User has already voted");
        }

        const result = await productCollection.updateOne(
          { _id: new ObjectId(productId) },
          {
            $inc: { upvoteCount: 1 },
            $push: { voters: userEmail },
          }
        );
      } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      }
    });
    //coupon.............
    app.get("/coupon", async (req, res) => {
      const cpn = await couponCollection
        .find()
        .sort({ timestamp: -1 })
        .toArray();
      res.send(cpn);
    });
    app.post("/coupon", async (req, res) => {
      const cpn = req.body;
      const result = await couponCollection.insertOne(cpn);
      res.send(result);
    });

    app.patch("/coupon/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const { code, date, des, amount } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateData = {
        $set: {
          code: code,
          date: date,
          des: des,
          amount: amount,
        },
      };

      console.log(`Updating coupon with ID: ${id}`); // Log the ID
      console.log(`Update data: `, updateData); // Log the update data
      const result = await couponCollection.updateOne(filter, updateData);
      res.send(result);
    });

    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      console.log("deleted id is:", id);
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/coupon/:id", async (req, res) => {
      const id = req.params.id;
      console.log("deleted id is:", id);
      const query = { _id: new ObjectId(id) };
      const result = await couponCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/productTot", async (req, res) => {
      const total = await productCollection.estimatedDocumentCount();
      res.send(total);
    });
    app.get("/admin-stat", async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const reviews = await reviewCollection.estimatedDocumentCount();
      const products = await productCollection.estimatedDocumentCount();

      res.send({
        users,
        reviews,
        products,
      });
    });
    // payment ===========--------------------
    //-----------------------------------------
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/", (req, res) => {
      res.send("server is running !");
    });

    app.listen(port, () => {
      console.log(`app running on port ${port}`);
    });

    /////////////////////////
    // app.get("/products", async (req, res) => {
    //   try {
    //     const tags = req.query.tags ? req.query.tags.split(",") : [];

    //     // Create a search filter if tags are provided
    //     const searchFilter = tags.length > 0 ? { tags: { $in: tags } } : {};

    //     // Retrieve all products matching the search filter
    //     const products = await productCollection.find(searchFilter).toArray();

    //     // Send response with products
    //     res.send({ products });
    //   } catch (error) {
    //     console.error("Error fetching products:", error);
    //     res.status(500).send("Error fetching products");
    //   }
    // });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);
