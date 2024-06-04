let currentDatas;
let canvasZoom = {
    height: 1,
    width: 1,
    zoomValue: 0
};
let mousePosition = {
    x: 0,
    y: 0
};
let translateFromMouse = {
    x: 0,
    y: 0
};
let viewRange = {
    startIndex: 0, 
    endIndex: 0
};

const canvasWidth = 750 * window.devicePixelRatio;
const canvasHeight = 350 * window.devicePixelRatio;


let chartWidth = document.getElementById('myChart').clientWidth;
let chartHeight = document.getElementById('myChart').clientHeight;
const canvas = document.getElementById('myChart');

window.addEventListener('resize', () => {
    chartWidth = document.getElementById('myChart').clientWidth;
    chartHeight = document.getElementById('myChart').clientHeight;
});



async function fetchStocks(stockname, from, to){
    const response = await fetch(`http://localhost:8080/stocks?stock=${stockname}&from=${from}&to=${to}`);
    const data = await response.json();

    return data;
}

const submitBtn = document.getElementById('submit-btn')
submitBtn.addEventListener('click', requestData);
const testText = document.getElementById('test');

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

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    //ctx.scale(canvasZoom.width, canvasZoom.height);
    console.log('canvasWidth' + canvasWidth);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.translate(0, canvasHeight);
    ctx.save();

    let minimumValue = calculateMin();
    let maximumValue = calculateMax();

    const chartMinValue = minimumValue;
    const chartMaxValue = maximumValue;

    let startIndex = viewRange.startIndex;
    let endIndex = viewRange.endIndex;
    let range = viewRange.endIndex - viewRange.startIndex;
    let pivot = startIndex;

        
    let availableSpacePerBar = canvasWidth / range;
    let barSpace = availableSpacePerBar / 3;

    // ratio: amount of huf per pixel
    const ratio = (chartMaxValue - chartMinValue) / canvasHeight;

     for (let i = 0; i < endIndex; i++) {
        // Actual prices
        let closePrice = currentDatas[pivot].closePrice;
        let openPrice = currentDatas[pivot].openPrice;
        
        let barTopY;
        // dummy bar width
        let barWidth = availableSpacePerBar - barSpace;
        let barTopX = i * barWidth + barSpace * i + barSpace / 4;
        let barHeight;

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
        // console.log('Stock: ' + i + ',Open price: ' + openPrice + ',Close price: ' + closePrice + ', Max price: ' + maxPrice + ', Min price: ' + minPrice);
        ctx.moveTo(barMiddlePointX, barTopY + barHeight);
        ctx.lineTo(barMiddlePointX, minPricePointY);
        ctx.stroke();
    
        pivot++;
    }
}


function calculateMin() {
    console.log(currentDatas[viewRange.startIndex].minPrice);
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

canvas.addEventListener('wheel', zoom);
canvas.addEventListener('mousedown', dragCanvas);


function zoom(e){
    e.preventDefault();
    canvasZoom.width += (e.deltaY * -0.0001);
    canvasZoom.height += (e.deltaY * -0.0001);
        
    mousePosition.x = e.offsetX;
    mousePosition.y = e.offsetY;

    if (e.deltaY > 0){
        canvasZoom.zoomValue -= 1;
        zoomOutOfData();
    } else {
        canvasZoom.zoomValue += 1;
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
    } else if (mousePosition.x > (canvasWidth / 3) * 2) {
        viewRange.endIndex++;
    } else {
        viewRange.endIndex++;
        viewRange.startIndex--;
    }
    if (viewRange.startIndex < min) {
        viewRange.startIndex = min;
    }
    if (viewRange.endIndex > max) {
        viewRange.endIndex = max;
    }
}

function dragCanvas(e){
    mousePosition.x = e.offsetX;
    mousePosition.y = e.offsetY;
    
}
// canvas.style.cursor = 'move';

function translateMouseToCanvas(){
    
    let canvasMiddleX = canvas.width / 2;
    let canvasMiddleY = canvas.height / 2;
    translateFromMouse.x = - (canvasMiddleX - mousePosition.x) * canvasZoom.width / 4;
    translateFromMouse.y = - (canvasMiddleY - mousePosition.y) * canvasZoom.width / 4;

    if (canvasZoom.width === 1 && canvasZoom.height === 1) {
        translateFromMouse.x = 0;
        translateFromMouse.y = 0;

    }
}

async function test(){
    currentDatas = await fetchStocks('richter', '2021-01-10', '2021-08-15');
    console.log(currentDatas);
    viewRange.endIndex = currentDatas.length;
    drawTable();
}

test();


