/**
 * Sets the global configuration based on the environment
 */
function setEnvConfig(mode) {
    if (mode == 'test') {
        console.warn('Running in testmode.');
        environment = 'test';
    } else {
        environment = 'prod';
    }
    var config = ENV_SETTINGS[environment];
    for (var i in SETTINGS) {
        config[i] = SETTINGS[i];
    }
    console.log({
        'message': 'Loaded configuration settings for environment: ' + environment + '.',
        'ENV_CONFIG': config
    });
    return config;
}

/**
 * Returns the sheet defined in the config
 */
function getSheet(config) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(spreadsheet, config.sheetName);
    removeUnusedSheet(spreadsheet, 'Sheet1');
    ensureHeader(config, sheet);
    return sheet;
}
/**
 * Gets or creates a sheet in the spreadsheet document with the correct name
 */
function getOrCreateSheet(spreadsheet, sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
        console.warn('Sheet %s does not exists, created new sheet.', sheetName);
        sheet = spreadsheet.insertSheet(sheetName);
    }
    console.log('Returned the sheet: ' + sheetName);
    return sheet;
}

/**
 * Removes a sheet called Sheet1 
 */
function removeUnusedSheet(spreadsheet, sheetname) {
    var sheet = spreadsheet.getSheetByName(sheetname);
    if (sheet && sheet.getLastRow() == 0) spreadsheet.deleteSheet(sheet);
}

/**
 * Checks for a header and create one if not available
 */
function ensureHeader(config, sheet) {
    var header = getHeader(config.columns);
    // If there is a header
    if (sheet.getLastRow() > 0) {
        // Get the values from the sheet and the config file
        var headerString = JSON.stringify(header);
        var sheetHeaderString = JSON.stringify(getSheetHeader(sheet)[0]);
        // Compare the header from the sheet with the config
        if (sheetHeaderString != headerString) {
            sheet.clear();
            insertData(sheet, [header], 1, 1, config);
            console.warn({
                'message': 'Found incorrect header, cleared sheet and updated header.',
                'header': header
            });
        } else {
            console.log('Found correct header in the sheet.');
        }
    } else {
        console.warn('Found no header, added header.');
        sheet.appendRow(header);
    }
}

/**
 * Gets the header from the config file
 */
function getHeader(columns) {
    var header = [];
    for (var i in columns) {
        header.push(columns[i].name);
    }
    console.log({
        'message': 'Returned header from config.',
        'header': header
    });
    return header;
}

/**
 * Sets the frozen rows and columns based on the config file
 */
function freezeRowsColumns(sheet, wantedRows, wantedColumns) {
    var frozenRows = sheet.getFrozenRows();
    var frozenColumns = sheet.getFrozenColumns();
    if (frozenRows != wantedRows) {
        sheet.setFrozenRows(wantedRows);
        console.log('Frozen %s rows in the sheet', wantedRows);
    }
    if (frozenColumns != wantedColumns) {
        sheet.setFrozenColumns(wantedColumns);
        console.log('Frozen %s columns in the sheet', wantedRows);
    }
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

        var date = new Date((dateString || '').replace(/-/g, '/').replace(/[TZ]/g, ' '));
        unixTime = date / 1000;
    }

    console.log('Returned the datestring converted to unixtime: ' + unixTime);
    return unixTime;
}

/**
 * Inserts a two dimentional array into a sheet and triggers markup
 */
function insertData(sheet, data, row, column) {
    var numRows = data.length;
    var numColums = data[0].length;
    var range = sheet.getRange(row, column, numRows, numColums);
    range.setValues(data);
    console.info('Inserted %s data records into %s', data.length, sheet.getName());
}

function markupData(sheet, config) {
    if (config.markupData) {
        var lastRow = sheet.getLastRow();
        var lastColumn = sheet.getLastColumn();
        var range = sheet.getRange(1, 1, lastRow, lastColumn);
        freezeRowsColumns(sheet, config.frozenRows, config.frozenColumns);
        range.setFontSize(config.fontSize);
        setColumnMarkup(sheet, config.columns, lastRow);
    }
}

function setColumnMarkup(sheet, columns, lastRow) {
    for (var i in columns) {
        var range;
        var row;
        var column = columns[i].position;
        if (columns[i].align) {
            row = 1; // only the header
            range = sheet.getRange(row, column);
            range.setHorizontalAlignment(columns[i].align);
            console.log('Setting alignment to %s for %s', columns[i].align, columns[i].name);
        }
        if (columns[i].numberFormat) {
            row = 2; // skipping the header
            range = sheet.getRange(row, column, lastRow);
            range.setNumberFormat(columns[i].numberFormat);
            console.log('Setting numberFormat to %s for %s', columns[i].numberFormat, columns[i].name);
        }
        if (columns[i].size) {
            sheet.setColumnWidth(column, columns[i].size);
            console.log('Setting column width to %s for %s', columns[i].size, columns[i].name);
        } else {
            sheet.autoResizeColumn(column);
            console.log('Setting column width automatically for %s', columns[i].name);
        }
        if (columns[i].wrap) {
            row = 2; // skipping the header
            range = sheet.getRange(row, column, lastRow);
            range.setHorizontalAlignment(columns[i].align);
            console.log('Setting alignment to %s for %s', columns[i].align, columns[i].name);
        }
    }
}

/**
 * Sorts all rows of the sheet based on column 1
 */
function sortData(sheet) {
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    var range = sheet.getRange(2, 1, lastRow, lastColumn);
    range.sort({
        column: 1,
        ascending: true
    });
}

/**
 * Gets the address of the Lat Long location.
 */
function getLocation(lat, lng) {
    // Check if location is already cached
    var cache = CacheService.getScriptCache();
    var cached = JSON.parse(cache.get('location-for-lat-' + lat + '-lng-' + lng));
    if (cached != null) {
        console.log({
            'message': 'Found address for ' + lat + ', ' + lng + ' in cache.',
            'cached': cached
        });
        return cached;
    }

    // Get new location if not available in cache and put in cache
    var response = Maps.newGeocoder().reverseGeocode(lat, lng);
    for (var i = 0; i < response.results.length; i++) {
        var result = response.results[i];
        cache.put('location-for-lat-' + lat + '-lng-' + lng, JSON.stringify(result.address_components), 21600);
        console.log({
            'message': 'Retrieved address for ' + lat + ', ' + lng + ' from Google Maps and added it to cache.',
            'adress_components': result.address_components
        });
        return result.address_components;
    }
}

/**
 * Extracts any address component from the result of a google maps call
 */
function extractFromAdress(components, type) {
    for (var i = 0; i < components.length; i++)
        for (var j = 0; j < components[i].types.length; j++)
            if (components[i].types[j] == type) return components[i].long_name;
    return '';
}

/**
 * Returns an 2D array of values from the first row, the header
 */
function getSheetHeader(sheet) {
    var lastColumn = sheet.getLastColumn();
    var sheetHeader = sheet.getRange(1, 1, 1, lastColumn).getValues();
    return sheetHeader;
}