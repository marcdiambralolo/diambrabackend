  /**
   * Supprime tous les jobs de la queue (pour tests/dev)
   */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class DoorsJobService {
  constructor(
    @InjectQueue('user-doors') private readonly doorsQueue: Queue,
  ) {}

  async enqueueUserDoorsJob(userId: string, formData: any) {
    // BullMQ exige que jobId soit une string
    const jobId = String(userId);
    console.log('[DoorsJobService] Création job avec jobId:', jobId);
    // Désactive temporairement removeOnComplete/removeOnFail pour debug
    return this.doorsQueue.add('user-doors', { userId: jobId, formData }, { jobId });
  }


  async purgeAllJobs() {
    const queue = this.doorsQueue;
    // Supprime tous les jobs dans tous les états
    await queue.clean(0, 1000, 'completed');
    await queue.clean(0, 1000, 'failed');
    await queue.clean(0, 1000, 'delayed');
    await queue.clean(0, 1000, 'wait');
    await queue.clean(0, 1000, 'active');
    // Supprime les jobs en attente dans la file
    await queue.obliterate({ force: true });
    return { purged: true };
  }

  async getJobStatus(userId: string) {
    const jobId = String(userId);
    console.log('[DoorsJobService] getJobStatus pour jobId:', jobId);
    const job = await this.doorsQueue.getJob(jobId);
    if (!job) {
      return {
        status: 'not_found',
        message: "Aucun job en cours pour cet utilisateur.",
      };
    }
    const state = await job.getState();
    const progress = job.progress;
    const step = job.data?.step || null;
    const createdAt = job.timestamp ? new Date(job.timestamp).toISOString() : undefined;
    const finishedAt = job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined;
    let message = '';
    if (state === 'completed') message = 'Traitement terminé avec succès.';
    else if (state === 'failed') message = 'Le traitement a échoué.';
    else if (state === 'active') message = 'Traitement en cours…';
    else if (state === 'waiting') message = 'En attente de traitement.';
    else message = 'Statut du job inconnu.';
    return {
      status: state,
      progress,
      result: job.returnvalue,
      step,
      createdAt,
      finishedAt,
      message,
    };
  }
}
