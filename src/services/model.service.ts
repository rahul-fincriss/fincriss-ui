import api from '@/lib/api-client';

export type ModelVersionStatus = 'CANDIDATE' | 'ACTIVE' | 'RETIRED' | 'REJECTED';

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface EvaluationMetrics {
  samples: number;
  rocAuc: number | null;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: ConfusionMatrix;
}

export interface ValidationMetrics {
  decisionThreshold: number;
  testSet: EvaluationMetrics;
  /** Test samples labelled by investigators, excluding heuristic labels. */
  testSetAnalystOnly: EvaluationMetrics | null;
  candidatesRocAuc: Record<string, number>;
  trainSamples: number;
}

export interface TrainingData {
  totalSamples: number;
  truePositive: number;
  falsePositive: number;
  analystLabelled: number;
  heuristicLabelled: number;
  bySource: Record<string, Record<string, number>>;
}

export interface ModelVersion {
  version: string;
  status: ModelVersionStatus;
  modelType?: string;
  s3ModelKey?: string;
  sklearnVersion?: string;
  featureCols: string[];
  /** null = not recorded at training time. */
  metrics: ValidationMetrics | null;
  featureImportance: { feature: string; importance: number }[];
  trainingData: TrainingData | null;
  trainedAt?: Date;
  reason?: string;
  requestedByName?: string;
  requestedAt?: Date;
  approvedByName?: string;
  approvedAt?: Date;
  decisionNote?: string;
  activatedAt?: Date;
  retiredAt?: Date;
}

export interface ModelStatus {
  ruleWeight: number;
  mlWeight: number;
  highThreshold: number;
  mediumThreshold: number;
  metadataSource: string;
  activeVersion: ModelVersion | null;
}

export interface BandOutcome {
  band: 'HIGH' | 'MEDIUM' | 'LOW';
  alerts: number;
  confirmedSuspicious: number;
  falsePositive: number;
  undecided: number;
  /** Confirmed ÷ decided; null when nothing in the band has been decided. */
  confirmedRate: number | null;
}

export interface ModelMonitoring {
  totalAlerts: number;
  /** Share of alerts in the period created by the synthetic data seeder. */
  syntheticShare: number | null;
  bands: BandOutcome[];
  scoreDistribution: { from: number; to: number; alerts: number }[];
  thresholds: { high: number; medium: number };
  monthly: {
    month: string;
    alerts: number;
    avgPriorityScore: number | null;
    high: number;
    medium: number;
    low: number;
    confirmedSuspicious: number;
    falsePositive: number;
  }[];
  scoredBy: { modelVersion: string; alerts: number }[];
  dismissalReasons: { reason: string; alerts: number }[];
  labelsBySource: Record<string, { TRUE_POSITIVE: number; FALSE_POSITIVE: number }>;
  investigatorLabelsSinceActiveModel: number;
}

const toDate = (v: any): Date | undefined => (v ? new Date(v) : undefined);

function mapEval(m: any): EvaluationMetrics | null {
  if (!m) return null;
  return {
    samples: Number(m.samples),
    rocAuc: m.roc_auc ?? null,
    accuracy: Number(m.accuracy),
    precision: Number(m.precision),
    recall: Number(m.recall),
    f1: Number(m.f1),
    confusionMatrix: m.confusion_matrix,
  };
}

export function mapVersion(v: any): ModelVersion {
  const m = v.metrics;
  const t = v.training_data;
  return {
    version: v.version,
    status: v.status,
    modelType: v.model_type ?? undefined,
    s3ModelKey: v.s3_model_key ?? undefined,
    sklearnVersion: v.sklearn_version ?? undefined,
    featureCols: Array.isArray(v.feature_cols) ? v.feature_cols : [],
    metrics: m
      ? {
          decisionThreshold: Number(m.decision_threshold ?? 0.5),
          testSet: mapEval(m.test_set)!,
          testSetAnalystOnly: mapEval(m.test_set_analyst_labels_only),
          candidatesRocAuc: m.candidates_roc_auc || {},
          trainSamples: Number(m.train_samples ?? 0),
        }
      : null,
    featureImportance: Array.isArray(v.feature_importance) ? v.feature_importance : [],
    trainingData: t
      ? {
          totalSamples: t.total_samples,
          truePositive: t.true_positive,
          falsePositive: t.false_positive,
          analystLabelled: t.analyst_labelled,
          heuristicLabelled: t.heuristic_labelled,
          bySource: t.by_source || {},
        }
      : null,
    trainedAt: toDate(v.trained_at),
    reason: v.reason ?? undefined,
    requestedByName: v.requested_by_name ?? undefined,
    requestedAt: toDate(v.requested_at),
    approvedByName: v.approved_by_name ?? undefined,
    approvedAt: toDate(v.approved_at),
    decisionNote: v.decision_note ?? undefined,
    activatedAt: toDate(v.activated_at),
    retiredAt: toDate(v.retired_at),
  };
}

export function mapMonitoring(d: any): ModelMonitoring {
  return {
    totalAlerts: d.total_alerts,
    syntheticShare: d.synthetic_share ?? null,
    bands: (d.bands || []).map((b: any) => ({
      band: b.band,
      alerts: b.alerts,
      confirmedSuspicious: b.confirmed_suspicious,
      falsePositive: b.false_positive,
      undecided: b.undecided,
      confirmedRate: b.confirmed_rate ?? null,
    })),
    scoreDistribution: d.score_distribution || [],
    thresholds: d.thresholds,
    monthly: (d.monthly || []).map((m: any) => ({
      month: m.month,
      alerts: m.alerts,
      avgPriorityScore: m.avg_priority_score,
      high: m.high,
      medium: m.medium,
      low: m.low,
      confirmedSuspicious: m.confirmed_suspicious,
      falsePositive: m.false_positive,
    })),
    scoredBy: (d.scored_by || []).map((s: any) => ({ modelVersion: s.model_version, alerts: s.alerts })),
    dismissalReasons: d.dismissal_reasons || [],
    labelsBySource: d.labels_by_source || {},
    investigatorLabelsSinceActiveModel: d.investigator_labels_since_active_model ?? 0,
  };
}

export const modelService = {
  async getStatus(): Promise<ModelStatus> {
    const { data } = await api.get('/api/model/status');
    return {
      ruleWeight: data.rule_weight,
      mlWeight: data.ml_weight,
      highThreshold: data.high_priority_threshold,
      mediumThreshold: data.medium_priority_threshold,
      metadataSource: data.metadata_source,
      activeVersion: data.active_version ? mapVersion(data.active_version) : null,
    };
  },

  async listVersions(): Promise<ModelVersion[]> {
    const { data } = await api.get('/api/model/versions');
    return (data.versions || []).map(mapVersion);
  },

  async getMonitoring(from?: string, to?: string): Promise<ModelMonitoring> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await api.get('/api/model/monitoring', { params });
    return mapMonitoring(data);
  },
};
