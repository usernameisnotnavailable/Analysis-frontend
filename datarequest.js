
async function test() {
  currentDatas = await fetchStocks('richter', '2021-01-10', '2022-08-15');
  viewRange.endIndex = currentDatas.length;
  chartMinValue = calculateMin();
  chartMaxValue = calculateMax();
  drawTable();
}

test();

let currentDatas;
let mousePosition = { x: 0, y: 0 };
let canvasDragging = {
  initialX: 0,
  initialY: 0,
  slidedPositionX: 0,
  slidedPositionY: 0,
  zoomModifierX: 0,
  zoomModifierY: 0,
};
let viewRange = { startIndex: 0, endIndex: 0 };
let chartMinValue;
let chartMaxValue;

const submitBtn = document.getElementById('submit-btn');
const canvas = document.getElementById('stock-chart');
const dateBar = document.getElementById('date-bar');
const priceBar = document.getElementById('price-bar');
const form = document.getElementById('data-request-form');

canvas.height =
    document.documentElement.clientHeight -
    form.offsetHeight -
    dateBar.offsetHeight;

canvas.width = canvas.offsetWidth;
dateBar.width = canvas.width;
dateBar.height =
    document.documentElement.clientHeight -
    canvas.offsetHeight -
    form.offsetHeight;
priceBar.height = canvas.height;

submitBtn.addEventListener('click', requestData);
canvas.addEventListener('wheel', zoom);
canvas.addEventListener('mousedown', dragCanvas);
canvas.addEventListener('mouseup', restoreCursor);
window.addEventListener('resize', () => {
  drawTable();
});

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ];

async function fetchStocks(stockname, from, to) {
  const response = await fetch(
    `http://localhost:8080/stocks?stock=${stockname}&from=${from}&to=${to}`
  );
  const data = await response.json();

  return data;
}

async function requestData(e) {
  e.preventDefault();
  const stockName = document.getElementById('stock-name').value;
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;

  currentDatas = await fetchStocks(stockName, dateFrom, dateTo);

  drawTable();
}

function drawTable() {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  ctx.save();
  ctx.translate(canvasDragging.slidedPositionX, canvas.height + canvasDragging.slidedPositionY);
  let startIndex = viewRange.startIndex;
  let endIndex = viewRange.endIndex;

  // Bar size and spacing initialization
  let range = endIndex - startIndex;
  let availableSpacePerBar = canvas.width / range;
  let barSpace = availableSpacePerBar / 3;
  let barWidth = availableSpacePerBar - barSpace;

  // dynamic index calculation
  let startIndexModifier = calculateStartIndexVisibility(
    startIndex,
    availableSpacePerBar
  );
  startIndex = dynamicStartIndex(startIndex, startIndexModifier);
  range = endIndex - startIndex;
  let endIndexModifier = calculateEndIndexVisibility(
    range,
    availableSpacePerBar
  );
  endIndex = dynamicEndIndex(endIndex, endIndexModifier);

  range = endIndex - startIndex;
  let pivot = startIndex;
  // ratio: amount of huf per pixel Y axis
  const ratio = (chartMaxValue - chartMinValue) / canvas.height;
  let barTopY;
  let barHeight;
  const dateAndPositions = new Map();

  clearDate();

  for (let i = 0; i < range; i++) {
    let closePrice = currentDatas[pivot].closePrice;
    let openPrice = currentDatas[pivot].openPrice;
    // barTopX: distance from the left of the canvas to the left of the bar
    let barTopX = -(startIndexModifier * availableSpacePerBar) + i * barWidth + barSpace * i + barSpace / 4;

    // color and starting position based on close and open price difference
    if (closePrice < openPrice) {
      // barTopY: distance from the top of the canvas to the top of the bar
      barTopY = -((openPrice - chartMinValue) / ratio);
      // barHeight: height of the bar
      barHeight = (openPrice - closePrice) / ratio;
      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'red';
    } else {
      // barTopY: distance from the top of the canvas to the top of the bar
      barTopY = -((closePrice - chartMinValue) / ratio);
      // barHeight: height of the bar
      barHeight = (closePrice - openPrice) / ratio;
      ctx.fillStyle = 'green';
      ctx.strokeStyle = 'green';

    }

    // draw bar
    ctx.fillRect(barTopX, barTopY, barWidth, barHeight);

    // draw line from bar to maxprice
    ctx.beginPath();
    let barMiddlePointX = (barTopX + (barTopX + barWidth)) / 2;
    let maxPrice = currentDatas[pivot].maxPrice;
    let maxPricePointY = -((maxPrice - chartMinValue) / ratio);
    ctx.moveTo(barMiddlePointX, barTopY);
    ctx.lineTo(barMiddlePointX, maxPricePointY);
    ctx.stroke();

    // drawline from bar to minprice
    let minPrice = currentDatas[pivot].minPrice;
    let minPricePointY = -((minPrice - chartMinValue) / ratio);
    ctx.moveTo(barMiddlePointX, barTopY + barHeight);
    ctx.lineTo(barMiddlePointX, minPricePointY);
    ctx.stroke();


    dateAndPositions.set(currentDatas[pivot].tradeDate, barMiddlePointX);

    pivot++;
  }
  ctx.restore();
  drawDates(dateAndPositions);
  drawPrice();
}

