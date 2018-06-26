/**
 * A Google sheets script for retrieving windsurfing data from Strava
 *  
 * Wanted features: 
 * Conversion from city to spot
 * Get Description
 * Add wind
 * Add tides
 * Add current(tidal) directions
 * Check existing activities for data updates (user generated content)
 */

/**
 * Main function to call with a timer
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
  updateActivities(sheet);
}

/**
 * Retrieves new activities from strava
 */
function retrieveNewActivities(sheet) {
  //Access the right sheet and get the date from the last entry
  var endPoint = 'athlete/activities';
  var lastActivityDate = retrieveLastDate(sheet);
  var items = getStravaItems(endPoint, lastActivityDate,sheet);
  var activities = prepareActivities(items);
  
  if (activities.length > 0) {
    var lastRow = sheet.getLastRow();
    var row = lastRow+1;
    var column = 1;
    insertData(sheet, activities, row, column);
  } else {console.info('No new windsurf activities found on Strava.')}
}

/**
 * Returns an object with multiple items from strava
 */
function getStravaItems(endPoint, lastActivityDate, sheet) {
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
  console.log({'message': 'Returning ' + items.length + ' items from Strava as an array.', 
                   'items': items});
  return items;
}

/**
 * Returns an object a single item strava
 */
function getStravaItem() {
}

/**
 * Returns a response from a call to the Strava API
 */
function callStrava(endPoint, params, page){
  var baseUrl = 'https://www.strava.com/api/v3/';
  var url = baseUrl + endPoint + params;
  var service = getService_();

  // Check if the authorisation is working
  if (service.hasAccess()) {
    // Make the call to Strava
    console.log('Going to make a call to Strava for page %s', page);
    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var result = JSON.parse(response.getContentText());
    
    console.log({'message': 'Returning ' + result.length + ' item(s) from Strava.', 
                   'result': result});
    return result;
    
  // If there is no authorization, log the authorization URL
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    // Log error to default logger
    Logger.log('Authorization failed: open %s to authorize and re-run the script.',
    authorizationUrl);
    
    // Log error to Stackdriver logger
    console.error('Authorization failed: open %s to authorize and re-run the script.',
        authorizationUrl);
  }
}

/**
 * Returns an array of items filterd for windsurf activities converted and formated to insert in the sheet
 */
function prepareActivities(items) {
  console.log('Filtering '+ items.length + ' items windsurf activities and prepare them for insertion.');
  var activities = [];
  var start_lat = '';
  var start_long = '';

  // Loop through the result, filter and prepare the data
  for (var i = 0; i < items.length; i++) {
    if (items[i].type == 'Windsurf') {
      console.log({'message': 'Found a windsurf activity in item ' + i +' of ' + items.length + '.', 
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
                  items[i].average_speed/0.27777777777778,
                  items[i].max_speed/0.27777777777778,
                  start_lat,
                  start_long];
      activities.push(item);
    }
  }
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
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
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
    console.warn('Sheet %s does not exists, creating new sheet.', sheetName);
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * Checks for a header and create one if not available
 */
function ensureHeader(header, sheet) {
  // Only add the header if sheet is empty
  if (sheet.getLastRow() == 0) {
    console.warn('Found no header in the sheet, adding header.');
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

   console.log('Returning the datestring converted to unixtime: ' + unixTime);
   return unixTime;
}

/**
 * Inserts a two dimentional array into a sheet
 */
function insertData(sheet, data, row, column) {
  console.info('Inserting %s new data records, into %s', data.length, sheet);
  var numRows = data.length;
  var numColums = data[0].length;
  var range = sheet.getRange(row, column, numRows, numColums);
  range.setValues(data);
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
 */
function getLocation(lat, lng) {
  var response = Maps.newGeocoder().reverseGeocode(lat, lng); 
  for (var i = 0; i < response.results.length; i++) {
    var result = response.results[i];
    console.log({'message': 'Returning this address.', 
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
  // WIP: remove return?
  return '';
}

/**
 * Calls main() in testmode
 */
function testMain() {
  var mode = 'test';
  main(mode);
}