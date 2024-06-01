


// Sample data for the chart
var data = [65, 59, 80, 81, 56];
var labels = ['A', 'B', 'C', 'D', 'E'];

// Get the canvas element
var canvas = document.getElementById('myChart');
var ctx = canvas.getContext('2d');

// Configuration options

var chartWidth = 400;
var chartHeight = 300;
var barSpacing = 40;
var barWidth = (chartWidth - (barSpacing * (data.length - 1))) / data.length;
var maxValue = Math.max(...data);

// Draw the bars
ctx.fillStyle = 'rgba(54,217,217,0.2)';
ctx.strokeStyle = 'rgba(75, 192, 192, 1)';
for (var i = 0; i < data.length; i++) {
    var barHeight = (data[i] / maxValue) * chartHeight;
    var x = i * (barWidth + barSpacing);
    var y = chartHeight - barHeight;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Draw labels
    ctx.fillStyle = 'black';
    ctx.fillText(labels[i], x + barWidth / 2, chartHeight + 20);
}
