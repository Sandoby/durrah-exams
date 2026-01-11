import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createKashierSession, CreateSessionParams } from './kashier';
import webhookRouter from './webhook';

const app = express();
app.use(cors({ origin: ['https://tutors.durrahsystem.tech', 'https://durrahtutors.com'], credentials: true }));
app.use(bodyParser.json());

const MERCHANT_ID = 'your_merchant_id';
const API_KEY = 'af01074c-fe16-4daf-a235-c36fea074d52';
const SECRET_KEY = '7cccd829b8816d6296b5e2c017311cb2$d70e305ed9170ad2f6d250b0380597c7b8ecb50fdd8fef5327bdbd57d4d97eccabe702c49daf17301e21fe840272404e';

app.post('/api/create-payment-session', async (req: Request, res: Response) => {
  try {
    const { orderId, amount, currency, customerEmail, customerReference } = req.body as CreateSessionParams;
    const sessionUrl = await createKashierSession(
      { orderId, amount, currency, customerEmail, customerReference },
      MERCHANT_ID, API_KEY, SECRET_KEY
    );
    res.json({ sessionUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session', details: err });
  }
});

app.use(webhookRouter);

app.listen(3001, () => console.log('Server running on port 3001'));
