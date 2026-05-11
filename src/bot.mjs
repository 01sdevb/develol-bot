import {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events,
  SlashCommandBuilder, REST, Routes
} from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const BASE_URL = (process.env.BASE_URL || "https://develol.com").replace(/\/$/, "");
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

if (!TOKEN) throw new Error("DISCORD_BOT_TOKEN is required");
if (!CLIENT_ID) throw new Error("DISCORD_CLIENT_ID is required");

// ─── API Helpers ─────────────────────────────────────────────────────────────
async function apiReq(method, path, body) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { status: "error", error: text }; }
}

async function sendWebhook(embeds) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds })
    });
  } catch (_) {}
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages]
});

// ─── Commands ─────────────────────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("genkey")
    .setDescription("[Owner] Genera una API key")
    .addBooleanOption(o => o.setName("permanent").setDescription("Key permanente (sin expirar)").setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName("checkkey")
    .setDescription("Verifica si una API key es válida")
    .addStringOption(o => o.setName("key").setDescription("La API key").setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Muestra información del sistema Develol")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("[Owner] Envía el panel de obfuscator a este canal")
    .toJSON()
];

// Register commands on ready
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Develol Bot listo como ${c.user.tag}`);
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Slash commands registrados globalmente");
  } catch (err) {
    console.error("❌ Error registrando commands:", err);
  }

  await sendWebhook([{
    title: "🤖 Bot Online",
    description: `**Develol Bot** conectado como \`${c.user.tag}\``,
    color: 0x00ff88,
    timestamp: new Date().toISOString()
  }]);
});

// ─── Slash Commands ───────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // /genkey
    if (commandName === "genkey") {
      await interaction.deferReply({ ephemeral: true });
      const permanent = interaction.options.getBoolean("permanent") ?? false;
      try {
        const data = await apiReq("POST", "/token/generate", { permanent });
        if (data.status !== "ok") {
          return interaction.editReply(`❌ Error: ${data.error}`);
        }
        const expiry = data.expiresAt ? `<t:${Math.floor(new Date(data.expiresAt).getTime()/1000)}:R>` : "**Nunca (permanente)**";
        await interaction.editReply({
          embeds: [{
            title: "🔑 API Key Generada",
            color: 0x00ff88,
            fields: [
              { name: "Key", value: `\`${data.apiKey}\``, inline: false },
              { name: "Expira", value: expiry, inline: true },
              { name: "Tipo", value: permanent ? "Permanente 👑" : "Temporal ⏳", inline: true }
            ],
            footer: { text: "develol.com" },
            timestamp: new Date().toISOString()
          }]
        });
      } catch (err) {
        await interaction.editReply(`❌ Error: ${err.message}`);
      }
    }

    // /checkkey
    if (commandName === "checkkey") {
      await interaction.deferReply({ ephemeral: true });
      const key = interaction.options.getString("key");
      try {
        // Try to use the key info via the config endpoint
        const data = await apiReq("GET", "/config");
        // We can't directly check a key without auth, so check format
        if (!key.startsWith("dvl_") || key.length < 40) {
          return interaction.editReply("❌ Formato de key inválido. Las keys empiezan con `dvl_`");
        }
        await interaction.editReply({
          embeds: [{
            title: "🔍 Key verificada",
            color: 0x5865f2,
            description: `La key \`${key.slice(0,16)}...\` tiene formato válido.\nPara verificar si está activa, intenta registrarte en [develol.com](https://develol.com).`,
            footer: { text: "develol.com" }
          }]
        });
      } catch (err) {
        await interaction.editReply(`❌ Error: ${err.message}`);
      }
    }

    // /info
    if (commandName === "info") {
      await interaction.deferReply();
      try {
        const config = await apiReq("GET", "/config");
        await interaction.editReply({
          embeds: [{
            title: "⚡ Develol Obfuscator",
            color: 0xdc2626,
            description: "Sistema de obfuscación de scripts Lua para Roblox, estilo Luarmor.",
            fields: [
              { name: "💰 Precio", value: `$${config.price} USD / ${config.months} mes(es)`, inline: true },
              { name: "💳 PayPal", value: config.paypalEnabled ? "✅ Activo" : "❌ Inactivo", inline: true },
              { name: "🌐 Web", value: "[develol.com](https://develol.com)", inline: true },
              { name: "🔐 Seguridad", value: "• HWID Locking\n• Key verification\n• Rate limiting\n• Anti-tamper", inline: false },
              { name: "📦 Sistema v1", value: "• GET /api/v1/loaders/:hash.lua\n• GET /api/v1/load?h=HASH&k=HWID", inline: false }
            ],
            footer: { text: "develol.com — Luarmor-style protection" },
            timestamp: new Date().toISOString()
          }]
        });
      } catch (err) {
        await interaction.editReply(`❌ Error: ${err.message}`);
      }
    }

    // /panel
    if (commandName === "panel") {
      await interaction.deferReply({ ephemeral: true });
      const embed = new EmbedBuilder()
        .setTitle("⚡ Develol Obfuscator")
        .setDescription(
          "**Protege tus scripts de Roblox con obfuscación profesional.**\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          "**¿Cómo funciona?**\n" +
          "1. Compra acceso con PayPal ($10/mes)\n" +
          "2. Recibe tu API key\n" +
          "3. Regístrate en develol.com\n" +
          "4. Sube tu script Lua → obtén un loader\n" +
          "5. El loader descarga y ejecuta el payload cifrado\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          "**Protección incluida:**\n" +
          "• HWID Locking — solo tu PC puede ejecutarlo\n" +
          "• Cifrado XOR — payload nunca expuesto\n" +
          "• Anti-tamper — detecta modificaciones\n" +
          "• Rate limiting — 20 req/min por HWID\n\n" +
          "*Hecho con Develol | [develol.com](https://develol.com)*"
        )
        .setColor(0xdc2626)
        .setFooter({ text: "develol.com — Luarmor-style protection" })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("🌐 Comprar Acceso ($10)")
          .setStyle(ButtonStyle.Link)
          .setURL("https://develol.com"),
        new ButtonBuilder()
          .setLabel("📖 Documentación")
          .setStyle(ButtonStyle.Link)
          .setURL("https://develol.com")
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.editReply("✅ Panel enviado al canal.");
    }
  }
});

client.login(TOKEN);
