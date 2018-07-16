/**
 * A Google sheets script for retrieving windsurfing data from Strava
 * Update conf.js
 * Call main() with a timer to run the script.
 */
function main(mode) {
  console.info('Started main().');
  // Get config based on environment
  var ENV_CONFIG = setEnvConfig(mode);
  // Check status of sheet (header etc)
  var sheet = getSheet(ENV_CONFIG);
  // Retrieves a list of activities from strava, filters them and store them as sessions
  retrieveNewActivities(sheet, ENV_CONFIG);
  // Update existing sessions with extra data
  updateSessions(sheet, ENV_CONFIG);
  // Markup all data in the sheet
  markupData(sheet, ENV_CONFIG);
}

/**
 * Retrieves new activities from strava
 */
function retrieveNewActivities(sheet, config) {
  console.info('Checking for new activities on Strava...');
  //Access the right sheet and get the date from the last entry
  var endPoint = 'athlete/activities';
  var lastSessionDate = retrieveLastDate(sheet);
  var items = getStravaItems(endPoint, lastSessionDate, sheet);
  var activities = [];

  if (items.length > 0) {
    activities = prepareActivities(items);
  } else {
    console.info('Found no new activities Strava.');
    return;
  }

  if (activities.length > 0) {
    var lastRow = sheet.getLastRow();
    var row = lastRow + 1;
    var column = 1;
    insertData(sheet, activities, row, column, config);
  } else {
    console.info('No new windsurf activities found in Strava activities.');
  }
  console.info('Finished checking for new activities on Strava.');
}

/**
 * Loops through the sheet with sessions and updates/enriches data
 */
function updateSessions(sheet, config) {
  if (config.updateSessions.enabled) {
    console.info('Updating sessions...');
    var header = getHeader(config.columns);
    var updateSessions = config.updateSessions;
    var data = {
      sessions: getSessions(sheet)
    };

    // List with updates of data
    data = updateSessionLocation(updateSessions, header, data);
    data = updateSessionUserGeneratedContent(updateSessions, header, data);
    data = updateSessionKnmiData(updateSessions, header, data);

    // Insert the updated data in the spreadsheet at once
    if (data.updated) insertData(sheet, data.sessions, 2, 1, config);
    console.info('Finished updating sessions.');
  } else {
    console.warn('Skipped updating sessions, was disabled in config.');
  }
}

/**
 * Updates the sessions array with the description from Strava
 */
function updateSessionUserGeneratedContent(updateSessions, header, data) {
  if (updateSessions.userGeneratedContent) {
    var sessions = data.sessions;
    var stravaIdIndex = header.indexOf('Strava ID');
    var nameIndex = header.indexOf('Name');
    var friendsIndex = header.indexOf('Friends');
    var descriptionIndex = header.indexOf('Description');
    var updatedSessions = 0;

    var label = 'For Loop';
    console.time(label);

    for (var i = 0; i < sessions.length; i++) {

      var endPoint = 'activities/' + sessions[i][stravaIdIndex];
      var params = '?include_all_efforts';
      var activity = getStravaItem(endPoint, params);

      // Adding name and description to the dataset
      sessions[i][nameIndex] = activity.name;
      sessions[i][friendsIndex] = activity.athlete_count;
      sessions[i][descriptionIndex] = activity.description;
      data.updated = true;
      updatedSessions++;
    }
    console.timeEnd(label);
    console.log('Updated user generated content in %s sessions.', updatedSessions);
  } else {
    console.warn('Skipped updating user generated content, was disabled in config.');
  }
  return data;
}

/**
 * Updates the sessions array with City and Country
 */
