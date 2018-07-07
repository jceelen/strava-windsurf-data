/**
 * Adds a custom menu with items to show the sidebar.
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
    SpreadsheetApp.getUi()
        .createAddonMenu()
        .addItem('Authorize with Strava', 'showSidebar')
        .addToUi();
  }
  
  /**
   * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
   * any other initializion work is done immediately.
   * @param {Object} e The event parameter for a simple onInstall trigger.
   */
  function onInstall(e) {
    onOpen(e);
  }
  
/**
 * Opens a sidebar. The sidebar structure is described in the Sidebar.html
 * project file.
 */
function showSidebar() {
var service = getStravaService();
var template = HtmlService.createTemplateFromFile('Sidebar');
template.email = Session.getEffectiveUser().getEmail();
template.isSignedIn = service.hasAccess();
var page = template.evaluate()
    .setTitle('Sidebar')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
SpreadsheetApp.getUi().showSidebar(page);
}

/**
 * Gets the user's GitHub profile.
 */
function getStravaProfile() {
    var service = getStravaService();
    if (!service.hasAccess()) {
      throw new Error('Error: Missing Strava authorization.');
    }
    var url = 'https://www.strava.com/api/v3/athlete';
    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    console.log({'message': 'Retrieved Athlete Profile from Strava.', 
                     'result': response});
    return JSON.parse(response.getContentText());
  }