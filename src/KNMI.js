/**
 * Gets data from KNMI weather API for specific session
 */
function getKnmiData(session, knmiStn, startDateIndex, durationIndex) {
    var params = getKnmiParams(session[startDateIndex], session[durationIndex]);
    var result = callKnmi(params.start, params.end, knmiStn);
    var weatherData = processKnmiData(result);
    var calculatedData = getCalculatedData(weatherData);
    var knmiData = {
        avgWind: dmsToKts(calculatedData.FH.average),
        avgGusts : dmsToKts(calculatedData.FX.average),
        //strongestGust : calculatedData[0].FX.max
        avgWindDir : calculatedData.DD.average,
        //avgTemp : calculatedData.T.average
    };
    return knmiData;
}

function getKnmiParams(start, duration) {
    var params = {};
    var startDate = new Date((start || '').replace(/-/g, '/').replace(/[TZ]/g, ' '));
    var endDate = new Date(startDate.getTime() + duration * 1000);

    params.start = '' + startDate.getFullYear() + ('0' + (startDate.getMonth() + 1)).slice(-2) + ('0' + startDate.getDate()).slice(-2) + startDate.getHours();
    params.end = '' + endDate.getFullYear() + ('0' + (endDate.getMonth() + 1)).slice(-2) + ('0' + endDate.getDate()).slice(-2) + endDate.getHours();

    console.log('Returned params: start %s and end %s.', params.start, params.end);
    return params;
}

/**
 * Posts the request to the KNMI service
 */
function callKnmi(start, end, station) {
    var postUrl = 'http://projects.knmi.nl/klimatologie/uurgegevens/getdata_uur.cgi';
    var payload = getKnmiPayload(start, end, station);

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
    console.log({
        'message': 'Retrieved data from KNMI',
        'data': data
    });
    return data;
}

function getKnmiPayload(start, end, station) {
    var payload = 'start=' + start + '&end=' + end + '&vars=ALL&stns=' + station;
    console.log({
        'message': 'Returned payload for KNMI call',
        'payload': payload
    });
    return payload;
}


/**
 * Returns an array of data from the result of the KNMI call
 */

function processKnmiData(knmiData) {
    var weatherData = [];
    // default header with all variables
    var header = ['STN', 'YYYYMMDD', 'HH', 'DD', 'FH', 'FF', 'FX', 'T', 'T10', 'TD', 'SQ', 'Q', 'DR', 'RH', 'P', 'VV', 'N', 'U', 'WW', 'IX', 'M', 'R', 'S', 'O', 'Y'];
    // remove comments from result
    knmiData = knmiData.match(/^(?![ \t]*#).+/gm);

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
        'message': 'Returned array with weather data',
        'array': weatherData
    });
    return weatherData;
}

/**
 * Returns the id of the KNMI station
 */
function getStationID(SPOTS, city) {
    for (var i = 0; i < SPOTS.length; i++) {
        if (SPOTS[i].locality == city) {
            if (SPOTS[i].knmiStn == null) {
                console.log('No station id found for %s.', city);
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
function getCalculatedData(weatherData) {
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
        'message': 'Returned calculated weather data.',
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
    return ms*0.194384449;
}