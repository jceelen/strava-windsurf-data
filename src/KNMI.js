/**
 * Gets data from KNMI weather API for specific session
 */
function getKnmiData(useCache, row, session, knmiStn, startDateIndex, durationIndex) {
    var payload = getKnmiPayload(session, knmiStn, startDateIndex, durationIndex, row);
    var result = callKnmi(useCache, payload, row);
    var weatherData = processKnmiData(result, row);
    if (weatherData == null) {
        return;
    } else {
        var calculatedData = getCalculatedData(weatherData, row);

        var knmiData = {};
        if (calculatedData.FH) knmiData.avgWind = dmsToKts(calculatedData.FH.average);
        if (calculatedData.FX) knmiData.avgGusts = dmsToKts(calculatedData.FX.average);
        if (calculatedData.FX) knmiData.strongestGust = calculatedData.FX.max;
        if (calculatedData.DD) knmiData.avgWindDir = calculatedData.DD.average;
        if (calculatedData.T) knmiData.avgTemp = calculatedData.T.average / 10;
        return knmiData;
    }
}

/**
 * Posts the request to the KNMI service
 */
function callKnmi(useCache, payload, row) {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(payload);
    if (cached != null && useCache) {
        console.log({
            'message': 'Retrieved KNMI data from cache for session on row ' + row + '.',
            'data': data
        });
        return cached;
    }
    var postUrl = 'http://projects.knmi.nl/klimatologie/uurgegevens/getdata_uur.cgi';
    var params = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: "POST",
        payload: payload,
        muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(postUrl, params);
    var data = response.getContentText();
    cache.put(payload, data, 21600);
    console.log({
        'message': 'Retrieved KNMI data from webservice for session on row ' + row + '.',
        'data': data
    });
    return data;
}

function getKnmiPayload(session, station, startDateIndex, durationIndex, row) {
    // Prepare the start of the session
    var start = session[startDateIndex];
    var startDate = new Date((start || '').replace(/-/g, '/').replace(/[TZ]/g, ' '));
    start = '' + startDate.getFullYear() + ('0' + (startDate.getMonth() + 1)).slice(-2) + ('0' + startDate.getDate()).slice(-2) + startDate.getHours();

    // Prepare the end of the session
    var duration = session[durationIndex];
    var endDate = new Date(startDate.getTime() + duration * 1000);
    var end = '' + endDate.getFullYear() + ('0' + (endDate.getMonth() + 1)).slice(-2) + ('0' + endDate.getDate()).slice(-2) + endDate.getHours();

    // Create the payload
    var payload = 'start=' + start + '&end=' + end + '&vars=ALL&stns=' + station;

    console.log({
        'message': 'Returned payload for KNMI call for session on row ' + row + '.',
        'payload': payload
    });
    return payload;
}


/**
 * Returns an array of data from the result of the KNMI call
 */

function processKnmiData(knmiData, row) {
    var weatherData = [];
    // default header with all variables
    var header = ['STN', 'YYYYMMDD', 'HH', 'DD', 'FH', 'FF', 'FX', 'T', 'T10', 'TD', 'SQ', 'Q', 'DR', 'RH', 'P', 'VV', 'N', 'U', 'WW', 'IX', 'M', 'R', 'S', 'O', 'Y'];
    // remove comments from result
    knmiData = knmiData.match(/^(?![ \t]*#).+/gm);
    if (knmiData == null) {
        console.warn('No weather data found at station for session on row %s.', row);
    } else {
        // add default header to array
        weatherData.push(header);
        // add the metrcis for each hour in the array
        for (var i = 0; i < knmiData.length; i++) {
            // remove all whitespaces and tabs from the string
            var hourData = knmiData[i].replace(/^\s+|\s+$|\s+/gm, '');
            // parse the csv as an array
            hourData = Utilities.parseCsv(hourData);

            // store the hourData array in a new array
            weatherData.push(hourData[0]);
        }

        // switch rows and columns
        weatherData = ArrayLib.transpose(weatherData);
        // remove spaces and tabs from result
        weatherData = cleanWeatherData(weatherData);
        console.log({
            'message': 'Returned array with weather data for  session on row ' + row + '.',
            'array': weatherData
        });
        return weatherData;
    }
}

/**
 * Returns the id of the KNMI station
 */
function getStationID(SPOTS, city) {
    for (var i = 0; i < SPOTS.length; i++) {
        if (SPOTS[i].locality == city) {
            if (SPOTS[i].knmiStn == null) {
                console.warn('No station id found for %s.', city);
            } else {
                console.log('Returned station id %s for %s.', SPOTS[i].knmiStn, city);
                return SPOTS[i].knmiStn;
            }
        }
    }
}

/**
 * Returns avarage of a column in a 2 dimensional array
 */
function getCalculatedData(weatherData, row) {
    var calculatedData = getWeatherTypes(weatherData);

    // skip the STN, Date and Hour and loop through the other items
    for (var i = 0; i < weatherData.length; i++) {
        var sum = 0;
        var weatherCondition = weatherData[i][0];
        var items = weatherData[i].length - 1;
        var max = Math.max(weatherData[i]);
        //console.log('Found max %s for %s', max, weatherData[i][0]);
        // skip the header and sum all items in the array
        for (var j = 1; j < weatherData[i].length; j++) {
            sum = +(sum || 0) + Number(weatherData[i][j]);
        }
        // store the key and the average in the dictionary
        average = sum / items;
        calculatedData[0][weatherCondition].average = average;
        //if(!isNaN(max)) calculatedData[0][weatherCondition].max = max;
    }
    console.log({
        'message': 'Returned calculated weather data for  session on row ' + row + '.',
        'calculatedData': calculatedData[0]
    });

    return calculatedData[0];
}

function cleanWeatherData(weatherData) {
    result = [];
    for (var i = 0; i < weatherData.length; i++) {
        if (weatherData[i][1] != '') result.push(weatherData[i]);
    }
    return result;
}

function getWeatherTypes(dataArray) {
    calculatedData = [{}];
    for (var i = 0; i < dataArray.length; i++) {
        weatherCondition = dataArray[i][0];
        calculatedData[0][weatherCondition] = {
            type: dataArray[i][0]
        };
    }
    console.log({
        'message': 'Returned all weather types from weather data',
        'averages': calculatedData
    });
    return calculatedData;
}

function dmsToKts(ms) {
    return ms * 0.194384449;
}