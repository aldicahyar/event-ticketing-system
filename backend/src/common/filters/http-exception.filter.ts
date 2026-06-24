import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (typeof exceptionResponse === 'string') {
      errorResponse.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      errorResponse.message = (exceptionResponse as any).message || exception.message;
      errorResponse.error = (exceptionResponse as any).error;

      if (Array.isArray(errorResponse.message)) {
        errorResponse.message = errorResponse.message.join(', ');
      }
    }

    this.logger.error(`${request.method} ${request.url} - ${status} - ${errorResponse.message}`);

    response.status(status).send(errorResponse);
  }
}
