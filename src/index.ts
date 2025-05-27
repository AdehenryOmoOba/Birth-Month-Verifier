const cors = require('cors');
const cookieParser = require('cookie-parser');
import express from 'express';
const app = express();
const axios = require("axios");
const crypto = require('crypto');
const bodyParser = require('body-parser');


 
// Ensure express is parsing the raw body instead of applying its own encoding
app.use(bodyParser.raw({ type: '*/*' }));
// Use raw body parsing for webhook signature verification
app.use(express.raw({ type: '*/*' }));
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));


const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT :  3000;

// Simulated storage for tokens and valid agent IDs
const VALID_AGENT_IDS = ["PwVYmvuTohufuhTH8y6l"];
const agentTokens = new Map();

// Home route
app.get('/', (_req: any, res: any) => {
  res.json({ message: 'Success' });
});

// Endpoint to handle login
app.post("/login", async (req: any, res: any) => {

  const { dob, ssn, zipcode, agent_id } = req.body;

  console.log("Incoming log in request...", {ssn, dob, zipcode, agent_id})

  if (!ssn || !dob || !zipcode || !agent_id) {
  
    return res.status(400).json({ message: "Missing required fields." });
  }

  if (!VALID_AGENT_IDS.includes(agent_id)) {
    return res.status(403).json({ message: "Unauthorized agent." });
  }

  const agentLoginRequestBody = {
    "password": "72CA76E9-707F-4F2D-8000-1360A7595879",
    "internalUser": true,
    "aadUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "userFirstName": "string",
    "userLastName": "string",
    "userEmail": "string"
  }

  try {
    // Simulated login to external API to obtain bearer token
    const loginResponse = await axios.post("https://nbsapi-dev.azurewebsites.net/Auth/login", agentLoginRequestBody);

    const token = loginResponse.data;

    console.log("Token returned from external API: ", token)

    agentTokens.set(agent_id, token);
    
    // Authenticate caller
    const response = await axios.get(`https://nbsapi-dev.azurewebsites.net/Cobra/AuthenticateUser?employeeSsn=${ssn}&dateOfBirth=${dob}&zipCode=${zipcode}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if(response.data.success !== true) throw new Error(response.data.message);

    return res.status(200).json({ message: "success" });

  } catch (error: any) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: error.message });
  }
});


// Endpoint to handle data requests
app.get("/info-request", async (req: any, res: any) => {
  const { employeeSsn, requestType } = req.query;

  const token = [...agentTokens.values()][0];

  if (!token) {
    return res.status(403).json({ message: "Agent not authenticated." });
  }

  try {

    let response = null;

    if(requestType === "billingInfo") {
      response = await axios.get(`https://nbsapi-dev.azurewebsites.net/Cobra/GetCoverageBillingPeriodInformation?employeeSsn=${employeeSsn}`, {
      headers: { Authorization: `Bearer ${token}` }
      });
    }

    if(requestType === "testInfo") {
      response = await axios.get(`https://nbsapi-dev.azurewebsites.net/Cobra/AnotherEndpointForTesting?inputParameter=Hello NBS Test API Endpoint`, {
      headers: { Authorization: `Bearer ${token}` }
      });
    }


    return res.status(200).json({ data: response.data });

  } catch (error: any) {
    console.error("Request error:", error.message);
    return res.status(500).json({ message: `Failed to fetch data from external API. ${error.message}`});
  }
});


app.post('/webhook/elevenlabs',  (req, res) => {
  // // Get the webhook signature header
  // const reqHeader = req.headers['elevenlabs-signature'] as string
  // const headers =  reqHeader ? reqHeader.split(',') : [];
  // const tHeader = headers.find(e => e.startsWith('t='));
  // if (!tHeader) {
  //   res.status(400).send('Missing timestamp');
  //   return;
  // }

  // const timestamp = tHeader.substring(2);
  // const signature = headers.find(e => e.startsWith('v0='));
 
  // // Verify timestamp (within 30 minutes)
  // const reqTimestamp = parseInt(timestamp) * 1000;
  // const tolerance = Date.now() - 30 * 60 * 1000;
  // if (reqTimestamp < tolerance) {
  //   res.status(403).send('Request expired');
  //   return;
  // }
 
  // // Verify signature
  // const secret = process.env.WEBHOOK_SECRET; // Store this securely
  // const message = `${timestamp}.${req.body}`;
  // const digest = 'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');
  // if (signature !== digest) {
  //   res.status(401).send('Invalid signature');
  //   return;
  // }
 
  // Process the webhook data
  const data = JSON.parse(req.body);
  console.log("Received webhook data: ", data)
  // The webhook payload includes conversation data
  const conversationId = data.data?.conversation_id;
  const transcript = data.data?.transcript;
  const analysis = data.data?.analysis;
 
  // Do something with the data
  console.log(`Received conversation ${conversationId}`, {transcript, analysis});
  // Must return 200 for successful webhook receipt
  res.status(200).json({message: 'Success'});
});

//Create a post enddpoint "cobra-ai-agent-transcript"
app.post("/cobra-ai-agent-transcript", async (req: any, res: any) => {

  const {event_timestamp, data } = JSON.parse(req.body);

  console.log("Call Info: ", { 
    callTimestamp: event_timestamp, 
    conversationId: data.conversation_id, 
    transcript: data.transcript, 
    callDuration: data.metadata.call_duration, 
    summary: data.analysis.transcript_summary });

  return res.status(200).json({ message: "success" });
});


app.listen(PORT, () => {
  console.log(`Middleware server running on http://localhost:${PORT}`);
});
