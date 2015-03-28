/**
 * created by Jaime Valencia
 * Modified by zacharymartin on 3/17/15.
 */

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
} else {
    alert('The File APIs are not fully supported in this browser.');
}


function BioFeature(feaLabel){
    this.parentFeature=null;
    this.featureLabel=feaLabel;
    this.description='';
    this.topLeftCoords=-1;
    this.bottomRightCoords=-1;
    this.topLeftValue='';
    this.bottomRightValue='';
    this.relativeToLeftX=-1;
    this.relativeToLeftY=-1;
    this.color='';
    this.typeOfChild=null;  // Data, Range, Unique
    this.bioFeatures=[];

}

var PARSING = 0;
var PLATE = 1;
var FEATURES = 2;

var currentTopLeftCoord = null;
var currentBottomRightCoord = null;

var grid = new Grid("myGrid");
var parsingConfig;

var colorPointer = 0;
var colorKeyCounter = 0;
var colorPicker = new ColorPicker();

var biofeatures = [];
var colsSize =-1;
var rowsSize =-1;
var numberOfFeatures =-1;
var numberOfFeaturesCHILD =-1;

var highlightKeys = [];
var examiner = new FileExaminer();

examiner.registerAsLoadListener(function(examiner){
    setDelimiter(examiner.delimiter);
    grid.setData(examiner.matrix);
    grid.fillUpGrid();
    grid.registerSelectedCellCallBack(handleSelectedCells);
    colsSize = examiner.colsSize;
    rowsSize = examiner.rowsSize;
});



function applyFeatures(){

    for(var i = 0; i < biofeatures.length; i++){

        var currentFeature = biofeatures[i];

        var breakLabel = currentFeature.topLeftValue.trim();

        var startPoint = currentFeature.topLeftCoords;
        var endPoint = currentFeature.bottomRightCoords;
        var relativeCol = currentFeature.relativeToLeftX;

        var numOfRows = endPoint[0] - startPoint[0];
        var numOfCols = endPoint[1] - startPoint[1];
        var colorFeature = colorPicker.getColorByIndex(currentFeature.color);

        for(var j = startPoint[0]; j<rowsSize; j++){
            var newLabel = grid.getDataPoint(j,startPoint[1]).trim();

            if(breakLabel == newLabel){
                var coordsToHighlight = [];

                for(var rowIdx = 0; rowIdx<=numOfRows; rowIdx++) {
                    for(var colIdx = 0; colIdx<=numOfCols; colIdx++) {
                        coordsToHighlight.push([rowIdx+j,colIdx + relativeCol]);
                    }
                }
                grid.setCellColors(coordsToHighlight, colorFeature, colorPicker.getDistinctColorKey());


                for(var idxChild = 0; idxChild < currentFeature.bioFeatures.length; idxChild++) {
                    var currentChild = currentFeature.bioFeatures[idxChild];

                    var startPointChild = currentChild.topLeftCoords;
                    var endPointChild = currentChild.bottomRightCoords;
                    var relativeChildCol = currentChild.relativeToLeftX;
                    var relativeChildRow= currentChild.relativeToLeftY;

                    var numOfRowsChild = endPointChild[0] - startPointChild[0];
                    var numOfColsChild = endPointChild[1] - startPointChild[1];
                    var colorFeatureChild
                        = colorPicker.getColorByIndex(currentChild.color);

                    coordsToHighlight = [];
                    for(var rowIdxChild = 0; rowIdxChild<=numOfRowsChild; rowIdxChild++) {
                        for(var colIdxChild = 0; colIdxChild<=numOfColsChild; colIdxChild++) {

                            coordsToHighlight.push([
                                rowIdxChild+relativeChildRow+j,
                                colIdxChild+relativeChildCol+relativeCol
                            ]);
                        }
                    }

                    grid.setCellColors(coordsToHighlight, colorFeatureChild, colorPicker.getDistinctColorKey());
                }

                j=j+rowIdx-1;
            }
            //console.log("ROwS " + j);
        }

    }
}

$( "#btn-apply-features" ).click(function() {
    applyFeatures();
});


// feature adding section
function addFeatureLegacy(isParent){
    return addFeature(
        $('#featureLabel').text(),
        grid,
        isParent,
        biofeatures[$("#select-to option:selected").val()],
        $('input[name=parent-radio]:checked').val(),
        $('input[name=child-radio]:checked').val()
    );
}

