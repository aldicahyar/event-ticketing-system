import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from '@common/redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Subscribe to Redis channels once when the gateway initialises,
   * then broadcast to all connected clients. This avoids the previous bug
   * where every new client connection added duplicate Redis subscriptions
   * that were never cleaned up (memory leak).
   */
  afterInit() {
    this.redisService.subscribe('events:seat:update', (data) => {
      this.server.emit('seat:update', data);
    });

    this.redisService.subscribe('events:booking:new', (data) => {
      this.server.emit('booking:new', data);
    });

    this.logger.log('WebSocket gateway initialised — Redis subscriptions active');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:room')
  handleJoinRoom(@MessageBody() data: { event_id: string }, @ConnectedSocket() client: Socket) {
    client.join(`event:${data.event_id}`);
    this.logger.log(`Client ${client.id} joined room: event:${data.event_id}`);
  }

  @SubscribeMessage('leave:room')
  handleLeaveRoom(@MessageBody() data: { event_id: string }, @ConnectedSocket() client: Socket) {
    client.leave(`event:${data.event_id}`);
    this.logger.log(`Client ${client.id} left room: event:${data.event_id}`);
  }

  @SubscribeMessage('seat:availability')
  async handleSeatAvailability(
    @MessageBody() data: { event_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.emit('seat:availability', {
      event_id: data.event_id,
      timestamp: Date.now(),
    });
  }
}
