# Get windsurfing activities from Strava, put them in a Spreadsheet #

Standalone Script for that pulls your windsurfing activities from Strava. The idea is to add extra data like wind / weather / tidal data and represent them on a dashboard.

## Requirements ##
 * Add [OAuth2 for Apps Script](https://github.com/gsuitedevs/apps-script-oauth2) as a library under resources with key `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`.

## Features ##
* Creates sheet automatically and adds header
* Gets all activities from Strava, filters them for `windsurfing` and adds them to a sheet.
* Keeps updating user generated content from Strava like activity name and description
* Adds location based on start lat/long
* 

## Wanted features ##
* WIP: Add wind / weatherdata: [KNMI (Dutch)](https://www.knmi.nl/kennis-en-datacentrum/achtergrond/data-ophalen-vanuit-een-script)
  * v0.1 
    * Select station based on spots JSON
    * Check if data is present
    * Get data with caching
    * Manipulate data
    * Insert in sheet
  * v0.2 
    * Match weather station based on lat/long
* Add wind / weatherdata:
  * [World Weather Online](https://www.worldweatheronline.com)
  * [Apixu](https://www.apixu.com/my/)
  * [KNMI (Dutch)](https://www.knmi.nl/kennis-en-datacentrum/achtergrond/data-ophalen-vanuit-een-script)
  * [KNMI Noordzee Stations (Dutch)](https://www.knmi.nl/nederland-nu/klimatologie/daggegevens_Noordzee)
  * [Surfcheck EU&NL](http://weerlive.nl/delen.php)
  * [RijksWaterStaat (Dutch)](https://www.rijkswaterstaat.nl/rws/opendata/)
* Cleanup Callback.html
* Markup v2
  * Banding
* Update logging
* Add simple dashboard sheet
* Use [toast](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet#toast) messages to update the user about the proces.
* Update Strava with data from this sheet.
* Start using the [Import/Export REST API](https://developers.google.com/apps-script/guides/import-export) for importing and exporting projects 
* Add switches for data updates in config
* Add charts
* Add link to strava activity
* Improve speed/performance of updateActivityUserGeneratedContent()
* Rename activities to sessions in code (activities are Strava, sessions this script uses sessions)
* Update getStravaItems() to support other items (the loop is specifically for activities)
* Conversion from city to spot
* Add tides
* Add current(tidal) directions
* Duration in hours and minutes
* Move description to notes on the title: setNotes(notes)
* Refactor:
  * setColumnMarkup(): use arrays to update a bunch of cells instead of 1 cell at the time
  * getLocation(): tidy up the for loop and caching.
  * update data: get indexes from `config.columns`
  * Fix performance or load: Timeout: https://www.strava.com/api/v3/activities/1211919367?include_all_efforts at callStrava(Strava:58)
    * Fix that script finishes if there is a time-out
    * Maybe split up the calls? 10 rows, 10 rows etc?
  * Les times updating markup

## Notes