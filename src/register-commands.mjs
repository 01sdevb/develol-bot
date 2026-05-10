import { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) throw new Error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required");

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configura el panel de un script de Develol en un canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName("loader_url").setDescription("URL del loader (https://develol.com/api/raw/...)").setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName("channel").setDescription("Canal donde publicar el panel (por defecto: este canal)").setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Publica el panel de un script por ID")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName("script_id").setDescription("ID del script").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Obtén el link de invitación del bot"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
console.log("[Develol Bot] Registering slash commands...");
const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
console.log(`[Develol Bot] Registered ${data.length} commands successfully.`);
