/**
 * A Google sheets script for retrieving windsurfing data from Strava
 * retrieveData() is the main function
 */


/**
 * Gets the latest activities filters for windsurfing and writs it to the spreadsheet
 * TODO: if sheet is empty retrieve all data => ensure header
 * TODO: build in pagination and remove per_page=200 https://strava.github.io/api/#pagination
 */
function retrieveData() {
  
  var service = getService_();
  // Check if the authorisation is in order
  if (service.hasAccess()) {
    //Access the right sheet and get the date from the last entry
    var sheet = getStravaSheet();
    var unixTime = retrieveLastDate(sheet);

    
    // Get the activities since the last entry
    var url = 'https://www.strava.com/api/v3/athlete/activities?per_page=200&after=' + unixTime;
    if (DEBUG) Logger.log("URL: " + url);
    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var result = JSON.parse(response.getContentText());

    // Check if there is any new data, if not, stop and log.
    if (result.length == 0) {
      Logger.log("No new data");
      return;
    }

    // Filter only windsurf entries, format the data and put it in var data
    var data = convertData(result);
    
    // Check if there is any new data, if not, stop and log.
    if (data.length == 0) {
      Logger.log("No new data with windsurf activities");
      return;
    }

    // Insert the new entries into the sheet
    insertData(sheet, data);
  
    // Authorize if needed
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s',
        authorizationUrl);
  }
}

/**
 * Returns the date of the last entry in unixTime.
 */
function retrieveLastDate(sheet) {
  var lastRow = sheet.getLastRow();
  if (DEBUG) Logger.log("lastRow: " + lastRow);

  var unixTime = 631152000; //date of 1-1-1990
  if (lastRow > 0) {
      var dateCell = sheet.getRange(lastRow, 1);
      var dateString = dateCell.getValue();
      if (DEBUG) Logger.log("Datestring: " + dateString);

      var date = new Date((dateString || "").replace(/-/g,"/").replace(/[TZ]/g," "));
      unixTime = date/1000;
   }

   if (DEBUG) Logger.log("Result of retrieveLastDate in unixTime: " + unixTime);
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
  var data = [];
  for (var i = 0; i < result.length; i++) {
    if (result[i].type == "Windsurf") {
      if (DEBUG) Logger.log("Activity: %s", result[i]);
      
      // Get the location address from the start_latlng
      var city = "";
      var country = "";
      var start_lat = "";
      var start_long = "";
      
      if (result[i].start_latlng !== null) {
        start_lat = result[i].start_latlng[0];
        start_long = result[i].start_latlng[1];
        
        if (DEBUG) Logger.log("Start Lat: %s", start_lat);
        if (DEBUG) Logger.log("Start Long: %s", start_long);
        address_components = getLocation(start_lat, start_long);
        if (DEBUG) Logger.log("Address Components: %s", address_components);

        city = extractFromAdress(address_components, "locality");
        if (DEBUG) Logger.log("City: %s", city);

        country = extractFromAdress(address_components, "country");
        if (DEBUG) Logger.log("Country: %s", country);
      } 

      if (DEBUG) Logger.log("Description: %s", result[i].description);

      // format all data before inserting it into the sheet
      var item = [result[i].start_date_local,
                  result[i].id,
                  result[i].name,
                  result[i].description,
                  result[i].distance/1000,
                  result[i].average_speed/0.27777777777778,
                  result[i].max_speed/0.27777777777778,
                  city,
                  country,
                  start_lat,
                  start_long];
      data.push(item);
    }
  }

  return data;
}

/**
 * Returns the sheet defined in the config
 */
function getStravaSheet() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);
  return sheet;
}

/**
 * Creates a header if needed and inserts the data
 * TODO: move header values to config
 */
function insertData(sheet, data) {
  // Set header values
  var header = ["Start Date", "Strava ID", "Name", "Description", "Distance", "Average Speed", "Max Speed", "City", "Country", "Latitude", "Longitude"];
  // Make sure that there is a header in the sheet
  ensureHeader(header, sheet);

  // Insert the data on the last row
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange(lastRow+1,1,data.length,11);
  range.setValues(data);
}

/**
 * Checks for a header and create one if not available
 */
function ensureHeader(header, sheet) {
  // Only add the header if sheet is empty
  if (sheet.getLastRow() == 0) {
    if (DEBUG) Logger.log('Sheet is empty, adding header.');
    sheet.appendRow(header);
    return true;

  } else {
    if (DEBUG) Logger.log('Sheet is not empty, not adding header.');
    return false;
  }
}

/**
 * Gets or creates a sheet in the spreadsheet document with the correct name
 */
function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    if (DEBUG) Logger.log('Sheet "%s" does not exists, adding new one.', sheetName);
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
    if (DEBUG) Logger.log('Result: %s', result.address_components);
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
  return "";
}

function test() {
  //var sheet = getStravaSheet();
  //var unixTime = retrieveLastDate(sheet);

  var test = "TEST";
  test = test + "test";
  Logger.log(test);
}

