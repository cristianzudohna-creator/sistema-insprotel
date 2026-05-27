import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token no enviado");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "insprotel_secret_dev",
      });

      request.user = {
        id: payload.id || payload.sub,
        rut: payload.rut,
        name: payload.name,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Token inválido");
    }
  }
}