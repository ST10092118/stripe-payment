const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_test_51QFjxRC6nbcTFcrEdQ0RU7FusJmk1XM3lw8UajhIV2sOympTxbkWl0TZ2FtP7NoE2eQRbo7fXpVXs0G1yrDfxPTn00DYKN0dZB");

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = require("./keys/opscpart2-cashsend-cf687-firebase-adminsdk-mo7h1-942384210e.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://opscpart2-cashsend-cf687-default-rtdb.firebaseio.com/" 
});

// Function to get user device token from Firebase Realtime Database
async function getUserDeviceToken(userId) {
    try {
        const tokenSnapshot = await admin.database().ref(`users/${userId}/device_token`).once('value');
        const token = tokenSnapshot.val();
        return token ? token : null; // Return the token or null if not found
    } catch (error) {
        console.error("Error retrieving device token:", error);
        return null; // Return null in case of error
    }
}
//comment
// Function to send push notifications
const sendPushNotification = async (userId, title, message) => {
    const token = await getUserDeviceToken(userId); // Fetch the user's FCM token

    if (token) {
        const notification = {
            notification: {
                title: title,
                body: message,
                priority: "high",
            },
            token: token,
        };

        admin.messaging().send(notification)
            .then(response => {
                console.log("Successfully sent message:", response);
            })
            .catch(error => {
                console.error("Error sending message:", error);
            });
    } else {
        console.log("No device token found for user:", userId);
    }
};

// Create a Customer and Setup Intent
app.post('/create-customer-and-setup-intent', async (req, res) => {
    try {
        const { email } = req.body; // Expect userId in the request body

        if (!email) {
            return res.status(400).json({ error: { message: "Email is required." } });
        }

        // Create a new customer in Stripe with the provided email
        const customer = await stripe.customers.create({ email });

        const setupIntent = await stripe.setupIntents.create({
            customer: customer.id,
            payment_method_types: ['card'],
        });

        // Send a success notification
        await sendPushNotification(userId, "Payment Setup Successful", "Your payment method setup was successful.");

        res.json({
            client_secret: setupIntent.client_secret,
            customer_id: customer.id,
        });
    } catch (error) {
        console.error("Error creating customer and setup intent:", error);
        // Send a failure notification
        await sendPushNotification(req.body.userId, "Payment Setup Failed", `Setup failed: ${error.message}`);
        res.status(400).json({ error: { message: error.message } });
    }
});

// Process Payment Endpoint
app.post('/process-payment', async (req, res) => {
    const { userId, paymentInfo } = req.body;
    
    // Call your payment processing logic here and get result
    const result = await payment_service.process(paymentInfo);
    
    if (result.success) {
        await sendPushNotification(userId, "Payment Successful", "Your payment has been processed successfully.");
        res.json({ message: "Payment processed successfully!" });
    } else {
        await sendPushNotification(userId, "Payment Failed", `Payment failed: ${result.error_message}`);
        res.status(400).json({ error: { message: result.error_message } });
    }
});

app.post('/send-notification', (req, res) => {
    const { userId, title, message } = req.body;

    getUserDeviceToken(userId).then(token => {
        if (token) {
            sendPushNotification(token, title, message);
            res.status(200).send("Notification sent!");
        } else {
            res.status(404).send("No device token found.");
        }
    });
});

// Start the server
app.listen(4242, () => console.log("Node server listening on port 4242!"));
