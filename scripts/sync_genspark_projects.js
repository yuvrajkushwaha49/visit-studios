const db = require('../server/db');

function syncGensparkAndProjects() {
  console.log('--- Syncing Genspark Projects & Developers for Sajan Patel ---');

  // Identify Sajan Patel's org
  const sajanUser = db.get("SELECT * FROM users WHERE email = 'sajanpatel@workians.com'");
  const orgId = sajanUser ? sajanUser.organization_id : 'org-08a1da1a';
  console.log(`Target Organization ID: ${orgId}`);

  // 1. Developers
  const developers = [
    // --- From Genspark ---
    {
      id: `dev-m3m-${orgId}`,
      organization_id: orgId,
      name: 'M3M',
      contact_name: 'Nitin Goel',
      contact_phone: '+91 124 4777000',
      contact_email: 'crm@m3mindia.com',
      website: 'https://m3mindia.com',
      address: 'M3M Cosmopolitan, Sector 66, Gurugram',
      description: 'Leading visionary developer creating world-class residential masterpieces.',
      company_logo: '/uploads/logos/logo-39f99d0e.png',
      status: 'active'
    },
    {
      id: `dev-max-${orgId}`,
      organization_id: orgId,
      name: 'Max Estate',
      contact_name: 'Saurabh Juneja',
      contact_phone: '+91 120 4000100',
      contact_email: 'sales@maxestates.in',
      website: 'https://maxestates.in',
      address: 'Max Towers, Sector 16B, Noida',
      description: 'Pioneering wellness-integrated luxury living spaces.',
      company_logo: '/uploads/logos/logo-9f7fe60c.jpg',
      status: 'active'
    },
    {
      id: `dev-greatvalue-${orgId}`,
      organization_id: orgId,
      name: 'Great Value',
      contact_name: 'Manoj Goyal',
      contact_phone: '+91 120 4000800',
      contact_email: 'sales@greatvalueindia.com',
      website: 'https://greatvaluerealty.com',
      address: 'Great Value Tower, Sector 18 / Sector 107, Noida',
      description: 'Renowned NCR real estate developer delivering premium, value-driven residential landmarks.',
      company_logo: '/uploads/logos/logo-dev-greatvalue.png',
      status: 'active'
    },
    {
      id: `dev-prestige-${orgId}`,
      organization_id: orgId,
      name: 'Prestige',
      contact_name: 'Ramesh Rao',
      contact_phone: '+91 80 25591080',
      contact_email: 'enquiry@prestigeconstructions.com',
      website: 'https://prestigeconstructions.com',
      address: 'The Falcon House, Bangalore & NCR Hub',
      description: 'Synonymous with innovation and luxury for over 35 years.',
      company_logo: '/uploads/logos/logo-4bb771f4.png',
      status: 'active'
    },
    // --- Existing NCR Developers ---
    {
      id: `dev-saya-${orgId}`,
      organization_id: orgId,
      name: 'Saya Group',
      contact_name: 'Vikas Sharma',
      contact_phone: '+91 120 4888000',
      contact_email: 'info@sayahomes.in',
      website: 'https://sayahomes.in',
      address: 'Saya Homes HQ, Ghaziabad & Noida',
      description: 'Premier NCR luxury developer known for iconic architectural landmarks.',
      company_logo: '/uploads/logos/logo-dev-saya.webp',
      status: 'active'
    },
    {
      id: `dev-ncr-${orgId}`,
      organization_id: orgId,
      name: 'NCR Group',
      contact_name: 'Ajay Kumar',
      contact_phone: '+91 120 6777100',
      contact_email: 'contact@ncrmonarch.in',
      website: 'https://ncrmonarch.in',
      address: 'Plot No GH-02, Sector 1, Greater Noida West',
      description: 'Leading real estate developer delivering quality residential and commercial hubs.',
      company_logo: '/uploads/logos/logo-dev-ncr.png',
      status: 'active'
    },
    {
      id: `dev-gulshan-${orgId}`,
      organization_id: orgId,
      name: 'Gulshan Homz',
      contact_name: 'Deepak Kapoor',
      contact_phone: '+91 120 4777500',
      contact_email: 'care@gulshangroup.com',
      website: 'https://gulshangroup.com',
      address: 'Gulshan One29, Sector 129, Noida',
      description: 'Pioneers of grand luxury living and bespoke residential communities in Delhi NCR.',
      company_logo: '/uploads/logos/logo-dev-gulshan.png',
      status: 'active'
    },
    {
      id: `dev-godrej-${orgId}`,
      organization_id: orgId,
      name: 'Godrej Properties',
      contact_name: 'Mohit Malhotra',
      contact_phone: '+91 22 61664444',
      contact_email: 'sales@godrejproperties.com',
      website: 'https://godrejproperties.com',
      address: 'Godrej One, Pirojshanagar, Eastern Express Highway, Mumbai & NCR Hub',
      description: "India's most trusted developer bringing sustainability and innovation to NCR.",
      company_logo: '/uploads/logos/logo-dev-godrej.png',
      status: 'active'
    }
  ];

  for (const dev of developers) {
    const existing = db.get('SELECT id FROM developers WHERE organization_id = ? AND name = ?', [dev.organization_id, dev.name]);
    if (existing) {
      db.run(
        `UPDATE developers SET contact_name=?, contact_phone=?, contact_email=?, website=?, address=?, description=?, company_logo=?, status=? WHERE id=?`,
        [dev.contact_name, dev.contact_phone, dev.contact_email, dev.website, dev.address, dev.description, dev.company_logo, dev.status, existing.id]
      );
      console.log(`Updated developer: ${dev.name} (${existing.id})`);
    } else {
      db.run(
        `INSERT INTO developers (id, organization_id, name, contact_name, contact_phone, contact_email, website, address, description, company_logo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dev.id, dev.organization_id, dev.name, dev.contact_name, dev.contact_phone, dev.contact_email, dev.website, dev.address, dev.description, dev.company_logo, dev.status]
      );
      console.log(`Inserted developer: ${dev.name} (${dev.id})`);
    }
  }

  // Helper map for developer ids
  const devMap = {};
  const currentDevs = db.all('SELECT id, name FROM developers WHERE organization_id = ?', [orgId]);
  for (const d of currentDevs) devMap[d.name] = d.id;

  // 2. Projects
  const projects = [
    // --- M3M Projects from Genspark ---
    {
      id: `proj-m3m-jacob-${orgId}`,
      developer_id: devMap['M3M'],
      name: 'Jacob&Co',
      location: 'Sector 65, Golf Course Extension Road, Gurugram',
      google_maps_url: 'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon',
      description: 'Ultra-exclusive branded residences crafted in collaboration with world-renowned watchmaker & jeweler Jacob & Co. Features private sky infinity pools and Michelin-grade dining.',
      project_logo: '/uploads/logos/logo-11f5307a.jpg',
      carpet_area: '1,850 sq. ft.',
      built_up_area: '2,200 sq. ft.',
      super_built_up_area: '2,400 sq. ft.',
      starting_price: '₹4.80 Cr',
      price_range: '₹4.80 Cr - ₹9.50 Cr',
      amenities: 'Private Helipad, Infinity Sky Pool, Valet Concierge, Observatory Lounge, Cigar Bar',
      status: 'active',
      configurations: [
        { name: '3 BHK Premium Sky Residence', carpet: '1,850 sq. ft.', super: '2,400 sq. ft.', price: '₹4.80 Cr', beds: 3, baths: 3 },
        { name: '4 BHK Royal Penthouse', carpet: '3,100 sq. ft.', super: '3,850 sq. ft.', price: '₹7.90 Cr', beds: 4, baths: 5 }
      ]
    },
    {
      id: `proj-m3m-eliesaab-${orgId}`,
      developer_id: devMap['M3M'],
      name: 'Elle Saab',
      location: 'Sector 111, Dwarka Expressway, Gurugram',
      google_maps_url: 'https://maps.google.com/?q=M3M+Elie+Saab+Sector+111+Dwarka+Expressway+Gurgaon',
      description: 'Haute couture designer branded luxury residences by world-famous Parisian designer Elie Saab on Dwarka Expressway.',
      project_logo: '/uploads/logos/logo-proj-elie-saab.png',
      carpet_area: '2,200 sq. ft.',
      built_up_area: '2,750 sq. ft.',
      super_built_up_area: '3,100 sq. ft.',
      starting_price: '₹5.50 Cr',
      price_range: '₹5.50 Cr - ₹11.00 Cr',
      amenities: 'Elie Saab Styled Clubhouse, Private Plunge Pools, Haute Living Concierge, Italian Marble Finishes, Spa',
      status: 'active',
      configurations: [
        { name: '3.5 BHK Designer Residence', carpet: '2,200 sq. ft.', super: '2,750 sq. ft.', price: '₹5.50 Cr', beds: 3, baths: 3 },
        { name: '4.5 BHK Luxury Penthouse', carpet: '3,100 sq. ft.', super: '3,900 sq. ft.', price: '₹8.50 Cr', beds: 4, baths: 5 }
      ]
    },
    {
      id: `proj-m3m-theline-${orgId}`,
      developer_id: devMap['M3M'],
      name: 'The Line',
      location: 'Sector 72, Central Noida',
      google_maps_url: 'https://maps.google.com/?q=M3M+The+Line+Sector+72+Noida',
      description: 'State-of-the-art commercial high-street retail suites and modern serviced studio residences in prime Sector 72 Noida.',
      project_logo: '/uploads/logos/logo-proj-the-line.jpg',
      carpet_area: '550 sq. ft.',
      built_up_area: '700 sq. ft.',
      super_built_up_area: '850 sq. ft.',
      starting_price: '₹95 Lakhs',
      price_range: '₹95 Lakhs - ₹1.80 Cr',
      amenities: 'Double Height High-Street Retail, Sky Club, Rooftop Infinity Pool, 24/7 Power Backup, Business Lounge',
      status: 'active',
      configurations: [
        { name: 'Smart Studio Suite', carpet: '550 sq. ft.', super: '700 sq. ft.', price: '₹95 Lakhs', beds: 1, baths: 1 },
        { name: '1 BHK Executive Suite', carpet: '700 sq. ft.', super: '850 sq. ft.', price: '₹1.45 Cr', beds: 1, baths: 1 }
      ]
    },
    {
      id: `proj-m3m-trump-${orgId}`,
      developer_id: devMap['M3M'],
      name: 'Trump',
      location: 'Sector 65, Golf Course Extension Road, Gurugram',
      google_maps_url: 'https://maps.google.com/?q=Trump+Towers+Sector+65+Gurgaon',
      description: 'Iconic global super-luxury twin glass towers defining the pinnacle of elite luxury living in Gurugram.',
      project_logo: '/uploads/logos/logo-proj-trump-tower.svg',
      carpet_area: '3,200 sq. ft.',
      built_up_area: '3,900 sq. ft.',
      super_built_up_area: '4,500 sq. ft.',
      starting_price: '₹8.50 Cr',
      price_range: '₹8.50 Cr - ₹16.00 Cr',
      amenities: '24/7 White Glove Valet & Concierge, Temperature-Controlled Glass Pool, Trump Signature Lounge, Private Elevators',
      status: 'active',
      configurations: [
        { name: '3 BHK Ultra Luxury Residence', carpet: '3,200 sq. ft.', super: '3,900 sq. ft.', price: '₹8.50 Cr', beds: 3, baths: 4 },
        { name: '4 BHK Iconic Sky Villa', carpet: '4,500 sq. ft.', super: '5,600 sq. ft.', price: '₹14.50 Cr', beds: 4, baths: 5 }
      ]
    },
    {
      id: `proj-m3m-cullinan-${orgId}`,
      developer_id: devMap['M3M'],
      name: 'Cullinan',
      location: 'Sector 94, Noida Expressway, Noida',
      google_maps_url: 'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida',
      description: 'Mixed-use high-street luxury development on the junction of South Delhi and Noida. 5.5-acre central green piazza with private elevators.',
      project_logo: '/uploads/logos/logo-2c6de208.png',
      carpet_area: '2,450 sq. ft.',
      built_up_area: '3,100 sq. ft.',
      super_built_up_area: '3,600 sq. ft.',
      starting_price: '₹5.80 Cr',
      price_range: '₹5.80 Cr - ₹12.00 Cr',
      amenities: 'Direct South Delhi Connectivity, 100,000 sq ft Clubhouse, 7-tier Security, Temperature Controlled Olympic Pool',
      status: 'active',
      configurations: [
        { name: '3 BHK Luxury View Suite', carpet: '2,450 sq. ft.', super: '3,100 sq. ft.', price: '₹5.80 Cr', beds: 3, baths: 3 },
        { name: '4 BHK Grand View Suite', carpet: '2,850 sq. ft.', super: '3,600 sq. ft.', price: '₹7.50 Cr', beds: 4, baths: 4 }
      ]
    },

    // --- Max Estate Project from Genspark ---
    {
      id: `proj-max105-${orgId}`,
      developer_id: devMap['Max Estate'],
      name: 'Max 105 Estate',
      location: 'Sector 105, Noida Expressway, Noida',
      google_maps_url: 'https://maps.google.com/?q=Sector+105+Noida+Expressway',
      description: 'Biophilic architectural marvel curated around wellness, nature and pristine air quality filtration for supreme family wellbeing.',
      project_logo: '/uploads/logos/logo-89943740.jpg',
      carpet_area: '2,100 sq. ft.',
      built_up_area: '2,600 sq. ft.',
      super_built_up_area: '2,850 sq. ft.',
      starting_price: '₹4.20 Cr',
      price_range: '₹4.20 Cr - ₹7.80 Cr',
      amenities: 'Forest Walkway, Organic Cafe, IGBC Platinum Pre-certified, Hydrotherapy Spa',
      status: 'active',
      configurations: [
        { name: '3 BHK Wellness Residence', carpet: '2,100 sq. ft.', super: '2,850 sq. ft.', price: '₹4.20 Cr', beds: 3, baths: 3 },
        { name: '4 BHK Wellness Suite', carpet: '2,600 sq. ft.', super: '3,450 sq. ft.', price: '₹6.10 Cr', beds: 4, baths: 4 }
      ]
    },

    // --- Great Value Project from Genspark ---
    {
      id: `proj-gv-ekanam-${orgId}`,
      developer_id: devMap['Great Value'],
      name: 'Ekanam',
      location: 'Sector 107, Noida Expressway, Noida',
      google_maps_url: 'https://maps.google.com/?q=Great+Value+Ekanam+Sector+107+Noida',
      description: 'Ultra-luxury low-density residential sanctuary in Sector 107 Noida with expansive green golf views and 3/4 BHK grand suites.',
      project_logo: '/uploads/logos/logo-proj-ekanam.png',
      carpet_area: '1,650 sq. ft.',
      built_up_area: '2,050 sq. ft.',
      super_built_up_area: '2,350 sq. ft.',
      starting_price: '₹2.85 Cr',
      price_range: '₹2.85 Cr - ₹4.50 Cr',
      amenities: 'Sky Lounge, Temperature Controlled Swimming Pool, Aerobics & Yoga Studio, Grand Club, 3-Tier Security',
      status: 'active',
      configurations: [
        { name: '3 BHK + Servant Luxury Suite', carpet: '1,650 sq. ft.', super: '2,350 sq. ft.', price: '₹2.85 Cr', beds: 3, baths: 3 },
        { name: '4 BHK + Servant Grand Sky Villa', carpet: '2,150 sq. ft.', super: '3,100 sq. ft.', price: '₹4.10 Cr', beds: 4, baths: 4 }
      ]
    },

    // --- Prestige Project from Genspark ---
    {
      id: `proj-prestige-150-${orgId}`,
      developer_id: devMap['Prestige'],
      name: 'Prestige 150',
      location: 'Sector 150, Sports City, Noida',
      google_maps_url: 'https://maps.google.com/?q=Sector+150+Noida+Sports+City',
      description: 'Low-density golf-centric residential paradise surrounded by 42 acres of curated sports amenities and verdant landscapes.',
      project_logo: '/uploads/logos/logo-a46a11c8.png',
      carpet_area: '2,600 sq. ft.',
      built_up_area: '3,200 sq. ft.',
      super_built_up_area: '3,500 sq. ft.',
      starting_price: '₹3.90 Cr',
      price_range: '₹3.90 Cr - ₹6.50 Cr',
      amenities: '9-Hole Executive Golf Course, Olympic Gymnastics Arena, Tennis Academy',
      status: 'active',
      configurations: [
        { name: '3 BHK Luxury Sports Residence', carpet: '2,200 sq. ft.', super: '2,800 sq. ft.', price: '₹3.90 Cr', beds: 3, baths: 3 },
        { name: '4 BHK Grand Fairway Suite', carpet: '2,600 sq. ft.', super: '3,500 sq. ft.', price: '₹5.20 Cr', beds: 4, baths: 4 }
      ]
    },

    // --- Existing Saya / NCR / Gulshan / Godrej Projects ---
    {
      id: `proj-saya-rajnagar-${orgId}`,
      developer_id: devMap['Saya Group'],
      name: 'Saya - Rajnagar',
      location: 'Rajnagar Extension, Ghaziabad',
      google_maps_url: 'https://maps.google.com/?q=Saya+Rajnagar+Extension+Ghaziabad',
      description: 'Ultra-luxury residential enclave in the heart of Rajnagar Extension featuring signature clubhouse and green central gardens.',
      project_logo: '/uploads/logos/logo-proj-saya-rajnagar.webp',
      carpet_area: '1,100 sq. ft.',
      built_up_area: '1,450 sq. ft.',
      super_built_up_area: '1,750 sq. ft.',
      starting_price: '₹85 Lakhs',
      price_range: '₹85 Lakhs - ₹1.65 Cr',
      amenities: 'Grand Clubhouse, Infinity Pool, Sky Deck, Sports Arena, 24/7 Multi-Tier Security',
      status: 'active',
      configurations: [
        { name: '2 BHK Comfort Home', carpet: '850 sq. ft.', super: '1,100 sq. ft.', price: '₹85 Lakhs', beds: 2, baths: 2 },
        { name: '3 BHK Luxury Residence', carpet: '1,200 sq. ft.', super: '1,450 sq. ft.', price: '₹1.25 Cr', beds: 3, baths: 3 },
        { name: '4 BHK Grand Suite', carpet: '1,450 sq. ft.', super: '1,750 sq. ft.', price: '₹1.65 Cr', beds: 4, baths: 4 }
      ]
    },
    {
      id: `proj-ncr-monarch-${orgId}`,
      developer_id: devMap['NCR Group'],
      name: 'NCR Monarch',
      location: 'Sector 1, Greater Noida West',
      google_maps_url: 'https://maps.google.com/?q=NCR+Monarch+Sector+1+Greater+Noida+West',
      description: 'Government SWAMIH-backed luxury residential towers featuring 2 & 3 BHK ready-to-move homes with high-end club amenities.',
      project_logo: '/uploads/logos/logo-proj-ncr-monarch.png',
      carpet_area: '950 sq. ft.',
      built_up_area: '1,250 sq. ft.',
      super_built_up_area: '1,550 sq. ft.',
      starting_price: '₹75 Lakhs',
      price_range: '₹75 Lakhs - ₹1.40 Cr',
      amenities: 'Clubhouse, Swimming Pool, Gymnasium, Jogging Track, Children Play Area, Landscaped Gardens',
      status: 'active',
      configurations: [
        { name: '2 BHK Premium Apartment', carpet: '750 sq. ft.', super: '950 sq. ft.', price: '₹75 Lakhs', beds: 2, baths: 2 },
        { name: '3 BHK Executive Apartment', carpet: '950 sq. ft.', super: '1,250 sq. ft.', price: '₹1.10 Cr', beds: 3, baths: 2 },
        { name: '3 BHK + Servant Suite', carpet: '1,250 sq. ft.', super: '1,550 sq. ft.', price: '₹1.40 Cr', beds: 3, baths: 3 }
      ]
    },
    {
      id: `proj-ncr-studios-${orgId}`,
      developer_id: devMap['NCR Group'],
      name: 'NCR Studios',
      location: 'Sector 1, Greater Noida West',
      google_maps_url: 'https://maps.google.com/?q=NCR+Monarch+Greater+Noida+West',
      description: 'Modern smart studio suites & serviced residences with high rental yields in Greater Noida West.',
      project_logo: '/uploads/logos/logo-proj-ncr-studios.png',
      carpet_area: '450 sq. ft.',
      built_up_area: '650 sq. ft.',
      super_built_up_area: '850 sq. ft.',
      starting_price: '₹42 Lakhs',
      price_range: '₹42 Lakhs - ₹68 Lakhs',
      amenities: 'Business Lounge, Concierge, High-Speed Elevators, Cafe, 24/7 Power Backup',
      status: 'active',
      configurations: [
        { name: 'Studio Suite', carpet: '350 sq. ft.', super: '450 sq. ft.', price: '₹42 Lakhs', beds: 1, baths: 1 },
        { name: '1 BHK Serviced Apartment', carpet: '550 sq. ft.', super: '650 sq. ft.', price: '₹55 Lakhs', beds: 1, baths: 1 },
        { name: '1 BHK Luxury Executive Suite', carpet: '650 sq. ft.', super: '850 sq. ft.', price: '₹68 Lakhs', beds: 1, baths: 1 }
      ]
    },
    {
      id: `proj-gulshan-hummingbird-${orgId}`,
      developer_id: devMap['Gulshan Homz'],
      name: 'Gulshan - Hummingbird',
      location: 'Madhuban Bapudham, Ghaziabad',
      google_maps_url: 'https://maps.google.com/?q=Gulshan+Hummingbird+Madhuban+Bapudham+Ghaziabad',
      description: 'Boutique luxury residences featuring private work pods, temperature-controlled pool, and lush themed gardens.',
      project_logo: '/uploads/logos/logo-proj-gulshan-hummingbird.png',
      carpet_area: '1,250 sq. ft.',
      built_up_area: '1,650 sq. ft.',
      super_built_up_area: '2,050 sq. ft.',
      starting_price: '₹1.25 Cr',
      price_range: '₹1.25 Cr - ₹2.20 Cr',
      amenities: 'Private Work Pods, Heated Pool, Spa & Wellness, Banquet Hall, Indoor Games, Kids Play Zone',
      status: 'active',
      configurations: [
        { name: '3 BHK Boutique Residence', carpet: '1,100 sq. ft.', super: '1,450 sq. ft.', price: '₹1.25 Cr', beds: 3, baths: 3 },
        { name: '3 BHK + Lounge', carpet: '1,250 sq. ft.', super: '1,650 sq. ft.', price: '₹1.65 Cr', beds: 3, baths: 3 },
        { name: '4 BHK Luxury Penthouse', carpet: '1,650 sq. ft.', super: '2,050 sq. ft.', price: '₹2.20 Cr', beds: 4, baths: 4 }
      ]
    },
    {
      id: `proj-godrej-gbc-${orgId}`,
      developer_id: devMap['Godrej Properties'],
      name: 'Godrej - GBC',
      location: 'DMIC Integrated Industrial Township, Greater Noida',
      google_maps_url: 'https://maps.google.com/?q=Godrej+Global+Business+City+Greater+Noida',
      description: 'Flagship global integrated township featuring smart high-rise residences along the DMIC economic corridor.',
      project_logo: '/uploads/logos/logo-proj-godrej-gbc.png',
      carpet_area: '1,050 sq. ft.',
      built_up_area: '1,450 sq. ft.',
      super_built_up_area: '1,850 sq. ft.',
      starting_price: '₹1.35 Cr',
      price_range: '₹1.35 Cr - ₹2.65 Cr',
      amenities: 'Golf-Themed Living, Smart Home Automation, Olympic-Sized Pool, Multipurpose Sports Complex, Grand Club',
      status: 'active',
      configurations: [
        { name: '3 BHK Golf View Suite', carpet: '1,050 sq. ft.', super: '1,450 sq. ft.', price: '₹1.35 Cr', beds: 3, baths: 3 },
        { name: '3 BHK + Utility Grand', carpet: '1,300 sq. ft.', super: '1,650 sq. ft.', price: '₹1.85 Cr', beds: 3, baths: 3 },
        { name: '4 BHK Smart High-Rise', carpet: '1,550 sq. ft.', super: '1,850 sq. ft.', price: '₹2.65 Cr', beds: 4, baths: 4 }
      ]
    }
  ];

  for (const proj of projects) {
    if (!proj.developer_id) {
      console.warn(`Developer not found for project: ${proj.name}`);
      continue;
    }
    const existing = db.get('SELECT id FROM projects WHERE organization_id = ? AND name = ?', [orgId, proj.name]);
    let projectId = proj.id;
    if (existing) {
      projectId = existing.id;
      db.run(
        `UPDATE projects SET developer_id=?, location=?, google_maps_url=?, description=?, project_logo=?, carpet_area=?, built_up_area=?, super_built_up_area=?, starting_price=?, price_range=?, amenities=?, status=? WHERE id=?`,
        [proj.developer_id, proj.location, proj.google_maps_url, proj.description, proj.project_logo, proj.carpet_area, proj.built_up_area, proj.super_built_up_area, proj.starting_price, proj.price_range, proj.amenities, proj.status, projectId]
      );
      console.log(`Updated project: ${proj.name} (${projectId})`);
    } else {
      db.run(
        `INSERT INTO projects (id, organization_id, developer_id, name, location, google_maps_url, description, project_logo, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [proj.id, orgId, proj.developer_id, proj.name, proj.location, proj.google_maps_url, proj.description, proj.project_logo, proj.carpet_area, proj.built_up_area, proj.super_built_up_area, proj.starting_price, proj.price_range, proj.amenities, proj.status]
      );
      console.log(`Inserted project: ${proj.name} (${proj.id})`);
    }

    // Configurations
    if (proj.configurations && proj.configurations.length > 0) {
      db.run('DELETE FROM project_configurations WHERE project_id = ?', [projectId]);
      let cfgIdx = 1;
      for (const cfg of proj.configurations) {
        const cfgId = `cfg-${projectId}-${cfgIdx++}`;
        db.run(
          `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [cfgId, projectId, cfg.name, cfg.carpet, cfg.super, cfg.price, cfg.beds, cfg.baths]
        );
      }
    }
  }

  console.log('--- Sync Completed Successfully! ---');
}

syncGensparkAndProjects();
