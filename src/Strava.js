/**
 * Builds and returns the authorization URL from the service object.
 * @return {String} The authorization URL.
 */
function getAuthorizationUrl() {
  return getStravaService().getAuthorizationUrl();
}

/**
 * Resets the API service, forcing re-authorization before
 * additional authorization-required API calls can be made.
 */
function signOut() {
  getStravaService().reset();
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