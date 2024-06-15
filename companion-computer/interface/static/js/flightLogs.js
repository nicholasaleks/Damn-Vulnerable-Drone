
$(document).ready(function() {
    checkTelemetryStatus();
    const socket = io();

    socket.on('telemetry_status', function(data) {
        //convert json to string
        console.log("telemetry_status socket:")
        console.log(data)
        updateTelemetryUI(data.isTelemetryRunning);

        $('#packetsReceived').text(data.packets_received);
        $('#vehicleType').text(data.vehicle_type);
        $('#firmwareVersion').text(data.firmware_version);
    });

    updateLoggingStatus();
    updateDiskSpace();
    loadTelemetryLogs();
    loadBinLogs();

    $('#enableTelemetryLogging').change(function() {
        toggleTelemetryLogging(this.checked);
    });

    $('#startTelemetryLog').click(function() {
        startTelemetryLog();
    });

    $('#clearTelemetryLogs').click(function() {
        clearLogs('telemetry');
    });

    $('#clearBinLogs').click(function() {
        clearLogs('bin');
    });
});









function updateLoggingStatus() {
    $.getJSON('/logs/logging-status', function(data) {
        $('#loggingStatus').text(data.status);
    });
}

function updateDiskSpace() {
    $.getJSON('/logs/disk-space', function(data) {
        $('#diskSpaceUsed').text(data.used);
        $('#diskSpaceTotal').text(data.total);
        $('#diskSpacePercentage').text(data.percentage);
    });
}

function loadTelemetryLogs() {
    $.getJSON('/logs/telemetry-logs', function(data) {
        $('#telemetryLogsTable').empty();
        data.logs.forEach(function(log) {
            $('#telemetryLogsTable').append(
                `<tr>
                    <td>${log.id}</td>
                    <td>${log.size}</td>
                    <td>${log.modified}</td>
                    <td><a href="/logs/download-bin-log/${log.id}" download>Download</a></td>
                </tr>`
            );
        });
    });
}

function loadBinLogs() {
    $.getJSON('/logs/bin-logs', function(data) {
        $('#binLogsTable').empty();
        data.logs.forEach(function(log) {
            $('#binLogsTable').append(
                `<tr>
                    <td>${log.id}</td>
                    <td>${log.size}</td>
                    <td>${log.modified}</td>
                    <td><a href="/logs/download-bin-log/${log.id}" download>Download</a></td>
                </tr>`
            );
        });
    });
}

function toggleTelemetryLogging(enable) {
    $.ajax({
        url: '/logs/toggle-telemetry-logging',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ enable: enable }),
        success: function(response) {
            updateLoggingStatus();
            loadTelemetryLogs();
        },
        error: function(error) {
            console.error(error);
        }
    });
}

function startTelemetryLog() {
    $.ajax({
        url: '/logs/start-telemetry-log',
        type: 'POST',
        success: function(response) {
            loadTelemetryLogs();
        },
        error: function(error) {
            console.error(error);
        }
    });
}

function clearLogs(type) {
    $.ajax({
        url: `/logs/clear-${type}-logs`,
        type: 'POST',
        success: function(response) {
            if (type === 'telemetry') {
                loadTelemetryLogs();
            } else if (type === 'bin') {
                loadBinLogs();
            }
        },
        error: function(error) {
            console.error(error);
        }
    });
}


function updateTelemetryUI(isTelemetryRunning) {
    console.log(isTelemetryRunning);
    if (isTelemetryRunning == "Connected") {
        $('#telemetryStatus').text('Connected');
        $('#telemetryStatus').removeClass('badge-danger').addClass('badge-success');

    } else if (isTelemetryRunning == "Connecting") {
        $('#connection_note').show();
        $('#telemetryStatus').text('Connecting');
        $('#telemetryStatus').removeClass('badge-danger').addClass('badge-warning');

    } else {
        $('#telemetryStatus').text('Not Connected (Go to Flight Controller Page to Connect)');
        $('#telemetryStatus').addClass('badge-danger').removeClass('badge-success');

    }
}

function checkTelemetryStatus() {
    $.getJSON('/telemetry/telemetry-status', function(data) {
        updateTelemetryUI(data.isTelemetryRunning);
    });
}