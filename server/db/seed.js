const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./index');

async function seedDatabase() {
  console.log('Seeding database with production-grade initial data...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // Clear existing data cleanly
  db.exec(`
    DELETE FROM feedback;
    DELETE FROM whatsapp_logs;
    DELETE FROM whatsapp_templates;
    DELETE FROM followups;
    DELETE FROM site_visits;
    DELETE FROM invitations;
    DELETE FROM customer_interactions;
    DELETE FROM customers;
    DELETE FROM project_configurations;
    DELETE FROM projects;
    DELETE FROM developers;
    DELETE FROM teams;
    DELETE FROM users;
    DELETE FROM organization_settings;
    DELETE FROM organizations;
    DELETE FROM activity_logs;
  `);

  // 1. Organizations
  const org1Id = 'org-aura-001';
  const org2Id = 'org-prestige-002';

  db.run(
    `INSERT INTO organizations (id, name, slug, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [org1Id, 'Aura Luxe Realty', 'aura-luxe', '+91 98100 12345', 'contact@auraluxe.com', 'One Horizon Center, Golf Course Road, Gurgaon', 'active']
  );

  db.run(
    `INSERT INTO organizations (id, name, slug, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [org2Id, 'Skyline Urban Advisory', 'skyline-urban', '+91 98200 98765', 'hello@skylineadvisory.in', 'BKC, Bandra East, Mumbai', 'active']
  );

  // Organization settings
  db.run(
    `INSERT INTO organization_settings (id, organization_id, agency_name, agency_subtitle, brand_color, accent_color, whatsapp_phone_number_id, whatsapp_access_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['sett-aura-001', org1Id, 'Aura Luxe Realty', 'Private Viewings & Luxury Portfolio', '#1e1b4b', '#f59e0b', '109847289172345', 'EAABwzL_mock_token_cloud_api_visit_studio']
  );

  // 2. Users (Hierarchical: Super Admin -> Admin -> Sales Head -> Sales Associates)
  const superAdminId = 'usr-super-001';
  const adminId = 'usr-admin-001';
  const salesHead1Id = 'usr-head-001';
  const salesHead2Id = 'usr-head-002';
  const associate1Id = 'usr-assoc-001';
  const associate2Id = 'usr-assoc-002';
  const associate3Id = 'usr-assoc-003';

  // Super Admin (Global, no org constraint)
  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [superAdminId, null, 'super_admin', 'Vikramaditya Roy', 'superadmin@visitstudio.com', '+91 99999 00001', passwordHash, 'active']
  );

  // Admin for Aura Luxe
  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [adminId, org1Id, 'admin', 'Ananya Deshmukh', 'admin@auraluxe.com', '+91 99999 00002', passwordHash, 'active']
  );

  // Sales Heads reporting to Admin
  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [salesHead1Id, org1Id, 'sales_head', 'Rajesh Malhotra', 'saleshead@auraluxe.com', '+91 99999 00003', passwordHash, 'active']
  );

  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [salesHead2Id, org1Id, 'sales_head', 'Pooja Sengupta', 'saleshead2@auraluxe.com', '+91 99999 00004', passwordHash, 'active']
  );

  // Sales Associates reporting to Sales Heads
  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [associate1Id, org1Id, 'sales_associate', 'Karan Verma', 'associate@auraluxe.com', '+91 98111 22334', passwordHash, salesHead1Id, 'active']
  );

  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [associate2Id, org1Id, 'sales_associate', 'Simran Kaur', 'associate2@auraluxe.com', '+91 98222 33445', passwordHash, salesHead1Id, 'active']
  );

  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [associate3Id, org1Id, 'sales_associate', 'Amit Saxena', 'associate3@auraluxe.com', '+91 98333 44556', passwordHash, salesHead2Id, 'active']
  );

  // Teams
  db.run(
    `INSERT INTO teams (id, organization_id, sales_head_id, name, description) VALUES (?, ?, ?, ?, ?)`,
    ['team-ncr-001', org1Id, salesHead1Id, 'NCR Luxury Advisory Squad', 'Primary focus on Gurgaon Golf Course Ext. and Noida Expressway high-value residences']
  );

  // 3. Developers
  const dev1Id = 'dev-m3m-001';
  const dev2Id = 'dev-max-002';
  const dev3Id = 'dev-prestige-003';
  const dev4Id = 'dev-dlf-004';

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev1Id, org1Id, 'M3M India', 'Nitin Goel', '+91 124 4777000', 'crm@m3mindia.com', 'https://m3mindia.com', 'M3M Cosmopolitan, Sector 66, Gurugram', 'Leading visionary developer creating world-class residential masterpieces.', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev2Id, org1Id, 'Max Estates', 'Saurabh Juneja', '+91 120 4000100', 'sales@maxestates.in', 'https://maxestates.in', 'Max Towers, Sector 16B, Noida', 'Pioneering wellness-integrated luxury living spaces.', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev3Id, org1Id, 'Prestige Group', 'Ramesh Rao', '+91 80 25591080', 'enquiry@prestigeconstructions.com', 'https://prestigeconstructions.com', 'The Falcon House, Bangalore & NCR Hub', 'Synonymous with innovation and luxury for over 35 years.', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev4Id, org1Id, 'DLF Luxury', 'Aditya Singh', '+91 124 4567890', 'luxury@dlf.in', 'https://dlf.in', 'DLF Gateway Tower, Cyber City, Gurugram', 'India’s premier real estate developer defining super-luxury living.', 'active']
  );

  // 4. Projects
  const proj1Id = 'proj-jacob-001';
  const proj2Id = 'proj-cullinan-002';
  const proj3Id = 'proj-max105-003';
  const proj4Id = 'proj-prestige150-004';

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj1Id, org1Id, dev1Id, 'M3M Jacob & Co Residences',
      'Sector 65, Golf Course Extension Road, Gurugram',
      'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon',
      'Ultra-exclusive branded residences crafted in collaboration with world-renowned watchmaker & jeweler Jacob & Co. Features private sky infinity pools and Michelin-grade dining.',
      '1,850 sq. ft.', '2,200 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', '₹4.80 Cr - ₹9.50 Cr',
      'Private Helipad, Infinity Sky Pool, Valet Concierge, Observatory Lounge, Cigar Bar',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj2Id, org1Id, dev1Id, 'M3M The Cullinan',
      'Sector 94, Noida Expressway, Noida',
      'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida',
      'Mixed-use high-street luxury development on the junction of South Delhi and Noida. 5.5-acre central green piazza with private elevators.',
      '2,450 sq. ft.', '3,100 sq. ft.', '3,600 sq. ft.', '₹5.80 Cr', '₹5.80 Cr - ₹12.00 Cr',
      'Direct South Delhi Connectivity, 100,000 sq ft Clubhouse, 7-tier Security, Temperature Controlled Olympic Pool',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj3Id, org1Id, dev2Id, 'Max Estate 105',
      'Sector 105, Noida Expressway, Noida',
      'https://maps.google.com/?q=Sector+105+Noida+Expressway',
      'Biophilic architectural marvel curated around wellness, nature and pristine air quality filtration for supreme family wellbeing.',
      '2,100 sq. ft.', '2,600 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', '₹4.20 Cr - ₹7.80 Cr',
      'Forest Walkway, Organic Cafe, IGBC Platinum Pre-certified, Hydrotherapy Spa',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj4Id, org1Id, dev3Id, 'Prestige 150 Sanctuary',
      'Sector 150, Sports City, Noida',
      'https://maps.google.com/?q=Sector+150+Noida+Sports+City',
      'Low-density golf-centric residential paradise surrounded by 42 acres of curated sports amenities and verdant landscapes.',
      '2,600 sq. ft.', '3,200 sq. ft.', '3,500 sq. ft.', '₹3.90 Cr', '₹3.90 Cr - ₹6.50 Cr',
      '9-Hole Executive Golf Course, Olympic Gymnastics Arena, Tennis Academy',
      'active'
    ]
  );

  // 5. Project Configurations
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-001', proj1Id, '3 BHK Premium Sky Residence', '1,850 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-002', proj1Id, '4 BHK Royal Penthouse', '3,100 sq. ft.', '3,850 sq. ft.', '₹7.90 Cr', 4, 5]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-003', proj2Id, '4 BHK Grand View Suite', '2,450 sq. ft.', '3,600 sq. ft.', '₹5.80 Cr', 4, 4]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-004', proj3Id, '3 BHK Wellness Residence', '2,100 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', 3, 3]
  );

  // 6. Customers
  const cust1Id = 'cust-001';
  const cust2Id = 'cust-002';
  const cust3Id = 'cust-003';
  const cust4Id = 'cust-004';
  const cust5Id = 'cust-005';
  const cust6Id = 'cust-006';

  db.run(
    `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, whatsapp_number, email, budget, preferred_location, interested_project_id, configuration, lead_source, requirements, assigned_associate_id, assigned_sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cust1Id, org1Id, 'CUST-1001', 'Rohan Singhania', '+91 98101 23456', '+91 98101 23456', 'rohan.singhania@apexholding.com', '₹5.00 Cr - ₹6.50 Cr', 'Golf Course Ext Road', proj1Id, '3 BHK', 'Google Ads', 'Looking for high floor with open Aravali view. Immediate family relocation.', associate1Id, salesHead1Id, 'visit_scheduled']
  );

  db.run(
    `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, whatsapp_number, email, budget, preferred_location, interested_project_id, configuration, lead_source, requirements, assigned_associate_id, assigned_sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cust2Id, org1Id, 'CUST-1002', 'Priya Mehta', '+91 98202 34567', '+91 98202 34567', 'priya.mehta@designstudio.in', '₹6.00 Cr - ₹8.00 Cr', 'Noida Expressway', proj2Id, '4 BHK', 'Referral', 'Prefers corner penthouse with private elevator lobby. Needs 3 covered car parks.', associate1Id, salesHead1Id, 'visited']
  );

  db.run(
    `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, whatsapp_number, email, budget, preferred_location, interested_project_id, configuration, lead_source, requirements, assigned_associate_id, assigned_sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cust3Id, org1Id, 'CUST-1003', 'Dr. Sanjay Kapoor', '+91 98303 45678', '+91 98303 45678', 'sanjay.kapoor@medicare.org', '₹4.00 Cr - ₹5.00 Cr', 'Sector 105 Noida', proj3Id, '3 BHK', 'Direct Walk-in', 'Senior surgeon seeking quiet, biophilic greenery and wellness amenities.', associate2Id, salesHead1Id, 'booked']
  );

  db.run(
    `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, whatsapp_number, email, budget, preferred_location, interested_project_id, configuration, lead_source, requirements, assigned_associate_id, assigned_sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cust4Id, org1Id, 'CUST-1004', 'Anita Bhatia', '+91 98404 56789', '+91 98404 56789', 'anita.bhatia@gmail.com', '₹7.00 Cr - ₹10.00 Cr', 'Golf Course Ext Road', proj1Id, '4 BHK', 'Instagram', 'Tech founder evaluating duplex sky villa for investment and weekend living.', associate2Id, salesHead1Id, 'interested']
  );

  db.run(
    `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, whatsapp_number, email, budget, preferred_location, interested_project_id, configuration, lead_source, requirements, assigned_associate_id, assigned_sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cust5Id, org1Id, 'CUST-1005', 'Vikram Malhotra', '+91 98505 67890', '+91 98505 67890', 'vikram.m@zenithlogistics.com', '₹3.50 Cr - ₹4.50 Cr', 'Sector 150 Noida', proj4Id, '3 BHK', 'Channel Partner', 'Requires sports facility access for kids tennis training.', associate3Id, salesHead2Id, 'lead']
  );

  db.run(
    `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, whatsapp_number, email, budget, preferred_location, interested_project_id, configuration, lead_source, requirements, assigned_associate_id, assigned_sales_head_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cust6Id, org1Id, 'CUST-1006', 'Neha Sharma', '+91 98606 78901', '+91 98606 78901', 'neha.sharma@fintechadvisors.in', '₹4.50 Cr - ₹5.50 Cr', 'Golf Course Ext Road', proj1Id, '3 BHK', 'Website Form', 'Interested in payment plans and subvention schemes.', associate1Id, salesHead1Id, 'visit_scheduled']
  );

  // 7. Customer Timeline Interactions
  db.run(
    `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes) VALUES (?, ?, ?, ?, ?)`,
    ['int-001', cust1Id, associate1Id, 'Call', 'First introductory discovery call completed. Customer confirmed high intent for 3 BHK high-rise unit.']
  );
  db.run(
    `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes) VALUES (?, ?, ?, ?, ?)`,
    ['int-002', cust1Id, associate1Id, 'Invitation Created', 'Generated personalized luxury digital invitation for M3M Jacob & Co on Nov 20, 2026.']
  );

  // 8. Invitations
  const inv1Token = 'inv_' + crypto.randomBytes(16).toString('hex');
  const inv2Token = 'inv_' + crypto.randomBytes(16).toString('hex');
  const inv3Token = 'inv_' + crypto.randomBytes(16).toString('hex');
  const inv4Token = 'inv_' + crypto.randomBytes(16).toString('hex');

  const inv1Id = 'inv-001';
  const inv2Id = 'inv-002';
  const inv3Id = 'inv-003';
  const inv4Id = 'inv-004';

  db.run(
    `INSERT INTO invitations (id, organization_id, token, customer_id, project_id, developer_id, associate_id, sales_head_id, visit_date, visit_time, duration, location, maps_url, size, price, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inv1Id, org1Id, inv1Token, cust1Id, proj1Id, dev1Id, associate1Id, salesHead1Id,
      '2026-11-20', '11:30', 60,
      'M3M Experience Gallery, Sector 65, Golf Course Extension Rd, Gurugram',
      'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon',
      '2,400', '₹4.80 Cr',
      'Exclusive viewing of sample showcase apartment 1802. Valet parking reserved for Mr. Singhania at Entrance Gate 2.',
      'confirmed'
    ]
  );

  db.run(
    `INSERT INTO invitations (id, organization_id, token, customer_id, project_id, developer_id, associate_id, sales_head_id, visit_date, visit_time, duration, location, maps_url, size, price, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inv2Id, org1Id, inv2Token, cust2Id, proj2Id, dev1Id, associate1Id, salesHead1Id,
      '2026-11-14', '15:00', 90,
      'M3M The Cullinan Signature Lounge, Sector 94, Noida',
      'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida',
      '3,600', '₹5.80 Cr',
      'Walkthrough of South Delhi skyline elevation and clubhouse model presentation.',
      'confirmed'
    ]
  );

  db.run(
    `INSERT INTO invitations (id, organization_id, token, customer_id, project_id, developer_id, associate_id, sales_head_id, visit_date, visit_time, duration, location, maps_url, size, price, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inv3Id, org1Id, inv3Token, cust6Id, proj1Id, dev1Id, associate1Id, salesHead1Id,
      '2026-11-22', '16:00', 60,
      'M3M Experience Gallery, Sector 65, Golf Course Extension Rd, Gurugram',
      'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon',
      '2,400', '₹4.80 Cr',
      'Discussion on payment timeline and construction milestones.',
      'sent'
    ]
  );

  db.run(
    `INSERT INTO invitations (id, organization_id, token, customer_id, project_id, developer_id, associate_id, sales_head_id, visit_date, visit_time, duration, location, maps_url, size, price, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inv4Id, org1Id, inv4Token, cust3Id, proj3Id, dev2Id, associate2Id, salesHead1Id,
      '2026-11-10', '10:30', 60,
      'Max Estate Experience Pavilion, Sector 105, Noida',
      'https://maps.google.com/?q=Sector+105+Noida+Expressway',
      '2,850', '₹4.20 Cr',
      'Walkthrough of botanical gardens and sample unit.',
      'confirmed'
    ]
  );

  // 9. Site Visits (Attendance & QR Check-in tracking)
  const visit1Id = 'vis-001';
  const visit2Id = 'vis-002';
  const visit3Id = 'vis-003';
  const visit4Id = 'vis-004';

  // Upcoming confirmed visit
  db.run(
    `INSERT INTO site_visits (id, organization_id, invitation_id, customer_id, project_id, associate_id, sales_head_id, scheduled_date, scheduled_time, duration, status, authorized_staff_id, staff_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [visit1Id, org1Id, inv1Id, cust1Id, proj1Id, associate1Id, salesHead1Id, '2026-11-20', '11:30', 60, 'confirmed', associate1Id, 'VIP customer. Concierge informed to have iced matcha latte ready upon arrival.']
  );

  // Completed visit with QR Check-in
  db.run(
    `INSERT INTO site_visits (id, organization_id, invitation_id, customer_id, project_id, associate_id, sales_head_id, scheduled_date, scheduled_time, duration, status, check_in_time, check_out_time, check_in_method, authorized_staff_id, staff_notes, feedback_submitted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [visit2Id, org1Id, inv2Id, cust2Id, proj2Id, associate1Id, salesHead1Id, '2026-11-14', '15:00', 90, 'completed', '2026-11-14 15:04:12', '2026-11-14 16:32:00', 'qr', associate1Id, 'Customer arrived on time, was extremely satisfied with the corner floor view.', 1]
  );

  // Completed visit for Dr Kapoor that converted to booking!
  db.run(
    `INSERT INTO site_visits (id, organization_id, invitation_id, customer_id, project_id, associate_id, sales_head_id, scheduled_date, scheduled_time, duration, status, check_in_time, check_out_time, check_in_method, authorized_staff_id, staff_notes, feedback_submitted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [visit4Id, org1Id, inv4Id, cust3Id, proj3Id, associate2Id, salesHead1Id, '2026-11-10', '10:30', 60, 'completed', '2026-11-10 10:28:40', '2026-11-10 12:10:00', 'manual', associate2Id, 'Detailed unit tour. Customer proceeded with expression of interest token payment.', 1]
  );

  // Upcoming invitation sent
  db.run(
    `INSERT INTO site_visits (id, organization_id, invitation_id, customer_id, project_id, associate_id, sales_head_id, scheduled_date, scheduled_time, duration, status, authorized_staff_id, staff_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [visit3Id, org1Id, inv3Id, cust6Id, proj1Id, associate1Id, salesHead1Id, '2026-11-22', '16:00', 60, 'upcoming', associate1Id, 'Awaiting final confirmation response.']
  );

  // 10. Customer Feedback
  db.run(
    `INSERT INTO feedback (id, site_visit_id, customer_id, rating, interest_level, budget_fit, sales_experience, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fb-001', visit2Id, cust2Id, 5, 'very_high', 'within_budget', 5, 'Outstanding experience! Karan was knowledgeable, courteous and provided clear structural drawings. Highly inclined to book tower B penthouse.']
  );

  db.run(
    `INSERT INTO feedback (id, site_visit_id, customer_id, rating, interest_level, budget_fit, sales_experience, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fb-002', visit4Id, cust3Id, 5, 'very_high', 'within_budget', 5, 'Loved the serene wellness atmosphere and oxygen-rich courtyard. Booking form submitted.']
  );

  // 11. Follow-ups
  db.run(
    `INSERT INTO followups (id, organization_id, customer_id, associate_id, sales_head_id, follow_up_date, follow_up_time, follow_up_type, priority, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fol-001', org1Id, cust2Id, associate1Id, salesHead1Id, '2026-11-17', '14:00', 'meeting', 'urgent', 'Send finalized floor plan of Tower B Penthouse with builder-buyer agreement draft.', 'pending']
  );

  db.run(
    `INSERT INTO followups (id, organization_id, customer_id, associate_id, sales_head_id, follow_up_date, follow_up_time, follow_up_type, priority, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fol-002', org1Id, cust1Id, associate1Id, salesHead1Id, '2026-11-19', '11:00', 'whatsapp', 'high', 'Share live Google Maps route and parking gate pass before tomorrow visit.', 'pending']
  );

  db.run(
    `INSERT INTO followups (id, organization_id, customer_id, associate_id, sales_head_id, follow_up_date, follow_up_time, follow_up_type, priority, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fol-003', org1Id, cust4Id, associate2Id, salesHead1Id, '2026-11-12', '16:00', 'call', 'medium', 'Check if CA approved the tax structured investment schedule.', 'overdue']
  );

  // 12. WhatsApp Templates
  db.run(
    `INSERT INTO whatsapp_templates (id, organization_id, template_name, category, body_text, variables, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'tpl-001', org1Id, 'visit_invitation_v1', 'MARKETING',
      'Dear {{customer_name}}, you are cordially invited to an exclusive private viewing of {{project_name}} on {{visit_date}} at {{visit_time}}. View your personalized invitation and directions here: {{invitation_link}} - {{agency_name}}',
      'customer_name,project_name,visit_date,visit_time,invitation_link,agency_name', 'approved'
    ]
  );

  db.run(
    `INSERT INTO whatsapp_templates (id, organization_id, template_name, category, body_text, variables, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'tpl-002', org1Id, 'visit_confirmation_v1', 'UTILITY',
      'Hello {{customer_name}}, your site visit for {{project_name}} on {{visit_date}} at {{visit_time}} is confirmed. Your host {{advisor_name}} (+{{advisor_phone}}) will receive you at the reception. Quick access pass: {{invitation_link}}',
      'customer_name,project_name,visit_date,visit_time,advisor_name,advisor_phone,invitation_link', 'approved'
    ]
  );

  db.run(
    `INSERT INTO whatsapp_templates (id, organization_id, template_name, category, body_text, variables, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'tpl-003', org1Id, 'reminder_24h_v1', 'UTILITY',
      'Reminder: Your property visit to {{project_name}} is tomorrow at {{visit_time}}. Directions & concierge contact: {{invitation_link}}',
      'project_name,visit_time,invitation_link', 'approved'
    ]
  );

  db.run(
    `INSERT INTO whatsapp_templates (id, organization_id, template_name, category, body_text, variables, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'tpl-004', org1Id, 'visit_feedback_v1', 'MARKETING',
      'Thank you for visiting {{project_name}} today! We would love your quick 30-second thoughts to ensure the best possible experience: {{feedback_link}}',
      'project_name,feedback_link', 'approved'
    ]
  );

  // 13. WhatsApp Logs
  db.run(
    `INSERT INTO whatsapp_logs (id, organization_id, recipient_phone, template_name, message_body, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['walog-001', org1Id, '+919810123456', 'visit_invitation_v1', 'Dear Rohan Singhania, you are cordially invited to an exclusive private viewing of M3M Jacob & Co Residences...', 'delivered']
  );

  db.run(
    `INSERT INTO whatsapp_logs (id, organization_id, recipient_phone, template_name, message_body, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['walog-002', org1Id, '+919820234567', 'visit_confirmation_v1', 'Hello Priya Mehta, your site visit for M3M The Cullinan on 2026-11-14 at 15:00 is confirmed...', 'delivered']
  );

  // 14. Activity Logs
  db.run(
    `INSERT INTO activity_logs (id, organization_id, user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['act-001', org1Id, associate1Id, 'Karan Verma', 'sales_associate', 'CREATE_INVITATION', 'invitations', inv1Id, 'Generated luxury invitation token for customer Rohan Singhania for project M3M Jacob & Co Residences', '127.0.0.1']
  );

  db.run(
    `INSERT INTO activity_logs (id, organization_id, user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['act-002', org1Id, associate1Id, 'Karan Verma', 'sales_associate', 'CHECK_IN_QR', 'site_visits', visit2Id, 'Scanned customer QR code for Priya Mehta at M3M The Cullinan Signature Lounge', '127.0.0.1']
  );

  console.log('Database seeded successfully with all 4 hierarchical roles, projects, customers, invitations and visits!');
}

if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
