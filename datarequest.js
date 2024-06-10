let currentDatas;
let mousePosition = {
  x: 0,
  y: 0,
};
let canvasDragging = {
    initialX: 0,
    initialY: 0,
    slidedPositionX: 0,
    slidedPositionY: 0,
    zoomModifierX: 0,
    zoomModifierY: 0
};
let viewRange = {
    startIndex: 0, 
    endIndex: 0
};
let chartMinValue;
let chartMaxValue;
const canvas = document.getElementById('myChart');
let canvasWidth = canvas.offsetWidth;
let canvasHeight = canvas.offsetHeight;
const submitBtn = document.getElementById('submit-btn');
const testText = document.getElementById('test');

submitBtn.addEventListener('click', requestData);
canvas.addEventListener('wheel', zoom);
canvas.addEventListener('mousedown', dragCanvas);
canvas.addEventListener('mouseup', restoreCursor);

window.addEventListener('resize', () => {
    canvasWidth = canvas.offsetWidth;
    canvasHeight = canvas.offsetHeight;
}); 

async function fetchStocks(stockname, from, to){
    const response = await fetch(`http://localhost:8080/stocks?stock=${stockname}&from=${from}&to=${to}`);
    const data = await response.json();

    return data;
}

async function requestData(e){
    e.preventDefault();
    const stockName = document.getElementById('stock-name').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    currentDatas = await fetchStocks(stockName, dateFrom, dateTo);

    drawTable();
}

function drawTable(){
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.save();
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.translate(0 + canvasDragging.slidedPositionX, canvasHeight + canvasDragging.slidedPositionY);
    let startIndex = viewRange.startIndex;
    let endIndex = viewRange.endIndex;
    let sidebarWidth = canvasWidth / 5;
    let bottombarHeight = canvasHeight / 5;
    let availableWidthForCandles = canvasWidth - sidebarWidth;
    let availableHeightForCandles = canvasHeight - bottombarHeight;

    // Bar size and spacing initialization
    let range = endIndex - startIndex;
    let availableSpacePerBar = availableWidthForCandles / range;
    let barSpace = availableSpacePerBar / 3;
    let barWidth = availableSpacePerBar - barSpace;   

    // dynamic index calculation
    let startIndexModifier = calculateStartIndexVisibility(startIndex, availableSpacePerBar);
    startIndex = dynamicStartIndex(startIndex, startIndexModifier);
    range = endIndex - startIndex;
    let endIndexModifier = calculateEndIndexVisibility(range, availableSpacePerBar);
    endIndex = dynamicEndIndex(endIndex, endIndexModifier);
    
    range = endIndex - startIndex;
    let pivot = startIndex;
    // ratio: amount of huf per pixel Y axis
    const ratio = (chartMaxValue - chartMinValue) / availableHeightForCandles;
    let barTopY;
    let barHeight;
    for (let i = 0; i < range; i++) {
        let closePrice = currentDatas[pivot].closePrice;
        let openPrice = currentDatas[pivot].openPrice;
        let barTopX = - (startIndexModifier * availableSpacePerBar) + i * barWidth + barSpace * i + barSpace / 4;
        
        if (closePrice < openPrice){
            barTopY = - ((openPrice - chartMinValue) / ratio) - bottombarHeight;
            barHeight = (openPrice - closePrice) / ratio;
            ctx.fillStyle = 'red';
            ctx.strokeStyle = 'red';
        } else {
            barTopY = - ((closePrice - chartMinValue) / ratio) - bottombarHeight;
            ctx.fillStyle = 'green';
            ctx.strokeStyle = 'green';
            barHeight = (closePrice - openPrice) / ratio;
        }
        // draw bar
        ctx.fillRect(barTopX, barTopY, barWidth, barHeight);
                  
        // draw line from bar to maxprice
        ctx.beginPath();
        let barMiddlePointX = (barTopX+(barTopX+barWidth)) / 2;
        let maxPrice = currentDatas[pivot].maxPrice;
        let maxPricePointY = - ((maxPrice - chartMinValue) / ratio) - bottombarHeight;
        ctx.moveTo(barMiddlePointX, barTopY);
        ctx.lineTo(barMiddlePointX, maxPricePointY);
        ctx.stroke();
  
        // drawline from bar to minprice
        let minPrice = currentDatas[pivot].minPrice;
        let minPricePointY = -((minPrice - chartMinValue) / ratio) - bottombarHeight;
        ctx.moveTo(barMiddlePointX, barTopY + barHeight);
        ctx.lineTo(barMiddlePointX, minPricePointY);
        ctx.stroke();
    
        pivot++;
    }
}

