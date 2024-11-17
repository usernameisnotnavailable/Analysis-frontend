

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
  canvas.width = canvas.offsetWidth;
  dateBar.width = canvas.width;
  dateBar.height =
    document.documentElement.clientHeight -
    canvas.offsetHeight -
    form.offsetHeight;
  priceBar.height = canvas.height;
  canvas.height =
    document.documentElement.offsetHeight -
    form.offsetHeight -
    dateBar.offsetHeight;

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
    let barTopX =
      -(startIndexModifier * availableSpacePerBar) +
      i * barWidth +
      barSpace * i +
      barSpace / 4;

    if (closePrice < openPrice) {
      barTopY = -((openPrice - chartMinValue) / ratio);
      barHeight = (openPrice - closePrice) / ratio;
      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'red';
    } else {
      barTopY = -((closePrice - chartMinValue) / ratio);
      ctx.fillStyle = 'green';
      ctx.strokeStyle = 'green';
      barHeight = (closePrice - openPrice) / ratio;
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

    //drawDate(barMiddlePointX, pivot);
    dateAndPositions.set(currentDatas[pivot].tradeDate, barMiddlePointX);

    pivot++;
  }
  ctx.restore();
  drawDates(dateAndPositions);
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
  console.log('displayWindow: ' + displayWindow);
  const totalDateCount = datesAndPositions.size;
  console.log('totalDateCount: ' + totalDateCount);
  const sections = Math.floor(displayWindow / textPlaceHolder) - 1;
  console.log('sections: ' + sections);

  let lastDisplayedDate = new Date(1000, 0, 1);

  const filteredPositions = getDatesAndPositions(datesAndPositions, displayWindow);

  for(const [date, position] of filteredPositions) {
    console.log('date: ' + date + ' position: ' + position);
    const currentDate = new Date(date);
    const day = currentDate.getDate();
    const month = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    console.log('date: ' + date);
    console.log('position: ' + position);
    if (lastDisplayedDate.getFullYear() !== year) {
      drawYear(ctxBottom, year, position);
      lastDisplayedDate = currentDate;
    } else if (lastDisplayedDate.getMonth() !== currentDate.getMonth()) {
      drawMonth(ctxBottom, month, position);
      lastDisplayedDate = currentDate;
    } else if (lastDisplayedDate.getDate() !== day) {
      drawDay(ctxBottom, day, position);
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
  let thisPosition;
  let thisDate;
  for (const [date, position] of datesAndPositions) {
      if (position + canvasDragging.slidedPositionX > counter * 100) {
        thisPosition = counter * 100;
        thisDate = date;
        console.log('thisDate: ' + thisDate + ' thisPosition: ' + thisPosition);
        filteredPositions.set(thisDate, thisPosition);
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


