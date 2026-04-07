const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ status: "ok" }));

app.post('/payment/authorize', (req, res) => {
    const { correlationId } = req.body;
    
   
    if (process.env.PAYMENT_FAIL_MODE === 'always') {
        console.log(`[Payment] Rejected: ${correlationId}`);
        return res.status(402).json({ 
            status: "failed", 
            error: "Payment rejected by configuration",
            correlationId 
        });
    }

    console.log(`[Payment] Authorized: ${correlationId}`);
    res.json({ 
        status: "authorized", 
        transactionId: `TX-${Math.random().toString(36).toUpperCase().substr(2, 6)}`,
        correlationId 
    });
});

app.post('/payment/refund', (req, res) => {
    const { correlationId } = req.body;
    console.log(`[Payment] Refunded: ${correlationId}`);
    res.json({ status: "refunded", correlationId });
});

app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));