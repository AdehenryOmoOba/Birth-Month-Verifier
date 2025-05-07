const cors = require('cors');
const cookieParser = require('cookie-parser');
import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT :  3000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Authentication middleware
const authenticateUser = (req: any, res: any, next: Function) => {
  const token = req.cookies.jwt;
  
  if (!token || token !== 'mock-jwt-token') {
    return res.status(401).json({ message: 'unauthorised', code: '---' });
  }
  
  next();
};

// Authorised birth months
const authorisedBirthMonths = [
  { birthMonth: 'January', code: '001' },
  { birthMonth: 'March', code: '003' },
  { birthMonth: 'May', code: '005' },
  { birthMonth: 'July', code: '007' },
  { birthMonth: 'September', code: '009' },
  { birthMonth: 'November', code: '011' }
];


// Mock user database
const users = [
  { username: 'admin', password: 'password' }
];

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Set HTTP-only cookie with JWT (mock)
    res.cookie('jwt', 'mock-jwt-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    res.status(200).json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Home route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Success' });
});

// GET route
app.get('/verify-month/:birth_month', authenticateUser, (req: any, res: any) => {

  const { birth_month } = req.params;

  console.log("Got a Birth Month Verification request...birth month provided is: ", birth_month )

  if (typeof birth_month !== 'string') {
    return res.status(400).json({ message: 'error', code: '000' });
  }

  const match = authorisedBirthMonths.find(
    (entry) => entry.birthMonth.toLowerCase() === birth_month.toLowerCase()
  );

  if (match) {
    console.log(match);
    return res.json({ message: 'Success', code: match.code });
  } else {
    return res.json({ message: 'error', code: '000' });
  }
});

app.get('/logout', (_req, res) => {
  res.clearCookie('jwt');
  res.status(200).json({ message: 'Logout successful' });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