function addFeature(name, grid, isParent, parent, typeOfParent, typeOfChild){
    var newFeature = new BioFeature(name);
    newFeature.topLeftCoords= [grid.selectedStartRow, grid.selectedStartCol];
    newFeature.topLeftValue=grid.getDataPoint(grid.selectedStartRow, grid.selectedStartCol);
    newFeature.bottomRightCoords = [grid.selectedEndRow, grid.selectedEndCol];
    newFeature.bottomRightValue= grid.getDataPoint(grid.selectedEndRow, grid.selectedEndCol);
    newFeature.relativeToLeftX = grid.selectedStartRow;
    newFeature.relativeToLeftY = grid.selectedStartCol;
    if (isParent) {
        newFeature.typeOfParent = typeOfParent;
    } else {
        newFeature.typeOfChild = typeOfChild;

        // When it is one value set both top and bottom properties to
        // the same value.
        if(newFeature.typeOfChild=='unique'){
            newFeature.bottomRightCoords=newFeature.topLeftCoords;
            newFeature.bottomRightValue=newFeature.topLeftValue;
        }
        newFeature.parentFeature = parent;
        newFeature.parentFeature.bioFeatures.push(newFeature);
        newFeature.relativeToLeftX = newFeature.topLeftCoords[1] - newFeature.parentFeature.topLeftCoords[1];
        newFeature.relativeToLeftY = newFeature.topLeftCoords[0] - newFeature.parentFeature.topLeftCoords[0];
        newFeature.importData = true;
    }
    newFeature.color=colorPointer;
    colorPointer++;

    console.log(newFeature);
    return newFeature;
}

function addPlate(grid){
    parsingConfig.plate = addFeature("plate", grid, true, null, "plate", null );

    return parsingConfig.plate
}

function addExperimentLevelFeature(name, grid){
    return addFeature(name, grid, true, null, "experimentFeature", null);
}

function addPlateLevelFeature(name, grid){
    return addFeature(name, grid, false, parsingConfig.plate, null, 'unique');
}

function addWellLevelFeature(name, grid){
    return addFeature(name, grid, false, parsingConfig.plate, null, 'data');
}

function makePlate(){
    biofeatures.push(addPlate(grid));

    // legacy compliance
    $('#select-to').append("<option value='"+(numberOfFeatures+1)+"'>"+"plate"+"</option>");
}

function makeFeature(){
    var category = document.getElementById("featureCategory").value;
    var feature;


    if (document.getElementById("wellLevel").checked){
        feature = addWellLevelFeature(category, grid);
    } else if (document.getElementById("plateLevel").checked){
        feature = addPlateLevelFeature(category, grid);
    } else if (document.getElementById("experimentLevel").checked){
        feature = addExperimentLevelFeature(category, grid);
    }

    // load feature selector
    var featureSelectElement = document.getElementById("featureList");
    var optionValue = feature.featureLabel;
    var option = document.createElement("option");
    option.setAttribute("value", optionValue);
    option.innerHTML = feature.featureLabel + " "
                        + Grid.getRowLabel(grid.selectedStartRow) + grid.selectedStartCol
                        +":"+ Grid.getRowLabel(grid.selectedEndRow) + grid.selectedEndCol;
    featureSelectElement.appendChild(option);


    // legacy compliance
    $('#select-to-child').append("<option value='"+(numberOfFeatures+1)+"'>"+category+"</option>");
}


// end of feature adding section


/**
 * replaces anonymous function starting on line 114 of original csvParser.html
 * @param startRow
 * @param startCol
 * @param endRow
 * @param endCol
 */
function handleSelectedCells(startRow, startCol, endRow, endCol){
    selectCells(startRow, startCol, endRow, endCol);

    // plate range input on the plate page
    var plateRangeInput = document.getElementById("firstPlateCellRange");
    plateRangeInput.value = Grid.getRowLabel(startRow)+startCol+":"
    +Grid.getRowLabel(endRow)+endCol;

    // feature range input on the feature page
    var featureRangeInput = document.getElementById("featureCellRange");
    featureRangeInput.value = Grid.getRowLabel(startRow)+startCol+":"
    +Grid.getRowLabel(endRow)+endCol;
}

