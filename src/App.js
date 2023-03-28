import React, { useState, useEffect } from 'react';
import './App.css';
import './bootstrap.min.css';

const App = () => {
	// const [asin, setAsin] = useState(null);
	const [showAnalyze, setShowAnalyze] = useState(false);
	const [divContainer, setDivContainer] = useState(null);
	const [cookies, setCookies] = useState(null);
	const [isBack, setIsBack] = useState(false);
	const [state, setState] = useState({
		asin: null,
		loading: false,
		results: null,
		error: null,
		tempoText: false,
	});

	useEffect(() => {
		// Establecer conexión con background.js
		const port = chrome.runtime.connect({ name: 'popup-script' });
		console.log('Connected to background');
		// Escuchar mensajes de background.js y actualizar el estado
		port.onMessage.addListener((request) => {
			if (request.action === 'updateState') {
				updateUI(request.state);
				setState(request.state); // update the local state as well
				console.log('updated the state');
			}

			if (request.action === 'SET_COOKIES') {
				setCookies(request.sessionToken);
			}
		});

		// Solicitar el estado actual cuando se carga el popup
		port.postMessage({ action: 'requestState' });
	}, []);


	const handleExtractor = () => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			let asin_text = getAsinFromUrl(tabs[0].url);
			console.log('my asin', asin_text, tabs[0].url);
			if (asin_text) {
				// setAsin(asin_text);
				setState((prevState) => ({
					...prevState,
					asin: asin_text,
				}));
				setShowAnalyze(true);
			}
		});
	};

	const getAsinFromUrl = (url) => {
		const regex = /\/(?:dp|gp\/product)\/([A-Z0-9]+)(?:\/|\?|$)/i;
		const asinMatch = url.match(regex);
		return asinMatch && asinMatch[1];
	};


	const handleAnalyze = () => {
		console.log(
			"Botón 'Analizar reseñas' presionado. Enviando mensaje a background.js"
		);

		setShowAnalyze(false);

		const port = chrome.runtime.connect({ name: 'popup-script' });

		port.postMessage({ action: 'analyzeReviews', asin: state.asin });

		port.onMessage.addListener((request) => {
			if (request.action === 'updateState') {
				updateUI(request.state);
				setState(request.state); // update the local state as well
			}
		});

		port.postMessage({ action: 'requestState' });
	};

	const handleReset = () => {
		setShowAnalyze(false);
		setDivContainer(null);
		setIsBack(false);
		setState((prevState) => ({
			...prevState,
			asin: null,
			loading: false,
			results: null,
			error: null,
			tempoText: false,
		}));

		const port = chrome.runtime.connect({ name: 'popup-script' });
		port.postMessage({ action: 'resetState', state: state });
	}

	const updateUI = (state) => {

		if (state.error) {
			console.error('Error en la respuesta del servidor:', state.error);
			setDivContainer(() => (
				<div className="text-center">Error: {state.error}</div>
			));
			setState((prevState) => ({
				...prevState,
				loading: false,
				tempoText: false,
				error: state.error,
			}));
		} else if (state.results) {
			if (state.results.response) {
				const { response } = state.results;

				const renderList = (item) => (
					<div className="container mt-4">
						<div className="card text-bg-waring mb-4 text-left">
							<div className="card-body text-muted">
								<blockquote className="blockquote mb-0">
									{item}
								</blockquote>
							</div>
						</div>
					</div>
				);
				setIsBack(true);
				setDivContainer(() => (
					<>
						<h5 className="text-start mt-5">Sorry! 😞</h5>
						{renderList(response)}
					</>
				));
				setState((prevState) => ({
					...prevState,
					loading: false,
					tempoText: false,
					results: { response: response },
				}));
			} else {
				const { positives, negatives, improvements } = state.results;

				const renderList = (items, style) => {
					let data;
					if (style === 'info') {
						data = (
							<div className="container mt-4">
								<div className="card text-bg-info mb-4 text-left">
									<div className="card-body text-muted">
										<blockquote className="blockquote mb-0">
											{items.map((item, id) => (
												<React.Fragment key={id}>
													<p className="lh-sm">
														{id + 1}.{' '}
														{item
															.trim()
															.replace(/[-]/g, '')
															.replace(
																/^(?:\d+\.)?\s*/,
																''
															)}
													</p>
												</React.Fragment>
											))}
										</blockquote>
									</div>
								</div>
							</div>
						);
					} else if (style === 'warning') {
						data = (
							<div className="container mt-4">
								<div className="card text-bg-warning mb-4 text-left ">
									<div className="card-body text-muted">
										<blockquote className="blockquote mb-0">
											{items.map((item, id) => (
												<React.Fragment key={id}>
													<p className="lh-sm">
														{id + 1}.{' '}
														{item
															.trim()
															.replace(/[-]/g, '')
															.replace(
																/^(?:\d+\.)?\s*/,
																''
															)}
													</p>
												</React.Fragment>
											))}
										</blockquote>
									</div>
								</div>
							</div>
						);
					} else {
						data = (
							<div className="container mt-4">
								<div className="card text-bg-success text-left">
									<div className="card-body">
										<blockquote className="blockquote mb-0">
											{items.map((item, id) => (
												<React.Fragment key={id}>
													<p className="lh-sm">
														{id + 1}.{' '}
														{item
															.trim()
															.replace(/[-]/g, '')
															.replace(
																/^(?:\d+\.)?\s*/,
																''
															)}
													</p>
												</React.Fragment>
											))}
										</blockquote>
									</div>
								</div>
							</div>
						);
					}
					return data;
				}; 
				setIsBack(true);

				setDivContainer(() => (
					<>
						<h3 className="mb-3  mt-3">
							Resultados del análisis de reseñas
						</h3>
						<h5 className="text-start">Positivas 🚀</h5>
						{renderList(positives, 'info')}
						<h5 className="text-start">Negativas 😞</h5>
						{renderList(negatives, 'warning')}
						<h5 className="text-start">Mejoras 🦾</h5>
						{renderList(improvements, 'success')}
					</>
				));

				setState((prevState) => ({
					...prevState,
					loading: false,
					tempoText: false,
					results: { positives, negatives, improvements },
				}));
			}
		}
	};

	const Back = () => (<>
	<button className='btn btn-warning ms-4' onClick={handleReset}>Reset</button>
	</>)
	

	return (
		<div
			className="App"
			style={{
				height: isBack ? '100%' : '400px',
			}}
		>
			<div className="container">
				<div className="">
					<div className="pt-3 mb-3 text-center">
						<h1 className="fw-bolder">Amazon Review Analyzer</h1>
						<p>
							Analyze your reviews and get awesome suggestions to
							improve your product
						</p>
					</div>
					<h5 id="asin" className="mt-5 text-left ms-4">
						ASIN: {state.asin} {isBack ? <Back /> : null}
					</h5>
					<div className="min-div">
						{cookies ? (
							<button
								id="extractor"
								onClick={handleExtractor}
								type="button"
								className="start-btn"
								style={{
									display: `${
										state.asin ? 'none' : 'inline-block'
									}`,
								}}
							>
								GET STARTED
							</button>
						) : (
							<a
								href="https://amazon-review.vercel.app/" // change the url to the react hosted url
								target="_blank"
								rel="noreferrer"
								className="btn btn-warning text-decoration-none"
								style={{
									display: 'inline-block',
									borderRadius: '7px',
									width: '167px',
									fontSize: '1.2em',
									marginTop: '5rem',
								}}
							>
								LOGIN
							</a>
						)}

						<button
							id="analyze-reviews-button"
							onClick={handleAnalyze}
							style={{
								display: `${
									showAnalyze ? 'inline-block' : 'none'
								}`,
							}}
							className="mb-3"
						>
							ANALIZAR RESENAS
						</button>
						<div
							id="loader"
							style={{ display: `${state.loading ? 'block' : 'none'}` }}
							className="text-center"
						>
							<button
								className="loading-btn mb-3"
								type="button"
								disabled
							>
								<span
									className="spinner-border spinner-border-sm"
									role="status"
									aria-hidden="true"
								></span>
								Analyzing...
							</button>
						</div>
						<p
							id="temp-text"
							style={{
								display: `${state.tempoText ? 'block' : 'none'}`,
							}}
						>
							Analyzing your reviews, this might take a while
						</p>
					</div>
				</div>
				<div id="results-container" className="container">
					{divContainer ? divContainer : null}
				</div>
			</div>
		</div>
	);
};

export default App;
