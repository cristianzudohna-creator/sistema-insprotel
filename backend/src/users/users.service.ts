import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private cleanRut(rut: string) {
    return String(rut || "")
      .replace(/\./g, "")
      .replace(/-/g, "")
      .trim()
      .toUpperCase();
  }

  private validateRole(role: string) {
    const value = String(role || "").trim().toUpperCase();

    if (!Object.values(Role).includes(value as Role)) {
      throw new BadRequestException("Cargo inválido");
    }

    return value as Role;
  }

  private userSelect() {
    return {
      id: true,
      rut: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: this.userSelect(),
    });
  }

  async create(data: any) {
    const rut = this.cleanRut(data.rut);
    const name = String(data.name || "").trim();
    const role = this.validateRole(data.role);

    if (!rut) {
      throw new BadRequestException("El RUT es obligatorio");
    }

    if (!name) {
      throw new BadRequestException("El nombre completo es obligatorio");
    }

    const exists = await this.prisma.user.findUnique({
      where: {
        rut,
      },
    });

    if (exists) {
      throw new BadRequestException("Ya existe un usuario con ese RUT");
    }

    const password = await bcrypt.hash(rut, 10);

    return this.prisma.user.create({
      data: {
        rut,
        name,
        email: data.email || null,
        password,
        role,
        isActive: true,
        mustChangePassword: true,
      },
      select: this.userSelect(),
    });
  }

  async update(id: number, data: any) {
    const current = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!current) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const updateData: any = {};

    if (data.rut !== undefined) {
      const rut = this.cleanRut(data.rut);

      if (!rut) {
        throw new BadRequestException("El RUT es obligatorio");
      }

      const rutExists = await this.prisma.user.findUnique({
        where: {
          rut,
        },
      });

      if (rutExists && rutExists.id !== id) {
        throw new BadRequestException("Ya existe otro usuario con ese RUT");
      }

      updateData.rut = rut;
    }

    if (data.name !== undefined) {
      const name = String(data.name || "").trim();

      if (!name) {
        throw new BadRequestException("El nombre completo es obligatorio");
      }

      updateData.name = name;
    }

    if (data.role !== undefined) {
      updateData.role = this.validateRole(data.role);
    }

    if (data.email !== undefined) {
      updateData.email = data.email || null;
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data: updateData,
      select: this.userSelect(),
    });
  }

  async remove(id: number, loggedUserId: number) {
    if (id === loggedUserId) {
      throw new BadRequestException("No puedes eliminar tu propio usuario");
    }

    const current = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        vehicleChecks: true,
      },
    });

    if (!current) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (current.vehicleChecks.length > 0) {
      throw new BadRequestException(
        "No se puede eliminar porque este usuario tiene registros asociados",
      );
    }

    return this.prisma.user.delete({
      where: {
        id,
      },
      select: this.userSelect(),
    });
  }
}