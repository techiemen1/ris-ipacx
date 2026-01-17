const { pool } = require('./postgres');

const initDBConnections = async () => {
    let client;
    try {
        client = await pool.connect(); // PostgreSQL pool check
        console.log('✅ PostgreSQL connected successfully');
    } catch (err) {
        console.error('❌ Database initialization failed:', err.message);
    } finally {
        if (client) client.release();
    }
};

module.exports = initDBConnections;
