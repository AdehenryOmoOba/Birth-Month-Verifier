const cors = require('cors');
const cookieParser = require('cookie-parser');
import express from 'express';
const axios = require("axios");
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

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



app.listen(PORT, () => {
  console.log(`Middleware server running on http://localhost:${PORT}`);
});
