/* ============================================================
   HeavenLease — DEMO DATA (SINGLE EXTERNAL FILE)
   All demo content used across the project lives here. Every
   page reads `window.HL_DEMO_DATA` and falls back to real API
   data when this file is absent.

   TO REMOVE AFTER SELLING: delete static/demo-data.js.
   ============================================================ */
(function () {
  'use strict';

  window.HL_DEMO_DATA = {

    /* ---- Featured / demo properties (the 3 index-page cards) ---- */
    properties: [
      {
        id: 'demo-1',
        title: 'Contemporary Garden Villa',
        location: 'Gangapur Road, Nashik',
        city: 'Nashik', locality: 'Gangapur Road',
        price: 42000, bhk: 3, type: 'Villa',
        badge: 'FEATURED',
        photos: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85']
      },
      {
        id: 'demo-2',
        title: 'Modern City Apartment',
        location: 'Baner, Pune',
        city: 'Pune', locality: 'Baner',
        price: 28000, bhk: 2, type: 'Apartment',
        badge: 'POPULAR',
        photos: ['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85']
      },
      {
        id: 'demo-3',
        title: 'Skyline Premium Residence',
        location: 'Powai, Mumbai',
        city: 'Mumbai', locality: 'Powai',
        price: 48000, bhk: 3, type: 'Apartment',
        badge: 'NEW',
        photos: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85']
      }
    ],
/* ---- Application status (application-status.html demo fallback) ---- */
    applicationStatus: {
      id: '1042',
      propertyId: '204',
      propertyTitle: 'Modern 2BHK Apartment',
      location: 'Whitefield, Bengaluru',
      status: 'confirmed',
      tourDate: '2026-09-12',
      tourTime: '11:30 AM'
    },

    /* ---- Testimonials ---- */
    testimonials: [
      { quote: 'Found my 2BHK in Powai within a week. Comfort scores were spot-on — no broker, no haggling.', name: 'Ananya S.', role: 'Tenant · Mumbai', stars: 5 },
      { quote: 'Escrow held my security deposit safely. Both sides could see exactly where things stood.', name: 'Rohit M.', role: 'Owner · Bengaluru', stars: 5 },
      { quote: 'Listing my flat took minutes, and the tenant applications were pre-screened for me.', name: 'Priya K.', role: 'Owner · Pune', stars: 5 }
    ],

    /* ---- Homepage stats ---- */
    stats: {
      propertiesListed: 1240,
      verifiedOwners: 580,
      successfulLeases: 1900,
      cities: 36
    },

    /* ---- FAQ (used by faq.html) ---- */
    faq: [
      {
        q: 'How is HeavenLease different from real-estate portals?',
        a: 'We connect tenants directly with verified owners. No brokers, no hidden commission and a comfort-first search (quietness, sunlight, commute, pet policy) instead of just price.'
      },
      {
        q: 'Are the owners verified?',
        a: 'Yes. Every owner completes a document verification before they can list a property. Demo data shown here is sample content only.'
      },
      {
        q: 'How does the escrow protection work?',
        a: 'Security deposits are held in escrow and released only when both parties confirm — protecting tenants and owners through the whole lease.'
      },
      {
        q: 'How do I move from demo to real data after buying the site?',
        a: 'Simply delete static/demo-data.js. The whole site automatically switches to live database properties and real users.'
      }
    ],

    /* ---- Owner resources (screening tools demo) ---- */
    ownerTools: [
      { title: 'Tenant Screening', desc: 'Verify identity, employment & credit before approving applicants.', href: 'tenant-screening', icon: 'user-shield' },
      { title: 'Background Checks', desc: 'Run clean, respectful background & credit checks on applicants.', href: 'background-check', icon: 'magnifying-glass' },
      { title: 'Rent Pricing Guide', desc: 'Price your property right with market data and local insights.', href: 'rent-pricing-guide', icon: 'chart-line' }
    ],

    /* ---- Application history (application-history.html demo) ---- */
    applications: [
      { id: 'HL-1042', title: 'Modern 2BHK Apartment', location: 'Whitefield, Bengaluru', status: 'confirmed', statusLabel: 'Confirmed', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85', rent: '\u20B932,000 / month', type: '2 BHK', date: '12 Sep 2026', tour: '11:30 AM', progress: 60, action: 'application-status' },
      { id: 'HL-1051', title: 'Premium 1BHK Residence', location: 'Indiranagar, Bengaluru', status: 'pending', statusLabel: 'Pending', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=85', rent: '\u20B926,500 / month', type: '1 BHK', date: '15 Sep 2026', tour: '4:00 PM', progress: 40, action: 'application-status' },
      { id: 'L-2208', title: 'Lakeview Residences', location: 'Hebbal, Bengaluru', status: 'active', statusLabel: 'Active Lease', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85', rent: '\u20B938,000 / month', type: '2 BHK', date: '01 Sep 2026', tour: 'Lease active', progress: 100, action: 'lease-details' }
    ],

    /* ---- Add-Property marketing grid (add-property.html demo) ---- */
    addPropertyGrid: [
      { type: "For Rent", price: "₹25,000", unit: "/month", title: "2 BHK Premium Apartment", loc: "Koramangala, Bangalore", beds: 2, baths: 2, size: "1,200 Sqft", img: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=80" },
      { type: "For Sale", price: "₹1.25 Cr", unit: "", title: "Modern 4 BHK Villa", loc: "Whitefield, Bangalore", beds: 4, baths: 4, size: "2,400 Sqft", img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=80" },
      { type: "For Rent", price: "₹35,000", unit: "/month", title: "3 BHK Luxury Apartment", loc: "Indiranagar, Bangalore", beds: 3, baths: 3, size: "1,600 Sqft", img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80" },
      { type: "For Sale", price: "₹85 L", unit: "", title: "3 BHK Urban Residence", loc: "Electronic City, Bangalore", beds: 3, baths: 2, size: "1,400 Sqft", img: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1000&q=80" },
      { type: "For Rent", price: "₹42,000", unit: "/month", title: "Spacious Family Home", loc: "HSR Layout, Bangalore", beds: 3, baths: 3, size: "1,850 Sqft", img: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=80" },
      { type: "For Sale", price: "₹1.8 Cr", unit: "", title: "Contemporary Designer Villa", loc: "Sarjapur Road, Bangalore", beds: 4, baths: 4, size: "2,700 Sqft", img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1000&q=80" }
    ],

    /* ---- Careers job openings (careers.html demo) ---- */
    careersJobs: [
      { name: "Property Manager", team: "Property Management", location: "Bengaluru", type: "Full-time", desc: "Oversee a portfolio of listed homes, coordinate owner onboarding and property visits, and keep listings accurate and comfortable." },
      { name: "Home Verification Executive", team: "Field Operations", location: "Multiple Cities", type: "Full-time", desc: "Visit properties, verify ownership documents, capture walkthroughs and assess comfort factors such as quietness, sunlight and commute." },
      { name: "Interior Design & Space Consultant", team: "Design", location: "Remote + On-site", type: "Full-time", desc: "Advise owners on space optimisation, furnishing and presentation so homes feel practical and move-in ready." },
      { name: "Leasing & Tenant Success Specialist", team: "Tenant Experience", location: "Remote", type: "Full-time", desc: "Guide tenants from search to signed lease, including screening coordination, tours and move-in support." },
      { name: "Regional Expansion Lead — North India", team: "Business Development", location: "Delhi NCR", type: "Full-time", desc: "Build listing supply across the north by partnering with owners, societies and local services." },
      { name: "Architecture & Home Quality Consultant", team: "Advisory", location: "Remote", type: "Part-time", desc: "Contribute expertise on building quality, layouts, sustainable materials and home safety for the comfort-scores framework." }
    ]
  };

  /* ---- Helper: is demo data present? ---- */
  window.HL_DEMO_MODE = true; /* auto-removed when this file is deleted */

  window.HL_USE_DEMO = function () {
    return !!(window.HL_DEMO_DATA && window.HL_DEMO_MODE);
  };

  /* ---- Current environment note ---- */
  window.HL_DEMO_NOTICE = 'Demo content — powered by static/demo-data.js. Delete that file to go fully live.';
})();