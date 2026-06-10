import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RedisService } from '@common/redis/redis.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private redisService: RedisService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    this.redisService.subscribe('events:seat:update', (data) => {
      client.emit('seat:update', data);
    });

    this.redisService.subscribe('events:booking:new', (data) => {
      client.emit('booking:new', data);
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:room')
  handleJoinRoom(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`event:${data.eventId}`);
    this.logger.log(`Client ${client.id} joined room: event:${data.eventId}`);
  }

  @SubscribeMessage('leave:room')
  handleLeaveRoom(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`event:${data.eventId}`);
    this.logger.log(`Client ${client.id} left room: event:${data.eventId}`);
  }

  @SubscribeMessage('seat:availability')
  async handleSeatAvailability(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.emit('seat:availability', {
      eventId: data.eventId,
      timestamp: Date.now(),
    });
  }
}