function selectCells(startRow, startCol, endRow, endCol){
    // write to the selected cells div, the cells that are selected
    var out = document.getElementById("selectedCells");
    out.innerHTML = Grid.getRowLabel(startRow)+startCol+":"
    +Grid.getRowLabel(endRow)+endCol;



    // remove previous highlighting
    if (highlightKeys.length){
        grid.removeCellColors(highlightKeys.pop());
    }


    // highlight those cells with the current color
    var coordinatesToHighlight = [];
    for (var i=startRow; i<=endRow; i++){
        for (var j=startCol; j<=endCol; j++){
            coordinatesToHighlight.push([i,j]);
        }
    }
    grid.setCellColors(coordinatesToHighlight,
                       colorPicker.getColorByIndex(colorPointer),
                       colorPicker.getCurrentColorKey());
    highlightKeys.push(colorPicker.getCurrentColorKey());

    // set the current selected cells variables
    currentTopLeftCoord = [startRow,startCol];
    currentBottomRightCoord = [endRow,endCol];
}


$('#btn-add-child').click(function(){
    $('#select-to-child').append("<option value='"+(numberOfFeaturesCHILD+1)+"'>"+$('#featureLabel').val()+"</option>");
    addFeatureLegacy(false);
    colorPointer++;
    $('#featureLabel').val('');
});

$('#btn-add').click(function(){
    $('#select-to').append("<option value='"+(numberOfFeatures+1)+"'>"+$('#featureLabel').val()+"</option>");
    biofeatures.push(addFeatureLegacy(true));
    colorPointer++;
    $('#featureLabel').val('');
});

$('#btn-remove').click(function(){
    $('#select-to option:selected').each( function() {
        $(this).remove();
        numberOfFeatures--;
    });
});


function handleFileSelect(event) {
    var files;
    var fileNameDisplayElement = document.getElementById("selectedFile");

    if (event.target && event.target.files){
        // file input case
        files = event.target.files; // FileList object
    } else if (event.dataTransfer && event.dataTransfer.files) {
        // drag and drop case
        files = event.dataTransfer.files;
    }

    // reset parser
    currentTopLeftCoord = null;
    currentBottomRightCoord = null;


    colorPointer = 0;
    biofeatures = [];
    lines = [];
    colsSize =-1;
    rowsSize =-1;
    numberOfFeatures =-1;
    numberOfFeaturesCHILD =-1;

    fileNameDisplayElement.innerHTML = files[0].name;
    examiner.setFile(files[0]);

}

function changeDelimiter(){
    var delimiter = document.getElementById("delimiterList").value;
    examiner.reExamineWithDelimiter(delimiter);
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);

function handleGetFile(){
    $("#files").click();
}

function setDelimiter(delimiter){
    var element = document.getElementById("delimiterList");
    element.value = delimiter;

}

// Attach listener for when a file is first dragged onto the screen
document.addEventListener('dragenter', function(e) {
    e.stopPropagation();
    e.preventDefault();

    // Show an overlay so it is clear what the user needs to do
    document.body.classList.add('show-overlay');
}, false);

// Attach a listener for while the file is over the browser window
document.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
}, false);

// Attach a listener for when the file is actually dropped
document.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();

    // Hides the overlay
    //document.body.classList.remove('show-overlay');

    // Process the files
    handleFileSelect(e);

}, false);


function firstPlateCellRangeChange(){
    var plateRangeInput = document.getElementById("firstPlateCellRange");
    cellRangeChange(plateRangeInput);
}

function featureCellRangeChange(){
    var featureRangeInput = document.getElementById("featureCellRange");
    cellRangeChange(featureRangeInput);
}

function cellRangeChange(inputElement){
    var range = inputElement.value.trim();
    var rangeSplit = range.split(":");
    var start = rangeSplit[0].trim();
    var end = rangeSplit[1].trim();
    start = Grid.getCellCoordinates(start);
    end = Grid.getCellCoordinates(end);
    grid.selectedStartRow = start[0];
    grid.selectedStartCol = start[1];
    grid.selectedEndRow = end[0];
    grid.selectedEndCol = end[1];
    selectCells(start[0], start[1], end[0], end[1]);
}

