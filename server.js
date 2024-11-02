const express = require("express");
const cors = require("cors");
const app = express();
const stripe = require("stripe")("sk_test_51QFjxRC6nbcTFcrEdQ0RU7FusJmk1XM3lw8UajhIV2sOympTxbkWl0TZ2FtP7NoE2eQRbo7fXpVXs0G1yrDfxPTn00DYKN0dZB");

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

const userDatabase = {};

// Create a Customer and Setup Intent
app.post('/create-customer-and-setup-intent', async (req, res) => {
    try {
        const { email, uid } = req.body;

        if (!email || !uid) {
            return res.status(400).json({ error: { message: "Email and UID are required." } });
        }

        let customer = userDatabase[uid];
        if (!customer) {
            customer = await stripe.customers.create({ email });
            userDatabase[uid] = customer.id;
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: customer,
            payment_method_types: ['card'],
        });

        res.json({
            client_secret: setupIntent.client_secret,
            customer_id: customer,
        });
    } catch (error) {
        console.error("Error creating customer and setup intent:", error);
        res.status(400).json({ error: { message: error.message } });
    }
});

// Other endpoints...

app.listen(4242, () => console.log("Node server listening on port 4242!"));
