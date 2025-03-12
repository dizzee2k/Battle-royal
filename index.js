require('dotenv').config();
const { Client, IntentsBitField, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

const GUILD_ID = process.env.GUILD_ID || '1242348592547496046';
const BATTLE_CHANNEL_ID = process.env.BATTLE_CHANNEL_ID || '1348420527244709958';
const APPLICATION_ID = process.env.APPLICATION_ID || '1348420959542968341';
const MAX_PLAYERS = 8;
const TURN_TIMEOUT = 60000;
const MAX_PARTY_SIZE = 6;
const SPAWN_INTERVAL_MIN = 180000;
const SPAWN_INTERVAL_MAX = 300000;
const SHINY_CHANCE = 0.01;
const BATTLE_COIN_REWARD = 20;
const BATTLE_TURN_COIN_REWARD = 5;
const BATTLE_ROYALE_WIN_COIN_REWARD = 50;
const BATTLE_ROYALE_WIN_XP_REWARD = 100;
const CATCH_COIN_REWARD = 10;
const CATCH_XP_REWARD = 50;
const WILD_FIGHT_COIN_REWARD = 15;
const WILD_FIGHT_XP_REWARD = 30;

// Pokémon type effectiveness
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
    { name: 'Bulbasaur', baseHp: 45, baseAttack: 49, baseDefense: 49, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip'], evolution: 'Ivysaur', evolveLevel: 16 },
    { name: 'Charmander', baseHp: 39, baseAttack: 52, baseDefense: 43, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Charmeleon', evolveLevel: 16 },
    { name: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65, type: ['Water'], moves: ['Tackle', 'Water Gun'], evolution: 'Wartortle', evolveLevel: 16 },
    { name: 'Chikorita', baseHp: 45, baseAttack: 49, baseDefense: 65, type: ['Grass'], moves: ['Tackle', 'Razor Leaf'], evolution: 'Bayleef', evolveLevel: 16 },
    { name: 'Cyndaquil', baseHp: 39, baseAttack: 52, baseDefense: 43, type: ['Fire'], moves: ['Tackle', 'Ember'], evolution: 'Quilava', evolveLevel: 14 },
    { name: 'Totodile', baseHp: 50, baseAttack: 65, baseDefense: 64, type: ['Water'], moves: ['Scratch', 'Water Gun'], evolution: 'Croconaw', evolveLevel: 18 },
    { name: 'Treecko', baseHp: 40, baseAttack: 45, baseDefense: 35, type: ['Grass'], moves: ['Pound', 'Absorb'], evolution: 'Grovyle', evolveLevel: 16 },
    { name: 'Torchic', baseHp: 45, baseAttack: 60, baseDefense: 40, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Combusken', evolveLevel: 16 },
    { name: 'Mudkip', baseHp: 50, baseAttack: 70, baseDefense: 50, type: ['Water'], moves: ['Tackle', 'Water Gun'], evolution: 'Marshtomp', evolveLevel: 16 },
    { name: 'Turtwig', baseHp: 55, baseAttack: 68, baseDefense: 64, type: ['Grass'], moves: ['Tackle', 'Absorb'], evolution: 'Grotle', evolveLevel: 18 },
    { name: 'Chimchar', baseHp: 44, baseAttack: 58, baseDefense: 44, type: ['Fire'], moves: ['Scratch', 'Ember'], evolution: 'Monferno', evolveLevel: 14 },
    { name: 'Piplup', baseHp: 53, baseAttack: 51, baseDefense: 53, type: ['Water'], moves: ['Pound', 'Bubble'], evolution: 'Prinplup', evolveLevel: 16 }
];

// Expanded Pokémon data
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

// Move data
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

// Shop items
const shopItems = {
    pokeball: { price: 200, catchRate: 0.5 },
    greatball: { price: 600, catchRate: 0.75 },
    ultraball: { price: 1200, catchRate: 0.9 },
    potion: { price: 300, healAmount: 20 },
    superpotion: { price: 700, healAmount: 50 },
    hyperpotion: { price: 1500, healAmount: 200 },
    antidote: { price: 100, cure: 'poisoned' },
    burnheal: { price: 250, cure: 'burned' },
    paralyzheal: { price: 200, cure: 'paralyzed' },
    awakepowder: { price: 250, cure: 'asleep' }
};

// Game state
let userData = new Map();
let battle = {
    active: false,
    players: new Map(),
    currentTurn: 0,
    turnOrder: [],
    battleStartTime: null,
    turnMessage: null
};
let wildPokemon = null;
let wildBattle = null;
let lastSpawnTime = 0;

function loadGameState() {
    try {
        if (fs.existsSync('vouchData.json')) {
            const data = fs.readFileSync('vouchData.json', 'utf8');
            const parsedData = JSON.parse(data);
            
            // Convert arrays back to Maps
            userData = new Map(parsedData.userData || []);
            battle.players = new Map(parsedData.battleRoyale || []);
        } else {
            console.log('vouchData.json not found, initializing new file.');
            fs.writeFileSync('vouchData.json', JSON.stringify({ battleRoyale: [], userData: [] }));
        }
    } catch (error) {
        console.error('Error loading game state:', error.message);
        userData = new Map();
        battle.players = new Map();
        fs.writeFileSync('vouchData.json', JSON.stringify({ battleRoyale: [], userData: [] }));
    }
}

function saveGameState() {
    try {
        const data = { 
            battleRoyale: Array.from(battle.players.entries()), 
            userData: Array.from(userData.entries()) 
        };
        fs.writeFileSync('vouchData.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving game state:', error.message);
    }
}

function getPokemonByName(name) {
    const basePokemon = pokemonData.find(p => p.name === name);
    if (!basePokemon) return null;
    const level = 5;
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
        wildPokemon = getRandomPokemon(Math.floor(Math.random() * 5) + 1);
        lastSpawnTime = Date.now();
        return true;
    }
    return false;
}

function attemptCatch(userId, ballType, fromBattle = false) {
    if (!wildPokemon || (!fromBattle && wildBattle)) {
        console.log(`No wild Pokémon to catch or battle in progress for user ${userId}`);
        return false;
    }

    const user = userData.get(userId);
    if (!user) {
        console.log(`User ${userId} not found in userData`);
        return false;
    }

    const ballCount = user.inventory[ballType.toLowerCase()] || 0;
    if (ballCount <= 0) {
        console.log(`User ${userId} has no ${ballType} in inventory. Current count: ${ballCount}`);
        return false;
    }

    const hpRatio = wildPokemon.currentHp / wildPokemon.hp;
    const caughtPokemonName = wildPokemon.name;
    const catchRate = shopItems[ballType.toLowerCase()].catchRate * (2 - hpRatio) + 0.1;
    const catchChance = Math.min(1, catchRate * (wildPokemon.shiny ? 0.5 : 1));

    console.log(`Catch attempt by ${userId}: Ball=${ballType}, HP Ratio=${hpRatio.toFixed(2)}, Catch Rate=${catchRate.toFixed(2)}, Catch Chance=${catchChance.toFixed(2)}`);

    if (Math.random() < catchChance) {
        user.inventory[ballType.toLowerCase()]--;
        if (user.party.length < MAX_PARTY_SIZE) {
            user.party.push({ ...wildPokemon });
        } else {
            user.pc.push({ ...wildPokemon });
        }
        user.party.forEach(pokemon => {
            pokemon.xp += CATCH_XP_REWARD;
            levelUpPokemon(pokemon);
        });
        user.coins += CATCH_COIN_REWARD;
        wildPokemon = null;
        if (wildBattle && fromBattle) {
            wildBattle = null;
        }
        userData.set(userId, user);
        saveGameState();
        console.log(`User ${userId} successfully caught ${caughtPokemonName}`);
        return { success: true, pokemonName: caughtPokemonName };
    } else {
        user.inventory[ballType.toLowerCase()]--;
        userData.set(userId, user);
        saveGameState();
        console.log(`User ${userId} failed to catch ${wildPokemon ? wildPokemon.name : 'unknown Pokémon'} with ${ballType}`);
        return { success: false, pokemonName: wildPokemon ? wildPokemon.name : 'unknown Pokémon' };
    }
}

function useItem(userId, item, targetPokemon) {
    const user = userData.get(userId);
    if (!user || !user.inventory[item.toLowerCase()] || user.inventory[item.toLowerCase()] <= 0) return false;

    const itemData = shopItems[item.toLowerCase()];
    if (itemData.healAmount) {
        targetPokemon.currentHp = Math.min(targetPokemon.hp, targetPokemon.currentHp + itemData.healAmount);
        user.inventory[item.toLowerCase()]--;
        userData.set(userId, user);
        saveGameState();
        return true;
    } else if (itemData.cure) {
        if (targetPokemon.status === itemData.cure) {
            targetPokemon.status = 'none';
            targetPokemon.statusTurns = 0;
            user.inventory[item.toLowerCase()]--;
            userData.set(userId, user);
            saveGameState();
            return true;
        }
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

function handleStatusEffects(playerData, channel, isCurrentPlayer = true) {
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

    if (pokemon.currentHp === 0 && isCurrentPlayer) {
        const label = playerData.isBot ? `${pokemon.name} (bot)` : pokemon.name;
        channel.send(`${label} has fainted due to status effects! Player is eliminated!`);
        if (wildBattle && wildBattle.playerId === playerData.ownerId) {
            wildBattle = null;
            wildPokemon = null;
        } else {
            battle.players.delete(playerData.ownerId);
            battle.turnOrder = battle.turnOrder.filter(id => id !== playerData.ownerId);
        }
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
    if (alivePlayers <= 1 && battle.active) {
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

async function botPlayTurn(botId, botData, channel, isWild = false) {
    const botPokemon = botData.pokemon;
    const difficulty = botData.difficulty || 'normal';

    if (!handleStatusEffects(botData, channel, true)) {
        if (isWild && wildBattle) {
            wildBattle.currentTurn++;
            await announceBattleUpdate(channel);
        } else {
            battle.currentTurn++;
            await announceBattleUpdate(channel);
        }
        return;
    }

    let possibleTargets, move, targetId;

    if (isWild && wildBattle) {
        possibleTargets = [{ id: wildBattle.playerId, pokemon: wildBattle.playerPokemon, isBot: false }];
    } else {
        possibleTargets = Array.from(battle.players.entries())
            .filter(([id]) => id !== botId)
            .map(([id, data]) => ({ id, pokemon: data.pokemon, isBot: data.isBot }));
    }

    console.log(`Bot ${botId} (isWild: ${isWild}) possible targets:`, possibleTargets.map(t => t.id));

    if (possibleTargets.length === 0) {
        console.log(`No targets available for bot ${botId}`);
        if (isWild && wildBattle) wildBattle.currentTurn++;
        else battle.currentTurn++;
        await announceBattleUpdate(channel);
        return;
    }

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

    let targetData;
    if (isWild && wildBattle) {
        targetData = { pokemon: wildBattle.playerPokemon, isBot: false };
    } else {
        targetData = battle.players.get(targetId);
    }

    if (!targetData) {
        console.log(`Target ${targetId} not found for bot ${botId}`);
        if (isWild && wildBattle) wildBattle.currentTurn++;
        else battle.currentTurn++;
        await announceBattleUpdate(channel);
        return;
    }

    const damage = calculateDamage(botPokemon, targetData.pokemon, move, channel, botId);
    targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

    if (damage > 0) {
        const targetLabel = isWild ? `${targetData.pokemon.name} (your Pokémon)` : (targetData.isBot ? `${targetData.pokemon.name} (bot)` : `${targetData.pokemon.name} (opponent)`);
        await channel.send(`${botPokemon.name} (${isWild ? 'wild' : 'bot'}) used ${move} on ${targetLabel} for ${damage} damage!`);
    }

    handleStatusEffects(targetData, channel, false);

    if (targetData.pokemon.currentHp === 0) {
        if (isWild && wildBattle) {
            await channel.send(`The wild ${wildPokemon.name} has been defeated!`);
            const user = userData.get(wildBattle.playerId);
            user.coins += WILD_FIGHT_COIN_REWARD;
            user.party.forEach(pokemon => {
                pokemon.xp += WILD_FIGHT_XP_REWARD;
                levelUpPokemon(pokemon, channel);
            });
            userData.set(wildBattle.playerId, user);
            await channel.send(`<@${wildBattle.playerId}> earned ${WILD_FIGHT_COIN_REWARD} coins and ${WILD_FIGHT_XP_REWARD} XP for defeating the wild Pokémon!`);
            wildBattle = null;
            wildPokemon = null;
        } else {
            const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : `${targetData.pokemon.name} (opponent)`;
            await channel.send(`${targetLabel} has fainted! Player is eliminated!`);
            battle.players.delete(targetId);
            battle.turnOrder = battle.turnOrder.filter(id => id !== targetId);
            saveGameState();
        }
    }

    botData.lastAction = Date.now();
    if (isWild && wildBattle) wildBattle.currentTurn++;
    else battle.currentTurn++;
    await announceBattleUpdate(channel);

    if (!isWild && checkBattleEnd(channel)) {
        battle.players.clear();
        battle.turnOrder = [];
        battle.turnMessage = null;
        saveGameState();
    }
}

async function announceBattleUpdate(channel) {
    try {
        let embed = new EmbedBuilder()
            .setTitle('Pokémon Battle Royale')
            .setColor(battle.active ? '#ff4444' : (wildBattle ? '#ffaa00' : '#4444ff'))
            .setThumbnail('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png')
            .setFooter({ text: 'Pokémon Battle Royale - May the best trainer win!', iconURL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' })
            .setTimestamp();

        const actionButtons = [];
        if (!userData.get(channel.guild.members.cache.get(client.user.id)?.id)?.hasStarted && !battle.active && !wildBattle) {
            actionButtons.push(new ButtonBuilder()
                .setCustomId('start_adventure')
                .setLabel('Start Your Adventure')
                .setStyle(ButtonStyle.Success));
        } else if (!battle.active && !wildBattle && userData.has(channel.guild.members.cache.get(client.user.id)?.id)) {
            actionButtons.push(new ButtonBuilder()
                .setCustomId('join_battle')
                .setLabel('Join Battle')
                .setStyle(ButtonStyle.Primary));
            if (wildPokemon) {
                actionButtons.push(new ButtonBuilder()
                    .setCustomId('fight_wild')
                    .setLabel('Fight Wild')
                    .setStyle(ButtonStyle.Danger));
                actionButtons.push(new ButtonBuilder()
                    .setCustomId('catch_pokemon')
                    .setLabel('Catch')
                    .setStyle(ButtonStyle.Secondary));
            }
            actionButtons.push(new ButtonBuilder()
                .setCustomId('view_inventory')
                .setLabel('Inventory')
                .setStyle(ButtonStyle.Secondary));
        }

        const actionRow = new ActionRowBuilder().addComponents(actionButtons);

        if (battle.active) {
            const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
            embed.setDescription(`**Battle in Progress!** Current turn: <@${currentPlayerId}>`);
            embed.addFields({ name: 'Time Remaining', value: `${Math.max(0, Math.floor((TURN_TIMEOUT - (Date.now() - (battle.players.get(currentPlayerId)?.lastAction || battle.battleStartTime)) / 1000))} seconds`, inline: true });
        } else if (wildBattle) {
            const currentPlayerId = wildBattle.currentTurn % 2 === 0 ? wildBattle.playerId : 'wild';
            embed.setDescription(`**Wild Pokémon Battle!** Current turn: ${currentPlayerId === 'wild' ? 'Wild Pokémon' : `<@${currentPlayerId}>`} vs. Wild ${wildPokemon.name}`);
            embed.addFields({ name: 'Time Remaining', value: `${Math.max(0, Math.floor((TURN_TIMEOUT - (Date.now() - wildBattle.lastAction)) / 1000))} seconds`, inline: true });
        } else {
            embed.setDescription('**Waiting for players to join or start...**');
        }

        const fields = [];
        if (battle.active) {
            for (const [userId, data] of battle.players.entries()) {
                const isCurrentPlayer = userId === battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
                let pokemonLabel = data.isBot ? `${data.pokemon.name} (Bot)` : (isCurrentPlayer ? data.pokemon.name : `${data.pokemon.name} (Opponent)`);
                const statusText = data.pokemon.status !== 'none' ? ` - ${data.pokemon.status}` : '';
                fields.push({
                    name: pokemonLabel,
                    value: `HP: ${data.pokemon.currentHp}/${data.pokemon.hp} | Level: ${data.pokemon.level}${statusText}`,
                    inline: true
                });
            }
        } else if (wildBattle) {
            fields.push({
                name: wildBattle.playerPokemon.name,
                value: `HP: ${wildBattle.playerPokemon.currentHp}/${wildBattle.playerPokemon.hp} | Level: ${wildBattle.playerPokemon.level}`,
                inline: true
            });
            const shinyText = wildPokemon.shiny ? ' ★ (Shiny)' : '';
            fields.push({
                name: `Wild ${wildPokemon.name}${shinyText}`,
                value: `HP: ${wildPokemon.currentHp}/${wildPokemon.hp} | Level: ${wildPokemon.level}`,
                inline: true
            });
        }
        embed.addFields(fields);

        if (!wildBattle && wildPokemon) {
            const shinyText = wildPokemon.shiny ? ' ★ (Shiny)' : '';
            embed.addFields({
                name: 'Wild Pokémon',
                value: `A wild ${wildPokemon.name} (Level ${wildPokemon.level}${shinyText}) has appeared!`,
                inline: false
            });
        }

        if (battle.turnMessage) {
            await battle.turnMessage.delete().catch(() => {});
            battle.turnMessage = null;
        }

        let currentPlayerId, playerData;
        if (battle.active) {
            currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
            playerData = battle.players.get(currentPlayerId);
        } else if (wildBattle) {
            currentPlayerId = wildBattle.currentTurn % 2 === 0 ? wildBattle.playerId : 'wild';
            playerData = wildBattle.currentTurn % 2 === 0 ? { pokemon: wildBattle.playerPokemon, ownerId: wildBattle.playerId, isBot: false, lastAction: wildBattle.lastAction } : { pokemon: wildPokemon, ownerId: 'wild', isBot: true, lastAction: wildBattle.lastAction };
        }

        if ((battle.active || wildBattle) && playerData && !playerData.isBot) {
            const fightButton = new ButtonBuilder()
                .setCustomId(`fight_${currentPlayerId}`)
                .setLabel('Fight')
                .setStyle(ButtonStyle.Primary);

            const fleeButton = new ButtonBuilder()
                .setCustomId(`flee_${currentPlayerId}`)
                .setLabel('Flee')
                .setStyle(ButtonStyle.Danger);

            const itemButton = new ButtonBuilder()
                .setCustomId(`item_${currentPlayerId}`)
                .setLabel('Use Item')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(fightButton, fleeButton, itemButton);

            battle.turnMessage = await channel.send({ embeds: [embed], components: [row] });
        } else {
            battle.turnMessage = await channel.send({ embeds: [embed], components: [actionRow] });
        }
    } catch (error) {
        console.error('Error in announceBattleUpdate:', error.message);
    }
}

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
                        { name: 'Bulbasaur (Gen 1)', value: 'Bulbasaur' },
                        { name: 'Charmander (Gen 1)', value: 'Charmander' },
                        { name: 'Squirtle (Gen 1)', value: 'Squirtle' },
                        { name: 'Chikorita (Gen 2)', value: 'Chikorita' },
                        { name: 'Cyndaquil (Gen 2)', value: 'Cyndaquil' },
                        { name: 'Totodile (Gen 2)', value: 'Totodile' },
                        { name: 'Treecko (Gen 3)', value: 'Treecko' },
                        { name: 'Torchic (Gen 3)', value: 'Torchic' },
                        { name: 'Mudkip (Gen 3)', value: 'Mudkip' },
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
                        { name: 'Ultra Ball', value: 'ultraball' },
                        { name: 'Potion', value: 'potion' },
                        { name: 'Super Potion', value: 'superpotion' },
                        { name: 'Hyper Potion', value: 'hyperpotion' },
                        { name: 'Antidote', value: 'antidote' },
                        { name: 'Burn Heal', value: 'burnheal' },
                        { name: 'Paralyze Heal', value: 'paralyzheal' },
                        { name: 'Awake Powder', value: 'awakepowder' }
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
            ),
        new SlashCommandBuilder()
            .setName('fightwild')
            .setDescription('Engage in a 1v1 battle with the wild Pokémon')
            .addStringOption(option =>
                option.setName('pokemon')
                    .setDescription('Select your Pokémon for the battle')
                    .setRequired(true)
                    .setAutocomplete(true)
            ),
        new SlashCommandBuilder()
            .setName('searchwild')
            .setDescription('Manually search for a wild Pokémon'),
        new SlashCommandBuilder()
            .setName('use')
            .setDescription('Use an item from your inventory')
            .addStringOption(option =>
                option.setName('item')
                    .setDescription('Item to use')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Potion', value: 'potion' },
                        { name: 'Super Potion', value: 'superpotion' },
                        { name: 'Hyper Potion', value: 'hyperpotion' },
                        { name: 'Antidote', value: 'antidote' },
                        { name: 'Burn Heal', value: 'burnheal' },
                        { name: 'Paralyze Heal', value: 'paralyzheal' },
                        { name: 'Awake Powder', value: 'awakepowder' }
                    )
            )
            .addStringOption(option =>
                option.setName('target')
                    .setDescription('Target Pokémon (from party)')
                    .setRequired(true)
                    .setAutocomplete(true)
            ),
        new SlashCommandBuilder()
            .setName('heal')
            .setDescription('Heal a Pokémon using an item from your inventory')
            .addStringOption(option =>
                option.setName('item')
                    .setDescription('Healing item to use')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Potion', value: 'potion' },
                        { name: 'Super Potion', value: 'superpotion' },
                        { name: 'Hyper Potion', value: 'hyperpotion' }
                    )
            )
            .addStringOption(option =>
                option.setName('target')
                    .setDescription('Target Pokémon (from party)')
                    .setRequired(true)
                    .setAutocomplete(true)
            ),
        new SlashCommandBuilder()
            .setName('release')
            .setDescription('Release a Pokémon from your party or PC')
            .addStringOption(option =>
                option.setName('pokemon')
                    .setDescription('Pokémon to release')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option.setName('location')
                    .setDescription('Location of the Pokémon')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Party', value: 'party' },
                        { name: 'PC', value: 'pc' }
                    )
            ),
        new SlashCommandBuilder()
            .setName('trade')
            .setDescription('Trade a Pokémon with another player (under development)')
            .addStringOption(option =>
                option.setName('pokemon')
                    .setDescription('Your Pokémon to trade')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addUserOption(option =>
                option.setName('target')
                    .setDescription('Player to trade with')
                    .setRequired(true)
            )
    ].map(command => command.toJSON());

    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands })
        .then(() => console.log('Commands registered'))
        .catch(error => console.error('Error registering commands:', error));

    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID).catch(error => {
        console.error('Error fetching battle channel:', error);
        return null;
    });
    
    if (channel) {
        await announceBattleUpdate(channel);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        const userId = interaction.user.id;

        if (focusedOption.name === 'pokemon' || focusedOption.name === 'target') {
            const user = userData.get(userId) || { party: [], pc: [] };
            const pokemonList = [...user.party, ...user.pc].map(p => ({
                name: `${p.name} (Level ${p.level}${p.shiny ? ' ★' : ''})`,
                value: p.name
            }));
            await interaction.respond(pokemonList.slice(0, 25));
        }
        return;
    }

    if (interaction.isButton()) {
        const [action, userId] = interaction.customId.split('_');
        const channel = await client.channels.fetch(BATTLE_CHANNEL_ID).catch(error => {
            console.error('Error fetching channel:', error);
            return null;
        });

        if (!channel) {
            await interaction.reply({ content: 'Error: Could not access battle channel!', ephemeral: true });
            return;
        }

        if (!battle.active && !wildBattle && action !== 'start_adventure' && action !== 'select_starter' && action !== 'join_battle' && action !== 'fight_wild' && action !== 'catch_pokemon' && action !== 'view_inventory') {
            await interaction.reply({ content: 'No battle or action is active right now!', ephemeral: true });
            return;
        }

        let isValidTurn = false;
        let currentPlayerId, playerData;
        if (battle.active) {
            currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
            isValidTurn = currentPlayerId === userId;
            playerData = battle.players.get(userId);
        } else if (wildBattle) {
            currentPlayerId = wildBattle.currentTurn % 2 === 0 ? wildBattle.playerId : 'wild';
            isValidTurn = currentPlayerId === userId;
            playerData = wildBattle.currentTurn % 2 === 0 ? { pokemon: wildBattle.playerPokemon, ownerId: wildBattle.playerId, isBot: false, lastAction: wildBattle.lastAction } : null;
        }

        if (userId !== interaction.user.id && action !== 'start_adventure' && action !== 'select_starter') {
            await interaction.reply({ content: 'This action is not for you!', ephemeral: true });
            return;
        }

        if (action === 'start_adventure') {
            if (userData.has(userId)) {
                await interaction.reply({ content: 'You have already started your adventure!', ephemeral: true });
                return;
            }

            const starterButtons = starterPokemon.map((starter, index) => {
                return new ButtonBuilder()
                    .setCustomId(`select_starter_${userId}_${starter.name}_${index}`)
                    .setLabel(starter.name)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌱');
            });

            const rows = [];
            for (let i = 0; i < starterButtons.length; i += 3) {
                const row = new ActionRowBuilder().addComponents(starterButtons.slice(i, i + 3));
                rows.push(row);
            }

            await interaction.update({ content: 'Choose your starter Pokémon:', embeds: [], components: rows });
            return;
        }

        if (action === 'select_starter') {
            const [, , starterName] = interaction.customId.split('_');
            const starter = getPokemonByName(starterName);
            if (!starter) {
                await interaction.reply({ content: 'Invalid starter Pokémon!', ephemeral: true });
                return;
            }

            userData.set(userId, {
                hasStarted: true,
                coins: 1000,
                party: [starter],
                pc: [],
                inventory: { pokeball: 5, greatball: 0, ultraball: 0, potion: 2, superpotion: 0, hyperpotion: 0, antidote: 1, burnheal: 1, paralyzheal: 1, awakepowder: 1 }
            });
            saveGameState();
            await interaction.update({
                content: `Welcome to your Pokémon adventure, <@${userId}>! You received ${starter.name} (Level ${starter.level})!`,
                embeds: [],
                components: []
            });
            await announceBattleUpdate(channel);
            return;
        }

        if (action === 'join_battle') {
            const user = userData.get(userId);
            if (!user || user.party.length === 0) {
                await interaction.reply({ content: 'You need to start your adventure and have a Pokémon in your party!', ephemeral: true });
                return;
            }

            if (battle.players.has(userId)) {
                await interaction.reply({ content: 'You are already in the battle!', ephemeral: true });
                return;
            }

            if (battle.players.size >= MAX_PLAYERS) {
                await interaction.reply({ content: 'The battle is full! Maximum players reached.', ephemeral: true });
                return;
            }

            const pokemonSelect = new ModalBuilder()
                .setCustomId(`join_battle_modal_${userId}`)
                .setTitle('Select Pokémon to Join Battle');

            const pokemonInput = new TextInputBuilder()
                .setCustomId('pokemon_name')
                .setLabel('Choose your Pokémon')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(pokemonInput);
            pokemonSelect.addComponents(firstActionRow);

            await interaction.showModal(pokemonSelect);
            return;
        }

        if (interaction.customId.startsWith('join_battle_modal_')) {
            const pokemonName = interaction.fields.getTextInputValue('pokemon_name');
            const user = userData.get(userId);
            const pokemon = [...user.party, ...user.pc].find(p => p.name === pokemonName);
            if (!pokemon) {
                await interaction.reply({ content: 'Invalid Pokémon! Use autocomplete to select from your party or PC.', ephemeral: true });
                return;
            }

            battle.players.set(userId, { pokemon: { ...pokemon }, ownerId: userId, isBot: false, lastAction: null });
            battle.turnOrder.push(userId);
            user.coins += BATTLE_COIN_REWARD;
            await interaction.reply({ content: `<@${userId}> joined the battle with ${pokemon.name}! Earned ${BATTLE_COIN_REWARD} coins for joining!`, ephemeral: false });
            saveGameState();
            await announceBattleUpdate(channel);
            return;
        }

        if (action === 'fight_wild') {
            if (!wildPokemon) {
                await interaction.reply({ content: 'No wild Pokémon is currently spawned!', ephemeral: true });
                return;
            }

            if (wildBattle) {
                await interaction.reply({ content: 'A wild Pokémon battle is already in progress!', ephemeral: true });
                return;
            }

            const user = userData.get(userId);
            const pokemonSelect = new ModalBuilder()
                .setCustomId(`fight_wild_modal_${userId}`)
                .setTitle('Select Pokémon to Fight Wild');

            const pokemonInput = new TextInputBuilder()
                .setCustomId('pokemon_name')
                .setLabel('Choose your Pokémon')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(pokemonInput);
            pokemonSelect.addComponents(firstActionRow);

            await interaction.showModal(pokemonSelect);
            return;
        }

        if (interaction.customId.startsWith('fight_wild_modal_')) {
            const pokemonName = interaction.fields.getTextInputValue('pokemon_name');
            const user = userData.get(userId);
            const pokemon = [...user.party, ...user.pc].find(p => p.name === pokemonName);
            if (!pokemon) {
                await interaction.reply({ content: 'Invalid Pokémon! Use autocomplete to select from your party or PC.', ephemeral: true });
                return;
            }

            wildBattle = {
                playerId: userId,
                playerPokemon: { ...pokemon },
                botId: `wild_${Date.now()}`,
                currentTurn: 0,
                lastAction: Date.now()
            };

            await interaction.reply({ content: `<@${userId}> engaged in a battle with wild ${wildPokemon.name}!`, ephemeral: false });
            await announceBattleUpdate(channel);

            const interval = setInterval(async () => {
                if (!wildBattle) {
                    clearInterval(interval);
                    return;
                }

                const currentPlayerId = wildBattle.currentTurn % 2 === 0 ? wildBattle.playerId : wildBattle.botId;
                const playerData = currentPlayerId === wildBattle.playerId
                    ? { pokemon: wildBattle.playerPokemon, ownerId: wildBattle.playerId, isBot: false, lastAction: wildBattle.lastAction }
                    : { pokemon: wildPokemon, ownerId: wildBattle.botId, isBot: true, difficulty: 'normal', lastAction: wildBattle.lastAction };

                if (playerData.isBot) {
                    await botPlayTurn(wildBattle.botId, playerData, channel, true);
                } else if (Date.now() - playerData.lastAction > TURN_TIMEOUT) {
                    await channel.send(`<@${currentPlayerId}> ran out of time! Wild Pokémon takes its turn...`);
                    await botPlayTurn(wildBattle.botId, { pokemon: wildPokemon, ownerId: wildBattle.botId, isBot: true, difficulty: 'normal', lastAction: wildBattle.lastAction }, channel, true);
                }

                if (!wildPokemon || !wildBattle.playerPokemon || wildBattle.playerPokemon.currentHp === 0 || wildPokemon.currentHp === 0) {
                    clearInterval(interval);
                    if (wildPokemon && wildPokemon.currentHp === 0) {
                        const user = userData.get(wildBattle.playerId);
                        user.coins += WILD_FIGHT_COIN_REWARD;
                        user.party.forEach(pokemon => {
                            pokemon.xp += WILD_FIGHT_XP_REWARD;
                            levelUpPokemon(pokemon, channel);
                        });
                        userData.set(wildBattle.playerId, user);
                        await channel.send(`<@${wildBattle.playerId}> earned ${WILD_FIGHT_COIN_REWARD} coins and ${WILD_FIGHT_XP_REWARD} XP for defeating the wild Pokémon!`);
                    } else if (wildPokemon && wildBattle.playerPokemon.currentHp === 0) {
                        await channel.send(`Your ${wildBattle.playerPokemon.name} has fainted! Wild ${wildPokemon.name} remains!`);
                        wildBattle = null;
                    }
                    wildPokemon = null;
                    await announceBattleUpdate(channel);
                }
            }, 5000);
            return;
        }

        if (action === 'catch_pokemon') {
            if (!wildPokemon) {
                await interaction.reply({ content: 'No wild Pokémon is currently spawned!', ephemeral: true });
                return;
            }

            const ballSelect = new ModalBuilder()
                .setCustomId(`catch_modal_${userId}`)
                .setTitle('Select Ball to Catch');

            const ballInput = new TextInputBuilder()
                .setCustomId('ball_type')
                .setLabel('Choose your ball')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(ballInput);
            ballSelect.addComponents(firstActionRow);

            await interaction.showModal(ballSelect);
            return
          }

        if (interaction.customId.startsWith('catch_modal_')) {
            const ballType = interaction.fields.getTextInputValue('ball_type');
            const result = attemptCatch(userId, ballType);
            if (result.success) {
                await interaction.reply({ content: `<@${userId}> caught the wild ${result.pokemonName}!`, ephemeral: false });
            } else {
                await interaction.reply({ content: `<@${userId}> failed to catch the wild ${result.pokemonName}! The ball was lost.`, ephemeral: false });
            }
            await announceBattleUpdate(channel);
            return;
        }

        if (action === 'view_inventory') {
            const user = userData.get(userId);
            if (!user) {
                await interaction.reply({ content: 'You need to start your adventure first!', ephemeral: true });
                return;
            }
            const inventoryList = Object.entries(user.inventory)
                .filter(([_, count]) => count > 0)
                .map(([item, count]) => `${item}: ${count}`)
                .join('\n') || 'Your inventory is empty!';
            await interaction.reply({ content: `Your inventory:\n${inventoryList}`, ephemeral: true });
            return;
        }

        if (!isValidTurn) {
            await interaction.reply({ content: 'It’s not your turn!', ephemeral: true });
            return;
        }

        if (!playerData) {
            await interaction.reply({ content: 'You are not in this battle!', ephemeral: true });
            return;
        }

        if (action === 'fight') {
            if (!handleStatusEffects(playerData, channel)) {
                if (wildBattle) wildBattle.currentTurn++;
                else battle.currentTurn++;
                await announceBattleUpdate(channel);
                return;
            }

            const moveSelect = new ModalBuilder()
                .setCustomId(`move_select_${userId}`)
                .setTitle('Select Move');

            const moveInput = new TextInputBuilder()
                .setCustomId('move_name')
                .setLabel('Choose your move')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const targetInput = new TextInputBuilder()
                .setCustomId('target_id')
                .setLabel('Target Player ID (or "wild" for wild battle)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstRow = new ActionRowBuilder().addComponents(moveInput);
            const secondRow = new ActionRowBuilder().addComponents(targetInput);
            moveSelect.addComponents(firstRow, secondRow);

            await interaction.showModal(moveSelect);
            return;
        }

        if (interaction.customId.startsWith('move_select_')) {
            const move = interaction.fields.getTextInputValue('move_name');
            const targetIdInput = interaction.fields.getTextInputValue('target_id');
            let targetId = targetIdInput === 'wild' && wildBattle ? wildBattle.botId : targetIdInput;

            if (!playerData.pokemon.moves.includes(move)) {
                await interaction.reply({ content: 'Invalid move!', ephemeral: true });
                return;
            }

            let targetData;
            if (wildBattle && targetId === wildBattle.botId) {
                targetData = { pokemon: wildPokemon, isBot: true };
            } else if (battle.active) {
                targetData = battle.players.get(targetId);
            }

            if (!targetData || targetData.pokemon.currentHp === 0) {
                await interaction.reply({ content: 'Invalid or defeated target!', ephemeral: true });
                return;
            }

            const damage = calculateDamage(playerData.pokemon, targetData.pokemon, move, channel, userId);
            targetData.pokemon.currentHp = Math.max(0, targetData.pokemon.currentHp - damage);

            if (damage > 0) {
                const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (${wildBattle ? 'wild' : 'bot'})` : `${targetData.pokemon.name} (opponent)`;
                await channel.send(`<@${userId}>'s ${playerData.pokemon.name} used ${move} on ${targetLabel} for ${damage} damage!`);
            }

            handleStatusEffects(targetData, channel, false);

            if (targetData.pokemon.currentHp === 0) {
                if (wildBattle) {
                    await channel.send(`The wild ${wildPokemon.name} has been defeated!`);
                    const user = userData.get(wildBattle.playerId);
                    user.coins += WILD_FIGHT_COIN_REWARD;
                    user.party.forEach(pokemon => {
                        pokemon.xp += WILD_FIGHT_XP_REWARD;
                        levelUpPokemon(pokemon, channel);
                    });
                    userData.set(wildBattle.playerId, user);
                    await channel.send(`<@${wildBattle.playerId}> earned ${WILD_FIGHT_COIN_REWARD} coins and ${WILD_FIGHT_XP_REWARD} XP!`);
                    wildBattle = null;
                    wildPokemon = null;
                } else {
                    const targetLabel = targetData.isBot ? `${targetData.pokemon.name} (bot)` : `${targetData.pokemon.name} (opponent)`;
                    await channel.send(`${targetLabel} has fainted! Player is eliminated!`);
                    battle.players.delete(targetId);
                    battle.turnOrder = battle.turnOrder.filter(id => id !== targetId);
                }
                saveGameState();
            }

            playerData.lastAction = Date.now();
            if (wildBattle) wildBattle.currentTurn++;
            else battle.currentTurn++;
            await interaction.reply({ content: 'Move executed!', ephemeral: true });
            await announceBattleUpdate(channel);

            if (battle.active && checkBattleEnd(channel)) return;
            return;
        }

        if (action === 'flee') {
            if (wildBattle) {
                wildBattle = null;
                await channel.send(`<@${userId}> fled from the wild ${wildPokemon.name}!`);
                await interaction.reply({ content: 'You fled successfully!', ephemeral: true });
            } else {
                battle.players.delete(userId);
                battle.turnOrder = battle.turnOrder.filter(id => id !== userId);
                await channel.send(`<@${userId}> has fled the battle!`);
                await interaction.reply({ content: 'You fled the battle!', ephemeral: true });
                saveGameState();
                if (checkBattleEnd(channel)) return;
            }
            battle.currentTurn++;
            await announceBattleUpdate(channel);
            return;
        }

        if (action === 'item') {
            const itemSelect = new ModalBuilder()
                .setCustomId(`item_select_${userId}`)
                .setTitle('Use Item');

            const itemInput = new TextInputBuilder()
                .setCustomId('item_name')
                .setLabel('Choose your item')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const targetInput = new TextInputBuilder()
                .setCustomId('target_pokemon')
                .setLabel('Target Pokémon Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstRow = new ActionRowBuilder().addComponents(itemInput);
            const secondRow = new ActionRowBuilder().addComponents(targetInput);
            itemSelect.addComponents(firstRow, secondRow);

            await interaction.showModal(itemSelect);
            return;
        }

        if (interaction.customId.startsWith('item_select_')) {
            const item = interaction.fields.getTextInputValue('item_name');
            const targetPokemonName = interaction.fields.getTextInputValue('target_pokemon');
            const user = userData.get(userId);
            const targetPokemon = user.party.find(p => p.name === targetPokemonName) || user.pc.find(p => p.name === targetPokemonName);

            if (!targetPokemon) {
                await interaction.reply({ content: 'Invalid target Pokémon!', ephemeral: true });
                return;
            }

            if (useItem(userId, item, targetPokemon)) {
                await channel.send(`<@${userId}> used ${item} on ${targetPokemon.name}!`);
                playerData.lastAction = Date.now();
                if (wildBattle) wildBattle.currentTurn++;
                else battle.currentTurn++;
                await interaction.reply({ content: 'Item used successfully!', ephemeral: true });
                await announceBattleUpdate(channel);
            } else {
                await interaction.reply({ content: 'Failed to use item! Check your inventory or target.', ephemeral: true });
            }
            return;
        }
    }

    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID).catch(error => {
        console.error('Error fetching channel:', error);
        return null;
    });

    if (!channel) {
        await interaction.reply({ content: 'Error: Could not access battle channel!', ephemeral: true });
        return;
    }

    if (commandName === 'startadventure') {
        const starterName = interaction.options.getString('starter');
        if (userData.has(interaction.user.id)) {
            await interaction.reply({ content: 'You have already started your adventure!', ephemeral: true });
            return;
        }

        const starter = getPokemonByName(starterName);
        userData.set(interaction.user.id, {
            hasStarted: true,
            coins: 1000,
            party: [starter],
            pc: [],
            inventory: { pokeball: 5, greatball: 0, ultraball: 0, potion: 2, superpotion: 0, hyperpotion: 0, antidote: 1, burnheal: 1, paralyzheal: 1, awakepowder: 1 }
        });
        saveGameState();
        await interaction.reply({ content: `Welcome to your Pokémon adventure! You received ${starterName} (Level ${starter.level})!`, ephemeral: false });
        await announceBattleUpdate(channel);
    } else if (commandName === 'joinbattle') {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'player') {
            const pokemonName = interaction.options.getString('pokemon');
            const user = userData.get(interaction.user.id);
            if (!user || user.party.length === 0) {
                await interaction.reply({ content: 'You need to start your adventure and have a Pokémon in your party!', ephemeral: true });
                return;
            }

            const pokemon = [...user.party, ...user.pc].find(p => p.name === pokemonName);
            if (!pokemon) {
                await interaction.reply({ content: 'Invalid Pokémon! Use autocomplete to select from your party or PC.', ephemeral: true });
                return;
            }

            if (battle.players.size >= MAX_PLAYERS) {
                await interaction.reply({ content: 'The battle is full! Maximum players reached.', ephemeral: true });
                return;
            }

            battle.players.set(interaction.user.id, { pokemon: { ...pokemon }, ownerId: interaction.user.id, isBot: false, lastAction: null });
            battle.turnOrder.push(interaction.user.id);
            user.coins += BATTLE_COIN_REWARD;
            userData.set(interaction.user.id, user);
            await interaction.reply({ content: `You joined the battle with ${pokemonName}! Earned ${BATTLE_COIN_REWARD} coins for joining!`, ephemeral: false });
            saveGameState();
            await announceBattleUpdate(channel);
        } else if (subcommand === 'bot') {
            const quantity = interaction.options.getInteger('quantity');
            const difficulty = interaction.options.getString('difficulty');
            if (battle.players.size + quantity > MAX_PLAYERS) {
                await interaction.reply({ content: `Cannot add ${quantity} bots. Only ${MAX_PLAYERS - battle.players.size} slots remain!`, ephemeral: true });
                return;
            }

            for (let i = 0; i < quantity; i++) {
                const botId = `bot_${Date.now()}_${i}`;
                const botPokemon = getRandomPokemon(Math.floor(Math.random() * 5) + 1);
                battle.players.set(botId, { pokemon: botPokemon, ownerId: botId, isBot: true, difficulty: difficulty, lastAction: null });
                battle.turnOrder.push(botId);
            }
            await interaction.reply({ content: `Added ${quantity} ${difficulty} bot(s) to the battle!`, ephemeral: false });
            saveGameState();
            await announceBattleUpdate(channel);
        }
    } else if (commandName === 'battle_status') {
        await announceBattleUpdate(channel);
        await interaction.reply({ content: 'Battle status updated!', ephemeral: true });
    } else if (commandName === 'startbattle') {
        if (battle.players.size < 2) {
            await interaction.reply({ content: 'Need at least 2 players to start the battle!', ephemeral: true });
            return;
        }
        if (battle.active) {
            await interaction.reply({ content: 'Battle is already active!', ephemeral: true });
            return;
        }

        battle.active = true;
        battle.battleStartTime = Date.now();
        await interaction.reply({ content: 'Battle Royale has started!', ephemeral: false });
        await announceBattleUpdate(channel);

        const interval = setInterval(async () => {
            if (!battle.active) {
                clearInterval(interval);
                return;
            }

            const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
            const playerData = battle.players.get(currentPlayerId);

            if (!playerData) {
                battle.currentTurn++;
                await announceBattleUpdate(channel);
                return;
            }

            if (playerData.isBot) {
                await botPlayTurn(currentPlayerId, playerData, channel);
            } else if (Date.now() - (playerData.lastAction || battle.battleStartTime) > TURN_TIMEOUT) {
                await channel.send(`<@${currentPlayerId}> ran out of time and was removed from the battle!`);
                battle.players.delete(currentPlayerId);
                battle.turnOrder = battle.turnOrder.filter(id => id !== currentPlayerId);
                battle.currentTurn++;
                saveGameState();
                await announceBattleUpdate(channel);
                if (checkBattleEnd(channel)) clearInterval(interval);
            }
        }, 5000);
    } else if (commandName === 'shop') {
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const user = userData.get(interaction.user.id);
        if (!user) {
            await interaction.reply({ content: 'You need to start your adventure first!', ephemeral: true });
            return;
        }

        const totalCost = shopItems[item].price * quantity;
        if (user.coins < totalCost) {
            await interaction.reply({ content: `You need ${totalCost} coins to buy ${quantity} ${item}(s), but you only have ${user.coins}!`, ephemeral: true });
            return;
        }

        user.coins -= totalCost;
        user.inventory[item] = (user.inventory[item] || 0) + quantity;
        userData.set(interaction.user.id, user);
        saveGameState();
        await interaction.reply({ content: `You bought ${quantity} ${item}(s) for ${totalCost} coins!`, ephemeral: true });
    } else if (commandName === 'bal') {
        const user = userData.get(interaction.user.id);
        if (!user) {
            await interaction.reply({ content: 'You need to start your adventure first!', ephemeral: true });
            return;
        }
        await interaction.reply({ content: `You have ${user.coins} coins!`, ephemeral: true });
    } else if (commandName === 'inventory') {
        const user = userData.get(interaction.user.id);
        if (!user) {
            await interaction.reply({ content: 'You need to start your adventure first!', ephemeral: true });
            return;
        }
        const inventoryList = Object.entries(user.inventory)
            .filter(([_, count]) => count > 0)
            .map(([item, count]) => `${item}: ${count}`)
            .join('\n') || 'Your inventory is empty!';
        await interaction.reply({ content: `Your inventory:\n${inventoryList}`, ephemeral: true });
    } else if (commandName === 'catch') {
        const ballType = interaction.options.getString('ball');
        if (!wildPokemon) {
            await interaction.reply({ content: 'No wild Pokémon is currently spawned!', ephemeral: true });
            return;
        }
        const result = attemptCatch(interaction.user.id, ballType);
        if (result.success) {
            await interaction.reply({ content: `You caught the wild ${result.pokemonName}!`, ephemeral: false });
        } else {
            await interaction.reply({ content: `You failed to catch the wild ${result.pokemonName}! The ball was lost.`, ephemeral: false });
        }
        await announceBattleUpdate(channel);
    } else if (commandName === 'fightwild') {
        const pokemonName = interaction.options.getString('pokemon');
        if (!wildPokemon) {
            await interaction.reply({ content: 'No wild Pokémon is currently spawned!', ephemeral: true });
            return;
        }
        if (wildBattle) {
            await interaction.reply({ content: 'A wild Pokémon battle is already in progress!', ephemeral: true });
            return;
        }

        const user = userData.get(interaction.user.id);
        const pokemon = [...user.party, ...user.pc].find(p => p.name === pokemonName);
        if (!pokemon) {
            await interaction.reply({ content: 'Invalid Pokémon! Use autocomplete to select from your party or PC.', ephemeral: true });
            return;
        }

        wildBattle = {
            playerId: interaction.user.id,
            playerPokemon: { ...pokemon },
            botId: `wild_${Date.now()}`,
            currentTurn: 0,
            lastAction: Date.now()
        };
        await interaction.reply({ content: `You engaged in a battle with wild ${wildPokemon.name}!`, ephemeral: false });
        await announceBattleUpdate(channel);

        const interval = setInterval(async () => {
            if (!wildBattle) {
                clearInterval(interval);
                return;
            }

            const currentPlayerId = wildBattle.currentTurn % 2 === 0 ? wildBattle.playerId : wildBattle.botId;
            const playerData = currentPlayerId === wildBattle.playerId
                ? { pokemon: wildBattle.playerPokemon, ownerId: wildBattle.playerId, isBot: false, lastAction: wildBattle.lastAction }
                : { pokemon: wildPokemon, ownerId: wildBattle.botId, isBot: true, difficulty: 'normal', lastAction: wildBattle.lastAction };

            if (playerData.isBot) {
                await botPlayTurn(wildBattle.botId, playerData, channel, true);
            } else if (Date.now() - playerData.lastAction > TURN_TIMEOUT) {
                await channel.send(`<@${currentPlayerId}> ran out of time! Wild Pokémon takes its turn...`);
                await botPlayTurn(wildBattle.botId, { pokemon: wildPokemon, ownerId: wildBattle.botId, isBot: true, difficulty: 'normal', lastAction: wildBattle.lastAction }, channel, true);
            }

            if (!wildPokemon || !wildBattle.playerPokemon || wildBattle.playerPokemon.currentHp === 0 || wildPokemon.currentHp === 0) {
                clearInterval(interval);
                wildPokemon = null;
                await announceBattleUpdate(channel);
            }
        }, 5000);
    } else if (commandName === 'searchwild') {
        if (spawnWildPokemon()) {
            await interaction.reply({ content: `A wild ${wildPokemon.name} (Level ${wildPokemon.level}${wildPokemon.shiny ? ' ★ (Shiny)' : ''}) has appeared!`, ephemeral: false });
            await announceBattleUpdate(channel);
        } else {
            await interaction.reply({ content: 'No wild Pokémon appeared this time. Try again later!', ephemeral: true });
        }
    } else if (commandName === 'use' || commandName === 'heal') {
        const item = interaction.options.getString('item');
        const targetPokemonName = interaction.options.getString('target');
        const user = userData.get(interaction.user.id);
        if (!user) {
            await interaction.reply({ content: 'You need to start your adventure first!', ephemeral: true });
            return;
        }

        const targetPokemon = user.party.find(p => p.name === targetPokemonName) || user.pc.find(p => p.name === targetPokemonName);
        if (!targetPokemon) {
            await interaction.reply({ content: 'Invalid target Pokémon!', ephemeral: true });
            return;
        }

        if (useItem(interaction.user.id, item, targetPokemon)) {
            await interaction.reply({ content: `Used ${item} on ${targetPokemonName}!`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'Failed to use item! Check your inventory or target.', ephemeral: true });
        }
    } else if (commandName === 'release') {
        const pokemonName = interaction.options.getString('pokemon');
        const location = interaction.options.getString('location');
        const user = userData.get(interaction.user.id);
        if (!user) {
            await interaction.reply({ content: 'You need to start your adventure first!', ephemeral: true });
            return;
        }

        const targetArray = location === 'party' ? user.party : user.pc;
        const index = targetArray.findIndex(p => p.name === pokemonName);
        if (index === -1) {
            await interaction.reply({ content: 'Pokémon not found in the specified location!', ephemeral: true });
            return;
        }

        if (location === 'party' && user.party.length <= 1) {
            await interaction.reply({ content: 'You cannot release your last party Pokémon!', ephemeral: true });
            return;
        }

        targetArray.splice(index, 1);
        userData.set(interaction.user.id, user);
        saveGameState();
        await interaction.reply({ content: `Released ${pokemonName} from your ${location}!`, ephemeral: true });
    } else if (commandName === 'trade') {
        await interaction.reply({ content: 'Trading is under development and not yet available!', ephemeral: true });
    }
});

setInterval(() => {
    client.channels.fetch(BATTLE_CHANNEL_ID).then(channel => {
        if (!battle.active && !wildBattle && spawnWildPokemon()) {
            const shinyText = wildPokemon.shiny ? ' ★ (Shiny)' : '';
            channel.send(`A wild ${wildPokemon.name} (Level ${wildPokemon.level}${shinyText}) has appeared!`);
            announceBattleUpdate(channel);
        }
    }).catch(error => console.error('Error in wild spawn interval:', error));
}, 60000);

client.login(process.env.DISCORD_TOKEN).catch(error => console.error('Error logging in:', error));
