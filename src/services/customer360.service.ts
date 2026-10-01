import api from '@/lib/api-client';

// ── List endpoint types ──────────────────────────────────────────────
export interface Customer360Summary {
  customer_id: string;
  full_name: string;
  display_name?: string;
  party_type: string;
  risk_rating: string;
  risk_score_numeric?: number;
  customer_status?: string;
  customer_segment?: string;
  is_pep: boolean;
  customer_since?: string;
  date_of_birth?: string;
  nationality?: string;
  relationship_manager?: string;
  branch?: string;
  // Derived from /360 when available; not on list endpoint
  kyc_status?: string;
  is_watchlisted?: boolean;
  open_alerts_count?: number;
  active_cases_count?: number;
  sanctions_hits?: number;
}

// ── Normalized profile consumed by all tab components ────────────────
export interface Customer360Profile {
  customer_id: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  display_name?: string;
  aliases?: any[];
  party_type: string;
  date_of_birth?: string;
  incorporation_date?: string;
  nationality?: string;
  residency_country?: string;
  tax_residency?: string;
  occupation?: string;
  industry?: string;
  industry_code?: string;
  industry_risk_level?: string;
  customer_since?: string;
  customer_status?: string;
  relationship_manager?: string;
  branch?: string;
  gender?: string;
  source_of_funds?: string;
  source_of_wealth?: string;
  annual_income?: number;
  expected_turnover?: number;
  expected_account_activity?: string;

  // Contact
  primary_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pin: string;
    country: string;
  };
  phone_numbers?: { number: string; type: string; verified: boolean }[];
  email_addresses?: { email: string; verified: boolean }[];
  additional_addresses?: { line1: string; city: string; state: string; pin: string; country: string }[];

  // Risk
  risk_score: number;
  risk_rating: string;
  last_risk_assessed?: string;
  risk_rating_history?: { date: string; rating: string; score: number }[];
  next_kyc_review_due?: string;
  is_pep: boolean;
  is_sanctioned: boolean;
  is_watchlisted: boolean;

  // KYC
  kyc_status: string;
  kyc_level?: string;
  onboarding_method?: string;
  cdd_type?: string;
  last_kyc_refresh?: string;
  next_kyc_due?: string;
  relationship_purpose?: string;
  adverse_media_flag?: boolean;
  high_risk_jurisdiction_flag?: boolean;
  declared_income?: number;
  actual_turnover?: number;

  // Stats
  open_alerts_count: number;
  active_cases_count: number;
  sanctions_hits: number;

  // Identity
  government_ids?: {
    type: string;
    id_number: string;
    issuing_country: string;
    expiry_date?: string;
    verification_status: string;
    is_primary?: boolean;
  }[];
  beneficial_owners?: {
    name: string;
    relationship_type: string;
    ownership_pct: number;
    control_pct: number;
    verification_status: string;
    related_customer_id?: string;
    risk_flag?: boolean;
  }[];

  // Accounts
  accounts?: {
    account_id: string;
    account_type: string;
    account_subtype?: string;
    account_number_masked: string;
    balance: number;
    average_balance: number;
    currency: string;
    opened_date: string;
    status: string;
    branch?: string;
    ownership_type?: string;
    account_risk_rating?: string;
  }[];

  // KYC Documents
  kyc_documents?: {
    document_type: string;
    document_number: string;
    issuing_authority: string;
    country: string;
    verification_status: string;
    verification_method: string;
    expiry?: string;
  }[];

  // Risk Assessment History
  risk_assessments?: {
    date: string;
    rating: string;
    score: number;
    previous_rating?: string;
    review_type: string;
    model?: string;
    model_version?: string;
    reviewer?: string;
    rationale?: string;
    risk_factors?: any;
  }[];

  // Screening
  screening_results?: {
    screened_at: string;
    type: string;
    provider: string;
    status: string;
    matched_entity_name?: string;
    list_name?: string;
    match_score?: number;
    jurisdiction?: string;
    analyst_disposition?: string;
    notes?: string;
  }[];
  watchlist_entries?: {
    watchlist_type: string;
    status: string;
    reason: string;
    added_date: string;
    start_date?: string;
    end_date?: string;
    added_by?: string;
  }[];

  // Transactions (from /360 cap of 20)
  transactions?: Customer360Transaction[];

  // Alerts & Cases
  alerts?: {
    alert_id: string;
    date: string;
    scenario: string;
    severity: string;
    amount: number;
    priority_score: number;
    status: string;
    assigned_to?: string;
    rule_score?: number;
    ml_score?: number;
  }[];
  cases?: {
    case_number: string;
    status: string;
    priority: string;
    assigned_investigator?: string;
    opened_date: string;
    closed_date?: string;
    notes?: string;
    alert_id?: string;
  }[];

  // Network
  relationships?: {
    related_customer_id: string;
    related_customer_name: string;
    relationship_type: string;
    strength: string;
    direction: string;
    since_date?: string;
    risk_rating?: string;
    interaction_count?: number;
    total_value?: number;
    suspicious_link_flag?: boolean;
  }[];

  // Regulatory filings
  regulatory_filings?: any[];
}

