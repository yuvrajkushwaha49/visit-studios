const db = require('../server/db');

function seedProjectsForSajanPatel() {
  console.log('--- Seeding Projects & Developers for Sajan Patel (Workians Realty) ---');

  // 1. Identify organization
  const sajanUser = db.get("SELECT * FROM users WHERE email = 'sajanpatel@workians.com'");
  if (!sajanUser) {
    console.error('Sajan Patel user not found in database!');
    return;
  }
  const orgId = sajanUser.organization_id || 'org-08a1da1a';
  console.log(`Target Organization ID: ${orgId}`);

  // 2. Define Developers
  const developers = [
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

  // Lookup developer IDs
  const sayaDev = db.get('SELECT id FROM developers WHERE organization_id = ? AND name = ?', [orgId, 'Saya Group']);
  const ncrDev = db.get('SELECT id FROM developers WHERE organization_id = ? AND name = ?', [orgId, 'NCR Group']);
  const gulshanDev = db.get('SELECT id FROM developers WHERE organization_id = ? AND name = ?', [orgId, 'Gulshan Homz']);
  const godrejDev = db.get('SELECT id FROM developers WHERE organization_id = ? AND name = ?', [orgId, 'Godrej Properties']);

  // 3. Define Projects
  const projects = [
    {
      id: `proj-saya-rajnagar-${orgId}`,
      organization_id: orgId,
      developer_id: sayaDev ? sayaDev.id : `dev-saya-${orgId}`,
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
      organization_id: orgId,
      developer_id: ncrDev ? ncrDev.id : `dev-ncr-${orgId}`,
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
      organization_id: orgId,
      developer_id: ncrDev ? ncrDev.id : `dev-ncr-${orgId}`,
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
      organization_id: orgId,
      developer_id: gulshanDev ? gulshanDev.id : `dev-gulshan-${orgId}`,
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
      organization_id: orgId,
      developer_id: godrejDev ? godrejDev.id : `dev-godrej-${orgId}`,
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
    const existing = db.get('SELECT id FROM projects WHERE organization_id = ? AND name = ?', [proj.organization_id, proj.name]);
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
        [proj.id, proj.organization_id, proj.developer_id, proj.name, proj.location, proj.google_maps_url, proj.description, proj.project_logo, proj.carpet_area, proj.built_up_area, proj.super_built_up_area, proj.starting_price, proj.price_range, proj.amenities, proj.status]
      );
      console.log(`Inserted project: ${proj.name} (${proj.id})`);
    }

    // Insert configurations
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
      console.log(`  Added ${proj.configurations.length} configurations for ${proj.name}`);
    }
  }

  console.log('--- Seeding Complete for Sajan Patel! ---');
}

if (require.main === module) {
  seedProjectsForSajanPatel();
}

module.exports = { seedProjectsForSajanPatel };
