require('dotenv').config();
const { Client, IntentsBitField, SlashCommandBuilder, EmbedBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
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
const BATTLE_COIN_REWARD = 20; // Coins for participating in a battle
const BATTLE_ROYALE_WIN_COIN_REWARD = 50; // Coins for winning Battle Royale
const BATTLE_ROYALE_WIN_XP_REWARD = 100; // XP for winning Battle Royale
const CATCH_COIN_REWARD = 10; // Coins for catching a Pokémon
const CATCH_XP_REWARD = 50; // XP for catching a Pokémon

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

// Starter Pokémon from Generations 1-4
const starterPokemon = [
    // Gen 1
    { name: 'Bulbasaur', baseHp: 45, baseAttack: 49, baseDefense: 49, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip'], evolution: 'Ivysaur', evolveLevel: 16 },
    { name: 'Charmander', baseHp: 39, baseAttack: 52, baseDefense: 43, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Charmeleon', evolveLevel: 16 },
    { name: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65, type: ['Water'], moves: ['Tackle', 'Water Gun'], evolution: 'Wartortle', evolveLevel: 16 },
    // Gen 2
    { name: 'Chikorita', baseHp: 45, baseAttack: 49, baseDefense: 65, type: ['Grass'], moves: ['Tackle', 'Razor Leaf'], evolution: 'Bayleef', evolveLevel: 16 },
    { name: 'Cyndaquil', baseHp: 39, baseAttack: 52, baseDefense: 43, type: ['Fire'], moves: ['Tackle', 'Ember'], evolution: 'Quilava', evolveLevel: 14 },
    { name: 'Totodile', baseHp: 50, baseAttack: 65, baseDefense: 64, type: ['Water'], moves: ['Scratch', 'Water Gun'], evolution: 'Croconaw', evolveLevel: 18 },
    // Gen 3
    { name: 'Treecko', baseHp: 40, baseAttack: 45, baseDefense: 35, type: ['Grass'], moves: ['Pound', 'Absorb'], evolution: 'Grovyle', evolveLevel: 16 },
    { name: 'Torchic', baseHp: 45, baseAttack: 60, baseDefense: 40, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Combusken', evolveLevel: 16 },
    { name: 'Mudkip', baseHp: 50, baseAttack: 70, baseDefense: 50, type: ['Water'], moves: ['Tackle', 'Water Gun'], evolution: 'Marshtomp', evolveLevel: 16 },
    // Gen 4
    { name: 'Turtwig', baseHp: 55, baseAttack: 68, baseDefense: 64, type: ['Grass'], moves: ['Tackle', 'Absorb'], evolution: 'Grotle', evolveLevel: 18 },
    { name: 'Chimchar', baseHp: 44, baseAttack: 58, baseDefense: 44, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Monferno', evolveLevel: 14 },
    { name: 'Piplup', baseHp: 53, baseAttack: 51, baseDefense: 53, type: ['Water'], moves: ['Pound', 'Bubble'], evolution: 'Prinplup', evolveLevel: 16 }
];

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
    { name: 'Chikorita', baseHp: 45, baseAttack: 49, baseDefense: 65, type: ['Grass'], moves: ['Tackle', 'Razor Leaf'], evolution: 'Bayleef', evolveLevel: 16 },
    { name: 'Bayleef', baseHp: 60, baseAttack: 62, baseDefense: 80, type: ['Grass'], moves: ['Razor Leaf', 'Tackle', 'Magical Leaf'], evolution: 'Meganium', evolveLevel: 32 },
    { name: 'Meganium', baseHp: 80, baseAttack: 82, baseDefense: 100, type: ['Grass'], moves: ['Petal Dance', 'Magical Leaf', 'Synthesis', 'Toxic'], evolution: null },
    { name: 'Cyndaquil', baseHp: 39, baseAttack: 52, baseDefense: 43, type: ['Fire'], moves: ['Tackle', 'Ember'], evolution: 'Quilava', evolveLevel: 14 },
    { name: 'Quilava', baseHp: 58, baseAttack: 64, baseDefense: 58, type: ['Fire'], moves: ['Ember', 'Tackle', 'Flamethrower'], evolution: 'Typhlosion', evolveLevel: 36 },
    { name: 'Typhlosion', baseHp: 78, baseAttack: 84, baseDefense: 78, type: ['Fire'], moves: ['Flamethrower', 'Swift', 'Fire Blast', 'Eruption'], evolution: null },
    { name: 'Totodile', baseHp: 50, baseAttack: 65, baseDefense: 64, type: ['Water'], moves: ['Scratch', 'Water Gun'], evolution: 'Croconaw', evolveLevel: 18 },
    { name: 'Croconaw', baseHp: 65, baseAttack: 80, baseDefense: 80, type: ['Water'], moves: ['Water Gun', 'Bite', 'Aqua Tail'], evolution: 'Feraligatr', evolveLevel: 30 },
    { name: 'Feraligatr', baseHp: 85, baseAttack: 105, baseDefense: 100, type: ['Water'], moves: ['Hydro Pump', 'Aqua Tail', 'Crunch', 'Ice Fang'], evolution: null },
    { name: 'Treecko', baseHp: 40, baseAttack: 45, baseDefense: 35, type: ['Grass'], moves: ['Pound', 'Absorb'], evolution: 'Grovyle', evolveLevel: 16 },
    { name: 'Grovyle', baseHp: 50, baseAttack: 65, baseDefense: 45, type: ['Grass'], moves: ['Absorb', 'Quick Attack', 'Leaf Blade'], evolution: 'Sceptile', evolveLevel: 36 },
    { name: 'Sceptile', baseHp: 70, baseAttack: 85, baseDefense: 65, type: ['Grass'], moves: ['Leaf Blade', 'Dragon Claw', 'Giga Drain', 'Agility'], evolution: null },
    { name: 'Torchic', baseHp: 45, baseAttack: 60, baseDefense: 40, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Combusken', evolveLevel: 16 },
    { name: 'Combusken', baseHp: 60, baseAttack: 85, baseDefense: 60, type: ['Fire', 'Fighting'], moves: ['Ember', 'Double Kick', 'Flamethrower'], evolution: 'Blaziken', evolveLevel: 36 },
    { name: 'Blaziken', baseHp: 80, baseAttack: 120, baseDefense: 70, type: ['Fire', 'Fighting'], moves: ['Flamethrower', 'Blaze Kick', 'Sky Uppercut', 'Brave Bird'], evolution: null },
    { name: 'Mudkip', baseHp: 50, baseAttack: 70, baseDefense: 50, type: ['Water'], moves: ['Tackle', 'Water Gun'], evolution: 'Marshtomp', evolveLevel: 16 },
    { name: 'Marshtomp', baseHp: 70, baseAttack: 85, baseDefense: 70, type: ['Water', 'Ground'], moves: ['Water Gun', 'Mud Shot', 'Hydro Pump'], evolution: 'Swampert', evolveLevel: 36 },
    { name: 'Swampert', baseHp: 100, baseAttack: 110, baseDefense: 90, type: ['Water', 'Ground'], moves: ['Hydro Pump', 'Earthquake', 'Mud Shot', 'Hammer Arm'], evolution: null },
    { name: 'Turtwig', baseHp: 55, baseAttack: 68, baseDefense: 64, type: ['Grass'], moves: ['Tackle', 'Absorb'], evolution: 'Grotle', evolveLevel: 18 },
    { name: 'Grotle', baseHp: 75, baseAttack: 89, baseDefense: 85, type: ['Grass'], moves: ['Absorb', 'Razor Leaf', 'Bite'], evolution: 'Torterra', evolveLevel: 32 },
    { name: 'Torterra', baseHp: 95, baseAttack: 109, baseDefense: 105, type: ['Grass', 'Ground'], moves: ['Earthquake', 'Wood Hammer', 'Giga Drain', 'Synthesis'], evolution: null },
    { name: 'Chimchar', baseHp: 44, baseAttack: 58, baseDefense: 44, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Monferno', evolveLevel: 14 },
    { name: 'Monferno', baseHp: 64, baseAttack: 78, baseDefense: 52, type: ['Fire', 'Fighting'], moves: ['Ember', 'Mach Punch', 'Flamethrower'], evolution: 'Infernape', evolveLevel: 36 },
    { name: 'Infernape', baseHp: 76, baseAttack: 104, baseDefense: 71, type: ['Fire', 'Fighting'], moves: ['Flamethrower', 'Close Combat', 'Fire Blast', 'Acrobatics'], evolution: null },
    { name: 'Piplup', baseHp: 53, baseAttack: 51, baseDefense: 53, type: ['Water'], moves: ['Pound', 'Bubble'], evolution: 'Prinplup', evolveLevel: 16 },
    { name: 'Prinplup', baseHp: 64, baseAttack: 66, baseDefense: 68, type: ['Water'], moves: ['Bubble', 'Peck', 'Bubble Beam'], evolution: 'Empoleon', evolveLevel: 36 },
    { name: 'Empoleon', baseHp: 84, baseAttack: 86, baseDefense: 88, type: ['Water', 'Steel'], moves: ['Hydro Pump', 'Flash Cannon', 'Drill Peck', 'Aqua Jet'], evolution: null }
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
    'Absorb': { baseDamage: 15, accuracy: 90, type: 'Grass' },
    'Pound': { baseDamage: 10, accuracy: 95, type: 'Normal' },
    'Bubble': { baseDamage: 15, accuracy: 95, type: 'Water' },
    'Magical Leaf': { baseDamage: 20, accuracy: 90, type: 'Grass' },
    'Synthesis': { baseDamage: 0, accuracy: 100, type: 'Grass', status: true },
    'Swift': { baseDamage: 15, accuracy: 95, type: 'Normal' },
    'Eruption': { baseDamage: 25, accuracy: 80, type: 'Fire' },
    'Aqua Tail': { baseDamage: 20, accuracy: 90, type: 'Water' },
    'Crunch': { baseDamage: 20, accuracy: 85, type: 'Dark' },
    'Ice Fang': { baseDamage: 15, accuracy: 90, type: 'Ice' },
    'Leaf Blade': { baseDamage: 25, accuracy: 90, type: 'Grass' },
    'Giga Drain': { baseDamage: 20, accuracy: 90, type: 'Grass' },
    'Blaze Kick': { baseDamage: 20, accuracy: 85, type: 'Fire', statusEffect: 'burned', statusChance: 10 },
    'Sky Uppercut': { baseDamage: 20, accuracy: 90, type: 'Fighting' },
    'Brave Bird': { baseDamage: 25, accuracy: 85, type: 'Flying' },
    'Mud Shot': { baseDamage: 15, accuracy: 90, type: 'Ground' },
    'Hammer Arm': { baseDamage: 25, accuracy: 80, type: 'Fighting' },
    'Wood Hammer': { baseDamage: 25, accuracy: 85, type: 'Grass' },
    'Mach Punch': { baseDamage: 12, accuracy: 95, type: 'Fighting' },
    'Close Combat': { baseDamage: 25, accuracy: 85, type: 'Fighting' },
    'Acrobatics': { baseDamage: 15, accuracy: 90, type: 'Flying' },
    'Flash Cannon': { baseDamage: 20, accuracy: 90, type: 'Steel' },
    'Aqua Jet': { baseDamage: 12, accuracy: 95, type: 'Water' }
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
    battleStartTime: null,
    turnMessage: null // To store the message with buttons
};

let wildPokemon = null; // Current wild Pokémon
let lastSpawnTime = 0;

function loadGameState() {
    try {
        if (fs.existsSync('vouchData.json')) {
            const data = fs.readFileSync('vouchData.json', 'utf8');
            const parsedData = JSON.parse(data);
            battle.players = new Map(parsedData.battleRoyale || []);
            userData = new Map(parsedData.userData || []);
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

function getPokemonByName(name) {
    const basePokemon = pokemonData.find(p => p.name === name);
    if (!basePokemon) return null;
    const level = 5; // Starter level
    return {
        name: basePokemon.name,
        level: level,
        xp: 0,
        maxXp: 100 * level,
        hp: Math.floor(basePokemon.baseHp * (level / 10 + 1)),
        attack: Math.floor(basePokemon.baseAttack * (level / 10 + 1)),
        defense: Math.floor(basePokemon.baseDefense * (level / 10 + 1)),
        type: basePokemon.type,
        moves: basePokemon.moves,
        currentHp: Math.floor(basePokemon.baseHp * (level / 10 + 1)),
        status: 'none',
        statusTurns: 0,
        shiny: false,
        evolution: basePokemon.evolution,
        evolveLevel: basePokemon.evolveLevel
    };
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
        maxXp: 100 * level,
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

    const user = userData.get(userId);
    const ballCount = user.inventory[ballType] || 0;
    if (ballCount <= 0) return false;

    const catchRate = shopItems[ballType].catchRate;
    const hpRatio = wildPokemon.currentHp / wildPokemon.hp;
    const catchChance = catchRate * (1 - hpRatio) * (wildPokemon.shiny ? 1.5 : 1);

    if (Math.random() < catchChance) {
        user.inventory[ballType]--;
        if (user.party.length < MAX_PARTY_SIZE) {
            user.party.push(wildPokemon);
        } else {
            user.pc.push(wildPokemon);
        }
        user.party.forEach(pokemon => {
            pokemon.xp += CATCH_XP_REWARD;
            levelUpPokemon(pokemon);
        });
        user.coins += CATCH_COIN_REWARD;
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

function levelUpPokemon(pokemon, channel = null) {
    while (pokemon.xp >= pokemon.maxXp) {
        pokemon.xp -= pokemon.maxXp;
        pokemon.level++;
        pokemon.maxXp = 100 * pokemon.level;
        pokemon.hp = Math.floor(pokemon.hp * 1.1);
        pokemon.attack = Math.floor(pokemon.attack * 1.1);
        pokemon.defense = Math.floor(pokemon.defense * 1.1);
        pokemon.currentHp = Math.min(pokemon.currentHp + Math.floor(pokemon.hp / 10), pokemon.hp);
        if (pokemon.evolution && pokemon.level >= pokemon.evolveLevel) {
            const evolved = pokemonData.find(p => p.name === pokemon.evolution);
            if (evolved) {
                pokemon.name = evolved.name;
                pokemon.type = evolved.type;
                pokemon.moves = evolved.moves;
                pokemon.evolution = evolved.evolution;
                pokemon.evolveLevel = evolved.evolveLevel;
                if (channel) channel.send(`${pokemon.name} evolved into ${evolved.name}!`);
            }
        }
    }
}

function checkBattleEnd(channel) {
    const alivePlayers = battle.players.size;
    if (alivePlayers <= 1) {
        battle.active = false;
        battle.battleStartTime = null;
        const winnerId = Array.from(battle.players.keys())[0];
        const winnerData = battle.players.get(winnerId);
        const winnerLabel = winnerData.isBot ? `${winnerData.pokemon.name} (bot)` : winnerData.pokemon.name;
        channel.send(`The battle is over! Winner: ${winnerLabel}!`);
        if (!winnerData.isBot) {
            const winnerUser = userData.get(winnerId);
            winnerUser.coins += BATTLE_ROYALE_WIN_COIN_REWARD;
            winnerUser.party.forEach(pokemon => {
                pokemon.xp += BATTLE_ROYALE_WIN_XP_REWARD;
                levelUpPokemon(pokemon, channel);
            });
            userData.set(winnerId, winnerUser);
            channel.send(`<@${winnerId}> earned ${BATTLE_ROYALE_WIN_COIN_REWARD} coins and ${BATTLE_ROYALE_WIN_XP_REWARD} XP for winning the Battle Royale!`);
        }
        battle.players.clear();
        battle.turnOrder = [];
        battle.turnMessage = null;
        saveGameState();
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

    if (checkBattleEnd(channel)) {
        battle.players.clear();
        battle.turnOrder = [];
        battle.turnMessage = null;
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

        // If there's a previous turn message with buttons, delete it
        if (battle.turnMessage) {
            await battle.turnMessage.delete().catch(() => {});
            battle.turnMessage = null;
        }

        // If it's a player's turn (not a bot), add buttons
        const playerData = battle.players.get(currentPlayerId);
        if (battle.active && playerData && !playerData.isBot) {
            const fightButton = new ButtonBuilder()
                .setCustomId(`fight_${currentPlayerId}`)
                .setLabel('Fight')
                .setStyle(ButtonStyle.Primary);

            const fleeButton = new ButtonBuilder()
                .setCustomId(`flee_${currentPlayerId}`)
                .setLabel('Flee')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(fightButton, fleeButton);

            battle.turnMessage = await channel.send({ embeds: [embed], components: [row] });
        } else {
            battle.turnMessage = await channel.send({ embeds: [embed] });
        }
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
            .setName('startadventure')
            .setDescription('Begin your Pokémon adventure by selecting a starter')
            .addStringOption(option =>
                option.setName('starter')
                    .setDescription('Select your starter Pokémon from Generations 1-4')
                    .setRequired(true)
                    .addChoices(
                        // Gen 1
                        { name: 'Bulbasaur (Gen 1)', value: 'Bulbasaur' },
                        { name: 'Charmander (Gen 1)', value: 'Charmander' },
                        { name: 'Squirtle (Gen 1)', value: 'Squirtle' },
                        // Gen 2
                        { name: 'Chikorita (Gen 2)', value: 'Chikorita' },
                        { name: 'Cyndaquil (Gen 2)', value: 'Cyndaquil' },
                        { name: 'Totodile (Gen 2)', value: 'Totodile' },
                        // Gen 3
                        { name: 'Treecko (Gen 3)', value: 'Treecko' },
                        { name: 'Torchic (Gen 3)', value: 'Torchic' },
                        { name: 'Mudkip (Gen 3)', value: 'Mudkip' },
                        // Gen 4
                        { name: 'Turtwig (Gen 4)', value: 'Turtwig' },
                        { name: 'Chimchar (Gen 4)', value: 'Chimchar' },
                        { name: 'Piplup (Gen 4)', value: 'Piplup' }
                    )
            ),
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
            .setName('inventory')
            .setDescription('Check your inventory'),
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
    await channel.send('Pokémon Battle Royale Bot is online! Use `/startadventure` to begin your journey, then use `/joinbattle`, `/startbattle`, `/shop`, `/bal`, `/inventory`, and `/catch` to play.');
});

client.on('interactionCreate', async interaction => {
    // Handle Autocomplete
    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        const userId = interaction.user.id;

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

    // Handle Button Interactions
    if (interaction.isButton()) {
        const [action, userId] = interaction.customId.split('_');
        const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);

        if (userId !== interaction.user.id) {
            await interaction.reply({ content: 'This is not your turn!', ephemeral: true });
            return;
        }

        if (!battle.active || battle.turnOrder[battle.currentTurn % battle.turnOrder.length] !== userId) {
            await interaction.reply({ content: 'It’s not your turn anymore!', ephemeral: true });
            return;
        }

        const playerData = battle.players.get(userId);
        if (!playerData) {
            await interaction.reply({ content: 'You are not in the battle!', ephemeral: true });
            return;
        }

        if (action === 'flee') {
            battle.players.delete(userId);
            battle.turnOrder = battle.turnOrder.filter(id => id !== userId);
            battle.currentTurn++;
            await channel.send(`<@${userId}> has fled the battle!`);
            saveGameState();
            await announceBattleUpdate(channel);
            if (checkBattleEnd(channel)) {
                battle.players.clear();
                battle.turnOrder = [];
                battle.turnMessage = null;
                saveGameState();
            }
            await interaction.deferUpdate();
            return;
        }

        if (action === 'fight') {
            const moves = playerData.pokemon.moves;
            const moveButtons = moves.map((move, index) => {
                const moveInfo = moveData[move];
                return new ButtonBuilder()
                    .setCustomId(`move_${userId}_${move}_${index}`)
                    .setLabel(`${move} (Power: ${moveInfo.baseDamage})`)
                    .setStyle(ButtonStyle.Secondary);
            });

            const rows = [];
            for (let i = 0; i < moveButtons.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(moveButtons.slice(i, i + 5));
                rows.push(row);
            }

            await interaction.update({ content: 'Select a move:', components: rows });
            return;
        }

        if (action === 'move') {
            const [, , move, moveIndex] = interaction.customId.split('_');
            const possibleTargets = Array.from(battle.players.entries())
                .filter(([id]) => id !== userId)
                .map(([id, data]) => ({ id, pokemon: data.pokemon }));

            if (possibleTargets.length === 0) {
                battle.currentTurn++;
                await announceBattleUpdate(channel);
                await interaction.deferUpdate();
                return;
            }

            const targetButtons = possibleTargets.map((target, index) => {
                const targetLabel = target.pokemon.name + (target.isBot ? ' (bot)' : ' (opponent)');
                return new ButtonBuilder()
                    .setCustomId(`target_${userId}_${move}_${target.id}_${index}`)
                    .setLabel(targetLabel)
                    .setStyle(ButtonStyle.Secondary);
            });

            const rows = [];
            for (let i = 0; i < targetButtons.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5));
                rows.push(row);
            }

            await interaction.update({ content: `Select a target for ${move}:`, components: rows });
            return;
        }

        if (action === 'target') {
            const [, userId, move, targetId] = interaction.customId.split('_');

            if (!handleStatusEffects(playerData, channel)) {
                battle.currentTurn++;
                await announceBattleUpdate(channel);
                await interaction.deferUpdate();
                return;
            }

            if (!playerData.pokemon.moves.includes(move)) {
                await interaction.reply({ content: 'Invalid move!', ephemeral: true });
                return;
            }

            // Re-filter possible targets to ensure the target is still valid
            const possibleTargets = Array.from(battle.players.entries())
                .filter(([id]) => id !== userId && id === targetId && battle.players.has(targetId));
            if (possibleTargets.length === 0) {
                await interaction.reply({ content: 'Target is no longer in battle or invalid! Please select a valid opponent.', ephemeral: true });
                return;
            }

            const targetData = battle.players.get(targetId);
            const damage = calculateDamage(playerData.pokemon, targetData.pokemon, move, channel, userId);
            targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

            if (damage > 0) {
                const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : `${targetData.pokemon.name} (opponent)`;
                await channel.send(`${playerData.pokemon.name} used ${move} on ${targetLabel} for ${damage} damage!`);
            }

            playerData.pokemon.xp += Math.floor(damage * 10);
            levelUpPokemon(playerData.pokemon, channel);

            if (targetData.pokemon.currentHp === 0) {
                const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : `${targetData.pokemon.name} (opponent)`;
                await channel.send(`${targetLabel} has fainted! Player is eliminated!`);
                battle.players.delete(targetId);
                battle.turnOrder = battle.turnOrder.filter(id => id !== targetId);
                saveGameState();
            }

            const user = userData.get(userId);
            user.coins += BATTLE_COIN_REWARD;
            userData.set(userId, user);
            saveGameState();

            playerData.lastAction = Date.now();
            battle.currentTurn++;
            await announceBattleUpdate(channel);

            if (checkBattleEnd(channel)) {
                battle.players.clear();
                battle.turnOrder = [];
                battle.turnMessage = null;
                saveGameState();
            }

            await interaction.deferUpdate();
            return;
        }
    }

    // Handle Commands
    if (!interaction.isCommand()) return;

    if (interaction.channelId !== BATTLE_CHANNEL_ID) {
        await interaction.reply({ content: 'Please use this command in the designated battle channel!', ephemeral: true });
        return;
    }

    const { commandName, user, options } = interaction;
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    const userId = user.id;

    if (commandName !== 'startadventure') {
        const user = userData.get(userId);
        if (!user || !user.hasStarted) {
            await interaction.reply({ content: 'You must use /startadventure to begin your Pokémon journey before using other commands!', ephemeral: true });
            return;
        }
    }

    try {
        if (commandName === 'startadventure') {
            const user = userData.get(userId);
            if (user && user.hasStarted) {
                await interaction.reply({ content: 'You have already started your Pokémon journey!', ephemeral: true });
                return;
            }

            const starterName = options.getString('starter');
            const starter = getPokemonByName(starterName);
            if (!starter) {
                await interaction.reply({ content: 'Invalid starter Pokémon!', ephemeral: true });
                return;
            }

            userData.set(userId, {
                coins: 100,
                inventory: { pokeball: 10, greatball: 10, ultraball: 10 },
                party: [starter],
                pc: [],
                hasStarted: true
            });
            saveGameState();
            await interaction.reply({ content: `Welcome to your Pokémon journey! You have chosen ${starterName} as your starter. You received 100 coins and 10 of each Poké Ball type. Use other commands to continue your adventure!`, ephemeral: true });
            await channel.send(`<@${userId}> has started their Pokémon journey with ${starterName}!`);
        }

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
                const user = userData.get(userId);
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

            // Create an embed for the battle start announcement
            const embed = new EmbedBuilder()
                .setTitle('Pokémon Battle Royale - Battle Start!')
                .setDescription('The battle has begun! May the best trainer win!')
                .setColor('#ff4444')
                .setThumbnail('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png')
                .setFooter({ text: 'Pokémon Battle Royale', iconURL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' })
                .setTimestamp();

            const fields = [];
            for (const [userId, data] of battle.players.entries()) {
                const pokemonLabel = data.isBot ? `${data.pokemon.name} (bot)` : `<@${userId}>'s ${data.pokemon.name}`;
                fields.push({
                    name: pokemonLabel,
                    value: `**HP:** ${data.pokemon.currentHp}/${data.pokemon.hp} | **Level:** ${data.pokemon.level}`
                });
            }
            embed.addFields(fields);

            await interaction.reply({ content: 'Battle starting now! Check your turn with buttons.', ephemeral: true });
            await channel.send({ embeds: [embed] });
            await announceBattleUpdate(channel);
            saveGameState();
        }

        if (commandName === 'battle_status') {
            await announceBattleUpdate(channel);
            await interaction.reply({ content: 'Battle status updated!', ephemeral: true });
        }

        if (commandName === 'shop') {
            const item = options.getString('item');
            const quantity = options.getInteger('quantity');
            const user = userData.get(userId);
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
            const user = userData.get(userId);
            await interaction.reply({ content: `Your coin balance: ${user.coins} coins.`, ephemeral: true });
        }

        if (commandName === 'inventory') {
            const user = userData.get(userId);
            const inventory = user.inventory;
            const embed = new EmbedBuilder()
                .setTitle('Your Inventory')
                .setDescription('Here are the items in your inventory:')
                .addFields(
                    { name: 'Poké Balls', value: `${inventory.pokeball || 0}`, inline: true },
                    { name: 'Great Balls', value: `${inventory.greatball || 0}`, inline: true },
                    { name: 'Ultra Balls', value: `${inventory.ultraball || 0}`, inline: true }
                )
                .setColor('#00ff00');
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (commandName === 'catch') {
            const ball = options.getString('ball');
            const user = userData.get(userId);

            if (attemptCatch(userId, ball)) {
                await interaction.reply({ content: `You caught ${wildPokemon.name} (Level ${wildPokemon.level}${wildPokemon.shiny ? ' ★' : ''}) with a ${ball.replace('ball', ' Ball')}!`, ephemeral: true });
                await channel.send(`A wild ${wildPokemon.name} (Level ${wildPokemon.level}${wildPokemon.shiny ? ' ★' : ''}) was caught by <@${userId}>! Earned ${CATCH_COIN_REWARD} coins and ${CATCH_XP_REWARD} XP!`);
            } else {
                await interaction.reply({ content: `Failed to catch ${wildPokemon ? wildPokemon.name : 'the Pokémon'}! You need a ${ball.replace('ball', ' Ball')} in your inventory. Current count: ${user.inventory[ball] || 0}`, ephemeral: true });
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
            if (checkBattleEnd(channel)) {
                battle.players.clear();
                battle.turnOrder = [];
                battle.battleStartTime = null;
                saveGameState();
            }
        } catch (error) {
            console.error('Error in timeout check:', error.message);
        }
    }

    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    if (spawnWildPokemon()) {
        const shinyText = wildPokemon.shiny ? ' ★ (Shiny!)' : '';
        await channel.send(`A wild ${wildPokemon.name} (Level ${wildPokemon.level}${shinyText}) has appeared! Use /catch <ball> to try catching it!`);
    }
}, 5000);

client.login(process.env.DISCORD_TOKEN).catch(console.error);
