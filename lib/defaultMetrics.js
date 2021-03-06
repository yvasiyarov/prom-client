'use strict';

const processCpuTotal = require('./metrics/processCpuTotal');
const processStartTime = require('./metrics/processStartTime');
const tick = require('./metrics/tick');
const immediate = require('./metrics/immediate');
const osMemoryHeap = require('./metrics/osMemoryHeap');
const processOpenFileDescriptors = require('./metrics/processOpenFileDescriptors');
const processMaxFileDescriptors = require('./metrics/processMaxFileDescriptors');
const eventLoopLag = require('./metrics/eventLoopLag');
const processHandles = require('./metrics/processHandles');
const processRequests = require('./metrics/processRequests');
const heapSizeAndUsed = require('./metrics/heapSizeAndUsed');
const heapSpacesSizeAndUsed = require('./metrics/heapSpacesSizeAndUsed');
const version = require('./metrics/version');
const gc = require('./metrics/gc');
const bootstrapTime = require('./metrics/bootstrapTime');
const { globalRegistry } = require('./registry');
const { printDeprecationCollectDefaultMetricsNumber } = require('./util');

const metrics = {
	processCpuTotal,
	bootstrapTime,
	processStartTime,
	tick,
	immediate,
	osMemoryHeap,
	processOpenFileDescriptors,
	processMaxFileDescriptors,
	eventLoopLag,
	processHandles,
	processRequests,
	heapSizeAndUsed,
	heapSpacesSizeAndUsed,
	version,
	gc
};
const metricsList = Object.keys(metrics);

let existingInterval = null;
// This is used to ensure the program throws on duplicate metrics during first run
// We might want to consider not supporting running the default metrics function more than once
let init = true;

module.exports = function startDefaultMetrics(config) {
	let normalizedConfig = config;
	if (typeof config === 'number') {
		printDeprecationCollectDefaultMetricsNumber(config);

		normalizedConfig = { timeout: config };
	}

	normalizedConfig = Object.assign(
		{
			timestamps: true,
			eventLoopMonitoringPrecision: 10,
			timeout: 10000,
			monitorNextTick: false,
			monitorImmediate: false
		},
		normalizedConfig
	);

	if (existingInterval !== null) {
		clearInterval(existingInterval);
	}

	const initialisedMetrics = metricsList.map(metric => {
		const defaultMetric = metrics[metric];
		if (!init) {
			defaultMetric.metricNames.map(
				globalRegistry.removeSingleMetric,
				globalRegistry
			);
		}

		return defaultMetric(normalizedConfig.register, normalizedConfig);
	});

	function updateAllMetrics() {
		initialisedMetrics.forEach(metric => metric.call());
	}

	updateAllMetrics();

	existingInterval = setInterval(
		updateAllMetrics,
		normalizedConfig.timeout
	).unref();

	init = false;

	return existingInterval;
};

module.exports.metricsList = metricsList;
