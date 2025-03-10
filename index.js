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
const INVENTORY_LIMIT = 6;
const SHINY_CHANCE = 1 / 8192; // 1/8192 chance for shiny

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

// Expanded Pokémon data with fixed base stats (Gen 1-3)
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
    { name: 'Nidoking', hp: 81, attack: 102, defense: 77, type: ['Poison', 'Ground'], moves: ['Earthquake', 'Poison Fang', 'Horn Attack', 'Toxic'] },
    { name: 'Chikorita', hp: 45, attack: 49, defense: 65, type: ['Grass'], moves: ['Tackle', 'Razor Leaf', 'Reflect', 'Sweet Scent'] },
    { name: 'Cyndaquil', hp: 39, attack: 52, defense: 43, type: ['Fire'], moves: ['Tackle', 'Ember', 'Smokescreen', 'Swift'] },
    { name: 'Totodile', hp: 50, attack: 65, defense: 64, type: ['Water'], moves: ['Scratch', 'Water Gun', 'Bite', 'Rage'] },
    { name: 'Treecko', hp: 40, attack: 45, defense: 35, type: ['Grass'], moves: ['Pound', 'Absorb', 'Quick Attack', 'Screech'] },
    { name: 'Torchic', hp: 45, attack: 60, defense: 40, type: ['Fire'], moves: ['Scratch', 'Ember', 'Peck', 'Growl'] },
    { name: 'Mudkip', hp: 50, attack: 70, defense: 50, type: ['Water'], moves: ['Tackle', 'Water Gun', 'Mud-Slap', 'Bide'] }
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
    'Horn Attack': { baseDamage: 15, accuracy: 95, type: 'Normal' },
    'Reflect': { baseDamage: 0, accuracy: 100, type: 'Psychic', status: true },
    'Sweet Scent': { baseDamage: 0, accuracy: 100, type: 'Normal', status: true },
    'Smokescreen': { baseDamage: 0, accuracy: 100, type: 'Normal', status: true },
    'Swift': { baseDamage: 15, accuracy: 100, type: 'Normal' },
    'Rage': { baseDamage: 20, accuracy: 90, type: 'Normal' },
    'Absorb': { baseDamage: 20, accuracy: 100, type: 'Grass' },
    'Screech': { baseDamage: 0, accuracy: 85, type: 'Normal', status: true },
    'Mud-Slap': { baseDamage: 15, accuracy: 90, type: 'Ground' },
    'Bide': { baseDamage: 0, accuracy: 100, type: 'Normal', status: true }
};

// Game state and user data
let battle = {
    active: false,
    players: new Map(),
    currentTurn: 0,
    turnOrder: [],
    battleStartTime: null,
    weather: 'Clear' // Random weather effect
};

let userData = new Map(); // Stores user inventory, PC, wallet, and stats
let wildPokemon = null; // Track current wild Pokémon

function loadGameState() {
    try {
        if (fs.existsSync('gameData.json')) {
            const data = fs.readFileSync('gameData.json', 'utf8');
            const parsedData = JSON.parse(data);
            battle.players = new Map(parsedData.battleRoyale || []);
            userData = new Map(parsedData.userData || []);
        } else {
            console.log('gameData.json not found, initializing new file.');
            fs.writeFileSync('gameData.json', JSON.stringify({ battleRoyale: [], userData: [] }));
            battle.players = new Map();
            userData = new Map();
        }
    } catch (error) {
        console.error('Error loading game state:', error.message);
        battle.players = new Map();
        userData = new Map();
        fs.writeFileSync('gameData.json', JSON.stringify({ battleRoyale: [], userData: [] }));
    }
}

function saveGameState() {
    try {
        const data = {
            battleRoyale: [...battle.players],
            userData: [...userData]
        };
        fs.writeFileSync('gameData.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving game state:', error.message);
    }
}

