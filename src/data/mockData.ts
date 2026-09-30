import { 
  RawAlert, 
  PrioritizedAlert, 
  Case, 
  STRDraft, 
  CustomerKYC, 
  Transaction, 
  AuditEntry, 
  User,
  ExtendedCustomerProfile,
  CustomerRiskHistory,
  CustomerDocument,
  CustomerAccount,
  RelatedEntity,
  CommonIdentifier,
  PriorAlert,
  PriorCase,
  PriorSTR,
  InvestigatorNote
} from '@/types';

// Helper function to format INR in Indian numbering system (lakhs, crores)
export const formatINR = (amount: number): string => {
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000000) {
    // Crores (1,00,00,000+)
    return `₹${(absAmount / 10000000).toFixed(2)} Cr`;
  } else if (absAmount >= 100000) {
    // Lakhs (1,00,000+)
    return `₹${(absAmount / 100000).toFixed(2)} L`;
  } else {
    // Format with Indian comma placement (e.g., 45,000)
    return `₹${absAmount.toLocaleString('en-IN')}`;
  }
};

// Full INR formatting with Indian comma placement
export const formatINRFull = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Mock analysts for assignment - Indian names
export const mockAnalysts: User[] = [
  { id: 'usr-001', name: 'Priya Sharma', email: 'priya.sharma@bank.co.in', role: 'analyst' },
  { id: 'usr-006', name: 'Rajesh Kumar', email: 'rajesh.kumar@bank.co.in', role: 'analyst' },
  { id: 'usr-007', name: 'Anjali Iyer', email: 'anjali.iyer@bank.co.in', role: 'analyst' },
  { id: 'usr-008', name: 'Vikram Patel', email: 'vikram.patel@bank.co.in', role: 'analyst' },
];

// Priority override reason categories
export const priorityReasonCategories = [
  'Customer escalation',
  'Regulatory inquiry',
  'Management directive',
  'Pattern similarity to filed STR',
  'Time-sensitive information',
  'External intelligence',
  'Risk appetite adjustment',
  'RBI/FIU-IND directive',
  'Other',
];

// ============================================================================
// CUSTOMER DATA STORE - Single Source of Truth for all customer-related data
// ============================================================================

