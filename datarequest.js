let currentDatas;
let canvasZoom = {
    height: 1,
    width: 1
};
let mousePosition = {
    x: 0, 
    y: 0
}

let translateFromMouse = {
    x: 0,
    y: 0
}

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
    const canvasWidth = 750 * window.devicePixelRatio;
    const canvasHeight = 350 * window.devicePixelRatio;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.scale(canvasZoom.width, canvasZoom.height);
    

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    
    
    console.log(canvasZoom.width);

    // a középpont felé kellene eltolni a jelenlegi egér irányából talán...

    console.log('translateFromMouseX: ' + translateFromMouse.x);
    console.log('translateFromMouseY: ' + translateFromMouse.y);
    ctx.translate(0 - translateFromMouse.x, canvasHeight - translateFromMouse.y);
    ctx.save();

    let minimumValue = currentDatas[0].minPrice;
    let maximumValue = currentDatas[0].maxPrice;

    currentDatas.forEach((data) => {
        if (data.minPrice < minimumValue){
            minimumValue = data.minPrice;
        }
        if(data.maxPrice > maximumValue){
            maximumValue = data.maxPrice;
        }
    });

    const chartMinValue = minimumValue - (minimumValue * 0,1);
    const chartMaxValue = maximumValue + (maximumValue * 0,1);

    // ratio: amount of huf per pixel
    const ratio = (chartMaxValue - chartMinValue) / canvasHeight;

     for (let i = 0; i < currentDatas.length; i++) {
        // Dummy price =>  (maximumValue + minimumValue) / 2 + i * 2
        // Actual prices
        let closePrice = currentDatas[i].closePrice;
        let openPrice = currentDatas[i].openPrice;
        // Dummy bar spacing
        // spacing and barwidth are the same that is why they collapse need to implement dynamic change!!!
        let available = canvasWidth / currentDatas.length;

        let barSpace = available / 4;
        
        let barTopY;
        // dummy bar width
        let barWidth = available - barSpace;
        let barTopX = i * barWidth + barSpace * i + barSpace / 4;
        let barHeight;

        if (closePrice < openPrice){
            barTopY = - ((openPrice - chartMinValue) / ratio);
            barHeight = (openPrice - closePrice) / ratio;
            ctx.fillStyle = 'red';
        } else {
            barTopY = - ((closePrice - chartMinValue) / ratio);
            ctx.fillStyle = 'green';
            barHeight = (closePrice - openPrice) / ratio;
        }

        // draw bar and outline
        ctx.fillRect(barTopX, barTopY, barWidth, barHeight);
        ctx.strokeRect(barTopX, barTopY, barWidth, barHeight);

        ctx.restore();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        // draw line from bar to maxprice
        ctx.beginPath();
        let barMiddlePointX = (barTopX+(barTopX+barWidth)) / 2;
        let maxPrice = currentDatas[i].maxPrice;
        let maxPricePointY = - ((maxPrice - chartMinValue) / ratio)
        ctx.moveTo(barMiddlePointX, barTopY);
        ctx.lineTo(barMiddlePointX, maxPricePointY);
        ctx.stroke();
        // draw line horizontally on max price
        ctx.moveTo(barTopX, maxPricePointY);
        ctx.lineTo(barTopX + barWidth, maxPricePointY);
        ctx.stroke();
        // drawline from bar to minprice
        let minPrice = currentDatas[i].minPrice;
        let minPricePointY = -((minPrice - chartMinValue) / ratio);
        // console.log('Stock: ' + i + ',Open price: ' + openPrice + ',Close price: ' + closePrice + ', Max price: ' + maxPrice + ', Min price: ' + minPrice);
        ctx.moveTo(barMiddlePointX, barTopY + barHeight);
        ctx.lineTo(barMiddlePointX, minPricePointY);
        ctx.stroke();
        // draw line horizontally on min price
        ctx.moveTo(barTopX, minPricePointY);
        ctx.lineTo(barTopX + barWidth, minPricePointY);
        ctx.stroke();

        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        ctx.restore(); 

      
    }
}

canvas.addEventListener('wheel', zoom);

function zoom(e){
    e.preventDefault();
    canvasZoom.width += (e.deltaY * -0.0001);
    canvasZoom.height += (e.deltaY * -0.0001);
    mousePosition.x = e.offsetX;
    mousePosition.y = e.offsetY;
    translateMouseToCanvas();
    drawTable();
}

function translateMouseToCanvas(){
    
    let canvasMiddleX = canvas.width / 2;
    let canvasMiddleY = canvas.height / 2;
    console.log(canvasZoom.width);
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
    drawTable();
}

test();