function getRandomPokemon(excludeStarters = false) {
    let availablePokemon = pokemonData.filter(p => !excludeStarters || !['Bulbasaur', 'Charmander', 'Squirtle', 'Chikorita', 'Cyndaquil', 'Totodile', 'Treecko', 'Torchic', 'Mudkip'].includes(p.name));
    const pokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
    const isShiny = Math.random() < SHINY_CHANCE;
    const shinyBoost = isShiny ? 1.1 : 1; // 10% boost for shiny
    return {
        ...pokemon,
        currentHp: Math.floor(pokemon.hp * shinyBoost),
        hp: Math.floor(pokemon.hp * shinyBoost),
        attack: Math.floor(pokemon.attack * shinyBoost),
        status: 'none',
        statusTurns: 0,
        isShiny
    };
}

function getStarterPokemon() {
    return pokemonData.filter(p => ['Bulbasaur', 'Charmander', 'Squirtle', 'Chikorita', 'Cyndaquil', 'Totodile', 'Treecko', 'Torchic', 'Mudkip'].includes(p.name));
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
    // Weather effects
    if (battle.weather === 'Rain' && moveType === 'Water') effectiveness *= 1.2;
    if (battle.weather === 'Sunny' && moveType === 'Fire') effectiveness *= 1.2;
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
    const effectiveness = getEffectiveness(moveInfo.type, defender.type);
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
        battle.weather = ['Clear', 'Rain', 'Sunny'][Math.floor(Math.random() * 3)]; // Random weather reset
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
        const userWinner = userData.get(winnerId);
        if (userWinner) {
            userWinner.wallet += 50; // 50 coins for winning
            userWinner.trainerLevel = (userWinner.trainerLevel || 0) + 1;
            userWinner.badges = (userWinner.badges || 0) + 1;
            userData.set(winnerId, userWinner);
        }
        await channel.send(`The battle is over! Winner: ${winnerLabel}! ${winnerLabel === winnerData.pokemon.name ? `<@${winnerId}>` : ''} earned 50 coins!`);
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
            .setDescription(battle.active ? `**Battle in progress!** Current turn: <@${currentPlayerId}>\nWeather: ${battle.weather}` : '**Waiting for players to join or start...**')
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
            const shinyText = data.pokemon.isShiny ? ' ✨' : '';
            fields.push({
                name: `${pokemonLabel}${shinyText}${statusText}`,
                value: `**HP:** ${data.pokemon.currentHp}/${data.pokemon.hp} | **Type:** ${data.pokemon.type.join('/')}`,
                inline: true
            });
        }
        embed.addFields(fields);

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error in announceBattleUpdate:', error.message);
    }
}

