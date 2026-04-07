const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3003;

app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ status: "ok" }));

app.post('/inventory/reserve', (req, res) => {
    const { correlationId, items } = req.body;

    
    if (process.env.INVENTORY_FAIL_MODE === 'always') {
        console.log(`[Inventory] Error: Service unavailable for ${correlationId}`);
        return res.status(503).json({ 
            status: "error", 
            message: "Inventory system down",
            correlationId 
        });
    }

    console.log(`[Inventory] Reserved items for: ${correlationId}`);
    res.json({ 
        status: "reserved", 
        reservationId: `RES-${Math.floor(Math.random() * 100000)}`,
        correlationId 
    });
});

app.post('/inventory/release', (req, res) => {
    const { correlationId } = req.body;
    console.log(`[Inventory] Released: ${correlationId}`);
    res.json({ status: "released", correlationId });
});

app.listen(PORT, () => console.log(`Inventory Service running on port ${PORT}`));