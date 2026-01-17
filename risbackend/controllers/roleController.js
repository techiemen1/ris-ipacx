const { getRoles, createRole } = require('../models/roleModel');

exports.listRoles = async (req, res) => {
  try {
    const roles = await getRoles();
    res.json(roles);
  } catch (err) {
    console.error('Roles fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

exports.addRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = await createRole(name, description);
    res.json(role);
  } catch (err) {
    console.error('Role creation error:', err);
    res.status(500).json({ error: 'Failed to create role' });
  }
};
