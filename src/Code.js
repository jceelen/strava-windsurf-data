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
  var sheet = getSheet(ENV_CONFIG.sheetName, ENV_CONFIG.header);

  // Subprocess retrieves a list of activities and filters them
  retrieveNewActivities(sheet);
  
  // Update existing activities with extra data
  updateActivities(ENV_CONFIG, sheet);
}

/**
 * Retrieves new activities from strava
 */
function retrieveNewActivities(sheet) {
  console.info('Checking for new activities...');
  //Access the right sheet and get the date from the last entry
  var endPoint = 'athlete/activities';
  var lastActivityDate = retrieveLastDate(sheet);
  var items = getStravaItems(endPoint, lastActivityDate,sheet);
  var activities = [];

  if (items.length > 0) {
    activities = prepareActivities(items);    
  } else {
    console.info('Found no new activities Strava.');
    return;
  }

  if (activities.length > 0) {
    var lastRow = sheet.getLastRow();
    var row = lastRow+1;
    var column = 1;
    insertData(sheet, activities, row, column);
  } else {console.info('No new windsurf activities found in Strava activities.');}
}

/**
 * Loops through the sheet with activities and updates/enriches data
 */
function updateActivities(config, sheet) {
  if(config.updateActivities) {
    console.info('Updating activities...');
    var data = {activities : getActivities(sheet)};
    
    // List with updates of data
    data = updateActivityLocation(config.header, data, sheet);
    data = updateActivityUserGeneratedContent(config.header, data, sheet);
    // Insert the updated data in the spreadsheet at once
    if (data.updated) insertData(sheet, data.activities, 2, 1);
  } else {
    console.warn('Skipped updating activities, was disabled in config.');
  }
  
}

/**
 * Updates the activities array with the description from Strava
 */
function updateActivityUserGeneratedContent(header, data, sheet) {
  var activities = data.activities;
  var stravaIdIndex = header.indexOf('Strava ID');
  var nameIndex = header.indexOf('Name');
  var friendsIndex = header.indexOf('Friends');
  var descriptionIndex = header.indexOf('Description');
  var updatedActivities = 0;
  
  var label = 'For Loop';
  console.time(label);

  for (var i = 0; i < activities.length; i++) {
    
    var endPoint = 'activities/' + activities[i][stravaIdIndex];
    var params = '?include_all_efforts';
    var activity = getStravaItem(endPoint, params);
    
    // Adding name and description to the dataset
    activities[i][nameIndex] = activity.name;
    activities[i][friendsIndex] = activity.athlete_count;
    activities[i][descriptionIndex] = activity.description;
    data.updated = true;
    updatedActivities++;
  }
  console.timeEnd(label);
  console.log('Updated user generated content in %s activities.', updatedActivities);
  return data;
}

/**
 * Updates the activities array with City and Country
 */
function updateActivityLocation(header, data){
  var activities = data.activities;
  var cityIndex = header.indexOf('City');
  var countryIndex = header.indexOf('Country');
  var latIndex = header.indexOf('Latitude');
  var lngIndex = header.indexOf('Longitude');
  var updatedActivities = 0;
  
  // Loop through the data and check for missing cities and countries
  for (var i = 0; i < activities.length; i++) {
    if(!activities[i][cityIndex]||!activities[i][countryIndex]) {
      if (activities[i][latIndex] && activities[i][lngIndex]) {
        address_components = getLocation(activities[i][latIndex], activities[i][lngIndex]);      
        
        // Adding the city and country to the dataset
        activities[i][cityIndex] = extractFromAdress(address_components, 'locality');
        activities[i][countryIndex] = extractFromAdress(address_components, 'country');
        data.updated = true;
        updatedActivities++;
      } else {
        var row = i + 2;
        console.warn({'message' : 'Skipped activity on row '+ row +' because lat and lng are missing.', 
                     'activity' : activities[i]});
      }
    }
  }
  console.log('Updated city and country in %s activities.', updatedActivities);
  return data;
}

/**
 * Returns all activities in the sheet
 */