// ── Transaction types ────────────────────────────────────────────────
export interface Customer360Transaction {
  id: string;
  date: string;
  direction: 'D' | 'C';
  amount: number;
  currency: string;
  type: string;
  description: string;
  reference: string;
  counterparty: string;
  country: string;
  is_suspicious: boolean;
  is_cross_border: boolean;
  is_cash: boolean;
  account_id?: string;
  channel?: string;
}

export interface CustomerAlertSummary {
  alertId: string;
  scenarioCode?: string;
  alertType?: string;
  alertDate?: Date;
  amount?: number;
  currency?: string;
  priorityLevel?: string;
  priorityScore?: number;
  workflowStatus?: string;
}

export interface TransactionsResponse {
  total: number;
  transactions: Customer360Transaction[];
  total_debit: number;
  total_credit: number;
}

// ── Param types ──────────────────────────────────────────────────────
export interface ListCustomersParams {
  search?: string;
  risk_rating?: string;
  party_type?: string;
  customer_status?: string;
  customer_segment?: string;
  is_pep?: boolean;
  limit?: number;
  offset?: number;
}

export interface TransactionsParams {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  account_id?: string;
  cash_only?: boolean;
  cross_border_only?: boolean;
  suspicious_only?: boolean;
}

// ── Normalization helpers ────────────────────────────────────────────

function normalizeAddress(addr: any) {
  if (!addr) return undefined;
  return {
    line1: addr.line_1 || addr.line1 || '',
    line2: [addr.line_2, addr.line_3, addr.street].filter(Boolean).join(', ') || addr.line2,
    city: addr.city || '',
    state: addr.state_province || addr.state || '',
    pin: addr.postal_code || addr.pin || '',
    country: addr.country || '',
  };
}

