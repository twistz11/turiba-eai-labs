const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

let orders = [];

app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

app.post('/orders', (req, res) => {
    const { items, customer, totalPrice, correlationId } = req.body;

    const newOrder = {
        orderId: `WEB-${Date.now()}`,
        correlationId: correlationId || `corr-${Math.random().toString(36).substr(2, 9)}`,
        status: "received",
        items: items || [],
        customer: customer || "Guest",
        totalPrice: totalPrice || 0,
        createdAt: new Date()
    };

    orders.push(newOrder);
    console.log(`[Order Service] Order created: ${newOrder.orderId}`);
    res.status(201).json(newOrder);
});

app.get('/orders/:id', (req, res) => {
    const order = orders.find(o => o.orderId === req.params.id);
    if (!order) {
        return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
});

app.get('/admin/logs', (req, res) => {
    res.json(orders);
});

app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
});