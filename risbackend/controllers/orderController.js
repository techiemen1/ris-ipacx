const orderModel = require('../models/orderModel');
const { logAction } = require('./auditController');

exports.createOrder = async (req, res) => {
    try {
        const { patient_id, modality } = req.body;
        if (!patient_id || !modality) {
            return res.status(400).json({ error: "Missing required fields (patient_id, modality)" });
        }
        const order = await orderModel.createOrder(req.body);
        await logAction(req.user.username, req.user.role, `Created order ${order.accession_number}`);
        res.status(201).json({ success: true, data: order });
    } catch (err) {
        console.error("Create Order Error:", err);
        res.status(500).json({ error: "Failed to create order" });
    }
};

exports.listOrders = async (req, res) => {
    try {
        const filters = {
            patient_id: req.query.patient_id,
            modality: req.query.modality,
            scheduled_date: req.query.scheduled_date
        };
        const orders = await orderModel.getOrders(filters);
        res.json({ success: true, data: orders });
    } catch (err) {
        console.error("List Orders Error:", err);
        res.status(500).json({ error: "Failed to list orders" });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await orderModel.updateOrderStatus(req.params.id, status);
        if (!order) return res.status(404).json({ error: "Order not found" });

        await logAction(req.user.username, req.user.role, `Updated order ${order.accession_number} to ${status}`);
        res.json({ success: true, data: order });
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).json({ error: "Failed to update status" });
    }
};
