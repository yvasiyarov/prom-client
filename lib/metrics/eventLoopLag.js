'use strict';
const Gauge = require('../gauge');

// Check if perf_hooks module is available
let perf_hooks;
try {
	// eslint-disable-next-line
	perf_hooks = require('perf_hooks');
} catch (e) {
	// node version is too old
}

const NODEJS_EVENTLOOP_LAG = 'nodejs_eventloop_lag_seconds';
const NODEJS_EVENTLOOP_LAG_MIN = 'nodejs_eventloop_lag_min_seconds';
const NODEJS_EVENTLOOP_LAG_MAX = 'nodejs_eventloop_lag_max_seconds';
const NODEJS_EVENTLOOP_LAG_MEAN = 'nodejs_eventloop_lag_mean_seconds';
const NODEJS_EVENTLOOP_LAG_STDDEV = 'nodejs_eventloop_lag_stddev_seconds';
const NODEJS_EVENTLOOP_LAG_P50 = 'nodejs_eventloop_lag_p50_seconds';
const NODEJS_EVENTLOOP_LAG_P90 = 'nodejs_eventloop_lag_p90_seconds';
const NODEJS_EVENTLOOP_LAG_P99 = 'nodejs_eventloop_lag_p99_seconds';

function reportEventloopLag(start, gauge, timestamps) {
	const delta = process.hrtime(start);
	const nanosec = delta[0] * 1e9 + delta[1];
	const seconds = nanosec / 1e9;

	if (timestamps) {
		gauge.set(seconds, Date.now());
	} else {
		gauge.set(seconds);
	}
}

module.exports = (registry, config = {}) => {
	const namePrefix = config.prefix ? config.prefix : '';

	const lag = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG,
		help: 'Lag of event loop in seconds.',
		registers: registry ? [registry] : undefined,
		aggregator: 'average'
	});
	const lagMin = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG_MIN,
		help: 'The minimum recorded event loop delay.',
		registers: registry ? [registry] : undefined
	});
	const lagMax = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG_MAX,
		help: 'The maximum recorded event loop delay.',
		registers: registry ? [registry] : undefined
	});
	const lagMean = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG_MEAN,
		help: 'The mean of the recorded event loop delays.',
		registers: registry ? [registry] : undefined
	});
	const lagStddev = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG_STDDEV,
		help: 'The standard deviation of the recorded event loop delays.',
		registers: registry ? [registry] : undefined
	});
	const lagP50 = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG_P50,
		help: 'The 50 percentile of the recorded event loop delays.',
		registers: registry ? [registry] : undefined
	});
	const lagP90 = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG_P90,
		help: 'The 90 percentile of the recorded event loop delays.',
		registers: registry ? [registry] : undefined
	});
	const lagP99 = new Gauge({
		name: namePrefix + NODEJS_EVENTLOOP_LAG_P99,
		help: 'The 99 percentile of the recorded event loop delays.',
		registers: registry ? [registry] : undefined
	});

	// eslint-disable-next-line
	if (!perf_hooks || !perf_hooks.monitorEventLoopDelay) {
		return () => {
			const start = process.hrtime();
			setImmediate(reportEventloopLag, start, lag, config.timestamps);
		};
	}

	// eslint-disable-next-line
	const histogram = perf_hooks.monitorEventLoopDelay({
		resolution: config.eventLoopMonitoringPrecision
	});
	histogram.enable();

	return () => {
		if (config.timestamps) {
			const now = Date.now();

			//event loop lag now reported as mean event loop lag
			lag.set(histogram.mean / 1e9, now);

			lagMin.set(histogram.min / 1e9, now);
			lagMax.set(histogram.max / 1e9, now);
			lagMean.set(histogram.mean / 1e9, now);
			lagStddev.set(histogram.stddev / 1e9, now);
			lagP50.set(histogram.percentile(50) / 1e9, now);
			lagP90.set(histogram.percentile(90) / 1e9, now);
			lagP99.set(histogram.percentile(99) / 1e9, now);
		} else {
			//event loop lag now reported as mean event loop lag
			lag.set(histogram.mean / 1e9);

			lagMin.set(histogram.min / 1e9);
			lagMax.set(histogram.max / 1e9);
			lagMean.set(histogram.mean / 1e9);
			lagStddev.set(histogram.stddev / 1e9);
			lagP50.set(histogram.percentile(50) / 1e9);
			lagP90.set(histogram.percentile(90) / 1e9);
			lagP99.set(histogram.percentile(99) / 1e9);
		}
	};
};

module.exports.metricNames = [
	NODEJS_EVENTLOOP_LAG,
	NODEJS_EVENTLOOP_LAG_MIN,
	NODEJS_EVENTLOOP_LAG_MAX,
	NODEJS_EVENTLOOP_LAG_MEAN,
	NODEJS_EVENTLOOP_LAG_STDDEV,
	NODEJS_EVENTLOOP_LAG_P50,
	NODEJS_EVENTLOOP_LAG_P90,
	NODEJS_EVENTLOOP_LAG_P99
];