function drawPrice() {
    const ctxRight = priceBar.getContext('2d');
    ctxRight.clearRect(0, 0, priceBar.width, priceBar.height);
    ctxRight.fillStyle = 'grey';
    ctxRight.fillRect(0, 0, priceBar.width, priceBar.height);

    ctxRight.save();
    ctxRight.translate(0, canvasDragging.slidedPositionY);
    ctxRight.fillStyle = 'black';
    ctxRight.font = '22px Arial';
    ctxRight.textBaseline = 'middle';
    console.log("chartMin: " + chartMinValue);
    console.log("chartMax: " + chartMaxValue);
    //ctxRight.textAlign = 'right';
    // total range
    const range = chartMaxValue - chartMinValue;
    const reservedTextHeight = 60;
    const spaceForEachLabel = Math.round(canvas.height / reservedTextHeight);

    let priceStep = range / spaceForEachLabel;
    console.log("priceStep: " + priceStep);
    let roundingDigits = Math.pow(10, (Math.round(priceStep).toString().length - 1));
    console.log("digits: " + (Math.round(priceStep).toString().length - 1));
    console.log("roundingDigits: " + roundingDigits);
    let roundedPrice = Math.round(priceStep  / roundingDigits) * roundingDigits;
    console.log("roundedPrice: " + roundedPrice);
    console.log("canvas height: " + canvas.height);
    const ratio = canvas.height / range;
    let startingValue = Math.round(chartMinValue  / roundingDigits) * roundingDigits;
    for (let i = 0; i < 10; i++) {
        let price = startingValue + roundedPrice * i;
        let position = canvas.height - (i * roundedPrice * ratio);
        ctxRight.fillText(price, 100, position);
    }

    ctxRight.restore();
}

function drawDates(datesAndPositions) {
  const ctxBottom = dateBar.getContext('2d');
  ctxBottom.save();
  ctxBottom.translate(canvasDragging.slidedPositionX, 0);
  ctxBottom.fillStyle = 'black';
  ctxBottom.font = '22px Arial';
  ctxBottom.textBaseline = 'middle';

  const textPlaceHolder = 100;
  const displayWindow = dateBar.width;
  const totalDateCount = datesAndPositions.size;
  const sections = Math.floor(displayWindow / textPlaceHolder) - 1;


  let lastDisplayedDate = new Date(1000, 0, 1);

  const filteredPositions = getDatesAndPositions(datesAndPositions, displayWindow);

  for(const [date, position] of filteredPositions) {
    const currentDate = new Date(date);
    const day = currentDate.getDate();
    const month = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    let draggedPosition =  position;


    if (lastDisplayedDate.getFullYear() !== year) {
      drawYear(ctxBottom, year, draggedPosition);
      lastDisplayedDate = currentDate;
    } else if (lastDisplayedDate.getMonth() !== currentDate.getMonth()) {
      drawMonth(ctxBottom, month, draggedPosition);
      lastDisplayedDate = currentDate;
    } else if (lastDisplayedDate.getDate() !== day) {
      drawDay(ctxBottom, day, draggedPosition);
      lastDisplayedDate = currentDate;
    }
  }

  ctxBottom.restore();
}

