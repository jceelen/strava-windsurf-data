/**
 * Adds a custom menu with items to show the sidebar.
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  var service = getStravaService();
  var menu = SpreadsheetApp.getUi().createAddonMenu();

  if (service.hasAccess()) {
    menu.addItem('Get new data', 'main');
    menu.addItem('Get new data[T]', 'testMain');
    menu.addSeparator();
    menu.addItem('Sign out', 'signOutStrava');
  } else {
    menu.addItem('Sign in', 'signInStrava');
    //menu.addItem('Sign in 2', 'signInStrava2');
  }
  menu.addToUi();
}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
}