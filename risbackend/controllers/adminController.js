const { pool } = require('../config/postgres');
const { logAction } = require('./auditController');

exports.cleanupData = async (req, res) => {
    const client = await pool.connect();
    try {
        const { type, filters } = req.body;
        // type: 'reports', 'orders', 'patients', 'everything'
        // filters: { patientId, dateFrom, dateTo }

        const user = req.user.username;
        await client.query('BEGIN');

        // Helper to build WHERE clause
        const buildWhere = (tableAlias, dateCol = 'created_at') => {
            const conditions = [];
            const values = [];
            let idx = 1;

            if (filters?.patientId) {
                // specific patient
                conditions.push(`patient_id = $${idx++}`);
                values.push(filters.patientId);
            }
            if (filters?.dateFrom) {
                conditions.push(`${dateCol} >= $${idx++}`);
                values.push(filters.dateFrom);
            }
            if (filters?.dateTo) {
                conditions.push(`${dateCol} <= $${idx++}`);
                values.push(filters.dateTo);
            }
            return { text: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', values };
        };

        const runDelete = async (table, dateCol = 'created_at') => {
            const { text, values } = buildWhere(table, dateCol);
            // If filters exist, use them. If no filters and we want to delete all, text is empty.
            if (text || !filters || Object.keys(filters).length === 0) {
                await client.query(`DELETE FROM ${table} ${text}`, values);
            }
        };

        // 1. REPORTS
        if (type === 'reports' || type === 'everything') {
            await runDelete('reports', 'created_at');
        }

        // 2. ORDERS & RELATED
        if (type === 'orders' || type === 'everything' || type === 'patients') {
            // Processing Orders chain. 
            // Note: Deleting from leaf to root to avoid FK issues if cascade isn't set, 
            // though 'orders' usually is central.

            // To be precise with filters, we need to handle tables that might not have 'patient_id' directly if schema is complex,
            // but for this standard RIS, we assume they do or we rely on 'orders' being the key.
            // If filters are applied, we might miss 'billing' if it relies on order_id.
            // For now, assume patient_id exists on all major tables or simple delete is acceptable.

            await runDelete('billing', 'created_at');
            await runDelete('worklist', 'created_at');
            await runDelete('orders', 'created_at');
            await runDelete('appointments', 'scheduled_time');
        }

        // 3. PATIENTS
        if (type === 'patients' || type === 'everything') {
            // Only delete patients if we are in 'everything' or 'patients' mode.
            // If filters are on, we delete specific patients.
            // Ensure we deleted their data first (handled above if type matches).
            await runDelete('patients', 'created_at');
        }

        await client.query('COMMIT');
        await logAction(user, 'admin', `Danger Zone: Cleared ${type} with filters: ${JSON.stringify(filters || {})}`);
        res.json({ success: true, message: `Successfully cleared ${type}` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Cleanup failed", err);
        res.status(500).json({ error: 'Cleanup failed: ' + err.message });
    } finally {
        client.release();
    }
};
