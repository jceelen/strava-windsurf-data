var SETTINGS = {
    fontSize: 9,
    frozenRows: 1,
    frozenColumns: 1,
    columns: {
      1: {
        position: 1,
        name: 'Start Date',
        align: 'left'
      },
      2: {
        position: 2,
        name: 'Strava ID',
        align: 'right'
      },
      3: {
        position: 3,
        name: 'Name',
        align: 'left'
      },
      4: {
        position: 4,
        name: 'Distance',
        align: 'right',
        numberFormat: '#.##'
      },
      5: {
        position: 5,
        name: 'Duration',
        align: 'right'
      },
      6: {
        position: 6,
        name: 'Average Speed',
        align: 'right',
        numberFormat: '#.##'
      },
      7: {
        position: 7,
        name: 'Max Speed',
        align: 'right'
      },
      8: {
        position: 8,
        name: 'Lat',
        align: 'right'
      },
      9: {
        position: 9,
        name: 'Lon',
        align: 'right'
      },
      10: {
        position: 10,
        name: 'City',
        align: 'left'
      },
      11: {
        position: 11,
        name: 'Country',
        align: 'left'
      },
      12: {
        position: 12,
        name: 'Friends',
        align: 'right'
      },
      13: {
        position: 13,
        name: 'Description',
        align: 'left',
        size: 70,
        wrapping: 'clip'
      },
      14: {
        position: 14,
        name: 'Avg Wind',
        align: 'right',
        numberFormat: '#.#'
      },
      15: {
        position: 15,
        name: 'Avg Gusts',
        align: 'right',
        numberFormat: '#.#'
      },
      16: {
        position: 16,
        name: 'Strongest Gust',
        align: 'right',
        numberFormat: '#.#'
      },
      17: {
        position: 17,
        name: 'Avg Wind Dir',
        align: 'right',
        numberFormat: '#'      
      },
      18: {
        position: 18,
        name: 'Avg Temp',
        align: 'right',
        numberFormat: '#'
      },
    }
  };
  
  // Configure different environments
  var ENV_SETTINGS = {
    test: {
      envName: 'test',
      sheetName: 'Sessions[T]',
      frozenRows: 1,
      frozenColumns: 1,
      updateStrava: false,
      updateSessions: {
        enabled: true,
        location: true,
        userGeneratedContent: false,
        knmi: true
      },
      markupdata : true
    },
    prod: {
      envName: 'prod',
      sheetName: 'Sessions',
      frozenRows: 1,
      frozenColumns: 1,
      updateStrava: true,
      updateSessions: {
        enabled: true,
        location: true,
        userGeneratedContent: true,
        knmi: false
      },
      markupdata : true
    }
  };