import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers, query, params } = request;
    const user = request.user;
    
    const now = Date.now();

    this.logger.log(
      `→ ${method} ${url} | User: ${user?.id || 'anonymous'} | Body: ${JSON.stringify(body)} | Query: ${JSON.stringify(query)} | Params: ${JSON.stringify(params)}`
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;
          this.logger.log(
            `← ${method} ${url} | Status: ${statusCode} | Time: ${delay}ms`
          );
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `✗ ${method} ${url} | Error: ${error.message} | Status: ${error.status || 500} | Time: ${delay}ms`,
            error.stack
          );
        },
      }),
    );
  }
}


