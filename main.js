'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const ioBLib = require('@strathcole/iob-lib').ioBLib;

const apiurl = 'https://api.darksky.net/forecast/';
const adapterName = require('./package.json').name.split('.').pop();

let adapter;
var secretKey;
var request = require('request');

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: 'darksky'
	});

	adapter = new utils.Adapter(options);
	ioBLib.init(adapter);

	adapter.on('unload', function(callback) {
		adapter.log.info('[END] Stopping DarkSky adapter...');
		callback && callback();
	});

	adapter.on('ready', function() {
		if(!adapter.config.secretKey) {
			adapter.log.warn('[START] API key not set');
			adapter.stop();
		} else {
			adapter.log.info('[START] Starting DarkSky adapter');
			adapter.getForeignObject('system.config', (err, obj) => {
				if (obj && obj.native && obj.native.secret) {
					//noinspection JSUnresolvedVariable
					adapter.config.secretKey = ioBLib.decrypt(obj.native.secret, adapter.config.secretKey);
				} else {
					//noinspection JSUnresolvedVariable
					adapter.config.secretKey = ioBLib.decrypt('ZgfrC6gFeD1jJOM', adapter.config.secretKey);
				}

				if(obj && obj.common) {
					adapter.config.iob_lon = obj.common.longitude;
					adapter.config.iob_lat = obj.common.latitude;
				}


				if(!adapter.config.iob_lon || !adapter.config.iob_lat) {
					adapter.log.warn('Could not start adapter because the system\'s longitude and latitude were not found. Please check system config.');
					adapter.stop();
					return;
				}

				main();
			});
		}
	});

	return adapter;
}


