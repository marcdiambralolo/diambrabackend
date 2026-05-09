  // --- POLLING AUTO POUR LES CONSULTATIONS EN COURS ---
  useEffect(() => {
    const interval = window.setInterval(() => {
      // Rafraîchit uniquement la liste des consultations en cours (pending)
      fetchSlice('PENDING', pendingPage).then((pendingRes) => {
        setPending((prev) => ({
          ...prev,
          consultations: pendingRes.consultations,
          total: pendingRes.total,
          loading: false,
          error: null,
          totalPages: Math.max(1, Math.ceil(pendingRes.total / ITEMS_PER_PAGE)),
        }));
      }).catch((err) => {
        const msg = getNiceError(err);
        setPending((prev) => ({ ...prev, loading: false, error: msg }));
      });
    }, 10000); // 10 secondes
    return () => window.clearInterval(interval);
  }, [fetchSlice, pendingPage]);
# Hook frontend pour batch d'analyses asynchrones

Ce document montre comment adapter le hook admin des consultations pour utiliser l'architecture suivante :

Next.js
-> NestJS API
-> Redis Queue
-> Worker
-> MongoDB

## Endpoints backend à utiliser

### Enqueue batch

`POST /api/v1/admin/consultations/analysis-jobs`

Payload :

```json
{
  "consultationIds": ["id1", "id2", "id3"]
}
```

Réponse :

```json
{
  "total": 3,
  "accepted": 3,
  "failed": 0,
  "items": [
    {
      "consultationId": "id1",
      "success": true,
      "jobId": "id1",
      "status": "QUEUED"
    }
  ]
}
```

### Statuts batch

`POST /api/v1/admin/consultations/analysis-jobs/statuses`

Payload :

```json
{
  "consultationIds": ["id1", "id2", "id3"]
}
```

Réponse :

```json
{
  "total": 3,
  "items": [
    {
      "consultationId": "id1",
      "jobId": "id1",
      "status": "PROCESSING",
      "attempts": 1,
      "errorMessage": null,
      "startedAt": "2026-03-12T18:00:00.000Z",
      "finishedAt": null,
      "dateGeneration": null,
      "hasResult": false
    }
  ]
}
```

## Principe côté frontend

Le front ne doit plus considérer qu'un `POST /generate-analysis` terminé signifie que l'analyse est prête.

Le bon cycle est :

1. envoyer un lot d'identifiants à `POST /admin/consultations/analysis-jobs`
2. stocker les ids acceptés localement
3. lancer un polling sur `POST /admin/consultations/analysis-jobs/statuses`
4. mettre à jour l'UI selon `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`
5. rafraîchir la liste paginée quand des éléments passent à `COMPLETED`

## Hook prêt à intégrer

