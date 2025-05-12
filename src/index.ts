// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// import express, { Request, Response } from 'express';

// const app = express();
// const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT :  3000;

// app.use(cors({
//   origin: 'http://localhost:3000',
//   credentials: true
// }));
// app.use(cookieParser());
// app.use(express.json());

// //Save response cookie
// let cookie = "";

// // Authentication middleware
// function authenticateUser (req: any, res: any, next: Function)  {

//   console.log({cookie})
  
//   if (!cookie || cookie !== 'mock-jwt-token') {
//     return res.status(401).json({ message: 'unauthorised', code: '---' });
//   }
  
//   next();
// };

// // Authorised birth months
// const authorisedBirthMonths = [
//   { birthMonth: 'January', code: '001' },
//   { birthMonth: 'March', code: '003' },
//   { birthMonth: 'May', code: '005' },
//   { birthMonth: 'July', code: '007' },
//   { birthMonth: 'September', code: '009' },
//   { birthMonth: 'November', code: '011' }
// ];


// // Mock user database
// const users = [
//   { username: 'admin', password: 'password' }
// ];

// app.post('/login', (req, res) => {

//   const { username, password } = req.body;
//   const user = users.find(u => u.username === username && u.password === password);

//   console.log("Requesting to login...", {username, password});
  
//   if (user) {
//     // Set HTTP-only cookie with JWT (mock)
//     res.cookie('jwt', 'mock-jwt-token', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 24 * 60 * 60 * 1000 // 1 day
//     })



//     console.log("req.cookies.jwt: ", req.cookies.jwt)

//     res.status(200);

//     //save cookie in a variable
//     cookie = req.cookies.jwt
    
//     res.json({ message: 'Login successful' })

//   } else {
//     res.status(401).json({ message: 'Invalid credentials' });
//   }
// });

// // Home route
// app.get('/', (_req: Request, res: Response) => {
//   res.json({ message: 'Success' });
// });

// // GET route
// app.get('/verify-month/:birth_month', authenticateUser, (req: any, res: any) => {

//   const { birth_month } = req.params;

//   console.log("Got a Birth Month Verification request...birth month provided is: ", birth_month )

//   if (typeof birth_month !== 'string') {
//     return res.status(400).json({ message: 'error', code: '000' });
//   }

//   const match = authorisedBirthMonths.find(
//     (entry) => entry.birthMonth.toLowerCase() === birth_month.toLowerCase()
//   );

//   if (match) {
//     console.log(match);
//     return res.json({ message: 'Success', code: match.code });
//   } else {
//     return res.json({ message: 'error', code: '000' });
//   }
// });

// //log out user
// app.get('/logout', (_req, res) => {
//   res.clearCookie('jwt');
//   cookie = ""
//   res.status(200).json({ message: 'Logout successful' });
// });


// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });



//////////////////////////////////////////////////////////

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
    // Simulated login to external API
    const loginResponse = await axios.post("https://nbsapi-dev.azurewebsites.net/Auth/login", agentLoginRequestBody);

    const token = loginResponse.data;

    console.log("Token returned from external API: ", token)

    agentTokens.set(agent_id, token);

    // Verify user with GET request
    // const authResponse = await axios.get("https://external-api.com/authenticate", {
    //   headers: { Authorization: `Bearer ${token}` },
    //   params: { employeeSsn: ssn, dateOfBirth: dob, zipCode: zipcode }
    // });

    // console.log("Incoming caller information: ", authResponse.data.dob, authResponse.data.zip);

    // const isValid = authResponse.data.dob === dob && authResponse.data.zip === zipcode;

    // if (!isValid) {
    //   return res.status(401).json({ message: "Caller authentication failed." });
    // }

    // return res.status(200).json({ message: "success" });


    // simulate external API returning Zip code and DOB of caller from databse matching on ssn
    if (ssn === "000111111" && dob === "1970-01-01" && zipcode === "84111"){
      return res.status(200).json({ message: "success" });
    }else{
      throw new Error("caller unathorize");
    }


  } catch (error: any) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: error.message });
  }
});


// Endpoint to handle data requests
app.get("/info-request", async (req: any, res: any) => {
  const { agentId, employeeSsn } = req.body;

  if (!agentId) {
    return res.status(400).json({ message: "agent id error" });
  }

  const token = agentTokens.get(agentId);

  if (!token) {
    return res.status(403).json({ message: "Agent not authenticated." });
  }

  try {
    const response = await axios.get(`https://nbsapi-dev.azurewebsites.net/Cobra/GetCoverageBillingPeriodInformation?employeeSsn=${employeeSsn}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return res.status(200).json({ data: response.data });
  } catch (error: any) {
    console.error("Request error:", error.message);
    return res.status(500).json({ message: `Failed to fetch data from external API. ${error.message}`});
  }
});



app.listen(PORT, () => {
  console.log(`Middleware server running on http://localhost:${PORT}`);
});
