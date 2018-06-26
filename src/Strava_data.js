/**
 * A Google sheets script for retrieving windsurfing data from Strava
 * retrieveData() is the main function
 * 
 * TODO NEXT: move 'insert data' from getStravaItemList()
 * TODO: solution for manual entries where max speed & lat/long are not available
 * 
 * 
 * 
 * Wanted features: 
 * Get Description
 * Add wind
 * Add tides
 * Add current directions
 * Implement cache for geo? Interestig for development: https://developers.google.com/apps-script/guides/support/best-practices
 */


/**
 * Main function to call with a timer
 */
function main(test) {
  if (!test) {
    console.info('Started main().'); 
    ENVIRONMENT = 'prod';
  } else {
    console.warn('Started main() in testmode.'); 
    ENVIRONMENT = 'test';
  }
  var ENV_CONFIG = setEnvConfig(ENVIRONMENT, ENV_SETTINGS);

  // Check status of sheet (header etc)
  var sheet = getSheet(ENV_CONFIG.sheetName, ENV_CONFIG.header);

  // Subprocess retrieves a list of activities and filters them
  retrieveNewActivities(sheet);
  
  //TODO: move to insertdata

  
  // WIP: Update activities
}

/**
 * function to call main() in testmode
 */
function testMain() {
  var test = true;
  main(test);
}

/**
 * Retrieves new activities from strava
 */
function retrieveNewActivities(sheet) {
  //Access the right sheet and get the date from the last entry
  var endPoint = 'athlete/activities';
  var lastActivityDate = retrieveLastDate(sheet);
  getStravaItemList(endPoint, lastActivityDate,sheet);

  // TODO: add filtering  here
}

/**
 * WIP: Returns an object with multiple items from strava
 * TODO: separate insertdata
 */
function getStravaItemList(endPoint, lastActivityDate, sheet) {

  var per_page = 30;
  var page = 1;
  var result = [];

  // Create params and make the strava call
  do {
    var params = '?after=' + lastActivityDate + '&per_page=' + per_page + '&page= ' + page;
    result = callStrava(endPoint, params, page);

    // Filter only windsurf entries, format the data and put it in var data
    var data = convertData(result);

    // Insert the new entries into the sheet
    if (data.length > 0) insertData(sheet, data);

    // Increment the page to retrieve the next page in the loop
    page++;

  } while (result.length == per_page);
}

/**
 * WIP: Returns an object a single item strava
 */
function getStravaItem() {
  // WIP will be a simplified version of StravaList
}

/**
 * WIP: Returns the response from Strava
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
    
    console.log({'message': 'Returning ' + result.length + ' items from Strava.', 
                   'result': result});
    return result;
    
  // If there is no authorization, log the authorization URL
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    console.error('Authorization failed: open %s to authorize and re-run the script.',
        authorizationUrl);
  }
}

function sortData(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var range = sheet.getRange(2,1,lastRow,lastColumn);
  range.sort({column: 1, ascending: true});
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
 * Returns an array of windsurf items converted and formated to insert in the sheet
 * 
 * TODO: Fix descriptions as described here: You can use the Activities API to get activity 
 * descriptions -  * https://developers.strava.com/playground/#/Activities/getActivityById. 
 * If one exists, it will be there. Note that if you are getting activities in bulk such as 
 * https://developers.strava.com/playground/#/Activities/getLoggedInAthleteActivities, you 
 * only get a summary representation which does not include the description. For mout about 
 * summary vs. detail representations, see https://strava.github.io/api/v3/activities/.
 * 
 */
function convertData(result) {
  console.log('Filtering result for windsurf activities.');
  var data = [];
  var start_lat = '';
  var start_long = '';

  // Loop through the result
  for (var i = 0; i < result.length; i++) {
    if (result[i].type == 'Windsurf') {
      console.log({'message': 'Found a windsurf activity in result ' + i +' of ' + result.length + '.', 
      'activity': result[i]});
      
      if (result[i].start_latlng !== null) {
        start_lat = result[i].start_latlng[0];
        start_long = result[i].start_latlng[1];
      }
      // format all data before inserting it into the sheet
      var item = [result[i].start_date_local,
                  result[i].id,
                  result[i].name,
                  result[i].distance/1000,
                  result[i].average_speed/0.27777777777778,
                  result[i].max_speed/0.27777777777778,
                  start_lat,
                  start_long];
      data.push(item);
    }
  }
  return data;
}

/**
 * WIP: loops through the activities and updates/enriches data
 */
function updateActivities() {
        // Get the location address from the start_latlng
        var city = '';
        var country = '';

          
          // console.log('Start Lat: %s', start_lat);
          // console.log('Start Long: %s', start_long);
          //address_components = getLocation(start_lat, start_long);
          // console.log('Address Components: %s', address_components);
  
          //city = extractFromAdress(address_components, 'locality');
          // console.log('City: %s', city);
  
          //country = extractFromAdress(address_components, 'country');
          // console.log('Country: %s', country);
        
  
        // console.log('Description: %s', result[i].description);
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
 * Creates a header if needed and inserts the data
 * TODO: move header values to config
 */
function insertData(sheet, data) {
  console.info('Inserting %s windsurfing activitie(s), into %s', data.length, sheet);
  
  // Insert the data on the last row
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange(lastRow+1,1,data.length,8);
  range.setValues(data);
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
  return '';
}

/**
 * Sets the global configuration based on the environment
 */
function setEnvConfig(environment, env_settings){
  var config = env_settings[0][environment];
  console.info({'message': 'Loaded configuration settings for ' + environment + '.', 
                'ENV_CONFIG': config});
  return config;
}