function getActivities(sheet){

  // Set variables for range
  var startRow = 2; // Skipping the header
  var numRows = sheet.getLastRow() - 1; // -1 because startRow is 2
  var startColumn = 1; // Starting at first column
  var numColumns = sheet.getLastColumn(); // Last column
  var dataRange = sheet.getRange(startRow, startColumn, numRows, numColumns);
  
  var activities = dataRange.getValues();
  console.log({'message': 'Returned ' + activities.length + ' activities from ' + sheet.getName() + '.', 
  'activities': activities});
  
  return activities;
}

/**
 * Returns an object a single item strava
 */
function getStravaItem(endPoint, params) {
  var item = callStrava(endPoint, params);
  return item;
}

/**
 * Returns an object with multiple items from strava 
 * Condition: no call should be made if the activity date of the last
 * call (stored as property) is the same or before the current last activity
 */
function getStravaItems(endPoint, lastActivityDate) {
  var per_page = 30;
  var page = 1;
  var result = [];
  var items = [];

  // Create params and make the strava call
  do {
    var params = '?after=' + lastActivityDate + '&per_page=' + per_page + '&page=' + page;
    result = callStrava(endPoint, params, page);

    // Add the data to the array items
    for (var i = 0; i < result.length; i++) {
      items.push(result[i]);
    }
    // Increment the page to retrieve the next page in the loop
    page++;

  } while (result.length == per_page);
  return items;
}

/**
 * Returns a response from a call to the Strava API
 */
function callStrava(endPoint, params){
  var baseUrl = 'https://www.strava.com/api/v3/';
  var url = baseUrl + endPoint + params;
  var service = getStravaService();

  // Check if the authorisation is working
  if (!service.hasAccess()) {
    var authorizationUrl = service.getAuthorizationUrl();
    // Log error to default logger
    Logger.log('Authorization failed! Open the following URL to authorize and re-run the script: %s',
    authorizationUrl);

    // Log error to Stackdriver logger
    console.error('Authorization failed! Open the following URL to authorize and re-run the script: %s',
    authorizationUrl);

    throw new Error('Missing Strava authorization, check log for details.');
  } else {  
    // Make the call to Strava
    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var result = JSON.parse(response.getContentText());
    if (result.length > 0) console.log({'message': 'Retrieved ' + result.length + ' item(s) from Strava.', 
                   'result': result});
    return result;
    
  // If there is no authorization, log the authorization URL
  }
}

/**
 * Returns an array of items filterd for windsurf activities converted and formated to insert in the sheet
 */
function prepareActivities(items) {
  var activities = [];
  var start_lat = '';
  var start_long = '';

  // Loop through the result, filter and prepare the data
  for (var i = 0; i < items.length; i++) {
    if (items[i].type == 'Windsurf') {
      console.log({'message': 'Found a windsurf activity on index ' + i +' of ' + items.length + ' items.', 
      'items': items[i]});
      
      if (items[i].start_latlng !== null) {
        start_lat = items[i].start_latlng[0];
        start_long = items[i].start_latlng[1];
      }
      // Format all data before inserting it into the sheet
      var item = [items[i].start_date_local,
                  items[i].id,
                  items[i].name,
                  items[i].distance/1000,
                  items[i].elapsed_time,
                  items[i].average_speed/0.27777777777778,
                  items[i].max_speed/0.27777777777778,
                  start_lat,
                  start_long];
      activities.push(item);
    }
  }
  console.log('Filtered '+ items.length + ' items and found ' + activities.length + ' windsurf activities. Prepared them for insertion.');
  return activities;
}

/**
 * Sets the global configuration based on the environment
 */
function setEnvConfig(mode){
  if (mode == 'test') {
    console.warn('Running in testmode.'); 
    environment = 'test';
  } else {
    environment = 'prod';
  }
  var config = ENV_SETTINGS[0][environment];
  console.log({'message': 'Loaded configuration settings for ' + environment + '.', 
                'ENV_CONFIG': config});
  return config;
}

/**
 * Returns the sheet defined in the config
 */