function searchForPlateInvariates(){
    var valueToLookFor;
    var timesFound;
    var possibleInvariateCoords = [];
    var threshold
        = Math.floor(rowsSize/((currentBottomRightCoord[0] - currentTopLeftCoord[0])*2));

    for(var row=currentTopLeftCoord[0]; row<=currentBottomRightCoord[0]; row++){
        for(var col=currentTopLeftCoord[1]; col<=currentBottomRightCoord[1]; col++){
            valueToLookFor = grid.getDataPoint(row, col).trim();
            if (valueToLookFor){
                timesFound = 0;
                for(var obsRow = currentBottomRightCoord[0]+1; obsRow<=rowsSize; obsRow++){
                    var currentValue = grid.getDataPoint(obsRow, col);
                    if (currentValue && currentValue.trim() == valueToLookFor){
                        timesFound++;
                        if (timesFound >= threshold) {

                            possibleInvariateCoords.push([row,col]);
                            break;
                        }
                    }

                }


            }
        }
    }

    var invariatesKey = colorPicker.getDistinctColorKey();
    grid.setCellColors(possibleInvariateCoords, "#a00", invariatesKey);

    // load invariate cell selector
    var invariateSelectElement = document.getElementById("invariateSelect");
    for (var i=0; i<possibleInvariateCoords.length; i++){
        var cellRow = possibleInvariateCoords[i][0] + 1;
        var cellCol = possibleInvariateCoords[i][1];
        var cellValue = grid.getDataPoint(cellRow, cellCol);
        var optionValue = cellRow+":"+ cellCol;

        var option = document.createElement("option");
        option.setAttribute("value", optionValue);
        option.innerHTML = cellValue + " : " + Grid.getRowLabel(cellRow) + cellCol;
        invariateSelectElement.appendChild(option);
    }
}

function createParsingConfig(){
    var name = document.getElementById("parsingName").value;
    var machine = document.getElementById("machineName").value;
    var description = document.getElementById("parsingDescription").value;
    var exampleFileName = document.getElementById("selectedFile").innerHTML;
    var exampleFileContents = examiner.fileContents;
    var multiplePlatesPerFile = document.getElementById("multiplePlates").checked;
    var multipleValuesPerWell = document.getElementById("multipleValues").checked;
    var gridFormat = document.getElementById("gridFormat").checked;

    if (parsingConfig){
        parsingConfig.name = name;
        parsingConfig.machineName = machine;
        parsingConfig.description = description;
        parsingConfig.exampleFileName = exampleFileName;
        parsingConfig.exampleFileContents = exampleFileContents;
        parsingConfig.delimiter = examiner.delimiter;
        parsingConfig.multiplePlatesPerFile = multiplePlatesPerFile;
        parsingConfig.multipleValuesPerWell = multipleValuesPerWell;
        parsingConfig.gridFormat = gridFormat;
    }
    parsingConfig = new ParsingConfig(
            name,
            machine,
            description,
            exampleFileName,
            exampleFileContents,
            examiner.delimiter,
            multiplePlatesPerFile,
            multipleValuesPerWell,
            gridFormat
    );
    console.log(parsingConfig);
}

/**
 * This function returns the active tab, to be compared with the constants:
 *      PARSING
 *      PLATE
 *      FEATURES
 * @returns {*|jQuery}
 */
function getActiveTab(){
    return $("#tabs").tabs( "option", "active" );
}


/**
 * addEvent - This function adds an event handler to an html element in
 * a way that covers many browser types.
 * @param elementId - the string id of the element to attach the handler to
 * or a reference to the element itself.
 * @param eventType - a string representation of the event to be handled
 * without the "on" prefix
 * @param handlerFunction - the function to handle the event
 */
function addEvent(elementId, eventType, handlerFunction) {
    'use strict';

    var element;

    if (typeof(elementId) === "string"){
        element = document.getElementById(elementId);
    } else {
        element = elementId;
    }

    if (element.addEventListener) {
        element.addEventListener(eventType, handlerFunction, false);
    } else if (window.attachEvent) {
        element.attachEvent("on" + eventType, handlerFunction);
    }
} // end of function addEvent

/**
 * This function handles the window load event. It initializes and fills the
 * grid with blank data and sets up the event handlers on the
 */
function init(){

    addEvent("firstPlateCellRange", "change", firstPlateCellRangeChange);
    addEvent("featureCellRange", "change", featureCellRangeChange);
    addEvent("applyFirstPlate", "click", makePlate);
    addEvent("getFile", "click", handleGetFile);
    addEvent("delimiterList", "change", changeDelimiter);
    addEvent("saveConfig", "click", createParsingConfig);
    addEvent("saveFeature", "click", makeFeature);
    addEvent("applyFeatures", "click", applyFeatures);

    // to get jQuery-UI tab functionality working
    $( "#tabs" ).tabs({
        active: 0
    });
}

window.onload = init;

