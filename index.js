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

const GUILD_ID = '1242348592547496046';
const BATTLE_CHANNEL_ID = '1348420527244709958';
const APPLICATION_ID = '1348420959542968341';
const MAX_PLAYERS = 8;
const TURN_TIMEOUT = 60000;
const INVENTORY_LIMIT = 6;
const SHINY_CHANCE = 1 / 8192;
const EXP_PER_LEVEL = 100;

const BASE_EXP_GAIN = 50;
const WINNER_EXP_MULTIPLIER = 1.5;
const LEVEL_SCALING_FACTOR = 1.2;

const BATTLE_CHECK_INTERVAL = 5000;
const SPAWN_CHECK_INTERVAL = 5000;

const POKEBALL_TYPES = {
    'pokeball': { price: 10, catchRate: 1.0, name: 'Poké Ball' },
    'greatball': { price: 20, catchRate: 1.5, name: 'Great Ball' },
    'ultraball': { price: 30, catchRate: 2.0, name: 'Ultra Ball' },
    'premierball': { price: 50, catchRate: 2.5, name: 'Premier Ball' }
};

const SPAWN_INTERVAL = Math.floor(Math.random() * (300000 - 180000) + 180000);
const BASE_CATCH_RATE = 0.4;
const STARTING_MONEY = 100;

const typeEffectiveness = {};

const pokemonData = [
    { name: 'Bulbasaur', hp: 45, attack: 49, defense: 49, type: ['Grass', 'Poison'],
        moves: ['Tackle', 'Vine Whip', 'Razor Leaf', 'Poison Powder'],
        evolvesTo: 'Ivysaur', evolveLevel: 16 },
];

const moveData = {
    'Solar Beam': {
        baseDamage: 30,
        accuracy: 80,
        type: 'Grass',
        weatherEffect: {
            'Sunny': { damageMultiplier: 1.5, accuracyBonus: 10 },
            'Rain': { damageMultiplier: 0.5, accuracyBonus: -10 }
        }
    },
};

let gameState = {
    wildPokemon: null,
    lastSpawnTime: Date.now()
};

let battle = {
    active: false,
    players: new Map(),
    currentTurn: 0,
    turnOrder: [],
    battleStartTime: null,
    weather: 'Clear',
    lastTurnTime: null,
    turnTimeout: TURN_TIMEOUT
};

let userData = new Map();

function loadGameState() {
    try {
        if (fs.existsSync('gameData.json')) {
            const data = fs.readFileSync('gameData.json', 'utf8');
            const parsedData = JSON.parse(data);
            battle.players = new Map(parsedData.battleRoyale || []);
            userData = new Map(parsedData.userData || []);
            gameState = parsedData.gameState || {};
        } else {
            console.log('gameData.json not found, initializing new file.');
            fs.writeFileSync('gameData.json', JSON.stringify({ battleRoyale: [], userData: [], gameState: {} }));
            battle.players = new Map();
            userData = new Map();
            gameState = {};
        }
    } catch (error) {
        console.error('Error loading game state:', error.message);
        battle.players = new Map();
        userData = new Map();
        gameState = {};
        fs.writeFileSync('gameData.json', JSON.stringify({ battleRoyale: [], userData: [], gameState: {} }));
    }
}

function saveGameState() {
    try {
        const data = {
            battleRoyale: [...battle.players],
            userData: [...userData],
            gameState: gameState
        };
        fs.writeFileSync('gameData.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving game state:', error.message);
    }
}

function getRandomPokemon(excludeStarters = false) {
    let availablePokemon = pokemonData.filter(p =>
        !excludeStarters ||
        !['Bulbasaur', 'Charmander', 'Squirtle', 'Chikorita', 'Cyndaquil', 'Totodile', 'Treecko', 'Torchic', 'Mudkip']
            .includes(p.name));
    const pokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
    const isShiny = Math.random() < SHINY_CHANCE;
    const shinyBoost = isShiny ? 1.1 : 1;

    return {
        ...pokemon,
        currentHp: Math.floor(pokemon.hp * shinyBoost),
        hp: Math.floor(pokemon.hp * shinyBoost),
        attack: Math.floor(pokemon.attack * shinyBoost),
        status: 'none',
        statusTurns: 0,
        isShiny,
        level: 5,
        exp: 0
    };
}