// Extended customer profiles with all Customer 360 data
export const mockExtendedCustomerProfiles: ExtendedCustomerProfile[] = [
  // ===========================================================================
  // USE CASE 2: INVESTMENT FRAUD / PONZI SCHEME - Dr. Ravi Gopal Kumar (CUS-DRK-3401)
  // ===========================================================================
  {
    kyc: {
      id: 'CUS-DRK-3401',
      name: 'Dr. Ravi Gopal Kumar',
      type: 'individual',
      riskRating: 'medium', // Pre-alert risk rating
      occupation: 'Cardiologist',
      industry: 'Healthcare - Medical Practice',
      declaredIncome: 4000000, // ₹4,00,000 per month = ₹48,00,000 annual
      actualTurnover: 0,
      accountAge: 48,
      nationality: 'India',
      pep: false,
      sanctions: false,
      dateOfBirth: '1975-08-12', // Age 50
      idType: 'PAN',
      idNumber: 'ABCD1234F',
      address: '1502, Samudra Mahal, Dr. Annie Besant Road',
      city: 'Worli, Mumbai',
      country: 'India',
      postalCode: '400018',
      phoneNumber: '+91 ****-456123',
      email: 'dr.ravi.k****@gmail.com',
      onboardingDate: '2021-02-15',
      lastKYCReview: '2024-12-01',
      nextKYCReview: '2025-12-01',
      sourceOfWealth: 'Medical Practice Income',
      sourceOfFunds: 'Professional Fees / Salary',
      expectedTurnover: '₹40,00,000 - ₹60,00,000',
    },
    riskRatingHistory: [
      { date: '2024-12-01', rating: 'medium', reason: 'Annual review - high net worth individual, increased transaction activity' },
      { date: '2023-12-10', rating: 'low', reason: 'Periodic review - consistent professional income pattern' },
      { date: '2021-02-15', rating: 'low', reason: 'Initial onboarding - reputable medical professional' },
    ],
    documents: [
      { name: 'PAN Card', status: 'verified', date: '2021-02-15' },
      { name: 'Aadhaar Card', status: 'verified', date: '2021-02-15' },
      { name: 'Medical License (MCI Registration)', status: 'verified', date: '2024-12-01' },
      { name: 'Address Proof (Passport)', status: 'verified', date: '2024-12-01' },
      { name: 'ITR (Last 3 Years)', status: 'verified', date: '2024-12-01' },
    ],
    pepScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No PEP associations found' },
    sanctionsScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No sanctions matches' },
    accounts: [
      { id: '50100XXXXX', type: 'Savings Account', currency: 'INR', status: 'active', balance: 4500000 },
      { id: '7000XXXXXX', type: 'Current Account (Business)', currency: 'INR', status: 'active', balance: 12500000 },
    ],
    relatedEntities: [
      // Related Business Entity (LLP)
      { id: 'RK-LLP-001', name: 'R.K. Health Investment LLP', relationship: 'Proprietor / Related Party', jurisdiction: 'Mumbai, India', flagged: true },
      // Investors (inbound sources - "Ponzi investors")
      { id: 'INV-001', name: 'Sanjay Mehta', relationship: 'Investor', jurisdiction: 'Mumbai', flagged: true },
      { id: 'INV-002', name: 'Kavita Agarwal', relationship: 'Investor', jurisdiction: 'Delhi', flagged: true },
      { id: 'INV-003', name: 'Ramesh Choudhary', relationship: 'Investor', jurisdiction: 'Pune', flagged: true },
      { id: 'INV-004', name: 'Pradeep Saxena', relationship: 'Investor', jurisdiction: 'Ahmedabad', flagged: true },
      { id: 'INV-005', name: 'Meera Nair', relationship: 'Investor', jurisdiction: 'Bengaluru', flagged: true },
      { id: 'INV-006', name: 'Vikram Joshi', relationship: 'Investor', jurisdiction: 'Hyderabad', flagged: true },
      { id: 'INV-007', name: 'Anita Deshmukh', relationship: 'Investor', jurisdiction: 'Nashik', flagged: true },
      { id: 'INV-008', name: 'Rajendra Pillai', relationship: 'Investor', jurisdiction: 'Chennai', flagged: true },
      { id: 'INV-009', name: 'Sunil Kapoor', relationship: 'Investor', jurisdiction: 'Kolkata', flagged: true },
      { id: 'INV-010', name: 'Deepa Sharma', relationship: 'Investor', jurisdiction: 'Jaipur', flagged: true },
      { id: 'INV-011', name: 'Arun Gupta', relationship: 'Investor', jurisdiction: 'Lucknow', flagged: true },
      { id: 'INV-012', name: 'Neelam Reddy', relationship: 'Investor', jurisdiction: 'Indore', flagged: true },
      // Real estate seller (integration beneficiary)
      { id: 'RE-001', name: 'Goa Seaside Properties Pvt Ltd', relationship: 'Real Estate Seller', jurisdiction: 'Goa', flagged: true },
    ],
    commonIdentifiers: [
      { type: 'Registered Address', value: 'Dr. Annie Besant Road, Worli, Mumbai', sharedWith: ['R.K. Health Investment LLP'] },
      { type: 'Authorized Signatory', value: 'Dr. Ravi Gopal Kumar', sharedWith: ['R.K. Health Investment LLP'] },
    ],
    priorAlerts: [],
    priorCases: [],
    priorSTRs: [],
    investigatorNotes: [],
  },
  // ===========================================================================
  // USE CASE 4: MONEY MULE / FUNNEL ACCOUNT - Priya V. Sharma (CUS-PS-1995)
  // ===========================================================================
  {
    kyc: {
      id: 'CUS-PS-1995',
      name: 'Priya V. Sharma',
      type: 'individual',
      riskRating: 'low', // Pre-alert risk rating was Low
      occupation: 'Homemaker',
      industry: 'N/A',
      declaredIncome: 0, // Zero declared income
      actualTurnover: 0,
      accountAge: 24,
      nationality: 'India',
      pep: false,
      sanctions: false,
      dateOfBirth: '1995-03-15', // Age 30
      idType: 'PAN',
      idNumber: 'WXYZ1010A',
      address: '42, Koregaon Park',
      city: 'Pune',
      country: 'India',
      postalCode: '411001',
      phoneNumber: '+91 ****-789012',
      email: 'priya.v****@gmail.com',
      onboardingDate: '2023-02-10',
      lastKYCReview: '2024-02-10',
      nextKYCReview: '2025-02-10',
      sourceOfWealth: 'Spouse Income',
      sourceOfFunds: 'Household Transfers',
      expectedTurnover: '₹0 - ₹50,000',
    },
    riskRatingHistory: [
      { date: '2024-02-10', rating: 'low', reason: 'Annual review - minimal account activity' },
      { date: '2023-02-10', rating: 'low', reason: 'Initial onboarding - homemaker profile' },
    ],
    documents: [
      { name: 'PAN Card', status: 'verified', date: '2023-02-10' },
      { name: 'Aadhaar Card', status: 'verified', date: '2023-02-10' },
      { name: 'Address Proof (Electricity Bill)', status: 'verified', date: '2024-02-10' },
      { name: 'Passport', status: 'pending', date: '' },
    ],
    pepScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No PEP associations found' },
    sanctionsScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No sanctions matches' },
    accounts: [
      { id: '3000XXXXXX', type: 'Savings Account', currency: 'INR', status: 'active', balance: 215000 },
    ],
    relatedEntities: [
      // Inbound senders - unrelated individuals (funnel sources)
      { id: 'SND-001', name: 'Rajesh Kumar Gupta', relationship: 'Unknown Third Party', jurisdiction: 'Delhi', flagged: true },
      { id: 'SND-002', name: 'Mohan Singh Rathore', relationship: 'Unknown Third Party', jurisdiction: 'Jaipur', flagged: true },
      { id: 'SND-003', name: 'Vikram Joshi', relationship: 'Unknown Third Party', jurisdiction: 'Mumbai', flagged: true },
      { id: 'SND-004', name: 'Amit Banerjee', relationship: 'Unknown Third Party', jurisdiction: 'Kolkata', flagged: true },
      { id: 'SND-005', name: 'Suresh Reddy', relationship: 'Unknown Third Party', jurisdiction: 'Hyderabad', flagged: true },
      { id: 'SND-006', name: 'Karthik Iyer', relationship: 'Unknown Third Party', jurisdiction: 'Chennai', flagged: true },
      { id: 'SND-007', name: 'Dinesh Patel', relationship: 'Unknown Third Party', jurisdiction: 'Ahmedabad', flagged: true },
      { id: 'SND-008', name: 'Rakesh Tiwari', relationship: 'Unknown Third Party', jurisdiction: 'Indore', flagged: true },
      // Outbound beneficiary
      { id: 'BEN-001', name: 'Eurolink Consulting Ltd', relationship: 'Foreign Beneficiary', jurisdiction: 'Cyprus', flagged: true },
    ],
    commonIdentifiers: [],
    priorAlerts: [],
    priorCases: [],
    priorSTRs: [],
    investigatorNotes: [],
  },
  // ABC Exports Pvt Ltd - CUS-45678 (High Risk Corporate)
  {
    kyc: {
      id: 'CUS-45678',
      name: 'ABC Exports Pvt Ltd',
      type: 'corporate',
      riskRating: 'high',
      industry: 'Import/Export',
      declaredIncome: 20000000,
      actualTurnover: 56700000,
      accountAge: 18,
      nationality: 'India',
      pep: false,
      sanctions: false,
      dateOfBirth: '2018-05-12',
      idType: 'CIN',
      idNumber: 'U51909MH2018PTC******',
      address: '301, Trade Centre, Nariman Point',
      city: 'Mumbai',
      country: 'India',
      postalCode: '400021',
      phoneNumber: '+91 ****-567890',
      email: 'accounts@abc*****.com',
      onboardingDate: '2018-08-15',
      lastKYCReview: '2024-01-15',
      nextKYCReview: '2025-01-15',
      sourceOfWealth: 'Business Income',
      sourceOfFunds: 'Trading Revenue',
      expectedTurnover: '₹2,00,00,000 - ₹5,00,00,000',
    },
    riskRatingHistory: [
      { date: '2024-01-15', rating: 'high', reason: 'Increased transaction volume with high-risk jurisdictions' },
      { date: '2023-06-20', rating: 'medium', reason: 'Annual review - trade volume increase' },
      { date: '2022-01-18', rating: 'low', reason: 'Initial onboarding assessment' },
    ],
    documents: [
      { name: 'Certificate of Incorporation', status: 'verified', date: '2024-01-15' },
      { name: 'GST Registration', status: 'verified', date: '2024-01-15' },
      { name: 'IEC Certificate', status: 'verified', date: '2018-08-15' },
      { name: 'Financial Statements FY24', status: 'pending', date: '2024-06-01' },
      { name: 'Board Resolution', status: 'verified', date: '2024-01-15' },
    ],
    pepScreening: {
      lastScreened: '2024-12-01',
      status: 'clear',
      details: 'No PEP associations found for directors',
    },
    sanctionsScreening: {
      lastScreened: '2024-12-01',
      status: 'clear',
      details: 'No sanctions matches',
    },
    accounts: [
      { id: 'ACC-456-001', type: 'Current Account', currency: 'INR', status: 'active', balance: 14500000 },
      { id: 'ACC-456-002', type: 'CC/OD Facility', currency: 'INR', status: 'active', balance: -2500000 },
      { id: 'ACC-456-003', type: 'EEFC Account', currency: 'USD', status: 'active', balance: 85000 },
    ],
    relatedEntities: [
      { id: 'ENT-001', name: 'Global Trade FZE', relationship: 'Regular Counterparty', jurisdiction: 'UAE', flagged: true },
      { id: 'ENT-002', name: 'Pacific Holdings Pte Ltd', relationship: 'Buyer', jurisdiction: 'Singapore', flagged: false },
      { id: 'ENT-003', name: 'Eastern Materials Ltd', relationship: 'Supplier', jurisdiction: 'Hong Kong', flagged: false },
    ],
    commonIdentifiers: [
      { type: 'Registered Address', value: '301, Trade Centre, Mumbai', sharedWith: ['XYZ Trading Pvt Ltd'] },
      { type: 'Director', value: 'Rajiv Malhotra', sharedWith: ['Global Trade FZE', 'Sunrise Group'] },
      { type: 'Phone Number', value: '+91 22 ****-5678', sharedWith: ['XYZ Trading Pvt Ltd'] },
    ],
    priorAlerts: [
      { id: 'ALT-2024-000892', date: new Date('2024-08-15'), type: 'Structuring', riskLevel: 'medium', resolution: 'Closed - False Positive', resolvedBy: 'Priya Sharma' },
      { id: 'ALT-2023-004521', date: new Date('2023-11-22'), type: 'Rapid Movement', riskLevel: 'high', resolution: 'Escalated to Case', caseId: 'CASE-2023-001245', resolvedBy: 'Arjun Mehta' },
      { id: 'ALT-2023-002189', date: new Date('2023-06-10'), type: 'Geo Anomaly', riskLevel: 'low', resolution: 'Closed - Explained', resolvedBy: 'Priya Sharma' },
    ],
    priorCases: [
      { id: 'CASE-2023-001245', date: new Date('2023-11-25'), linkedAlerts: 2, status: 'closed', outcome: 'STR Filed', strId: 'STR-2023-000456', investigator: 'Arjun Mehta' },
    ],
    priorSTRs: [
      { id: 'STR-2023-000456', filedDate: new Date('2023-12-15'), fiuReference: 'FIU-IND-2023-REF-78901', amount: 18500000, status: 'submitted', filedBy: 'Principal Officer' },
    ],
    investigatorNotes: [
      { id: 'NOTE-001', author: 'Priya Sharma', role: 'AML Analyst', date: new Date('2024-12-10'), content: 'Customer provided documentation explaining increased trading activity. Business expansion into new markets appears legitimate based on IEC amendment and new buyer contracts.' },
      { id: 'NOTE-002', author: 'Arjun Mehta', role: 'Case Investigator', date: new Date('2023-11-28'), content: 'Conducted enhanced due diligence. Found links to shell company in UAE (Global Trade FZE). Transaction pattern consistent with trade-based money laundering typology.' },
      { id: 'NOTE-003', author: 'Arjun Mehta', role: 'Case Investigator', date: new Date('2023-12-01'), content: 'Customer unable to provide satisfactory explanation for source of funds. Recommending STR filing with FIU-IND.' },
    ],
  },
  // Mahadev Impex LLP - CUS-67890 (High Risk Trade Entity)
  {
    kyc: {
      id: 'CUS-67890',
      name: 'Mahadev Impex LLP',
      type: 'corporate',
      riskRating: 'high',
      industry: 'Import/Export - Textiles',
      declaredIncome: 35000000,
      actualTurnover: 125000000,
      accountAge: 24,
      nationality: 'India',
      pep: false,
      sanctions: false,
      dateOfBirth: '2017-03-22',
      idType: 'LLPIN',
      idNumber: 'AAE-****',
      address: '15, GIDC Industrial Estate',
      city: 'Ahmedabad',
      country: 'India',
      postalCode: '382445',
      phoneNumber: '+91 ****-234567',
      email: 'info@mahadev*****.com',
      onboardingDate: '2017-06-10',
      lastKYCReview: '2024-02-01',
      nextKYCReview: '2024-08-01',
      sourceOfWealth: 'Business Operations',
      sourceOfFunds: 'Export Proceeds',
      expectedTurnover: '₹3,00,00,000 - ₹5,00,00,000',
    },
    riskRatingHistory: [
      { date: '2024-02-01', rating: 'high', reason: 'Unusual counterparty network in UAE' },
      { date: '2023-02-15', rating: 'medium', reason: 'Periodic review' },
      { date: '2022-02-10', rating: 'low', reason: 'Standard rating' },
    ],
    documents: [
      { name: 'LLP Agreement', status: 'verified', date: '2024-02-01' },
      { name: 'IEC Certificate', status: 'verified', date: '2017-06-10' },
      { name: 'GST Registration', status: 'verified', date: '2024-02-01' },
      { name: 'PAN Card', status: 'verified', date: '2017-06-10' },
    ],
    pepScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No PEP associations found' },
    sanctionsScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No sanctions matches' },
    accounts: [
      { id: 'ACC-678-001', type: 'Current Account', currency: 'INR', status: 'active', balance: 8900000 },
      { id: 'ACC-678-002', type: 'EEFC Account', currency: 'USD', status: 'active', balance: 125000 },
    ],
    relatedEntities: [
      { id: 'ENT-004', name: 'Al Rashid Trading LLC', relationship: 'Buyer', jurisdiction: 'UAE', flagged: true },
      { id: 'ENT-005', name: 'Sunrise Textiles Singapore', relationship: 'Supplier', jurisdiction: 'Singapore', flagged: false },
    ],
    commonIdentifiers: [],
    priorAlerts: [],
    priorCases: [],
    priorSTRs: [],
    investigatorNotes: [],
  },
  // Rahul Sharma - CUS-78901 (Individual - Medium Risk)
  {
    kyc: {
      id: 'CUS-78901',
      name: 'Rahul Sharma',
      type: 'individual',
      riskRating: 'medium',
      occupation: 'Business Owner',
      industry: 'Retail Trade',
      declaredIncome: 2500000,
      actualTurnover: 8900000,
      accountAge: 36,
      nationality: 'India',
      pep: false,
      sanctions: false,
      dateOfBirth: '1985-07-22',
      idType: 'PAN',
      idNumber: 'ABCPS****K',
      address: '45, Sector 18, Noida',
      city: 'Noida',
      country: 'India',
      postalCode: '201301',
      phoneNumber: '+91 ****-123456',
      email: 'rahul.s****@gmail.com',
      onboardingDate: '2021-01-15',
      lastKYCReview: '2024-01-20',
      nextKYCReview: '2025-01-20',
      sourceOfWealth: 'Business Income',
      sourceOfFunds: 'Trading Profits',
      expectedTurnover: '₹20,00,000 - ₹50,00,000',
    },
    riskRatingHistory: [
      { date: '2024-01-20', rating: 'medium', reason: 'Increased transaction volume' },
      { date: '2023-01-15', rating: 'low', reason: 'Annual review' },
    ],
    documents: [
      { name: 'PAN Card', status: 'verified', date: '2024-01-20' },
      { name: 'Aadhaar Card', status: 'verified', date: '2024-01-20' },
      { name: 'Address Proof', status: 'verified', date: '2024-01-20' },
    ],
    pepScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No PEP associations found' },
    sanctionsScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No sanctions matches' },
    accounts: [
      { id: 'ACC-789-001', type: 'Savings Account', currency: 'INR', status: 'active', balance: 450000 },
      { id: 'ACC-789-002', type: 'Current Account', currency: 'INR', status: 'active', balance: 1200000 },
    ],
    relatedEntities: [],
    commonIdentifiers: [],
    priorAlerts: [],
    priorCases: [],
    priorSTRs: [],
    investigatorNotes: [],
  },
  // Shree Ganesh Traders - CUS-34521 (Corporate - High Risk)
  {
    kyc: {
      id: 'CUS-34521',
      name: 'Shree Ganesh Traders',
      type: 'corporate',
      riskRating: 'high',
      industry: 'Commodities Trading',
      declaredIncome: 15000000,
      actualTurnover: 34500000,
      accountAge: 30,
      nationality: 'India',
      pep: false,
      sanctions: false,
      dateOfBirth: '2019-02-14',
      idType: 'CIN',
      idNumber: 'U51100GJ2019PTC******',
      address: '12, APMC Market, Vashi',
      city: 'Navi Mumbai',
      country: 'India',
      postalCode: '400703',
      phoneNumber: '+91 ****-345678',
      email: 'contact@shreeganesh*****.com',
      onboardingDate: '2019-05-20',
      lastKYCReview: '2024-01-10',
      nextKYCReview: '2024-07-10',
      sourceOfWealth: 'Business Operations',
      sourceOfFunds: 'Commodity Sales',
      expectedTurnover: '₹1,00,00,000 - ₹2,00,00,000',
    },
    riskRatingHistory: [
      { date: '2024-01-10', rating: 'high', reason: 'Shell company connections identified' },
      { date: '2023-01-15', rating: 'medium', reason: 'Annual review' },
      { date: '2022-01-10', rating: 'low', reason: 'Initial assessment' },
    ],
    documents: [
      { name: 'Certificate of Incorporation', status: 'verified', date: '2024-01-10' },
      { name: 'GST Registration', status: 'verified', date: '2024-01-10' },
      { name: 'PAN Card', status: 'verified', date: '2019-05-20' },
    ],
    pepScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No PEP associations found' },
    sanctionsScreening: { lastScreened: '2024-12-01', status: 'clear', details: 'No sanctions matches' },
    accounts: [
      { id: 'ACC-345-001', type: 'Current Account', currency: 'INR', status: 'active', balance: 5600000 },
    ],
    relatedEntities: [
      { id: 'ENT-010', name: 'Gulf Commodities FZE', relationship: 'Buyer', jurisdiction: 'UAE', flagged: true },
      { id: 'ENT-011', name: 'Singapore Metals Pte Ltd', relationship: 'Supplier', jurisdiction: 'Singapore', flagged: false },
    ],
    commonIdentifiers: [
      { type: 'Director', value: 'Mahesh Patel', sharedWith: ['Gulf Commodities FZE'] },
    ],
    priorAlerts: [
      { id: 'ALT-2024-001198', date: new Date('2024-01-08'), type: 'Rapid Movement', riskLevel: 'high', resolution: 'Escalated to Case', caseId: 'CASE-2024-0089', resolvedBy: 'Arjun Mehta' },
    ],
    priorCases: [],
    priorSTRs: [],
    investigatorNotes: [
      { id: 'NOTE-010', author: 'Arjun Mehta', role: 'Case Investigator', date: new Date('2024-01-11'), content: 'Initial review completed. Multiple shell company connections identified via Dubai and Singapore.' },
    ],
  },
];

