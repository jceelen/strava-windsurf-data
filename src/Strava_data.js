/**
 * A Google sheets script for retrieving windsurfing data from Strava
 */

function retrieveData() {
  //TODO: if sheet is empty retrieve all data
  var service = getService_();
  if (service.hasAccess()) {
    var sheet = getStravaSheet();
    var unixTime = retrieveLastDate(sheet);

    //TODO: build in pagination and remove per_page=200 https://strava.github.io/api/#pagination
    //TODO: fix the parameter &after=' + unixTime
    var url = 'https://www.strava.com/api/v3/athlete/activities?per_page=200&after=' + unixTime;
    if (DEBUG) Logger.log("URL: " + url);
    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var result = JSON.parse(response.getContentText());

    //custom code starts here
    if (result.length == 0) {
      Logger.log("No new data");
      return;
    }

    var data = convertData(result);

    if (data.length == 0) {
      Logger.log("No new data with windsurf activities");
      return;
    }

    insertData(sheet, data);

  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s',
        authorizationUrl);
  }
}

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

function convertData(result) {
  var data = [];
  for (var i = 0; i < result.length; i++) {
    if (result[i].type == "Windsurf") {
      var item = [result[i].start_date_local,
                  result[i].id,
                  result[i].name,
                  result[i].distance/1000,
                  result[i].average_speed,
                  result[i].max_speed,
                  result[i].location_country];
      data.push(item);
    }
  }

  return data;
}

function getStravaSheet() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);
  return sheet;
}

function insertData(sheet, data) {
  var header = ["Start Date", "Strava ID", "Name", "Distance", "Average Speed", "Max Speed", "Location"];
  ensureHeader(header, sheet);

  var lastRow = sheet.getLastRow();
  var range = sheet.getRange(lastRow+1,1,data.length,7);
  range.setValues(data);
}

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

function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    if (DEBUG) Logger.log('Sheet "%s" does not exists, adding new one.', sheetName);
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function test() {
  //var sheet = getStravaSheet();
  //var unixTime = retrieveLastDate(sheet);

  var test = "TEST";
  test = test + "test";
  Logger.log(test);
}
