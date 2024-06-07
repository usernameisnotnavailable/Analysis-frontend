 let canvasZoom = {
    height: 1,
    width: 1,
    zoomValue: 0
}; 

 let translateFromMouse = {
    x: 0,
    y: 0
}; 
let currentDatas;
let mousePosition = {
  x: 0,
  y: 0,
};
let dragCanvasBy = {
    initialX: 0,
    initialY: 0,
    misPositionX: 0,
    misPositionY: 0,
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
    let startIndex = viewRange.startIndex;
    let endIndex = viewRange.endIndex;
    //ctx.scale(canvasZoom.width, canvasZoom.height);
 
    console.log('dragCanvasBy.x ' + dragCanvasBy.x);
    console.log('dragCanvasBy.misPositionX ' + dragCanvasBy.misPositionX);
    console.log('dragCanvasBy.y ' + dragCanvasBy.y);
    console.log('dragCanvasBy.misPositionY ' + dragCanvasBy.misPositionY);
    ctx.translate(0 + dragCanvasBy.misPositionX, canvasHeight + dragCanvasBy.misPositionY);

    
    let range = endIndex - startIndex;
    let availableSpacePerBar = canvasWidth / range;
    let barSpace = availableSpacePerBar / 3;
    let barWidth = availableSpacePerBar - barSpace;

    let positionChangeOnX = dragCanvasBy.misPositionX;
    let positionChangeOnY = dragCanvasBy.misPositionY;
    let resultX = 0;
    if (positionChangeOnX > availableSpacePerBar) {
      resultX = Math.floor(positionChangeOnX / availableSpacePerBar);
      console.log(resultX);
    }
    
    startIndex -= resultX;

    startIndex = Math.max(0, startIndex);
 
    let pivot = startIndex;

    let barTopY;
    let barHeight;


    // ratio: amount of huf per pixel
    const ratio = (chartMaxValue - chartMinValue) / canvasHeight;
    
    for (let i = 0; i < range; i++) {
        let closePrice = currentDatas[pivot].closePrice;
        let openPrice = currentDatas[pivot].openPrice;
        let barTopX = i * barWidth + barSpace * i + barSpace / 4;
        
        if (closePrice < openPrice){
            barTopY = - ((openPrice - chartMinValue) / ratio);
            barHeight = (openPrice - closePrice) / ratio;
            ctx.fillStyle = 'red';
            ctx.strokeStyle = 'red';
        } else {
            barTopY = - ((closePrice - chartMinValue) / ratio);
            ctx.fillStyle = 'green';
            ctx.strokeStyle = 'green';
            barHeight = (closePrice - openPrice) / ratio;
        }
        // draw bar and outline
        ctx.fillRect(barTopX, barTopY, barWidth, barHeight);
                  
        // draw line from bar to maxprice
        ctx.beginPath();
        let barMiddlePointX = (barTopX+(barTopX+barWidth)) / 2;
        let maxPrice = currentDatas[pivot].maxPrice;
        let maxPricePointY = - ((maxPrice - chartMinValue) / ratio)
        ctx.moveTo(barMiddlePointX, barTopY);
        ctx.lineTo(barMiddlePointX, maxPricePointY);
        ctx.stroke();
  
        // drawline from bar to minprice
        let minPrice = currentDatas[pivot].minPrice;
        let minPricePointY = -((minPrice - chartMinValue) / ratio);
        ctx.moveTo(barMiddlePointX, barTopY + barHeight);
        ctx.lineTo(barMiddlePointX, minPricePointY);
        ctx.stroke();
    
        pivot++;
    }
}

function startIndexCalculation() {

}

function endIndexCalculation() {
    
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
     //canvasZoom.width += (e.deltaY * -0.0001);
    //canvasZoom.height += (e.deltaY * -0.0001); 
    mousePosition.x = e.offsetX;
    mousePosition.y = e.offsetY;

    if (e.deltaY > 0){
        //canvasZoom.zoomValue -= 2; 
        zoomOutOfData();
    } else {
         //canvasZoom.zoomValue += 2; 
        zoomOnData();
    }
    //translateMouseToCanvas();

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
    dragCanvasBy.initialX = e.offsetX - dragCanvasBy.misPositionX;
    dragCanvasBy.initialY = e.offsetY - dragCanvasBy.misPositionY;
    canvas.addEventListener('mousemove', updateCursorMovement);
}

function updateCursorMovement(e) {
    dragCanvasBy.misPositionX = -(dragCanvasBy.initialX - e.offsetX);
    dragCanvasBy.misPositionY = -(dragCanvasBy.initialY - e.offsetY);
    drawTable();
}

function restoreCursor() {
    canvas.style.cursor = 'auto';
    canvas.removeEventListener('mousemove', updateCursorMovement);
    drawTable();
}

/* 
 function translateMouseToCanvas(){
    let canvasMiddleX = canvas.width / 2;
    let canvasMiddleY = canvas.height / 2;
    translateFromMouse.x = - (canvasMiddleX - mousePosition.x) * canvasZoom.width / 4;
    translateFromMouse.y = - (canvasMiddleY - mousePosition.y) * canvasZoom.width / 4;

    if (canvasZoom.width === 1 && canvasZoom.height === 1) {
        translateFromMouse.x = 0;
        translateFromMouse.y = 0;

    }
}  */

async function test(){
    currentDatas = await fetchStocks('richter', '2021-01-10', '2021-08-15');
    console.log(currentDatas);
    viewRange.endIndex = currentDatas.length;
    chartMinValue = calculateMin();
    chartMaxValue = calculateMax();
    drawTable();
}

test();


