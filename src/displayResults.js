let curve90 = [],
    curve180 = [],
    circles = [];


async function displayResults(results, mapCtrl) {
    mapControl = mapCtrl;
    setOutput("curve detection completed.");
    curve90 = results.shapeDetection.curve90;
    curve180 = results.shapeDetection.c180;
    if (curve90.length > 0) {
        setCheckboxValue(curve90Checkbox, true);
        displayCurves(curve90, "curve90")
    } else curve90Checkbox.disabled = true;
    if (curve180.length > 0) {
        setCheckboxValue(curve180Checkbox, true);
        displayCurves(curve180, "curve180");
    } else curve180Checkbox.disabled = true;
}

function displayCurves(positionArray, layerName = "") {
    for (const key in positionArray) {
        const array = positionArray[key];
        mapControl.addMarkerTo(layerName, latLong[array[1]]); // position 1 is the center of a curve
        const curvePoints = latLong.slice(array[0], array[2]);
        mapControl.addCurve(curvePoints);
    }
}

function displayCircles(circles, color) {
    for (const circleIndex of circles) {
        const circlePoints = latLong.slice(circleIndex[0], circleIndex[1]+1);
        mapControl.addShape(circlePoints, color);
    }
    circleCheckbox.disabled = circles.length === 0;
}

function displayEights(eights) {
    for (const item of eights) {
        const points = latLong.slice(item[0], item[1]+1);
        mapControl.addMarkerTo("eights", latLong[item[0]]);
        mapControl.addShape(points);
    }
}

circleCheckbox.addEventListener('change', () => {
    if (circleCheckbox.checked)
        displayCircles(circles);
    else
        mapControl.clearLayer("circles");

});

curve90Checkbox.addEventListener('change', () => {
    if (curve90Checkbox.checked)
        displayCurves(curve90, "curve90");
    else
        mapControl.clearLayer("curve90");
});

curve180Checkbox.addEventListener('change', () => {
    if (curve180Checkbox.checked)
        displayCurves(curve180, "curve180");
    else
        mapControl.clearLayer("curve180");
});
