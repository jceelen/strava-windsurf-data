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
function getStravaItems(endPoint, lastSessionDate) {
  var per_page = 30;
  var page = 1;
  var result = [];
  var items = [];

  // Create params and make the strava call
  do {
    var params = '?after=' + lastSessionDate + '&per_page=' + per_page + '&page=' + page;
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
function callStrava(endPoint, params) {
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
    if (result.length > 0) console.log({
      'message': 'Retrieved ' + result.length + ' item(s) from Strava.',
      'result': result
    });
    return result;

    // If there is no authorization, log the authorization URL
  }
}

/**
 * Returns an array of items filtered for windsurf activities converted and formated to insert in the sheet
 */
function prepareActivities(items) {
  var activities = [];
  var start_lat = '';
  var start_long = '';

  // Loop through the result, filter and prepare the data
  for (var i = 0; i < items.length; i++) {
    if (items[i].type == 'Windsurf') {
      console.log({
        'message': 'Found a windsurf activity on index ' + i + ' of ' + items.length + ' items.',
        'items': items[i]
      });

      if (items[i].start_latlng !== null) {
        start_lat = items[i].start_latlng[0];
        start_long = items[i].start_latlng[1];
      }
      // Format all data before inserting it into the sheet
      var item = [items[i].start_date_local,
        items[i].id,
        items[i].name,
        items[i].distance / 1000,
        items[i].elapsed_time,
        items[i].average_speed / 0.27777777777778,
        items[i].max_speed / 0.27777777777778,
        start_lat,
        start_long
      ];
      activities.push(item);
    }
  }
  console.log('Filtered ' + items.length + ' items and found ' + activities.length + ' windsurf activities. Prepared them for insertion.');
  return activities;
}

/**
 * Builds and returns the authorization URL from the service object.
 * @return {String} The authorization URL.
 */
function getAuthorizationUrl() {
  return getStravaService().getAuthorizationUrl();
}

/**
 * Shows an alert when Strava is not autorized
 */
function signInStrava() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert('Authorize with Strava',
    'Copy and open this link in another tab or window: ' + getAuthorizationUrl(),
    ui.ButtonSet.OK);

  // Process the user's response.
  if (result == ui.Button.OK) {
    onOpen();
  }
}

/**
 * Shows an alert when Strava is not autorized
 */
function signInStrava2() {
  var html = HtmlService.createHtmlOutputFromFile('StravaAuthorize.html')
    .setWidth(600)
    .setHeight(425)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(html, 'Authorize with Strava');
}


/**
 * Resets the API service, forcing re-authorization before
 * additional authorization-required API calls can be made.
 */
function signOutStrava() {
  getStravaService().reset();
  onOpen();
}

/**
 * Gets an OAuth2 service configured for the GitHub API.
 * @return {OAuth2.Service} The OAuth2 service
 */
function getStravaService() {
  return OAuth2.createService('Strava')
    // Set the endpoint URLs.
    .setAuthorizationBaseUrl('https://www.strava.com/oauth/authorize')
    .setTokenUrl('https://www.strava.com/oauth/token')

    // Set the client ID and secret.
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)

    // Set the name of the callback function that should be invoked to
    // complete the OAuth flow.
    .setCallbackFunction('authCallback')

    // Set the property store where authorized tokens should be persisted.
    .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Callback handler that is executed after an authorization attempt.
 * @param {Object} request The results of API auth request.
 */
function authCallback(request) {
  var template = HtmlService.createTemplateFromFile('Callback');
  template.email = Session.getEffectiveUser().getEmail();
  template.isSignedIn = false;
  template.error = null;
  var title;
  try {
    var service = getStravaService();
    var authorized = service.handleCallback(request);
    template.isSignedIn = authorized;
    title = authorized ? 'Access Granted' : 'Access Denied';
  } catch (e) {
    template.error = e;
    title = 'Access Error';
  }
  template.title = title;
  return template.evaluate()
    .setTitle(title)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Logs the redict URI to register in the Google Developers Console.
 */
function logRedirectUri() {
  var service = getStravaService();
  Logger.log(service.getRedirectUri());
}

/**
 * Includes the given project HTML file in the current HTML project file.
 * Also used to include JavaScript.
 * @param {String} filename Project file name.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}