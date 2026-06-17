import { Injectable, Logger } from "@nestjs/common";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    if (getApps().length) return;

    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.join(process.cwd(), "firebase-service-account.json");

    if (!fs.existsSync(serviceAccountPath)) {
      this.logger.warn(
        `Firebase service account no encontrado en: ${serviceAccountPath}`,
      );
      return;
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8"),
    );

    initializeApp({
      credential: cert(serviceAccount),
    });

    this.logger.log("Firebase Admin inicializado correctamente");
  }

  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    url?: string,
  ) {
    this.logger.log(`Intentando enviar push a ${tokens.length} token(s)`);

    if (!tokens.length) return;

    if (!getApps().length) {
      this.logger.warn("Firebase Admin no está inicializado");
      return;
    }

    const results = await Promise.allSettled(
      tokens.map((token) =>
        getMessaging().send({
          token,
          notification: {
            title,
            body,
          },
          data: {
            url: url || "/",
          },
          webpush: {
            notification: {
              title,
              body,
              icon: "/logo-insprotel.png",
              badge: "/logo-insprotel.png",
            },
            fcmOptions: {
              link: url || "/",
            },
          },
        }),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        this.logger.log(`Push enviado OK token ${index + 1}: ${result.value}`);
      } else {
        this.logger.error(
          `Error enviando push token ${index + 1}: ${result.reason?.message || result.reason}`,
        );
      }
    });
  }
}