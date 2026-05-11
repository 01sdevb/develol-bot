import { REST, Routes, SlashCommandBuilder } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("genkey")
    .setDescription("[Owner] Genera una API key")
    .addBooleanOption(o => o.setName("permanent").setDescription("Key permanente (sin expirar)").setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName("checkkey")
    .setDescription("Verifica si una API key tiene formato válido")
    .addStringOption(o => o.setName("key").setDescription("La API key a verificar").setRequired(true))
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

const rest = new REST({ version: "10" }).setToken(TOKEN);
const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
console.log(`✅ ${data.length} comandos registrados globalmente.`);
