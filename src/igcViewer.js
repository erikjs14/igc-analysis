'use strict';

altitudeConversionFactor = 1.0; // Conversion from metres to required units

function positionDisplay(position) {
    function toDegMins(degreeValue) {
        let wholeDegrees = Math.floor(degreeValue);
        let minuteValue = (60 * (degreeValue - wholeDegrees)).toFixed(3);
        return wholeDegrees + '\u00B0\u00A0' + minuteValue + '\u00B4';
    }

    let positionLatitude = toDegMins(Math.abs(position[0]));
    let positionLongitude = toDegMins(Math.abs(position[1]));
    if (position[0] > 0) {
        positionLatitude += "N";
    } else {
        positionLatitude += "S";
    }
    if (position[1] > 0) {
        positionLongitude += "E";
    } else {
        positionLongitude += "W";
    }
    return positionLatitude + ",   " + positionLongitude;
}

updateTimeline = (timeIndex, mapControl) => {
    let currentPosition = igcFile.latLong[timeIndex];
    console.log(timeIndex)
    let positionText = positionDisplay(currentPosition);
    let unitName = altitudeUnits.value;
    timePositionDisplay.innerHTML = moment(igcFile.recordTime[timeIndex]).format('HH:mm:ss') + ': ' +
        (igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
        unitName + ' (barometric) / ' +
        (igcFile.gpsAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
        unitName + ' (GPS); ' +
        positionText;

    mapControl.setTimeMarker(timeIndex);
}

function displayIgc(mapControl) {
    // Display the headers.
    let displayDate = moment(igcFile.recordTime[0]).format('LL');
    headerTableElement.innerHTML = '<tr></tr>' + '<th>Date</th>'
        + '<td>' + displayDate + '</td>';
    for (let headerIndex = 0; headerIndex < igcFile.headers.length; headerIndex++) {
        headerTableElement.innerHTML += '<tr></tr>' + '<th>' + igcFile.headers[headerIndex].name + '</th>'
            + '<td>' + igcFile.headers[headerIndex].value + '</td>';
    }

    // Show the task declaration if it is present.

    if (igcFile.task.coordinates.length > 0) {
        //eliminate anything with empty start line coordinates
        if (igcFile.task.coordinates[0][0] !== 0) {
            taskElement.style.display = 'block';
            //Now add TP numbers.  Change to unordered list
            if (igcFile.task.takeoff.length > 0) {
                taskListElement.innerHTML = '<li>' + 'Takeoff: ' + igcFile.task.takeoff + '</li>';
            }
            for (let j = 0; j < igcFile.task.names.length; j++) {
                switch (j) {
                    case 0:
                        taskListElement.innerHTML += '<li>' + 'Start: ' + igcFile.task.names[j] + '</li>';
                        break;
                    case (igcFile.task.names.length - 1):
                        taskListElement.innerHTML += '<li>' + 'Finish: ' + igcFile.task.names[j] + '</li>';
                        break;
                    default:
                        taskListElement.innerHTML += '<li>' + 'TP' + (j).toString() + ": " + igcFile.task.names[j] + '</li>';
                }
            }
            if (igcFile.task.landing.length > 0) {
                taskListElement.innerHTML += '<li>' + 'Landing: ' + igcFile.task.landing + '</li>';
            }
            mapControl.addTask(igcFile.task.coordinates, igcFile.task.names);
        }
    } else {
        taskElement.style.display = 'none';
    }

    // Reveal the map and graph. We have to do this before
    // setting the zoom level of the map or plotting the graph.
    igcFileDisplay.style.display = 'block';

    mapControl.addTrack(igcFile.latLong);

    timeSliderElement.setAttribute('max', `${igcFile.recordTime.length - 1}`);
    updateTimeline(0, mapControl);
    return "done";
}

function storePreference(name, value) {
    if (window.localStorage) {
        try {
            localStorage.setItem(name, value);
        } catch (e) {
            console.log('%ccould not save preferences into local storage:', 'color: gray', e);
        }
    }
}

function sendData(file) {
    let data = new FormData();
    data.append("igcfile", file);

    fetch(serverAddress + "api/igc/readFromForm.php?XDEBUG_SESSION_START=TRUE", {
        method: 'post',
        body: data,
    }).then(async response => {
        response = await response.json();
        console.log(response);
        igcContainer.style.display = 'flex';
        downloadParagraph.innerHTML = "The file is available here: ";
        downloadURL.innerHTML = response.url;
        downloadURL.setAttribute("href", response.url)
    })
}

document.addEventListener("DOMContentLoaded", function () {
    mapControl = createMapControl('map');

    moment.tz.names().forEach((name, index) => {
        timeZoneSelect.innerHTML += `<option value="${name}">` + name + '</option>';

    });

    timeZoneSelect.onchange = () => {
        let selectedZone = timeZoneSelect.value;
        moment.tz.setDefault(selectedZone);
        if (igcFile !== null) {
            updateTimeline(timeSliderElement.value, mapControl);
            let headerTD = document.querySelector('#headerInfo td');
            headerTD.innerHTML = moment(igcFile.recordTime[0]).format('LL');
        }

        storePreference('timeZone', selectedZone);
    }

    handleFileInput = async (file) => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    errorMessageElement.innerHTML = '';
                    mapControl.reset();
                    timeSliderElement.value = 0
                } catch (ex) {
                    errorHandler(ex);
                }

                igcFile = parseIGC(reader.result);
                displayIgc(mapControl);
                const results = await runAlgorithms(igcFile);
                console.log(results);
                await displayResults(results, mapControl);
                plotBarogramChart(igcFile);
                return resolve();
            };
            igcContainer.style.display = 'none';
            reader.readAsText(file);

        })
    };

    fileControl.onchange = function () {
        if (this.files.length < 1) return;
        sendData(this.files[0]);
        handleFileInput(this.files[0]);
    }

    function displayDefaultFile() {
        fetch(serverAddress + 'api/igc/getFile.php')
            .then(res => res.blob())
            .then(blob => {
                let reader = new FileReader();
                reader.onload = async function (e) {
                    try {
                        errorMessageElement.innerHTML = '';
                        mapControl.reset();
                        timeSliderElement.value = 0;
                    } catch (ex) {
                        errorHandler(ex);
                    }

                    igcFile = parseIGC(this.result);
                    displayIgc(mapControl);
                    const results = await runAlgorithms(igcFile);
                    console.log(results);
                    displayResults(results, mapControl);
                };
                igcContainer.style.display = 'none';
                reader.readAsText(blob);
            });
    }

    displayDefaultFileButton.addEventListener("click", displayDefaultFile);


    altitudeUnits.onchange = function (e) {
        let altitudeUnit = this.value;

        if (this.value === 'feet') altitudeConversionFactor = 3.2808399;
        else altitudeConversionFactor = 1.0;

        if (igcFile !== null) updateTimeline(timeSliderElement.value, mapControl);
        storePreference("altitudeUnit", altitudeUnit);
    };

    // We need to handle the 'change' event for IE, but
    // 'input' for Chrome and Firefox in order to update smoothly
    // as the range input is dragged.
    function timeSliderChangeHandler() {
        const index = parseInt(timeSliderElement.value, 10);
        updateTimeline(index, mapControl)
    }

    timeSliderElement.oninput = timeSliderChangeHandler;
    timeSliderElement.onchange = timeSliderChangeHandler;

    timeBackButton.addEventListener("click", () => {
        let curTime = parseInt(timeSliderElement.value, 10);
        curTime--;
        if (curTime < 0) curTime = 0;
        setTimelineValue(curTime, mapControl);
    });

    timeForwardButton.addEventListener("click", () => {
        let curTime = parseInt(timeSliderElement.value, 10);
        curTime--;
        if (curTime < 0) curTime = 0;
        setTimelineValue(curTime, mapControl);
    });

    // Load preferences from local storage, if available.

    let altitudeUnit = '';
    let timeZone = '';

    if (window.localStorage) {
        try {
            altitudeUnit = localStorage.getItem('altitudeUnit');
            if (altitudeUnit) {
                altitudeUnits.value = altitudeUnit;
                altitudeUnits.onchange();
            }

            timeZone = localStorage.getItem('timeZone');
        } catch (e) {
            // If permission is denied, ignore the error.
        }
    }

    if (!timeZone) {
        timeZone = 'UTC';
    }

    timeZoneSelect.value = timeZone;
    moment.tz.setDefault(timeZone);

    if (displayDefaultFileOnStartup) displayDefaultFile();
});