```ts
import { useConsultationsTabs } from '@/hooks/consultations/useConsultationsTabs';
import { api } from '@/lib/api/client';
import { Consultation } from '@/lib/interfaces';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ConsultationType = 'all' | 'SPIRITUALITE' | 'TAROT' | 'ASTROLOGIE' | 'NUMEROLOGIE';
type StatusKey = 'PENDING' | 'COMPLETED';
type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;

export interface BatchResult {
  id: string;
  title: string;
  success: boolean;
  error?: string;
  notified?: boolean;
  status?: JobStatus;
}

export interface BatchProgress {
  current: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  results: BatchResult[];
}

type AnalysisJobState = {
  consultationId: string;
  jobId: string;
  status: JobStatus;
  attempts: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  dateGeneration: string | null;
  hasResult: boolean;
};

const ITEMS_PER_PAGE = 10;
const BATCH_SIZE = 10;
const POLL_INTERVAL_MS = 4000;

function getNiceError(err: any): string {
  if (err?.code === 'ECONNABORTED') {
    return 'Delai depasse : la requete a pris trop de temps. Veuillez reessayer.';
  }

  if (err?.code === 'ERR_CANCELED') {
    return 'Requete annulee.';
  }

  if (err?.response) {
    return err.response.data?.message || `Erreur ${err.response.status}`;
  }

  if (err?.request) {
    return 'Erreur de connexion au serveur';
  }

  if (err?.message === 'Network Error') {
    return 'Erreur reseau : verifiez votre connexion internet';
  }

  return err?.message || 'Erreur inconnue';
}

function buildParams(opts: {
  search: string;
  status: StatusKey;
  type: ConsultationType;
  page: number;
  limit: number;
}) {
  const params = new URLSearchParams({
    search: opts.search || '',
    status: opts.status,
    type: opts.type || 'all',
    page: String(opts.page || 1),
    limit: String(opts.limit || ITEMS_PER_PAGE),
  });
  return params.toString();
}

type SliceState = {
  consultations: Consultation[];
  total: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
};

function makeSliceState(): SliceState {
  return {
    consultations: [],
    total: 0,
    loading: true,
    error: null,
    totalPages: 1,
  };
}

export function useAdminConsultationsPageEnded() {
  const [searchQuery] = useState('');
  const [typeFilter] = useState<ConsultationType>('all');

  const [pendingPage, setPendingPage] = useState(1);
  const [endedPage, setEndedPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pending, setPending] = useState<SliceState>(() => makeSliceState());
  const [ended, setEnded] = useState<SliceState>(() => makeSliceState());

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [jobStatuses, setJobStatuses] = useState<Record<string, AnalysisJobState>>({});

  const abortRef = useRef<AbortController | null>(null);
  const abortBatchRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);
  const trackedIdsRef = useRef<string[]>([]);

  const consultationsNotNotified = useMemo(() => {
    return (ended.consultations || []).filter((c: any) => {
      const isCompleted = c.status === 'COMPLETED';
      const isNotified = Boolean(c.analysisNotified);
      return isCompleted && !isNotified;
    });
  }, [ended.consultations]);

  const notNotifiedTotal = consultationsNotNotified.length;
  const pendingTotal = pending.total;
  const endedTotal = ended.total;

  const tabsApi = useConsultationsTabs(pendingTotal, notNotifiedTotal, endedTotal);
  const tab = tabsApi.tab as 'pending' | 'notnotified' | 'ended';
  const setTab = tabsApi.setTab;

  const tabs = useMemo(() => {
    return (tabsApi.tabs || []).map((t: any) => {
      if (t.key === 'pending') return { ...t, icon: Clock3 };
      if (t.key === 'ended') return { ...t, icon: CheckCircle2 };
      return t;
    });
  }, [tabsApi.tabs]);

  const activePage = tab === 'pending' ? pendingPage : endedPage;

  const fetchSlice = useCallback(
    async (status: StatusKey, page: number): Promise<{ consultations: Consultation[]; total: number }> => {
      const query = buildParams({
        search: searchQuery,
        status,
        type: typeFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });

      const res = await api.get(`/admin/consultations?${query}`, {
        headers: { 'Cache-Control': 'no-cache' },
        timeout: 60000,
        signal: abortRef.current?.signal as any,
      });

      return {
        consultations: res.data?.consultations || [],
        total: Number(res.data?.total || 0),
      };
    },
    [searchQuery, typeFilter],
  );

  const fetchAll = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPending((s) => ({ ...s, loading: true, error: null }));
    setEnded((s) => ({ ...s, loading: true, error: null }));

    try {
      const [pendingRes, endedRes] = await Promise.all([
        fetchSlice('PENDING', pendingPage),
        fetchSlice('COMPLETED', endedPage),
      ]);

      setPending({
        consultations: pendingRes.consultations,
        total: pendingRes.total,
        loading: false,
        error: null,
        totalPages: Math.max(1, Math.ceil(pendingRes.total / ITEMS_PER_PAGE)),
      });

      setEnded({
        consultations: endedRes.consultations,
        total: endedRes.total,
        loading: false,
        error: null,
        totalPages: Math.max(1, Math.ceil(endedRes.total / ITEMS_PER_PAGE)),
      });
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      const msg = getNiceError(err);
      setPending((s) => ({ ...s, loading: false, error: msg }));
      setEnded((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [fetchSlice, pendingPage, endedPage]);

  useEffect(() => {
    fetchAll();
    return () => abortRef.current?.abort();
  }, [fetchAll]);

  useEffect(() => {
    if (pendingPage > pending.totalPages) setPendingPage(pending.totalPages);
  }, [pendingPage, pending.totalPages]);

  useEffect(() => {
    if (endedPage > ended.totalPages) setEndedPage(ended.totalPages);
  }, [endedPage, ended.totalPages]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAll();
    window.setTimeout(() => setIsRefreshing(false), 450);
  }, [fetchAll]);

  const handlePageChange = useCallback(
    (page: number) => {
      const p = Math.max(1, page);
      if (tab === 'pending') setPendingPage(p);
      else setEndedPage(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [tab],
  );

  const handleGenerateAnalysis = useCallback((id: string) => {
    window.location.href = `/admin/consultations/${id}?r=${Date.now()}`;
  }, []);

  const pollStatuses = useCallback(async () => {
    const ids = trackedIdsRef.current;
    if (!ids.length) {
      return;
    }

    try {
      const res = await api.post('/admin/consultations/analysis-jobs/statuses', {
        consultationIds: ids,
      });

      const items = (res.data?.items || []) as AnalysisJobState[];
      const nextMap: Record<string, AnalysisJobState> = {};
      for (const item of items) {
        nextMap[item.consultationId] = item;
      }

      setJobStatuses(nextMap);

      const completedCount = items.filter((item) => item.status === 'COMPLETED' || item.status === 'FAILED').length;
      setProgress((prev) => {
        if (!prev) return prev;

        const nextResults = prev.results.map((result) => {
          const current = nextMap[result.id];
          if (!current) return result;

          if (current.status === 'FAILED') {
            return {
              ...result,
              success: false,
              status: current.status,
              error: current.errorMessage || 'Erreur inconnue',
            };
          }

          if (current.status === 'COMPLETED') {
            return {
              ...result,
              success: true,
              status: current.status,
              error: undefined,
            };
          }

          return {
            ...result,
            status: current.status,
          };
        });

        return {
          ...prev,
          current: completedCount,
          results: nextResults,
        };
      });

      const pendingIds = items
        .filter((item) => item.status === 'QUEUED' || item.status === 'PROCESSING')
        .map((item) => item.consultationId);

      trackedIdsRef.current = pendingIds;

      if (!pendingIds.length) {
        setIsRunning(false);
        await handleRefresh();
        return;
      }

      pollTimerRef.current = window.setTimeout(() => {
        void pollStatuses();
      }, POLL_INTERVAL_MS);
    } catch (err) {
      pollTimerRef.current = window.setTimeout(() => {
        void pollStatuses();
      }, POLL_INTERVAL_MS);
    }
  }, [handleRefresh]);

  const startBatchGeneration = useCallback(async () => {
    const pendingBatch = (pending.consultations || []).filter((c: any) => c.status === 'PENDING');
    if (pendingBatch.length === 0) return;

    abortBatchRef.current = false;
    setIsRunning(true);

    const totalBatches = Math.ceil(pendingBatch.length / BATCH_SIZE);
    const allResults: BatchResult[] = [];
    const acceptedIds: string[] = [];

    setProgress({
      current: 0,
      total: pendingBatch.length,
      currentBatch: 0,
      totalBatches,
      results: [],
    });

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      if (abortBatchRef.current) break;

      const batchStart = batchIndex * BATCH_SIZE;
      const batch = pendingBatch.slice(batchStart, batchStart + BATCH_SIZE);

      setProgress((prev) => (prev ? { ...prev, currentBatch: batchIndex + 1 } : prev));

      try {
        const res = await api.post('/admin/consultations/analysis-jobs', {
          consultationIds: batch.map((consultation: any) => consultation._id),
        });

        const items = res.data?.items || [];
        for (const item of items) {
          const consultation = batch.find((c: any) => String(c._id) === item.consultationId);
          const title = consultation?.title || `Consultation #${String(item.consultationId).slice(-6)}`;

          if (item.success) {
            acceptedIds.push(item.consultationId);
            allResults.push({
              id: item.consultationId,
              title,
              success: true,
              status: item.status || 'QUEUED',
            });
          } else {
            allResults.push({
              id: item.consultationId,
              title,
              success: false,
              status: null,
              error: item.error || 'Erreur inconnue',
            });
          }
        }

        setProgress((prev) => (prev ? { ...prev, results: [...allResults] } : prev));
      } catch (err: any) {
        const msg = getNiceError(err);
        for (const consultation of batch) {
          allResults.push({
            id: consultation._id,
            title: consultation.title || `Consultation #${String(consultation._id).slice(-6)}`,
            success: false,
            status: null,
            error: msg,
          });
        }

        setProgress((prev) => (prev ? { ...prev, results: [...allResults] } : prev));
      }
    }

    trackedIdsRef.current = acceptedIds;

    if (acceptedIds.length) {
      void pollStatuses();
      return;
    }

    setIsRunning(false);
  }, [pending.consultations, pollStatuses]);

  const stopBatchGeneration = useCallback(() => {
    abortBatchRef.current = true;
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    trackedIdsRef.current = [];
    setIsRunning(false);
  }, []);

  const clearProgress = useCallback(() => {
    setProgress(null);
    setJobStatuses({});
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  const [notifyingIds, setNotifyingIds] = useState<Set<string>>(new Set());

  const handleNotifyUser = useCallback(
    async (consultationId: string) => {
      setNotifyingIds((prev) => {
        const next = new Set(prev);
        next.add(consultationId);
        return next;
      });

      try {
        await api.post(`/consultations/${consultationId}/notify-user`);
        await handleRefresh();
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Erreur lors de la notification');
      } finally {
        setNotifyingIds((prev) => {
          const next = new Set(prev);
          next.delete(consultationId);
          return next;
        });
      }
    },
    [handleRefresh],
  );

  const [isNotifyRunning, setIsNotifyRunning] = useState(false);
  const [notifyProgress, setNotifyProgress] = useState<BatchProgress | null>(null);
  const abortNotifyFlagRef = useRef(false);
  const abortNotifyCtrlRef = useRef<AbortController | null>(null);

  const startBatchNotify = useCallback(async () => {
    const list = consultationsNotNotified || [];
    if (list.length === 0) return;

    abortNotifyFlagRef.current = false;
    abortNotifyCtrlRef.current?.abort();
    abortNotifyCtrlRef.current = new AbortController();

    setIsNotifyRunning(true);

    const total = list.length;
    const totalBatches = Math.ceil(total / BATCH_SIZE);
    const results: BatchResult[] = [];

    setNotifyProgress({
      current: 0,
      total,
      currentBatch: 0,
      totalBatches,
      results: [],
    });

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      if (abortNotifyFlagRef.current) break;

      const batchStart = batchIndex * BATCH_SIZE;
      const batch = list.slice(batchStart, batchStart + BATCH_SIZE);

      setNotifyProgress((prev) => (prev ? { ...prev, currentBatch: batchIndex + 1 } : prev));

      for (let i = 0; i < batch.length; i++) {
        if (abortNotifyFlagRef.current) break;

        const c: any = batch[i];
        const globalIndex = batchStart + i + 1;

        setNotifyProgress((prev) => (prev ? { ...prev, current: globalIndex } : prev));

        setNotifyingIds((prev) => {
          const next = new Set(prev);
          next.add(c._id);
          return next;
        });

        try {
          await api.post(
            `/consultations/${c._id}/notify-user`,
            {},
            { timeout: 180000, signal: abortNotifyCtrlRef.current?.signal as any },
          );

          results.push({
            id: c._id,
            title: c.title || `Consultation #${String(c._id).slice(-6)}`,
            success: true,
            notified: true,
          });
        } catch (err: any) {
          if (err?.code === 'ERR_CANCELED') {
            abortNotifyFlagRef.current = true;
            break;
          }

          results.push({
            id: c._id,
            title: c.title || `Consultation #${String(c._id).slice(-6)}`,
            success: false,
            error: err?.response?.data?.message || err?.message || 'Erreur inconnue',
          });
        } finally {
          setNotifyingIds((prev) => {
            const next = new Set(prev);
            next.delete(c._id);
            return next;
          });

          setNotifyProgress((prev) => (prev ? { ...prev, results: [...results] } : prev));
        }
      }

      if (!abortNotifyFlagRef.current) {
        await handleRefresh();
      }
    }

    setIsNotifyRunning(false);
  }, [consultationsNotNotified, handleRefresh]);

  const stopBatchNotify = useCallback(() => {
    abortNotifyFlagRef.current = true;
    abortNotifyCtrlRef.current?.abort();
  }, []);

  const clearNotifyProgress = useCallback(() => {
    setNotifyProgress(null);
  }, []);

  const loading = pending.loading || ended.loading;
  const error = pending.error || ended.error;
  const pendingCount = (pending.consultations || []).filter((c: any) => c.status === 'PENDING').length;

  return {
    consultations: ended.consultations,
    total: ended.total,
    totalPages: ended.totalPages,
    currentPage: activePage,
    consultationsenattente: pending.consultations,
    notifyingIds,
    isNotifyRunning,
    notifyProgress,
    tab,
    isRunning,
    pendingTotal,
    consultationsNotNotified,
    error,
    tabs,
    loading,
    isRefreshing,
    progress,
    pendingCount,
    jobStatuses,
    startBatchGeneration,
    stopBatchGeneration,
    clearProgress,
    setTab,
    handleRefresh,
    handleNotifyUser,
    startBatchNotify,
    stopBatchNotify,
    clearNotifyProgress,
    handlePageChange,
    handleGenerateAnalysis,
  };
}
```

## Ce qui change par rapport à l'ancien hook

### Avant

- une requête longue par consultation
- timeout de plusieurs minutes
- la progression suivait les appels HTTP, pas les jobs réels
- une erreur réseau interrompait facilement le batch

### Maintenant

- un enqueue batch rapide
- un polling batch léger
- une progression fondée sur les vrais statuts du worker
- une meilleure tolérance aux jobs longs

## Point d'attention

Le hook ci-dessus travaille toujours sur les consultations de la page chargée. Si l'objectif est de traiter tout le stock `PENDING`, il faut soit :

1. charger toutes les pages côté frontend
2. ou ajouter un endpoint backend admin pour récupérer directement tous les ids `PENDING`
