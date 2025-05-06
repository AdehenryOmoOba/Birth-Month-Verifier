import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Authorised birth months
const authorisedBirthMonths = [
  { birthMonth: 'January', code: '001' },
  { birthMonth: 'March', code: '003' },
  { birthMonth: 'May', code: '005' },
  { birthMonth: 'July', code: '007' },
  { birthMonth: 'September', code: '009' },
  { birthMonth: 'November', code: '011' }
];


interface BirthMonthRequestBody {
    birth_month: string;
}

// Home route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Success' });
});

// POST route
app.post('/verify-month', (req: Request<{}, {}, BirthMonthRequestBody>, res: any) => {

  console.log("Got a POST request...")

  const { birth_month } = req.body;

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
