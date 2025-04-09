import fs from 'fs';
import path from 'path';

// Game settings
const structures = [
	{ name: 'Sprite', cost: { array: 2, variable: 1 } },
	{ name: 'Collision', cost: { class: 2, function: 1 } },
	{ name: 'State Machine', cost: { function: 2, class: 1 } },
	{ name: 'Timer', cost: { variable: 2, array: 1 } },
];

const resources = ['variable', 'class', 'function', 'array'];

// Define finite number of cards for each resource
const resourceDeckConfig = {
	variable: 8,
	class: 8,
	function: 8,
	array: 8,
};

// Define setbacks
const setbacks = [
	{
		structure: 'State Machine',
		name: 'Bug: Even the debugger is confused.',
	},
	{
		structure: 'Sprite',
		name: "Alpha Male: Opacity so low, it's invisible.",
	},
	{
		structure: 'Timer',
		name: 'Procrastination: Your timer hit snooze.',
	},
	{
		structure: 'Collision',
		name: "Self-Collision: Let's just call it friendly fire.",
	},
];

const timePerAction = {
	drawResource: 5, // seconds
	buildStructure: 5, // seconds
	setback: 10, // seconds
	trade: 20, // seconds
	steal: 10, // seconds
	nope: 5, // seconds
};

const debug = true; // Set to false to disable detailed turn summaries
let turnSummary = '';

// Create the deck by adding resources and setbacks together
function createDeck(resourceConfig, setbacks) {
	let deck = [];

	// Add resources based on config
	for (let resource in resourceConfig) {
		for (let i = 0; i < resourceConfig[resource]; i++) {
			deck.push({ type: 'resource', value: resource });
		}
	}

	// Add setbacks to the deck
	for (let setback of setbacks) {
		deck.push({ type: 'setback', value: setback });
	}

	// Shuffle the deck
	return shuffle(deck);
}

// Shuffle function
function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

// Simulate setback
function applySetback(player, setback, discardPile) {
	const structureName = setback.structure;

	if (player.builtStructures.includes(structureName)) {
		const loseResources = Math.random() > 0.5;

		// Simulate player deciding to lose resources or destroy structure.
		if (loseResources) {
			deductResources(player, discardPile);
		} else {
			player.builtStructures = player.builtStructures.filter(
				(s) => s !== structureName
			);
			turnSummary += `  ${structureName} destroyed.\n`;
		}

		return;
	}

	// If the player doesn't have the structure, they lose resources.
	deductResources(player, discardPile);
}

function deductResources(player, discardPile) {
	let resourceLossCount = 0;
	const penalty = Math.floor(countPlayerResources(player) / 2); // Lose half of the resources.

	// For each resource type
	for (let resource of resources) {
		if (resourceLossCount == penalty) break;
		// If the player has the resource
		if (player.resources[resource] > 0) {
			// Deduct the resource
			for (let i = 0; i < player.resources[resource]; i++) {
				player.resources[resource]--;
				discardPile.push({ type: 'resource', value: resource });
				resourceLossCount++;
				if (resourceLossCount == penalty) break;
			}
		}
	}

	turnSummary += `  Lost ${resourceLossCount} resource(s).\n`;
}

// Utility function to check if player can build a structure
function canBuildStructure(player, structure) {
	for (let resource in structure.cost) {
		if ((player.resources[resource] || 0) < structure.cost[resource]) {
			return false;
		}
	}
	return true;
}

// Utility function to build a structure and discard resources
function buildStructure(player, structure, discardPile) {
	for (let resource in structure.cost) {
		player.resources[resource] -= structure.cost[resource];

		// Add the used resources to the discard pile
		for (let i = 0; i < structure.cost[resource]; i++) {
			discardPile.push({ type: 'resource', value: resource });
		}
	}
	player.builtStructures.push(structure.name);
}

// Check win condition
function checkWinCondition(player) {
	const requiredStructures = structures.map((s) => s.name);
	const hasAllStructures = requiredStructures.every((s) =>
		player.builtStructures.includes(s)
	);

	return hasAllStructures;
}

// Draw a card from the deck
function drawCard(deck, discardPile) {
	// Check if deck is empty
	if (deck.length === 0) {
		if (discardPile.length === 0) {
			throw new Error(
				'No cards left to draw! Both the deck and discard pile are empty.'
			);
		}
		// Shuffle the discard pile into the deck
		turnSummary += '  Shuffling discard pile into deck.\n';
		deck.push(...shuffle(discardPile));
		discardPile.length = 0; // Empty discard pile after shuffle
	}

	// Draw the top card from the deck
	return deck.pop();
}

