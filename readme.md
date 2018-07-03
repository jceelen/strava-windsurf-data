# Get windsurfing activities from Strava, put them in a Spreadsheet #

Standalone Script for that pulls your windsurfing activities from Strava. The idea is to add extra data like wind / weather / tidal data and represent them on a dashboard.

## Requirements ##
 * Add [OAuth2 for Apps Script](https://github.com/gsuitedevs/apps-script-oauth2) as a library under resources with key `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`.

## Features ##
* Creates sheet automatically and adds header
* Gets all activities from Strava, filters them for `windsurfing` and adds them to a sheet.
* Keeps updating user generated content from Strava like activity name and description

## Wanted features ##
 * Change to spreadsheet [add-on](https://developers.google.com/apps-script/add-ons/) for more users.
    * Authorization for strava in pop-ups instead of sidebar
    * Call script from menu
    * Remove Sheet1 if empty
    * Update logging
 * Markup: 
    * autoResizeColumns(startColumn, numColumns)
    * setFrozenRows(rows)
    * [setNumberFormats(numberFormats)](https://developers.google.com/apps-script/reference/spreadsheet/range#setNumberFormats(Object))
    * Fontsize
    * Alignment
    * Check locale settings
 * Start using the [Import/Export REST API](https://developers.google.com/apps-script/guides/import-export) for importing and exporting projects 
 * Add switches for data updates in config
 * Add charts
 * Add link to strava
 * Improve speed/performance of updateActivityUserGeneratedContent()
 * Rename activities to sessions in code (activities are Strava, sessions this script uses sessions)
 * Update getStravaItems() to support other items (the loop is specifically for activities)
 * Conversion from city to spot
 * Add wind:
    * [World Weather Online](https://www.worldweatheronline.com)
    * [Apixu](https://www.apixu.com/my/)
    * [KNMI (Dutch)](https://www.knmi.nl/kennis-en-datacentrum/achtergrond/data-ophalen-vanuit-een-script)
    * [KNMI Noordzee Stations (Dutch)](https://www.knmi.nl/nederland-nu/klimatologie/daggegevens_Noordzee)
    * [Surfcheck EU&NL](http://weerlive.nl/delen.php)
    * [RijksWaterStaat (Dutch)](https://www.rijkswaterstaat.nl/rws/opendata/)
 * Add tides
 * Add current(tidal) directions