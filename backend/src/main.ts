import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, LogLevel } from "@nestjs/common";

async function bootstrap() {
  const logLevels: LogLevel[] =
    process.env.NODE_ENV === "production"
      ? ["error", "warn"]
      : ["error", "warn", "log"];

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
  app.enableCors({
    origin: corsOrigin.split(",").map((o) => o.trim()),
    methods: ["GET", "POST"],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  Logger.log(`🎮 PFN Backend running on http://localhost:${port}`, "Bootstrap");
}

bootstrap();