function updateSessionLocation(updateSessions, header, data) {
  if (updateSessions.location) {
    var sessions = data.sessions;
    var cityIndex = header.indexOf('City');
    var countryIndex = header.indexOf('Country');
    var latIndex = header.indexOf('Lat');
    var lngIndex = header.indexOf('Lon');
    var updatedSessions = 0;

    // Loop through the data and check for missing cities and countries
    for (var i = 0; i < sessions.length; i++) {
      if (!sessions[i][cityIndex] || !sessions[i][countryIndex]) {
        if (sessions[i][latIndex] && sessions[i][lngIndex]) {
          address_components = getLocation(sessions[i][latIndex], sessions[i][lngIndex]);

          // Adding the city and country to the dataset
          sessions[i][cityIndex] = extractFromAdress(address_components, 'locality');
          sessions[i][countryIndex] = extractFromAdress(address_components, 'country');
          data.updated = true;
          updatedSessions++;
        } else {
          var row = i + 2;
          console.warn({
            'message': 'Skipped session on row ' + row + ' because lat and lon are missing.',
            'activity': sessions[i]
          });
        }
      }
    }
    if (updatedSessions > 0) {
      console.log('Updated city and country in %s sessions.', updatedSessions);
    } else {
      console.log('Skipped updating cities and countries, nothing to update.');
    }
  } else {
    console.warn('Skipped updating session locations, was disabled in config.');
  }
  return data;
}

/**
 * Updates the sessions array with the data from KNMI
 */
function updateSessionKnmiData(updateSessions, header, data) {
  if (updateSessions.knmi) {
    var sessions = data.sessions;
    var countryIndex = header.indexOf('Country');
    var cityIndex = header.indexOf('City');
    var startDateIndex = header.indexOf('Start Date');
    var durationIndex = header.indexOf('Duration');
    var avgWindIndex = header.indexOf('Avg Wind');
    var avgGustsIndex = header.indexOf('Avg Gusts');
    var strongestGustIndex = header.indexOf('Strongest Gust');
    var avgWindDirIndex = header.indexOf('Avg Wind Dir');
    var avgTempIndex = header.indexOf('Avg Temp');

    var spotlistArray = getSpotlistArray(SPOTS);
    var updatedSessions = 0;

    for (var i = 0; i < sessions.length; i++) {
      // Check if the country is NL
      if (sessions[i][countryIndex] == 'Netherlands') {
        var city = sessions[i][cityIndex];
        // Check if the City is in the spotlist
        if (spotlistArray.indexOf(city)) {
          // Get the station ID for the spot
          //WIP console.log('Found %s of session %s.', city, sessions[i][2]);
          var knmiStn = getStationID(SPOTS, city);
          // Get the data
          if (knmiStn){
            var knmiData = getKnmiData(sessions[i], knmiStn, startDateIndex, durationIndex);
            //WIP console.log({'message' : 'Returned data from KNMI.', 'knmiData' : knmiData});
            // Add the weather data to the dataset
            sessions[i][avgWindIndex] = knmiData.avgWind;
            sessions[i][avgGustsIndex] = knmiData.avgGusts;
            //sessions[i][strongestGustIndex] = knmiData.strongestGust;
            sessions[i][avgWindDirIndex] = knmiData.avgWindDir;
            //sessions[i][avgTempIndex] = knmiData.avgTemp;
            data.updated = true;
            updatedSessions++;
          } 
        }
      }
    }
    if (updatedSessions > 0) {
      console.log({'message': 'Updated KNMI data in '+updatedSessions+' sessions.', 'data' : data});
    } else {
      console.log('Skipped updating weatherdata, nothing to update.');
    }
  } else {
    console.warn('Skipped updating KNMI data, was disabled in config.');
  }
  return data;
}

/**
 * Returns an array with the cities of the spots in te spotlist
 */
function getSpotlistArray(SPOTS) {
  spotCities = [];
  for (var i = 0; i < SPOTS.length; i++) {
    spotCities.push(SPOTS[i].locality);
  }
  console.log({
    'message': 'Returned ' + spotCities.length + ' Cities in the spotlist array.',
    'spotCities': spotCities
  });
  return spotCities;
}

/**
 * Returns all sessions in the sheet
 */
function getSessions(sheet) {

  // Set variables for range
  var startRow = 2; // Skipping the header
  var numRows = sheet.getLastRow() - 1; // -1 because startRow is 2
  var startColumn = 1; // Starting at first column
  var numColumns = sheet.getLastColumn(); // Last column
  var dataRange = sheet.getRange(startRow, startColumn, numRows, numColumns);

  var sessions = dataRange.getValues();
  console.log({
    'message': 'Returned ' + sessions.length + ' sessions from ' + sheet.getName() + '.',
    'sessions': sessions
  });

  return sessions;
}

/**
 * Calls main() in testmode
 */
function testMain() {
  var mode = 'test';
  main(mode);
}