require('dotenv').config();
const { Client, IntentsBitField, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('Pokémon Battle Royale Bot is running!'));
app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});

const GUILD_ID = '1242348592547496046'; // Your server ID
const BATTLE_CHANNEL_ID = '1348420527244709958'; // The only channel the bot will use
const APPLICATION_ID = '1348420959542968341'; // Your bot's application ID
const MAX_PLAYERS = 8;
const JOIN_TIMEOUT = 30000; // 30 seconds to join after first player
const TURN_TIMEOUT = 30000; // 30 seconds per turn

// Expanded Pokémon and move data
const pokemonData = [
    { name: 'Pikachu', hp: 50, attack: 15, defense: 10, moves: ['Tackle', 'Thunderbolt'] },
    { name: 'Charmander', hp: 45, attack: 12, defense: 8, moves: ['Tackle', 'Flamethrower'] },
    { name: 'Squirtle', hp: 55, attack: 10, defense: 12, moves: ['Tackle', 'Water Gun'] },
    { name: 'Bulbasaur', hp: 50, attack: 13, defense: 11, moves: ['Tackle', 'Vine Whip'] },
    { name: 'Eevee', hp: 60, attack: 10, defense: 10, moves: ['Tackle', 'Quick Attack'] },
    { name: 'Gengar', hp: 45, attack: 18, defense: 7, moves: ['Tackle', 'Shadow Ball'] }
];

const moveData = {
    'Tackle': { power: 10, accuracy: 95 },
    'Thunderbolt': { power: 20, accuracy: 90 },
    'Flamethrower': { power: 20, accuracy: 90 },
    'Water Gun': { power: 15, accuracy: 95 },
    'Vine Whip': { power: 15, accuracy: 90 },
    'Quick Attack': { power: 12, accuracy: 95 },
    'Shadow Ball': { power: 25, accuracy: 85 }
};

// Game state
let battle = {
    active: false,
    players: new Map(),
    currentTurn: 0,
    turnOrder: [],
    joinStartTime: null
};

function loadBattleState() {
    try {
        const data = fs.readFileSync('vouchData.json', 'utf8');
        const parsedData = JSON.parse(data);
        battle.players = new Map(parsedData.battleRoyale || []);
    } catch (error) {
        console.log('No vouchData.json found or battleRoyale key missing, starting fresh:', error.message);
        battle.players = new Map();
    }
}

function saveBattleState() {
    try {
        const data = fs.readFileSync('vouchData.json', 'utf8');
        const parsedData = JSON.parse(data);
        parsedData.battleRoyale = [...battle.players];
        fs.writeFileSync('vouchData.json', JSON.stringify(parsedData));
    } catch (error) {
        const newData = { battleRoyale: [...battle.players] };
        fs.writeFileSync('vouchData.json', JSON.stringify(newData));
    }
}

function getRandomPokemon() {
    const pokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    return { ...pokemon, currentHp: pokemon.hp };
}

function calculateDamage(attacker, defender, move) {
    const moveInfo = moveData[move];
    if (Math.random() * 100 > moveInfo.accuracy) return 0;
    const damage = Math.max(1, (attacker.attack * moveInfo.power) / defender.defense);
    return Math.floor(damage);
}

function checkBattleEnd() {
    const alivePlayers = battle.players.size;
    if (alivePlayers <= 1) {
        battle.active = false;
        return true;
    }
    return false;
}

async function announceBattleUpdate(channel) {
    const embed = new EmbedBuilder()
        .setTitle('Pokémon Battle Royale')
        .setDescription(battle.active ? 'Battle in progress!' : battle.joinStartTime ? 'Joining phase...' : 'No active battle.')
        .addFields(
            ...Array.from(battle.players.entries()).map(([userId, data]) => ({
                name: `<@${userId}>`,
                value: `${data.pokemon.name}: HP ${data.pokemon.currentHp}/${data.pokemon.hp}`
            }))
        )
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

client.once('ready', async () => {
    console.log(`Battle Royale Bot is online as ${client.user.tag}`);
    loadBattleState();

    const commands = [
        new SlashCommandBuilder()
            .setName('joinbattle')
            .setDescription('Join the Pokémon Battle Royale'),
        new SlashCommandBuilder()
            .setName('attack')
            .setDescription('Attack with a move')
            .addStringOption(option =>
                option.setName('move')
                    .setDescription('The move to use')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('battle_status')
            .setDescription('View the current battle status'),
        new SlashCommandBuilder()
            .setName('startbattle')
            .setDescription('Start the battle with current players')
    ].map(command => command.toJSON());

    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands })
        .then(() => console.log('Commands registered'))
        .catch(console.error);

    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    await channel.send('Pokémon Battle Royale Bot is online! Use `/joinbattle` to join, then `/startbattle` to begin.');
});