function getSheet(sheetName, header) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(spreadsheet, sheetName);
  ensureHeader(header, sheet);
  return sheet;  
}
/**
 * Gets or creates a sheet in the spreadsheet document with the correct name
 */
function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    console.warn('Sheet %s does not exists, created new sheet.', sheetName);
    sheet = spreadsheet.insertSheet(sheetName);
  }
  console.log('Returned the sheet: ' + sheetName);
  return sheet;
}

/**
 * Checks for a header and create one if not available
 */
function ensureHeader(header, sheet) {
  // If there is a header
  if (sheet.getLastRow() > 0){
    // Get the values from the sheet and the config file
    var headerString = JSON.stringify(header);
    var sheetHeaderString = JSON.stringify(getSheetHeader(sheet)[0]);
    // Compare the header from the sheet with the config
    if (sheetHeaderString != headerString) {
      sheet.clear();
      insertData(sheet, [header], 1 , 1);
      console.warn({'message' : 'Found incorrect header, cleared sheet and updated header.', 
                    'header' : header});
    } else {
      console.log('Found correct header in the sheet.');
    }
  } else {
      console.warn('Found no header, added header.');
      sheet.appendRow(header);
  }
}
/**
 * Returns the date of the last entry in unixTime.
 */
function retrieveLastDate(sheet) {
  var lastRow = sheet.getLastRow();
  console.log('Found the last row in the sheet: ' + lastRow);

  var unixTime = 631152000; // date of 1-1-1990, used if there is no activity available
  if (lastRow > 1) {
      var dateCell = sheet.getRange(lastRow, 1);
      var dateString = dateCell.getValue();
      console.log('Retrieved the datestring from the lastrow: ' + dateString);

      var date = new Date((dateString || '').replace(/-/g,'/').replace(/[TZ]/g,' '));
      unixTime = date/1000;
   }

   console.log('Returned the datestring converted to unixtime: ' + unixTime);
   return unixTime;
}

/**
 * Inserts a two dimentional array into a sheet
 */
function insertData(sheet, data, row, column) {
  var numRows = data.length;
  var numColums = data[0].length;
  var range = sheet.getRange(row, column, numRows, numColums);
  range.setValues(data);
  console.info('Inserted %s data records into %s', data.length, sheet.getName());
}

/**
 * Sorts all rows of the sheet based on column 1
 */
function sortData(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var range = sheet.getRange(2,1,lastRow,lastColumn);
  range.sort({column: 1, ascending: true});
}

/**
 * Gets the address of the Lat Long location.
 * TODO: tidy up the for loop and caching.
 */
function getLocation(lat, lng) {
  // Check if location is already cached
  var cache = CacheService.getScriptCache();
  var cached = JSON.parse(cache.get('location-for-lat-' + lat + '-lng-' + lng));
  if (cached != null) {
    console.log({'message' : 'Found address for ' + lat + ', ' + lng + ' in cache.',
                 'cached' : cached});
    return cached;
  }

  // Get new location if not available in cache and put in cache
  var response = Maps.newGeocoder().reverseGeocode(lat, lng); 
  for (var i = 0; i < response.results.length; i++) {
    var result = response.results[i];
    cache.put('location-for-lat-' + lat + '-lng-' + lng, JSON.stringify(result.address_components), 21600);
    console.log({'message': 'Retrieved address for ' + lat + ', ' + lng + ' from Google Maps and added it to cache.',    
                 'adress_components': result.address_components});    
    return result.address_components;
  }
}

/**
 * Extracts any address component from the result of a google maps call
 */
function extractFromAdress(components, type){
  for (var i=0; i<components.length; i++)
      for (var j=0; j<components[i].types.length; j++)
          if (components[i].types[j]==type) return components[i].long_name;
  return '';
}

/**
 * Returns an 2D array of values from the first row, the header
 */
function getSheetHeader(sheet) {
  var lastColumn = sheet.getLastColumn();
  var sheetHeader = sheet.getRange(1, 1, 1, lastColumn).getValues();
  return sheetHeader;
}

/**
 * Calls main() in testmode
 */
function testMain() {
  var mode = 'test';
  main(mode);
}