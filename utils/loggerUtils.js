import winston from "winston";
const { createLogger, format, transports } = winston;

const customFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  const serializedMetadata = JSON.stringify(meta, null, 4);
  const firstParam =
    typeof message === "string" ? message : JSON.stringify(message, null, 2);
  return `${timestamp} [${level}] ${
    typeof message === "string" ? message : "\n" + firstParam
  } ${serializedMetadata !== "{}" ? " : " + serializedMetadata : ""}`;
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "DD-MM-YY HH:mm"
    }),
    format.json(),
    customFormat
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple(),
        format.timestamp({
          format: "DD-MM-YY HH:mm"
        }),
        format.json(),
        customFormat
      )
    })
  ]
});

if (process.env.NODE_ENV === "production") {
  logger.add(
    new transports.File({ filename: "running-errors.log", level: "error" }),
    new transports.File({ filename: "running-warnings.log", level: "warning" }),
    new transports.File({ filename: "running-debug.log", level: "debug" })
  );
}

export default logger;
