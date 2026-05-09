import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
} from './schemas/notification-preferences.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreferences.name) private preferencesModel: Model<NotificationPreferencesDocument>,
  ) {}
  /**
   * Récupérer les préférences de notification d'un utilisateur
   */
  async getPreferences(userId: string) {
    let prefs = await this.preferencesModel.findOne({ userId }).exec();
    if (!prefs) {
      prefs = new this.preferencesModel({ userId });
      await prefs.save();
    }
    return prefs.toObject();
  }

  /**
   * Mettre à jour les préférences de notification d'un utilisateur
   */
  async updatePreferences(userId: string, updates: Partial<NotificationPreferences>) {
    const prefs = await this.preferencesModel.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true },
    ).exec();
    return prefs.toObject();
  }

  /**
   * Créer une notification
   */
  async create(data: {
    userId: any;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
    expiresAt?: Date;
  }) {
    // Vérification défensive : userId doit être un ObjectId ou string
    if (typeof data.userId === 'object' && data.userId !== null && data.userId._id) {
      // Si on reçoit un objet utilisateur, on extrait l'id
      console.warn('[NotificationsService] userId reçu comme objet, extraction de _id:', data.userId);
      data.userId = data.userId._id.toString();
    }
    if (typeof data.userId !== 'string' && !(data.userId instanceof require('mongoose').Types.ObjectId)) {
      console.error('[NotificationsService] userId mal formé:', data.userId);
      throw new Error('userId doit être un ObjectId ou une string');
    }
    const notification = new this.notificationModel(data);
    await notification.save();
    return notification;
  }

  /**
   * Créer une notification pour un résultat de consultation disponible
   */
  async createConsultationResultNotification(
    userId: string,
    consultationId: string,
    consultationTitle: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.CONSULTATION_RESULT,
      title: 'Résultat de consultation disponible',
      message: `Le résultat de votre consultation "${consultationTitle}" est maintenant disponible.`,
      metadata: {
        consultationId,
        url: `/consultations/${consultationId}`,
      },
    });
  }

  /**
   * Créer une notification pour une nouvelle connaissance partagée
   */
  async createNewKnowledgeNotification(
    knowledgeId: string,
    knowledgeTitle: string,
    category: string,
  ) {
    // Envoyer la notification à tous les utilisateurs actifs
    // Dans une implémentation réelle, on pourrait filtrer par préférences utilisateur
    const notification = {
      type: NotificationType.NEW_KNOWLEDGE,
      title: 'Nouvelle connaissance partagée',
      message: `Une nouvelle connaissance a été partagée : "${knowledgeTitle}" dans la catégorie ${category}.`,
      metadata: {
        knowledgeId,
        category,
        url: `/knowledge/${knowledgeId}`,
      },
    };

    // Pour l'instant, on retourne la structure
    // Dans une version avancée, on pourrait créer des notifications pour tous les abonnés
    return notification;
  }

  /**
   * Créer une notification pour une consultation assignée (pour le consultant)
   */
  async createConsultationAssignedNotification(
    consultantId: string,
    consultationId: string,
    consultationTitle: string,
  ) {
    return this.create({
      userId: consultantId,
      type: NotificationType.CONSULTATION_ASSIGNED,
      title: 'Nouvelle consultation assignée',
      message: `Une nouvelle consultation vous a été assignée : "${consultationTitle}".`,
      metadata: {
        consultationId,
        url: `/star/consultations/${consultationId}`,
      },
    });
  }

  /**
   * Créer une notification pour un paiement confirmé
   */
  async createPaymentConfirmedNotification(userId: string, paymentId: string, amount: number) {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Paiement confirmé',
      message: `Votre paiement de ${amount}€ a été confirmé avec succès.`,
      metadata: {
        paymentId,
        amount,
        url: `/payments/${paymentId}`,
      },
    });
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async findAllByUser(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      isRead?: boolean;
      type?: NotificationType;
    },
  ) {
    const { page = 1, limit = 20, isRead, type } = query;
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (isRead !== undefined) filter.isRead = isRead;
    if (type) filter.type = type;

    const [notifications, total] = await Promise.all([
      this.notificationModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    const unreadCount = await this.notificationModel
      .countDocuments({ userId, isRead: false })
      .exec();

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationModel.findOne({ _id: id, userId });

    if (!notification) {
      throw new Error('Notification non trouvée');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string) {
    const result = await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return {
      message: 'Toutes les notifications ont été marquées comme lues',
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Supprimer une notification
   */
  async remove(id: string, userId: string) {
    const result = await this.notificationModel.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      throw new Error('Notification non trouvée');
    }

    return { message: 'Notification supprimée avec succès' };
  }

  /**
   * Supprimer toutes les notifications lues d'un utilisateur
   */
  async removeAllRead(userId: string) {
    const result = await this.notificationModel.deleteMany({ userId, isRead: true });

    return {
      message: 'Toutes les notifications lues ont été supprimées',
      deletedCount: result.deletedCount,
    };
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false }).exec();
  }
}
