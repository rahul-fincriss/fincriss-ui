import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api-client';
import { modelService } from './model.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;

const evalSet = (auc: number | null) => ({
  samples: 19, roc_auc: auc, accuracy: 0.42, precision: 0.47, recall: 0.7, f1: 0.56,
  confusion_matrix: { tn: 1, fp: 8, fn: 3, tp: 7 },
});

describe('modelService', () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); });

  it('maps a registry version, keeping unrecorded metrics as null', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        versions: [
          {
            version: 'ml-1.1', status: 'CANDIDATE', model_type: 'RandomForestClassifier',
            metrics: {
              decision_threshold: 0.5, test_set: evalSet(0.47),
              test_set_analyst_labels_only: evalSet(0.62),
              candidates_roc_auc: { RandomForestClassifier: 0.47 }, train_samples: 195,
            },
            feature_importance: [{ feature: 'amount', importance: 0.13 }],
            training_data: {
              total_samples: 244, true_positive: 192, false_positive: 52,
              analyst_labelled: 104, heuristic_labelled: 140, by_source: { case_outcome: { TRUE_POSITIVE: 1 } },
            },
            trained_at: '2026-10-01T10:00:00', requested_by_name: 'Admin', approved_by_name: null,
          },
          { version: 'ml-1.0', status: 'ACTIVE', metrics: null, training_data: null, feature_cols: null },
        ],
      },
    });

    const [candidate, legacy] = await modelService.listVersions();

    expect(mockGet).toHaveBeenCalledWith('/api/model/versions');
    expect(candidate.metrics!.testSetAnalystOnly!.rocAuc).toBe(0.62);
    expect(candidate.metrics!.testSet.confusionMatrix).toEqual({ tn: 1, fp: 8, fn: 3, tp: 7 });
    expect(candidate.trainingData!.analystLabelled).toBe(104);
    expect(candidate.requestedByName).toBe('Admin');
    expect(candidate.approvedByName).toBeUndefined();
    expect(candidate.trainedAt).toBeInstanceOf(Date);
    expect(legacy.metrics).toBeNull();
    expect(legacy.featureCols).toEqual([]);
  });

  it('passes the date range and maps band outcomes', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        total_alerts: 359, synthetic_share: 1.0,
        bands: [{ band: 'HIGH', alerts: 315, confirmed_suspicious: 49, false_positive: 46, undecided: 220, confirmed_rate: 0.5158 }],
        score_distribution: [{ from: 70, to: 80, alerts: 109 }],
        thresholds: { high: 70, medium: 40 },
        monthly: [{ month: '2026-04', alerts: 359, avg_priority_score: 80.1, high: 315, medium: 44, low: 0, confirmed_suspicious: 54, false_positive: 55 }],
        scored_by: [{ model_version: 'synthetic-seed', alerts: 359 }],
        dismissal_reasons: [], labels_by_source: {}, investigator_labels_since_active_model: 5,
      },
    });

    const m = await modelService.getMonitoring('2026-04-01', '2026-04-30');

    expect(mockGet).toHaveBeenCalledWith('/api/model/monitoring', { params: { from: '2026-04-01', to: '2026-04-30' } });
    expect(m.syntheticShare).toBe(1);
    expect(m.bands[0]).toEqual({
      band: 'HIGH', alerts: 315, confirmedSuspicious: 49, falsePositive: 46, undecided: 220, confirmedRate: 0.5158,
    });
    expect(m.monthly[0].avgPriorityScore).toBe(80.1);
    expect(m.scoredBy[0].modelVersion).toBe('synthetic-seed');
    expect(m.investigatorLabelsSinceActiveModel).toBe(5);
  });

  it('maps status with the active registry version and thresholds', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        rule_weight: 0.6, ml_weight: 0.4, high_priority_threshold: 70, medium_priority_threshold: 40,
        metadata_source: 's3', active_version: { version: 'ml-1.0', status: 'ACTIVE', metrics: null },
      },
    });
    const s = await modelService.getStatus();
    expect(s.highThreshold).toBe(70);
    expect(s.activeVersion!.version).toBe('ml-1.0');
  });

  it('maps promotion requests with the requester id as a string', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        promotions: [{
          id: 2, version: 'ml-1.2', kind: 'PROMOTE', status: 'APPROVED', reason: 'Quarterly review',
          requested_by: 1, requested_by_name: 'Super Admin', requested_at: '2026-10-01T10:00:00',
          decided_by_name: 'PO', decided_at: '2026-10-01T11:00:00', decision_note: 'Reviewed',
          replaced_version: 'ml-1.0',
        }],
      },
    });
    const [p] = await modelService.listPromotions();
    expect(p.requestedBy).toBe('1');
    expect(p.replacedVersion).toBe('ml-1.0');
    expect(p.decidedAt).toBeInstanceOf(Date);
  });

  it('maps jobs and the candidate-vs-active comparison', async () => {
    mockGet.mockResolvedValueOnce({
      data: { jobs: [{ id: 3, status: 'FAILED', reason: 'r', error: 'Only 12 investigator-labelled alerts' }] },
    });
    const [job] = await modelService.listJobs();
    expect(job.error).toContain('investigator-labelled');

    mockGet.mockResolvedValueOnce({
      data: { versions: [{
        version: 'ml-1.2', status: 'CANDIDATE',
        metrics: {
          test_set: evalSet(0.5), test_set_analyst_labels_only: evalSet(0.42), train_samples: 10,
          comparison: { version: 'ml-1.0', test_set: evalSet(0.4), test_set_analyst_labels_only: evalSet(0.35) },
          worse_than_active: false,
        },
      }] },
    });
    const [v] = await modelService.listVersions();
    expect(v.metrics!.comparison!.testSetAnalystOnly!.rocAuc).toBe(0.35);
    expect(v.metrics!.worseThanActive).toBe(false);
  });

  it('posts retrain, rollback and decisions to the right endpoints', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await modelService.requestRetrain('Quarterly review');
    await modelService.requestRollback('ml-1.0', 'Too many dismissals');
    await modelService.approve(2, 'Validation reviewed');
    await modelService.reject(3, 'AUC below live model');
    expect(mockPost.mock.calls).toEqual([
      ['/api/model/retrain', { reason: 'Quarterly review' }],
      ['/api/model/versions/ml-1.0/rollback', { reason: 'Too many dismissals' }],
      ['/api/model/promotions/2/approve', { note: 'Validation reviewed' }],
      ['/api/model/promotions/3/reject', { note: 'AUC below live model' }],
    ]);
  });
});
