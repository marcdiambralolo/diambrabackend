
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './messaging.entity';
import { SimpleMessage, SimpleMessageDocument } from './schemas/simple-message.schema';

@Injectable()
export class MessagingService {
	constructor(
		@InjectModel(Message.name)
		private messageModel: Model<MessageDocument>,
		@InjectModel(SimpleMessage.name)
		private simpleMessageModel: Model<SimpleMessageDocument>,
	) {}

	/**
	 * Récupère tous les messages simples envoyés ou reçus par un utilisateur (inbox style)
	 */
	async getSimpleMessagesForUser(userId: string) {
		const messages = await this.simpleMessageModel.find({
			$or: [
				{ fromUserId: userId },
				{ toUserId: userId },
			],
		}).sort({ createdAt: -1 }).exec();
		// Convertit les ObjectId en string pour compatibilité frontend
		return messages.map((msg: any) => ({
			...msg.toObject(),
			fromUserId: msg.fromUserId?.toString?.() ?? msg.fromUserId,
			toUserId: msg.toUserId?.toString?.() ?? msg.toUserId,
			_id: msg._id?.toString?.() ?? msg._id,
		}));
	}

	async sendSimpleMessage(data: {
		fromUserId: string;
		toUserId: string;
		text: string;
		subject?: string;
		email?: string;
		phone?: string;
	}) {
		const msg = new this.simpleMessageModel({ ...data });
		await msg.save();
		return msg;
	}

	async getConversations(userId: string) {
		// Récupère toutes les conversations où l'utilisateur est impliqué
		return this.messageModel.aggregate([
			{ $match: { $or: [{ from: userId }, { to: userId }] } },
			{ $sort: { createdAt: -1 } },
			{ $group: {
				_id: '$conversationId',
				lastMessage: { $first: '$$ROOT' },
			} },
			{ $replaceRoot: { newRoot: '$lastMessage' } },
			{ $sort: { updatedAt: -1 } },
		]);
	}

	async getMessages(conversationId: string, limit = 30, skip = 0) {
		return this.messageModel
			.find({ conversationId })
			.sort({ createdAt: 1 })
			.skip(skip)
			.limit(limit);
	}

	async markMessagesAsRead(conversationId: string, userId: string) {
		// Marque tous les messages non lus destinés à userId comme lus
		await this.messageModel.updateMany(
			{ conversationId, to: userId, status: { $ne: 'read' } },
			{ $set: { status: 'read' } }
		);
		return { success: true };
	}

	async sendMessage(data: { conversationId: string; from: string; to: string; text: string }) {
		const msg = new this.messageModel({ ...data });
		await msg.save();
		return msg;
	}
}


