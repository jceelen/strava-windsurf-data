/**
 * Gets data from KNMI weather API for specific session
 */
function getKnmiData(session){
    session = [];
    session.start = '2015111509';
    session.end = '2015111513';
    session.station = '225';
    var result = callKnmi(session.start, session.end, session.station);
    var dataArray = processKnmiData(result);
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
    console.log({'message' : 'Retrieved data from KNMI', 'data' : data});
    return data;
}

function getKnmiPayload(start, end, station){
    var payload = 'start=' + start + '&end=' + end + '&vars=WIND%3ATEMP&stns=' + station;
    console.log({'message' : 'Returned payload for KNMI call', 'payload' : payload});
    return payload;
}

// TODO: fix multiline regexp
function processKnmiData(result){
    var weatherdata = result.match(/^(?![ \t]*#).+/gm);
    console.log({'message' : 'Removed comments from result', 'csv' : weatherdata});
    var array = [];

    for (var i = 0; i < weatherdata.length; i++) {
        var row = Utilities.parseCsv(weatherdata[i]);
        array.push(row[0]);
    }
    console.log({'message' : 'Returned array with weather data', 'array' : array});
    return array;
}