async function checkEvolution(userId, pokemon, channel) {
    if (!pokemon.evolvesTo || pokemon.level < pokemon.evolveLevel) return pokemon;

    const evolvedData = pokemonData.find(p => p.name === pokemon.evolvesTo);
    if (!evolvedData) return pokemon;

    const evolvedPokemon = {
        ...evolvedData,
        currentHp: Math.floor(pokemon.currentHp * (evolvedData.hp / pokemon.hp)),
        hp: evolvedData.hp,
        attack: evolvedData.attack,
        defense: evolvedData.defense,
        status: pokemon.status,
        statusTurns: pokemon.statusTurns,
        isShiny: pokemon.isShiny,
        level: pokemon.level,
        exp: pokemon.exp
    };

    const embed = new EmbedBuilder()
        .setTitle('Evolution!')
        .setDescription(`Congratulations! Your ${pokemon.name} has evolved into ${evolvedPokemon.name}!`)
        .setColor('#FF0000')
        .setThumbnail('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png')
        .setTimestamp();

    await channel.send({ embeds: [embed] });

    return evolvedPokemon;
}

function calculateDamage(attacker, defender, move, channel, attackerId) {
    const moveInfo = moveData[move];
    if (!moveInfo || (moveInfo.status && moveInfo.baseDamage === 0)) {
        applyStatusEffect(attackerId, defender, move, channel);
        return 0;
    }

    let damage = moveInfo.baseDamage;
    const defense = defender.defense;
    let effectiveness = getEffectiveness(moveInfo.type, defender.type);

    if (battle.weather === 'Rain' && moveInfo.type === 'Water') {
        damage *= 1.5;
    } else if (battle.weather === 'Sunny' && moveInfo.type === 'Fire') {
        damage *= 1.5;
    }

    damage = Math.max(1, (attacker.attack * damage) / defense * effectiveness);

    applyStatusEffect(attackerId, defender, move, channel);

    return Math.floor(damage);
}

function applyStatusEffect(attackerId, defender, move, channel) {
    console.log(`${defender.name} was targeted with ${move} but no status applied.`);
}

function getEffectiveness(moveType, defenderTypes) {
    return 1.0;
}

function levelUpPokemon(pokemon) {
    pokemon.level++;
    const statGain = 1.05;
    pokemon.hp = Math.floor(pokemon.hp * statGain);
    pokemon.attack = Math.floor(pokemon.attack * statGain);
    pokemon.defense = Math.floor(pokemon.defense * statGain);
    pokemon.currentHp = pokemon.hp;

    return {
        hpGain: Math.floor(pokemon.hp * (statGain - 1)),
        attackGain: Math.floor(pokemon.attack * (statGain - 1)),
        defenseGain: Math.floor(pokemon.defense * (statGain - 1))
    };
}

function getRequiredExp(level) {
    return Math.floor(EXP_PER_LEVEL * Math.pow(LEVEL_SCALING_FACTOR, level - 1));
}