function main() {
	secretKey = adapter.config.secretKey;

	let req_opts = {url: apiurl + secretKey + '/' + adapter.config.iob_lat + ',' + adapter.config.iob_lon + '?units=si&lang=de', method: 'GET'};
	request(req_opts, function (error, response, body) {
		//adapter.log.info('Request result: ' + JSON.stringify([error, response, body]));
		if(error || !response || !response.statusCode || response.statusCode != 200) {
			adapter.log.warn('API request failed with code ' + (response && response.statusCode || 'unknown') + ': ' + JSON.stringify([req_opts]));
			adapter.stop();
			return;
		}

		body = JSON.parse(body);

		ioBLib.setOrUpdateState('latitude', 'Latitude', body.latitude, '°', 'number', 'value.gps.latitude');
		ioBLib.setOrUpdateState('longitude', 'Longitude', body.longitude, '°', 'number', 'value.gps.longitude');
		ioBLib.setOrUpdateState('timezone', 'Time zone', body.timezone, '', 'string', 'text');

		ioBLib.setOrUpdateState('current.time', 'Time of values', (body.currently.time * 1000), '', 'number', 'date');

		ioBLib.setOrUpdateState('current.summary', 'Weather', body.currently.summary, '','string', 'text');
		ioBLib.setOrUpdateState('current.icon', 'Weather icon', body.currently.icon, '', 'string', 'text');
		ioBLib.setOrUpdateState('current.precipIntensity', 'Precipitation intensity', body.currently.precipIntensity, 'mm/h', 'number', 'value');
		ioBLib.setOrUpdateState('current.precipProbability', 'Precipitation probability', (body.currently.precipProbability * 100), '%', 'number', 'value.probability');
		ioBLib.setOrUpdateState('current.precipType', 'Precipitation type', body.currently.precipType, '', 'string', 'text');
		ioBLib.setOrUpdateState('current.temperature', 'Temperature', body.currently.temperature, '°C', 'number', 'value.temperature');
		ioBLib.setOrUpdateState('current.apparentTemperature', 'Apparent temperature', body.currently.apparentTemperature, '°C', 'number', 'value.temperature');
		ioBLib.setOrUpdateState('current.dewPoint', 'Dew point', body.currently.dewPoint, '°C', 'number', 'value.temperature');
		ioBLib.setOrUpdateState('current.humidity', 'Humidity', (body.currently.humidity * 100), '%', 'number', 'value.humidity');
		ioBLib.setOrUpdateState('current.pressure', 'Pressure', body.currently.pressure, 'hPa', 'number', 'value.pressure');
		ioBLib.setOrUpdateState('current.windSpeed', 'Wind speed', body.currently.windSpeed, 'm/s', 'number', 'value.speed');
		ioBLib.setOrUpdateState('current.windGust', 'Wind gust', body.currently.windGust, 'm/s', 'number', 'value.speed');
		ioBLib.setOrUpdateState('current.windBearing', 'Wind bearing', body.currently.windBearing, '°', 'number', 'value.direction');
		ioBLib.setOrUpdateState('current.cloudCover', 'Cloud coverage', (body.currently.cloudCover * 100), '%', 'number', 'value');
		ioBLib.setOrUpdateState('current.uvIndex', 'UV index', body.currently.uvIndex, '', 'number', 'value');
		ioBLib.setOrUpdateState('current.visibility', 'Visibility', body.currently.visibility, 'km', 'number', 'value.distance.visibility');
		ioBLib.setOrUpdateState('current.ozone', 'Ozone', body.currently.ozone, 'DU', 'number', 'value');

		ioBLib.setOrUpdateState('hourly.summary', 'Weather', body.hourly.summary, '','string', 'text');

		let i = 0;
		body.hourly.data.forEach(function(value) {
			ioBLib.setOrUpdateState('hourly.' + i + '.time', 'Time of values', (value.time * 1000), '', 'number', 'date');

			ioBLib.setOrUpdateState('hourly.' + i + '.summary', 'Weather', value.summary, '', 'string', 'text');
			ioBLib.setOrUpdateState('hourly.' + i + '.icon', 'Weather icon', value.icon, '', 'string', 'text');
			ioBLib.setOrUpdateState('hourly.' + i + '.precipIntensity', 'Precipitation intensity', value.precipIntensity, 'mm/h', 'number', 'value');
			ioBLib.setOrUpdateState('hourly.' + i + '.precipProbability', 'Precipitation probability', (value.precipProbability * 100), '%', 'number', 'value.probability');
			ioBLib.setOrUpdateState('hourly.' + i + '.precipType', 'Precipitation type', value.precipType, '', 'string', 'text');
			ioBLib.setOrUpdateState('hourly.' + i + '.temperature', 'Temperature', value.temperature, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('hourly.' + i + '.apparentTemperature', 'Apparent temperature', value.apparentTemperature, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('hourly.' + i + '.dewPoint', 'Dew point', value.dewPoint, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('hourly.' + i + '.humidity', 'Hunidity', (value.humidity * 100), '%', 'number', 'value.humidity');
			ioBLib.setOrUpdateState('hourly.' + i + '.pressure', 'Pressure', value.pressure, 'hPa', 'number', 'value.pressure');
			ioBLib.setOrUpdateState('hourly.' + i + '.windSpeed', 'Wind speed', value.windSpeed, 'm/s', 'number', 'value.speed');
			ioBLib.setOrUpdateState('hourly.' + i + '.windGust', 'Wind gust', value.windGust, 'm/s', 'number', 'value.speed');
			ioBLib.setOrUpdateState('hourly.' + i + '.windBearing', 'Wind bearing', value.windBearing, '°', 'number', 'value.direction');
			ioBLib.setOrUpdateState('hourly.' + i + '.cloudCover', 'Cloud coverage', (value.cloudCover * 100), '%', 'number', 'value');
			ioBLib.setOrUpdateState('hourly.' + i + '.uvIndex', 'UV index', value.uvIndex, '', 'number', 'value');
			ioBLib.setOrUpdateState('hourly.' + i + '.visibility', 'Visibility', value.visibility, 'km', 'number', 'value.distance.visibility');
			ioBLib.setOrUpdateState('hourly.' + i + '.ozone', 'Ozone', value.ozone, 'DU', 'number', 'value');

			i++;
		});

		ioBLib.setOrUpdateState('daily.summary', 'Weather', body.daily.summary, '','string', 'text');

		i = 0;
		body.daily.data.forEach(function(value) {
			ioBLib.setOrUpdateState('daily.' + i + '.time', 'Time of values', (value.time * 1000), '', 'number', 'date');

			ioBLib.setOrUpdateState('daily.' + i + '.summary', 'Weather', value.summary, '', 'string', 'text');
			ioBLib.setOrUpdateState('daily.' + i + '.icon', 'Weather icon', value.icon, '', 'string', 'text');

			ioBLib.setOrUpdateState('daily.' + i + '.sunriseTime', 'Time of sunrise', (value.sunriseTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.sunsetTime', 'Time of sunset', (value.sunsetTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.moonPhase', 'Moon phase', (value.moonPhase * 100), '%', 'number', 'value');

			ioBLib.setOrUpdateState('daily.' + i + '.precipIntensity', 'Precipitation intensity', value.precipIntensity, 'mm/h', 'number', 'value');
			ioBLib.setOrUpdateState('daily.' + i + '.precipIntensityMax', 'Max. precipitation intensity', value.precipIntensityMax, 'mm/h', 'number', 'value');
			ioBLib.setOrUpdateState('daily.' + i + '.precipIntensityMaxTime', 'Max precipitation time', (value.precipIntensityMaxTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.precipProbability', 'Precipitation probability', (value.precipProbability * 100), '%', 'number', 'value.probability');
			ioBLib.setOrUpdateState('daily.' + i + '.precipType', 'Precipitation type', value.precipType, '', 'string', 'text');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureLow', 'Temperature low', value.temperatureLow, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureLowTime', 'Temperature low time', (value.temperatureLowTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureHigh', 'Temperature high', value.temperatureHigh, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureHighTime', 'Temperature high time', (value.temperatureHighTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureLow', 'Apparent temperature low', value.apparentTemperatureLow, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureLowTime', 'Apparent temperature low time', (value.apparentTemperatureLowTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureHigh', 'Apparent temperature high', value.apparentTemperatureHigh, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureHighTime', 'Apparent temperature high time', (value.apparentTemperatureHighTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureMin', 'Min. temperature', value.temperatureMin, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureMinTime', 'Min. temperature time', (value.temperatureMinTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureMax', 'Max. temperature', value.temperatureMax, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.temperatureMaxTime', 'Max. temperature time', (value.temperatureMaxTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureMin', 'Min. apparent temperature', value.apparentTemperatureMin, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureMinTime', 'Min. apparent temperature time', (value.apparentTemperatureMinTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureMax', 'Max. apparent temperature', value.apparentTemperatureMax, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.apparentTemperatureMaxTime', 'Max. apparent temperature time', (value.apparentTemperatureMaxTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.dewPoint', 'Dew point', value.dewPoint, '°C', 'number', 'value.temperature');
			ioBLib.setOrUpdateState('daily.' + i + '.humidity', 'Hunidity', (value.humidity * 100), '%', 'number', 'value.humidity');
			ioBLib.setOrUpdateState('daily.' + i + '.pressure', 'Pressure', value.pressure, 'hPa', 'number', 'value.pressure');
			ioBLib.setOrUpdateState('daily.' + i + '.windSpeed', 'Wind speed', value.windSpeed, 'm/s', 'number', 'value.speed');
			ioBLib.setOrUpdateState('daily.' + i + '.windGust', 'Wind gust', value.windGust, 'm/s', 'number', 'value.speed');
			ioBLib.setOrUpdateState('daily.' + i + '.windGustTime', 'Wind gust time', (value.windGustTime * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.windBearing', 'Wind bearing', value.windBearing, '°', 'number', 'value.direction');
			ioBLib.setOrUpdateState('daily.' + i + '.cloudCover', 'Cloud coverage', (value.cloudCover * 100), '%', 'number', 'value');
			ioBLib.setOrUpdateState('daily.' + i + '.uvIndex', 'UV index', value.uvIndex, '', 'number', 'value');
			ioBLib.setOrUpdateState('daily.' + i + '.uvIndexTime', 'UV index time', (value.uvIndex * 1000), '', 'number', 'date');
			ioBLib.setOrUpdateState('daily.' + i + '.visibility', 'Visibility', value.visibility, 'km', 'number', 'value.distance.visibility');
			ioBLib.setOrUpdateState('daily.' + i + '.ozone', 'Ozone', value.ozone, 'DU', 'number', 'value');

			i++;
		});

		setTimeout(function() {
			adapter.stop();
		}, 5000);
	});
}

// If started as allInOne/compact mode => return function to create instance
if(module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
} // endElse
