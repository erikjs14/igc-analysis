'use strict';

document.addEventListener("DOMContentLoaded", () => {
    getTimeZoneOptions();
    getTimeZone();
});

async function handleFileInput(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = async () => {
            await resetMap();
            igcFile = parseIGC(reader.result);
            displayIgc(mapControl);
            const results = await runAlgorithms(igcFile);
            console.log(results);
            plotBarogramChart(igcFile);
            return resolve();
        };
        igcContainer.style.display = 'none';
        reader.readAsText(file);
    })
}

async function displayDefaultFile() {
    const file = await fetch(serverAddress + 'api/igc/getFile.php');
    const blob = await file.blob();
    return await handleFileInput(blob);
}

function updateTimeline(timeIndex) {
    const currentPosition = igcFile.latLong[timeIndex];
    if (timeIndex > 0) console.log(timeIndex);
    const positionText = getPositionString(currentPosition);
    const unitName = altitudeUnits.value;
    timePositionDisplay.innerHTML = moment(igcFile.recordTime[timeIndex]).format('HH:mm:ss') + ': ' +
        (igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
        unitName + ' (barometric) / ' +
        (igcFile.gpsAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
        unitName + ' (GPS); ' + positionText;

    mapControl.setTimeMarker(timeIndex);
}

async function resetMap() {
    try {
        errorMessageElement.innerHTML = "";
        if (L.AwesomeMarkers === undefined) throw new IGCException('The Awesome Markers Library could not be loaded.')
        if(mapControl) {
            mapControl.initMap();
        } else {
            mapControl = await createMapControl('map');
        }
        timeSliderElement.value = 0;
    } catch (ex) {
        errorHandler(ex);
    }
    return mapControl;
}

function storePreference(name, value) {
    if (!window.localStorage) return;
    try {
        localStorage.setItem(name, value);
    } catch (e) {
        console.log('%ccould not save preferences into local storage:', 'color: gray', e);
    }
}

function displayIgc(mapControl) {
    displayIGCHeader();
    showIGCTasks();

    // Reveal the map and graph. Necessary before setting the zoom level of the map or plotting the graph.
    igcFileDisplay.style.display = 'block';

    mapControl.addTrack(igcFile.latLong);

    timeSliderElement.setAttribute('max', `${igcFile.recordTime.length - 1}`);
    updateTimeline(0, mapControl);
    return "done";
}

function getTimeZoneOptions(){
    moment.tz.names().forEach((name) => {
        timeZoneSelect.innerHTML += `<option value="${name}">` + name + '</option>';
    });

    timeZoneSelect.onchange = () => {
        const selectedZone = timeZoneSelect.value;
        moment.tz.setDefault(selectedZone);
        if (igcFile !== null) {
            updateTimeline(timeSliderElement.value, mapControl);
            const headerTD = document.querySelector('#headerInfo td');
            headerTD.innerHTML = moment(igcFile.recordTime[0]).format('LL');
        }

        storePreference('timeZone', selectedZone);
    }
}

function getTimeZone(){
    let altitudeUnit = '';
    let timeZone = '';
    // Load preferences from local storage, if available.
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

    if (!timeZone) timeZone = 'UTC';
    timeZoneSelect.value = timeZone;
    moment.tz.setDefault(timeZone);
}

timeSliderElement.oninput = timeSliderChangeHandler; // for Chrome and Firefox
timeSliderElement.onchange = timeSliderChangeHandler; // for IE
function timeSliderChangeHandler() {
    updateTimeline(getTimeLineValue(), mapControl)
}

timeBackButton.addEventListener("click", () => setTimelineValue(
    getTimeLineValue() - 1
));

timeForwardButton.addEventListener("click", () => setTimelineValue(
    getTimeLineValue() + 1
));

displayDefaultFileButton.addEventListener("click", displayDefaultFile);

fileControl.onchange = function () {
    if (this.files.length < 1) return;
    handleFileInput(this.files[0]);
};

altitudeUnits.onchange = function () {
    if (this.value === 'feet') {
        altitudeConversionFactor = 3.2808399;
    } else {
        altitudeConversionFactor = 1.0;
    }

    if (igcFile !== undefined) {
        updateTimeline(timeSliderElement.value, mapControl);
        plotBarogramChart();
    }
    storePreference("altitudeUnit", this.value);
};