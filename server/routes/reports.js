const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { arrayToCSV } = require('../services/exportService');

router.use(authenticate);

// GET /api/reports/dashboard - Role-specific Dashboard KPIs & metrics
router.get('/dashboard', (req, res) => {
  try {
    const user = req.user;
    const { date_from, date_to, project_id, associate_id } = req.query;

    const orgId = user.organization_id;

    // Build common filter clause
    let filterClause = 'WHERE sv.organization_id = ?';
    const params = [orgId];

    if (user.role === 'sales_head') {
      filterClause += ' AND (sv.sales_head_id = ? OR sv.associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      params.push(user.id, user.id);
    } else if (user.role === 'sales_associate') {
      filterClause += ' AND sv.associate_id = ?';
      params.push(user.id);
    }

    if (project_id) {
      filterClause += ' AND sv.project_id = ?';
      params.push(project_id);
    }

    if (associate_id && user.role !== 'sales_associate') {
      filterClause += ' AND sv.associate_id = ?';
      params.push(associate_id);
    }

    if (date_from) {
      filterClause += ' AND sv.scheduled_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      filterClause += ' AND sv.scheduled_date <= ?';
      params.push(date_to);
    }

    // 1. Visit Status breakdown
    const visitStats = db.all(`
      SELECT sv.status, COUNT(*) as count
      FROM site_visits sv
      ${filterClause}
      GROUP BY sv.status
    `, params);

    const counts = {
      total: 0,
      upcoming: 0,
      confirmed: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      reschedule_requested: 0
    };

    visitStats.forEach(row => {
      counts.total += row.count;
      if (counts[row.status] !== undefined) {
        counts[row.status] = row.count;
      }
    });

    // 2. Customer counts
    let custSql = 'SELECT COUNT(*) as count FROM customers WHERE organization_id = ?';
    const custParams = [orgId];
    if (user.role === 'sales_head') {
      custSql += ' AND (assigned_sales_head_id = ? OR assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      custParams.push(user.id, user.id);
    } else if (user.role === 'sales_associate') {
      custSql += ' AND assigned_associate_id = ?';
      custParams.push(user.id);
    }
    const totalCustomers = db.get(custSql, custParams).count;

    // 3. Invitations counts
    let invSql = 'SELECT COUNT(*) as count FROM invitations WHERE organization_id = ?';
    const invParams = [orgId];
    if (user.role === 'sales_head') {
      invSql += ' AND (sales_head_id = ? OR associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      invParams.push(user.id, user.id);
    } else if (user.role === 'sales_associate') {
      invSql += ' AND associate_id = ?';
      invParams.push(user.id);
    }
    const totalInvitations = db.get(invSql, invParams).count;

    // 4. Pending followups
    let folSql = "SELECT COUNT(*) as count FROM followups WHERE organization_id = ? AND status = 'pending'";
    const folParams = [orgId];
    if (user.role === 'sales_head') {
      folSql += ' AND (sales_head_id = ? OR associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      folParams.push(user.id, user.id);
    } else if (user.role === 'sales_associate') {
      folSql += ' AND associate_id = ?';
      folParams.push(user.id);
    }
    const pendingFollowups = db.get(folSql, folParams).count;

    // Bookings count (from customers table where status = 'booked')
    let bookSql = "SELECT COUNT(*) as count FROM customers WHERE organization_id = ? AND status = 'booked'";
    const bookParams = [orgId];
    if (user.role === 'sales_head') {
      bookSql += ' AND (assigned_sales_head_id = ? OR assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      bookParams.push(user.id, user.id);
    } else if (user.role === 'sales_associate') {
      bookSql += ' AND assigned_associate_id = ?';
      bookParams.push(user.id);
    }
    const totalBookings = db.get(bookSql, bookParams).count;

    // 5. Computed Conversion Rates (Strictly defined denominators)
    // Confirmation Rate = (Confirmed + Checked In + Completed) / Total Invitations
    const confirmedCount = counts.confirmed + counts.checked_in + counts.completed;
    const confirmationRate = totalInvitations > 0 ? ((confirmedCount / totalInvitations) * 100).toFixed(1) : '0.0';

    // Completion Rate = Completed / (Total Scheduled Visits - Cancelled Visits)
    const validVisits = counts.total - counts.cancelled;
    const completionRate = validVisits > 0 ? ((counts.completed / validVisits) * 100).toFixed(1) : '0.0';

    // Visit to Booking Conversion = Total Bookings / Completed Visits
    const bookingConversionRate = counts.completed > 0 ? ((totalBookings / counts.completed) * 100).toFixed(1) : '0.0';

    // 6. Recent upcoming visits
    let upcomingVisitsSql = `
      SELECT sv.id, sv.scheduled_date, sv.scheduled_time, sv.status,
             c.full_name as customer_name, c.mobile_number as customer_phone,
             p.name as project_name, u.name as associate_name,
             i.token as invitation_token
      FROM site_visits sv
      JOIN customers c ON sv.customer_id = c.id
      JOIN projects p ON sv.project_id = p.id
      JOIN users u ON sv.associate_id = u.id
      LEFT JOIN invitations i ON sv.invitation_id = i.id
      WHERE sv.organization_id = ? AND sv.scheduled_date >= date('now')
    `;
    const upcomingParams = [orgId];
    if (user.role === 'sales_head') {
      upcomingVisitsSql += ' AND (sv.sales_head_id = ? OR sv.associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      upcomingParams.push(user.id, user.id);
    } else if (user.role === 'sales_associate') {
      upcomingVisitsSql += ' AND sv.associate_id = ?';
      upcomingParams.push(user.id);
    }
    upcomingVisitsSql += ' ORDER BY sv.scheduled_date ASC, sv.scheduled_time ASC LIMIT 6';
    const upcomingVisits = db.all(upcomingVisitsSql, upcomingParams);

    // 7. Associate Leaderboard Performance (for Admin and Sales Head)
    let associatePerformance = [];
    if (user.role !== 'sales_associate') {
      let assocSql = `
        SELECT u.id, u.name, u.email,
          (SELECT COUNT(*) FROM customers c WHERE c.assigned_associate_id = u.id) as customers_count,
          (SELECT COUNT(*) FROM invitations i WHERE i.associate_id = u.id) as invitations_count,
          (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'completed') as completed_visits,
          (SELECT COUNT(*) FROM customers c WHERE c.assigned_associate_id = u.id AND c.status = 'booked') as bookings_count
        FROM users u
        WHERE u.organization_id = ? AND u.role = 'sales_associate' AND u.status = 'active'
      `;
      const assocParams = [orgId];
      if (user.role === 'sales_head') {
        assocSql += ' AND u.sales_head_id = ?';
        assocParams.push(user.id);
      }
      assocSql += ' ORDER BY completed_visits DESC, bookings_count DESC';
      associatePerformance = db.all(assocSql, assocParams);
    }

    return res.json({
      metrics: {
        totalCustomers,
        totalInvitations,
        totalVisits: counts.total,
        confirmedVisits: counts.confirmed,
        completedVisits: counts.completed,
        cancelledVisits: counts.cancelled,
        noShowVisits: counts.no_show,
        pendingFollowups,
        totalBookings,
        confirmationRate: Number(confirmationRate),
        completionRate: Number(completionRate),
        bookingConversionRate: Number(bookingConversionRate)
      },
      upcomingVisits,
      associatePerformance
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/export/performance - Export performance to CSV
router.get('/export/performance', (req, res) => {
  try {
    const user = req.user;
    const orgId = user.organization_id;

    let sql = `
      SELECT u.name as Associate_Name,
             u.email as Email,
             u.phone as Phone,
             sh.name as Reporting_Sales_Head,
             (SELECT COUNT(*) FROM customers c WHERE c.assigned_associate_id = u.id) as Total_Customers,
             (SELECT COUNT(*) FROM invitations i WHERE i.associate_id = u.id) as Total_Invitations_Created,
             (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'confirmed') as Confirmed_Visits,
             (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'completed') as Completed_Visits,
             (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'no_show') as No_Show_Visits,
             (SELECT COUNT(*) FROM customers c WHERE c.assigned_associate_id = u.id AND c.status = 'booked') as Bookings_Closed
      FROM users u
      LEFT JOIN users sh ON u.sales_head_id = sh.id
      WHERE u.organization_id = ? AND u.role = 'sales_associate'
    `;
    const params = [orgId];

    if (user.role === 'sales_head') {
      sql += ' AND u.sales_head_id = ?';
      params.push(user.id);
    }

    const rows = db.all(sql, params);
    const csv = arrayToCSV(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="visit_studio_sales_performance.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
