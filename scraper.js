// Step 1: Collect all submission links (links to review pages)
let submissionLinks = [...document.querySelectorAll('.submission.cell a')].map(
	(a) => a.href
);

// Step 2: Function to visit each submission link and extract data
async function fetchFeedbackData() {
	let feedbackData = [];

	// Loop through each submission link
	for (let i = 0; i < submissionLinks.length; i++) {
		let link = submissionLinks[i];

		// Fetch the page content for the review (open in new window or use fetch if CORS is allowed)
		let response = await fetch(link);
		let pageHTML = await response.text();

		// Create a temporary DOM to parse the page
		let parser = new DOMParser();
		let doc = parser.parseFromString(pageHTML, 'text/html');

		// Get all the reviews on this page
		let reviews = doc.querySelectorAll('.assessment-full');

		reviews.forEach((review) => {
			// Extract the reviewer's name
			let reviewerName =
				review
					.querySelector('.assessment-full .fullname a')
					?.textContent.trim() || 'Unknown Reviewer';

			// Extract and sanitize the feedback text (strip HTML)
			let feedbackText =
				review.querySelector('.overallfeedback .text_to_html')
					?.innerHTML || '';

			// Create a temporary element to parse HTML and extract the clean text
			let tempElement = document.createElement('div');
			tempElement.innerHTML = feedbackText;

			// Replace emoticons (images with the class "icon emoticon") with their "alt" attribute values
			tempElement.querySelectorAll('img.icon.emoticon').forEach((img) => {
				let altText = img.getAttribute('alt') || 'emoticon';
				img.replaceWith(`[${altText}]`); // Replace the image with its alt text in square brackets
			});

			// Replace <br> with newlines and remove all other HTML tags
			feedbackText = tempElement.innerText.trim();

			// Escape commas and wrap the feedback text in quotes for CSV compatibility
			feedbackText = '"' + feedbackText.replace(/"/g, '""') + '"';

			// Remove leading - or + symbols used as bullets in feedback text
			feedbackText = feedbackText.replace(/^[+-]/, '');

			// Replace any newlines with a space to ensure single-line comments
			feedbackText = feedbackText.replace(/\n/g, ' ');

			// Push the data to the feedbackData array
			feedbackData.push({
				reviewerName: reviewerName,
				feedbackText: feedbackText,
			});
		});
	}

	// Sort feedbackData by reviewer name
	feedbackData.sort((a, b) => a.reviewerName.localeCompare(b.reviewerName));

	return feedbackData;
}

// Step 4: Export the feedback data as CSV using Blob for better browser compatibility
function exportToCSV(feedbackData) {
	// Construct the CSV content
	let csvContent = 'Reviewer Name,Feedback\n';

	feedbackData.forEach((row) => {
		let rowContent = `${row.reviewerName},${row.feedbackText}`;
		csvContent += rowContent + '\n';
	});

	let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	let link = document.createElement('a');
	let url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', 'feedback_data.csv');
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link); // Clean up the DOM
}

// Run the script
fetchFeedbackData().then((feedbackData) => {
	console.log(feedbackData); // Check the data in the console
	exportToCSV(feedbackData); // Export the data as a CSV file
});
