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
const MAX_PARTY_SIZE = 6; // Maximum Pokémon in party
const SPAWN_INTERVAL_MIN = 180000; // 3 minutes in milliseconds
const SPAWN_INTERVAL_MAX = 300000; // 5 minutes in milliseconds
const SHINY_CHANCE = 0.01; // 1% chance for shiny

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

// Expanded Pokémon data with base stats, levels, and evolutions
const pokemonData = [
    { name: 'Bulbasaur', baseHp: 45, baseAttack: 49, baseDefense: 49, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip'], evolution: 'Ivysaur', evolveLevel: 16 },
    { name: 'Ivysaur', baseHp: 60, baseAttack: 62, baseDefense: 63, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip', 'Razor Leaf'], evolution: 'Venusaur', evolveLevel: 32 },
    { name: 'Venusaur', baseHp: 80, baseAttack: 82, baseDefense: 83, type: ['Grass', 'Poison'], moves: ['Petal Dance', 'Vine Whip', 'Razor Leaf', 'Toxic'], evolution: null },
    { name: 'Charmander', baseHp: 39, baseAttack: 52, baseDefense: 43, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Charmeleon', evolveLevel: 16 },
    { name: 'Charmeleon', baseHp: 58, baseAttack: 64, baseDefense: 58, type: ['Fire'], moves: ['Scratch', 'Ember', 'Flamethrower'], evolution: 'Charizard', evolveLevel: 36 },
    { name: 'Charizard', baseHp: 78, baseAttack: 84, baseDefense: 78, type: ['Fire', 'Flying'], moves: ['Flamethrower', 'Wing Attack', 'Fire Blast', 'Dragon Claw'], evolution: null },
    { name: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65, type: ['Water'], moves: ['Tackle', 'Water Gun'], evolution: 'Wartortle', evolveLevel: 16 },
    { name: 'Wartortle', baseHp: 59, baseAttack: 63, baseDefense: 80, type: ['Water'], moves: ['Water Gun', 'Bubble Beam'], evolution: 'Blastoise', evolveLevel: 36 },
    { name: 'Blastoise', baseHp: 79, baseAttack: 83, baseDefense: 100, type: ['Water'], moves: ['Hydro Pump', 'Bubble Beam', 'Skull Bash', 'Rapid Spin'], evolution: null },
    // Add more Pokémon with base stats and evolution data as needed
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

// Shop items and prices
const shopItems = {
    pokeball: { price: 10, catchRate: 0.5 },
    greatball: { price: 30, catchRate: 0.75 },
    ultraball: { price: 100, catchRate: 0.9 }
};

// Game state
let battle = {
    active: false,
    players: new Map(),
    currentTurn: 0,
    turnOrder: [],
    battleStartTime: null
};

let wildPokemon = null; // Current wild Pokémon
let lastSpawnTime = 0;

function loadGameState() {
    try {
        if (fs.existsSync('vouchData.json')) {
            const data = fs.readFileSync('vouchData.json', 'utf8');
            const parsedData = JSON.parse(data);
            battle.players = new Map(parsedData.battleRoyale || []);
            userData = parsedData.userData || new Map();
        } else {
            console.log('vouchData.json not found, initializing new file.');
            fs.writeFileSync('vouchData.json', JSON.stringify({ battleRoyale: [], userData: [] }));
            battle.players = new Map();
            userData = new Map();
        }
    } catch (error) {
        console.error('Error loading game state:', error.message);
        battle.players = new Map();
        userData = new Map();
        fs.writeFileSync('vouchData.json', JSON.stringify({ battleRoyale: [], userData: [] }));
    }
}

function saveGameState() {
    try {
        const data = { battleRoyale: [...battle.players], userData: [...userData] };
        fs.writeFileSync('vouchData.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving game state:', error.message);
    }
}

function getRandomPokemon(level = 1) {
    const pokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    const shiny = Math.random() < SHINY_CHANCE;
    const baseStats = {
        hp: pokemon.baseHp,
        attack: pokemon.baseAttack,
        defense: pokemon.baseDefense
    };
    return {
        name: pokemon.name,
        level: level,
        xp: 0,
        maxXp: 100 * level, // XP required to level up
        hp: Math.floor(baseStats.hp * (level / 10 + 1)),
        attack: Math.floor(baseStats.attack * (level / 10 + 1)),
        defense: Math.floor(baseStats.defense * (level / 10 + 1)),
        type: pokemon.type,
        moves: pokemon.moves,
        currentHp: Math.floor(baseStats.hp * (level / 10 + 1)),
        status: 'none',
        statusTurns: 0,
        shiny: shiny,
        evolution: pokemon.evolution,
        evolveLevel: pokemon.evolveLevel
    };
}

function spawnWildPokemon() {
    if (!wildPokemon && Date.now() - lastSpawnTime >= SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN)) {
        wildPokemon = getRandomPokemon(Math.floor(Math.random() * 5) + 1); // Level 1-5
        lastSpawnTime = Date.now();
        return true;
    }
    return false;
}

function attemptCatch(userId, ballType) {
    if (!wildPokemon) return false;

    const user = userData.get(userId) || { coins: 0, inventory: { pokeball: 0, greatball: 0, ultraball: 0 }, party: [], pc: [] };
    const ball = user.inventory[ballType];
    if (ball <= 0) return false;

    const catchRate = shopItems[ballType].catchRate;
    const hpRatio = wildPokemon.currentHp / wildPokemon.hp;
    const catchChance = catchRate * (1 - hpRatio) * (wildPokemon.shiny ? 1.5 : 1); // Higher chance for shinies

    if (Math.random() < catchChance) {
        user.inventory[ballType]--;
        if (user.party.length < MAX_PARTY_SIZE) {
            user.party.push(wildPokemon);
        } else {
            user.pc.push(wildPokemon);
        }
        wildPokemon = null;
        userData.set(userId, user);
        saveGameState();
        return true;
    }
    return false;
}

function getEffectiveness(moveType, defenderTypes) {
    let effectiveness = 1;
    for (const defType of defenderTypes) {
        if (typeEffectiveness[defType].weakTo.includes(moveType)) {
            effectiveness *= typeEffectiveness[defType].multiplier.weak;
        } else if (typeEffectiveness[defType].resistantTo.includes(moveType)) {
            effectiveness *= typeEffectiveness[defType].multiplier.resist;
        } else if (typeEffectiveness[defType].immuneTo.includes(moveType)) {
            effectiveness = typeEffectiveness[defType].multiplier.immune;
        }
    }
    return effectiveness;
}

function applyStatusEffect(attackerId, defender, move, channel) {
    const moveInfo = moveData[move];
    if (!moveInfo.statusEffect || Math.random() * 100 > moveInfo.statusChance) return false;

    if (defender.status !== 'none') return false;

    defender.status = moveInfo.statusEffect;
    defender.statusTurns = moveInfo.statusEffect === 'asleep' ? Math.floor(Math.random() * 3) + 1 : 0;
    const defenderLabel = defender.ownerId === attackerId ? defender.name : `${defender.name} (opponent)`;
    channel.send(`${defenderLabel} is now ${defender.status}!`);
    return true;
}

function calculateDamage(attacker, defender, move, channel, attackerId) {
    const moveInfo = moveData[move];
    if (!moveInfo || (moveInfo.status && moveInfo.baseDamage === 0)) {
        applyStatusEffect(attackerId, defender, move, channel);
        return 0;
    }

    let damage = moveInfo.baseDamage;
    const defense = defender.defense;

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

    damage = Math.max(1, (attacker.attack * damage) / defense * effectiveness);

    applyStatusEffect(attackerId, defender, move, channel);

    return Math.floor(damage);
}

function handleStatusEffects(playerData, channel) {
    const pokemon = playerData.pokemon;
    let canAct = true;

    if (pokemon.status === 'paralyzed' && Math.random() < 0.25) {
        channel.send(`${pokemon.name} is paralyzed and can't move!`);
        canAct = false;
    } else if (pokemon.status === 'asleep') {
        if (pokemon.statusTurns > 0) {
            channel.send(`${pokemon.name} is asleep and can't move!`);
            pokemon.statusTurns--;
            canAct = false;
        } else {
            channel.send(`${pokemon.name} woke up!`);
            pokemon.status = 'none';
        }
    } else if (pokemon.status === 'poisoned') {
        const poisonDamage = Math.floor(pokemon.hp / 8);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - poisonDamage);
        channel.send(`${pokemon.name} took ${poisonDamage} damage from poison!`);
    } else if (pokemon.status === 'burned') {
        const burnDamage = Math.floor(pokemon.hp / 16);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - burnDamage);
        channel.send(`${pokemon.name} took ${burnDamage} damage from its burn!`);
    }

    if (pokemon.currentHp === 0) {
        const label = playerData.isBot ? `${pokemon.name} (bot)` : pokemon.name;
        channel.send(`${label} has fainted due to status effects! Player is eliminated!`);
        battle.players.delete(playerData.ownerId);
        battle.turnOrder = battle.turnOrder.filter(id => id !== playerData.ownerId);
        saveGameState();
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

async function botPlayTurn(botId, botData, channel) {
    const botPokemon = botData.pokemon;
    const difficulty = botData.difficulty;

    if (!handleStatusEffects(botData, channel)) {
        battle.currentTurn++;
        await announceBattleUpdate(channel);
        return;
    }

    const possibleTargets = Array.from(battle.players.entries())
        .filter(([id]) => id !== botId)
        .map(([id, data]) => ({ id, pokemon: data.pokemon }));

    if (possibleTargets.length === 0) {
        battle.currentTurn++;
        await announceBattleUpdate(channel);
        return;
    }

    let move, targetId;

    if (difficulty === 'easy') {
        move = botPokemon.moves[Math.floor(Math.random() * botPokemon.moves.length)];
        targetId = possibleTargets[Math.floor(Math.random() * possibleTargets.length)].id;
    } else if (difficulty === 'normal') {
        if (Math.random() < 0.5) {
            move = botPokemon.moves[Math.floor(Math.random() * botPokemon.moves.length)];
            targetId = possibleTargets[Math.floor(Math.random() * possibleTargets.length)].id;
        } else {
            let bestMove = null;
            let bestTargetId = null;
            let bestEffectiveness = 0;

            for (const target of possibleTargets) {
                for (const m of botPokemon.moves) {
                    const moveInfo = moveData[m];
                    if (!moveInfo || (moveInfo.status && moveInfo.baseDamage === 0)) continue;
                    const effectiveness = getEffectiveness(moveInfo.type, target.pokemon.type);
                    if (effectiveness > bestEffectiveness) {
                        bestEffectiveness = effectiveness;
                        bestMove = m;
                        bestTargetId = target.id;
                    }
                }
            }

            move = bestMove || botPokemon.moves[Math.floor(Math.random() * botPokemon.moves.length)];
            targetId = bestTargetId || possibleTargets[Math.floor(Math.random() * possibleTargets.length)].id;
        }
    } else {
        let bestMove = null;
        let bestTargetId = null;
        let bestScore = -Infinity;

        possibleTargets.sort((a, b) => a.pokemon.currentHp - b.pokemon.currentHp);
        for (const target of possibleTargets) {
            for (const m of botPokemon.moves) {
                const moveInfo = moveData[m];
                if (!moveInfo || (moveInfo.status && moveInfo.baseDamage === 0)) continue;
                const effectiveness = getEffectiveness(moveInfo.type, target.pokemon.type);
                const damage = calculateDamage(botPokemon, target.pokemon, m, channel, botId);
                const score = damage * effectiveness;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = m;
                    bestTargetId = target.id;
                }
            }
        }

        move = bestMove || botPokemon.moves[Math.floor(Math.random() * botPokemon.moves.length)];
        targetId = bestTargetId || possibleTargets[Math.floor(Math.random() * possibleTargets.length)].id;
    }

    const targetData = battle.players.get(targetId);
    const damage = calculateDamage(botPokemon, targetData.pokemon, move, channel, botId);
    targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

    if (damage > 0) {
        const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : `${targetData.pokemon.name} (opponent)`;
        await channel.send(`${botPokemon.name} (bot) used ${move} on ${targetLabel} for ${damage} damage!`);
    }

    if (targetData.pokemon.currentHp === 0) {
        const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : `${targetData.pokemon.name} (opponent)`;
        await channel.send(`${targetLabel} has fainted! Player is eliminated!`);
        battle.players.delete(targetId);
        battle.turnOrder = battle.turnOrder.filter(id => id !== targetId);
        saveGameState();
    }

    botData.lastAction = Date.now();
    battle.currentTurn++;
    await announceBattleUpdate(channel);

    if (checkBattleEnd()) {
        const winnerId = Array.from(battle.players.keys())[0];
        const winnerData = battle.players.get(winnerId);
        const winnerLabel = winnerData.isBot ? `${winnerData.pokemon.name} (bot)` : winnerData.pokemon.name;
        await channel.send(`The battle is over! Winner: ${winnerLabel}!`);
        battle.players.clear();
        battle.turnOrder = [];
        saveGameState();
    }
}

async function announceBattleUpdate(channel) {
    try {
        const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
        const embed = new EmbedBuilder()
            .setTitle('Pokémon Battle Royale')
            .setDescription(battle.active ? `**Battle in progress!** Current turn: <@${currentPlayerId}>` : '**Waiting for players to join or start...**')
            .setColor(battle.active ? '#ff4444' : '#4444ff')
            .setThumbnail('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png')
            .setFooter({ text: 'Pokémon Battle Royale - May the best trainer win!', iconURL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' })
            .setTimestamp();

        const fields = [];
        for (const [userId, data] of battle.players.entries()) {
            const isCurrentPlayer = userId === currentPlayerId;
            let pokemonLabel;
            if (data.isBot) {
                pokemonLabel = `${data.pokemon.name} (bot)`;
            } else {
                pokemonLabel = isCurrentPlayer ? data.pokemon.name : `${data.pokemon.name} (opponent)`;
            }
            const statusText = data.pokemon.status !== 'none' ? ` (${data.pokemon.status})` : '';
            fields.push({
                name: pokemonLabel + statusText,
                value: `**HP:** ${data.pokemon.currentHp}/${data.pokemon.hp} | **Level:** ${data.pokemon.level}`
            });
        }
        embed.addFields(fields);

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error in announceBattleUpdate:', error.message);
    }
}

let userData = new Map();

client.once('ready', async () => {
    console.log(`Battle Royale Bot is online as ${client.user.tag}`);
    loadGameState();

    const commands = [
        new SlashCommandBuilder()
            .setName('joinbattle')
            .setDescription('Join the Pokémon Battle Royale')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('player')
                    .setDescription('Join as a player')
                    .addStringOption(option =>
                        option.setName('pokemon')
                            .setDescription('Select your Pokémon for the battle')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('bot')
                    .setDescription('Add bots to the battle')
                    .addIntegerOption(option =>
                        option
                            .setName('quantity')
                            .setDescription('Number of bots to add')
                            .setRequired(true)
                            .setMinValue(1)
                            .setMaxValue(MAX_PLAYERS)
                    )
                    .addStringOption(option =>
                        option
                            .setName('difficulty')
                            .setDescription('Difficulty of the bots')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Easy', value: 'easy' },
                                { name: 'Normal', value: 'normal' },
                                { name: 'Hard', value: 'hard' }
                            )
                    )
            ),
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
                    .setDescription('The target (Pokémon name)')
                    .setRequired(true)
                    .setAutocomplete(true)
            ),
        new SlashCommandBuilder()
            .setName('battle_status')
            .setDescription('View the current battle status'),
        new SlashCommandBuilder()
            .setName('startbattle')
            .setDescription('Start the battle with current players'),
        new SlashCommandBuilder()
            .setName('shop')
            .setDescription('Buy items with coins')
            .addStringOption(option =>
                option.setName('item')
                    .setDescription('Item to buy')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Poké Ball', value: 'pokeball' },
                        { name: 'Great Ball', value: 'greatball' },
                        { name: 'Ultra Ball', value: 'ultraball' }
                    )
            )
            .addIntegerOption(option =>
                option.setName('quantity')
                    .setDescription('Quantity to buy')
                    .setRequired(true)
                    .setMinValue(1)
            ),
        new SlashCommandBuilder()
            .setName('bal')
            .setDescription('Check your coin balance'),
        new SlashCommandBuilder()
            .setName('catch')
            .setDescription('Attempt to catch the wild Pokémon')
            .addStringOption(option =>
                option.setName('ball')
                    .setDescription('Type of ball to use')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Poké Ball', value: 'pokeball' },
                        { name: 'Great Ball', value: 'greatball' },
                        { name: 'Ultra Ball', value: 'ultraball' }
                    )
            )
    ].map(command => command.toJSON());

    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands })
        .then(() => console.log('Commands registered'))
        .catch(console.error);

    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    await channel.send('Pokémon Battle Royale Bot is online! Use `/joinbattle player <pokemon>` to join, `/joinbattle bot <quantity> <difficulty>` to add bots, `/startbattle` to begin, `/shop` to buy items, `/bal` to check coins, and `/catch <ball>` to catch wild Pokémon.');
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
            const targets = Array.from(battle.players.entries()).map(([id, data]) => {
                const isCurrentPlayer = id === userId;
                let targetLabel;
                if (data.isBot) {
                    targetLabel = `${data.pokemon.name} (bot)`;
                } else {
                    targetLabel = isCurrentPlayer ? `${data.pokemon.name} (user)` : `${data.pokemon.name} (opponent)`;
                }
                return {
                    name: targetLabel,
                    value: id
                };
            });

            await interaction.respond(targets);
        }

        if (focusedOption.name === 'pokemon') {
            const user = userData.get(userId) || { party: [], pc: [] };
            const pokemonList = [...user.party, ...user.pc].map(p => ({
                name: `${p.name} (Level ${p.level}${p.shiny ? ' ★' : ''})`,
                value: p.name
            }));
            await interaction.respond(pokemonList);
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

            if (options.getSubcommand() === 'player') {
                if (battle.players.size >= MAX_PLAYERS) {
                    await interaction.reply({ content: 'The battle is full!', ephemeral: true });
                    return;
                }
                if (battle.players.has(userId)) {
                    await interaction.reply({ content: 'You are already in the battle!', ephemeral: true });
                    return;
                }

                const selectedPokemonName = options.getString('pokemon');
                const user = userData.get(userId) || { coins: 0, inventory: { pokeball: 0, greatball: 0, ultraball: 0 }, party: [], pc: [] };
                const selectedPokemon = [...user.party, ...user.pc].find(p => p.name === selectedPokemonName);

                if (!selectedPokemon) {
                    await interaction.reply({ content: 'Invalid Pokémon selection!', ephemeral: true });
                    return;
                }

                battle.players.set(userId, { pokemon: { ...selectedPokemon, currentHp: selectedPokemon.hp }, lastAction: null, ownerId: userId, isBot: false });
                saveGameState();
                await interaction.reply({ content: `You joined the battle with ${selectedPokemon.name} (Level ${selectedPokemon.level}${selectedPokemon.shiny ? ' ★' : ''})! ${MAX_PLAYERS - battle.players.size} slots remain. Use /startbattle to begin.`, ephemeral: true });
                await announceBattleUpdate(channel);
            } else if (options.getSubcommand() === 'bot') {
                const quantity = options.getInteger('quantity');
                const difficulty = options.getString('difficulty');

                const remainingSlots = MAX_PLAYERS - battle.players.size;
                if (remainingSlots === 0) {
                    await interaction.reply({ content: 'The battle is full!', ephemeral: true });
                    return;
                }

                const botsToAdd = Math.min(quantity, remainingSlots);
                for (let i = 0; i < botsToAdd; i++) {
                    const botId = `bot_${Date.now()}_${i}`;
                    const pokemon = getRandomPokemon(Math.floor(Math.random() * 5) + 1);
                    battle.players.set(botId, {
                        pokemon,
                        lastAction: null,
                        ownerId: botId,
                        isBot: true,
                        difficulty: difficulty
                    });
                }

                saveGameState();
                await interaction.reply({ content: `Added ${botsToAdd} bot(s) with ${difficulty} difficulty! ${MAX_PLAYERS - battle.players.size} slots remain. Use /startbattle to begin.`, ephemeral: true });
                await announceBattleUpdate(channel);
            }
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
            saveGameState();
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

            if (!handleStatusEffects(attackerData, channel)) {
                battle.currentTurn++;
                await announceBattleUpdate(channel);
                await interaction.reply({ content: `${attackerData.pokemon.name} couldn't act due to its status!`, ephemeral: true });
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
            const damage = calculateDamage(attackerData.pokemon, targetData.pokemon, move, channel, userId);
            targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

            if (damage > 0) {
                const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : (targetId === userId ? `${targetData.pokemon.name} (user)` : `${targetData.pokemon.name} (opponent)`);
                await channel.send(`${attackerData.pokemon.name} used ${move} on ${targetLabel} for ${damage} damage!`);
            }

            // Add XP to attacker
            attackerData.pokemon.xp += Math.floor(damage * 10);
            while (attackerData.pokemon.xp >= attackerData.pokemon.maxXp) {
                attackerData.pokemon.xp -= attackerData.pokemon.maxXp;
                attackerData.pokemon.level++;
                attackerData.pokemon.maxXp = 100 * attackerData.pokemon.level;
                attackerData.pokemon.hp = Math.floor(attackerData.pokemon.hp * 1.1); // Increase stats on level up
                attackerData.pokemon.attack = Math.floor(attackerData.pokemon.attack * 1.1);
                attackerData.pokemon.defense = Math.floor(attackerData.pokemon.defense * 1.1);
                attackerData.pokemon.currentHp = Math.min(attackerData.pokemon.currentHp + Math.floor(attackerData.pokemon.hp / 10), attackerData.pokemon.hp);
                if (attackerData.pokemon.evolution && attackerData.pokemon.level >= attackerData.pokemon.evolveLevel) {
                    const evolved = pokemonData.find(p => p.name === attackerData.pokemon.evolution);
                    if (evolved) {
                        attackerData.pokemon.name = evolved.name;
                        attackerData.pokemon.type = evolved.type;
                        attackerData.pokemon.moves = evolved.moves;
                        attackerData.pokemon.evolution = evolved.evolution;
                        attackerData.pokemon.evolveLevel = evolved.evolveLevel;
                        await channel.send(`${attackerData.pokemon.name} evolved into ${evolved.name}!`);
                    }
                }
            }

            if (targetData.pokemon.currentHp === 0) {
                const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : (targetId === userId ? `${targetData.pokemon.name} (user)` : `${targetData.pokemon.name} (opponent)`);
                await channel.send(`${targetLabel} has fainted! Player is eliminated!`);
                battle.players.delete(targetId);
                battle.turnOrder = battle.turnOrder.filter(id => id !== targetId);
                saveGameState();
            }

            attackerData.lastAction = Date.now();
            battle.currentTurn++;
            await announceBattleUpdate(channel);

            if (checkBattleEnd()) {
                const winnerId = Array.from(battle.players.keys())[0];
                const winnerData = battle.players.get(winnerId);
                const winnerLabel = winnerData.isBot ? `${winnerData.pokemon.name} (bot)` : winnerData.pokemon.name;
                await channel.send(`The battle is over! Winner: ${winnerLabel}!`);
                battle.players.clear();
                battle.turnOrder = [];
                saveGameState();
            }

            const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : (targetId === userId ? `${targetData.pokemon.name} (user)` : `${targetData.pokemon.name} (opponent)`);
            await interaction.reply({ content: `You used ${move} on ${targetLabel}!`, ephemeral: true });
        }

        if (commandName === 'battle_status') {
            await announceBattleUpdate(channel);
            await interaction.reply({ content: 'Battle status updated!', ephemeral: true });
        }

        if (commandName === 'shop') {
            const item = options.getString('item');
            const quantity = options.getInteger('quantity');
            const user = userData.get(userId) || { coins: 0, inventory: { pokeball: 0, greatball: 0, ultraball: 0 }, party: [], pc: [] };
            const totalCost = shopItems[item].price * quantity;

            if (user.coins < totalCost) {
                await interaction.reply({ content: `You don't have enough coins! Cost: ${totalCost} coins. Your balance: ${user.coins} coins.`, ephemeral: true });
                return;
            }

            user.coins -= totalCost;
            user.inventory[item] = (user.inventory[item] || 0) + quantity;
            userData.set(userId, user);
            saveGameState();
            await interaction.reply({ content: `Purchased ${quantity} ${item.replace('ball', ' Ball')}s for ${totalCost} coins!`, ephemeral: true });
        }

        if (commandName === 'bal') {
            const user = userData.get(userId) || { coins: 0, inventory: { pokeball: 0, greatball: 0, ultraball: 0 }, party: [], pc: [] };
            await interaction.reply({ content: `Your coin balance: ${user.coins} coins.`, ephemeral: true });
        }

        if (commandName === 'catch') {
            const ball = options.getString('ball');
            const user = userData.get(userId) || { coins: 0, inventory: { pokeball: 0, greatball: 0, ultraball: 0 }, party: [], pc: [] };

            if (attemptCatch(userId, ball)) {
                await interaction.reply({ content: `You caught ${wildPokemon.name} (Level ${wildPokemon.level}${wildPokemon.shiny ? ' ★' : ''}) with a ${ball.replace('ball', ' Ball')}!`, ephemeral: true });
                await channel.send(`A wild ${wildPokemon.name} (Level ${wildPokemon.level}${wildPokemon.shiny ? ' ★' : ''}) was caught by <@${userId}>!`);
                user.coins += 10; // Reward coins for catching
                userData.set(userId, user);
                saveGameState();
            } else {
                await interaction.reply({ content: `Failed to catch ${wildPokemon ? wildPokemon.name : 'the Pokémon'}! You need a ${ball.replace('ball', ' Ball')} in your inventory.`, ephemeral: true });
            }
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

    if (!playerData) {
        battle.currentTurn++;
        return;
    }

    if (playerData.isBot) {
        const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
        await botPlayTurn(currentPlayerId, playerData, channel);
    } else if (playerData.lastAction && (Date.now() - playerData.lastAction > TURN_TIMEOUT)) {
        try {
            const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
            await channel.send(`${playerData.pokemon.name} took too long! Player is eliminated!`);
            battle.players.delete(currentPlayerId);
            battle.turnOrder = battle.turnOrder.filter(id => id !== currentPlayerId);
            battle.currentTurn++;
            await announceBattleUpdate(channel);
            saveGameState();
            if (checkBattleEnd()) {
                const winnerId = Array.from(battle.players.keys())[0];
                const winnerData = battle.players.get(winnerId);
                const winnerLabel = winnerData.isBot ? `${winnerData.pokemon.name} (bot)` : winnerData.pokemon.name;
                await channel.send(`The battle is over! Winner: ${winnerLabel}!`);
                battle.players.clear();
                battle.turnOrder = [];
                battle.battleStartTime = null;
                saveGameState();
            }
        } catch (error) {
            console.error('Error in timeout check:', error.message);
        }
    }

    // Spawn wild Pokémon
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    if (spawnWildPokemon()) {
        const shinyText = wildPokemon.shiny ? ' ★ (Shiny!)' : '';
        await channel.send(`A wild ${wildPokemon.name} (Level ${wildPokemon.level}${shinyText}) has appeared! Use /catch <ball> to try catching it!`);
    }
}, 5000);

client.login(process.env.DISCORD_TOKEN).catch(console.error);
