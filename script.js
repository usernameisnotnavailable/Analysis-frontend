function openFileExplorer() {
  document.getElementById('fileInput').click();
}

document.getElementById('fileInput').addEventListener('change', function() {
    const selectedFile = this.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const fileContent = event.target.result;
        sendDataToServer(fileContent);
    };

    reader.readAsText(selectedFile);
});

function sendDataToServer(fileContent) {

  fetch('/upload', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({content:fileContent})
  })
  .then(response => response.JSON())
  .then(data => console.log(data))
  .catch(error => console.log('Error', error))

}