function countPlayerResources(player) {
	return Object.values(player.resources).reduce(
		(sum, count) => sum + count,
		0
	);
}

function closestStructure(player) {
	let closest = null;
	let closestMissingResources = Infinity;

	for (let structure of structures) {
		if (!player.builtStructures.includes(structure.name)) {
			let missingResources = 0;

			for (let resource in structure.cost) {
				missingResources += Math.max(
					0,
					structure.cost[resource] - (player.resources[resource] || 0)
				);
			}

			// Update if this structure is closer
			if (missingResources < closestMissingResources) {
				closestMissingResources = missingResources;
				closest = structure;
			}
		}
	}

	return closest;
}

function findTradePartner(currentPlayer, players) {
	const currentStructure = closestStructure(currentPlayer);

	if (!currentStructure) return null; // No structure to build

	for (let otherPlayer of players) {
		if (
			otherPlayer.name !== currentPlayer.name &&
			otherPlayer.tradeCards > 0
		) {
			const otherStructure = closestStructure(otherPlayer);

			if (!otherStructure) continue;

			// Check if players can help each other
			if (
				canHelp(
					currentPlayer,
					otherPlayer,
					currentStructure,
					otherStructure
				)
			) {
				return otherPlayer;
			}
		}
	}
	return null;
}

// Helper function to determine if a trade is mutually beneficial and involves different resources
function canHelp(playerA, playerB, structureA, structureB) {
	let playerACanGive = false;
	let playerBCanGive = false;
	let playerAGivesResource = '';
	let playerBGivesResource = '';

	// Check if playerB can give a resource that playerA needs for structureA
	for (let resource in structureA.cost) {
		if (
			(playerB.resources[resource] || 0) > 0 &&
			structureA.cost[resource] - (playerA.resources[resource] || 0) > 0
		) {
			playerBCanGive = true;
			playerBGivesResource = resource;
			break;
		}
	}

	// Check if playerA can give a resource that playerB needs for structureB
	for (let resource in structureB.cost) {
		if (
			(playerA.resources[resource] || 0) > 0 &&
			structureB.cost[resource] - (playerB.resources[resource] || 0) > 0
		) {
			playerACanGive = true;
			playerAGivesResource = resource;
			break;
		}
	}

	// Ensure that the resources they are trading are different
	return (
		playerACanGive &&
		playerBCanGive &&
		playerAGivesResource !== playerBGivesResource
	);
}

// Perform a trade between two players
function performTrade(playerA, playerB, structureA, structureB) {
	let playerAGivesResource = '';
	let playerBGivesResource = '';

	// Find what playerA can give to playerB for structureB
	for (let resource in structureB.cost) {
		if (
			(playerA.resources[resource] || 0) > 0 &&
			structureB.cost[resource] - (playerB.resources[resource] || 0) > 0
		) {
			playerAGivesResource = resource;
			break;
		}
	}

	// Find what playerB can give to playerA for structureA
	for (let resource in structureA.cost) {
		if (
			(playerB.resources[resource] || 0) > 0 &&
			structureA.cost[resource] - (playerA.resources[resource] || 0) > 0
		) {
			playerBGivesResource = resource;
			break;
		}
	}

	// Perform the trade: swap the resources
	if (playerAGivesResource && playerBGivesResource) {
		// Player A gives Player B the resource
		playerA.resources[playerAGivesResource]--;
		playerB.resources[playerAGivesResource]++;
		turnSummary += `  Gave ${playerAGivesResource} to ${playerB.name}.\n`;

		// Player B gives Player A the resource
		playerB.resources[playerBGivesResource]--;
		playerA.resources[playerBGivesResource]++;
		turnSummary += `  Received ${playerBGivesResource} from ${playerB.name}.\n`;

		// Deduct one trade card from each player
		playerA.tradeCards--;
		// playerB.tradeCards--;
	}
}