function normalize360Response(data: any): Customer360Profile {
  const p = data.profile || data;
  const kyc = data.kyc_profile?.kyc_profile || data.kyc_profile || {};
  const latestRisk = data.latest_risk_assessment || {};
  const identifiers = data.identifiers || [];
  const aliases = data.aliases || [];
  const contacts = data.contacts || [];
  const addresses = data.addresses || [];
  const accounts = data.accounts || [];
  const screeningHits = data.screening_hits || [];
  const beneficialOwners = data.beneficial_owners || [];
  const watchlistEntries = data.watchlist_entries || [];
  const recentAlerts = data.recent_alerts || [];
  const recentTxns = data.recent_transactions || [];
  const openCases = data.open_cases || [];
  const riskHistory = data.risk_history || [];
  const documents = data.documents || [];
  const network = data.network || [];
  const filings = data.regulatory_filings || [];

  // Primary address
  const primaryAddr = addresses.find((a: any) => a.is_primary) || addresses[0];
  const otherAddrs = addresses.filter((a: any) => a !== primaryAddr);

  // Contacts
  const phones = contacts.filter((c: any) => ['mobile', 'landline', 'work_phone', 'MOBILE', 'LANDLINE', 'WORK_PHONE'].includes(c.contact_type));
  const emails = contacts.filter((c: any) => ['email', 'work_email', 'EMAIL', 'WORK_EMAIL'].includes(c.contact_type));

  // Compute stats
  const openAlertCount = recentAlerts.filter((a: any) =>
    !['CLOSED_TRUE_POSITIVE', 'CLOSED_FALSE_POSITIVE'].includes(a.workflow_status || a.status)
  ).length;
  const activeCaseCount = openCases.length;
  const sanctionsHitCount = screeningHits.filter((s: any) =>
    s.screening_type === 'sanctions' && s.screening_status !== 'false_positive'
  ).length;

  // Determine flags
  const isWatchlisted = watchlistEntries.some((w: any) => w.status === 'active');
  const isSanctioned = screeningHits.some((s: any) =>
    s.screening_type === 'sanctions' && s.screening_status === 'confirmed_match'
  );

  return {
    customer_id: p.customer_id || data.customer_id,
    full_name: p.full_name || '',
    first_name: p.first_name,
    middle_name: p.middle_name,
    last_name: p.last_name,
    display_name: p.display_name,
    aliases,
    party_type: p.party_type || 'individual',
    date_of_birth: p.date_of_birth,
    incorporation_date: p.incorporation_date,
    nationality: p.nationality,
    residency_country: p.residency_country,
    tax_residency: p.tax_residency,
    occupation: p.occupation || kyc.occupation_or_business,
    industry: kyc.industry || p.industry_code || p.industry,
    industry_code: p.industry_code,
    customer_since: p.customer_since,
    customer_status: p.customer_status,
    relationship_manager: p.relationship_manager,
    branch: p.branch,
    gender: p.gender,
    source_of_funds: p.source_of_funds || kyc.source_of_funds,
    source_of_wealth: p.source_of_wealth || kyc.source_of_wealth,
    annual_income: p.annual_income || kyc.declared_income,
    expected_turnover: p.expected_turnover || kyc.expected_turnover,
    expected_account_activity: p.expected_account_activity,

    // Contact
    primary_address: normalizeAddress(primaryAddr),
    additional_addresses: otherAddrs.map(normalizeAddress).filter(Boolean) as any[],
    phone_numbers: phones.map((c: any) => ({
      number: c.value,
      type: c.contact_type,
      verified: !!c.verified_flag,
    })),
    email_addresses: emails.map((c: any) => ({
      email: c.value,
      verified: !!c.verified_flag,
    })),

    // Risk
    risk_score: latestRisk.risk_score ?? p.risk_score_numeric ?? 0,
    risk_rating: latestRisk.risk_rating || p.risk_rating || 'LOW',
    last_risk_assessed: latestRisk.assessment_date,
    next_kyc_review_due: latestRisk.next_review_due || kyc.next_kyc_due || p.risk_review_date,
    is_pep: !!p.is_pep || !!kyc.pep_flag,
    is_sanctioned: isSanctioned,
    is_watchlisted: isWatchlisted,

    // KYC
    kyc_status: kyc.kyc_status || 'PENDING',
    kyc_level: kyc.kyc_level,
    onboarding_method: kyc.onboarding_method,
    cdd_type: kyc.cdd_type,
    last_kyc_refresh: kyc.last_kyc_refresh || p.kyc_last_updated,
    next_kyc_due: kyc.next_kyc_due || p.risk_review_date,
    relationship_purpose: kyc.relationship_purpose,
    adverse_media_flag: kyc.adverse_media_flag,
    high_risk_jurisdiction_flag: kyc.sanctions_flag,
    declared_income: kyc.declared_income || p.annual_income,
    actual_turnover: kyc.expected_turnover || p.expected_turnover,

    // Stats
    open_alerts_count: openAlertCount,
    active_cases_count: activeCaseCount,
    sanctions_hits: sanctionsHitCount,

    // Identity
    government_ids: identifiers.map((id: any) => ({
      type: id.id_type,
      id_number: id.id_number,
      issuing_country: id.id_issuing_country,
      expiry_date: id.id_expiry_date,
      verification_status: id.verification_status,
      is_primary: id.is_primary,
    })),

    // Beneficial owners
    beneficial_owners: beneficialOwners.map((bo: any) => ({
      name: bo.related_customer_name || bo.external_party_name || 'Unknown',
      relationship_type: bo.relationship_type,
      ownership_pct: bo.ownership_percentage ?? 0,
      control_pct: bo.control_percentage ?? 0,
      verification_status: bo.risk_flag ? 'FLAGGED' : 'VERIFIED',
      related_customer_id: bo.related_customer_id,
      risk_flag: bo.risk_flag,
    })),

    // Accounts
    accounts: accounts.map((acc: any) => ({
      account_id: acc.account_id,
      account_type: acc.account_type,
      account_subtype: acc.account_subtype,
      account_number_masked: acc.account_number_masked,
      balance: acc.balance ?? 0,
      average_balance: acc.average_balance ?? 0,
      currency: acc.currency || 'INR',
      opened_date: acc.opened_date,
      status: acc.status,
      branch: acc.branch,
      ownership_type: acc.ownership_type,
      account_risk_rating: acc.account_risk_rating,
    })),

    // KYC Documents
    kyc_documents: documents.map((d: any) => ({
      document_type: d.document_type,
      document_number: d.document_number,
      issuing_authority: d.issuing_authority || '—',
      country: d.document_country || d.country || 'IN',
      verification_status: d.verification_status,
      verification_method: d.verification_method || '—',
      expiry: d.expiry_date,
    })),

    // Risk assessments
    risk_assessments: (riskHistory.length > 0 ? riskHistory : (latestRisk.assessment_date ? [latestRisk] : [])).map((a: any) => ({
      date: a.assessment_date || a.date,
      rating: a.risk_rating || a.rating,
      score: a.risk_score ?? a.score ?? 0,
      previous_rating: a.previous_rating,
      review_type: a.review_type,
      model: a.model_name || a.model,
      model_version: a.model_version,
      reviewer: a.reviewer,
      rationale: a.rationale,
      risk_factors: a.risk_factors,
    })),

    // Risk rating history (simplified for sparkline)
    risk_rating_history: (riskHistory.length > 0 ? riskHistory : (latestRisk.assessment_date ? [latestRisk] : [])).map((a: any) => ({
      date: a.assessment_date || a.date,
      rating: a.risk_rating || a.rating,
      score: a.risk_score ?? a.score ?? 0,
    })),

    // Screening
    screening_results: screeningHits.map((s: any) => ({
      screened_at: s.screened_at,
      type: (s.screening_type || '').toUpperCase(),
      provider: s.screening_provider || '—',
      status: (s.screening_status || '').toUpperCase().replace(/ /g, '_'),
      matched_entity_name: s.matched_entity_name,
      list_name: s.matched_list_name,
      match_score: s.match_score,
      jurisdiction: s.jurisdiction,
      analyst_disposition: s.analyst_disposition,
      notes: s.notes,
    })),

    // Watchlist
    watchlist_entries: watchlistEntries.map((w: any) => ({
      watchlist_type: w.watchlist_type,
      status: (w.status || '').toUpperCase(),
      reason: w.reason,
      added_date: w.created_at || w.start_date,
      start_date: w.start_date,
      end_date: w.end_date,
      added_by: w.added_by,
    })),

    // Alerts
    alerts: recentAlerts.map((a: any) => ({
      alert_id: a.alert_id,
      date: a.alert_date,
      scenario: a.scenario_code || a.alert_type,
      severity: a.severity,
      amount: a.amount ?? 0,
      priority_score: a.priority_score ?? 0,
      status: a.workflow_status || a.status || 'PENDING',
      assigned_to: a.assigned_to,
      rule_score: a.rule_score,
      ml_score: a.ml_score,
    })),

    // Cases
    cases: openCases.map((c: any) => ({
      case_number: String(c.case_id),
      status: c.status,
      priority: c.priority_level || c.priority || 'MEDIUM',
      assigned_investigator: c.assigned_to,
      opened_date: c.created_at,
      closed_date: c.closed_at,
      notes: c.notes,
      alert_id: c.alert_id,
    })),

    // Network
    relationships: network.map((n: any) => ({
      related_customer_id: n.related_customer_id,
      related_customer_name: n.related_name,
      relationship_type: n.relationship_type,
      strength: n.strength,
      direction: 'BIDIRECTIONAL',
      since_date: n.first_seen,
      risk_rating: n.related_risk_rating,
      interaction_count: n.interaction_count,
      total_value: n.total_value,
      suspicious_link_flag: n.suspicious_link_flag,
    })),

    // Transactions (capped at 20 in /360 response)
    transactions: recentTxns.map(normalizeTransaction),

    // Regulatory filings
    regulatory_filings: filings,
  };
}

