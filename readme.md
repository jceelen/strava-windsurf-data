# Get windsurfing activities from Strava, put them in a Spreadsheet #

Standalone Script for that pulls your windsurfing activities from Strava. The idea is to add extra data like wind / weather / tidal data and represent them on a dashboard.

## Requirements ##
 * Add [OAuth2 for Apps Script](https://github.com/gsuitedevs/apps-script-oauth2) as a library under resources with key `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`.

## Features ##
* Creates sheet automatically and adds header
* Gets all activities from Strava, filters them for `windsurfing` and adds them to a sheet.
* Keeps updating user generated content from Strava like activity name and description
* Adds location based on start lat/long
* Adds dutch weather data based on `Settings/Spots.js`

## Wanted features ##
* Add simple dashboard sheet
* Move description to notes on the title: setNotes(notes)
* Weather Data v0.2 
  * Insert max values (is now NaN because of strings in array)
  * Exclude bad weatherstations
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
* Use [toast](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet#toast) messages to update the user about the proces.
* Update Strava with data from this sheet.
* Add charts
* Add link to strava activity
* Improve speed/performance of updateActivityUserGeneratedContent()
* Conversion from city to spot
* Duration in hours and minutes
* Add tides
* Add current(tidal) directions
* Update getStravaItems() to support other items (the loop is specifically for activities)
* Refactor:
  * setColumnMarkup(): use arrays to update a bunch of cells instead of 1 cell at the time
  * getLocation(): tidy up the for loop and caching.
  * update data: get indexes from `config.columns`
  * config.columns as an array of dictionaries (not an array with a dictionary of dictionaries)
  * rename config and settings for more uniformity
  * Fix performance or load: Timeout: https://www.strava.com/api/v3/activities/1211919367?include_all_efforts at callStrava(Strava:58)
    * Fix that script finishes if there is a time-out
    * Maybe split up the calls? 10 rows, 10 rows etc?
  * Less often updating markup
  * update UGC less often instead of cache

## Notes
Locations of all weatherstations are shown on [this map](https://drive.google.com/open?id=1PG4BRaTaKF29wiSQLdLeamFvhpNWq8V7&usp=sharing).
Documentation for [KNMI (Dutch)](https://www.knmi.nl/kennis-en-datacentrum/achtergrond/data-ophalen-vanuit-een-script) weatherdata.