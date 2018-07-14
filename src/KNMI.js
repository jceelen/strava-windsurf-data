/**
 * Gets data from KNMI weather API for specific session
 */
function getKnmiData(session, knmiStn, startDateIndex, durationIndex) {
    var params = getKnmiParams(session[startDateIndex], session[durationIndex]);
    var result = callKnmi(params.start, params.end, knmiStn);
    var dataArray = processKnmiData(result);
    var data = dataArray;
    //knmiData.avgWind
    //knmiData.avgGusts
    //knmiData.strongestGust
    //knmiData.avgWindDir
    //knmiData.avgTemp
    return data;
}

function getKnmiParams(start, duration){
    var params = {};    
    var startDate = new Date((start || '').replace(/-/g, '/').replace(/[TZ]/g, ' '));
    var endDate = new Date(startDate.getTime() + duration*1000);
    
    params.start = '' + startDate.getFullYear() + ('0' + (startDate.getMonth()+1)).slice(-2) + ('0' + startDate.getDate()).slice(-2) + startDate.getHours();
    params.end = '' + endDate.getFullYear() + ('0' + (endDate.getMonth()+1)).slice(-2) + ('0' + endDate.getDate()).slice(-2) + endDate.getHours();
    
    console.log('Returned start %s and end %s datestrings.', params.start, params.end);    
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

function processKnmiData(result) {
    var weatherdata = result.match(/^(?![ \t]*#).+/gm);
    console.log({
        'message': 'Removed comments from result',
        'csv': weatherdata
    });
    var array = [];

    for (var i = 0; i < weatherdata.length; i++) {
        var row = Utilities.parseCsv(weatherdata[i]);
        array.push(row[0]);
    }
    console.log({
        'message': 'Returned array with weather data',
        'array': array
    });
    return array;
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