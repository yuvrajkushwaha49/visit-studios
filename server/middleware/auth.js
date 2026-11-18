const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.get('SELECT id, organization_id, role, name, email, phone, sales_head_id, status FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User account is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication session' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${req.user.role}' is not authorized for this action.` 
      });
    }
    next();
  };
}

// Scope filter builder for SQL queries based on RBAC hierarchy
function getScopeFilter(user, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  if (user.role === 'super_admin') {
    return { clause: '1=1', params: [] };
  }

  if (user.role === 'admin') {
    return { 
      clause: `${prefix}organization_id = ?`, 
      params: [user.organization_id] 
    };
  }

  if (user.role === 'sales_head') {
    return {
      clause: `(${prefix}organization_id = ? AND (${prefix}sales_head_id = ? OR ${prefix}associate_id IN (SELECT id FROM users WHERE sales_head_id = ?)))`,
      params: [user.organization_id, user.id, user.id]
    };
  }

  if (user.role === 'sales_associate') {
    return {
      clause: `(${prefix}organization_id = ? AND (${prefix}associate_id = ? OR ${prefix}assigned_associate_id = ?))`,
      params: [user.organization_id, user.id, user.id]
    };
  }

  return { clause: '1=0', params: [] };
}

module.exports = {
  authenticate,
  authorizeRoles,
  getScopeFilter
};