async function spawnWildPokemon(channel) {
    if (wildPokemon) return; // Only one wild Pokémon at a time
    const pokemon = getRandomPokemon(true);
    const catchChance = Math.random() * 100; // Base catch chance
    const ballModifier = 1; // Default (can be modified by items later)
    const adjustedCatchChance = Math.min(90, catchChance * ballModifier); // Cap at 90%
    wildPokemon = { pokemon, catchChance: adjustedCatchChance };
    const thumbnail = pokemon.isShiny ? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/' + pokemonData.findIndex(p => p.name === pokemon.name) + '.png' : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + pokemonData.findIndex(p => p.name === pokemon.name) + '.png';
    const embed = new EmbedBuilder()
        .setTitle('Wild Pokémon Encounter!')
        .setDescription(`A wild ${pokemon.name}${pokemon.isShiny ? ' ✨ (Shiny!)' : ''} appeared! Use /catch ${pokemon.name} to try catching it! (Catch chance: ${Math.floor(adjustedCatchChance)}%)`)
        .setColor(getTypeColor(pokemon.type[0]))
        .setThumbnail(thumbnail)
        .setFooter({ text: 'Good luck, trainer!', iconURL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

function getTypeColor(type) {
    const colors = {
        Normal: '#A8A878', Fire: '#F08030', Water: '#6890F0', Electric: '#F8D030',
        Grass: '#78C850', Ice: '#98D8D8', Fighting: '#C03028', Poison: '#A040A0',
        Ground: '#E0C068', Flying: '#A890F0', Psychic: '#F85888', Bug: '#A8B820',
        Rock: '#B8A038', Ghost: '#705898', Dragon: '#7038F8'
    };
    return colors[type] || '#FFFFFF';
}

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
            .setName('startjourney')
            .setDescription('Start your Pokémon journey and choose a starter')
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
                    )
            ),
        new SlashCommandBuilder()
            .setName('catch')
            .setDescription('Attempt to catch a wild Pokémon')
            .addStringOption(option =>
                option.setName('pokemon')
                    .setDescription('The Pokémon to catch')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('inventory')
            .setDescription('View your Pokémon inventory'),
        new SlashCommandBuilder()
            .setName('pc')
            .setDescription('View or manage your Pokémon stored in PC')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action to perform (withdraw/deposit)')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Withdraw', value: 'withdraw' },
                        { name: 'Deposit', value: 'deposit' }
                    )
            )
            .addStringOption(option =>
                option.setName('pokemon')
                    .setDescription('The Pokémon to withdraw or deposit')
                    .setRequired(false)
                    .setAutocomplete(true)
            ),
        new SlashCommandBuilder()
            .setName('battle')
            .setDescription('Challenge another player to a 1v1 battle')
            .addUserOption(option =>
                option.setName('opponent')
                    .setDescription('The player to challenge')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('bal')
            .setDescription('Check your coin balance and stats'),
        new SlashCommandBuilder()
            .setName('shop')
            .setDescription('Buy items with coins')
            .addStringOption(option =>
                option.setName('item')
                    .setDescription('Item to buy')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Poké Ball (10 coins)', value: 'pokeball' },
                        { name: 'Ultra Ball (25 coins)', value: 'ultraball' }
                    )
            )
    ].map(command => command.toJSON());

    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands })
        .then(() => console.log('Commands registered'))
        .catch(console.error);

    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    await channel.send('Pokémon Battle Royale Bot is online! Use `/startjourney` to begin, `/joinbattle player` to join battles, `/battle @user` to challenge, `/shop` to buy items, or `/catch` to catch wild Pokémon!');
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

        if (focusedOption.name === 'pokemon' && ['pc', 'catch'].includes(interaction.commandName)) {
            const userDataEntry = userData.get(userId) || { inventory: [], pc: [] };
            const allPokemon = [...userDataEntry.inventory, ...userDataEntry.pc].map(p => ({
                name: p.name + (p.isShiny ? ' ✨' : ''),
                value: p.name
            }));
            await interaction.respond(allPokemon);
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
                const userDataEntry = userData.get(userId) || { inventory: [], pc: [], wallet: 0, pokeballs: 0, ultraballs: 0, trainerLevel: 0, badges: 0 };
                if (userDataEntry.inventory.length === 0) {
                    await interaction.reply({ content: 'You need to start your journey with `/startjourney` first!', ephemeral: true });
                    return;
                }

                const pokemon = { ...userDataEntry.inventory[0], currentHp: userDataEntry.inventory[0].hp };
                battle.players.set(userId, { pokemon, lastAction: null, ownerId: userId, isBot: false });
                saveGameState();
                await interaction.reply({ content: `You joined the battle with ${pokemon.name}! ${MAX_PLAYERS - battle.players.size} slots remain. Use /startbattle to begin.`, ephemeral: true });
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
                    const pokemon = getRandomPokemon();
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
                const userWinner = userData.get(winnerId);
                if (userWinner) {
                    userWinner.wallet += 50;
                    userWinner.trainerLevel = (userWinner.trainerLevel || 0) + 1;
                    userWinner.badges = (userWinner.badges || 0) + 1;
                    userData.set(winnerId, userWinner);
                }
                await channel.send(`The battle is over! Winner: ${winnerLabel}! ${winnerLabel === winnerData.pokemon.name ? `<@${winnerId}>` : ''} earned 50 coins!`);
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

        if (commandName === 'startjourney') {
            if (userData.has(userId)) {
                await interaction.reply({ content: 'You have already started your journey!', ephemeral: true });
                return;
            }

            const starterName = options.getString('starter');
            const starter = getStarterPokemon().find(p => p.name === starterName);
            if (!starter) {
                await interaction.reply({ content: 'Invalid starter selection!', ephemeral: true });
                return;
            }

            userData.set(userId, {
                inventory: [{ ...starter, currentHp: starter.hp, status: 'none', statusTurns: 0, isShiny: false }],
                pc: [],
                wallet: 0,
                pokeballs: 10,
                ultraballs: 0,
                trainerLevel: 1,
                badges: 0
            });
            saveGameState();
            await interaction.reply({ content: `You started your journey with ${starterName}! You received 10 Poké Balls. Use /catch to catch wild Pokémon and /inventory to view your team.`, ephemeral: true });
        }

        if (commandName === 'catch') {
            if (!wildPokemon) {
                await interaction.reply({ content: 'No wild Pokémon to catch! Wait for one to spawn.', ephemeral: true });
                return;
            }

            const targetPokemonName = options.getString('pokemon');
            if (wildPokemon.pokemon.name !== targetPokemonName) {
                await interaction.reply({ content: 'That\'s not the wild Pokémon currently available!', ephemeral: true });
                return;
            }

            const userDataEntry = userData.get(userId) || { inventory: [], pc: [], wallet: 0, pokeballs: 0, ultraballs: 0, trainerLevel: 0, badges: 0 };
            let ballType = 'pokeball';
            let ballCount = userDataEntry.pokeballs;
            if (ballCount === 0 && userDataEntry.ultraballs > 0) {
                ballType = 'ultraball';
                ballCount = userDataEntry.ultraballs;
            }
            if (ballCount === 0) {
                await interaction.reply({ content: 'You have no Poké Balls or Ultra Balls! Buy some with /shop.', ephemeral: true });
                return;
            }

            const catchChance = wildPokemon.catchChance;
            const ballModifier = ballType === 'ultraball' ? 1.5 : 1; // Ultra Ball gives 50% better chance
            const adjustedCatchChance = Math.min(90, catchChance * ballModifier);
            if (Math.random() * 100 > adjustedCatchChance) {
                if (ballType === 'pokeball') userDataEntry.pokeballs--;
                else userDataEntry.ultraballs--;
                userData.set(userId, userDataEntry);
                saveGameState();
                await interaction.reply({ content: `Failed to catch ${targetPokemonName}! ${ballType === 'pokeball' ? 'Poké Ball' : 'Ultra Ball'} used.`, ephemeral: true });
                return;
            }

            const caughtPokemon = { ...wildPokemon.pokemon };
            if (userDataEntry.inventory.length < INVENTORY_LIMIT) {
                userDataEntry.inventory.push(caughtPokemon);
                userDataEntry.wallet += 10; // 10 coins for catching
                if (ballType === 'pokeball') userDataEntry.pokeballs--;
                else userDataEntry.ultraballs--;
                userData.set(userId, userDataEntry);
                saveGameState();
                await interaction.reply({
                    content: `Caught ${caughtPokemon.name}${caughtPokemon.isShiny ? ' ✨ (Shiny!)' : ''}! It has been added to your inventory. Earned 10 coins!`,
                    ephemeral: true
                });
            } else {
                userDataEntry.pc.push(caughtPokemon);
                userDataEntry.wallet += 10;
                if (ballType === 'pokeball') userDataEntry.pokeballs--;
                else userDataEntry.ultraballs--;
                userData.set(userId, userDataEntry);
                saveGameState();
                await interaction.reply({
                    content: `Caught ${caughtPokemon.name}${caughtPokemon.isShiny ? ' ✨ (Shiny!)' : ''}! Your inventory is full, so it was sent to your PC. Earned 10 coins!`,
                    ephemeral: true
                });
            }
            wildPokemon = null;
        }

        if (commandName === 'inventory') {
            const userDataEntry = userData.get(userId) || { inventory: [], pc: [], wallet: 0, pokeballs: 0, ultraballs: 0, trainerLevel: 0, badges: 0 };
            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Pokémon Inventory`)
                .setDescription(userDataEntry.inventory.length === 0 ? 'Your inventory is empty!' : 'Your active Pokémon:')
                .setColor('#00ff00')
                .setTimestamp();

            userDataEntry.inventory.forEach(pokemon => {
                const thumbnail = pokemon.isShiny ? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/' + pokemonData.findIndex(p => p.name === pokemon.name) + '.png' : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + pokemonData.findIndex(p => p.name === pokemon.name) + '.png';
                embed.addFields({
                    name: `${pokemon.name}${pokemon.isShiny ? ' ✨' : ''}`,
                    value: `**HP:** ${pokemon.currentHp}/${pokemon.hp} | **Type:** ${pokemon.type.join('/')} | **Status:** ${pokemon.status || 'none'}`,
                    inline: true
                });
                embed.setThumbnail(thumbnail);
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (commandName === 'pc') {
            const userDataEntry = userData.get(userId) || { inventory: [], pc: [], wallet: 0, pokeballs: 0, ultraballs: 0, trainerLevel: 0, badges: 0 };
            const action = options.getString('action');
            const pokemonName = options.getString('pokemon');

            if (!action) {
                const embed = new EmbedBuilder()
                    .setTitle(`${user.username}'s Pokémon PC`)
                    .setDescription(userDataEntry.pc.length === 0 ? 'Your PC is empty!' : 'Stored Pokémon:')
                    .setColor('#0000ff')
                    .setTimestamp();

                userDataEntry.pc.forEach(pokemon => {
                    const thumbnail = pokemon.isShiny ? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/' + pokemonData.findIndex(p => p.name === pokemon.name) + '.png' : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + pokemonData.findIndex(p => p.name === pokemon.name) + '.png';
                    embed.addFields({
                        name: `${pokemon.name}${pokemon.isShiny ? ' ✨' : ''}`,
                        value: `**HP:** ${pokemon.hp}/${pokemon.hp} | **Type:** ${pokemon.type.join('/')}`,
                        inline: true
                    });
                    embed.setThumbnail(thumbnail);
                });

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            if (action === 'withdraw' && pokemonName) {
                const pokemonIndex = userDataEntry.pc.findIndex(p => p.name === pokemonName);
                if (pokemonIndex === -1) {
                    await interaction.reply({ content: `You don't have ${pokemonName} in your PC!`, ephemeral: true });
                    return;
                }
                if (userDataEntry.inventory.length >= INVENTORY_LIMIT) {
                    await interaction.reply({ content: 'Your inventory is full! Deposit a Pokémon first.', ephemeral: true });
                    return;
                }

                const pokemon = userDataEntry.pc.splice(pokemonIndex, 1)[0];
                userDataEntry.inventory.push(pokemon);
                userData.set(userId, userDataEntry);
                saveGameState();
                await interaction.reply({ content: `Withdrew ${pokemonName}${pokemon.isShiny ? ' ✨' : ''} from PC to your inventory!`, ephemeral: true });
            } else if (action === 'deposit' && pokemonName) {
                const pokemonIndex = userDataEntry.inventory.findIndex(p => p.name === pokemonName);
                if (pokemonIndex === -1) {
                    await interaction.reply({ content: `You don't have ${pokemonName} in your inventory!`, ephemeral: true });
                    return;
                }
                if (userDataEntry.inventory.length <= 1) {
                    await interaction.reply({ content: 'You must keep at least one Pokémon in your inventory!', ephemeral: true });
                    return;
                }

                const pokemon = userDataEntry.inventory.splice(pokemonIndex, 1)[0];
                userDataEntry.pc.push(pokemon);
                userData.set(userId, userDataEntry);
                saveGameState();
                await interaction.reply({ content: `Deposited ${pokemonName}${pokemon.isShiny ? ' ✨' : ''} to your PC!`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'Invalid action or Pokémon! Use /pc withdraw <pokemon> or /pc deposit <pokemon>.', ephemeral: true });
            }
        }

        if (commandName === 'battle') {
            if (battle.active) {
                await interaction.reply({ content: 'A battle is already in progress!', ephemeral: true });
                return;
            }
            const opponent = options.getUser('opponent');
            if (!opponent || opponent.bot) {
                await interaction.reply({ content: 'You can only challenge another player!', ephemeral: true });
                return;
            }
            const opponentId = opponent.id;
            const userDataEntry = userData.get(userId);
            const opponentDataEntry = userData.get(opponentId);
            if (!userDataEntry || !opponentDataEntry || userDataEntry.inventory.length === 0 || opponentDataEntry.inventory.length === 0) {
                await interaction.reply({ content: 'Both players must have started their journey!', ephemeral: true });
                return;
            }

            battle.players.set(userId, { pokemon: { ...userDataEntry.inventory[0], currentHp: userDataEntry.inventory[0].hp }, lastAction: null, ownerId: userId, isBot: false });
            battle.players.set(opponentId, { pokemon: { ...opponentDataEntry.inventory[0], currentHp: opponentDataEntry.inventory[0].hp }, lastAction: null, ownerId: opponentId, isBot: false });
            battle.active = true;
            battle.turnOrder = [userId, opponentId];
            battle.battleStartTime = Date.now();
            await interaction.reply({ content: `Challenged ${opponent.username} to a 1v1 battle! Waiting for battle to start...`, ephemeral: true });
            await channel.send(`${user.username} has challenged ${opponent.username} to a 1v1 battle! Use /startbattle to begin.`);
            await announceBattleUpdate(channel);
            saveGameState();
        }

        if (commandName === 'bal') {
            const userDataEntry = userData.get(userId) || { wallet: 0, pokeballs: 0, ultraballs: 0, trainerLevel: 0, badges: 0 };
            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Trainer Profile`)
                .setDescription('Your stats and inventory:')
                .setColor('#FFD700')
                .setThumbnail('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png')
                .addFields(
                    { name: 'Coins', value: `${userDataEntry.wallet}`, inline: true },
                    { name: 'Poké Balls', value: `${userDataEntry.pokeballs}`, inline: true },
                    { name: 'Ultra Balls', value: `${userDataEntry.ultraballs}`, inline: true },
                    { name: 'Trainer Level', value: `${userDataEntry.trainerLevel}`, inline: true },
                    { name: 'Badges', value: `${userDataEntry.badges}`, inline: true }
                )
                .setFooter({ text: 'Earn coins by battling and catching Pokémon!', iconURL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/coin.png' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (commandName === 'shop') {
            const userDataEntry = userData.get(userId) || { wallet: 0, pokeballs: 0, ultraballs: 0, trainerLevel: 0, badges: 0 };
            const item = options.getString('item');
            if (item === 'pokeball' && userDataEntry.wallet >= 10) {
                userDataEntry.pokeballs++;
                userDataEntry.wallet -= 10;
                userData.set(userId, userDataEntry);
                saveGameState();
                await interaction.reply({ content: 'Purchased 1 Poké Ball! Cost: 10 coins.', ephemeral: true });
            } else if (item === 'ultraball' && userDataEntry.wallet >= 25) {
                userDataEntry.ultraballs++;
                userDataEntry.wallet -= 25;
                userData.set(userId, userDataEntry);
                saveGameState();
                await interaction.reply({ content: 'Purchased 1 Ultra Ball! Cost: 25 coins.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Insufficient coins or invalid item! Check your balance with /bal.', ephemeral: true });
            }
        }
    } catch (error) {
        console.error(`Error handling interaction (${commandName}):`, error.message);
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
    }
});

setInterval(async () => {
    if (!battle.active || !battle.battleStartTime) {
        const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
        if (Math.random() < 0.02) { // 2% chance to spawn a wild Pokémon every 5 seconds
            await spawnWildPokemon(channel);
        }
        return;
    }
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
                const userWinner = userData.get(winnerId);
                if (userWinner) {
                    userWinner.wallet += 50;
                    userWinner.trainerLevel = (userWinner.trainerLevel || 0) + 1;
                    userWinner.badges = (userWinner.badges || 0) + 1;
                    userData.set(winnerId, userWinner);
                }
                await channel.send(`The battle is over! Winner: ${winnerLabel}! ${winnerLabel === winnerData.pokemon.name ? `<@${winnerId}>` : ''} earned 50 coins!`);
                battle.players.clear();
                battle.turnOrder = [];
                battle.battleStartTime = null;
                saveGameState();
            }
        } catch (error) {
            console.error('Error in timeout check:', error.message);
        }
    }
}, 5000);

client.login(process.env.DISCORD_TOKEN).catch(console.error);
