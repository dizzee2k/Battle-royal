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

const pokemonData = [
    { name: 'Bulbasaur', hp: 45, attack: 49, defense: 49, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip', 'Razor Leaf', 'Poison Powder'], evolvesTo: 'Ivysaur', evolveLevel: 16 },
    { name: 'Ivysaur', hp: 60, attack: 62, defense: 63, type: ['Grass', 'Poison'], moves: ['Tackle', 'Vine Whip', 'Razor Leaf', 'Sleep Powder'], evolvesTo: 'Venusaur', evolveLevel: 32 },
    { name: 'Venusaur', hp: 80, attack: 82, defense: 83, type: ['Grass', 'Poison'], moves: ['Petal Dance', 'Vine Whip', 'Razor Leaf', 'Toxic'] },
    { name: 'Charmander', hp: 39, attack: 52, defense: 43, type: ['Fire'], moves: ['Scratch', 'Ember', 'Flamethrower', 'Dragon Rage'], evolvesTo: 'Charmeleon', evolveLevel: 16 },
    { name: 'Charmeleon', hp: 58, attack: 64, defense: 58, type: ['Fire'], moves: ['Scratch', 'Ember', 'Flamethrower', 'Fire Spin'], evolvesTo: 'Charizard', evolveLevel: 36 },
    { name: 'Charizard', hp: 78, attack: 84, defense: 78, type: ['Fire', 'Flying'], moves: ['Flamethrower', 'Wing Attack', 'Fire Blast', 'Dragon Claw'] },
    { name: 'Squirtle', hp: 44, attack: 48, defense: 65, type: ['Water'], moves: ['Tackle', 'Water Gun', 'Bubble Beam', 'Withdraw'], evolvesTo: 'Wartortle', evolveLevel: 16 },
    { name: 'Wartortle', hp: 59, attack: 63, defense: 80, type: ['Water'], moves: ['Water Gun', 'Bubble Beam', 'Hydro Pump', 'Protect'], evolvesTo: 'Blastoise', evolveLevel: 36 },
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
    'Solar Beam': { baseDamage: 30, accuracy: 80, type: 'Grass', weatherEffect: { 'Sunny': { damageMultiplier: 1.5, accuracyBonus: 10 }, 'Rain': { damageMultiplier: 0.5, accuracyBonus: -10 } } }
};

let gameState = { wildPokemon: null, lastSpawnTime: Date.now() };
let battle = { active: false, players: new Map(), currentTurn: 0, turnOrder: [], battleStartTime: null, weather: 'Clear', lastTurnTime: null, turnTimeout: TURN_TIMEOUT };
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
        const data = { battleRoyale: [...battle.players], userData: [...userData], gameState };
        fs.writeFileSync('gameData.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving game state:', error.message);
    }
}

