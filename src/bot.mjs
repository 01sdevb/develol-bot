import {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events,
  PermissionFlagsBits, ChannelType
} from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const BASE_URL = (process.env.BASE_URL || "https://develol.com").replace(/\/$/, "");
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const BOT_API_SECRET = process.env.BOT_API_SECRET || "";

if (!TOKEN) throw new Error("DISCORD_BOT_TOKEN is required");

// ─── API Helper ─────────────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${BASE_URL}/api/bot${path}`, {
    headers: { "Authorization": `Bearer ${BOT_API_SECRET}`, "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

async function apiPost(path, body = {}) {
  const res = await fetch(`${BASE_URL}/api/bot${path}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${BOT_API_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

async function apiPatch(path, body = {}) {
  const res = await fetch(`${BASE_URL}/api/bot${path}`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${BOT_API_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function sendWebhook(embeds) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds }),
    });
  } catch (_) {}
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

// ─── Panel builder ───────────────────────────────────────────────────────────
function buildScriptPanel(script, guild) {
  const modeLabel = script.with_key ? "🔐 Con Key" : "🌐 FFA (Sin Key)";
  const embed = new EmbedBuilder()
    .setTitle(`📜 ${script.name} — Panel de Control`)
    .setDescription(
      `**${guild?.name ?? "Develol"}** · Modo: **${modeLabel}**\n\n` +
      (script.with_key
        ? "Si eres comprador, usa **🔑 Redeem Key** para reclamar tu acceso.\nLuego usa **📜 Get Script** para obtener tu loader."
        : "Script sin key. Usa **📜 Get Script** para obtener el loader y ejecutarlo.") +
      `\n\n*Hecho con Develol Obfuscator · [develol.com](https://develol.com)*`
    )
    .setColor(0xdc2626)
    .setFooter({ text: `Script ID: ${script.id} · develol.com` })
    .setTimestamp();

  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  if (script.with_key) {
    row1.addComponents(
      new ButtonBuilder().setCustomId(`redeem_${script.id}`).setLabel("🔑 Redeem Key").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`getscript_${script.id}`).setLabel("📜 Get Script").setStyle(ButtonStyle.Primary),
    );
    row2.addComponents(
      new ButtonBuilder().setCustomId(`viewkey_${script.id}`).setLabel("👁️ View Key").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`resethwid_${script.id}`).setLabel("⚙️ Reset HWID").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`stats_${script.id}`).setLabel("📊 Stats").setStyle(ButtonStyle.Secondary),
    );
    return { embeds: [embed], components: [row1, row2] };
  } else {
    row1.addComponents(
      new ButtonBuilder().setCustomId(`getscript_${script.id}`).setLabel("📜 Get Script").setStyle(ButtonStyle.Primary),
    );
    return { embeds: [embed], components: [row1] };
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, () => {
  console.log(`[Develol] Online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isCommand()) await handleCommand(interaction);
    else if (interaction.isButton()) await handleButton(interaction);
    else if (interaction.isModalSubmit()) await handleModal(interaction);
  } catch (err) {
    console.error("[Develol] Error:", err);
    await sendWebhook([{ title: "❌ Bot Error", description: `\`\`\`${String(err).slice(0, 1000)}\`\`\``, color: 0xef4444, timestamp: new Date().toISOString() }]);
    const payload = { content: "❌ Error interno. Contacta al admin.", flags: 64 };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch (_) {}
  }
});

