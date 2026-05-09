import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { Message, MessageSchema } from './messaging.entity';
import { MessagingGateway } from './messaging.gateway';
import { SimpleMessage, SimpleMessageSchema } from './schemas/simple-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: SimpleMessage.name, schema: SimpleMessageSchema },
    ]),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
