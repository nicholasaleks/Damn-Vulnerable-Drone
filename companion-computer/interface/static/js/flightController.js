$(document).ready(function() {
    loadConfigAndDevices();
});

function loadConfigAndDevices() {
    $.getJSON('/config', function(config) {
        $.getJSON('/telemetry/serial-devices', function(devices) {
            devices.forEach(function(device) {
                $('#serialDevice').append($('<option></option>').attr('value', device.value).text(device.label));
            });
            $('#serialDevice').val(config.autoselect_device);
        });

        $.getJSON('/telemetry/baud-rates', function(baudRates) {
            baudRates.forEach(function(rate) {
                $('#baudRate').append($('<option></option>').attr('value', rate.value).text(rate.label));
            });
            $('#baudRate').val(config.autoselect_baud);
        });

        $.getJSON('/telemetry/mavlink-versions', function(versions) {
            versions.forEach(function(version) {
                $('#mavlinkVersion').append($('<option></option>').attr('value', version.value).text(version.label));
            });
            $('#mavlinkVersion').val(config.autoselect_mavlink_version);
        });
    });

    // Add UDP destinations
    $.getJSON('/telemetry/udp-destinations', function(destinations) {
        destinations.forEach(function(destination) {
            if (destination.ip === '127.0.0.1' && destination.port === 14540) {
                $('#udpDestinationsTable tbody').append('<tr><td>' + destination.ip + ':' + destination.port + '</td><td>Required for companion computer</td></tr>');
            } else if (destination.ip === '10.13.0.4' || destination.ip === '192.168.13.14' || destination.ip === '10.13.0.6') {
                $('#udpDestinationsTable tbody').append('<tr><td>' + destination.ip + ':' + destination.port + '</td><td>Required for GCS/QGC</td></tr>');
            } else {
                $('#udpDestinationsTable tbody').append('<tr><td>' + destination.ip + ':' + destination.port + '</td><td><button class="btn btn-danger" onclick="removeUdpDestination(\'' + destination.ip + '\',' + destination.port + ')">Delete</button></td></tr>');
            }
        });
    });
}

function startTelemetry(event) {
    if (event) event.preventDefault();
    $('#connection_note').show();
    $('#startTelemetry').prop('disabled', true);
    $('#startTelemetry').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Connecting...');
    // Disable the startTelemetry button and put a loading spinner
    const serialDevice = $('#serialDevice').val();
    const baudRate = $('#baudRate').val();
    const mavlinkVersion = $('#mavlinkVersion').val();
    const enableUdpServer = $('#enableUdpServer').is(':checked');
    const udpServerPort = $('#udpServerPort').val();
    const enableTcpServer = $('#enableTcpServer').is(':checked');
    const enableDatastreamRequests = $('#enableDatastreamRequests').is(':checked');
    const enableHeartbeat = $('#enableHeartbeat').is(':checked');
    const enableTlogs = $('#enableTlogs').is(':checked');

    $.ajax({
        url: '/telemetry/start-telemetry',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            serial_device: serialDevice,
            baud_rate: baudRate,
            mavlink_version: mavlinkVersion,
            enable_udp_server: enableUdpServer,
            udp_server_port: udpServerPort,
            enable_tcp_server: enableTcpServer,
            enable_datastream_requests: enableDatastreamRequests,
            enable_heartbeat: enableHeartbeat,
            enable_tlogs: enableTlogs
        }),
        success: function(response) {
            $('#connection_note').show();
            $('#startTelemetry').prop('disabled', true);
            $('#startTelemetry').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Connecting...');
            $('#startTelemetry').show();
            $('#stopTelemetry').hide();
            $('#serialDevice').prop('disabled', true);
            $('#baudRate').prop('disabled', true);
            $('#mavlinkVersion').prop('disabled', true);
            $('#addUdpButton').prop('disabled', true);
            $('#udpDestination').prop('disabled', true);
            $('#enableUdpServer').prop('disabled', true);
            $('#udpServerPort').prop('disabled', true);
            $('#enableTcpServer').prop('disabled', true);
            $('#enableDatastreamRequests').prop('disabled', true);
            $('#enableHeartbeat').prop('disabled', true);
            $('#enableTlogs').prop('disabled', true);
        },
        error: function(error) {
            console.error(error);
            $('#telemetryStatus').text('Error starting telemetry');
        }
    });
}

