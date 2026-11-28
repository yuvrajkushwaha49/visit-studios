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
  const org3Id = 'org-08a1da1a';

  db.run(
    `INSERT INTO organizations (id, name, slug, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [org1Id, 'Aura Luxe Realty', 'aura-luxe', '+91 98100 12345', 'contact@auraluxe.com', 'One Horizon Center, Golf Course Road, Gurgaon', 'active']
  );

  db.run(
    `INSERT INTO organizations (id, name, slug, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [org2Id, 'Skyline Urban Advisory', 'skyline-urban', '+91 98200 98765', 'hello@skylineadvisory.in', 'BKC, Bandra East, Mumbai', 'active']
  );

  db.run(
    `INSERT INTO organizations (id, name, slug, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [org3Id, 'Workians Realty', 'workians-realty', '+91 99999 12345', 'info@workians.com', 'Noida / Greater Noida NCR', 'active']
  );

  // Organization settings
  db.run(
    `INSERT INTO organization_settings (id, organization_id, agency_name, agency_subtitle, brand_color, accent_color, whatsapp_phone_number_id, whatsapp_access_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['sett-aura-001', org1Id, 'Aura Luxe Realty', 'Private Viewings & Luxury Portfolio', '#1e1b4b', '#f59e0b', '109847289172345', 'EAABwzL_mock_token_cloud_api_visit_studio']
  );

  db.run(
    `INSERT INTO organization_settings (id, organization_id, agency_name, agency_subtitle, brand_color, accent_color, whatsapp_phone_number_id, whatsapp_access_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['sett-workians-001', org3Id, 'Workians Realty', 'Site Visit Management & Tracking', '#1e1b4b', '#2563eb', '109847289172345', 'EAABwzL_mock_token_cloud_api_visit_studio']
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

  // Users for Workians Realty
  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['usr-admin-55d7e83d', org3Id, 'admin', 'Sajan Rajnikant Patel', 'sajanpatel@workians.com', '+91 99999 11111', passwordHash, 'active']
  );

  db.run(
    `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['usr-sales-1cb1b7d6', org3Id, 'sales_head', 'Kaushal Pant', 'kaushalpant@workians.com', '+91 99999 22222', passwordHash, 'active']
  );

  // Teams
  db.run(
    `INSERT INTO teams (id, organization_id, sales_head_id, name, description) VALUES (?, ?, ?, ?, ?)`,
    ['team-ncr-001', org1Id, salesHead1Id, 'NCR Luxury Advisory Squad', 'Primary focus on Gurgaon Golf Course Ext. and Noida Expressway high-value residences']
  );

  db.run(
    `INSERT INTO teams (id, organization_id, sales_head_id, name, description) VALUES (?, ?, ?, ?, ?)`,
    ['team-workians-001', org3Id, 'usr-sales-1cb1b7d6', 'Workians Core Sales Team', 'Focus on NCR residential & commercial site visits']
  );

  // 3. Developers
  const dev1Id = 'dev-m3m-001';
  const dev2Id = 'dev-max-002';
  const dev3Id = 'dev-prestige-003';
  const dev4Id = 'dev-dlf-004';
  const dev5Id = 'dev-saya-005';
  const dev6Id = 'dev-ncr-006';
  const dev7Id = 'dev-gulshan-007';
  const dev8Id = 'dev-godrej-008';

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev1Id, org1Id, 'M3M India', 'Nitin Goel', '+91 124 4777000', 'crm@m3mindia.com', 'https://m3mindia.com', 'M3M Cosmopolitan, Sector 66, Gurugram', 'Leading visionary developer creating world-class residential masterpieces.', '/uploads/logos/logo-39f99d0e.png', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev2Id, org1Id, 'Max Estates', 'Saurabh Juneja', '+91 120 4000100', 'sales@maxestates.in', 'https://maxestates.in', 'Max Towers, Sector 16B, Noida', 'Pioneering wellness-integrated luxury living spaces.', '/uploads/logos/logo-9f7fe60c.jpg', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev3Id, org1Id, 'Prestige Group', 'Ramesh Rao', '+91 80 25591080', 'enquiry@prestigeconstructions.com', 'https://prestigeconstructions.com', 'The Falcon House, Bangalore & NCR Hub', 'Synonymous with innovation and luxury for over 35 years.', '/uploads/logos/logo-4bb771f4.png', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev4Id, org1Id, 'DLF Luxury', 'Aditya Singh', '+91 124 4567890', 'luxury@dlf.in', 'https://dlf.in', 'DLF Gateway Tower, Cyber City, Gurugram', 'India’s premier real estate developer defining super-luxury living.', '/uploads/logos/logo-d32401ff.png', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev5Id, org1Id, 'Saya Group', 'Vikas Sharma', '+91 120 4888000', 'info@sayahomes.in', 'https://sayahomes.in', 'Saya Homes HQ, Ghaziabad & Noida', 'Premier NCR luxury developer known for iconic architectural landmarks.', '/uploads/logos/logo-dev-saya.webp', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev6Id, org1Id, 'NCR Group', 'Ajay Kumar', '+91 120 6777100', 'contact@ncrmonarch.in', 'https://ncrmonarch.in', 'Plot No GH-02, Sector 1, Greater Noida West', 'Leading real estate developer delivering quality residential and commercial hubs.', '/uploads/logos/logo-dev-ncr.png', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev7Id, org1Id, 'Gulshan Homz', 'Deepak Kapoor', '+91 120 4777500', 'care@gulshangroup.com', 'https://gulshangroup.com', 'Gulshan One29, Sector 129, Noida', 'Pioneers of grand luxury living and bespoke residential communities in Delhi NCR.', '/uploads/logos/logo-dev-gulshan.png', 'active']
  );

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dev8Id, org1Id, 'Godrej Properties', 'Mohit Malhotra', '+91 22 61664444', 'sales@godrejproperties.com', 'https://godrejproperties.com', 'Godrej One, Pirojshanagar, Eastern Express Highway, Mumbai & NCR Hub', "India's most trusted developer bringing sustainability and innovation to NCR.", '/uploads/logos/logo-dev-godrej.png', 'active']
  );

  // Developers for Workians Realty (Sajan Patel)
  const devM3mWId = 'dev-m3m-org-08a1da1a';
  const devMaxWId = 'dev-max-org-08a1da1a';
  const devGvWId = 'dev-greatvalue-org-08a1da1a';
  const devPrestigeWId = 'dev-prestige-org-08a1da1a';
  const devSayaWId = 'dev-saya-org-08a1da1a';
  const devNcrWId = 'dev-ncr-org-08a1da1a';
  const devGulshanWId = 'dev-gulshan-org-08a1da1a';
  const devGodrejWId = 'dev-godrej-org-08a1da1a';

  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devM3mWId, org3Id, 'M3M', 'Nitin Goel', '+91 124 4777000', 'crm@m3mindia.com', 'https://m3mindia.com', 'M3M Cosmopolitan, Sector 66, Gurugram', 'Leading visionary developer creating world-class residential masterpieces.', '/uploads/logos/logo-39f99d0e.png', 'active']
  );
  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devMaxWId, org3Id, 'Max Estate', 'Saurabh Juneja', '+91 120 4000100', 'sales@maxestates.in', 'https://maxestates.in', 'Max Towers, Sector 16B, Noida', 'Pioneering wellness-integrated luxury living spaces.', '/uploads/logos/logo-9f7fe60c.jpg', 'active']
  );
  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devGvWId, org3Id, 'Great Value', 'Manoj Goyal', '+91 120 4000800', 'sales@greatvalueindia.com', 'https://greatvaluerealty.com', 'Great Value Tower, Sector 18 / Sector 107, Noida', 'Renowned NCR real estate developer delivering premium, value-driven residential landmarks.', '/uploads/logos/logo-dev-greatvalue.png', 'active']
  );
  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devPrestigeWId, org3Id, 'Prestige', 'Ramesh Rao', '+91 80 25591080', 'enquiry@prestigeconstructions.com', 'https://prestigeconstructions.com', 'The Falcon House, Bangalore & NCR Hub', 'Synonymous with innovation and luxury for over 35 years.', '/uploads/logos/logo-4bb771f4.png', 'active']
  );
  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devSayaWId, org3Id, 'Saya Group', 'Vikas Sharma', '+91 120 4888000', 'info@sayahomes.in', 'https://sayahomes.in', 'Saya Homes HQ, Ghaziabad & Noida', 'Premier NCR luxury developer known for iconic architectural landmarks.', '/uploads/logos/logo-dev-saya.webp', 'active']
  );
  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devNcrWId, org3Id, 'NCR Group', 'Ajay Kumar', '+91 120 6777100', 'contact@ncrmonarch.in', 'https://ncrmonarch.in', 'Plot No GH-02, Sector 1, Greater Noida West', 'Leading real estate developer delivering quality residential and commercial hubs.', '/uploads/logos/logo-dev-ncr.png', 'active']
  );
  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devGulshanWId, org3Id, 'Gulshan Homz', 'Deepak Kapoor', '+91 120 4777500', 'care@gulshangroup.com', 'https://gulshangroup.com', 'Gulshan One29, Sector 129, Noida', 'Pioneers of grand luxury living and bespoke residential communities in Delhi NCR.', '/uploads/logos/logo-dev-gulshan.png', 'active']
  );
  db.run(
    `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [devGodrejWId, org3Id, 'Godrej Properties', 'Mohit Malhotra', '+91 22 61664444', 'sales@godrejproperties.com', 'https://godrejproperties.com', 'Godrej One, Pirojshanagar, Eastern Express Highway, Mumbai & NCR Hub', "India's most trusted developer bringing sustainability and innovation to NCR.", '/uploads/logos/logo-dev-godrej.png', 'active']
  );

  // 4. Projects
  const proj1Id = 'proj-jacob-001';
  const proj2Id = 'proj-cullinan-002';
  const proj3Id = 'proj-max105-003';
  const proj4Id = 'proj-prestige150-004';
  const proj5Id = 'proj-dlf-camellias-005';
  const proj6Id = 'proj-saya-rajnagar-006';
  const proj7Id = 'proj-ncr-monarch-007';
  const proj8Id = 'proj-ncr-studios-008';
  const proj9Id = 'proj-gulshan-hummingbird-009';
  const proj10Id = 'proj-godrej-gbc-010';

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj1Id, org1Id, dev1Id, 'M3M Jacob & Co Residences',
      'Sector 65, Golf Course Extension Road, Gurugram',
      'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon',
      'Ultra-exclusive branded residences crafted in collaboration with world-renowned watchmaker & jeweler Jacob & Co. Features private sky infinity pools and Michelin-grade dining.',
      '/uploads/logos/logo-11f5307a.jpg',
      '1,850 sq. ft.', '2,200 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', '₹4.80 Cr - ₹9.50 Cr',
      'Private Helipad, Infinity Sky Pool, Valet Concierge, Observatory Lounge, Cigar Bar',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj2Id, org1Id, dev1Id, 'M3M The Cullinan',
      'Sector 94, Noida Expressway, Noida',
      'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida',
      'Mixed-use high-street luxury development on the junction of South Delhi and Noida. 5.5-acre central green piazza with private elevators.',
      '/uploads/logos/logo-2c6de208.png',
      '2,450 sq. ft.', '3,100 sq. ft.', '3,600 sq. ft.', '₹5.80 Cr', '₹5.80 Cr - ₹12.00 Cr',
      'Direct South Delhi Connectivity, 100,000 sq ft Clubhouse, 7-tier Security, Temperature Controlled Olympic Pool',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj3Id, org1Id, dev2Id, 'Max Estate 105',
      'Sector 105, Noida Expressway, Noida',
      'https://maps.google.com/?q=Sector+105+Noida+Expressway',
      'Biophilic architectural marvel curated around wellness, nature and pristine air quality filtration for supreme family wellbeing.',
      '/uploads/logos/logo-89943740.jpg',
      '2,100 sq. ft.', '2,600 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', '₹4.20 Cr - ₹7.80 Cr',
      'Forest Walkway, Organic Cafe, IGBC Platinum Pre-certified, Hydrotherapy Spa',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj4Id, org1Id, dev3Id, 'Prestige 150 Sanctuary',
      'Sector 150, Sports City, Noida',
      'https://maps.google.com/?q=Sector+150+Noida+Sports+City',
      'Low-density golf-centric residential paradise surrounded by 42 acres of curated sports amenities and verdant landscapes.',
      '/uploads/logos/logo-a46a11c8.png',
      '2,600 sq. ft.', '3,200 sq. ft.', '3,500 sq. ft.', '₹3.90 Cr', '₹3.90 Cr - ₹6.50 Cr',
      '9-Hole Executive Golf Course, Olympic Gymnastics Arena, Tennis Academy',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj5Id, org1Id, dev4Id, 'DLF The Camellias',
      'Golf Course Road, Sector 42, Gurugram',
      'https://maps.google.com/?q=DLF+The+Camellias+Gurugram',
      'Unrivalled super-luxury residences set amidst sprawling pristine fairways on Golf Course Road with a private club and butler service.',
      '/uploads/logos/logo-cabc6c9d.png',
      '4,500 sq. ft.', '5,800 sq. ft.', '7,400 sq. ft.', '₹35.00 Cr', '₹35.00 Cr - ₹75.00 Cr',
      'Private Helipad, Spa by Clarins, Indoor Heated Pool, Cigar Lounge, Concierge',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj6Id, org1Id, dev5Id, 'Saya - Rajnagar',
      'Rajnagar Extension, Ghaziabad',
      'https://maps.google.com/?q=Saya+Rajnagar+Extension+Ghaziabad',
      'Ultra-luxury residential enclave in the heart of Rajnagar Extension featuring signature clubhouse and green central gardens.',
      '/uploads/logos/logo-proj-saya-rajnagar.webp',
      '1,100 sq. ft.', '1,450 sq. ft.', '1,750 sq. ft.', '₹85 Lakhs', '₹85 Lakhs - ₹1.65 Cr',
      'Grand Clubhouse, Infinity Pool, Sky Deck, Sports Arena, 24/7 Multi-Tier Security',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj7Id, org1Id, dev6Id, 'NCR Monarch',
      'Sector 1, Greater Noida West',
      'https://maps.google.com/?q=NCR+Monarch+Sector+1+Greater+Noida+West',
      'Government SWAMIH-backed luxury residential towers featuring 2 & 3 BHK ready-to-move homes with high-end club amenities.',
      '/uploads/logos/logo-proj-ncr-monarch.png',
      '950 sq. ft.', '1,250 sq. ft.', '1,550 sq. ft.', '₹75 Lakhs', '₹75 Lakhs - ₹1.40 Cr',
      'Clubhouse, Swimming Pool, Gymnasium, Jogging Track, Children Play Area, Landscaped Gardens',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj8Id, org1Id, dev6Id, 'NCR Studios',
      'Sector 1, Greater Noida West',
      'https://maps.google.com/?q=NCR+Monarch+Greater+Noida+West',
      'Modern smart studio suites & serviced residences with high rental yields in Greater Noida West.',
      '/uploads/logos/logo-proj-ncr-studios.png',
      '450 sq. ft.', '650 sq. ft.', '850 sq. ft.', '₹42 Lakhs', '₹42 Lakhs - ₹68 Lakhs',
      'Business Lounge, Concierge, High-Speed Elevators, Cafe, 24/7 Power Backup',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj9Id, org1Id, dev7Id, 'Gulshan - Hummingbird',
      'Madhuban Bapudham, Ghaziabad',
      'https://maps.google.com/?q=Gulshan+Hummingbird+Madhuban+Bapudham+Ghaziabad',
      'Boutique luxury residences featuring private work pods, temperature-controlled pool, and lush themed gardens.',
      '/uploads/logos/logo-proj-hummingbird.png',
      '1,250 sq. ft.', '1,650 sq. ft.', '2,050 sq. ft.', '₹1.25 Cr', '₹1.25 Cr - ₹2.20 Cr',
      'Private Work Pods, Heated Pool, Spa & Wellness, Banquet Hall, Indoor Games, Kids Play Zone',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proj10Id, org1Id, dev8Id, 'Godrej - GBC',
      'DMIC Integrated Industrial Township, Greater Noida',
      'https://maps.google.com/?q=Godrej+Global+Business+City+Greater+Noida',
      'Flagship global integrated township featuring smart high-rise residences along the DMIC economic corridor.',
      '/uploads/logos/logo-proj-godrej-gbc.png',
      '1,050 sq. ft.', '1,450 sq. ft.', '1,850 sq. ft.', '₹1.35 Cr', '₹1.35 Cr - ₹2.65 Cr',
      'Golf-Themed Living, Smart Home Automation, Olympic-Sized Pool, Multipurpose Sports Complex, Grand Club',
      'active'
    ]
  );

  // Projects for Workians Realty (Sajan Patel)
  const projSayaWId = 'proj-saya-rajnagar-org-08a1da1a';
  const projNcrMonarchWId = 'proj-ncr-monarch-org-08a1da1a';
  const projNcrStudiosWId = 'proj-ncr-studios-org-08a1da1a';
  const projGulshanWId = 'proj-gulshan-hummingbird-org-08a1da1a';
  const projGodrejWId = 'proj-godrej-gbc-org-08a1da1a';

  // Genspark projects for Workians
  const projM3mJacobWId = 'proj-m3m-jacob-org-08a1da1a';
  const projM3mElieWId = 'proj-m3m-eliesaab-org-08a1da1a';
  const projM3mLineWId = 'proj-m3m-theline-org-08a1da1a';
  const projM3mTrumpWId = 'proj-m3m-trump-org-08a1da1a';
  const projM3mCullinanWId = 'proj-m3m-cullinan-org-08a1da1a';
  const projMax105WId = 'proj-max105-org-08a1da1a';
  const projGvEkanamWId = 'proj-gv-ekanam-org-08a1da1a';
  const projPrestige150WId = 'proj-prestige-150-org-08a1da1a';

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projM3mJacobWId, org3Id, devM3mWId, 'Jacob&Co',
      'Sector 65, Golf Course Extension Road, Gurugram',
      'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon',
      'Ultra-exclusive branded residences crafted in collaboration with world-renowned watchmaker & jeweler Jacob & Co. Features private sky infinity pools and Michelin-grade dining.',
      '/uploads/logos/logo-11f5307a.jpg',
      '1,850 sq. ft.', '2,200 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', '₹4.80 Cr - ₹9.50 Cr',
      'Private Helipad, Infinity Sky Pool, Valet Concierge, Observatory Lounge, Cigar Bar',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projM3mElieWId, org3Id, devM3mWId, 'Elle Saab',
      'Sector 111, Dwarka Expressway, Gurugram',
      'https://maps.google.com/?q=M3M+Elie+Saab+Sector+111+Dwarka+Expressway+Gurgaon',
      'Haute couture designer branded luxury residences by world-famous Parisian designer Elie Saab on Dwarka Expressway.',
      '/uploads/logos/logo-proj-elie-saab.png',
      '2,200 sq. ft.', '2,750 sq. ft.', '3,100 sq. ft.', '₹5.50 Cr', '₹5.50 Cr - ₹11.00 Cr',
      'Elie Saab Styled Clubhouse, Private Plunge Pools, Haute Living Concierge, Italian Marble Finishes, Spa',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projM3mLineWId, org3Id, devM3mWId, 'The Line',
      'Sector 72, Central Noida',
      'https://maps.google.com/?q=M3M+The+Line+Sector+72+Noida',
      'State-of-the-art commercial high-street retail suites and modern serviced studio residences in prime Sector 72 Noida.',
      '/uploads/logos/logo-proj-the-line.jpg',
      '550 sq. ft.', '700 sq. ft.', '850 sq. ft.', '₹95 Lakhs', '₹95 Lakhs - ₹1.80 Cr',
      'Double Height High-Street Retail, Sky Club, Rooftop Infinity Pool, 24/7 Power Backup, Business Lounge',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projM3mTrumpWId, org3Id, devM3mWId, 'Trump',
      'Sector 65, Golf Course Extension Road, Gurugram',
      'https://maps.google.com/?q=Trump+Towers+Sector+65+Gurgaon',
      'Iconic global super-luxury twin glass towers defining the pinnacle of elite luxury living in Gurugram.',
      '/uploads/logos/logo-proj-trump-tower.svg',
      '3,200 sq. ft.', '3,900 sq. ft.', '4,500 sq. ft.', '₹8.50 Cr', '₹8.50 Cr - ₹16.00 Cr',
      '24/7 White Glove Valet & Concierge, Temperature-Controlled Glass Pool, Trump Signature Lounge, Private Elevators',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projM3mCullinanWId, org3Id, devM3mWId, 'Cullinan',
      'Sector 94, Noida Expressway, Noida',
      'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida',
      'Mixed-use high-street luxury development on the junction of South Delhi and Noida. 5.5-acre central green piazza with private elevators.',
      '/uploads/logos/logo-2c6de208.png',
      '2,450 sq. ft.', '3,100 sq. ft.', '3,600 sq. ft.', '₹5.80 Cr', '₹5.80 Cr - ₹12.00 Cr',
      'Direct South Delhi Connectivity, 100,000 sq ft Clubhouse, 7-tier Security, Temperature Controlled Olympic Pool',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projMax105WId, org3Id, devMaxWId, 'Max 105 Estate',
      'Sector 105, Noida Expressway, Noida',
      'https://maps.google.com/?q=Sector+105+Noida+Expressway',
      'Biophilic architectural marvel curated around wellness, nature and pristine air quality filtration for supreme family wellbeing.',
      '/uploads/logos/logo-89943740.jpg',
      '2,100 sq. ft.', '2,600 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', '₹4.20 Cr - ₹7.80 Cr',
      'Forest Walkway, Organic Cafe, IGBC Platinum Pre-certified, Hydrotherapy Spa',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projGvEkanamWId, org3Id, devGvWId, 'Ekanam',
      'Sector 107, Noida Expressway, Noida',
      'https://maps.google.com/?q=Great+Value+Ekanam+Sector+107+Noida',
      'Ultra-luxury low-density residential sanctuary in Sector 107 Noida with expansive green golf views and 3/4 BHK grand suites.',
      '/uploads/logos/logo-proj-ekanam.png',
      '1,650 sq. ft.', '2,050 sq. ft.', '2,350 sq. ft.', '₹2.85 Cr', '₹2.85 Cr - ₹4.50 Cr',
      'Sky Lounge, Temperature Controlled Swimming Pool, Aerobics & Yoga Studio, Grand Club, 3-Tier Security',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projPrestige150WId, org3Id, devPrestigeWId, 'Prestige 150',
      'Sector 150, Sports City, Noida',
      'https://maps.google.com/?q=Sector+150+Noida+Sports+City',
      'Low-density golf-centric residential paradise surrounded by 42 acres of curated sports amenities and verdant landscapes.',
      '/uploads/logos/logo-a46a11c8.png',
      '2,600 sq. ft.', '3,200 sq. ft.', '3,500 sq. ft.', '₹3.90 Cr', '₹3.90 Cr - ₹6.50 Cr',
      '9-Hole Executive Golf Course, Olympic Gymnastics Arena, Tennis Academy',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projSayaWId, org3Id, devSayaWId, 'Saya - Rajnagar',
      'Rajnagar Extension, Ghaziabad',
      'https://maps.google.com/?q=Saya+Rajnagar+Extension+Ghaziabad',
      'Ultra-luxury residential enclave in the heart of Rajnagar Extension featuring signature clubhouse and green central gardens.',
      '/uploads/logos/logo-proj-saya-rajnagar.webp',
      '1,100 sq. ft.', '1,450 sq. ft.', '1,750 sq. ft.', '₹85 Lakhs', '₹85 Lakhs - ₹1.65 Cr',
      'Grand Clubhouse, Infinity Pool, Sky Deck, Sports Arena, 24/7 Multi-Tier Security',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projNcrMonarchWId, org3Id, devNcrWId, 'NCR Monarch',
      'Sector 1, Greater Noida West',
      'https://maps.google.com/?q=NCR+Monarch+Sector+1+Greater+Noida+West',
      'Government SWAMIH-backed luxury residential towers featuring 2 & 3 BHK ready-to-move homes with high-end club amenities.',
      '/uploads/logos/logo-proj-ncr-monarch.png',
      '950 sq. ft.', '1,250 sq. ft.', '1,550 sq. ft.', '₹75 Lakhs', '₹75 Lakhs - ₹1.40 Cr',
      'Clubhouse, Swimming Pool, Gymnasium, Jogging Track, Children Play Area, Landscaped Gardens',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projNcrStudiosWId, org3Id, devNcrWId, 'NCR Studios',
      'Sector 1, Greater Noida West',
      'https://maps.google.com/?q=NCR+Monarch+Greater+Noida+West',
      'Modern smart studio suites & serviced residences with high rental yields in Greater Noida West.',
      '/uploads/logos/logo-proj-ncr-studios.png',
      '450 sq. ft.', '650 sq. ft.', '850 sq. ft.', '₹42 Lakhs', '₹42 Lakhs - ₹68 Lakhs',
      'Business Lounge, Concierge, High-Speed Elevators, Cafe, 24/7 Power Backup',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projGulshanWId, org3Id, devGulshanWId, 'Gulshan - Hummingbird',
      'Madhuban Bapudham, Ghaziabad',
      'https://maps.google.com/?q=Gulshan+Hummingbird+Madhuban+Bapudham+Ghaziabad',
      'Boutique luxury residences featuring private work pods, temperature-controlled pool, and lush themed gardens.',
      '/uploads/logos/logo-proj-gulshan-hummingbird.png',
      '1,250 sq. ft.', '1,650 sq. ft.', '2,050 sq. ft.', '₹1.25 Cr', '₹1.25 Cr - ₹2.20 Cr',
      'Private Work Pods, Heated Pool, Spa & Wellness, Banquet Hall, Indoor Games, Kids Play Zone',
      'active'
    ]
  );

  db.run(
    `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projGodrejWId, org3Id, devGodrejWId, 'Godrej - GBC',
      'DMIC Integrated Industrial Township, Greater Noida',
      'https://maps.google.com/?q=Godrej+Global+Business+City+Greater+Noida',
      'Flagship global integrated township featuring smart high-rise residences along the DMIC economic corridor.',
      '/uploads/logos/logo-proj-godrej-gbc.png',
      '1,050 sq. ft.', '1,450 sq. ft.', '1,850 sq. ft.', '₹1.35 Cr', '₹1.35 Cr - ₹2.65 Cr',
      'Golf-Themed Living, Smart Home Automation, Olympic-Sized Pool, Multipurpose Sports Complex, Grand Club',
      'active'
    ]
  );

  // Workians Project Configurations
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w1', projSayaWId, '2 BHK Comfort Home', '850 sq. ft.', '1,100 sq. ft.', '₹85 Lakhs', 2, 2]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w2', projSayaWId, '3 BHK Luxury Residence', '1,200 sq. ft.', '1,450 sq. ft.', '₹1.25 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w3', projNcrMonarchWId, '2 BHK Premium Apartment', '750 sq. ft.', '950 sq. ft.', '₹75 Lakhs', 2, 2]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w4', projNcrMonarchWId, '3 BHK Executive Apartment', '950 sq. ft.', '1,250 sq. ft.', '₹1.10 Cr', 3, 2]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w5', projNcrStudiosWId, 'Studio Suite', '350 sq. ft.', '450 sq. ft.', '₹42 Lakhs', 1, 1]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w6', projNcrStudiosWId, '1 BHK Serviced Apartment', '550 sq. ft.', '650 sq. ft.', '₹55 Lakhs', 1, 1]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w7', projGulshanWId, '3 BHK Boutique Residence', '1,100 sq. ft.', '1,450 sq. ft.', '₹1.25 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w8', projGulshanWId, '4 BHK Luxury Penthouse', '1,650 sq. ft.', '2,050 sq. ft.', '₹2.20 Cr', 4, 4]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w9', projGodrejWId, '3 BHK Golf View Suite', '1,050 sq. ft.', '1,450 sq. ft.', '₹1.35 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w10', projGodrejWId, '4 BHK Smart High-Rise', '1,550 sq. ft.', '1,850 sq. ft.', '₹2.65 Cr', 4, 4]
  );

  // Genspark Workians Project Configurations
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w11', projM3mJacobWId, '3 BHK Premium Sky Residence', '1,850 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w12', projM3mJacobWId, '4 BHK Royal Penthouse', '3,100 sq. ft.', '3,850 sq. ft.', '₹7.90 Cr', 4, 5]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w13', projM3mElieWId, '3.5 BHK Designer Residence', '2,200 sq. ft.', '2,750 sq. ft.', '₹5.50 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w14', projM3mElieWId, '4.5 BHK Luxury Penthouse', '3,100 sq. ft.', '3,900 sq. ft.', '₹8.50 Cr', 4, 5]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w15', projM3mLineWId, 'Smart Studio Suite', '550 sq. ft.', '700 sq. ft.', '₹95 Lakhs', 1, 1]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w16', projM3mLineWId, '1 BHK Executive Suite', '700 sq. ft.', '850 sq. ft.', '₹1.45 Cr', 1, 1]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w17', projM3mTrumpWId, '3 BHK Ultra Luxury Residence', '3,200 sq. ft.', '3,900 sq. ft.', '₹8.50 Cr', 3, 4]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w18', projM3mTrumpWId, '4 BHK Iconic Sky Villa', '4,500 sq. ft.', '5,600 sq. ft.', '₹14.50 Cr', 4, 5]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w19', projM3mCullinanWId, '3 BHK Luxury View Suite', '2,450 sq. ft.', '3,100 sq. ft.', '₹5.80 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w20', projM3mCullinanWId, '4 BHK Grand View Suite', '2,850 sq. ft.', '3,600 sq. ft.', '₹7.50 Cr', 4, 4]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w21', projMax105WId, '3 BHK Wellness Residence', '2,100 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w22', projMax105WId, '4 BHK Wellness Suite', '2,600 sq. ft.', '3,450 sq. ft.', '₹6.10 Cr', 4, 4]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w23', projGvEkanamWId, '3 BHK + Servant Luxury Suite', '1,650 sq. ft.', '2,350 sq. ft.', '₹2.85 Cr', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w24', projGvEkanamWId, '4 BHK + Servant Grand Sky Villa', '2,150 sq. ft.', '3,100 sq. ft.', '₹4.10 Cr', 4, 4]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w25', projPrestige150WId, '3 Bed Ultima', '3 Bed + 3 Toilets + Home Office', '3 Bed + 3T + Home Office · ~2,246–2,268 sq. ft.', '', 3, 3]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w26', projPrestige150WId, '4 Bed Magnus', '4 Bed + 4 Toilets + Home Office', '4 Bed + 4T + Home Office · ~2,526–2,851 sq. ft.', '', 4, 4]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w27', projPrestige150WId, 'Ground-floor Duplex', '4 Bed Luxury Duplex (Fern & Gulmohar)', 'Limited Duplex · ~4,187–4,591 sq. ft.', '', 4, 5]
  );
  db.run(
    `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cfg-w28', projPrestige150WId, 'Sky Mansion', 'Top-floor Sky Mansion Penthouse', 'Uppermost Floors · ~5,591–6,091 sq. ft.', '', 5, 5]
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

  // 15. Seed Sajan Patel Projects (Workians Realty)
  try {
    const { seedProjectsForSajanPatel } = require('../../scripts/seed_sajanpatel_projects');
    seedProjectsForSajanPatel();
  } catch (err) {
    console.warn('Seed Workians projects notice:', err.message);
  }

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