async function handleCommand(interaction) {
  const cmd = interaction.commandName;

  if (cmd === "setup") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "❌ Necesitas permiso de **Gestionar Servidor**.", flags: 64 });
      return;
    }
    const loaderUrl = interaction.options.getString("loader_url");
    const channel = interaction.options.getChannel("channel") ?? interaction.channel;
    const loaderKey = loaderUrl?.match(/\/api\/raw\/([0-9a-f]{32})/)?.[1];
    if (!loaderKey) {
      await interaction.reply({ content: "❌ URL inválida. Debe ser `https://develol.com/api/raw/<key>`", flags: 64 });
      return;
    }
    const data = await apiPost("/setup", { loaderKey, channelId: channel.id });
    if (!data.script) {
      await interaction.reply({ content: "❌ Script no encontrado. Verifica la URL.", flags: 64 });
      return;
    }
    const panel = buildScriptPanel(data.script, interaction.guild);
    await channel.send(panel);
    await interaction.reply({ content: `✅ Panel de **${data.script.name}** publicado en ${channel}.`, flags: 64 });
    await sendWebhook([{ title: "🤖 Panel configurado", description: `Script: **${data.script.name}**\nServidor: ${interaction.guild?.name}\nCanal: <#${channel.id}>`, color: 0x4ade80, timestamp: new Date().toISOString() }]);
    return;
  }

  if (cmd === "panel") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "❌ Necesitas permiso de **Gestionar Servidor**.", flags: 64 });
      return;
    }
    const scriptId = interaction.options.getInteger("script_id");
    const data = await apiGet(`/scripts/${scriptId}`);
    if (!data.script) { await interaction.reply({ content: "❌ Script no encontrado.", flags: 64 }); return; }
    await interaction.reply(buildScriptPanel(data.script, interaction.guild));
    return;
  }

  if (cmd === "invite") {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=534723950656&scope=bot%20applications.commands`;
    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle("🤖 Invita a Develol Bot")
        .setDescription(`[Haz clic aquí para invitar el bot](${inviteUrl})`)
        .setColor(0xdc2626)],
      flags: 64,
    });
    return;
  }
}

async function handleButton(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[0];
  const scriptId = parseInt(parts[1], 10);
  const discordId = interaction.user.id;

  const scriptData = await apiGet(`/scripts/${scriptId}`);
  if (!scriptData.script) { await interaction.reply({ content: "❌ Script no encontrado.", flags: 64 }); return; }
  const script = scriptData.script;

  if (action === "redeem") {
    if (!script.with_key) { await interaction.reply({ content: "ℹ️ Este script es FFA — no necesita key.", flags: 64 }); return; }
    const modal = new ModalBuilder().setCustomId(`modalredeem_${scriptId}`).setTitle("🔑 Redimir Key");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("key_value").setLabel("Pega tu key aquí")
        .setStyle(TextInputStyle.Short).setPlaceholder("dvl_script_xxxxxxxxxxxxxxxx").setRequired(true)
    ));
    await interaction.showModal(modal);
    return;
  }

  if (action === "getscript") {
    const data = await apiPost(`/scripts/${scriptId}/getscript`, { discordId });
    if (!data.ok) { await interaction.reply({ content: `❌ ${data.error || "Error"}`, flags: 64 }); return; }
    const embed = new EmbedBuilder()
      .setTitle("📜 Tu Loader Script")
      .setDescription("**Copia y ejecuta en tu executor de Roblox:**\n```lua\n" + data.loaderLine + "\n```")
      .setColor(0xdc2626).setFooter({ text: "Solo tú puedes ver esto · develol.com" }).setTimestamp();
    if (data.key) {
      embed.addFields(
        { name: "🔑 Key", value: `\`${data.key}\``, inline: false },
        { name: "⚡ Ejecuciones", value: String(data.executions), inline: true },
        { name: "🔐 HWID", value: data.hwid ? "✅ Vinculado" : "⏳ Primera ejecución", inline: true },
        { name: "⏳ Expira", value: data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("es-ES") : "♾️ Permanente", inline: true },
      );
    }
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  if (action === "viewkey") {
    const data = await apiGet(`/scripts/${scriptId}/keys/discord/${discordId}`);
    if (!data.key) { await interaction.reply({ content: "❌ No tienes key para este script. Usa **🔑 Redeem Key** primero.", flags: 64 }); return; }
    const k = data.key;
    const expires = k.expires_at ? new Date(k.expires_at) : null;
    const daysLeft = expires ? Math.max(0, Math.ceil((expires - new Date()) / 86400000)) : null;
    const status = k.banned ? "🚫 Baneada" : (!expires || expires > new Date()) ? "✅ Activa" : "⏰ Expirada";
    const embed = new EmbedBuilder().setTitle("🔑 Info de tu Key")
      .addFields(
        { name: "Key", value: `\`${k.key}\``, inline: false },
        { name: "Estado", value: status, inline: true },
        { name: "Ejecuciones", value: String(k.executions), inline: true },
        { name: "HWID", value: k.hwid ? "✅ Vinculado" : "⏳ Sin vincular", inline: true },
        { name: "Expira", value: expires ? `${expires.toLocaleDateString("es-ES")} (${daysLeft}d)` : "♾️ Permanente", inline: true },
      ).setColor(k.banned ? 0x991b1b : 0x4ade80).setTimestamp();
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  if (action === "resethwid") {
    const data = await apiPost(`/scripts/${scriptId}/keys/discord/${discordId}/reset-hwid`);
    if (!data.ok) { await interaction.reply({ content: `❌ ${data.error || "Sin key vinculada"}`, flags: 64 }); return; }
    await interaction.reply({ content: "✅ HWID reseteado. La próxima ejecución vinculará tu nuevo dispositivo.", flags: 64 });
    return;
  }

  if (action === "stats") {
    const data = await apiGet(`/scripts/${scriptId}/stats`);
    const embed = new EmbedBuilder().setTitle(`📊 Stats — ${script.name}`)
      .addFields(
        { name: "Total keys", value: String(data.total ?? 0), inline: true },
        { name: "Baneadas", value: String(data.banned ?? 0), inline: true },
        { name: "HWID vinculado", value: String(data.hwid_linked ?? 0), inline: true },
        { name: "Total ejecuciones", value: String(data.total_execs ?? 0), inline: true },
      ).setColor(0x60a5fa).setTimestamp();
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }
}

async function handleModal(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[0];
  const scriptId = parseInt(parts[1], 10);
  const discordId = interaction.user.id;

  if (action === "modalredeem") {
    const keyValue = interaction.fields.getTextInputValue("key_value").trim();
    const data = await apiPost(`/scripts/${scriptId}/redeem`, { discordId, key: keyValue });
    if (!data.ok) { await interaction.reply({ content: `❌ ${data.error || "Key inválida"}`, flags: 64 }); return; }
    const k = data.key;
    const embed = new EmbedBuilder().setTitle("✅ Key Reclamada")
      .setDescription("Tu key fue vinculada a tu Discord. Usa **📜 Get Script** para obtener el loader.")
      .addFields(
        { name: "Key", value: `\`${k.key}\``, inline: false },
        { name: "Expira", value: k.expires_at ? new Date(k.expires_at).toLocaleDateString("es-ES") : "♾️ Permanente", inline: true },
      ).setColor(0x4ade80).setTimestamp();
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }
}

client.login(TOKEN);