function normalizeTransaction(t: any): Customer360Transaction {
  return {
    id: t.trans_id || t.id,
    date: t.trans_date || t.date,
    direction: (t.debit_credit_indicator || t.direction || 'C') as 'D' | 'C',
    amount: t.amount ?? 0,
    currency: t.currency || 'INR',
    type: t.trans_type || t.type || '',
    description: t.description || '',
    reference: t.reference_number || t.reference || '',
    counterparty: t.counterparty_name || t.counterparty || '',
    country: t.country || 'IN',
    is_suspicious: !!t.suspicious_flag || !!t.is_suspicious,
    is_cross_border: !!t.cross_border_flag || !!t.is_cross_border,
    is_cash: !!t.cash_flag || !!t.is_cash,
    account_id: t.account_id,
    channel: t.channel,
  };
}

// ── Service ──────────────────────────────────────────────────────────

export const customer360Service = {
  // List customers (left panel)
  async listCustomers(params: ListCustomersParams = {}): Promise<Customer360Summary[]> {
    const response = await api.get('/api/customers', { params });
    const data = response.data;
    const customers = Array.isArray(data) ? data : (data.customers || data.items || []);
    return customers;
  },

  // Full 360 profile (initial load)
  async getCustomer360(customerId: string): Promise<Customer360Profile> {
    const response = await api.get(`/api/customers/${customerId}/360`);
    return normalize360Response(response.data);
  },

  // Transactions with filters + pagination
  async getTransactions(customerId: string, params: TransactionsParams = {}): Promise<TransactionsResponse> {
    const response = await api.get(`/api/customers/${customerId}/transactions`, { params });
    const data = response.data;
    const txns = (data.transactions || []).map(normalizeTransaction);
    // Compute totals if not provided
    const totalDebit = txns.filter((t: any) => t.direction === 'D').reduce((s: number, t: any) => s + t.amount, 0);
    const totalCredit = txns.filter((t: any) => t.direction === 'C').reduce((s: number, t: any) => s + t.amount, 0);
    return {
      total: data.total ?? txns.length,
      transactions: txns,
      total_debit: data.total_debit ?? totalDebit,
      total_credit: data.total_credit ?? totalCredit,
    };
  },

  // Individual section endpoints for lazy loading / pagination
  async getRiskHistory(customerId: string, limit = 20) {
    const response = await api.get(`/api/customers/${customerId}/risk-history`, { params: { limit } });
    return response.data.risk_history || [];
  },

  async getScreeningResults(customerId: string, params?: { screening_type?: string; screening_status?: string; limit?: number }) {
    const response = await api.get(`/api/customers/${customerId}/screening-results`, { params });
    return response.data.screening_results || [];
  },

  async getDocuments(customerId: string, params?: { document_type?: string; verification_status?: string }) {
    const response = await api.get(`/api/customers/${customerId}/documents`, { params });
    return response.data.documents || [];
  },

  async getAlerts(customerId: string, params?: { severity?: string; limit?: number; offset?: number }) {
    const response = await api.get(`/api/customers/${customerId}/alerts`, { params });
    return response.data;
  },

  /** The customer's alerts, newest first, normalised (workflowStatus is the analyst workflow state). */
  async getAlertHistory(customerId: string, limit = 50): Promise<CustomerAlertSummary[]> {
    const response = await api.get(`/api/customers/${customerId}/alerts`, { params: { limit } });
    return (response.data.alerts || []).map((a: any) => ({
      alertId: a.alert_id,
      scenarioCode: a.scenario_code ?? undefined,
      alertType: a.alert_type ?? undefined,
      alertDate: a.alert_date ? new Date(a.alert_date) : undefined,
      amount: a.amount != null ? Number(a.amount) : undefined,
      currency: a.currency ?? undefined,
      priorityLevel: a.priority_level ?? undefined,
      priorityScore: a.priority_score != null ? Number(a.priority_score) : undefined,
      workflowStatus: a.alert_workflow_status ?? undefined,
    }));
  },

  async getCases(customerId: string, params?: { status?: string }) {
    const response = await api.get(`/api/customers/${customerId}/cases`, { params });
    return response.data.cases || [];
  },

  async getNetwork(customerId: string, params?: { suspicious_only?: boolean }) {
    const response = await api.get(`/api/customers/${customerId}/network`, { params });
    return response.data.network || [];
  },

  async getWatchlistEntries(customerId: string, params?: { active_only?: boolean }) {
    const response = await api.get(`/api/customers/${customerId}/watchlist-entries`, { params });
    return response.data.watchlist_entries || [];
  },

  async getBeneficialOwners(customerId: string, params?: { relationship_type?: string; active_only?: boolean }) {
    const response = await api.get(`/api/customers/${customerId}/beneficial-owners`, { params });
    return response.data.beneficial_owners || [];
  },

  async getDevices(customerId: string) {
    const response = await api.get(`/api/customers/${customerId}/devices`);
    return response.data.devices || [];
  },

  async getRegulatoryFilings(customerId: string, params?: { filing_type?: string; filing_status?: string }) {
    const response = await api.get(`/api/customers/${customerId}/regulatory-filings`, { params });
    return response.data.regulatory_filings || [];
  },
};
