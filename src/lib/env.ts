import { z } from "zod";

const ServerEnvSchema = z.object({
  OPENDART_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  CORP_XML_PATH: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function getServerEnv(): ServerEnv {
  return ServerEnvSchema.parse(process.env);
}