// Lookup functions for consistent data access
export const getCustomerById = (customerId: string): CustomerKYC | undefined => {
  const profile = mockExtendedCustomerProfiles.find(p => p.kyc.id === customerId);
  return profile?.kyc;
};

export const getExtendedCustomerProfile = (customerId: string): ExtendedCustomerProfile | undefined => {
  return mockExtendedCustomerProfiles.find(p => p.kyc.id === customerId);
};

export const getTransactionsByCustomerId = (customerId: string): Transaction[] => {
  return mockTransactionsByCustomer[customerId] || [];
};

// Transaction data by customer ID - Single source of truth
export const mockTransactionsByCustomer: Record<string, Transaction[]> = {
  // ===========================================================================
  // USE CASE 2: INVESTMENT FRAUD / PONZI SCHEME - Dr. Ravi Gopal Kumar Transactions
  // A) Placement: ₹1.5 Crore inflows from 12 "investors" 
  // B) Layering: Rapid transfer to related LLP within 72 hours
  // C) Integration: Cyclical "profit share" payouts + Luxury asset purchase
  // ===========================================================================
  'CUS-DRK-3401': [
    // A) Placement - High-Value RTGS/NEFT Inflows into Personal Savings (12 transactions = ₹1.5 Cr)
    { id: 'TXN-PZ-001', date: new Date('2025-07-05'), type: 'credit', amount: 1500000, currency: 'INR', counterparty: 'Sanjay Mehta (Mumbai)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Fund Commitment" from investor' },
    { id: 'TXN-PZ-002', date: new Date('2025-07-07'), type: 'credit', amount: 2000000, currency: 'INR', counterparty: 'Kavita Agarwal (Delhi)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Seed Capital" from investor' },
    { id: 'TXN-PZ-003', date: new Date('2025-07-09'), type: 'credit', amount: 1200000, currency: 'INR', counterparty: 'Ramesh Choudhary (Pune)', channel: 'NEFT', country: 'IN', description: 'NEFT - "Investment Commitment" from investor' },
    { id: 'TXN-PZ-004', date: new Date('2025-07-11'), type: 'credit', amount: 800000, currency: 'INR', counterparty: 'Pradeep Saxena (Ahmedabad)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Fund Commitment" from investor' },
    { id: 'TXN-PZ-005', date: new Date('2025-07-13'), type: 'credit', amount: 1800000, currency: 'INR', counterparty: 'Meera Nair (Bengaluru)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Capital Investment" from investor' },
    { id: 'TXN-PZ-006', date: new Date('2025-07-15'), type: 'credit', amount: 1000000, currency: 'INR', counterparty: 'Vikram Joshi (Hyderabad)', channel: 'NEFT', country: 'IN', description: 'NEFT - "Seed Capital" from investor' },
    { id: 'TXN-PZ-007', date: new Date('2025-07-17'), type: 'credit', amount: 500000, currency: 'INR', counterparty: 'Anita Deshmukh (Nashik)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Fund Commitment" from investor' },
    { id: 'TXN-PZ-008', date: new Date('2025-07-19'), type: 'credit', amount: 1500000, currency: 'INR', counterparty: 'Rajendra Pillai (Chennai)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Investment Capital" from investor' },
    { id: 'TXN-PZ-009', date: new Date('2025-07-21'), type: 'credit', amount: 1200000, currency: 'INR', counterparty: 'Sunil Kapoor (Kolkata)', channel: 'NEFT', country: 'IN', description: 'NEFT - "Fund Commitment" from investor' },
    { id: 'TXN-PZ-010', date: new Date('2025-07-23'), type: 'credit', amount: 700000, currency: 'INR', counterparty: 'Deepa Sharma (Jaipur)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Seed Capital" from investor' },
    { id: 'TXN-PZ-011', date: new Date('2025-07-25'), type: 'credit', amount: 1300000, currency: 'INR', counterparty: 'Arun Gupta (Lucknow)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Capital Investment" from investor' },
    { id: 'TXN-PZ-012', date: new Date('2025-07-27'), type: 'credit', amount: 1500000, currency: 'INR', counterparty: 'Neelam Reddy (Indore)', channel: 'NEFT', country: 'IN', description: 'NEFT - "Fund Commitment" from investor' },
    // B) Layering - Rapid Transfer to Related LLP Account (within 72 hours)
    { id: 'TXN-PZ-013', date: new Date('2025-07-29'), type: 'debit', amount: 15000000, currency: 'INR', counterparty: 'R.K. Health Investment LLP (Self - Mumbai)', channel: 'Internal Transfer', country: 'IN', description: 'Internal transfer to related LLP - "Capital transfer / Business funding"' },
    // C) Integration - Cyclical "Profit Share" Payouts (45-day cycle - back to investors)
    { id: 'TXN-PZ-014', date: new Date('2025-09-15'), type: 'debit', amount: 2500000, currency: 'INR', counterparty: 'Sanjay Mehta (Mumbai)', channel: 'RTGS', country: 'IN', description: 'Outbound RTGS - "Quarterly Profit Share" payout to investor' },
    { id: 'TXN-PZ-015', date: new Date('2025-09-17'), type: 'debit', amount: 2500000, currency: 'INR', counterparty: 'Kavita Agarwal (Delhi)', channel: 'RTGS', country: 'IN', description: 'Outbound RTGS - "Quarterly Profit Share" payout to investor' },
    { id: 'TXN-PZ-016', date: new Date('2025-09-19'), type: 'debit', amount: 2500000, currency: 'INR', counterparty: 'Meera Nair (Bengaluru)', channel: 'RTGS', country: 'IN', description: 'Outbound RTGS - "Quarterly Profit Share" payout to investor' },
    // D) Integration - Luxury Asset Purchase (personal benefit from business account)
    { id: 'TXN-PZ-017', date: new Date('2025-10-25'), type: 'debit', amount: 5000000, currency: 'INR', counterparty: 'Goa Seaside Properties Pvt Ltd (Goa)', channel: 'RTGS', country: 'IN', description: 'RTGS - "Commercial Real Estate Purchase" - Luxury villa in Goa' },
    // Additional cyclical payouts (second cycle)
    { id: 'TXN-PZ-018', date: new Date('2025-11-01'), type: 'debit', amount: 1800000, currency: 'INR', counterparty: 'Ramesh Choudhary (Pune)', channel: 'RTGS', country: 'IN', description: 'Outbound RTGS - "Profit Distribution" payout to investor' },
    { id: 'TXN-PZ-019', date: new Date('2025-11-03'), type: 'debit', amount: 1200000, currency: 'INR', counterparty: 'Rajendra Pillai (Chennai)', channel: 'NEFT', country: 'IN', description: 'Outbound NEFT - "Profit Distribution" payout to investor' },
    { id: 'TXN-PZ-020', date: new Date('2025-11-05'), type: 'debit', amount: 1500000, currency: 'INR', counterparty: 'Sunil Kapoor (Kolkata)', channel: 'RTGS', country: 'IN', description: 'Outbound RTGS - "Quarterly Profit Share" payout to investor' },
  ],
  // ===========================================================================
  // USE CASE 4: MONEY MULE / FUNNEL ACCOUNT - Priya V. Sharma Transactions
  // 8 Inbound IMPS/NEFT (₹1,50,000 each = ₹12,00,000) + 1 Outbound SWIFT (₹10,00,000)
  // ===========================================================================
  'CUS-PS-1995': [
    // Domestic Inflows - Funneling Pattern (8 transactions over 10 days)
    { id: 'TXN-MM-001', date: new Date('2026-01-20'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Rajesh Kumar Gupta (Delhi)', channel: 'IMPS', country: 'IN', description: 'IMPS transfer from unknown third party - Delhi' },
    { id: 'TXN-MM-002', date: new Date('2026-01-21'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Mohan Singh Rathore (Jaipur)', channel: 'NEFT', country: 'IN', description: 'NEFT transfer from unknown third party - Jaipur' },
    { id: 'TXN-MM-003', date: new Date('2026-01-23'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Vikram Joshi (Mumbai)', channel: 'IMPS', country: 'IN', description: 'IMPS transfer from unknown third party - Mumbai' },
    { id: 'TXN-MM-004', date: new Date('2026-01-24'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Amit Banerjee (Kolkata)', channel: 'NEFT', country: 'IN', description: 'NEFT transfer from unknown third party - Kolkata' },
    { id: 'TXN-MM-005', date: new Date('2026-01-25'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Suresh Reddy (Hyderabad)', channel: 'IMPS', country: 'IN', description: 'IMPS transfer from unknown third party - Hyderabad' },
    { id: 'TXN-MM-006', date: new Date('2026-01-27'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Karthik Iyer (Chennai)', channel: 'NEFT', country: 'IN', description: 'NEFT transfer from unknown third party - Chennai' },
    { id: 'TXN-MM-007', date: new Date('2026-01-28'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Dinesh Patel (Ahmedabad)', channel: 'IMPS', country: 'IN', description: 'IMPS transfer from unknown third party - Ahmedabad' },
    { id: 'TXN-MM-008', date: new Date('2026-01-30'), type: 'credit', amount: 150000, currency: 'INR', counterparty: 'Rakesh Tiwari (Indore)', channel: 'NEFT', country: 'IN', description: 'NEFT transfer from unknown third party - Indore' },
    // International Outflow - Layering (within 48 hours of last inflow)
    { id: 'TXN-MM-009', date: new Date('2026-02-01'), type: 'debit', amount: 1000000, currency: 'INR', counterparty: 'Eurolink Consulting Ltd (Cyprus)', channel: 'Wire - SWIFT', country: 'CY', description: 'SWIFT transfer - "Consulting Fee" - High-Risk Jurisdiction (Cyprus)' },
  ],
  'CUS-45678': [
    { id: 'TXN-001', date: new Date('2024-01-14'), type: 'debit', amount: 2450000, currency: 'INR', counterparty: 'Global Trade FZE (Dubai)', channel: 'Wire - SWIFT', country: 'AE', description: 'Invoice payment - machinery parts (IEC: AAACA****J)' },
    { id: 'TXN-002', date: new Date('2024-01-13'), type: 'credit', amount: 1800000, currency: 'INR', counterparty: 'Eastern Materials Pte Ltd (Singapore)', channel: 'Wire - SWIFT', country: 'SG', description: 'Goods received - textiles' },
    { id: 'TXN-003', date: new Date('2024-01-12'), type: 'debit', amount: 3200000, currency: 'INR', counterparty: 'Pacific Holdings Ltd (Hong Kong)', channel: 'Wire - SWIFT', country: 'HK', description: 'Consulting services - trade advisory' },
    { id: 'TXN-004', date: new Date('2024-01-11'), type: 'credit', amount: 950000, currency: 'INR', counterparty: 'Domestic - Cash Deposit', channel: 'Cash', country: 'IN', description: 'Cash deposit - Mumbai Fort Branch (IFSC: HDFC0000123)' },
    { id: 'TXN-005', date: new Date('2024-01-10'), type: 'credit', amount: 980000, currency: 'INR', counterparty: 'Domestic - Cash Deposit', channel: 'Cash', country: 'IN', description: 'Cash deposit - Nariman Point Branch (IFSC: HDFC0000456)' },
    { id: 'TXN-006', date: new Date('2024-01-09'), type: 'debit', amount: 4500000, currency: 'INR', counterparty: 'Al Rashid Trading LLC (UAE)', channel: 'Wire - SWIFT', country: 'AE', description: 'Import payment - electronics components' },
    { id: 'TXN-007', date: new Date('2024-01-08'), type: 'credit', amount: 890000, currency: 'INR', counterparty: 'Shree Krishna Enterprises (Delhi)', channel: 'RTGS', country: 'IN', description: 'Domestic sale proceeds' },
  ],
  'CUS-67890': [
    { id: 'TXN-101', date: new Date('2024-01-16'), type: 'debit', amount: 7800000, currency: 'INR', counterparty: 'Al Rashid Trading LLC (Dubai)', channel: 'Wire - SWIFT', country: 'AE', description: 'Textile export advance' },
    { id: 'TXN-102', date: new Date('2024-01-15'), type: 'credit', amount: 4500000, currency: 'INR', counterparty: 'Sunrise Textiles Singapore', channel: 'Wire - SWIFT', country: 'SG', description: 'Raw material supply payment' },
    { id: 'TXN-103', date: new Date('2024-01-14'), type: 'debit', amount: 2200000, currency: 'INR', counterparty: 'Gulf Trading FZE', channel: 'Wire - SWIFT', country: 'AE', description: 'Commission payment' },
  ],
  'CUS-78901': [
    { id: 'TXN-201', date: new Date('2024-01-15'), type: 'credit', amount: 450000, currency: 'INR', counterparty: 'Cash Deposit', channel: 'Cash', country: 'IN', description: 'Cash deposit - Noida Branch' },
    { id: 'TXN-202', date: new Date('2024-01-12'), type: 'debit', amount: 280000, currency: 'INR', counterparty: 'Sharma Electronics', channel: 'NEFT', country: 'IN', description: 'Stock purchase' },
  ],
  'CUS-34521': [
    { id: 'TXN-301', date: new Date('2024-01-10'), type: 'debit', amount: 12500000, currency: 'INR', counterparty: 'Gulf Commodities FZE (Dubai)', channel: 'Wire - SWIFT', country: 'AE', description: 'Commodity export advance' },
    { id: 'TXN-302', date: new Date('2024-01-08'), type: 'credit', amount: 8900000, currency: 'INR', counterparty: 'Singapore Metals Pte Ltd', channel: 'Wire - SWIFT', country: 'SG', description: 'Metal supply payment' },
    { id: 'TXN-303', date: new Date('2024-01-05'), type: 'credit', amount: 950000, currency: 'INR', counterparty: 'Cash Deposit', channel: 'Cash', country: 'IN', description: 'Cash deposit - Vashi Branch' },
  ],
};

// Legacy exports for backward compatibility - point to first customer's data
export const mockCustomerKYC: CustomerKYC = mockExtendedCustomerProfiles[0].kyc;
export const mockTransactions: Transaction[] = mockTransactionsByCustomer['CUS-45678'];

// Generate mock raw alerts - Indian context
export const mockRawAlerts: RawAlert[] = [
  {
    id: 'ALT-2024-001234',
    sourceSystem: 'Core Banking',
    alertType: 'large_cash',
    customerId: 'CUS-78234',
    customerName: 'Bharat Metals & Minerals Ltd',
    amount: 2450000,
    currency: 'INR',
    timestamp: new Date('2024-01-15T09:23:00'),
    status: 'new',
    rawPayload: { txn_id: 'TXN-8923847', branch: 'MUM-FORT-001', ifsc: 'HDFC0000123' },
  },
  {
    id: 'ALT-2024-001235',
    sourceSystem: 'Wire Transfer',
    alertType: 'structuring',
    customerId: 'CUS-45123',
    customerName: 'Amit Verma',
    amount: 975000,
    currency: 'INR',
    timestamp: new Date('2024-01-15T10:45:00'),
    status: 'new',
    rawPayload: { pattern: 'multiple_sub_threshold', ctr_threshold: '₹10,00,000' },
  },
  {
    id: 'ALT-2024-001236',
    sourceSystem: 'Card Monitoring',
    alertType: 'geo_anomaly',
    customerId: 'CUS-89012',
    customerName: 'Neha Iyer',
    amount: 185000,
    currency: 'INR',
    timestamp: new Date('2024-01-15T11:12:00'),
    status: 'in_review',
    rawPayload: { locations: ['AE', 'SG', 'HK'] },
  },
  {
    id: 'ALT-2024-001237',
    sourceSystem: 'Core Banking',
    alertType: 'rapid_movement',
    customerId: 'CUS-23456',
    customerName: 'Sunrise Logistics India Pvt Ltd',
    amount: 8900000,
    currency: 'INR',
    timestamp: new Date('2024-01-15T14:30:00'),
    status: 'new',
    rawPayload: { velocity: 'high', period: '24h', branch: 'DEL-CP-002' },
  },
  {
    id: 'ALT-2024-001238',
    sourceSystem: 'Trade Finance',
    alertType: 'behavior_deviation',
    customerId: 'CUS-67890',
    customerName: 'Mahadev Impex LLP',
    amount: 12500000,
    currency: 'INR',
    timestamp: new Date('2024-01-15T16:00:00'),
    status: 'sent_to_maps',
    rawPayload: { deviation_score: 0.87, iec_code: 'AAACM****X' },
  },
];

// Generate mock prioritized alerts - with multiple alerts per customer for grouping demo
export const mockPrioritizedAlerts: PrioritizedAlert[] = [
  // ===========================================================================
  // USE CASE 2: INVESTMENT FRAUD / PONZI SCHEME - Dr. Ravi Gopal Kumar (4 Alerts)
  // ===========================================================================
  {
    id: 'ALT-PZ-2025-001',
    sourceSystem: 'Wire Transfer',
    alertType: 'behavior_deviation',
    customerId: 'CUS-DRK-3401',
    customerName: 'Dr. Ravi Gopal Kumar',
    amount: 15000000,
    currency: 'INR',
    timestamp: new Date('2025-07-30T09:00:00'),
    status: 'sent_to_maps',
    rawPayload: { 
      source_count: 12, 
      source_type: 'Unrelated Third-Party Individuals',
      purpose_stated: 'Fund Commitment / Seed Capital',
      profile_income: '₹4,00,000/month'
    },
    mapsScore: 94,
    riskLevel: 'high',
    riskDrivers: [
      'High-value RTGS/NEFT inflows from 12 unrelated investors totaling ₹1.5 Crore',
      'Transaction memos indicate "Fund Commitment" / "Seed Capital" - investment scheme indicators',
      'Inflow volume inconsistent with declared professional income of ₹4,00,000/month'
    ],
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours - urgent
  },
  {
    id: 'ALT-PZ-2025-002',
    sourceSystem: 'Core Banking',
    alertType: 'rapid_movement',
    customerId: 'CUS-DRK-3401',
    customerName: 'Dr. Ravi Gopal Kumar',
    amount: 15000000,
    currency: 'INR',
    timestamp: new Date('2025-07-30T10:30:00'),
    status: 'sent_to_maps',
    rawPayload: { 
      transfer_type: 'Internal',
      destination: 'R.K. Health Investment LLP',
      relationship: 'Related Party / Proprietor',
      time_from_inflows: '< 72 hours'
    },
    mapsScore: 91,
    riskLevel: 'high',
    riskDrivers: [
      'Rapid ₹1.5 Crore transfer from personal to related LLP account within 72 hours of aggregation',
      'Inter-account churning between personal savings and related business entity',
      'LLP business activity declared as "Consulting" inconsistent with fund flows'
    ],
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours - urgent
  },
  {
    id: 'ALT-PZ-2025-003',
    sourceSystem: 'Core Banking',
    alertType: 'structuring',
    customerId: 'CUS-DRK-3401',
    customerName: 'Dr. Ravi Gopal Kumar',
    amount: 9500000,
    currency: 'INR',
    timestamp: new Date('2025-09-20T11:00:00'),
    status: 'sent_to_maps',
    rawPayload: { 
      pattern: 'Cyclical Reciprocal Payments',
      cycle_period: '45 days',
      beneficiaries: 'Original investor counterparties',
      purpose_stated: 'Quarterly Profit Share'
    },
    mapsScore: 96,
    riskLevel: 'high',
    riskDrivers: [
      'Ponzi typology match: Cyclical "Quarterly Profit Share" payments back to original investors',
      'Payout schedule (45-day cycle) does not align with any legitimate investment instrument',
      'Payments funded from subsequent investor inflows - classic pyramid pattern'
    ],
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours - urgent
  },
  {
    id: 'ALT-PZ-2025-004',
    sourceSystem: 'Wire Transfer',
    alertType: 'behavior_deviation',
    customerId: 'CUS-DRK-3401',
    customerName: 'Dr. Ravi Gopal Kumar',
    amount: 5000000,
    currency: 'INR',
    timestamp: new Date('2025-10-26T14:00:00'),
    status: 'sent_to_maps',
    rawPayload: { 
      beneficiary: 'Goa Seaside Properties Pvt Ltd',
      purpose: 'Commercial Real Estate Purchase',
      location: 'Goa',
      account_source: 'Business LLP Account'
    },
    mapsScore: 88,
    riskLevel: 'high',
    riskDrivers: [
      'Unexpected wealth: ₹50 Lakh luxury real estate purchase in Goa',
      'Personal asset acquisition funded through business LLP account',
      'Integration phase indicator - proceeds converted to tangible asset'
    ],
    slaDeadline: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
  },
  // ===========================================================================
  // USE CASE 4: MONEY MULE / FUNNEL ACCOUNT - Priya V. Sharma (3 Alerts)
  // ===========================================================================
  {
    id: 'ALT-MM-2026-001',
    sourceSystem: 'Core Banking',
    alertType: 'behavior_deviation',
    customerId: 'CUS-PS-1995',
    customerName: 'Priya V. Sharma',
    amount: 1200000,
    currency: 'INR',
    timestamp: new Date('2026-02-02T09:00:00'),
    status: 'sent_to_maps',
    rawPayload: { 
      deviation_score: 0.96, 
      declared_income: 0, 
      actual_inflow: '₹12,00,000',
      profile_type: 'Homemaker'
    },
    mapsScore: 95,
    riskLevel: 'high',
    riskDrivers: [
      'Severe profile mismatch: Zero declared income vs ₹12L inflows',
      'Homemaker profile inconsistent with transaction volume',
      'Multiple unrelated third-party deposits from 8 cities'
    ],
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours - urgent
  },
  {
    id: 'ALT-MM-2026-002',
    sourceSystem: 'Wire Transfer',
    alertType: 'structuring',
    customerId: 'CUS-PS-1995',
    customerName: 'Priya V. Sharma',
    amount: 1200000,
    currency: 'INR',
    timestamp: new Date('2026-02-02T10:30:00'),
    status: 'sent_to_maps',
    rawPayload: { 
      pattern: 'velocity_anomaly', 
      deposit_count: 8,
      unique_remitters: 8,
      geographic_dispersion: 'high'
    },
    mapsScore: 92,
    riskLevel: 'high',
    riskDrivers: [
      'High velocity: 8 deposits in 10 days',
      'Multiple unrelated third-party deposits',
      'Geographically dispersed sources: Delhi, Jaipur, Mumbai, Kolkata, Hyderabad, Chennai, Ahmedabad, Indore'
    ],
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours - urgent
  },
  {
    id: 'ALT-MM-2026-003',
    sourceSystem: 'Wire Transfer',
    alertType: 'rapid_movement',
    customerId: 'CUS-PS-1995',
    customerName: 'Priya V. Sharma',
    amount: 1000000,
    currency: 'INR',
    timestamp: new Date('2026-02-02T11:00:00'),
    status: 'sent_to_maps',
    rawPayload: { 
      outbound_jurisdiction: 'CY',
      jurisdiction_risk: 'High',
      purpose: 'Consulting Fee',
      swift_code: 'BCYPCY****'
    },
    mapsScore: 94,
    riskLevel: 'high',
    riskDrivers: [
      'High-risk jurisdiction transfer (Cyprus)',
      'Rapid outflow within 48 hours of aggregated inflows',
      'Suspicious purpose: "Consulting Fee" from homemaker account'
    ],
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours - urgent
  },
  // Mahadev Impex LLP - 2 alerts (High priority customer)
  {
    ...mockRawAlerts[4],
    mapsScore: 92,
    riskLevel: 'high',
    riskDrivers: ['Unusual counterparty network in UAE', 'Trade mispricing signals', 'Shell company indicators'],
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
  },
  {
    id: 'ALT-2024-001245',
    sourceSystem: 'Trade Finance',
    alertType: 'rapid_movement',
    customerId: 'CUS-67890',
    customerName: 'Mahadev Impex LLP',
    amount: 7800000,
    currency: 'INR',
    timestamp: new Date('2024-01-16T09:00:00'),
    status: 'sent_to_maps',
    rawPayload: { velocity: 'critical', period: '12h', iec_code: 'AAACM****X' },
    mapsScore: 88,
    riskLevel: 'high',
    riskDrivers: ['Rapid fund movement', 'High-risk jurisdiction (Dubai)', 'Trade mispricing signals'],
    slaDeadline: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
  },
  // Sunrise Logistics India Pvt Ltd - 3 alerts (High priority customer)
  {
    ...mockRawAlerts[3],
    mapsScore: 85,
    riskLevel: 'high',
    riskDrivers: ['Rapid fund movement', 'New account activity spike', 'Cross-border layering via Singapore'],
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
  },
  {
    id: 'ALT-2024-001246',
    sourceSystem: 'Wire Transfer',
    alertType: 'structuring',
    customerId: 'CUS-23456',
    customerName: 'Sunrise Logistics India Pvt Ltd',
    amount: 980000,
    currency: 'INR',
    timestamp: new Date('2024-01-16T11:30:00'),
    status: 'sent_to_maps',
    rawPayload: { pattern: 'round_amounts', ctr_threshold: '₹10,00,000' },
    mapsScore: 68,
    riskLevel: 'medium',
    riskDrivers: ['Structuring pattern below ₹10L CTR threshold', 'Round amount transactions'],
    slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours
  },
  {
    id: 'ALT-2024-001250',
    sourceSystem: 'Core Banking',
    alertType: 'behavior_deviation',
    customerId: 'CUS-23456',
    customerName: 'Sunrise Logistics India Pvt Ltd',
    amount: 1250000,
    currency: 'INR',
    timestamp: new Date('2024-01-17T08:00:00'),
    status: 'sent_to_maps',
    rawPayload: { deviation_score: 0.72, branch: 'DEL-CP-002' },
    mapsScore: 58,
    riskLevel: 'low',
    riskDrivers: ['Behavior deviation from declared turnover', 'Profile mismatch'],
    slaDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours
  },
  // Amit Verma - 2 alerts (Medium priority customer)
  {
    ...mockRawAlerts[1],
    mapsScore: 72,
    riskLevel: 'medium',
    riskDrivers: ['Structuring pattern detected', 'Just-below ₹10L CTR threshold transactions'],
    slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
  },
  {
    id: 'ALT-2024-001247',
    sourceSystem: 'Card Monitoring',
    alertType: 'geo_anomaly',
    customerId: 'CUS-45123',
    customerName: 'Amit Verma',
    amount: 285000,
    currency: 'INR',
    timestamp: new Date('2024-01-16T14:00:00'),
    status: 'sent_to_maps',
    rawPayload: { locations: ['AE', 'SG', 'UK'] },
    mapsScore: 55,
    riskLevel: 'low',
    riskDrivers: ['Geo-location anomaly - Dubai, Singapore', 'Travel pattern inconsistent with profile'],
    slaDeadline: new Date(Date.now() + 40 * 60 * 60 * 1000), // 40 hours
  },
  // Bharat Metals & Minerals Ltd - 1 alert (Medium priority customer)
  {
    ...mockRawAlerts[0],
    mapsScore: 65,
    riskLevel: 'medium',
    riskDrivers: ['Large cash deposit approaching ₹10L CTR', 'Business profile mismatch'],
    slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
  // Neha Iyer - 1 alert (Low priority customer)
  {
    ...mockRawAlerts[2],
    mapsScore: 45,
    riskLevel: 'low',
    riskDrivers: ['Geo-location anomaly - UAE, Singapore, HK', 'Customer travel history unclear'],
    slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  },
];

// Mock cases - Indian context
export const mockCases: Case[] = [
  // ===========================================================================
  // USE CASE 2: INVESTMENT FRAUD / PONZI SCHEME - Case for Dr. Ravi Gopal Kumar
  // ===========================================================================
  {
    id: 'CASE-PONZI-2025-001',
    linkedAlerts: ['ALT-PZ-2025-001', 'ALT-PZ-2025-002', 'ALT-PZ-2025-003', 'ALT-PZ-2025-004'],
    customerId: 'CUS-DRK-3401',
    customerName: 'Dr. Ravi Gopal Kumar',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'in_progress',
    strStatus: 'DRAFT',
    createdAt: new Date('2025-10-28'),
    updatedAt: new Date('2025-10-29T10:00:00'),
    slaDeadline: new Date(Date.now() + 20 * 60 * 60 * 1000), // 20 hours
    totalAmount: 95000000, // ₹9.5 Crore aggregate
    currency: 'INR',
    notes: [
      {
        id: 'note-pz-001',
        authorId: 'usr-002',
        authorName: 'Arjun Mehta',
        content: 'Investment Fraud / Ponzi Scheme typology confirmed. Dr. Ravi Gopal Kumar, a reputable cardiologist, received ₹1.5 Crore from 12 unrelated investors via RTGS/NEFT with memos like "Fund Commitment" and "Seed Capital". Funds rapidly transferred to related LLP (R.K. Health Investment LLP) within 72 hours. Cyclical "Quarterly Profit Share" payouts of ₹75L+ returned to original investors on 45-day cycles. ₹50L luxury real estate purchase in Goa indicates integration phase.',
        timestamp: new Date('2025-10-28T14:30:00'),
      },
      {
        id: 'note-pz-002',
        authorId: 'usr-002',
        authorName: 'Arjun Mehta',
        content: 'Note: No SEBI registration found for any investment scheme operated by Dr. Kumar or R.K. Health Investment LLP. LLP declared business activity as "Consulting" which is inconsistent with investment fund collection.',
        timestamp: new Date('2025-10-29T10:00:00'),
      },
    ],
    documents: [],
  },
  // ===========================================================================
  // USE CASE 4: MONEY MULE / FUNNEL ACCOUNT - Case for Priya V. Sharma
  // ===========================================================================
  {
    id: 'CASE-MM-2026-001',
    linkedAlerts: ['ALT-MM-2026-001', 'ALT-MM-2026-002', 'ALT-MM-2026-003'],
    customerId: 'CUS-PS-1995',
    customerName: 'Priya V. Sharma',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'in_progress',
    strStatus: 'DRAFT',
    createdAt: new Date('2026-02-02'),
    updatedAt: new Date('2026-02-02T14:30:00'),
    slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    totalAmount: 1200000,
    currency: 'INR',
    notes: [
      {
        id: 'note-mm-001',
        authorId: 'usr-002',
        authorName: 'Arjun Mehta',
        content: 'Money Mule / Funnel Account typology confirmed. Homemaker with zero declared income received ₹12,00,000 from 8 unrelated individuals across India within 10 days. ₹10,00,000 transferred to Cyprus-based entity within 48 hours of last deposit.',
        timestamp: new Date('2026-02-02T14:30:00'),
      },
    ],
    documents: [],
  },
  {
    id: 'CASE-2024-0089',
    linkedAlerts: ['ALT-2024-001198', 'ALT-2024-001199'],
    customerId: 'CUS-34521',
    customerName: 'Shree Ganesh Traders',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'in_progress',
    strStatus: 'DRAFT',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-11T10:30:00'),
    slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    totalAmount: 34500000,
    currency: 'INR',
    notes: [
      {
        id: 'note-001',
        authorId: 'usr-002',
        authorName: 'Arjun Mehta',
        content: 'Initial review completed. Multiple shell company connections identified via Dubai and Singapore.',
        timestamp: new Date('2024-01-11T10:30:00'),
      },
    ],
    documents: [],
  },
  {
    id: 'CASE-2024-0090',
    linkedAlerts: ['ALT-2024-001201'],
    customerId: 'CUS-78901',
    customerName: 'Rahul Sharma',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'str_draft',
    strStatus: 'APPROVED',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
    slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000),
    totalAmount: 8900000,
    currency: 'INR',
    notes: [],
    documents: [],
  },
  {
    id: 'CASE-2024-0091',
    linkedAlerts: ['ALT-2024-001205', 'ALT-2024-001206', 'ALT-2024-001207'],
    customerId: 'CUS-45678',
    customerName: 'ABC Exports Pvt Ltd',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'under_review',
    strStatus: 'APPROVED',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08'),
    slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // Overdue
    totalAmount: 56700000,
    currency: 'INR',
    notes: [],
    documents: [],
  },
  {
    id: 'CASE-2024-0092',
    linkedAlerts: ['ALT-2024-001210'],
    customerId: 'CUS-11234',
    customerName: 'Suresh Patel',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'closed',
    strStatus: 'REJECTED',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    slaDeadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    totalAmount: 1250000,
    currency: 'INR',
    notes: [],
    documents: [],
  },
  {
    id: 'CASE-2024-0093',
    linkedAlerts: ['ALT-2024-001215'],
    customerId: 'CUS-55678',
    customerName: 'Ankit Gupta Enterprises',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'closed',
    strStatus: 'SUBMITTED',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    slaDeadline: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    totalAmount: 23400000,
    currency: 'INR',
    notes: [],
    documents: [],
  },
  {
    id: 'CASE-2024-0094',
    linkedAlerts: ['ALT-2024-001220'],
    customerId: 'CUS-99012',
    customerName: 'Krishna Trading Corp',
    investigatorId: 'usr-002',
    investigatorName: 'Arjun Mehta',
    status: 'open',
    strStatus: null,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    totalAmount: 5600000,
    currency: 'INR',
    notes: [],
    documents: [],
  },
];

// Mock STR drafts - Indian regulatory context
export const mockSTRDrafts: STRDraft[] = [
  // ===========================================================================
  // USE CASE 2: INVESTMENT FRAUD / PONZI SCHEME - STR Draft for Dr. Ravi Gopal Kumar
  // ===========================================================================
  {
    id: 'STR-PZ-2025-001',
    caseId: 'CASE-PONZI-2025-001',
    status: 'draft',
    groundsOfSuspicion: '',
    transactionNarrative: '',
    customerProfile: '',
    riskRationale: '',
    aiGenerated: {
      groundsOfSuspicion: false,
      transactionNarrative: false,
      customerProfile: false,
      riskRationale: false,
    },
    changes: [],
    investigatorComments: '',
  },
  // ===========================================================================
  // USE CASE 4: MONEY MULE / FUNNEL ACCOUNT - STR Draft for Priya V. Sharma
  // ===========================================================================
  {
    id: 'STR-MM-2026-001',
    caseId: 'CASE-MM-2026-001',
    status: 'draft',
    groundsOfSuspicion: '',
    transactionNarrative: '',
    customerProfile: '',
    riskRationale: '',
    aiGenerated: {
      groundsOfSuspicion: false,
      transactionNarrative: false,
      customerProfile: false,
      riskRationale: false,
    },
    changes: [],
    investigatorComments: '',
  },
  {
    id: 'STR-2024-0045',
    caseId: 'CASE-2024-0091',
    status: 'pending_po_review',
    groundsOfSuspicion: 'Multiple high-value transactions with suspected shell companies in UAE and Singapore. Pattern consistent with trade-based money laundering through over/under invoicing of goods. Transactions structured to avoid ₹10,00,000 CTR threshold.',
    transactionNarrative: 'Between January 2024 and present, the subject conducted 47 wire transfers totaling ₹5,67,00,000 to entities in UAE, Singapore, and Hong Kong. Transaction amounts consistently maintained just below ₹10,00,000 reporting thresholds.',
    customerProfile: 'ABC Exports Pvt Ltd is a registered trading company (CIN: U51909MH2018PTC******) with declared annual turnover of ₹2,00,00,000. Actual transaction volume exceeds declared business activity by 280%.',
    riskRationale: 'High-risk indicators: (1) Transactions with suspected shell companies, (2) Use of high-risk jurisdictions (UAE, Singapore), (3) Structuring patterns below CTR threshold, (4) Business activity inconsistent with declared turnover in PAN/GST filings.',
    aiGenerated: {
      groundsOfSuspicion: true,
      transactionNarrative: true,
      customerProfile: true,
      riskRationale: true,
    },
    changes: [],
    investigatorComments: 'Recommend immediate filing with FIU-IND. Clear TBML pattern established.',
  },
];

// Note: mockCustomerKYC is defined earlier in file (line 368) using mockExtendedCustomerProfiles
// This section intentionally removed to avoid duplicate declarations

// Note: mockTransactions is defined earlier in file (line 369) using mockTransactionsByCustomer
// This section intentionally removed to avoid duplicate declarations

// Mock audit entries - Indian context
export const mockAuditEntries: AuditEntry[] = [
  // ===========================================================================
  // USE CASE 2: INVESTMENT FRAUD / PONZI SCHEME - Audit Trail
  // ===========================================================================
  {
    id: 'AUD-PZ-001',
    entityType: 'alert',
    entityId: 'ALT-PZ-2025-001',
    action: 'Alert created - High-Value Third-Party Inflows',
    performedBy: 'System',
    performedAt: new Date('2025-07-30T09:00:00'),
    details: 'Auto-generated: ₹1.5 Crore inflows from 12 unrelated investors with "Fund Commitment" / "Seed Capital" memos',
    modelVersion: 'FinCrisS-v2.4.0',
  },
  {
    id: 'AUD-PZ-002',
    entityType: 'alert',
    entityId: 'ALT-PZ-2025-002',
    action: 'Alert created - Related Party Layering',
    performedBy: 'System',
    performedAt: new Date('2025-07-30T10:30:00'),
    details: 'Auto-generated: Rapid ₹1.5 Crore internal transfer to R.K. Health Investment LLP within 72 hours',
    modelVersion: 'FinCrisS-v2.4.0',
  },
  {
    id: 'AUD-PZ-003',
    entityType: 'alert',
    entityId: 'ALT-PZ-2025-003',
    action: 'Alert created - Ponzi/Cyclical Payments',
    performedBy: 'System',
    performedAt: new Date('2025-09-20T11:00:00'),
    details: 'Auto-generated: Cyclical "Quarterly Profit Share" payouts to original investors on 45-day cycle',
    modelVersion: 'FinCrisS-v2.4.0',
  },
  {
    id: 'AUD-PZ-004',
    entityType: 'alert',
    entityId: 'ALT-PZ-2025-004',
    action: 'Alert created - Luxury Asset Purchase',
    performedBy: 'System',
    performedAt: new Date('2025-10-26T14:00:00'),
    details: 'Auto-generated: ₹50L real estate purchase in Goa funded via business LLP account',
    modelVersion: 'FinCrisS-v2.4.0',
  },
  {
    id: 'AUD-PZ-005',
    entityType: 'case',
    entityId: 'CASE-PONZI-2025-001',
    action: 'Case created',
    performedBy: 'Arjun Mehta',
    performedAt: new Date('2025-10-28T14:00:00'),
    details: 'Created from 4 linked alerts: ALT-PZ-2025-001 to 004 (Investment Fraud / Ponzi Scheme typology)',
  },
  {
    id: 'AUD-PZ-006',
    entityType: 'str',
    entityId: 'STR-PZ-2025-001',
    action: 'STR Draft initiated',
    performedBy: 'Arjun Mehta',
    performedAt: new Date('2025-10-28T14:30:00'),
    details: 'FIU-IND SBA01 template selected for Investment Fraud / Ponzi Scheme filing',
  },
  // ===========================================================================
  // USE CASE 4: MONEY MULE / FUNNEL ACCOUNT - Audit Trail
  // ===========================================================================
  {
    id: 'AUD-MM-001',
    entityType: 'alert',
    entityId: 'ALT-MM-2026-001',
    action: 'Alert created - Profile Deviation',
    performedBy: 'System',
    performedAt: new Date('2026-02-02T09:00:00'),
    details: 'Auto-generated: Zero income homemaker profile vs ₹12,00,000 inflows from 8 unrelated parties',
    modelVersion: 'FinCrisS-v2.4.0',
  },
  {
    id: 'AUD-MM-002',
    entityType: 'alert',
    entityId: 'ALT-MM-2026-002',
    action: 'Alert created - Velocity Anomaly',
    performedBy: 'System',
    performedAt: new Date('2026-02-02T10:30:00'),
    details: 'Auto-generated: 8 deposits in 10 days from geographically dispersed unrelated remitters',
    modelVersion: 'FinCrisS-v2.4.0',
  },
  {
    id: 'AUD-MM-003',
    entityType: 'alert',
    entityId: 'ALT-MM-2026-003',
    action: 'Alert created - High-Risk Jurisdiction Transfer',
    performedBy: 'System',
    performedAt: new Date('2026-02-02T11:00:00'),
    details: 'Auto-generated: ₹10,00,000 SWIFT to Cyprus within 48 hours of inflow aggregation',
    modelVersion: 'FinCrisS-v2.4.0',
  },
  {
    id: 'AUD-MM-004',
    entityType: 'case',
    entityId: 'CASE-MM-2026-001',
    action: 'Case created',
    performedBy: 'Arjun Mehta',
    performedAt: new Date('2026-02-02T14:00:00'),
    details: 'Created from 3 linked alerts: ALT-MM-2026-001, ALT-MM-2026-002, ALT-MM-2026-003 (Money Mule typology)',
  },
  {
    id: 'AUD-MM-005',
    entityType: 'str',
    entityId: 'STR-MM-2026-001',
    action: 'STR Draft initiated',
    performedBy: 'Arjun Mehta',
    performedAt: new Date('2026-02-02T14:30:00'),
    details: 'FIU-IND SBA01 template selected for Money Mule / Funnel Account filing',
  },
  // Other audit entries
  {
    id: 'AUD-001',
    entityType: 'alert',
    entityId: 'ALT-2024-001238',
    action: 'Alert created from Core Banking feed',
    performedBy: 'System',
    performedAt: new Date('2024-01-15T16:00:00'),
    details: 'Auto-ingested from trade finance monitoring - IEC flagged entity',
    modelVersion: 'FinCrisS-v2.3.1',
  },
  {
    id: 'AUD-002',
    entityType: 'alert',
    entityId: 'ALT-2024-001238',
    action: 'FinCrisS processing completed',
    performedBy: 'System',
    performedAt: new Date('2024-01-15T16:05:00'),
    details: 'Risk score: 92, Priority: High, CTR threshold analysis completed',
    modelVersion: 'FinCrisS-v2.3.1',
  },
  {
    id: 'AUD-003',
    entityType: 'case',
    entityId: 'CASE-2024-0089',
    action: 'Case created',
    performedBy: 'Arjun Mehta',
    performedAt: new Date('2024-01-10T09:00:00'),
    details: 'Created from alerts ALT-2024-001198, ALT-2024-001199',
  },
  {
    id: 'AUD-004',
    entityType: 'str',
    entityId: 'STR-2024-0045',
    action: 'STR Draft initiated',
    performedBy: 'Arjun Mehta',
    performedAt: new Date('2024-01-08T14:30:00'),
    details: 'FIU-IND SBA01 template selected, narrative generation started',
  },
];
