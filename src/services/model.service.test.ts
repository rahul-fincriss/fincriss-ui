import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));

import api from '@/lib/api-client';
import { modelService } from './model.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;

const evalSet = (auc: number | null) => ({
  samples: 19, roc_auc: auc, accuracy: 0.42, precision: 0.47, recall: 0.7, f1: 0.56,
  confusion_matrix: { tn: 1, fp: 8, fn: 3, tp: 7 },
});

describe('modelService', () => {
  beforeEach(() => mockGet.mockReset());

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
});
