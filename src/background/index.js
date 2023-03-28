let state = {
	asin: null,
	loading: false,
	results: null,
	error: null,
	tempoText: false,
};

// Store the last state to be updated when the popup reconnects
let lastState = null;

const handleAnalyzeReviews = async (asin, port) => {
	const apiUrl = 'https://pureworthyinstitutes.star0fstars77.repl.co';

	// Load the previous state from storage
	chrome.storage.local.get('state', async (items) => {
		const prevState = items.state || state;

		// Update the state
		state.asin = asin;
		state.loading = true;
		state.results = null;
		state.error = null;
		state.tempoText = true;

		// Send updated state to popup if port is connected
		if (port.sender) {
			port.postMessage({ action: 'updateState', state });
		}

		try {
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: `asin=${asin}`,
			});

			if (!response.ok) {
				throw new Error(
					`Request failed with status ${response.status}`
				);
			}

			const data = await response.json();
			console.log('Datos recibidos del servidor:', data);

			if (data.response) {
				state.results = {
					response: data.response,
				};
			} else {
				state.results = {
					positives: data.positives
						.split('.')
						.filter((item) => item.trim().length > 0),
					negatives: data.negatives
						.split('.')
						.filter((item) => item.trim().length > 0),
					improvements: data.improvements
						.split('.')
						.filter((item) => item.trim().length > 0),
				};
			}
			
			state.asin = asin;
			state.error = null;
			state.loading = false;
			state.tempoText = false;

			// Save updated state to storage
			chrome.storage.local.set({ state });

			// Update the last state
			lastState = state;

			// Send updated state to popup if port is connected
			// if (port.sender) {
			// 	port.postMessage({ action: 'updateState', state });
			// }

			try {
				if (port.sender) {
					port.postMessage({ action: 'updateState', state });
				}
			} catch (error) {
				console.error('Error sending message:', error);

				// If the port is disconnected, wait for a reconnection
				if (
					error.message ===
					'Attempting to use a disconnected port object'
				) {
					console.log('Waiting for reconnection...');
					const reconnect = () => {
						console.log('Reconnected!');
						port.postMessage({
							action: 'updateState',
							state,
						});
						port.onDisconnect.removeListener(reconnect);
					};
					port.onDisconnect.addListener(reconnect);
				}
			}
		} catch (error) {
			console.error('Error al obtener datos del servidor:', error);
			state.asin = asin;
			state.results = null;
			state.error = error.toString();
			state.loading = false;
			state.tempoText = false;

			// Update the last state
			lastState = state;

			try {
				if (port.sender) {
					port.postMessage({ action: 'updateState', state });
				}
			} catch (error) {
				console.error('Error sending message:', error);

				// If the port is disconnected, wait for a reconnection
				if (
					error.message ===
					'Attempting to use a disconnected port object'
				) {
					console.log('Waiting for reconnection...');
					const reconnect = () => {
						console.log('Reconnected!');
						port.postMessage({
							action: 'updateState',
							state,
						});
						port.onDisconnect.removeListener(reconnect);
					};
					port.onDisconnect.addListener(reconnect);
				}
			}
		}
		state.asin = asin;
		state.loading = false;
		state.tempoText = false;

		// Send updated state to popup if port is connected and sender has a tab
		if (port.sender && port.sender.tab) {
			port.postMessage({ action: 'updateState', state });
		}
	});
};


chrome.runtime.onConnect.addListener((port) => {
	console.assert(port.name === 'popup-script');

	if (port.name === 'popup-script') {
		if (lastState !== null) {
			port.postMessage({ action: 'updateState', state: lastState });
		}
	}

	chrome.cookies.get(
		// { url: 'http://localhost:3000', name: 'sessionToken' }, // for local development
		{ url: 'https://amazon-review.vercel.app', name: 'sessionToken' }, // for production
		(cookie) => {
			const sessionToken = cookie?.value;
			port.postMessage({ action: 'SET_COOKIES', sessionToken });
			// use the session token to authenticate the user
		}
	);

	chrome.runtime.onStartup.addListener(async () => {
		// Load state from local storage
		const storedState = await loadStateFromStorage();
		if (storedState) {
			let state = storedState;
			port.postMessage({ action: 'updateState', state });
		}
	});

	port.onMessage.addListener(async (request) => {
		console.log('Mensaje recibido en background.js:', request);
		if (request.action === 'requestState') {
			if (lastState !== null) {
				port.postMessage({ action: 'updateState', state: lastState });
			}else {

				port.postMessage({ action: 'updateState', state });
			}
		}

		if (request.action === 'analyzeReviews') {
			const asin = request.asin;
			await handleAnalyzeReviews(asin, port);
		}

		if (request.action === 'resetState') {
			state = {
				asin: null,
				loading: false,
				results: null,
				error: null,
				tempoText: false,
			};
			lastState = null;
			port.postMessage({ action: 'updateState', state });
		}
	});
});


// Save state to local storage
const saveStateToStorage = (state) => {
  chrome.storage.local.set({ state: JSON.stringify(state) });
};

// Load state from local storage
const loadStateFromStorage = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['state'], (result) => {
      const storedState = result.state ? JSON.parse(result.state) : null;
      resolve(storedState);
    });
  });
};



