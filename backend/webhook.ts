import express, { Request, Response } from 'express';

const router = express.Router();

// Kashier webhook endpoint
router.post('/api/payment-webhook', (req: Request, res: Response) => {
  // TODO: Validate Kashier webhook signature using SECRET_KEY
  // Example: req.headers['x-kashier-signature']
  // Confirm payment status and mark order as paid
  // Respond with 200 OK
  res.sendStatus(200);
});

export default router;
