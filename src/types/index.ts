// User roles for the AML platform
export type UserRole = 'analyst' | 'investigator' | 'principal_officer' | 'compliance' | 'super_admin' | 'triage_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions?: string[]; // 'resource:action' strings from /auth/me
}

// Alert types
export type AlertType = 'large_cash' | 'structuring' | 'rapid_movement' | 'geo_anomaly' | 'behavior_deviation' | 'smurfing';
export type AlertStatus = 'new' | 'in_review' | 'sent_to_maps' | 'dropped' | 'case_created';
export type WorkflowStatus = 'NEW' | 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'DISMISSED';
export type RiskLevel = 'high' | 'medium' | 'low';
export type UserPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

// Queue types for operational routing (not risk-based)
export type QueueType = 
  | 'default_aml' 
  | 'pep_sanctions' 
  | 'high_value' 
  | 'cash_structuring' 
  | 'trade_based' 
  | 'behavioral_anomaly';

export interface RawAlert {
  id: string;
  sourceSystem: string;
  alertType: AlertType;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  timestamp: Date;
  status: AlertStatus;
  rawPayload: Record<string, unknown>;
}

export interface PrioritizedAlert extends RawAlert {
  mapsScore: number;
  riskLevel: RiskLevel;
  riskDrivers: string[];
  slaDeadline: Date;
  assignedTo?: string;
  workflowStatus?: WorkflowStatus;
  userPriority?: UserPriority;
  userPriorityReason?: string;
}

// Customer group with overrides
export interface CustomerGroupOverrides {
  customerId: string;
  userPriority: UserPriority;
  userPriorityReason?: string;
  userPriorityCategory?: string;
  userPriorityChangedBy?: string;
  userPriorityChangedAt?: Date;
  assignedAnalystId?: string;
  assignedAnalystName?: string;
  assignedAt?: Date;
  assignedBy?: string;
  // Queue Type for operational routing
  queueType?: QueueType;
  queueTypeChangedBy?: string;
  queueTypeChangedAt?: Date;
}

// Audit log entry for workbench actions
export interface WorkbenchAuditEntry {
  id: string;
  customerId: string;
  action: 'priority_change' | 'analyst_assignment' | 'analyst_reassignment' | 'raw_payload_viewed' | 'queue_change';
  performedBy: string;
  performedAt: Date;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  category?: string;
}

// Case types
// Backend cases.status, lowercased.
export type CaseStatus = 'open' | 'in_progress' | 'str_draft' | 'under_review' | 'closed' | 'closed_false_positive';

// Backend strs.status of the case's latest STR (null when none exists).
export type CaseStrStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUBMITTED';

export interface Case {
  id: string;
  caseNumber?: string;
  // The alert whose escalation created this case.
  alertId?: string;
  title?: string;
  linkedAlerts: string[];
  linkedAlertDetails?: CaseLinkedAlert[];
  customerId: string;
  customerName: string;
  investigatorId?: string;
  investigatorName?: string;
  assignedTo?: string;
  assignedToUserId?: number;
  status: CaseStatus;
  priority?: RiskLevel;
  priorityScore?: number;
  ruleScore?: number;
  mlScore?: number;
  strStatus?: CaseStrStatus | null;
  summary?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  slaDeadline: Date;
  totalAmount: number;
  currency: string;
  notes: CaseNote[];
  documents: CaseDocument[];
  description?: string;
  alertsCount?: number;
  // System findings frozen at escalation time — won't drift if the source
  // alert is later rescored. Undefined for cases escalated before this
  // existed with no matching backfill.
  frozenFindings?: CaseFindings;
  // Transactions linked to the case's alert(s), frozen at escalation /
  // attach-alert time (each alert maps to one transaction; a case can have
  // several alerts).
  transactions: CaseTransaction[];
  // Live scoring context from the case's primary alert (currently reflects
  // the alert's present state, unlike frozenFindings).
  alertType?: string;
  severity?: string;
  scenarioCode?: string;
  alertDate?: Date;
  // Customer risk context, live-joined (not frozen).
  customerRiskRating?: string;
  customerIsPep?: boolean;
  customerNationality?: string;
  customerIndustryCode?: string;
  customerOccupation?: string;
  customerSince?: string;
  customerType?: string;
  // Latest behavioural snapshot for the customer (the "observed" profile).
  customerFeatures?: Record<string, number | string | null> | null;
  // Cached AI summary of the originating alert, if one was generated.
  alertAiSummary?: {
    alertSummary: string;
    riskSignals: { signal: string; description: string }[];
    profileAnalysis: string;
    model?: string;
    generatedAt?: Date;
  } | null;
}