function drawDay(ctx, day, posX) {
  const textWidth = ctx.measureText(day).width;
  ctx.fillText(day, posX - textWidth / 2, 40);
}

function drawMonth(ctx, month, posX) {
  const textWidth = ctx.measureText(month).width;
  ctx.fillText(month, posX - textWidth / 2, 40);
}

function drawYear(ctx, year, posX) {
  const textWidth = ctx.measureText(year).width;
  ctx.fillText(year, posX - textWidth / 2, 40);
}

function getDatesAndPositions(datesAndPositions, displayWindow) {
  let filteredPositions = new Map();
  let counter = 1;
  let draggedPosition;
  let thisDate;
  for (const [date, position] of datesAndPositions) {
      if (position + canvasDragging.slidedPositionX > counter * 100) {
        draggedPosition = counter * 100 - canvasDragging.slidedPositionX;

        // difference check added to remove dates that are far from their respective bars
        if(position - draggedPosition <= 50) {
          thisDate = date;
          filteredPositions.set(thisDate, draggedPosition);
        }

        counter++;
      }
      if ((counter * 100) + 50 > displayWindow) {
        break;
      }
  }

  return filteredPositions;

}

function clearDate() {
  const ctxBottom = dateBar.getContext('2d');
  ctxBottom.fillStyle = 'grey';
  ctxBottom.fillRect(0, 0, dateBar.width, dateBar.height);
}

function dynamicStartIndex(startIndex, startIndexModifier) {
  startIndex -= startIndexModifier;
  return Math.max(0, startIndex);
}

function calculateStartIndexVisibility(startIndex, availableSpacePerBar) {
  let startIndexModifier = Math.floor(
    canvasDragging.slidedPositionX / availableSpacePerBar
  );
  return Math.min(startIndexModifier, startIndex);
}

function calculateEndIndexVisibility(range, availableSpacePerBar) {
  return Math.floor(
      (canvas.width - range * availableSpacePerBar) / availableSpacePerBar
  );
}

function dynamicEndIndex(endIndex, endIndexModifier) {
  endIndex += endIndexModifier;
  return Math.min(endIndex, currentDatas.length);
}

function calculateMin() {
  let minimumValue = currentDatas[viewRange.startIndex].minPrice;
  for (let i = viewRange.startIndex; i < viewRange.endIndex; i++) {
    if (currentDatas[i].minPrice < minimumValue) {
      minimumValue = currentDatas[i].minPrice;
    }
  }
  return minimumValue;
}

function calculateMax() {
  let maximumValue = currentDatas[viewRange.startIndex].maxPrice;
  for (let i = viewRange.startIndex; i < viewRange.endIndex; i++) {
    if (currentDatas[i].maxPrice > maximumValue) {
      maximumValue = currentDatas[i].maxPrice;
    }
  }
  return maximumValue;
}

function zoom(e) {
  e.preventDefault();
  mousePosition.x = e.offsetX;
  mousePosition.y = e.offsetY;

  if (e.deltaY > 0) {
    zoomOutOfData();
  } else {
    zoomOnData();
  }

  drawTable();
}

function zoomOnData() {
  if (mousePosition.x < canvas.width/ 3) {
    viewRange.endIndex--;
  } else if (mousePosition.x > (canvas.width/ 3) * 2) {
    viewRange.startIndex++;
  } else {
    viewRange.endIndex--;
    viewRange.startIndex++;
  }
  if (viewRange.endIndex <= viewRange.startIndex) {
    viewRange.endIndex++;
  }
  if (viewRange.startIndex >= viewRange.endIndex) {
    viewRange.startIndex--;
  }
}

function zoomOutOfData() {
  let max = currentDatas.length;
  let min = 0;
  if (mousePosition.x < canvas.width / 3) {
    viewRange.startIndex--;
    if (viewRange.startIndex <= 0) viewRange.endIndex++;
  } else if (mousePosition.x > (canvas.width / 3) * 2) {
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