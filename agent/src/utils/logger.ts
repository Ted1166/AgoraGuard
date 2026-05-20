import winston from "winston";
import path from "path";
import fs from "fs";

const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extras = Object.keys(meta).length
            ? " " + JSON.stringify(meta)
            : "";
          return `${timestamp} [${level}] ${message}${extras}`;
        }),
      ),
    }),

    new winston.transports.File({
      filename: path.join(logsDir, "agoraguard.log"),
      maxsize:  10 * 1024 * 1024, // 10 MB
      maxFiles: 7,
      tailable: true,
    }),
  ],
});