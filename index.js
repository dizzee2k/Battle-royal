require('dotenv').config();
const { Client, IntentsBitField, SlashCommandBuilder, EmbedBuilder, AutocompleteInteraction } = require('discord.js');
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
const TURN_TIMEOUT = 60000; // 1 minute per turn

// Pokémon type effectiveness (multipliers)
const typeEffectiveness = {
    Normal: { weakTo: [], resistantTo: [], immuneTo: ['Ghost'], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Fire: { weakTo: ['Water', 'Rock'], resistantTo: ['Fire', 'Grass', 'Ice', 'Bug', 'Steel'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Water: { weakTo: ['Electric', 'Grass'], resistantTo: ['Fire', 'Water', 'Ice', 'Steel'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Electric: { weakTo: ['Ground'], resistantTo: ['Electric', 'Flying'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Grass: { weakTo: ['Fire', 'Ice', 'Poison', 'Flying', 'Bug'], resistantTo: ['Water', 'Electric', 'Grass'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Ice: { weakTo: ['Fire', 'Fighting', 'Rock', 'Steel'], resistantTo: ['Ice'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Fighting: { weakTo: ['Flying', 'Psychic'], resistantTo: ['Bug', 'Rock'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Poison: { weakTo: ['Ground', 'Psychic'], resistantTo: ['Grass', 'Fighting', 'Poison'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Ground: { weakTo: ['Water', 'Grass', 'Ice'], resistantTo: ['Poison', 'Rock'], immuneTo: ['Electric'], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Flying: { weakTo: ['Electric', 'Ice', 'Rock'], resistantTo: ['Grass', 'Fighting'], immuneTo: ['Ground'], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Psychic: { weakTo: ['Bug', 'Ghost'], resistantTo: ['Fighting', 'Psychic'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Bug: { weakTo: ['Fire', 'Flying', 'Rock'], resistantTo: ['Grass', 'Fighting'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Rock: { weakTo: ['Water', 'Grass', 'Fighting', 'Ground'], resistantTo: ['Normal', 'Fire'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Ghost: { weakTo: ['Ghost'], resistantTo: ['Poison', 'Bug'], immuneTo: ['Normal', 'Fighting'], multiplier: { weak: 2, resist: 0.5, immune: 0 } },
    Dragon: { weakTo: ['Ice'], resistantTo: ['Fire', 'Water', 'Electric'], immuneTo: [], multiplier: { weak: 2, resist: 0.5, immune: 0 } }
};

// Expanded Pokémon data with fixed base stats
const pokemonData = [
    { name: 'Bulbasaur', hp: 45, attack: 49, defense: 49, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip', 'Razor Leaf', 'Poison Powder'] },
    { name: 'Ivysaur', hp: 60, attack: 62, defense: 63, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip', 'Razor Leaf', 'Sleep Powder'] },
    { name: 'Venusaur', hp: 80, attack: 82, defense: 83, type: ['Grass', 'Poison'], moves: ['Petal Dance', 'Vine Whip', 'Razor Leaf', 'Toxic'] },
    { name: 'Charmander', hp: 39, attack: 52, defense: 43, type: ['Fire'], moves: ['Scratch', 'Ember', 'Flamethrower', 'Dragon Rage'] },
    { name: 'Charmeleon', hp: 58, attack: 64, defense: 58, type: ['Fire'], moves: ['Scratch', 'Ember', 'Flamethrower', 'Fire Spin'] },
    { name: 'Charizard', hp: 78, attack: 84, defense: 78, type: ['Fire', 'Flying'], moves: ['Flamethrower', 'Wing Attack', 'Fire Blast', 'Dragon Claw'] },
    { name: 'Squirtle', hp: 44, attack: 48, defense: 65, type: ['Water'], moves: ['Tackle', 'Water Gun', 'Bubble Beam', 'Withdraw'] },
    { name: 'Wartortle', hp: 59, attack: 63, defense: 80, type: ['Water'], moves: ['Water Gun', 'Bubble Beam', 'Hydro Pump', 'Protect'] },
    { name: 'Blastoise', hp: 79, attack: 83, defense: 100, type: ['Water'], moves: ['Hydro Pump', 'Bubble Beam', 'Skull Bash', 'Rapid Spin'] },
    { name: 'Caterpie', hp: 45, attack: 30, defense: 35, type: ['Bug'], moves: ['Tackle', 'String Shot', 'Bug Bite', 'Tackle'] },
    { name: 'Pikachu', hp: 35, attack: 55, defense: 40, type: ['Electric'], moves: ['Thunder Shock', 'Quick Attack', 'Thunderbolt', 'Agility'] },
    { name: 'Raichu', hp: 60, attack: 90, defense: 55, type: ['Electric'], moves: ['Thunderbolt', 'Quick Attack', 'Thunder', 'Iron Tail'] },
    { name: 'Eevee', hp: 55, attack: 55, defense: 50, type: ['Normal'], moves: ['Tackle', 'Quick Attack', 'Bite', 'Tail Whip'] },
    { name: 'Gengar', hp: 60, attack: 65, defense: 60, type: ['Ghost', 'Poison'], moves: ['Shadow Punch', 'Shadow Ball', 'Night Shade', 'Hypnosis'] },
    { name: 'Pidgey', hp: 40, attack: 45, defense: 40, type: ['Normal', 'Flying'], moves: ['Tackle', 'Gust', 'Wing Attack', 'Quick Attack'] },
    { name: 'Pidgeotto', hp: 63, attack: 60, defense: 55, type: ['Normal', 'Flying'], moves: ['Gust', 'Wing Attack', 'Aerial Ace', 'Quick Attack'] },
    { name: 'Pidgeot', hp: 83, attack: 80, defense: 75, type: ['Normal', 'Flying'], moves: ['Aerial Ace', 'Wing Attack', 'Hurricane', 'Quick Attack'] },
    { name: 'Rattata', hp: 30, attack: 56, defense: 35, type: ['Normal'], moves: ['Tackle', 'Quick Attack', 'Bite', 'Hyper Fang'] },
    { name: 'Raticate', hp: 55, attack: 81, defense: 60, type: ['Normal'], moves: ['Hyper Fang', 'Quick Attack', 'Bite', 'Super Fang'] },
    { name: 'Spearow', hp: 40, attack: 60, defense: 30, type: ['Normal', 'Flying'], moves: ['Peck', 'Aerial Ace', 'Fury Attack', 'Growl'] },
    { name: 'Fearow', hp: 65, attack: 90, defense: 65, type: ['Normal', 'Flying'], moves: ['Drill Peck', 'Aerial Ace', 'Fury Attack', 'Roost'] },
    { name: 'Ekans', hp: 35, attack: 60, defense: 44, type: ['Poison'], moves: ['Wrap', 'Poison Sting', 'Bite', 'Glare'] },
    { name: 'Arbok', hp: 60, attack: 95, defense: 69, type: ['Poison'], moves: ['Poison Fang', 'Bite', 'Glare', 'Toxic'] },
    { name: 'Sandshrew', hp: 50, attack: 75, defense: 85, type: ['Ground'], moves: ['Scratch', 'Sand Attack', 'Dig', 'Earthquake'] },
    { name: 'Sandslash', hp: 75, attack: 100, defense: 110, type: ['Ground'], moves: ['Earthquake', 'Dig', 'Sand Attack', 'Slash'] },
    { name: 'Nidoran♀', hp: 55, attack: 47, defense: 52, type: ['Poison'], moves: ['Tackle', 'Poison Sting', 'Bite', 'Double Kick'] },
    { name: 'Nidorina', hp: 70, attack: 62, defense: 67, type: ['Poison'], moves: ['Poison Sting', 'Bite', 'Double Kick', 'Toxic'] },
    { name: 'Nidoqueen', hp: 90, attack: 92, defense: 87, type: ['Poison', 'Ground'], moves: ['Earthquake', 'Poison Fang', 'Double Kick', 'Toxic'] },
    { name: 'Nidoran♂', hp: 46, attack: 57, defense: 40, type: ['Poison'], moves: ['Peck', 'Poison Sting', 'Horn Attack', 'Double Kick'] },
    { name: 'Nidorino', hp: 61, attack: 72, defense: 57, type: ['Poison'], moves: ['Poison Sting', 'Horn Attack', 'Double Kick', 'Toxic'] },
    { name: 'Nidoking', hp: 81, attack: 102, defense: 77, type: ['Poison', 'Ground'], moves: ['Earthquake', 'Poison Fang', 'Horn Attack', 'Toxic'] }
];

// Move data with status effects
const moveData = {
    'Tackle': { baseDamage: 10, accuracy: 95, type: 'Normal' },
    'Vine Whip': { baseDamage: 15, accuracy: 90, type: 'Grass' },
    'Razor Leaf': { baseDamage: 20, accuracy: 85, type: 'Grass' },
    'Poison Powder': { baseDamage: 0, accuracy: 75, type: 'Poison', status: true, statusEffect: 'poisoned', statusChance: 100 },
    'Scratch': { baseDamage: 12, accuracy: 90, type: 'Normal' },
    'Ember': { baseDamage: 15, accuracy: 90, type: 'Fire', statusEffect: 'burned', statusChance: 10 },
    'Flamethrower': { baseDamage: 20, accuracy: 85, type: 'Fire', statusEffect: 'burned', statusChance: 20 },
    'Dragon Rage': { baseDamage: 18, accuracy: 90, type: 'Dragon' },
    'Water Gun': { baseDamage: 15, accuracy: 95, type: 'Water' },
    'Bubble Beam': { baseDamage: 20, accuracy: 90, type: 'Water' },
    'Hydro Pump': { baseDamage: 25, accuracy: 80, type: 'Water' },
    'Thunder Shock': { baseDamage: 15, accuracy: 90, type: 'Electric', statusEffect: 'paralyzed', statusChance: 30 },
    'Quick Attack': { baseDamage: 12, accuracy: 95, type: 'Normal' },
    'Thunderbolt': { baseDamage: 20, accuracy: 90, type: 'Electric', statusEffect: 'paralyzed', statusChance: 30 },
    'Shadow Punch': { baseDamage: 15, accuracy: 90, type: 'Ghost' },
    'Shadow Ball': { baseDamage: 25, accuracy: 85, type: 'Ghost' },
    'Bite': { baseDamage: 15, accuracy: 90, type: 'Dark' },
    'Tail Whip': { baseDamage: 0, accuracy: 100, type: 'Normal', status: true },
    'Fire Spin': { baseDamage: 15, accuracy: 85, type: 'Fire', statusEffect: 'burned', statusChance: 10 },
    'Wing Attack': { baseDamage: 15, accuracy: 90, type: 'Flying' },
    'Fire Blast': { baseDamage: 25, accuracy: 80, type: 'Fire', statusEffect: 'burned', statusChance: 30 },
    'Dragon Claw': { baseDamage: 20, accuracy: 90, type: 'Dragon' },
    'Withdraw': { baseDamage: 0, accuracy: 100, type: 'Water', status: true },
    'Protect': { baseDamage: 0, accuracy: 100, type: 'Normal', status: true },
    'Skull Bash': { baseDamage: 20, accuracy: 90, type: 'Normal' },
    'Rapid Spin': { baseDamage: 10, accuracy: 95, type: 'Normal' },
    'String Shot': { baseDamage: 0, accuracy: 95, type: 'Bug', status: true },
    'Bug Bite': { baseDamage: 15, accuracy: 90, type: 'Bug' },
    'Agility': { baseDamage: 0, accuracy: 100, type: 'Psychic', status: true },
    'Thunder': { baseDamage: 25, accuracy: 80, type: 'Electric', statusEffect: 'paralyzed', statusChance: 30 },
    'Iron Tail': { baseDamage: 20, accuracy: 85, type: 'Steel' },
    'Night Shade': { baseDamage: 15, accuracy: 90, type: 'Ghost' },
    'Hypnosis': { baseDamage: 0, accuracy: 75, type: 'Psychic', status: true, statusEffect: 'asleep', statusChance: 100 },
    'Sleep Powder': { baseDamage: 0, accuracy: 75, type: 'Grass', status: true, statusEffect: 'asleep', statusChance: 100 },
    'Petal Dance': { baseDamage: 25, accuracy: 85, type: 'Grass' },
    'Toxic': { baseDamage: 0, accuracy: 90, type: 'Poison', status: true, statusEffect: 'poisoned', statusChance: 100 },
    'Gust': { baseDamage: 15, accuracy: 90, type: 'Flying' },
    'Aerial Ace': { baseDamage: 20, accuracy: 95, type: 'Flying' },
    'Hurricane': { baseDamage: 25, accuracy: 80, type: 'Flying' },
    'Hyper Fang': { baseDamage: 20, accuracy: 90, type: 'Normal' },
    'Super Fang': { baseDamage: 15, accuracy: 90, type: 'Normal' },
    'Peck': { baseDamage: 12, accuracy: 95, type: 'Flying' },
    'Fury Attack': { baseDamage: 15, accuracy: 85, type: 'Normal' },
    'Drill Peck': { baseDamage: 20, accuracy: 90, type: 'Flying' },
    'Roost': { baseDamage: 0, accuracy: 100, type: 'Flying', status: true },
    'Wrap': { baseDamage: 10, accuracy: 90, type: 'Normal' },
    'Poison Sting': { baseDamage: 15, accuracy: 90, type: 'Poison', statusEffect: 'poisoned', statusChance: 30 },
    'Glare': { baseDamage: 0, accuracy: 90, type: 'Normal', status: true, statusEffect: 'paralyzed', statusChance: 100 },
    'Poison Fang': { baseDamage: 20, accuracy: 85, type: 'Poison', statusEffect: 'poisoned', statusChance: 50 },
    'Sand Attack': { baseDamage: 0, accuracy: 100, type: 'Ground', status: true },
    'Dig': { baseDamage: 20, accuracy: 90, type: 'Ground' },
    'Earthquake': { baseDamage: 25, accuracy: 85, type: 'Ground' },
    'Slash': { baseDamage: 20, accuracy: 90, type: 'Normal' },
    'Double Kick': { baseDamage: 15, accuracy: 90, type: 'Fighting' },
    'Horn Attack': { baseDamage: 15, accuracy: 95, type: 'Normal' }
};

// Game state
let battle = {
    active: false,
    players: new Map(),
    currentTurn: 0,
    turnOrder: [],
    battleStartTime: null
};

function loadBattleState() {
    try {
        if (fs.existsSync('vouchData.json')) {
            const data = fs.readFileSync('vouchData.json', 'utf8');
            const parsedData = JSON.parse(data);
            battle.players = new Map(parsedData.battleRoyale || []);
        } else {
            console.log('vouchData.json not found, initializing new file.');
            fs.writeFileSync('vouchData.json', JSON.stringify({ battleRoyale: [] }));
            battle.players = new Map();
        }
    } catch (error) {
        console.error('Error loading battle state:', error.message);
        battle.players = new Map();
        fs.writeFileSync('vouchData.json', JSON.stringify({ battleRoyale: [] }));
    }
}

function saveBattleState() {
    try {
        const data = { battleRoyale: [...battle.players] };
        fs.writeFileSync('vouchData.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving battle state:', error.message);
    }
}

function getRandomPokemon() {
    const pokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    return { ...pokemon, currentHp: pokemon.hp, status: 'none', statusTurns: 0 }; // Initialize status
}

function applyStatusEffect(defender, move, channel) {
    const moveInfo = moveData[move];
    if (!moveInfo.statusEffect || Math.random() * 100 > moveInfo.statusChance) return false;

    // Don't apply a new status if the Pokémon already has one
    if (defender.status !== 'none') return false;

    defender.status = moveInfo.statusEffect;
    defender.statusTurns = moveInfo.statusEffect === 'asleep' ? Math.floor(Math.random() * 3) + 1 : 0; // Sleep lasts 1-3 turns
    channel.send(`(opponent)'s ${defender.name} is now ${defender.status}!`);
    return true;
}

function calculateDamage(attacker, defender, move, channel) {
    const moveInfo = moveData[move];
    if (!moveInfo || (moveInfo.status && moveInfo.baseDamage === 0)) {
        applyStatusEffect(defender, move, channel);
        return 0; // No damage for pure status moves
    }

    let damage = moveInfo.baseDamage; // Fixed base damage per move
    const defense = defender.defense; // Fixed defense stat

    // Apply type effectiveness
    const attackerType = moveInfo.type;
    const defenderTypes = defender.type;
    let effectiveness = 1;

    for (const defType of defenderTypes) {
        if (typeEffectiveness[defType].weakTo.includes(attackerType)) {
            effectiveness *= typeEffectiveness[defType].multiplier.weak;
        } else if (typeEffectiveness[defType].resistantTo.includes(attackerType)) {
            effectiveness *= typeEffectiveness[defType].multiplier.resist;
        } else if (typeEffectiveness[defType].immuneTo.includes(attackerType)) {
            effectiveness = typeEffectiveness[defType].multiplier.immune;
        }
    }

    // Adjust damage based on attacker's attack stat and defender's defense
    damage = Math.max(1, (attacker.attack * damage) / defense * effectiveness);

    // Apply status effect if applicable
    applyStatusEffect(defender, move, channel);

    return Math.floor(damage);
}

function handleStatusEffects(playerData, channel) {
    const pokemon = playerData.pokemon;
    let canAct = true;

    if (pokemon.status === 'paralyzed' && Math.random() < 0.25) {
        channel.send(`(opponent)'s ${pokemon.name} is paralyzed and can't move!`);
        canAct = false;
    } else if (pokemon.status === 'asleep') {
        if (pokemon.statusTurns > 0) {
            channel.send(`(opponent)'s ${pokemon.name} is asleep and can't move!`);
            pokemon.statusTurns--;
            canAct = false;
        } else {
            channel.send(`(opponent)'s ${pokemon.name} woke up!`);
            pokemon.status = 'none';
        }
    } else if (pokemon.status === 'poisoned') {
        const poisonDamage = Math.floor(pokemon.hp / 8); // Poison deals 1/8 max HP per turn
        pokemon.currentHp = Math.max(0, pokemon.currentHp - poisonDamage);
        channel.send(`(opponent)'s ${pokemon.name} took ${poisonDamage} damage from poison!`);
    } else if (pokemon.status === 'burned') {
        const burnDamage = Math.floor(pokemon.hp / 16); // Burn deals 1/16 max HP per turn
        pokemon.currentHp = Math.max(0, pokemon.currentHp - burnDamage);
        channel.send(`(opponent)'s ${pokemon.name} took ${burnDamage} damage from its burn!`);
    }

    if (pokemon.currentHp === 0) {
        channel.send(`(opponent)'s ${pokemon.name} has fainted due to status effects! (opponent) is eliminated!`);
        battle.players.delete(playerData.ownerId);
        battle.turnOrder = battle.turnOrder.filter(id => id !== playerData.ownerId);
        saveBattleState();
    }

    return canAct;
}

function checkBattleEnd() {
    const alivePlayers = battle.players.size;
    if (alivePlayers <= 1) {
        battle.active = false;
        battle.battleStartTime = null;
        return true;
    }
    return false;
}

async function announceBattleUpdate(channel) {
    try {
        const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
        const embed = new EmbedBuilder()
            .setTitle('Pokémon Battle Royale')
            .setDescription(battle.active ? `**Battle in progress!** Current turn: <@${currentPlayerId}>` : '**Waiting for players to join or start...**')
            .setColor(battle.active ? '#ff4444' : '#4444ff') // Red for active, blue for waiting
            .setThumbnail('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png') // Pikachu thumbnail
            .setFooter({ text: 'Pokémon Battle Royale - May the best trainer win!', iconURL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' })
            .setTimestamp();

        // Build fields based on the current player
        const fields = [];
        for (const [userId, data] of battle.players.entries()) {
            const isCurrentUser = userId === currentPlayerId;
            const pokemonName = isCurrentUser ? data.pokemon.name : '(opponent)';
            const statusText = data.pokemon.status !== 'none' ? ` (${data.pokemon.status})` : '';
            fields.push({
                name: `${pokemonName}${statusText}`,
                value: `**HP:** ${data.pokemon.currentHp}/${data.pokemon.hp}`
            });
        }
        embed.addFields(fields);

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error in announceBattleUpdate:', error.message);
    }
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
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option.setName('target')
                    .setDescription('The target (player or Pokémon name)')
                    .setRequired(true)
                    .setAutocomplete(true)
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

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        const userId = interaction.user.id;

        if (focusedOption.name === 'move') {
            const playerData = battle.players.get(userId);
            if (!playerData) {
                await interaction.respond([]);
                return;
            }

            const moves = playerData.pokemon.moves.map(move => {
                const moveInfo = moveData[move];
                return {
                    name: `${move} (Power: ${moveInfo.baseDamage}, Accuracy: ${moveInfo.accuracy}%)`,
                    value: move
                };
            });

            await interaction.respond(moves);
        }

        if (focusedOption.name === 'target') {
            const targets = Array.from(battle.players.entries()).map(([id, data]) => ({
                name: `${data.pokemon.name} (owned by <@${id}>)`,
                value: id
            }));

            await interaction.respond(targets);
        }

        return;
    }

    if (!interaction.isCommand()) return;

    if (interaction.channelId !== BATTLE_CHANNEL_ID) {
        await interaction.reply({ content: 'Please use this command in the designated battle channel!', ephemeral: true });
        return;
    }

    const { commandName, user, options } = interaction;
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    const userId = user.id;

    try {
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
            battle.players.set(userId, { pokemon, lastAction: null, ownerId: userId });
            saveBattleState();
            await interaction.reply({ content: `You joined the battle with ${pokemon.name}! ${MAX_PLAYERS - battle.players.size} slots remain. Use /startbattle to begin.`, ephemeral: true });
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
            battle.battleStartTime = Date.now();
            await interaction.reply({ content: 'Battle starting now! Check your move options with /attack.', ephemeral: true });
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

            const attackerData = battle.players.get(userId);

            // Check status effects before allowing the attack
            if (!handleStatusEffects(attackerData, channel)) {
                battle.currentTurn++;
                await announceBattleUpdate(channel);
                await interaction.reply({ content: `Your Pokémon couldn't act due to its status!`, ephemeral: true });
                return;
            }

            const move = options.getString('move');
            const targetId = options.getString('target');

            if (!attackerData.pokemon.moves.includes(move)) {
                const moveOptions = attackerData.pokemon.moves.map(m => {
                    const moveInfo = moveData[m];
                    return `• ${m} (Power: ${moveInfo.baseDamage}, Accuracy: ${moveInfo.accuracy}%)`;
                }).join('\n');
                await interaction.reply({
                    content: `Invalid move! Your available moves are:\n${moveOptions}\nUse /attack <move> <target> to attack.`,
                    ephemeral: true
                });
                return;
            }

            if (!battle.players.has(targetId)) {
                await interaction.reply({ content: 'Target not in battle!', ephemeral: true });
                return;
            }

            const targetData = battle.players.get(targetId);
            const damage = calculateDamage(attackerData.pokemon, targetData.pokemon, move, channel);
            targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

            if (damage > 0) {
                await channel.send(`Your ${attackerData.pokemon.name} used ${move} on (opponent)'s ${targetData.pokemon.name} for ${damage} damage!`);
            }

            if (targetData.pokemon.currentHp === 0) {
                await channel.send(`(opponent)'s ${targetData.pokemon.name} has fainted! (opponent) is eliminated!`);
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

            await interaction.reply({ content: `You used ${move} on (opponent)'s ${targetData.pokemon.name}!`, ephemeral: true });
        }

        if (commandName === 'battle_status') {
            await announceBattleUpdate(channel);
            await interaction.reply({ content: 'Battle status updated!', ephemeral: true });
        }
    } catch (error) {
        console.error(`Error handling interaction (${commandName}):`, error.message);
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
    }
});

setInterval(async () => {
    if (!battle.active || !battle.battleStartTime) return;
    const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
    const playerData = battle.players.get(currentPlayerId);
    if (playerData && playerData.lastAction && (Date.now() - playerData.lastAction > TURN_TIMEOUT)) {
        try {
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
                battle.battleStartTime = null;
                saveBattleState();
            }
        } catch (error) {
            console.error('Error in timeout check:', error.message);
        }
    }
}, 5000);

client.login(process.env.DISCORD_TOKEN).catch(console.error);
