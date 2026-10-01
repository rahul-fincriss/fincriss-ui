// Bank-facing model card text. Wording is pending Rahul's review (plan Q22).
// Facts that change per model version (algorithm, dates, metrics, thresholds,
// weights) are not written here; they come from the API.

export const MODEL_PURPOSE = [
  'The scoring model ranks alerts from the transaction-monitoring system so investigators review the riskiest alerts first.',
  'It prioritises; it does not decide. Every alert is still reviewed by an investigator. No alert is dismissed, closed or reported to the regulator automatically.',
];

export const MODEL_GOVERNANCE = [
  'A new model version is trained only when a Super Admin requests it, with a recorded reason.',
  'It goes live only after a Principal Officer, who is not the requester, approves it.',
  'Every request, decision and change of active version is recorded in the audit trail and in the Version History tab.',
  'When the active model changes, alerts already scored keep their score and the version that produced it. They are not rescored.',
];

export const MODEL_LIMITATIONS = [
  'The model learns from past investigator decisions, so it inherits any bias or inconsistency in those decisions.',
  'Part of the training data is labelled by a heuristic from the customer risk rating, which is also an input to the model. Accuracy on those labels is optimistic, so validation is also reported on investigator-labelled alerts alone.',
  'Customers with little transaction history (for example, newly onboarded customers) give the model less to go on.',
  'The model sees structured data only: no free-text notes, documents, adverse media or external intelligence.',
  'Changes in customer behaviour or alert mix can reduce accuracy over time. The Monitoring tab tracks outcomes by priority band; automated drift detection is not yet in place.',
];

export interface FeatureDescription {
  feature: string;
  label: string;
  description: string;
  group: 'Customer profile' | 'Customer activity' | 'Alert' | 'Rules';
}

// The 24 inputs, in the order train_ml_model.py and the scoring Lambda use.
export const MODEL_FEATURES: FeatureDescription[] = [
  { feature: 'risk_rating_encoded', label: 'Customer risk rating', description: 'KYC risk rating (low to critical)', group: 'Customer profile' },
  { feature: 'is_pep_int', label: 'Politically exposed person', description: 'Whether the customer is a PEP', group: 'Customer profile' },
  { feature: 'industry_encoded', label: 'Industry', description: "Customer's industry code", group: 'Customer profile' },
  { feature: 'customer_age_days', label: 'Relationship age', description: 'Days since onboarding', group: 'Customer profile' },
  { feature: 'txn_count_7d', label: 'Transactions, 7 days', description: 'Number of transactions in the last 7 days', group: 'Customer activity' },
  { feature: 'txn_count_30d', label: 'Transactions, 30 days', description: 'Number of transactions in the last 30 days', group: 'Customer activity' },
  { feature: 'txn_count_90d', label: 'Transactions, 90 days', description: 'Number of transactions in the last 90 days', group: 'Customer activity' },
  { feature: 'avg_amount_7d', label: 'Average amount, 7 days', description: 'Average transaction amount, last 7 days', group: 'Customer activity' },
  { feature: 'avg_amount_30d', label: 'Average amount, 30 days', description: 'Average transaction amount, last 30 days', group: 'Customer activity' },
  { feature: 'avg_amount_90d', label: 'Average amount, 90 days', description: 'Average transaction amount, last 90 days', group: 'Customer activity' },
  { feature: 'max_amount_30d', label: 'Largest amount, 30 days', description: 'Largest single transaction, last 30 days', group: 'Customer activity' },
  { feature: 'amount_stddev_30d', label: 'Amount variability, 30 days', description: 'Standard deviation of amounts, last 30 days', group: 'Customer activity' },
  { feature: 'unique_counterparties_30d', label: 'Counterparties, 30 days', description: 'Distinct counterparties, last 30 days', group: 'Customer activity' },
  { feature: 'countries_count_30d', label: 'Countries, 30 days', description: 'Distinct countries transacted with, last 30 days', group: 'Customer activity' },
  { feature: 'high_risk_country_txns_30d', label: 'High-risk country transactions', description: 'Transactions involving high-risk jurisdictions, last 30 days', group: 'Customer activity' },
  { feature: 'cash_intensive_ratio', label: 'Cash intensity', description: 'Share of activity in cash', group: 'Customer activity' },
  { feature: 'alert_count_30d', label: 'Prior alerts, 30 days', description: 'Alerts on the customer in the last 30 days', group: 'Customer activity' },
  { feature: 'alert_count_90d', label: 'Prior alerts, 90 days', description: 'Alerts on the customer in the last 90 days', group: 'Customer activity' },
  { feature: 'alert_type_encoded', label: 'Alert type', description: 'Scenario type raised by the monitoring system', group: 'Alert' },
  { feature: 'severity_encoded', label: 'Alert severity', description: 'Severity assigned by the monitoring system', group: 'Alert' },
  { feature: 'amount', label: 'Alert amount', description: 'Amount of the alerted transaction', group: 'Alert' },
  { feature: 'hour_of_day', label: 'Hour of day', description: 'When the alert occurred', group: 'Alert' },
  { feature: 'day_of_week', label: 'Day of week', description: 'When the alert occurred', group: 'Alert' },
  { feature: 'rule_score', label: 'Rule score', description: 'Combined score of the AML rules that fired (0 to 100)', group: 'Rules' },
];

export const FEATURE_LABELS: Record<string, string> = Object.fromEntries(
  MODEL_FEATURES.map((f) => [f.feature, f.label]),
);

export const LABEL_SOURCE_NAMES: Record<string, string> = {
  analyst_dismissal: 'Alert dismissed by investigator',
  case_outcome: 'Case closed by investigator',
  str_filed: 'STR filed with the regulator',
  analyst_outcome: 'Historical investigator closure',
  auto_labeler: 'Heuristic (customer risk rating)',
};
