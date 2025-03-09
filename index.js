require('dotenv').config();
const { Client, IntentsBitField, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

const GUILD_ID = '1242348592547496046'; // Your server ID
const BATTLE_CHANNEL_ID = '1348420527244709958'; // The only channel the bot will use
const MAX_PLAYERS = 8;
const TURN_TIMEOUT = 30000; // 30 seconds per turn

// Sample Pokémon and move data
const pokemonData = [
    { name: 'Pikachu', hp: 50, attack: 15, defense: 10, moves: ['Tackle', 'Thunderbolt'] },
    { name: 'Charmander', hp: 45, attack: 12, defense: 8, moves: ['Tackle', 'Flamethrower'] },
    { name: 'Squirtle', hp: 55, attack: 10, defense: 12, moves: ['Tackle', 'Water Gun'] }
];

const moveData = {
    'Tackle': { power: 10, accuracy: 95 },
    'Thunderbolt': { power: 20, accuracy: 90 },
    'Flamethrower': { power: 20, accuracy: 90 },
    'Water Gun': { power: 15, accuracy: 95 }
};

// Game state
let battle = {
    active: false,
    players: new Map(),
    currentTurn: 0,
    turnOrder: []
};

function saveBattleState() {
    fs.writeFileSync('battleState.json', JSON.stringify([...battle.players]));
}

function loadBattleState() {
    try {
        const data = fs.readFileSync('battleState.json', 'utf8');
        battle.players = new Map(JSON.parse(data));
    } catch (error) {
        battle.players = new Map();
    }
}

function getRandomPokemon() {
    const pokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    return { ...pokemon, currentHp: pokemon.hp };
}

function calculateDamage(attacker, defender, move) {
    const moveInfo = moveData[move];
    if (Math.random() * 100 > moveInfo.accuracy) return 0; // Miss chance
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
        .setDescription(battle.active ? 'Battle in progress!' : 'No active battle.')
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
            .setDescription('View the current battle status')
    ].map(command => command.toJSON());

    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands })
        .then(() => console.log('Commands registered'))
        .catch(console.error);

    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    await channel.send('Pokémon Battle Royale Bot is online! Use `/joinbattle` to start a battle.');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // Only respond in the specified channel
    if (interaction.channelId !== BATTLE_CHANNEL_ID) {
        return; // Ignore commands outside the battle channel
    }

    const { commandName, user, options } = interaction;
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    const userId = user.id;

    if (commandName === 'joinbattle') {
        if (battle.active) {
            await interaction.reply({ content: 'A battle is already in progress!', ephemeral: true });
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
        saveBattleState();
        await interaction.reply(`You joined the battle with ${pokemon.name}!`);
        if (battle.players.size === 1) {
            battle.active = true;
            battle.turnOrder = Array.from(battle.players.keys());
            await announceBattleUpdate(channel);
        } else if (battle.players.size === MAX_PLAYERS) {
            battle.active = true;
            battle.turnOrder = Array.from(battle.players.keys());
            await announceBattleUpdate(channel);
        }
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

        // Find a random target (not self)
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

// Turn timeout check
setInterval(async () => {
    if (!battle.active) return;
    const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
    const playerData = battle.players.get(currentPlayerId);
    if (Date.now() - playerData.lastAction > TURN_TIMEOUT) {
        const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
        await channel.send(`<@${currentPlayerId}> took too long! They are eliminated!`);
        battle.players.delete(currentPlayerId);
        battle.turnOrder = battle.turnOrder.filter(id => id !== currentPlayerId);
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
