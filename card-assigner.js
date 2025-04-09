import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Function to read the CSV and group by reviewer with feedback categories
async function readAndGroupFeedback(filePath) {
	return new Promise((resolve, reject) => {
		const feedbackData = {};

		fs.createReadStream(filePath)
			.pipe(csv())
			.on('data', (row) => {
				const { Reviewer, Code } = row;

				// Initialize array if the reviewer hasn't been seen yet
				if (!feedbackData[Reviewer]) {
					feedbackData[Reviewer] = [];
				}

				// Push the feedback category (e.g., S+, G-) to the reviewer's array
				feedbackData[Reviewer].push(Code.trim());
			})
			.on('end', () => {
				resolve(feedbackData);
			})
			.on('error', (error) => reject(error));
	});
}

const config = {
	points: {
		SPlus: 4,
		SMinus: 4,
		SZero: 2,
		SA: 5,
		GPlus: 2,
		GMinus: 2,
		GZero: 1,
		GA: 2,
		PV: 1,
		OT: 0,
	},
	cardThresholds: {
		trade: 2,
		steal: 4,
		nope: 10,
	},
	maxCards: {
		trade: 2,
		steal: 1,
		nope: 1,
	},
};

// Function to count feedback categories and assign yellow cards based on criteria
function assignYellowCards(feedbackData) {
	const cardAssignments = {};

	for (const [reviewer, codes] of Object.entries(feedbackData)) {
		// Calculate total points based on feedback codes
		let initialPoints = codes.reduce((sum, code) => {
			switch (code) {
				case 'S+':
					return sum + config.points.SPlus;
				case 'S-':
					return sum + config.points.SMinus;
				case 'S0':
					return sum + config.points.SZero;
				case 'SA':
					return sum + config.points.SA;
				case 'G+':
					return sum + config.points.GPlus;
				case 'G-':
					return sum + config.points.GMinus;
				case 'G0':
					return sum + config.points.GZero;
				case 'GA':
					return sum + config.points.GA;
				case 'PV':
					return sum + config.points.PV;
				case 'OT':
					return sum + config.points.OT;
				default:
					return sum;
			}
		}, 0);

		// Set totalPoints to initialPoints for deduction and display initialPoints
		let totalPoints = initialPoints;

		// Initialize card counts
		let tradeCards = 0,
			stealCard = 0,
			nopeCard = 0;

		// Determine cards based on points, starting with the highest threshold
		if (totalPoints >= config.cardThresholds.nope) {
			nopeCard = config.maxCards.nope;
			totalPoints -= config.cardThresholds.nope;
		}

		if (totalPoints >= config.cardThresholds.steal) {
			stealCard = config.maxCards.steal;
			totalPoints -= config.cardThresholds.steal;
		}

		tradeCards = Math.min(
			config.maxCards.trade,
			Math.floor(totalPoints / config.cardThresholds.trade)
		);

		// Store the card counts and total points for the reviewer
		cardAssignments[reviewer] = {
			trade: tradeCards,
			steal: stealCard,
			nope: nopeCard,
			// points: initialPoints,
		};
	}

	// After processing all reviewers
	const pointsArray = Object.values(cardAssignments).map(
		(assignment) => assignment.points
	);
	const maxPoints = Math.max(...pointsArray);
	const avgPoints =
		pointsArray.reduce((sum, points) => sum + points, 0) /
		pointsArray.length;

	// console.log(`Max Points: ${maxPoints}`);
	// console.log(`Average Points: ${avgPoints.toFixed(2)}`);

	return cardAssignments;
}

// Convert object to array of arrays for CSV writing
function convertToCSVData(data) {
	const rows = Object.entries(data).map(
		([reviewer, { trade, steal, nope }]) => [reviewer, trade, steal, nope]
	);
	return rows;
}

// Save the array to a CSV file
function saveToCSV(data, filename = 'card_assignments.csv') {
	const headers = [
		'Reviewer Name',
		'Trade Cards',
		'Steal Cards',
		'Nope Cards',
	];
	const rows = convertToCSVData(data);

	const csvContent = [
		headers.join(','),
		...rows.map((row) => row.join(',')),
	].join('\n');
	fs.writeFileSync(filename, csvContent, 'utf8');
	console.log(`Data saved to ${filename}`);
}

// Main function to execute the reading and assigning
async function main() {
	const filePath = path.join(path.resolve(), 'feedback.csv');

	try {
		const feedbackData = await readAndGroupFeedback(filePath);
		const cardAssignments = assignYellowCards(feedbackData);

		saveToCSV(cardAssignments);

		console.log('Yellow Card Assignments:', cardAssignments);
		console.log(Object.entries(cardAssignments).length);
	} catch (error) {
		console.error('Error processing the file:', error);
	}
}

main();