// Auto-start battle after JOIN_TIMEOUT if players are present
setInterval(async () => {
    if (battle.joinStartTime && !battle.active && battle.players.size > 0) {
        const timeElapsed = Date.now() - battle.joinStartTime;
        if (timeElapsed >= JOIN_TIMEOUT) {
            const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
            if (battle.players.size < 2) {
                await channel.send('Not enough players to start! Battle cancelled.');
                battle.players.clear();
                battle.joinStartTime = null;
            } else {
                battle.active = true;
                battle.turnOrder = Array.from(battle.players.keys());
                await channel.send('Battle starting now with current players!');
                await announceBattleUpdate(channel);
            }
            saveBattleState();
        }
    }
}, 5000);

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.channelId !== BATTLE_CHANNEL_ID) {
        return;
    }

    const { commandName, user, options } = interaction;
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    const userId = user.id;

    if (commandName === 'joinbattle') {
        if (battle.active) {
            await interaction.reply({ content: 'A battle is already in progress! Wait for it to end.', ephemeral: true });
            return;
        }
        if (battle.players.size >= MAX_PLAYERS) {
            await interaction.reply({ content: 'The battle is full!', ephemeral: true });
            return;
        }
        if (battle.players.has(userId)) {
            await interaction.reply({ content: 'You are already in the battle!', ephemeral: true });
            return;
        }

        const pokemon = getRandomPokemon();
        battle.players.set(userId, { pokemon, lastAction: Date.now() });
        if (!battle.joinStartTime) battle.joinStartTime = Date.now();
        saveBattleState();
        await interaction.reply(`You joined the battle with ${pokemon.name}! ${MAX_PLAYERS - battle.players.size} slots remain. Use /startbattle to begin or wait ${JOIN_TIMEOUT / 1000} seconds.`);
        await announceBattleUpdate(channel);
    }

    if (commandName === 'startbattle') {
        if (battle.active) {
            await interaction.reply({ content: 'A battle is already in progress!', ephemeral: true });
            return;
        }
        if (battle.players.size < 2) {
            await interaction.reply({ content: 'Not enough players! At least 2 are required.', ephemeral: true });
            return;
        }

        battle.active = true;
        battle.turnOrder = Array.from(battle.players.keys());
        battle.joinStartTime = null;
        await channel.send('Battle starting now with current players!');
        await announceBattleUpdate(channel);
        saveBattleState();
    }

    if (commandName === 'attack') {
        if (!battle.active) {
            await interaction.reply({ content: 'No battle is active!', ephemeral: true });
            return;
        }
        if (!battle.players.has(userId)) {
            await interaction.reply({ content: 'You are not in the battle!', ephemeral: true });
            return;
        }
        if (battle.turnOrder[battle.currentTurn % battle.players.size] !== userId) {
            await interaction.reply({ content: 'It’s not your turn!', ephemeral: true });
            return;
        }

        const move = options.getString('move');
        const attackerData = battle.players.get(userId);
        if (!attackerData.pokemon.moves.includes(move)) {
            await interaction.reply({ content: 'Invalid move!', ephemeral: true });
            return;
        }

        let targetId;
        do {
            targetId = battle.turnOrder[Math.floor(Math.random() * battle.turnOrder.length)];
        } while (targetId === userId);

        const targetData = battle.players.get(targetId);
        const damage = calculateDamage(attackerData.pokemon, targetData.pokemon, move);
        targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

        await channel.send(`${user.username}'s ${attackerData.pokemon.name} used ${move} on <@${targetId}>'s ${targetData.pokemon.name} for ${damage} damage!`);

        if (targetData.pokemon.currentHp === 0) {
            await channel.send(`<@${targetId}>'s ${targetData.pokemon.name} has fainted! <@${targetId}> is eliminated!`);
            battle.players.delete(targetId);
            battle.turnOrder = battle.turnOrder.filter(id => id !== targetId);
            saveBattleState();
        }

        attackerData.lastAction = Date.now();
        battle.currentTurn++;
        await announceBattleUpdate(channel);

        if (checkBattleEnd()) {
            const winnerId = Array.from(battle.players.keys())[0];
            await channel.send(`The battle is over! Winner: <@${winnerId}>!`);
            battle.players.clear();
            battle.turnOrder = [];
            saveBattleState();
        }
    }

    if (commandName === 'battle_status') {
        await announceBattleUpdate(channel);
        await interaction.reply({ content: 'Battle status updated!', ephemeral: true });
    }
});

setInterval(async () => {
    if (!battle.active) return;
    const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
    const playerData = battle.players.get(currentPlayerId);
    if (Date.now() - playerData.lastAction > TURN_TIMEOUT) {
        const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
        await channel.send(`<@${currentPlayerId}> took too long! They are eliminated!`);
        battle.players.delete(currentPlayerId);
        battle.turnOrder = battle.turnOrder.filter(id => id !== currentId);
        battle.currentTurn++;
        await announceBattleUpdate(channel);
        saveBattleState();
        if (checkBattleEnd()) {
            const winnerId = Array.from(battle.players.keys())[0];
            await channel.send(`The battle is over! Winner: <@${winnerId}>!`);
            battle.players.clear();
            battle.turnOrder = [];
            saveBattleState();
        }
    }
}, 5000);

client.login(process.env.DISCORD_TOKEN).catch(console.error);