export interface CaseFindings {
  ruleScore?: number;
  ruleReasons?: Record<string, unknown> | unknown[];
  mlScore?: number;
  priorityScore?: number;
  explanation?: string;
  modelVersion?: string;
  sourceAlertId?: string;
  frozenAt?: Date;
}

export interface CaseTransaction {
  transId: string;
  accountId?: string;
  customerId?: string;
  date: Date;
  amount: number;
  currency: string;
  transType?: string;
  description?: string;
  counterpartyId?: string;
  country?: string;
  channel?: string;
  sourceAlertId?: string;
}

export interface CaseLinkedAlert {
  alertId: string;
  alertType?: string;
  amount?: number;
  currency?: string;
  alertDate?: Date;
  priorityScore?: number;
  priorityLevel?: string;
  ruleReasons?: Record<string, unknown> | unknown[];
  workflowStatus?: string;
  linkedAt?: Date;
}

export interface CaseNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export interface CaseDocument {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

// STR types
export type STRStatus = 'draft' | 'pending_po_review' | 'approved' | 'rejected' | 'submitted';

export interface STRDraft {
  id: string;
  caseId: string;
  status: STRStatus;
  groundsOfSuspicion: string;
  transactionNarrative: string;
  customerProfile: string;
  riskRationale: string;
  aiGenerated: {
    groundsOfSuspicion: boolean;
    transactionNarrative: boolean;
    customerProfile: boolean;
    riskRationale: boolean;
  };
  changes: STRChange[];
  investigatorComments: string;
  poComments?: string;
  submittedAt?: Date;
  fiuReference?: string;
}

export interface STRChange {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: Date;
}

// Customer data
export interface CustomerKYC {
  id: string;
  name: string;
  type: 'individual' | 'corporate';
  riskRating: RiskLevel;
  occupation?: string;
  industry?: string;
  declaredIncome: number;
  actualTurnover: number;
  accountAge: number;
  nationality: string;
  pep: boolean;
  sanctions: boolean;
  // Extended KYC fields
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  idExpiry?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  onboardingDate?: string;
  lastKYCReview?: string;
  nextKYCReview?: string;
  sourceOfWealth?: string;
  sourceOfFunds?: string;
  expectedTurnover?: string;
}

// Extended customer data for Customer 360 view
export interface CustomerRiskHistory {
  date: string;
  rating: RiskLevel;
  reason: string;
}

export interface CustomerDocument {
  name: string;
  status: 'verified' | 'pending' | 'expired';
  date: string;
}

export interface CustomerScreening {
  lastScreened: string;
  status: 'hit' | 'clear';
  details: string;
}

export interface CustomerAccount {
  id: string;
  type: string;
  currency: string;
  status: 'active' | 'dormant' | 'frozen';
  balance: number;
}

export interface RelatedEntity {
  id: string;
  name: string;
  relationship: string;
  jurisdiction: string;
  flagged: boolean;
}

export interface CommonIdentifier {
  type: string;
  value: string;
  sharedWith: string[];
}

export interface PriorAlert {
  id: string;
  date: Date;
  type: string;
  riskLevel: RiskLevel;
  resolution: string;
  caseId?: string;
  resolvedBy: string;
}

export interface PriorCase {
  id: string;
  date: Date;
  linkedAlerts: number;
  status: string;
  outcome: string;
  strId?: string;
  investigator: string;
}

export interface PriorSTR {
  id: string;
  filedDate: Date;
  fiuReference: string;
  amount: number;
  status: string;
  filedBy: string;
}

export interface InvestigatorNote {
  id: string;
  author: string;
  role: string;
  date: Date;
  content: string;
}

// Extended customer profile combining KYC with history
export interface ExtendedCustomerProfile {
  kyc: CustomerKYC;
  riskRatingHistory: CustomerRiskHistory[];
  documents: CustomerDocument[];
  pepScreening: CustomerScreening;
  sanctionsScreening: CustomerScreening;
  accounts: CustomerAccount[];
  relatedEntities: RelatedEntity[];
  commonIdentifiers: CommonIdentifier[];
  priorAlerts: PriorAlert[];
  priorCases: PriorCase[];
  priorSTRs: PriorSTR[];
  investigatorNotes: InvestigatorNote[];
}

// Transaction data
export interface Transaction {
  id: string;
  date: Date;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  counterparty: string;
  channel: string;
  country: string;
  description: string;
}

// Audit types
export interface AuditEntry {
  id: string;
  entityType: 'alert' | 'case' | 'str';
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: Date;
  details: string;
  modelVersion?: string;
}
