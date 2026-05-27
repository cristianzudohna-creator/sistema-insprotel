import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private cleanRut(rut: string) {
    return String(rut || "")
      .replace(/\./g, "")
      .replace(/-/g, "")
      .trim()
      .toUpperCase();
  }

  async login(data: { rut: string; password: string }) {
    const rut = this.cleanRut(data.rut);
    const password = String(data.password || "");

    if (!rut || !password) {
      throw new BadRequestException("Debes ingresar RUT y contraseña");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        rut,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const payload = {
      sub: user.id,
      id: user.id,
      rut: user.rut,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        rut: user.rut,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        rut: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario no válido");
    }

    return user;
  }

  async changePassword(
    userId: number,
    data: {
      currentPassword?: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    const newPassword = String(data.newPassword || "");
    const confirmPassword = String(data.confirmPassword || "");

    if (!newPassword || !confirmPassword) {
      throw new BadRequestException("Debes ingresar y confirmar la contraseña");
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        "La contraseña debe tener al menos 6 caracteres",
      );
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException("Las contraseñas no coinciden");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario no válido");
    }

    if (!user.mustChangePassword) {
      const currentPassword = String(data.currentPassword || "");

      if (!currentPassword) {
        throw new BadRequestException("Debes ingresar tu contraseña actual");
      }

      const validCurrentPassword = await bcrypt.compare(
        currentPassword,
        user.password,
      );

      if (!validCurrentPassword) {
        throw new UnauthorizedException("La contraseña actual no es correcta");
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
      select: {
        id: true,
        rut: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const payload = {
      sub: updatedUser.id,
      id: updatedUser.id,
      rut: updatedUser.rut,
      name: updatedUser.name,
      role: updatedUser.role,
      mustChangePassword: updatedUser.mustChangePassword,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: updatedUser,
    };
  }
}