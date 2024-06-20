$(document).ready(function() {
    checkTelemetryStatus();
    updateDiskSpace();
    loadBinLogs();

    $('#clearBinLogs').click(function() {
        clearLogs('bin');
    });
});


function updateDiskSpace() {
    $.getJSON('/logs/disk-space', function(data) {
        $('#diskSpaceUsed').text(data.used);
        $('#diskSpaceTotal').text(data.total);
        $('#diskSpacePercentage').text(data.percentage);
    });
}

function loadBinLogs() {
    $('#binLogsTable').empty();

    $.getJSON('/logs/bin-logs', function(data) {
        $('#binLogsTable').empty();
        data.forEach(function(log) {
            const size = formatBytes(log.size);
            const dateTime = new Date(log.time_utc * 1000).toLocaleString();
            $('#binLogsTable').append(
                `<tr>
                    <td>${log.filename}</td>
                    <td>${size}</td>
                    <td>${dateTime}</td>
                    <td><a href="/logs/download-bin-log?log_id=${log.id}">Download</a></td>
                </tr>`
            );
        });
    });

}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updateTelemetryUI(isTelemetryRunning) {
    if (isTelemetryRunning == "Connected") {
        $('#telemetryStatus').text('Connected');
        $('#telemetryStatus').removeClass('bg-danger').addClass('bg-success').removeClass('bg-warning');

    } else if (isTelemetryRunning == "Connecting") {
        $('#connection_note').show();
        $('#telemetryStatus').text('Connecting');
        $('#telemetryStatus').removeClass('bg-danger').removeClass('bg-success').addClass('bg-warning');
    } else {
        $('#telemetryStatus').text('Not Connected (Go to Flight Controller Page to Connect)');
        $('#telemetryStatus').addClass('bg-danger').removeClass('bg-warning').removeClass('bg-success');
    }
}