// Perform a steal action
function stealStructure(currentPlayer, targetPlayer) {
	// Get a list of structures the target player has that the current player doesn't have
	const stealableStructures = targetPlayer.builtStructures.filter(
		(structure) => !currentPlayer.builtStructures.includes(structure)
	);

	// If no stealable structures are available, skip stealing
	if (stealableStructures.length === 0) {
		turnSummary += `  Tried to steal from ${targetPlayer.name}, but there's nothing to steal!\n`;
		return;
	}

	// Steal the first available structure (or you could randomize this if you want)
	const stolenStructure = stealableStructures.pop();
	currentPlayer.builtStructures.push(stolenStructure);

	// Current player loses their next turn
	currentPlayer.skipTurn = true;

	// Deduct one steal card
	currentPlayer.stealCards--;

	turnSummary += `  Stole ${stolenStructure} from ${targetPlayer.name} and will skip their next turn.\n`;
}

// Simulate a single game
function simulateGame() {
	const players = [
		{
			resources: {},
			builtStructures: [],
			tradeCards: 2,
			stealCards: 1,
			nopeCards: 1,
			skipTurn: false,
			name: 'Player 1',
		},
		{
			resources: {},
			builtStructures: [],
			tradeCards: 2,
			stealCards: 1,
			nopeCards: 1,
			skipTurn: false,
			name: 'Player 2',
		},
		{
			resources: {},
			builtStructures: [],
			tradeCards: 2,
			stealCards: 1,
			nopeCards: 1,
			skipTurn: false,
			name: 'Player 3',
		},
		{
			resources: {},
			builtStructures: [],
			tradeCards: 2,
			stealCards: 1,
			nopeCards: 1,
			skipTurn: false,
			name: 'Player 4',
		},
	];
	let turn = 0;
	let gameWon = false;
	let totalGameTime = 0; // Track total game time in seconds
	let trades = 0; // Number of trades made in a game
	let steals = 0; // Number of steals made in a game
	let setbackCount = 0; // Number of setbacks drawn in a game
	let nopes = 0; // Number of Nope Cards used in a game

	// Helper to simulate asking each player if they want to use a Nope Card
	const checkForNope = (initiator, action) => {
		if (action == 'setback') {
			// Randomly decide if the player will use a Nope Card to block the setback
			if (initiator.nopeCards > 0 && Math.random() < 0.5) {
				turnSummary += `  ${initiator.name} noped the setback!\n`;
				initiator.nopeCards--;
				return true;
			}
			return false;
		}

		for (let player of players) {
			if (player !== initiator && player.nopeCards > 0) {
				turnSummary += `  ${player.name} noped ${initiator.name}'s ${action}!\n`;
				player.nopeCards--;
				return true; // Action is blocked
			}
		}

		return false; // No one used a Nope Card
	};

	// Initialize resources to 0 for all types
	for (let player of players) {
		for (let resource of resources) {
			player.resources[resource] = 0;
		}
	}

	// Initialize deck and discard pile
	let deck = createDeck(resourceDeckConfig, setbacks);
	let discardPile = [];

	while (!gameWon) {
		turn++;
		turnSummary = ''; // Reset turn summary for this turn
		let turnTime = 0; // Time for this player's turn

		if (turn > 100) {
			throw new Error('Game took too long to finish!');
		}

		for (let player of players) {
			// Initialize a turn summary and turn time tracker
			turnSummary += `Turn ${turn}, ${
				player.name
			}, cards: ${countPlayerResources(player)}, deck: ${
				deck.length
			}, discard: ${discardPile.length}, structures: ${
				player.builtStructures.length
			}/${structures.length}, trade: ${player.tradeCards}, steal: ${
				player.stealCards
			}, nope: ${player.nopeCards}.\n`;

			if (player.skipTurn) {
				turnSummary += `  Skips turn due to previous steal.\n`;
				player.skipTurn = false; // Reset the skip turn flag
				continue; // Skip the rest of the loop for this player
			}

			// Drawing a card (always happens)
			const drawnCard = drawCard(deck, discardPile);
			turnTime += timePerAction.drawResource; // Add time for drawing

			if (drawnCard.type === 'resource') {
				turnSummary += `  Drew resource: ${drawnCard.value}.\n`;
				player.resources[drawnCard.value]++;
			} else if (drawnCard.type === 'setback') {
				turnSummary += `  Drew setback: ${drawnCard.value.name}\n`;

				// Check if anyone wants to use a Nope Card
				if (!checkForNope(player, 'setback')) {
					applySetback(player, drawnCard.value, discardPile);
					discardPile.push(drawnCard); // Add the setback card to the discard pile
					turnTime += timePerAction.setback; // Add time for setback
					setbackCount++;
				} else {
					turnTime += timePerAction.nope; // Add time for noping the setback
					nopes++;
				}
			}

			// Check if the player has steal cards and can steal a structure
			if (player.stealCards > 0 && player.builtStructures.length > 2) {
				const targetPlayer = players.find(
					(p) => p !== player && p.builtStructures.length > 0
				);
				if (targetPlayer && !checkForNope(targetPlayer, 'steal')) {
					stealStructure(player, targetPlayer);
					turnTime += timePerAction.steal; // Add time for stealing
					steals++;
				} else {
					turnTime += timePerAction.nope; // Add time for noping the steal
					nopes++;
				}
			}

			// Check if the player has trade cards and find a trade partner
			if (player.tradeCards > 0 && countPlayerResources(player) > 1) {
				const tradePartner = findTradePartner(player, players);

				if (tradePartner && countPlayerResources(tradePartner) > 1) {
					const playerStructure = closestStructure(player);
					const partnerStructure = closestStructure(tradePartner);

					// Perform the trade if it helps both players and involves different resources
					if (
						canHelp(
							player,
							tradePartner,
							playerStructure,
							partnerStructure
						)
					) {
						if (!checkForNope(player, 'steal')) {
							performTrade(
								player,
								tradePartner,
								playerStructure,
								partnerStructure
							);
							trades++;
							turnTime += timePerAction.trade; // Add time for trade
						} else {
							turnTime += timePerAction.nope; // Add time for noping the trade
							nopes++;
						}
					} else {
						turnSummary += `  Trade not possible between ${player.name} and ${tradePartner.name}.\n`;
					}
				}
			}

			// Try to build a structure if possible
			for (let structure of structures) {
				if (
					!player.builtStructures.includes(structure.name) &&
					canBuildStructure(player, structure)
				) {
					buildStructure(player, structure, discardPile);
					turnSummary += `  Built ${structure.name}.\n`;
					turnTime += timePerAction.buildStructure; // Add time for building
				}
			}

			// Add this player's turn time to the total game time
			totalGameTime += turnTime;

			// Check for win condition
			if (checkWinCondition(player)) {
				turnSummary += `  Wins the game!\n`;
				gameWon = true;
				break;
			}
		}

		turnSummary += `Total turn time: ${turnTime} seconds.\n`;

		if (gameWon) {
			turnSummary += `\n🎉 Game won in ${turn} turns with ${trades} trades, ${steals} steals, ${nopes} nopes, and ${setbackCount} setbacks in ${formatTime(
				totalGameTime
			)}.\n`;
		}

		if (debug) {
			console.log(turnSummary);
		}
	}

	return {
		turn,
		totalGameTime,
		trades,
		steals,
		setbackCount,
		nopes,
	};
}

