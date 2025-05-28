require('dotenv').config();
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

function constructEmailBody(conversationId: string, combinedQuestions: string, transcriptUrl: string) {
  
  const emailBody = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COBRA AI - Unanswered Questions</title>
    <style>
        /* Reset styles for email clients */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background:rgb(248, 248, 248);
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            padding: 32px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
        }
        
        .logo {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
        }
        
        .subtitle {
            color: #a0aec0;
            font-size: 16px;
            margin: 8px 0 0 0;
            font-weight: 400;
        }
        
        .content {
            padding: 40px 32px;
        }
        
        .greeting {
            color: #2d3748;
            font-size: 18px;
            margin: 0 0 24px 0;
            font-weight: 500;
        }
        
        .intro-text {
            color: #4a5568;
            font-size: 16px;
            margin: 0 0 32px 0;
            line-height: 1.6;
        }
        
        .call-id {
            display: inline-block;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.5px;
        }
        
        .questions-section {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
        }
        
        .questions-title {
            color: #2d3748;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 16px 0;
            display: flex;
            align-items: center;
        }
        
        .questions-title::before {
            content: '❓';
            margin-right: 8px;
            font-size: 18px;
        }
        
        .questions-content {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            line-height: 1.5;
            color: #2d3748;
            white-space: pre-wrap;
            margin: 0;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .cta-section {
            text-align: center;
            margin: 40px 0 0 0;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .cta-button::before {
            content: '📄';
            margin-right: 8px;
            font-size: 16px;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
        }
        
        .footer {
            background: #f7fafc;
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-text {
            color: #718096;
            font-size: 14px;
            margin: 0;
            line-height: 1.5;
        }
        
        /* Mobile responsiveness */
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 20px;
                border-radius: 12px;
            }
            
            .header, .content, .footer {
                padding: 24px 20px;
            }
            
            .logo {
                font-size: 24px;
            }
            
            .greeting {
                font-size: 16px;
            }
            
            .intro-text {
                font-size: 15px;
            }
            
            .cta-button {
                padding: 14px 28px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 class="logo">COBRA AI Agent</h1>
        </div>
        
        <div class="content">
            <h2 class="greeting">Hello there,</h2>
            
            <p class="intro-text">
                We've identified some questions that COBRA AI agent couldn't fully address during this call: 
                <span class="call-id">${conversationId}</span>
            </p>
            
            <div class="questions-section">
                <h3 class="questions-title">Unanswered Questions</h3>
                <pre class="questions-content">${combinedQuestions}</pre>
            </div>
            
            <div class="cta-section">
                <a href="${transcriptUrl}" class="cta-button" target="_blank">
                    View Full Call Transcript
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This email was generated automatically by COBRA AI.<br>
                Thank you for helping us improve our service.
            </p>
        </div>
    </div>
</body>
                      </html>`;
  return emailBody;
}

//Create a post enddpoint "cobra-ai-agent-transcript"
// app.post("/cobra-ai-agent-transcript", async (req: any, res: any) => {

//   // Authorisation headers verification for security.
//   const secret = process.env.WEBHOOK_SECRET;
//   const headers = req.headers['ElevenLabs-Signature'].split(',');
//   const timestamp = headers.find((e: string) => e.startsWith('t=')).substring(2);
//   const signature = headers.find((e: string) => e.startsWith('v0='));
 
//   // Validate timestamp
//   const reqTimestamp = timestamp * 1000;
//   const tolerance = Date.now() - 30 * 60 * 1000;
//   if (reqTimestamp < tolerance) {
//     res.status(403).send('Request expired');
//     return;
//   } else {
//     // Validate hash
//     const message = `${timestamp}.${req.body}`;
//     const digest = 'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');
//     if (signature !== digest) {
//       res.status(401).send('Request unauthorized');
//       return;
//     }
//   }
 


//   const userQuestions: string[] = [];

//   const {event_timestamp, data } = JSON.parse(req.body);

//   let messageNumber = 0;

//   for (let i = 1; i < data.transcript.length; i++) {
//     const current = data.transcript[i];
//     if (
//       current.role === "agent" &&
//       typeof current.message === "string" &&
//       current.message.startsWith("I'm sorry")
//     ) {
//       const previous = data.transcript[i - 1];
//       if (previous && previous.role === "user") {
//         messageNumber++
//         userQuestions.push(`${messageNumber}) ${previous.message} <br>`);
//       }
//     }
//   }

//   console.log("Call Info: ", { 
//     callTimestamp: event_timestamp, 
//     conversationId: data.conversation_id, 
//     callDurationInSeconds: data.metadata.call_duration_secs, 
//     summary: data.analysis.transcript_summary,
//     unresolvedQueries: userQuestions
//   });

//   const combinedQuestions = userQuestions.join('\n');
//   const transcriptUrl = `https://elevenlabs.io/app/conversational-ai/history/${data.conversation_id}`
   
//   const emailBody = constructEmailBody(data.conversation_id, combinedQuestions, transcriptUrl);

//    if (userQuestions.length > 0) {
//     try {
//       const to = "Henry"; 
//       const emailSubject = "COBRA AI Agent - Unresolved Queries"
//       const emailResponse = await axios.post("https://adehenry1679.app.n8n.cloud/webhook-test/n8n-voice", {to, emailSubject, emailBody });
//       console.log("Email webhook response:", emailResponse.data);
//     } catch (error: any) {
//       console.error("Error sending email webhook:", error.message);
//     }
//    }else {
//     console.log("No unresolved queries found, skipping email notification.");            
//    }

//   return res.status(200).json({ message: "success" });
// });

app.post("/cobra-ai-agent-transcript", express.raw({type: 'application/json'}), async (req: any, res: any) => {
  try {
    // Authorization headers verification for security
    const secret = process.env.WEBHOOK_SECRET;
    
    // Check if signature header exists (case-insensitive)
    const signatureHeader = req.headers['elevenlabs-signature'] || req.headers['ElevenLabs-Signature'];
    
    if (!signatureHeader) {
      return res.status(401).send('Missing signature header');
    }

    const headers = signatureHeader.split(',');
    const timestampHeader = headers.find((e: string) => e.startsWith('t='));
    const signatureHashHeader = headers.find((e: string) => e.startsWith('v0='));
    
    if (!timestampHeader || !signatureHashHeader) {
      return res.status(401).send('Invalid signature format');
    }

    const timestamp = timestampHeader.substring(2);
    const signature = signatureHashHeader; // Keep the full "v0=..." format
   
    // Validate timestamp
    const reqTimestamp = parseInt(timestamp) * 1000;
    const tolerance = Date.now() - 30 * 60 * 1000;
    if (reqTimestamp < tolerance) {
      return res.status(403).send('Request expired');
    }
 
    // Validate hash - use raw body as string
    const rawBody = req.body.toString('utf8');
    const message = `${timestamp}.${rawBody}`;
    const digest = 'v0=' + crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
    
    if (signature !== digest) {
      return res.status(401).send('Request unauthorized');
    }

    // Parse the body after validation
    const parsedBody = JSON.parse(rawBody);
    const { event_timestamp, data } = parsedBody;

    // Rest of your code remains the same...
    const userQuestions: string[] = [];
    let messageNumber = 0;

    for (let i = 1; i < data.transcript.length; i++) {
      const current = data.transcript[i];
      if (
        current.role === "agent" &&
        typeof current.message === "string" &&
        current.message.startsWith("I'm sorry")
      ) {
        const previous = data.transcript[i - 1];
        if (previous && previous.role === "user") {
          messageNumber++
          userQuestions.push(`${messageNumber}) ${previous.message} <br>`);
        }
      }
    }

    console.log("Call Info: ", { 
      callTimestamp: event_timestamp, 
      conversationId: data.conversation_id, 
      callDurationInSeconds: data.metadata.call_duration_secs, 
      summary: data.analysis.transcript_summary,
      unresolvedQueries: userQuestions
    });

    const combinedQuestions = userQuestions.join('\n');
    const transcriptUrl = `https://elevenlabs.io/app/conversational-ai/history/${data.conversation_id}`
     
    const emailBody = constructEmailBody(data.conversation_id, combinedQuestions, transcriptUrl);

    if (userQuestions.length > 0) {
      try {
        const to = "Henry"; 
        const emailSubject = "COBRA AI Agent - Unresolved Queries"
        const emailResponse = await axios.post("https://adehenry1679.app.n8n.cloud/webhook-test/n8n-voice", {to, emailSubject, emailBody });
        console.log("Email webhook response:", emailResponse.data);
      } catch (error: any) {
        console.error("Error sending email webhook:", error.message);
      }
    } else {
      console.log("No unresolved queries found, skipping email notification.");            
    }

    return res.status(200).json({ message: "success" });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).send('Internal server error');
  }
});



app.listen(PORT, () => {
  console.log(`Middleware server running on http://localhost:${PORT}`);
});