# Develol Discord Bot

Bot de Discord para distribución de scripts Roblox con Develol Obfuscator.

## Variables de entorno requeridas (Railway)

| Variable | Descripción |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Token del bot de Discord |
| `DISCORD_CLIENT_ID` | Client ID de la app de Discord |
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `BASE_URL` | URL base de tu API (https://develol.com) |
| `DISCORD_WEBHOOK_URL` | Webhook de Discord para notificaciones (opcional) |

## Deploy en Railway

1. Conecta este repositorio en Railway
2. Agrega las variables de entorno arriba
3. Railway detecta automáticamente el comando de inicio

## Registrar comandos slash

```bash
node src/register-commands.mjs
```
