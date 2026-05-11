# Develol Bot — Discord Bot

Bot de Discord para Develol Obfuscator. Gestiona API keys, muestra información del sistema y envía paneles de compra.

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `DISCORD_BOT_TOKEN` | Token de tu bot de Discord (Discord Developer Portal) |
| `DISCORD_CLIENT_ID` | Application ID / Client ID del bot |
| `BASE_URL` | `https://develol.com` (ya configurado) |
| `DISCORD_WEBHOOK_URL` | (Opcional) URL de webhook para logs |

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `/genkey` | [Owner] Genera una API key nueva (soporta `permanent: true`) |
| `/checkkey <key>` | Verifica el formato de una API key |
| `/info` | Muestra info del sistema (precio, PayPal, endpoints v1) |
| `/panel` | [Owner] Envía el panel de compra al canal |

## Endpoints v1 del Worker (sistema de loaders)

```
GET  https://develol.com/api/v1/loaders/<hash>.lua   → Loader Lua para Roblox
GET  https://develol.com/api/v1/load?h=HASH&k=HWID   → Payload cifrado (llamado por el loader)
POST https://develol.com/api/v1/obfuscate             → Ofusca y almacena script (requiere sesión)
GET  https://develol.com/api/v1/scripts               → Lista scripts del usuario
POST https://develol.com/api/v1/scripts/:id/update    → Actualiza payload (misma URL)
POST https://develol.com/api/v1/scripts/:id/reset-hwid → Resetea HWID lock
```

## Sistema de loaders (cómo funciona)

1. Usuario sube script Lua → se ofusca + cifra con clave XOR única
2. Se genera un `loader.lua` con el hash + clave de descifrado embebida
3. Usuario pone en Roblox: `loadstring(game:HttpGet("https://develol.com/api/v1/loaders/<hash>.lua"))()`
4. El loader: obtiene HWID → llama `/v1/load` → descifra → ejecuta con `loadstring()`
5. HWID se bloquea en primer uso (solo esa PC puede ejecutarlo)

## Deploy en Railway

1. Conecta este repo en Railway → servicio `bot`
2. Configura las env vars (especialmente `DISCORD_BOT_TOKEN` y `DISCORD_CLIENT_ID`)
3. Railway auto-deploya. El bot registra los slash commands automáticamente al iniciar.

## Variables ya configuradas en Railway

- `BASE_URL=https://develol.com`
- `NODE_ENV=production`
