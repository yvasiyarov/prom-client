'use strict';
const Summary = require('../summary');

let perf_hooks;
let async_hooks;

try {
	// eslint-disable-next-line
	perf_hooks = require('perf_hooks');
	// eslint-disable-next-line
	async_hooks = require('async_hooks');
} catch (e) {
	// node version is too old
}

const NODEJS_IMMEDIATE_DURATION_SUMMARY = 'nodejs_immediate_duration_summary';

module.exports = (registry, config = {}) => {
	if (!perf_hooks || !async_hooks || !config.monitorImmediate) {
		return () => {};
	}

	const namePrefix = config.prefix ? config.prefix : '';
	const immediateDurationSummary = new Summary({
		name: namePrefix + NODEJS_IMMEDIATE_DURATION_SUMMARY,
		help: 'Summary of callbacks executed by setImmediate()',
		maxAgeSeconds: 600,
		ageBuckets: 5,
		percentiles: [0.5, 0.75, 0.9, 0.99],
		registers: registry ? [registry] : undefined
	});

	const obs = new perf_hooks.PerformanceObserver(list => {
		const entries = list.getEntries();
		for (let i = 0; i < entries.length; i++) {
			if (config.timestamps) {
				immediateDurationSummary.observe(
					{},
					entries[i].duration / 1000,
					entries[i].startTime
				);
			} else {
				immediateDurationSummary.observe({}, entries[i].duration / 1000);
			}
		}
	});
	obs.observe({ entryTypes: ['measure'], buffered: true });

	const idToCallbackName = new Map();
	// eslint-disable-next-line
	const hook = async_hooks.createHook({
		init(id, type, triggerAsyncId, resource) {
			if (type === 'Immediate') {
				idToCallbackName[id] = resource._onImmediate.name
					? resource._onImmediate.name
					: `Immediate-${id}`;
			}
		},
		before(id) {
			if (typeof idToCallbackName[id] !== 'undefined') {
				perf_hooks.performance.mark(`Immediate-${id}-Before`);
			}
		},
		after(id) {
			if (typeof idToCallbackName[id] !== 'undefined') {
				perf_hooks.performance.mark(`Immediate-${id}-After`);
			}
		},
		destroy(id) {
			if (typeof idToCallbackName[id] !== 'undefined') {
				perf_hooks.performance.measure(
					idToCallbackName[id],
					`Immediate-${id}-Before`,
					`Immediate-${id}-After`
				);

				idToCallbackName.delete(id);
			}
		}
	});
	hook.enable();

	return () => {};
};

module.exports.metricNames = [NODEJS_IMMEDIATE_DURATION_SUMMARY];