function stopTelemetry() {
    $.ajax({
        url: '/telemetry/stop-telemetry',
        type: 'POST',
        contentType: 'application/json',
        success: function(response) {
            console.log(response);
            updateTelemetryUI("Not Connected");
        },
        error: function(error) {
            console.error(error);
            $('#telemetryStatus').text('Error stopping telemetry');
        }
    });
}

function updateTelemetryUI(isTelemetryRunning) {
    if (isTelemetryRunning == "Connected") {
        $('#startTelemetry').text('Stop Telemetry');
        $('#telemetryStatus').text('Connected');
        $('#telemetryStatus').removeClass('bg-danger').addClass('bg-success');
        $('#serialDevice').prop('disabled', true);
        $('#baudRate').prop('disabled', true);
        $('#mavlinkVersion').prop('disabled', true);
        $('#addUdpButton').prop('disabled', true);
        $('#udpDestination').prop('disabled', true);
        $('#startTelemetry').hide();
        $('#connection_note').hide();
        $('#stopTelemetry').show();
        $('#enableUdpServer').prop('disabled', true);
        $('#udpServerPort').prop('disabled', true);
        $('#enableTcpServer').prop('disabled', true);
        $('#enableDatastreamRequests').prop('disabled', true);
        $('#enableHeartbeat').prop('disabled', true);
        $('#enableTlogs').prop('disabled', true);
    // else if status is "Connecting" keep everything disabled but show the startTelemetry button with a spinner
    } else if (isTelemetryRunning == "Connecting") {
        $('#connection_note').show();
        $('#startTelemetry').prop('disabled', true);
        $('#startTelemetry').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Connecting...');
        $('#startTelemetry').show();
        $('#stopTelemetry').hide();
        $('#serialDevice').prop('disabled', true);
        $('#baudRate').prop('disabled', true);
        $('#mavlinkVersion').prop('disabled', true);
        $('#addUdpButton').prop('disabled', true);
        $('#udpDestination').prop('disabled', true);
        $('#enableUdpServer').prop('disabled', true);
        $('#udpServerPort').prop('disabled', true);
        $('#enableTcpServer').prop('disabled', true);
        $('#enableDatastreamRequests').prop('disabled', true);
        $('#enableHeartbeat').prop('disabled', true);
        $('#enableTlogs').prop('disabled', true);
    } else {
        $('#startTelemetry').text('Start Telemetry');
        $('#telemetryStatus').text('Not Connected');
        $('#connection_note').hide();
        $('#telemetryStatus').addClass('bg-danger').removeClass('bg-success');
        $('#serialDevice').prop('disabled', false);
        $('#baudRate').prop('disabled', false);
        $('#mavlinkVersion').prop('disabled', false);
        $('#addUdpButton').prop('disabled', false);
        $('#udpDestination').prop('disabled', false);
        $('#startTelemetry').show();
        $('#startTelemetry').prop('disabled', false);
        $('#connection_note').hide();
        $('#stopTelemetry').hide();
        $('#enableUdpServer').prop('disabled', false);
        $('#udpServerPort').prop('disabled', false);
        $('#enableTcpServer').prop('disabled', false);
        $('#enableDatastreamRequests').prop('disabled', false);
        $('#enableHeartbeat').prop('disabled', false);
        $('#enableTlogs').prop('disabled', false);
    }
}

function addUdpDestination() {
    const input = $('#udpDestination').val();
    if (!input) return;
    const [ip, port] = input.split(':');
    // Ignore if ip and port are 127.0.0.1 and 14540
    if (ip === '127.0.0.1' && port === '14540') return;
    $.ajax({
        url: '/telemetry/add-udp-destination',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ip: ip, port: port }),
        success: function(response) {
            console.log(response);
            // Add row to table and remove udp button in the last column
            $('#udpDestination').val('');
            $('#udpDestinationsTable tbody').append('<tr><td>' + ip + ':' + port + '</td><td><button class="btn btn-danger" onclick="removeUdpDestination(\'' + ip + '\',' + port + ')">Delete</button></td></tr>');
        },
        error: function(error) {
            console.error(error);
        }
    });
}


// Remove UDP destination
function removeUdpDestination(ip, port) {
    console.log('remove udp destination', ip, port)
    $.ajax({
        url: '/telemetry/remove-udp-destination',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ip: ip, port: port }),
        success: function(response) {
            console.log(response);
            $('#udpDestinationsTable tbody').find('td:contains(' + ip + ':' + port + ')').parent().remove();
        },
        error: function(error) {
            console.error(error);
        }
    });
}