function getRandomPokemon(excludeStarters = false) {
    let availablePokemon = pokemonData.filter(p =>
        !excludeStarters || !['Bulbasaur', 'Charmander', 'Squirtle'].includes(p.name));
    const pokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
    const isShiny = Math.random() < SHINY_CHANCE;
    const shinyBoost = isShiny ? 1.1 : 1;
    return {
        ...pokemon,
        currentHp: Math.floor(pokemon.hp * shinyBoost),
        hp: Math.floor(pokemon.hp * shinyBoost),
        attack: Math.floor(pokemon.attack * shinyBoost),
        defense: Math.floor(pokemon.defense * shinyBoost),
        status: 'none',
        statusTurns: 0,
        isShiny,
        level: 5,
        exp: 0
    };
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
    let effectiveness = getEffectiveness(moveInfo.type, defender.type);
    if (battle.weather === 'Rain' && moveInfo.type === 'Water') damage *= 1.5;
    else if (battle.weather === 'Sunny' && moveInfo.type === 'Fire') damage *= 1.5;
    if (moveInfo.weatherEffect && moveInfo.weatherEffect[battle.weather]) {
        damage *= moveInfo.weatherEffect[battle.weather].damageMultiplier;
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
                .reduce((total, [_, data]) => total + (data.reward || 0), 0);
            const userDataEntry = userData.get(winnerId);
            if (userDataEntry) {
                userDataEntry.money += defeatedBots;
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
        battle.players.clear();
        battle.turnOrder = [];
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
    return battle.players.size <= 1;
}

async function botPlayTurn(botId, botData, channel) {
    const botPokemon = botData.pokemon;
    const difficulty = botData.difficulty || 'easy';
    if (!handleStatusEffects(botData, channel)) {
        battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
        battle.lastTurnTime = Date.now();
        await announceBattleUpdate(channel);
        return;
    }
    const possibleTargets = Array.from(battle.players.entries())
        .filter(([id]) => id !== botId)
        .map(([id, data]) => ({ id, pokemon: data.pokemon }));
    if (possibleTargets.length === 0) {
        battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
        battle.lastTurnTime = Date.now();
        await announceBattleUpdate(channel);
        return;
    }
    let move, targetId;
    if (difficulty === 'easy') {
        move = botPokemon.moves[Math.floor(Math.random() * botPokemon.moves.length)];
        targetId = possibleTargets[Math.floor(Math.random() * possibleTargets.length)].id;
    } else if (difficulty === 'medium') {
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
    battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
    battle.lastTurnTime = Date.now();
    await announceBattleUpdate(channel);
    if (checkBattleEnd()) await handleBattleEnd(channel);
}

async function spawnWildPokemon(channel) {
    gameState.wildPokemon = getRandomPokemon(true);
    const embed = new EmbedBuilder()
        .setTitle('Wild Pokémon Appeared!')
        .setDescription(`A wild ${gameState.wildPokemon.name}${gameState.wildPokemon.isShiny ? ' ✨' : ''} has appeared! Use /catch to try catching it!`)
        .setColor('#FF4500')
        .setThumbnail(getPokemonSprite(gameState.wildPokemon.name, gameState.wildPokemon.isShiny))
        .setTimestamp();
    await channel.send({ embeds: [embed] });
    gameState.lastSpawnTime = Date.now();
    saveGameState();
}

async function announceBattleUpdate(channel) {
    const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length] || 'None';
    const embed = new EmbedBuilder()
        .setTitle('Pokémon Battle Royale')
        .setDescription(battle.active ? `**Battle in progress!** Current turn: <@${currentPlayerId}>` : '**Waiting for players or /startbattle...**')
        .setColor(battle.active ? '#ff4444' : '#4444ff')
        .addFields({ name: 'Weather', value: battle.weather, inline: true })
        .setThumbnail('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png')
        .setFooter({ text: 'Pokémon Battle Royale', iconURL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' })
        .setTimestamp();
    const fields = [];
    for (const [userId, data] of battle.players.entries()) {
        const isCurrentPlayer = userId === currentPlayerId;
        let pokemonLabel = data.isBot ? `${data.pokemon.name} (bot)` : (isCurrentPlayer ? data.pokemon.name : `${data.pokemon.name} (opponent)`);
        const statusText = data.pokemon.status !== 'none' ? ` (${data.pokemon.status})` : '';
        fields.push({ name: pokemonLabel + statusText, value: `**HP:** ${data.pokemon.currentHp}/${data.pokemon.hp}` });
    }
    embed.addFields(fields);
    await channel.send({ embeds: [embed] });
}

function getTypeColor(type) {
    const typeColors = {
        Grass: '#78C850', Poison: '#A040A0', Fire: '#F08030', Flying: '#A890F0', Water: '#6890F0',
        Electric: '#F8D030', Normal: '#A8A878', Ghost: '#705898', Dark: '#705848', Dragon: '#7038F8',
        Bug: '#A8B820', Psychic: '#F85888', Ground: '#E0C068', Fighting: '#C03028', Steel: '#B8B8D0',
        Ice: '#98D8D8', Rock: '#B8A038'
    };
    return typeColors[type] || '#A8A878';
}

function getPokemonSprite(name, isShiny) {
    const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
    const id = pokemonData.find(p => p.name === name)?.id || pokemonData.findIndex(p => p.name === name) + 1;
    return `${baseUrl}/${isShiny ? 'shiny' : ''}/${id}.png`;
}

client.once('ready', async () => {
    console.log(`Battle Royale Bot is online as ${client.user.tag}`);
    loadGameState();
    const commands = [
        new SlashCommandBuilder().setName('start').setDescription('Start your Pokémon journey').addStringOption(option =>
            option.setName('starter').setDescription('Choose your starter Pokémon').setRequired(true).addChoices(
                { name: 'Bulbasaur', value: 'Bulbasaur' }, { name: 'Charmander', value: 'Charmander' }, { name: 'Squirtle', value: 'Squirtle' }
            )),
        new SlashCommandBuilder().setName('join_battle').setDescription('Join the current battle royale'),
        new SlashCommandBuilder().setName('attack').setDescription('Attack another player in battle')
            .addStringOption(option => option.setName('move').setDescription('The move to use').setRequired(true).setAutocomplete(true))
            .addStringOption(option => option.setName('target').setDescription('The target Pokémon').setRequired(true).setAutocomplete(true)),
        new SlashCommandBuilder().setName('check_stats').setDescription('Check your Pokémon\'s stats'),
        new SlashCommandBuilder().setName('inventory').setDescription('Check your Pokémon collection'),
        new SlashCommandBuilder().setName('help').setDescription('Show information about available commands'),
        new SlashCommandBuilder().setName('weather').setDescription('Check current battle weather conditions'),
        new SlashCommandBuilder().setName('shop').setDescription('View the Poké Ball shop'),
        new SlashCommandBuilder().setName('buy').setDescription('Buy items from the shop')
            .addStringOption(option => option.setName('item').setDescription('The item to buy').setRequired(true).addChoices(
                { name: 'Poké Ball (10 coins)', value: 'pokeball' }, { name: 'Great Ball (20 coins)', value: 'greatball' },
                { name: 'Ultra Ball (30 coins)', value: 'ultraball' }, { name: 'Premier Ball (50 coins)', value: 'premierball' }
            )).addIntegerOption(option => option.setName('quantity').setDescription('How many to buy').setRequired(true).setMinValue(1).setMaxValue(99)),
        new SlashCommandBuilder().setName('catch').setDescription('Try to catch a wild Pokémon')
            .addStringOption(option => option.setName('ball').setDescription('Which ball to use').setRequired(true).addChoices(
                { name: 'Poké Ball', value: 'pokeball' }, { name: 'Great Ball', value: 'greatball' },
                { name: 'Ultra Ball', value: 'ultraball' }, { name: 'Premier Ball', value: 'premierball' }
            )),
        new SlashCommandBuilder().setName('bal').setDescription('Check your balance and inventory'),
        new SlashCommandBuilder().setName('battlebots').setDescription('Add bot players to the battle')
            .addIntegerOption(option => option.setName('quantity').setDescription('Number of bots to add (1-8)').setRequired(true).setMinValue(1).setMaxValue(8))
            .addStringOption(option => option.setName('difficulty').setDescription('Choose bot difficulty').setRequired(true).addChoices(
                { name: 'Easy (10 coin reward)', value: 'easy' }, { name: 'Medium (30 coin reward)', value: 'medium' }, { name: 'Hard (50 coin reward)', value: 'hard' }
            )),
        new SlashCommandBuilder().setName('startbattle').setDescription('Start the battle with current players'),
        new SlashCommandBuilder().setName('battle_status').setDescription('View the current battle status')
    ].map(command => command.toJSON());
    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands })
        .then(() => console.log('Commands registered'))
        .catch(console.error);
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    await channel.send('Enhanced Pokémon Battle Royale Bot is online! Use /start, /join_battle, /battlebots, and /startbattle to play!');
    gameState.lastSpawnTime = Date.now();
    gameState.wildPokemon = null;
    setInterval(async () => {
        if (!gameState.wildPokemon && Date.now() - gameState.lastSpawnTime >= SPAWN_INTERVAL) await spawnWildPokemon(channel);
    }, SPAWN_CHECK_INTERVAL);
    setInterval(async () => {
        if (!battle.active) return;
        const now = Date.now();
        const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
        const playerData = battle.players.get(currentPlayerId);
        if (!playerData) {
            battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
            battle.lastTurnTime = now;
            return;
        }
        if (playerData.isBot) await botPlayTurn(currentPlayerId, playerData, channel);
        else if (now - (playerData.lastAction || battle.battleStartTime) > TURN_TIMEOUT) {
            await channel.send(`${playerData.pokemon.name} took too long! Player is eliminated!`);
            battle.players.delete(currentPlayerId);
            battle.turnOrder = battle.turnOrder.filter(id => id !== currentPlayerId);
            battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
            battle.lastTurnTime = now;
            await announceBattleUpdate(channel);
            saveGameState();
            if (checkBattleEnd()) await handleBattleEnd(channel);
        }
    }, BATTLE_CHECK_INTERVAL);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        const userId = interaction.user.id;
        if (focusedOption.name === 'move') {
            const playerData = battle.players.get(userId);
            if (!playerData) return await interaction.respond([]);
            const moves = playerData.pokemon.moves.map(move => ({
                name: `${move} (Power: ${moveData[move].baseDamage}, Accuracy: ${moveData[move].accuracy}%)`,
                value: move
            }));
            await interaction.respond(moves);
        }
        if (focusedOption.name === 'target') {
            const targets = Array.from(battle.players.entries()).map(([id, data]) => ({
                name: data.isBot ? `${data.pokemon.name} (bot)` : (id === userId ? `${data.pokemon.name} (user)` : `${data.pokemon.name} (opponent)`),
                value: data.pokemon.name
            }));
            await interaction.respond(targets);
        }
        return;
    }
    if (!interaction.isCommand()) return;
    const { commandName, user, options } = interaction;
    const channel = await client.channels.fetch(BATTLE_CHANNEL_ID);
    const userId = user.id;

    if (commandName === 'start') {
        if (userData.has(userId)) return await interaction.reply('You already have a starter Pokémon! Use /check_stats.');
        const starterName = options.getString('starter');
        const starterData = pokemonData.find(p => p.name === starterName);
        if (!starterData) return await interaction.reply('Invalid starter Pokémon selected.');
        const pokemon = { ...starterData, currentHp: starterData.hp, status: 'none', statusTurns: 0, isShiny: Math.random() < SHINY_CHANCE, level: 5, exp: 0 };
        userData.set(userId, { pokemon, inventory: { pokeball: 5, greatball: 0, ultraball: 0, premierball: 0 }, money: STARTING_MONEY, collection: [pokemon] });
        saveGameState();
        const embed = new EmbedBuilder()
            .setTitle('Welcome to Pokémon Battle Royale!')
            .setDescription(`You've chosen ${starterName}! Received: 5 Poké Balls, ${STARTING_MONEY} coins`)
            .setColor(getTypeColor(pokemon.type[0]))
            .setThumbnail(getPokemonSprite(starterName, pokemon.isShiny))
            .addFields(
                { name: 'Level', value: '5', inline: true }, { name: 'HP', value: `${pokemon.hp}`, inline: true },
                { name: 'Type', value: pokemon.type.join('/'), inline: true }, { name: 'Inventory', value: '5 Poké Balls', inline: true },
                { name: 'Money', value: `${STARTING_MONEY} coins`, inline: true }
            )
            .setFooter({ text: pokemon.isShiny ? '✨ Lucky! You got a shiny! ✨' : 'Your journey begins!' });
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'join_battle') {
        if (!userData.has(userId)) return await interaction.reply('You need a starter Pokémon! Use /start.');
        if (!battle.players) battle.players = new Map(), battle.turnOrder = [], battle.active = false, battle.currentTurn = 0, battle.weather = 'Clear';
        if (battle.active) return await interaction.reply('Battle is already in progress!');
        if (battle.players.has(userId)) return await interaction.reply('You are already in the battle!');
        if (battle.players.size >= MAX_PLAYERS) return await interaction.reply('The battle is full!');
        const userPokemon = userData.get(userId).pokemon;
        battle.players.set(userId, { pokemon: { ...userPokemon }, isBot: false, ownerId: userId, lastAction: Date.now() });
        saveGameState();
        const embed = new EmbedBuilder()
            .setTitle('Battle Royale - New Challenger!')
            .setDescription(`${user.username} joined with ${userPokemon.name}! Use /startbattle to begin.`)
            .addFields(
                { name: 'Current Players', value: `${battle.players.size}/${MAX_PLAYERS}`, inline: true },
                { name: 'Battle Status', value: 'Waiting for players', inline: true },
                { name: 'Weather', value: battle.weather, inline: true }
            )
            .setColor('#0000FF')
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        await announceBattleUpdate(channel);
    } else if (commandName === 'attack') {
        if (!battle.active) return await interaction.reply('No active battle! Use /join_battle and /startbattle.');
        if (!battle.players.has(userId)) return await interaction.reply('You are not in this battle!');
        const currentPlayerId = battle.turnOrder[battle.currentTurn % battle.turnOrder.length];
        if (currentPlayerId !== userId) return await interaction.reply('It’s not your turn!');
        const playerData = battle.players.get(userId);
        if (!handleStatusEffects(playerData, channel)) {
            battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
            battle.lastTurnTime = Date.now();
            await announceBattleUpdate(channel);
            return await interaction.reply(`${playerData.pokemon.name} couldn't act due to its status!`);
        }
        const moveName = options.getString('move');
        const targetName = options.getString('target');
        if (!playerData.pokemon.moves.includes(moveName)) return await interaction.reply('Invalid move! Check your Pokémon\'s moves.');
        const targetPlayer = Array.from(battle.players.entries()).find(([_, data]) => data.pokemon.name === targetName);
        if (!targetPlayer) return await interaction.reply('Invalid target! Choose a Pokémon in the battle.');
        const [targetId, targetData] = targetPlayer;
        const damage = calculateDamage(playerData.pokemon, targetData.pokemon, moveName, channel, userId);
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
            await channel.send({ embeds: [eliminationEmbed] });
            if (checkBattleEnd()) await handleBattleEnd(channel);
        }
        playerData.lastAction = Date.now();
        battle.currentTurn = (battle.currentTurn + 1) % battle.turnOrder.length;
        battle.lastTurnTime = Date.now();
        await announceBattleUpdate(channel);
    } else if (commandName === 'check_stats') {
        if (!userData.has(userId)) return await interaction.reply('No Pokémon yet! Use /start.');
        const userPokemon = userData.get(userId).pokemon;
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
    } else if (commandName === 'inventory') {
        if (!userData.has(userId)) return await interaction.reply('No Pokémon yet! Use /start.');
        const userDat = userData.get(userId);
        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Inventory`)
            .addFields(
                { name: 'Money', value: `${userDat.money} coins`, inline: false },
                { name: 'Poké Balls', value: Object.entries(userDat.inventory).map(([type, count]) => `${POKEBALL_TYPES[type].name}: ${count}`).join('\n'), inline: true },
                { name: 'Collection Size', value: `${userDat.collection.length} Pokémon`, inline: true }
            )
            .setColor('#4169E1')
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('Pokémon Battle Royale - Help')
            .setDescription('Available commands:')
            .addFields(
                { name: '/start', value: 'Choose your starter Pokémon.', inline: true },
                { name: '/join_battle', value: 'Join the battle.', inline: true },
                { name: '/attack', value: 'Attack in battle.', inline: true },
                { name: '/check_stats', value: 'View your Pokémon\'s stats.', inline: true },
                { name: '/inventory', value: 'Check items and collection.', inline: true },
                { name: '/weather', value: 'Check battle weather.', inline: true },
                { name: '/shop', value: 'View Poké Ball shop.', inline: true },
                { name: '/buy', value: 'Purchase Poké Balls.', inline: true },
                { name: '/catch', value: 'Catch a wild Pokémon.', inline: true },
                { name: '/bal', value: 'Check balance and inventory.', inline: true },
                { name: '/battlebots', value: 'Add bots to the battle.', inline: true },
                { name: '/startbattle', value: 'Start the battle.', inline: true },
                { name: '/battle_status', value: 'View battle status.', inline: true }
            )
            .setColor('#FFD700')
            .setTimestamp();
        await interaction.reply({ embeds: [helpEmbed] });
    } else if (commandName === 'weather') {
        const embed = new EmbedBuilder()
            .setTitle('Current Battle Weather')
            .setDescription(`The current weather is: **${battle.weather}**`)
            .setColor('#87CEEB')
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'shop') {
        const shopEmbed = new EmbedBuilder()
            .setTitle('Poké Ball Shop')
            .setDescription('Buy Poké Balls to catch wild Pokémon!')
            .addFields(
                { name: 'Poké Ball', value: '```Price: 10 coins\nCatch Rate: 1.0x```', inline: true },
                { name: 'Great Ball', value: '```Price: 20 coins\nCatch Rate: 1.5x```', inline: true },
                { name: 'Ultra Ball', value: '```Price: 30 coins\nCatch Rate: 2.0x```', inline: true },
                { name: 'Premier Ball', value: '```Price: 50 coins\nCatch Rate: 2.5x```', inline: true },
                { name: '📝 How to Buy', value: 'Use `/buy [ball] [quantity]`\nExample: `/buy pokeball 5`' }
            )
            .setColor('#FFD700')
            .setFooter({ text: 'Higher catch rates improve your chances!' })
            .setTimestamp();
        await interaction.reply({ embeds: [shopEmbed] });
    } else if (commandName === 'buy') {
        if (!userData.has(userId)) return await interaction.reply('Start your journey with /start!');
        const item = options.getString('item');
        const quantity = options.getInteger('quantity');
        const userDat = userData.get(userId);
        if (!POKEBALL_TYPES[item]) return await interaction.reply('Invalid item! Use /shop.');
        const totalCost = POKEBALL_TYPES[item].price * quantity;
        if (userDat.money < totalCost) return await interaction.reply(`❌ Not enough money! Cost: ${totalCost}, Balance: ${userDat.money}`);
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
    } else if (commandName === 'catch') {
        if (!userData.has(userId)) return await interaction.reply('Start your journey with /start!');
        if (!gameState.wildPokemon) return await interaction.reply('No wild Pokémon to catch!');
        const ballType = options.getString('ball').toLowerCase();
        const userDat = userData.get(userId);
        if (!POKEBALL_TYPES[ballType] || userDat.inventory[ballType] <= 0) return await interaction.reply(`No ${POKEBALL_TYPES[ballType]?.name || 'balls'} left! Use /buy.`);
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
                .setDescription(`You caught the wild ${pokemon.name}${pokemon.isShiny ? ' ✨' : ''}!`)
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
    } else if (commandName === 'bal') {
        if (!userData.has(userId)) return await interaction.reply('Start your journey with /start!');
        const userDat = userData.get(userId);
        const balanceEmbed = new EmbedBuilder()
            .setTitle('💰 Your Balance')
            .setDescription(`Your current balance is ${userDat.money} coins.`)
            .addFields({ name: 'Inventory', value: Object.entries(userDat.inventory).map(([type, count]) => `${POKEBALL_TYPES[type].name}: ${count}`).join('\n') || 'Empty' })
            .setColor('#FFFF00')
            .setTimestamp();
        await interaction.reply({ embeds: [balanceEmbed] });
    } else if (commandName === 'battlebots') {
        if (!battle.players) battle.players = new Map(), battle.turnOrder = [], battle.active = false, battle.currentTurn = 0, battle.weather = 'Clear';
        if (battle.active) return await interaction.reply('Battle is already in progress!');
        const quantity = options.getInteger('quantity');
        const difficulty = options.getString('difficulty');
        let reward;
        switch (difficulty) {
            case 'easy': reward = 10; break;
            case 'medium': reward = 30​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​