function formatTime(seconds) {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours} hours and ${minutes} minutes`;
}

// Run multiple simulations and estimate game duration
function runSimulations(totalSimulations) {
	let totalTurns = 0;
	let highestTurns = 0;
	let totalTime = 0;
	let highestTime = 0;
	const games = [];

	for (let i = 0; i < totalSimulations; i++) {
		if (debug) console.log(`Simulation ${i + 1}`);

		const simulatedGame = simulateGame();

		totalTime += simulatedGame.totalGameTime;
		highestTime = Math.max(highestTime, simulatedGame.totalGameTime);
		totalTurns += simulatedGame.turn;
		highestTurns = Math.max(highestTurns, simulatedGame.turn);

		games.push(simulatedGame);
	}

	// Save games array to JSON file.
	fs.writeFileSync('game-data.json', JSON.stringify(games), 'utf8');

	console.log('--- Simulation Results ---');

	console.log(
		`Assuming ${timePerAction.drawResource} seconds per draw, ${timePerAction.buildStructure} seconds per build, ${timePerAction.setback} seconds per setback, ${timePerAction.trade} seconds per trade, and ${timePerAction.steal} seconds per steal:`
	);

	const averageTurns = totalTurns / totalSimulations;
	console.log(
		`Average turns to win after ${totalSimulations} simulations: ${Math.round(
			averageTurns
		)}`
	);
	console.log(`Highest turn game: ${highestTurns}`);

	const avgTime = totalTime / totalSimulations;
	console.log(
		`Average game time after ${totalSimulations} simulations: ${formatTime(
			avgTime
		)}`
	);
	console.log(`Longest game time: ${formatTime(highestTime)}`);
}

// Run simulations
runSimulations(1000);