function dynamicStartIndex(startIndex, startIndexModifier) {
    startIndex -= startIndexModifier;
    startIndex = Math.max(0, startIndex);
    return startIndex;
}

function calculateStartIndexVisibility(startIndex, availableSpacePerBar) {
    let startIndexModifier = Math.floor(canvasDragging.slidedPositionX / availableSpacePerBar);
    startIndexModifier = Math.min(startIndexModifier, startIndex);
    return startIndexModifier;
}

function calculateEndIndexVisibility(range, availableSpacePerBar) {
    let endIndexModifier = Math.floor((canvasWidth - range * availableSpacePerBar) / availableSpacePerBar);
    return endIndexModifier;
}

function dynamicEndIndex(endIndex, endIndexModifier) {
    endIndex += endIndexModifier;
    endIndex = Math.min(endIndex, currentDatas.length);
    return endIndex;
}

function calculateMin() {
    let minimumValue = currentDatas[viewRange.startIndex].minPrice;
    for(let i = viewRange.startIndex; i < viewRange.endIndex; i++){
        if (currentDatas[i].minPrice < minimumValue){
            minimumValue = currentDatas[i].minPrice;
        }
    }
    return minimumValue;
}

function calculateMax(){
    let maximumValue = currentDatas[viewRange.startIndex].maxPrice;
    for(let i = viewRange.startIndex; i < viewRange.endIndex; i++){
        if(currentDatas[i].maxPrice > maximumValue){
        maximumValue = currentDatas[i].maxPrice;
        }
    }
    return maximumValue;
}

function zoom(e){
    e.preventDefault();
    mousePosition.x = e.offsetX;
    mousePosition.y = e.offsetY;

    if (e.deltaY > 0){
        zoomOutOfData();
    } else {
        zoomOnData();
    }

    drawTable();
}

function zoomOnData() {
    if (mousePosition.x < canvasWidth / 3) {
        viewRange.endIndex--;
    } else if (mousePosition.x > (canvasWidth / 3) * 2) {
        viewRange.startIndex++;
    } else {
        viewRange.endIndex--;
        viewRange.startIndex++;
    }
    if (viewRange.endIndex <= viewRange.startIndex) {
        viewRange.endIndex++;
    }
    if (viewRange.startIndex >= viewRange.endIndex) {
        viewRange.startIndex--;;
    }
}

function zoomOutOfData() {
    let max = currentDatas.length;
    let min = 0;
    if (mousePosition.x < canvasWidth / 3) {
        viewRange.startIndex--;
        if (viewRange.startIndex <= 0) viewRange.endIndex++;
    } else if (mousePosition.x > (canvasWidth / 3) * 2) {
        viewRange.endIndex++;
        if (viewRange.endIndex >= max) viewRange.startIndex--;
    } else {
        viewRange.endIndex++;
        viewRange.startIndex--;
    }
    if (viewRange.startIndex <= min) {
        viewRange.startIndex = min;
    }
    if (viewRange.endIndex >= max) {
        viewRange.endIndex = max;
    }
}

function dragCanvas(e) {
    canvas.style.cursor = 'move';
    canvasDragging.initialX = e.offsetX - canvasDragging.slidedPositionX;
    canvasDragging.initialY = e.offsetY - canvasDragging.slidedPositionY;
    canvas.addEventListener('mousemove', updateCursorMovement);
}

function updateCursorMovement(e) {
    canvasDragging.slidedPositionX = -(canvasDragging.initialX - e.offsetX);
    canvasDragging.slidedPositionY = -(canvasDragging.initialY - e.offsetY);
    drawTable();
}

function restoreCursor() {
    canvas.style.cursor = 'auto';
    canvas.removeEventListener('mousemove', updateCursorMovement);
    drawTable();
}

async function test(){
    currentDatas = await fetchStocks('richter', '2021-01-10', '2021-08-15');
    console.log(currentDatas);
    viewRange.endIndex = currentDatas.length;
    chartMinValue = calculateMin();
    chartMaxValue = calculateMax();
    drawTable();
}

test();