async function awardExperience(userId, pokemon, channel, isWinner = false) {
    const baseExp = BASE_EXP_GAIN;
    const expMultiplier = isWinner ? WINNER_EXP_MULTIPLIER : 1;
    const expGained = Math.floor(baseExp * expMultiplier);

    pokemon.exp += expGained;

    const requiredExp = getRequiredExp(pokemon.level);
    if (pokemon.exp >= requiredExp) {
        pokemon.exp -= requiredExp;
        const statGains = levelUpPokemon(pokemon);

        const levelUpEmbed = new EmbedBuilder()
            .setTitle('Level Up! 🌟')
            .setDescription(`${pokemon.name} has reached level ${pokemon.level}!`)
            .addFields(
                { name: 'HP Increase', value: `+${statGains.hpGain}`, inline: true },
                { name: 'Attack Increase', value: `+${statGains.attackGain}`, inline: true },
                { name: 'Defense Increase', value: `+${statGains.defenseGain}`, inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        await channel.send({ embeds: [levelUpEmbed] });

        pokemon = await checkEvolution(userId, pokemon, channel);
    }

    const expEmbed = new EmbedBuilder()
        .setTitle('Experience Gained! ✨')
        .setDescription(`${pokemon.name} gained ${expGained} experience points!`)
        .addFields(
            { name: 'Current EXP', value: `${pokemon.exp}/${getRequiredExp(pokemon.level)}`, inline: true },
            { name: 'Level', value: `${pokemon.level}`, inline: true }
        )
        .setColor('#FFD700')
        .setTimestamp();

    await channel.send({ embeds: [expEmbed] });

    return pokemon;
}

async function handleBattleEnd(channel) {
    if (battle.players.size <= 1) {
        const winnerId = Array.from(battle.players.keys())[0];
        const winnerData = battle.players.get(winnerId);

        if (winnerData && !winnerData.isBot) {
            const defeatedBots = Array.from(battle.players.entries())
                .filter(([_, data]) => data.isBot)
                .reduce((total, [_, data]) => total + data.reward, 0);

            const userData = userData.get(winnerId);
            if (userData) {
                userData.money += defeatedBots;
                saveGameState();
            }

            winnerData.pokemon = await awardExperience(winnerId, winnerData.pokemon, channel, true);

            const winnerEmbed = new EmbedBuilder()
                .setTitle('Battle Royale Winner! 🏆')
                .setDescription(`${winnerData.pokemon.name} is victorious!`)
                .addFields(
                    { name: 'Rewards Earned', value: `${defeatedBots} coins`, inline: true },
                    { name: 'Defeated Bots', value: `${Array.from(battle.players.values()).filter(p => p.isBot).length}`, inline: true }
                )
                .setColor('#FFD700')
                .setTimestamp();

            await channel.send({ embeds: [winnerEmbed] });
        }

        battle.active = false;
        battle.battleStartTime = null;
        battle.weather = ['Clear', 'Rain', 'Sunny'][Math.floor(Math.random() * 3)];
        saveGameState();
    } else {
        for (const [userId, playerData] of battle.players) {
            playerData.pokemon = await awardExperience(userId, playerData.pokemon, channel);
        }
        battle.active = false;
        battle.battleStartTime = null;
        battle.weather = ['Clear', 'Rain', 'Sunny'][Math.floor(Math.random() * 3)];
        saveGameState();
    }
}

function checkBattleEnd() {
    if (battle.players.size <= 1) {
        return true;
    }

    const now = Date.now();
    for (const [playerId, playerData] of battle.players) {
        if (now - playerData.lastAction > TURN_TIMEOUT) {
            battle.players.delete(playerId);
            return true;
        }
    }
    return false;
}

async function spawnWildPokemon(channel) {
    const pokemon = getRandomPokemon();
    gameState.wildPokemon = pokemon;
    gameState.lastSpawnTime = Date.now();
    await channel.send(`A wild ${pokemon.name} has appeared!`);
}

function getTypeColor(type) {
    const colors = { Grass: '#78C850', Poison: '#A040A0', Fire: '#F08030' };
    return colors[type] || '#000000';
}

function getPokemonSprite(name, isShiny) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${pokemonData.find(p => p.name.toLowerCase() === name.toLowerCase()).name.toLowerCase()}.png`;
}

client.once('ready', async () => {
    try {
        console.log(`Battle Royale Bot is online as ${client.user.tag}`);
        loadGameState();

        const commands = [
            new SlashCommandBuilder()
                .setName('start')
                .setDescription('Start your Pokémon journey with a starter Pokémon')
                .addStringOption(option =>
                    option.setName('starter')
                        .setDescription('Choose your starter Pokémon')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bulbasaur', value: 'Bulbasaur' },
                            { name: 'Charmander', value: 'Charmander' },
                            { name: 'Squirtle', value: 'Squirtle' },
                            { name: 'Chikorita', value: 'Chikorita' },
                            { name: 'Cyndaquil', value: 'Cyndaquil' },
                            { name: 'Totodile', value: 'Totodile' },
                            { name: 'Treecko', value: 'Treecko' },
                            { name: 'Torchic', value: 'Torchic' },
                            { name: 'Mudkip', value: 'Mudkip' }
                        )),
            new SlashCommandBuilder()
                .setName('join_battle')
                .setDescription('Join the current battle royale'),
            new SlashCommandBuilder()
                .setName('attack')
                .setDescription('Attack another player in battle')
                .addStringOption(option =>
                    option.setName('move')
                        .setDescription('The move to use')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('target')
                        .setDescription('The target player')
                        .setRequired(true)),
            new SlashCommandBuilder()
                .setName('check_stats')
                .setDescription('Check your Pokémon\'s stats, level, and experience progress'),
            new SlashCommandBuilder()
                .setName('inventory')
                .setDescription('Check your Pokémon collection'),
            new SlashCommandBuilder()
                .setName('help')
                .setDescription('Show information about available commands'),
            new SlashCommandBuilder()
                .setName('weather')
                .setDescription('Check current battle weather conditions'),
            new SlashCommandBuilder()
                .setName('shop')
                .setDescription('View the Poké Ball shop'),
            new SlashCommandBuilder()
                .setName('buy')
                .setDescription('Buy items from the shop')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('The item to buy')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Poké Ball (10 coins)', value: 'pokeball' },
                            { name: 'Great Ball (20 coins)', value: 'greatball' },
                            { name: 'Ultra Ball (30 coins)', value: 'ultraball' },
                            { name: 'Premier Ball (50 coins)', value: 'premierball' }
                        ))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('How many to buy')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(99)),
            new SlashCommandBuilder()
                .setName('catch')
                .setDescription('Try to catch a wild Pokémon')
                .addStringOption(option =>
                    option.setName('ball')
                        .setDescription('Which ball to use')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Poké Ball', value: 'pokeball' },
                            { name: 'Great Ball', value: 'greatball' },
                            { name: 'Ultra Ball', value: 'ultraball' },
                            { name: 'Premier Ball', value: 'premierball' }
                        )),
            new SlashCommandBuilder()
                .setName('bal')
                .setDescription('Check your balance and inventory'),
            new SlashCommandBuilder()
                .setName('battlebots')
                .setDescription('Add bot players to the battle')
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Number of bots to add (1-8)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(8))
                .addStringOption(option =>
                    option.setName('difficulty')
                        .setDescription('Choose bot difficulty')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Easy (10 coin reward)', value: 'easy' },
                            { name: 'Medium (30 coin reward)', value: 'medium' },
                            { name: 'Hard (50 coin reward)', value: 'hard' }
                        ))
        ].map(command => command.toJSON());

        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands })
            .then(() => console.log('Commands registered'))
            .catch(console.error);

        const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
        await channel.send('Enhanced Pokémon Battle Royale Bot is online! Now with evolution, weather effects, and more!');

        gameState.lastSpawnTime = Date.now();
        gameState.wildPokemon = null;

        setInterval(async () => {
            try {
                if (!gameState.wildPokemon && Date.now() - gameState.lastSpawnTime >= SPAWN_INTERVAL) {
                    await spawnWildPokemon(channel);
                }
            } catch (error) {
                console.error('Error in spawn interval:', error);
            }
        }, SPAWN_CHECK_INTERVAL);

        setInterval(async () => {
            try {
                if (battle.active) {
                    const now = Date.now();
                    if (now - battle.lastTurnTime > battle.turnTimeout) {
                        const currentPlayerId = battle.turnOrder[battle.currentTurn];
                        battle.players.delete(currentPlayerId);

                        if (checkBattleEnd()) {
                            await handleBattleEnd(channel);
                        } else {
                            battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
                            battle.lastTurnTime = now;
                        }
                    }
                }
            } catch (error) {
                console.error('Error in battle interval:', error);
            }
        }, BATTLE_CHECK_INTERVAL);
    } catch (error) {
        console.error('Error during bot initialization:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'start') {
        try {
            if (userData.has(interaction.user.id)) {
                return await interaction.reply('You already have a starter Pokémon! Use /check_stats to see your Pokémon.');
            }

            const starterName = interaction.options.getString('starter');
            const starterData = pokemonData.find(p => p.name === starterName);

            if (!starterData) {
                return await interaction.reply('Invalid starter Pokémon selected.');
            }

            const pokemon = {
                ...starterData,
                currentHp: starterData.hp,
                status: 'none',
                statusTurns: 0,
                isShiny: Math.random() < SHINY_CHANCE,
                level: 5,
                exp: 0
            };

            userData.set(interaction.user.id, {
                pokemon: pokemon,
                inventory: { pokeball: 5, greatball: 0, ultraball: 0, premierball: 0 },
                money: STARTING_MONEY,
                collection: [pokemon]
            });
            saveGameState();

            const embed = new EmbedBuilder()
                .setTitle('Welcome to Pokémon Battle Royale!')
                .setDescription(`You've chosen ${starterName} as your starter!\nYou also received:\n- 5 Poké Balls\n- ${STARTING_MONEY} coins`)
                .setColor(getTypeColor(pokemon.type[0]))
                .setThumbnail(getPokemonSprite(starterName, pokemon.isShiny))
                .addFields(
                    { name: 'Level', value: '5', inline: true },
                    { name: 'HP', value: `${pokemon.hp}`, inline: true },
                    { name: 'Type', value: pokemon.type.join('/'), inline: true },
                    { name: 'Inventory', value: '5 Poké Balls', inline: true },
                    { name: 'Money', value: `${STARTING_MONEY} coins`, inline: true }
                )
                .setFooter({ text: pokemon.isShiny ? '✨ Lucky! You got a shiny! ✨' : 'Your journey begins!' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in start command:', error);
            await interaction.reply('There was an error starting your journey. Please try again.');
        }
    }

    else if (commandName === 'join_battle') {
        try {
            if (!userData.has(interaction.user.id)) {
                return await interaction.reply('You need to get a starter Pokémon first! Use /start to begin.');
            }

            if (!battle.players.size) {
                battle.players = new Map();
                battle.turnOrder = [];
                battle.active = false;
                battle.currentTurn = 0;
                battle.weather = 'Clear';
                console.log('Battle object initialized');
            }

            if (battle.active && battle.players.has(interaction.user.id)) {
                return await interaction.reply('You are already in the battle!');
            }

            if (battle.active && battle.players.size >= MAX_PLAYERS) {
                return await interaction.reply('The battle is full! Wait for the next one.');
            }

            const userPokemon = userData.get(interaction.user.id).pokemon;
            console.log(`Adding player ${interaction.user.id} with Pokemon ${userPokemon.name}`);

            battle.players.set(interaction.user.id, {
                pokemon: { ...userPokemon },
                isBot: false,
                ownerId: interaction.user.id,
                lastAction: Date.now()
            });

            if (!battle.active && battle.players.size >= 2) {
                console.log('Starting battle with', battle.players.size, 'players');
                battle.active = true;
                battle.currentTurn = 0;
                battle.turnOrder = Array.from(battle.players.keys());
                battle.battleStartTime = Date.now();
                battle.lastTurnTime = Date.now();
                battle.weather = ['Clear', 'Rain', 'Sunny'][Math.floor(Math.random() * 3)];

                const startEmbed = new EmbedBuilder()
                    .setTitle('⚔️ Battle Royale Started! ⚔️')
                    .setDescription(`A new battle has begun with ${battle.players.size} players!`)
                    .addFields(
                        { name: 'Weather', value: battle.weather, inline: true },
                        { name: 'Players', value: Array.from(battle.players.values()).map(p => p.pokemon.name).join(', '), inline: true }
                    )
                    .setColor('#FF0000')
                    .setTimestamp();

                await interaction.channel.send({ embeds: [startEmbed] });
            }

            saveGameState();

            const embed = new EmbedBuilder()
                .setTitle('Battle Royale - New Challenger!')
                .setDescription(`${interaction.user.username} has joined the battle with ${userPokemon.name}!`)
                .addFields(
                    { name: 'Current Players', value: `${battle.players.size}/${MAX_PLAYERS}`, inline: true },
                    { name: 'Battle Status', value: battle.active ? 'In Progress' : 'Waiting for players', inline: true },
                    { name: 'Weather', value: battle.weather, inline: true }
                )
                .setColor('#0000FF')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in join_battle command:', error);
            await interaction.reply({
                content: 'There was an error joining the battle. Please try again.',
                ephemeral: true
            });
        }
    }

    else if (commandName === 'attack') {
        try {
            if (!battle.active) {
                return await interaction.reply('There is no active battle! Use /join_battle to start one.');
            }

            if (!battle.players.has(interaction.user.id)) {
                return await interaction.reply('You are not in this battle!');
            }

            const playerData = battle.players.get(interaction.user.id);
            const moveName = interaction.options.getString('move');
            const targetName = interaction.options.getString('target');

            if (!playerData.pokemon.moves.includes(moveName)) {
                return await interaction.reply('Invalid move! Check your Pokémon\'s available moves.');
            }

            const targetPlayer = Array.from(battle.players.entries())
                .find(([_, data]) => data.pokemon.name === targetName);

            if (!targetPlayer) {
                return await interaction.reply('Invalid target! Choose a Pokémon that is in the battle.');
            }

            const [targetId, targetData] = targetPlayer;

            const damage = calculateDamage(playerData.pokemon, targetData.pokemon, moveName, interaction.channel, interaction.user.id);
            targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

            const embed = new EmbedBuilder()
                .setTitle('Battle Action!')
                .setDescription(`${playerData.pokemon.name} used ${moveName} on ${targetData.pokemon.name}!`)
                .addFields(
                    { name: 'Damage Dealt', value: `${damage}`, inline: true },
                    { name: 'Target HP', value: `${targetData.pokemon.currentHp}/${targetData.pokemon.hp}`, inline: true }
                )
                .setColor(getTypeColor(playerData.pokemon.type[0]))
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            if (targetData.pokemon.currentHp === 0) {
                battle.players.delete(targetId);
                battle.turnOrder = battle.turnOrder.filter(id => id !== targetId);

                const eliminationEmbed = new EmbedBuilder()
                    .setTitle('Pokémon Fainted!')
                    .setDescription(`${targetData.pokemon.name} has fainted! ${targetData.isBot ? 'Bot' : targetName} is eliminated!`)
                    .setColor('#FF0000')
                    .setTimestamp();

                await interaction.channel.send({ embeds: [eliminationEmbed] });

                if (checkBattleEnd()) {
                    await handleBattleEnd(interaction.channel);
                }
            }

            saveGameState();
            playerData.lastAction = Date.now();
            battle.lastTurnTime = Date.now();

        } catch (error) {
            console.error('Error in attack command:', error);
            await interaction.reply('There was an error processing your attack. Please try again.');
        }
    }

    else if (commandName === 'check_stats') {
        try {
            if (!userData.has(interaction.user.id)) {
                return await interaction.reply('You don\'t have any Pokémon yet! Use /start to get your first Pokémon.');
            }

            const userPokemon = userData.get(interaction.user.id).pokemon;
            const requiredExp = getRequiredExp(userPokemon.level);
            const expProgress = Math.floor((userPokemon.exp / requiredExp) * 100);

            const statsEmbed = new EmbedBuilder()
                .setTitle(`${userPokemon.name}'s Stats ${userPokemon.isShiny ? '✨' : ''}`)
                .setDescription(`Level ${userPokemon.level} ${userPokemon.name}`)
                .addFields(
                    { name: 'HP', value: `${userPokemon.currentHp}/${userPokemon.hp}`, inline: true },
                    { name: 'Attack', value: `${userPokemon.attack}`, inline: true },
                    { name: 'Defense', value: `${userPokemon.defense}`, inline: true },
                    { name: 'Experience', value: `${userPokemon.exp}/${requiredExp} (${expProgress}%)`, inline: false },
                    { name: 'Status', value: userPokemon.status === 'none' ? 'Healthy' : userPokemon.status, inline: true }
                )
                .setColor(getTypeColor(userPokemon.type[0]))
                .setThumbnail(getPokemonSprite(userPokemon.name, userPokemon.isShiny))
                .setFooter({ text: `Next level at ${requiredExp} EXP` })
                .setTimestamp();

            await interaction.reply({ embeds: [statsEmbed] });
        } catch (error) {
            console.error('Error in check_stats command:', error);
            await interaction.reply('There was an error checking your Pokémon\'s stats. Please try again later.');
        }
    }

    else if (commandName === 'inventory') {
        try {
            if (!userData.has(interaction.user.id)) {
                return await interaction.reply('You don\'t have any Pokémon yet! Use /start to get your first Pokémon.');
            }

            const userDat = userData.get(interaction.user.id);
            const embed = new EmbedBuilder()
                .setTitle(`${interaction.user.username}'s Inventory`)
                .addFields(
                    { name: 'Money', value: `${userDat.money} coins`, inline: false },
                    { name: 'Poké Balls', value: Object.entries(userDat.inventory)
                        .map(([type, count]) => `${POKEBALL_TYPES[type].name}: ${count}`)
                        .join('\n'), inline: true },
                    { name: 'Collection Size', value: `${userDat.collection.length} Pokémon`, inline: true }
                )
                .setColor('#4169E1')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in inventory command:', error);
            await interaction.reply('There was an error checking your inventory. Please try again later.');
        }
    }

    else if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('Pokémon Battle Royale - Help')
            .setDescription('Here are all the available commands:')
            .addFields(
                { name: '/start', value: 'Start your Pokémon journey with a starter Pokémon', inline: true },
                { name: '/join_battle', value: 'Join the current battle royale', inline: true },
                { name: '/attack', value: 'Attack another player in battle', inline: true },
                { name: '/check_stats', value: 'Check your Pokémon\'s stats', inline: true },
                { name: '/inventory', value: 'Check your Pokémon collection', inline: true },
                { name: '/battlebots', value: 'Add bot players to the battle', inline: true }
            )
            .setColor('#FFD700')
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed] });
    }

    else if (commandName === 'weather') {
        const weatherEmbed = new EmbedBuilder()
            .setTitle('Current Weather')
            .setDescription(`The current battle weather is: ${battle.weather}`)
            .setColor('#87CEEB')
            .setTimestamp();

        await interaction.reply({ embeds: [weatherEmbed] });
    }

    else if (commandName === 'shop') {
        const shopEmbed = new EmbedBuilder()
            .setTitle('🏪 Poké Ball Shop')
            .setDescription('Available items for purchase:')
            .addFields(
                { name: 'Poké Ball', value: '```Price: 10 coins\nCatch Rate: 1.0x```', inline: true },
                { name: 'Great Ball', value: '```Price: 20 coins\nCatch Rate: 1.5x```', inline: true },
                { name: 'Ultra Ball', value: '```Price: 30 coins\nCatch Rate: 2.0x```', inline: true },
                { name: 'Premier Ball', value: '```Price: 50 coins\nCatch Rate: 2.5x```', inline: true },
                { name: '📝 How to Buy', value: 'Use `/buy [ball] [quantity]` to purchase items!\nExample: `/buy pokeball 5`' }
            )
            .setColor('#FFD700')
            .setFooter({ text: 'Higher catch rates give you better chances of catching Pokémon!' })
            .setTimestamp();

        await interaction.reply({ embeds: [shopEmbed] });
    }

    else if (commandName === 'buy') {
        try {
            if (!userData.has(interaction.user.id)) {
                return await interaction.reply('You need to start your journey first! Use /start to begin.');
            }

            const item = interaction.options.getString('item');
            const quantity = interaction.options.getInteger('quantity');
            const userDat = userData.get(interaction.user.id);

            if (!POKEBALL_TYPES[item]) {
                return await interaction.reply('Invalid item! Use `/shop` to see available items.');
            }

            const totalCost = POKEBALL_TYPES[item].price * quantity;

            if (userDat.money < totalCost) {
                return await interaction.reply(`❌ You don't have enough money!\nCost: ${totalCost} coins\nYour balance: ${userDat.money} coins\nYou need ${totalCost - userDat.money} more coins!`);
            }

            userDat.money -= totalCost;
            userDat.inventory[item] = (userDat.inventory[item] || 0) + quantity;
            saveGameState();

            const embed = new EmbedBuilder()
                .setTitle('✅ Purchase Successful!')
                .setDescription(`You bought ${quantity}x ${POKEBALL_TYPES[item].name}!`)
                .addFields(
                    { name: 'Remaining Balance', value: `${userDat.money} coins`, inline: true },
                    { name: 'Your Inventory', value: `${userDat.inventory[item]}x ${POKEBALL_TYPES[item].name}`, inline: true }
                )
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in buy command:', error);
            await interaction.reply('There was an error processing your purchase. Please try again.');
        }
    }

    else if (commandName === 'catch') {
        try {
            if (!userData.has(interaction.user.id)) {
                return await interaction.reply('You need to start your journey first! Use /start to begin.');
            }

            if (!gameState.wildPokemon) {
                return await interaction.reply('There is no wild Pokémon to catch right now! Wait for one to appear.');
            }

            const ballType = interaction.options.getString('ball').toLowerCase();
            const userDat = userData.get(interaction.user.id);

            if (!POKEBALL_TYPES[ballType] || userDat.inventory[ballType] <= 0) {
                return await interaction.reply(`You don't have any ${POKEBALL_TYPES[ballType]?.name || 'balls'} left! Use /buy to get more.`);
            }

            userDat.inventory[ballType]--;

            const pokemon = gameState.wildPokemon;
            const ballBonus = POKEBALL_TYPES[ballType].catchRate || 1.0;
            const healthPercentage = (pokemon.currentHp || pokemon.hp) / pokemon.hp;
            const catchRate = BASE_CATCH_RATE * ballBonus * (2 - healthPercentage);
            const isCaught = Math.random() < catchRate;

            if (isCaught) {
                userDat.collection.push(JSON.parse(JSON.stringify(pokemon)));
                gameState.wildPokemon = null;
                saveGameState();

                const embed = new EmbedBuilder()
                    .setTitle('Gotcha! 🎉')
                    .setDescription(`Congratulations! You caught the wild ${pokemon.name}${pokemon.isShiny ? ' ✨' : ''}!`)
                    .addFields(
                        { name: 'Ball Used', value: POKEBALL_TYPES[ballType].name, inline: true },
                        { name: 'Remaining Balls', value: `${userDat.inventory[ballType]}x ${POKEBALL_TYPES[ballType].name}`, inline: true },
                        { name: 'Collection Size', value: `${userDat.collection.length} Pokémon`, inline: true }
                    )
                    .setColor('#00FF00')
                    .setThumbnail(getPokemonSprite(pokemon.name, pokemon.isShiny))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('Oh no! 😢')
                    .setDescription(`The wild ${pokemon.name} broke free!`)
                    .addFields(
                        { name: 'Ball Used', value: POKEBALL_TYPES[ballType].name, inline: true },
                        { name: 'Remaining Balls', value: `${userDat.inventory[ballType]}x ${POKEBALL_TYPES[ballType].name}`, inline: true }
                    )
                    .setColor('#FF0000')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in catch command:', error);
            await interaction.reply('There was an error while trying to catch the Pokémon. Please try again.');
        }
    }

    else if (commandName === 'bal') {
        try {
            if (!userData.has(interaction.user.id)) {
                return await interaction.reply('You need to start your journey first! Use /start to begin.');
            }
            const userDat = userData.get(interaction.user.id);
            const balanceEmbed = new EmbedBuilder()
                .setTitle('💰 Your Balance')
                .setDescription(`Your current balance is ${userDat.money} coins.`)
                .addFields(
                    { name: 'Inventory', value: Object.entries(userDat.inventory)
                        .map(([type, count]) => `${POKEBALL_TYPES[type].name}: ${count}`)
                        .join('\n') || 'Empty' }
                )
                .setColor('#FFFF00')
                .setTimestamp();
            await interaction.reply({ embeds: [balanceEmbed] });
        } catch (error) {
            console.error('Error in balance command:', error);
            await interaction.reply('There was an error checking your balance. Please try again.');
        }
    }

    else if (commandName === 'battlebots') {
        try {
            if (!battle.players) {
                battle.players = new Map();
                battle.turnOrder = [];
                console.log('Battle object initialized for bot addition');
            }

            const quantity = interaction.options.getInteger('quantity');
            const difficulty = interaction.options.getString('difficulty');
            let reward;

            switch (difficulty) {
                case 'easy': reward = 10; break;
                case 'medium': reward = 30; break;
                case 'hard': reward = 50; break;
                default: return await interaction.reply('Invalid difficulty selected.');
            }

            if (quantity < 1 || quantity > 8) {
                return await interaction.reply('Quantity must be between 1 and 8!');
            }

            let botsAdded = 0;
            for (let i = 0; i < quantity; i++) {
                if (battle.players.size >= MAX_PLAYERS) {
                    await interaction.reply(`Maximum player limit (${MAX_PLAYERS}) reached! Only ${botsAdded} bots were added.`);
                    break;
                }
                const botId = `bot_${Date.now()}_${i}`;
                const botPokemon = getRandomPokemon();
                battle.players.set(botId, {
                    pokemon: botPokemon,
                    isBot: true,
                    reward: reward,
                    lastAction: Date.now()
                });
                battle.turnOrder.push(botId);
                botsAdded++;
            }

            if (!battle.active && battle.players.size >= 2) {
                battle.active = true;
                battle.currentTurn = 0;
                battle.battleStartTime = Date.now();
                battle.lastTurnTime = Date.now();
                battle.weather = ['Clear', 'Rain', 'Sunny'][Math.floor(Math.random() * 3)];

                const startEmbed = new EmbedBuilder()
                    .setTitle('⚔️ Battle Royale Started! ⚔️')
                    .setDescription(`A new battle has begun with ${battle.players.size} players!`)
                    .addFields(
                        { name: 'Weather', value: battle.weather, inline: true },
                        { name: 'Players', value: Array.from(battle.players.values()).map(p => p.pokemon.name).join(', '), inline: true }
                    )
                    .setColor('#FF0000')
                    .setTimestamp();

                await interaction.channel.send({ embeds: [startEmbed] });
            }

            const embed = new EmbedBuilder()
                .setTitle('Battlebots Added!')
                .setDescription(`${botsAdded} battlebots added to the battle!`)
                .addFields(
                    { name: 'Difficulty', value: difficulty, inline: true },
                    { name: 'Reward', value: `${reward} coins per bot`, inline: true },
                    { name: 'Total Bots', value: `${battle.players.size - Array.from(battle.players.values()).filter(p => !p.isBot).length} bots`, inline: true },
                    { name: 'Total Players', value: `${battle.players.size}`, inline: true }
                )
                .setColor('#0000FF')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            saveGameState();
        } catch (error) {
            console.error('Error in battlebots command:', error);
            await interaction.reply({
                content: 'There was an error adding battlebots. Please try again or check the console for details.',
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
